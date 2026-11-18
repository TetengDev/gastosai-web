import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE_STATE } from "./support";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * End-to-end verification of the Expenses list: one month at a time, grouped by day (TEN-440;
 * it replaced the paginated all-time list of Slice B, 0.47.0).
 * Runs against the live app; produces a video per test plus explicit screenshots
 * in e2e/artifacts/ for sharing to Telegram.
 */

const ARTIFACTS = path.join(here, "artifacts");

test.use({ storageState: STORAGE_STATE });

async function shot(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: true });
}

/** `yyyy-mm` in Manila, moved by whole months: the keys the stepper and the export range use. */
function manilaMonth(delta = 0): string {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function lastDay(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return `${yyyyMM}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

test.describe("Expenses by month", () => {
  // TEN-440 replaced the paged all-time list with one month at a time, grouped by day.
  test("loads the month grouped by day, with the true total in the header", async ({ page }) => {
    await page.goto("/expenses");

    // Subtitle shows the account's real total, e.g. "78 total entries".
    await expect(page.getByText(/total entr(y|ies)/)).toBeVisible({ timeout: 15000 });
    await shot(page, "01-expenses-initial");

    // Whatever the data: every day group opens with its day header, and the month either has
    // groups or says it has none.
    const groups = page.locator("table tbody");
    const headers = page.locator('table tbody > tr:first-child > th[scope="rowgroup"]');
    if ((await groups.count()) > 0) {
      await expect(headers).toHaveCount(await groups.count());
    } else {
      await expect(page.getByText(/Nothing logged in/)).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /Load more/ })).toHaveCount(0);
  });

  test("the stepper moves the month, and the export range follows it", async ({ page }) => {
    await page.goto("/expenses");
    await expect(page.getByText(/total entr(y|ies)/)).toBeVisible({ timeout: 15000 });

    const label = page.locator('span[aria-live="polite"]').filter({ hasText: /\d{4}/ });
    const current = (await label.textContent()) ?? "";
    await expect(page.getByRole("button", { name: "Next month" })).toHaveAttribute("aria-disabled", "true");

    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(label).not.toHaveText(current);
    await page.getByRole("button", { name: "More actions" }).click();
    const previous = manilaMonth(-1);
    await expect(page.getByLabel("Export from")).toHaveValue(`${previous}-01`);
    await expect(page.getByLabel("Export to")).toHaveValue(lastDay(previous));
    await shot(page, "03-expenses-previous-month");

    // A custom range stays possible from the same fields.
    await page.getByLabel("Export from").fill("2099-01-01");
    await expect(page.getByLabel("Export from")).toHaveValue("2099-01-01");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Next month" }).click();
    await expect(label).toHaveText(current);
    await page.getByRole("button", { name: "More actions" }).click();
    await expect(page.getByLabel("Export from")).toHaveValue(`${manilaMonth()}-01`);
    await shot(page, "04-expenses-back-to-current");
  });

  test("dashboard still renders (full-list path unchanged)", async ({ page }) => {
    await page.goto("/");
    // Charts/cards present — pick a stable dashboard signal.
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 20000 });
    await shot(page, "05-dashboard");
  });
});
