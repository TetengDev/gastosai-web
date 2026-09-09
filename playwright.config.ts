import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for gastosai. Drives a real browser against the locally running app
 * (frontend :5173, backend :8080). Records video + screenshots for every test so a
 * run produces shareable artifacts (see ai/skills/e2e-release-verification.md).
 *
 * The happy-flow suite lives in `e2e/happy/` and every test there is tagged `@happy`, so
 * `npm run e2e:happy` selects it by tag and the older specs stay where they are.
 *
 * Opt-in / local only — NOT wired into the blocking CI (chromium download is heavy).
 * Prereqs: stack running (docker compose up -d; backend spring-boot:run; npm run dev)
 * with the demo user seeded.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  // Signs in once and writes `e2e/.auth/state.json`; the `@happy` specs reuse it instead of
  // logging in through the UI each time. See e2e/global-setup.ts.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    video: "on",
    screenshot: "on",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
