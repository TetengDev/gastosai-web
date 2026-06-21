import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for gastosai. Drives a real browser against the locally running app
 * (frontend :5173, backend :8080). Records video + screenshots for every test so a
 * run produces shareable artifacts (see ai/skills/e2e-release-verification.md).
 *
 * Opt-in / local only — NOT wired into the blocking CI (chromium download is heavy).
 * Prereqs: stack running (docker compose up -d; backend spring-boot:run; npm run dev)
 * with the demo user seeded.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
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
