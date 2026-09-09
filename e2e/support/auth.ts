import { expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The demo account the backend fixes at startup from its `.env`. */
export const E2E_EMAIL = process.env.E2E_EMAIL ?? "demo@gastosai.dev";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "demo123";

/** Backend origin. The app's own client appends `/api/v2` (see `src/api/client.ts`). */
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8080";
export const API_BASE = `${API_URL}/api/v2`;

/**
 * Where `global-setup.ts` writes the signed-in browser state. Gitignored: it holds a real JWT
 * for the demo account, so it is a build artifact and never a tracked file.
 */
export const STORAGE_STATE = path.join(here, "..", ".auth", "state.json");

/**
 * Sign in through the login form and land on the dashboard.
 *
 * Global setup calls this once; the sign-in/sign-out spec calls it again because logging in is
 * the thing it is verifying. Every other happy spec reuses `STORAGE_STATE` instead.
 */
export async function login(
  page: Page,
  email: string = E2E_EMAIL,
  password: string = E2E_PASSWORD
): Promise<void> {
  await page.goto("/login");
  // Two email inputs exist (password form + magic-link form); use the password form's.
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Login redirects to "/".
  await expect(page).toHaveURL(/\/$|\/dashboard/, { timeout: 15000 });
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 15000 });
}

/** Sign out from the navbar and land back on the login screen. */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
}

/** The JWT the app stored for the signed-in session, for API-side setup and cleanup. */
export async function authToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token, "expected a JWT in localStorage — is the session signed in?").toBeTruthy();
  return token as string;
}
