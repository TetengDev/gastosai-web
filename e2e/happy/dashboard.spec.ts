import { expect, test } from "@playwright/test";
import { STORAGE_STATE } from "../support";

test.use({ storageState: STORAGE_STATE });

/** Read-only: the dashboard creates nothing, so there is nothing for it to clean up. */
test.describe("Happy · dashboard", { tag: "@happy" }, () => {
  test("renders the KPI strip and the charts", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/Total Spend ·/)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Remaining Budget", { exact: true })).toBeVisible();
    await expect(page.getByText("Daily Average", { exact: true })).toBeVisible();

    // The hero KPI is money, so it renders a peso amount rather than a skeleton or a dash.
    // `bg-hero` is the tile's own class — the tile carries no heading or role to select on.
    const totalSpend = page.locator("div.bg-hero").filter({ hasText: /Total Spend ·/ });
    await expect(totalSpend).toContainText(/₱[\d,]+\.\d{2}/);

    await expect(page.getByText("Spending by Category")).toBeVisible();
    await expect(page.getByText("Monthly Trend")).toBeVisible();
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 20000 });
  });
});
