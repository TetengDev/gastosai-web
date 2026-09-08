import { test, expect } from "@playwright/test";
import { BEAT, E2E_EMAIL as EMAIL, E2E_PASSWORD as PASSWORD, caption } from "./support";

/**
 * Slow, captioned walkthrough of the paginated Expenses feature for a client demo.
 * Produces one continuous video (test-results-demo/.../video.webm). Paced with on-screen
 * captions + deliberate pauses so it is comprehensible when presented.
 *
 * The caption helper lives in `e2e/support/caption.ts` so a later showcase reuses it.
 */

test("paginated expenses — client walkthrough", async ({ page }) => {
  // Sign in
  await page.goto("/login");
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await caption(page, "1. Sign in to GastosAI");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$|\/dashboard/, { timeout: 15000 });
  await caption(page, "Signed in — this is the dashboard");

  // Expenses — initial page
  await page.goto("/expenses");
  await expect(page.getByText(/total entries/)).toBeVisible({ timeout: 15000 });
  await caption(page, "2. Expenses page loads the first 50 rows (not all at once)");
  await page.mouse.wheel(0, 1200);
  await caption(page, "The header shows the TRUE total, e.g. '78 total entries'");

  // Load more
  const loadMore = page.getByRole("button", { name: /Load more/ });
  if (await loadMore.isVisible().catch(() => false)) {
    await loadMore.scrollIntoViewIfNeeded();
    await caption(page, "3. 'Load more' fetches the next page on demand");
    await loadMore.click();
    await page.waitForTimeout(800);
    await caption(page, "More rows appended — the button disappears at the end");
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(BEAT);
  }

  // Date filter
  await page.mouse.wheel(0, -3000);
  const dates = page.locator('input[type="date"]');
  await caption(page, "4. Filter by date range");
  await dates.first().fill("2099-01-01");
  await dates.last().fill("2099-12-31");
  await expect(page.getByText(/No expenses match this filter/)).toBeVisible({ timeout: 15000 });
  await caption(page, "A future range shows the empty state cleanly");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15000 });
  await caption(page, "Cleared — back to the paged list");

  // Dashboard regression
  await page.goto("/");
  await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 20000 });
  await caption(page, "5. Dashboard charts still render — nothing regressed");
  await caption(page, "Paginated Expenses — working end to end ✓");
});
