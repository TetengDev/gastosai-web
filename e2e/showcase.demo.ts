import { expect, test, type Page } from "@playwright/test";
import {
  BEAT,
  caption,
  login,
  modalWithTitle,
  newTraces,
  readBudgetRule,
  scene,
  sweepShowcase,
  uniqueName,
  type ShowcaseTraces,
} from "./support";

/**
 * The feature showcase: one continuous, captioned story through the product, recorded as a single
 * video by `scripts/record-showcase.sh`.
 *
 * This is a presentation artifact, not a test. It asserts only enough to keep itself honest — that
 * the thing it just claimed on screen actually happened — and it is paced for a viewer rather than
 * for a suite: every caption is held long enough to read, and the config it runs under adds
 * `slowMo` so the pointer can be followed.
 *
 * Two rules it shares with the happy suite. Everything it creates is named after `RUN_ID`, so the
 * sweep can only ever remove this run's own rows; and the sweep runs from `afterEach`, so a
 * walkthrough that fails half way still leaves the demo account as it found it.
 */

// The scenes' own captions live in `support/showcase.ts`, so the story is one readable list.
const chapter = (page: Page, id: string) => caption(page, scene(id).title, BEAT + 600);

let traces: ShowcaseTraces = newTraces();

test.beforeEach(() => {
  traces = newTraces();
});

// Not `afterAll`: `afterEach` runs whether the walkthrough passed or threw, which is the whole
// point — the failure case is the one that would otherwise leave rows behind.
test.afterEach(async ({ request }) => {
  const removed = await sweepShowcase(request, traces);
  if (removed.length > 0) console.log(`showcase cleanup removed: ${removed.join(", ")}`);
});

