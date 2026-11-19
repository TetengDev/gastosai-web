import { expect, test } from "@playwright/test";
import { sweepAccount } from "./sweep.ts";

/**
 * The sweep deletes rows from real accounts, so what it selects and in which order it deletes are
 * checked against a fake backend. Playwright rather than Vitest: `vite.config.ts` excludes `e2e/**`.
 */

const account = { email: "demo@gastosai.dev", password: "demo123" };
const api = "http://localhost:8080";
const RUN = "mwnabc12";

type Rows = Record<string, Record<string, unknown>[]>;

/** A fake API: lists come from `rows`, every call is recorded as `METHOD path`. */
function backend(rows: Rows, loginStatuses: number[] = [200]) {
  const calls: string[] = [];
  const fake = (async (input: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = String(input).slice(`${api}/api/v2/`.length);
    calls.push(`${method} ${path}`);
    if (path === "auth/login") {
      const status = loginStatuses.shift() ?? 200;
      return new Response(JSON.stringify({ token: "t" }), { status });
    }
    if (method === "DELETE") return new Response(null, { status: 204 });
    return Response.json(rows[path] ?? []);
  }) as typeof fetch;
  return { fake, calls };
}

const options = (fake: typeof fetch) => ({
  api,
  runId: RUN,
  months: ["2026-11"],
  fetch: fake,
  sleep: async () => {},
});

test.describe("load run · sweep", () => {
  test("deletes only rows ending in this run's ` E2E <run-id>`", async () => {
    const { fake, calls } = backend({
      expenses: [
        { id: 1, description: `Load expense u0p0 E2E ${RUN}` },
        { id: 2, description: "Lunch" },
        // Another run, and a run id that merely appears inside a name: both left alone.
        { id: 3, description: "Coffee E2E othr1234" },
        { id: 4, description: `${RUN} notes` },
      ],
    });
    const { removed, failed } = await sweepAccount(account, options(fake));
    expect(failed).toEqual([]);
    expect(removed).toEqual([`demo@gastosai.dev: expenses "Load expense u0p0 E2E ${RUN}" (HTTP 204)`]);
    expect(calls.filter((c) => c.startsWith("DELETE"))).toEqual(["DELETE expenses/1"]);
  });

  test("deletes a budget before the category it hangs on", async () => {
    const name = `Load budget u1p0 E2E ${RUN}`;
    const { fake, calls } = backend({
      "budgets?month=2026-11": [{ id: 7, categoryName: name }],
      categories: [{ id: 9, name }],
    });
    await sweepAccount(account, options(fake));
    expect(calls.filter((c) => c.startsWith("DELETE"))).toEqual(["DELETE budgets/7", "DELETE categories/9"]);
  });

  test("waits out a rate-limited sign-in once, then sweeps", async () => {
    const { fake, calls } = backend({ expenses: [{ id: 1, description: `x E2E ${RUN}` }] }, [429, 200]);
    const { removed } = await sweepAccount(account, options(fake));
    expect(calls.filter((c) => c === "POST auth/login")).toHaveLength(2);
    expect(removed).toHaveLength(1);
  });

  test("reports a dead backend instead of throwing", async () => {
    const dead = (async () => {
      throw new Error("fetch failed");
    }) as typeof fetch;
    expect(await sweepAccount(account, options(dead))).toEqual({
      removed: [],
      failed: ["demo@gastosai.dev: fetch failed"],
    });
  });
});
