import { defineConfig, devices } from "@playwright/test";

/**
 * Presentation/demo recording config — slow, narrated walkthrough for sharing with
 * non-technical stakeholders (client demos). Separate from the fast verification suite:
 * matches only `*.demo.ts`, runs headed-style with slowMo + a larger viewport, and records
 * a high-ish-res video. Run: `npm run e2e:demo`. Output in `test-results-demo/`.
 *
 * The showcase (`e2e/showcase.demo.ts`, recorded by `scripts/record-showcase.sh`) runs under this
 * config too, and is what the timeout below is sized for: it walks the whole product in one take,
 * with every caption held long enough to read, so it takes minutes rather than seconds. Each demo
 * still sets its own `test.setTimeout` — this is only the ceiling under them.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.demo.ts",
  outputDir: "test-results-demo",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 900_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    video: { mode: "on", size: { width: 1366, height: 900 } },
    viewport: { width: 1366, height: 900 },
    launchOptions: { slowMo: 600 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