test("GastosAI — feature showcase", async ({ page, request }) => {
  // Nine scenes, each with captions held for a viewer, on a config with `slowMo`.
  test.setTimeout(15 * 60_000);

  const expenseName = uniqueName("Showcase dinner");
  const budgetCategory = uniqueName("Showcase budget");
  const goalName = uniqueName("Showcase fund");
  const billName = uniqueName("Showcase subscription");

  // ── 1. Sign in ────────────────────────────────────────────────────────────────────────────
  //
  // Filmed through the form rather than restored from `storageState`: the sign-in screen is the
  // first thing a viewer of the product sees, so the story starts where they would.
  await page.goto("/login");
  await chapter(page, "sign-in");
  await login(page);
  // The first-run tour would overlay the app and swallow clicks from here on.
  await page.evaluate(() => {
    localStorage.setItem("gastosai:tour:completed", "1");
    localStorage.removeItem("gastosai:tour:run");
  });

  // ── 2. The dashboard ──────────────────────────────────────────────────────────────────────
  await page.goto("/");
  const totalSpend = page.locator("div.bg-hero").filter({ hasText: /Total Spend ·/ });
  await expect(totalSpend).toContainText(/₱[\d,]+\.\d{2}/, { timeout: 20000 });
  await chapter(page, "dashboard");
  await caption(page, "Spend, remaining budget and a daily average — for this month");
  await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 20000 });
  await page.mouse.wheel(0, 600);
  await caption(page, "Where it went, by category — and the trend across months");
  await page.mouse.wheel(0, -600);

  // ── 3. Add an expense, and watch the total move ───────────────────────────────────────────
  const spendBefore = ((await totalSpend.textContent()) ?? "").trim();
  await chapter(page, "add-expense");

  await page.goto("/expenses");
  await page.getByRole("button", { name: /Add Expense|Add your first expense/ }).click();
  const expenseForm = modalWithTitle(page, "New Expense");
  await caption(page, "An amount, and what it was for");
  await expenseForm.locator('input[type="number"]').first().fill("1250.50");
  await expenseForm.getByPlaceholder("What was this expense for?").fill(expenseName);
  await expenseForm.getByRole("button", { name: "Save", exact: true }).click();
  await expenseForm.waitFor({ state: "detached", timeout: 15000 });

  const expenseRow = page.locator("table tbody tr").filter({ hasText: expenseName });
  await expect(expenseRow).toHaveCount(1, { timeout: 15000 });
  await expect(expenseRow).toContainText("₱1,250.50");
  await caption(page, "Saved — and rendered as pesos, to the centavo");

  await page.goto("/");
  // The month's total is computed by the backend; the point of the scene is that it moved.
  await expect(totalSpend).not.toHaveText(spendBefore, { timeout: 20000 });
  await caption(page, "Back on the dashboard, the month's total has moved");

  // ── 4. Budgets, and the 50 / 30 / 20 rule ─────────────────────────────────────────────────
  await page.goto("/budget");
  await chapter(page, "budgets");

  await page.getByRole("button", { name: /Add Budget|Set your first budget/ }).click();
  const budgetForm = modalWithTitle(page, "Add Budget");
  await budgetForm.getByPlaceholder("Select or create a category").fill(budgetCategory);
  await budgetForm.getByRole("listitem").filter({ hasText: budgetCategory }).click();
  await budgetForm.locator('input[type="number"]').first().fill("6000");
  await caption(page, "A monthly cap, per category");
  await budgetForm.getByRole("button", { name: "Save", exact: true }).click();
  await budgetForm.waitFor({ state: "detached", timeout: 15000 });

  const budgetRow = page.locator("table tbody tr").filter({ hasText: budgetCategory });
  await expect(budgetRow).toHaveCount(1, { timeout: 15000 });
  await expect(budgetRow).toContainText("₱6,000.00");
  await caption(page, "Spent against the cap, tracked as the month goes");

  // The rule is an opt-in account setting. It is only switched on — and only filled in — when the
  // account had it off; if it is already on, those are the user's numbers and the scene just
  // shows them. `traces` records the "before" so cleanup can put it back exactly.
  const ruleBefore = await readBudgetRule(request);
  const tryIt = page.getByRole("button", { name: "Try it", exact: true });
  await caption(page, "And the 50 / 30 / 20 rule: Needs, Wants, Savings");

  if (ruleBefore && !ruleBefore.enabled && (await tryIt.isVisible().catch(() => false))) {
    await tryIt.click();
    traces.budgetRuleBefore = ruleBefore.snapshot;

    const preset = page.getByRole("button", { name: "50 / 30 / 20", exact: true });
    await expect(preset).toBeVisible({ timeout: 15000 });
    await preset.click();
    // The income input is the one that follows its own label, not "the first number on the page".
    await page.locator('label:text-is("Monthly income (₱)") + input').fill("45000");
    await caption(page, "Give it a monthly income and it splits it three ways");
    await page.getByRole("button", { name: "Save rule", exact: true }).click();
  }

  if (ruleBefore?.enabled || traces.budgetRuleBefore) {
    await expect(page.getByText("Needs", { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await caption(page, "Each bucket gets a target, and a bar that fills as you spend");
  }

  // ── 5. A savings goal ─────────────────────────────────────────────────────────────────────
  await page.goto("/goals");
  await chapter(page, "goals");

  await page.getByRole("button", { name: /^Add Goal$|Add your first goal/ }).first().click();
  const goalForm = modalWithTitle(page, "Add Goal");
  await goalForm.getByPlaceholder("e.g. Emergency Fund").fill(goalName);
  await goalForm.locator('input[type="number"]').first().fill("10000");
  await caption(page, "Name it, give it a target");
  await goalForm.getByRole("button", { name: "Add Goal", exact: true }).click();
  await goalForm.waitFor({ state: "detached", timeout: 15000 });

  const goalCard = page.locator("div.group").filter({ hasText: goalName });
  await expect(goalCard).toHaveCount(1, { timeout: 15000 });
  await expect(goalCard).toContainText("Target: ₱10,000.00");

  await goalCard.hover();
  await goalCard.getByRole("button", { name: "Edit", exact: true }).click();
  const goalEdit = modalWithTitle(page, "Edit Goal");
  await goalEdit.locator('input[type="number"]').nth(1).fill("2500");
  await caption(page, "Put money aside and the progress follows");
  await goalEdit.getByRole("button", { name: "Save Changes", exact: true }).click();
  await goalEdit.waitFor({ state: "detached", timeout: 15000 });
  await expect(goalCard).toContainText("25%");
  await caption(page, "A quarter of the way there");

  // ── 6. Recurring bills ────────────────────────────────────────────────────────────────────
  await page.goto("/recurring");
  await chapter(page, "recurring");

  await page.getByRole("button", { name: /Add Bill|Add your first bill/ }).click();
  const billForm = modalWithTitle(page, "Add Bill");
  await billForm.getByPlaceholder("e.g. Netflix, Electricity").fill(billName);
  await billForm.locator('input[type="number"]').first().fill("499");
  await caption(page, "The bills that come back every month");
  await billForm.getByRole("button", { name: "Save", exact: true }).click();
  await billForm.waitFor({ state: "detached", timeout: 15000 });

  const billRow = page.locator("table tbody tr").filter({ hasText: billName });
  await expect(billRow).toHaveCount(1, { timeout: 15000 });
  await expect(billRow).toContainText("Monthly");
  await caption(page, "Amount, category and the day it lands — all in one row");

  // ── 7. Ask the AI assistant ───────────────────────────────────────────────────────────────
  //
  // The assistant needs a provider key, and this walkthrough is recorded on a local stack that may
  // not have one. That is a first-class product state — the widget says so plainly — so the scene
  // films whichever of the two is true rather than failing on the one it did not get.
  await page.goto("/");
  await chapter(page, "assistant");
  await page.getByRole("button", { name: "Open chat" }).click();

  const ask = page.getByPlaceholder(/Ask or tell me what to do…|Add your OpenAI key in Settings…/);
  await expect(ask).toBeVisible({ timeout: 15000 });

  if (await ask.isEnabled()) {
    await caption(page, "Ask about your own money, in plain English", BEAT, "top");
    await ask.fill("How much did I spend this month?");
    const [chatResponse] = await Promise.all([
      page
        .waitForResponse((r) => r.url().includes("/ai/chat") && r.request().method() === "POST", {
          timeout: 120_000,
        })
        .catch(() => null),
      page.getByRole("button", { name: "Send" }).click(),
    ]);
    // Delete it afterwards: the answer is persisted as a conversation on the demo account.
    if (chatResponse?.ok()) {
      const body = (await chatResponse.json().catch(() => null)) as { conversationId?: string } | null;
      if (body?.conversationId) traces.conversationIds.push(String(body.conversationId));
    }
    await caption(page, "It reads the numbers the backend already has", BEAT + 800, "top");
  } else {
    await caption(page, "Bring your own OpenAI key — the assistant says so when it has none", BEAT + 800, "top");
  }
  // The panel header and the floating button are both labelled "Close chat"; either will do.
  await page.getByRole("button", { name: "Close chat" }).first().click();

  // ── 8. Export as CSV ──────────────────────────────────────────────────────────────────────
  await page.goto("/expenses");
  await chapter(page, "export");
  const exportButton = page.getByRole("button", { name: /Export CSV|Exporting…/ });
  await exportButton.scrollIntoViewIfNeeded();
  const [exported] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/expenses/export"), { timeout: 30000 }),
    exportButton.click(),
  ]);
  expect(exported.ok(), "the CSV export should come back 200").toBeTruthy();
  await caption(page, "Every expense, out as a CSV — nothing is locked in");

  // ── Close ─────────────────────────────────────────────────────────────────────────────────
  await page.goto("/");
  await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 20000 });
  await caption(page, "GastosAI — your money, tracked and explained", BEAT + 1200);
  // Nothing is torn down here on purpose: undoing the story is not part of the story, and the
  // `afterEach` sweep does it off camera for every outcome rather than only for this one.
});
