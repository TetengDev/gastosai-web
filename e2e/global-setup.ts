import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { STORAGE_STATE, login } from "./support/auth";

/**
 * Sign in once for the whole run and save the browser state.
 *
 * Every happy spec that is not itself about authentication reuses this via
 * `test.use({ storageState: STORAGE_STATE })`, which takes a UI login (a form round-trip plus a
 * dashboard load) out of each of them.
 *
 * The state file holds a real JWT for the demo account, so it is written under `e2e/.auth/`,
 * which `.gitignore` covers.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? process.env.E2E_BASE_URL ?? "http://localhost:5173";

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await login(page);
    // The first-run tour overlays the app and would swallow clicks. Login does not arm it
    // (only registration does), but the flag is cheap insurance for a reused profile.
    await page.evaluate(() => {
      localStorage.setItem("gastosai:tour:completed", "1");
      localStorage.removeItem("gastosai:tour:run");
    });
    await context.storageState({ path: STORAGE_STATE });
    await context.close();
  } finally {
    await browser.close();
  }
}
