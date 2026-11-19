import { expect, test } from "@playwright/test";
import { ACCOUNTS, accountFor, isAiCall, settingsFrom, summarize } from "./plan.ts";

/**
 * The load run's guard rails, checked without running it: running it takes minutes and the whole
 * local stack. Playwright rather than Vitest because `vite.config.ts` excludes `e2e/**`, the same
 * reason as `e2e/showcase.demo.test.ts`.
 */

test.describe("load run · target guard", () => {
  test("defaults to the local web app and API", () => {
    expect(settingsFrom({})).toEqual({
      target: "http://localhost:5173",
      api: "http://localhost:8080",
      users: 10,
      rampSeconds: 60,
      holdSeconds: 60,
    });
  });

  test("refuses a remote target, naming the override and why it exists", () => {
    expect(() => settingsFrom({ LOAD_TARGET: "https://example.com" })).toThrow(
      /Refusing.*example\.com.*LOAD_ALLOW_REMOTE=1.*non-local backend leaves rows behind/s
    );
  });

  test("refuses a remote API behind a local web app", () => {
    expect(() => settingsFrom({ LOAD_API_URL: "https://api.example.com" })).toThrow(/LOAD_ALLOW_REMOTE/);
  });

  test("compares origins, not prefixes", () => {
    for (const target of [
      "http://localhost:5173.evil.test",
      "https://localhost:5173",
      "http://127.0.0.1:5173",
      "not a url",
    ]) {
      expect(() => settingsFrom({ LOAD_TARGET: target }), target).toThrow(/Refusing/);
    }
    expect(settingsFrom({ LOAD_TARGET: "http://localhost:5173/" }).target).toBe("http://localhost:5173/");
  });

  test("LOAD_ALLOW_REMOTE=1 lets a remote target through", () => {
    expect(
      settingsFrom({ LOAD_TARGET: "https://example.com", LOAD_ALLOW_REMOTE: "1" }).target
    ).toBe("https://example.com");
  });
});

test.describe("load run · shape", () => {
  test("reads the ramp from the environment", () => {
    expect(
      settingsFrom({ LOAD_USERS: "4", LOAD_RAMP_SECONDS: "20", LOAD_HOLD_SECONDS: "30" })
    ).toMatchObject({ users: 4, rampSeconds: 20, holdSeconds: 30 });
  });

  test("rejects a shape that is not a positive whole number", () => {
    for (const bad of ["0", "-3", "2.5", "ten", ""]) {
      expect(() => settingsFrom({ LOAD_USERS: bad }), bad).toThrow(/LOAD_USERS/);
    }
  });

  test("spreads users round-robin over the four seeded accounts", () => {
    expect(ACCOUNTS.map((a) => a.email)).toEqual([
      "demo@gastosai.dev",
      "free@gastosai.dev",
      "premium@gastosai.dev",
      "trial@gastosai.dev",
    ]);
    expect([0, 1, 2, 3, 4, 9].map((vu) => accountFor(vu).email)).toEqual([
      "demo@gastosai.dev",
      "free@gastosai.dev",
      "premium@gastosai.dev",
      "trial@gastosai.dev",
      "demo@gastosai.dev",
      "free@gastosai.dev",
    ]);
  });
});

test.describe("load run · AI guard", () => {
  const api = "http://localhost:8080";

  test("flags every LLM-backed route, versioned or not", () => {
    for (const path of [
      "/api/v2/ai/chat",
      "/ai/chat/confirm",
      "/api/v2/ai/query",
      "/api/v2/ai/vision",
      "/api/v2/ai/insights/top-category?month=2026-11",
    ]) {
      expect(isAiCall(`${api}${path}`, api), path).toBe(true);
    }
  });

  test("lets plain reads and the app's own source files through", () => {
    for (const url of [
      `${api}/api/v2/chat/conversations`,
      `${api}/api/v2/user/ai-settings`,
      `${api}/api/v2/ai/usage`,
      `${api}/api/v2/ai/languages`,
      `${api}/api/v2/expenses`,
      "http://localhost:5173/src/api/ai.ts",
      "http://localhost:5173/src/components/chat/chatActions.ts",
    ]) {
      expect(isAiCall(url, api), url).toBe(false);
    }
  });
});

test.describe("load run · summary", () => {
  const s = (p50: number, p95: number, p99: number) => ({ p50, p95, p99 });

  test("prints page-load and step percentiles, HTTP errors by status, and failed users", () => {
    const { text, failed } = summarize({
      aggregate: {
        counters: {
          "vusers.created": 10,
          "vusers.failed": 2,
          "browser.page.codes.200": 900,
          "browser.page.codes.304": 40,
          "browser.page.codes.429": 3,
          "browser.page.codes.500": 1,
          "load.http_error.500 GET /api/v2/alerts": 1,
          "load.http_error.429 POST /api/v2/expenses": 3,
          "errors.pw_failed_assertion.toBeVisible": 2,
        },
        summaries: {
          "browser.page.TTFB.http://localhost:5173/expenses": s(5, 12.4, 30),
          "browser.page.CLS.http://localhost:5173/expenses": s(0.1, 0.2, 0.3),
          "browser.step.sign_in": s(900, 1500.6, 2100),
          "vusers.session_length": s(1, 2, 3),
        },
      },
    });

    expect(failed).toBe(2);
    expect(text).toMatch(/TTFB \/expenses\s+5\s+12\s+30/);
    expect(text).toMatch(/sign_in\s+900\s+1501\s+2100/);
    // By status, then the requests behind them, most frequent first.
    expect(text).toContain(
      "HTTP errors by status: 429 × 3, 500 × 1\n" +
        "  429 POST /api/v2/expenses × 3\n" +
        "  500 GET /api/v2/alerts × 1"
    );
    expect(text).toContain("Failed virtual users: 2 of 10");
    expect(text).toContain("pw_failed_assertion.toBeVisible × 2");
    // Not load times, and not errors.
    expect(text).not.toContain("CLS");
    expect(text).not.toContain("session_length");
    expect(text).not.toMatch(/\b(200|304) ×/);
  });

  test("says so when nothing failed", () => {
    const { text, failed } = summarize({ aggregate: { counters: { "vusers.created": 1 } } });
    expect(failed).toBe(0);
    expect(text).toContain("HTTP errors by status: none");
    expect(text).toContain("Failed virtual users: 0 of 1");
  });
});
