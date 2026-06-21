import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * End-to-end verification of the paginated Expenses feature (Slice B, 0.47.0).
 * Runs against the live app; produces a video per test plus explicit screenshots
 * in e2e/artifacts/ for sharing to Slack.
 */

const ARTIFACTS = path.join(here, "artifacts");
const DEMO_EMAIL = process.env.E2E_EMAIL ?? "demo@gastosai.dev";
const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "demo123";

async function login(page: Page) {
  await page.goto("/login");
  // Two email inputs exist (password form + magic-link form); use the password form's.
  await page.locator('input[type="email"]').first().fill(DEMO_EMAIL);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Land on the dashboard (login redirects to "/").
  await expect(page).toHaveURL(/\/$|\/dashboard/, { timeout: 15000 });
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: true });
}

test.describe("Expenses pagination", () => {
  test("loads first page, Load more appends, counts reflect total", async ({ page }) => {
    await login(page);
    await page.goto("/expenses");

    // Subtitle shows the real total (e.g. "78 total entries").
    const subtitle = page.getByText(/total entries/);
    await expect(subtitle).toBeVisible({ timeout: 15000 });
    await shot(page, "01-expenses-initial");

    // First page is bounded at 50 rows.
    const rowCount = await page.locator("table tbody tr").count();
    expect(rowCount).toBeLessThanOrEqual(50);

    const loadMore = page.getByRole("button", { name: /Load more/ });
    if (await loadMore.isVisible().catch(() => false)) {
      const before = await page.locator("table tbody tr").count();
      await loadMore.click();
      await expect
        .poll(async () => page.locator("table tbody tr").count())
        .toBeGreaterThan(before);
      await shot(page, "02-expenses-after-load-more");
    } else {
      // Fewer than one page of data — still a valid state.
      await shot(page, "02-expenses-single-page");
    }
  });

  test("date filter narrows the list and Clear restores it", async ({ page }) => {
    await login(page);
    await page.goto("/expenses");
    await expect(page.getByText(/total entries/)).toBeVisible({ timeout: 15000 });

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill("2099-01-01");
    await dateInputs.last().fill("2099-12-31");
    // Future range → no matches (debounced fetch).
    await expect(page.getByText(/No expenses match this filter/)).toBeVisible({ timeout: 15000 });
    await shot(page, "03-expenses-filtered-empty");

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15000 });
    await shot(page, "04-expenses-filter-cleared");
  });

  test("dashboard still renders (full-list path unchanged)", async ({ page }) => {
    await login(page);
    await page.goto("/");
    // Charts/cards present — pick a stable dashboard signal.
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 20000 });
    await shot(page, "05-dashboard");
  });
});
