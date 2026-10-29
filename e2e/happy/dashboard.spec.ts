import { expect, test } from "@playwright/test";
import { STORAGE_STATE } from "../support";

test.use({ storageState: STORAGE_STATE });

/** Read-only: the dashboard creates nothing, so there is nothing for it to clean up. */
test.describe("Happy · dashboard", { tag: "@happy" }, () => {
  test("leads with the Piso hero and keeps insights one click away", async ({ page }) => {
    await page.goto("/");

    // `bg-hero` is the tile's own class; the showcase demo selects on it too.
    const hero = page.locator("div.bg-hero").filter({ hasText: /Total Spend ·/ });
    await expect(hero).toBeVisible({ timeout: 20000 });
    // The hero figure is money, so it renders a peso amount rather than a skeleton or a dash.
    await expect(hero).toContainText(/₱[\d,]+\.\d{2}/);
    // One Piso, beside the figure, wearing whatever mood the data picked.
    await expect(hero.locator("svg[data-piso-state]")).toHaveCount(1);
    await expect(hero.getByTestId("hero-status")).not.toBeEmpty();

    await expect(page.getByRole("heading", { name: "Goals", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent", exact: true })).toBeVisible();

    // Insights start collapsed, and opening them brings the charts in.
    const insights = page.getByRole("button", { name: /Insights/ });
    await expect(insights).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Monthly Trend")).toHaveCount(0);
    await insights.click();
    await expect(insights).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Monthly Trend")).toBeVisible();
    await expect(page.getByText("Spending by Category")).toBeVisible();
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 20000 });
  });
});
