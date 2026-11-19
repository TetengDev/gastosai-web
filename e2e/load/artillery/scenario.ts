import { chromium, type Page } from "@playwright/test";
import { confirmInModal, modalWithTitle } from "../../support/dialog.ts";
import { uniqueName } from "../../support/run-id.ts";
import { HTTP_ERROR, accountFor, isAiCall, settingsFrom } from "../plan.ts";

/**
 * The Artillery script behind `npm run load:local`. Start it through `run.ts`, which also sweeps
 * leftovers and prints the summary.
 *
 * Artillery bundles this file to CommonJS in `dist/`, which is why this folder has its own
 * `package.json`: the repo is `"type": "module"`.
 *
 * Each virtual user signs in once, then repeats the flows until the run's end. That shape is
 * set by the backend's limits, not by taste. Sign-in is capped per IP (10 a minute, and every
 * virtual user comes from localhost), so a user cannot sign in again on every pass. Writes are
 * capped at 60 a minute per account, so each pass is paced: see `PASS_MS`.
 */

const settings = settingsFrom(process.env);
const API_BASE = `${settings.api}/api/v2`;

/** When a user stops starting new passes: the end of the hold phase. */
const endAt = Date.now() + (settings.rampSeconds + settings.holdSeconds) * 1000;

/**
 * A pass makes about six writes. Ten users on four accounts put three on one account, so one
 * pass every 30 s keeps an account near 36 writes a minute, under the cap of 60.
 * ponytail: fixed pace. Raising LOAD_USERS past ~16 puts five users on one account, and that
 * account starts hitting 429. Make this a setting when someone needs more users.
 */
const PASS_MS = 30_000;

export const config = {
  target: settings.target,
  phases: [
    // One user every rampSeconds/users seconds, from 1 user up to `users`.
    { name: "ramp", duration: settings.rampSeconds, arrivalCount: settings.users },
    // No new arrivals: the users already in keep running their passes.
    { name: "hold", pause: settings.holdSeconds },
  ],
  engines: {
    playwright: {
      // Artillery ships its own Playwright client; the browser is the one the repo's
      // @playwright/test already installed, so the run downloads no second Chromium.
      launchOptions: { executablePath: chromium.executablePath() },
    },
  },
};

type Step = (name: string, actions: () => Promise<void>) => Promise<void>;

/** Artillery's engine runs one worker for Playwright, so a module counter numbers users. */
let users = 0;

type Events = { emit: (type: "counter", name: string, value: number) => void };

async function signedInUser(page: Page, _vu: unknown, events: Events, test: { step: Step }) {
  const vu = users++;
  const { email, password } = accountFor(vu);

  // Watched rather than blocked: routing would intercept every request and skew the timings.
  const aiCalls: string[] = [];
  page.on("request", (request) => {
    if (isAiCall(request.url(), settings.api)) aiCalls.push(request.url());
  });
  // Artillery counts responses by status only; this names the request behind each error.
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const { pathname } = new URL(response.url());
    events.emit("counter", `${HTTP_ERROR}${response.status()} ${response.request().method()} ${pathname}`, 1);
  });
  const step: Step = async (name, actions) => {
    await test.step(name, actions);
    if (aiCalls.length) throw new Error(`AI endpoint called during ${name}: ${aiCalls[0]}`);
  };

  let token = "";
  await step("sign_in", async () => {
    await page.goto("/login");
    // Two email inputs exist (password form + magic-link form); use the password form's.
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("button", { name: "Sign out" }).waitFor();
    token = (await page.evaluate(() => localStorage.getItem("token"))) ?? "";
  });
  const headers = { Authorization: `Bearer ${token}` };

  for (let pass = 0; Date.now() < endAt; pass++) {
    const started = Date.now();
    // RUN_ID alone is shared by every user in the run; the user and pass make each name unique.
    const tag = `u${vu}p${pass}`;

    await step("dashboard", async () => {
      await page.goto("/");
      await page.locator("div.bg-hero").filter({ hasText: /Total Spend ·/ }).waitFor();
    });

    const description = uniqueName(`Load expense ${tag}`);
    const expense = page.locator("table tbody tr").filter({ hasText: description });
    await step("add_expense", async () => {
      await page.goto("/expenses");
      await page.getByRole("button", { name: /Add Expense|Log your first expense/ }).click();
      const form = modalWithTitle(page, "New Expense");
      await form.locator('input[type="number"]').first().fill("150.75");
      await form.getByPlaceholder("Lunch at Jollibee").fill(description);
      await form.getByRole("button", { name: "Save", exact: true }).click();
      await form.waitFor({ state: "detached" });
      await expense.waitFor();
    });
    await step("delete_expense", async () => {
      await expense.hover();
      await expense.getByRole("button", { name: "Delete", exact: true }).click();
      await confirmInModal(page, "Delete expense?");
      await expense.waitFor({ state: "detached" });
    });

    // A fresh category per pass: a budget is unique per (category, month).
    const category = uniqueName(`Load budget ${tag}`);
    const budget = page.locator("table tbody tr").filter({ hasText: category });
    await step("create_budget", async () => {
      await page.goto("/budget");
      await page.getByRole("button", { name: /Add Budget|Set your first budget/ }).click();
      const form = modalWithTitle(page, "Add Budget");
      await form.getByPlaceholder("Select or create a category").fill(category);
      await form.getByRole("listitem").filter({ hasText: category }).click();
      await form.locator('input[type="number"]').first().fill("2500");
      await form.getByRole("button", { name: "Save", exact: true }).click();
      await form.waitFor({ state: "detached" });
      await budget.waitFor();
    });
    await step("delete_budget", async () => {
      await budget.getByRole("button", { name: "Delete", exact: true }).click();
      await confirmInModal(page, `Delete budget for "${category}"?`);
      await budget.waitFor({ state: "detached" });
      // The category is this pass's data too. No page deletes one, so the API does, with the
      // session's own token, as e2e/happy/budget.spec.ts does.
      const listed = await page.request.get(`${API_BASE}/categories`, { headers });
      const created = ((await listed.json()) as { id: number; name: string }[]).find(
        (c) => c.name === category
      );
      if (!created) throw new Error(`category "${category}" missing before cleanup`);
      const gone = await page.request.delete(`${API_BASE}/categories/${created.id}`, { headers });
      if (!gone.ok()) throw new Error(`could not delete category "${category}": HTTP ${gone.status()}`);
    });

    await step("goals", async () => {
      await page.goto("/goals");
      await page.getByRole("button", { name: /^Add Goal$|Add your first goal/ }).first().waitFor();
    });
    await step("recurring", async () => {
      await page.goto("/recurring");
      await page.getByRole("button", { name: /Add Bill|Add your first bill/ }).first().waitFor();
    });

    // Think time to the next pass, never past the end of the run.
    await page.waitForTimeout(Math.max(0, Math.min(started + PASS_MS, endAt) - Date.now()));
  }
}

export const scenarios = [{ name: "signed-in user", engine: "playwright", testFunction: signedInUser }];
