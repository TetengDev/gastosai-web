import { test, expect } from "@playwright/test";
import { E2E_EMAIL as EMAIL, E2E_PASSWORD as PASSWORD, caption } from "./support";

/**
 * Slow, captioned walkthrough of the Expenses list (one month, grouped by day) for a client demo.
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

  // Expenses: one month at a time, grouped by day (TEN-440)
  await page.goto("/expenses");
  await expect(page.getByText(/total entr(y|ies)/)).toBeVisible({ timeout: 15000 });
  await caption(page, "2. Expenses shows one month, grouped by day with each day's total");
  await page.mouse.wheel(0, 1200);
  await caption(page, "The header still shows the account's true total");

  // Month stepper
  await page.mouse.wheel(0, -3000);
  const label = page.locator('span[aria-live="polite"]').filter({ hasText: /\d{4}/ });
  const current = (await label.textContent()) ?? "";
  await caption(page, "3. Step back a month");
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(label).not.toHaveText(current);
  await caption(page, "The list, the day totals and the export range move with it");

  // Export range under More actions
  await page.getByRole("button", { name: "More actions" }).click();
  await expect(page.getByLabel("Export from")).toBeVisible();
  await caption(page, "4. Export keeps its own From and To, starting at the month on screen");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(label).toHaveText(current);
  await caption(page, "Back to this month");

  // Dashboard regression
  await page.goto("/");
  await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 20000 });
  await caption(page, "5. Dashboard charts still render — nothing regressed");
  await caption(page, "Expenses by month, working end to end ✓");
});
