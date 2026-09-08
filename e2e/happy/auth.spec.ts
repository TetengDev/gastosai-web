import { expect, test } from "@playwright/test";
import { login, signOut } from "../support";

/**
 * The one happy spec that must not reuse `storageState`: signing in through the form is the
 * behaviour under test, so it starts from a browser with no session at all.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Happy · authentication", { tag: "@happy" }, () => {
  test("signs in with the demo account and signs back out", async ({ page }) => {
    await login(page);

    // Signed in: the app shell is up and the protected dashboard rendered.
    await expect(page.getByRole("link", { name: "Expenses" })).toBeVisible();

    await signOut(page);

    // Signed out: the session is gone and a protected route bounces back to /login.
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
    await page.goto("/expenses");
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
  });
});
