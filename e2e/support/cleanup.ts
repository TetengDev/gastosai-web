import type { APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import { API_BASE, E2E_EMAIL, E2E_PASSWORD, STORAGE_STATE } from "./auth";
import { RUN_ID } from "./run-id";

/**
 * The JWT global setup already saved, read straight off `storageState`.
 *
 * The backend rate-limits `/auth/login`, and a sweep that signed in for itself would spend one
 * of those attempts after every test — enough, with the suite's own two logins, to trip the
 * limit and fail the next run. Reading the token global setup already paid for costs nothing.
 */
function tokenFromStorageState(): string | null {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, "utf8")) as {
      origins?: { localStorage?: { name: string; value: string }[] }[];
    };
    for (const origin of state.origins ?? []) {
      const entry = origin.localStorage?.find((i) => i.name === "token");
      if (entry?.value) return entry.value;
    }
  } catch {
    // No state file yet (or unreadable) — fall back to signing in.
  }
  return null;
}

let cachedToken: string | null = null;

/** The month this process started in, so a sweep after midnight still finds the run's budget. */
const startMonth = new Date().toISOString().slice(0, 7);

const budgetMonths = (): string[] => {
  const now = new Date().toISOString().slice(0, 7);
  return now === startMonth ? [now] : [startMonth, now];
};

/**
 * `Authorization` for an API-side call, without spending a login: the saved session's token,
 * and only signing in if there is no saved session to read.
 */
export async function apiHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  if (!cachedToken) {
    cachedToken = tokenFromStorageState();
  }
  if (!cachedToken) {
    const auth = await request.post(`${API_BASE}/auth/login`, {
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    });
    if (!auth.ok()) throw new Error(`e2e cleanup could not sign in: HTTP ${auth.status()}`);
    cachedToken = (await auth.json()).token as string;
  }
  return { Authorization: `Bearer ${cachedToken}` };
}

/**
 * Remove everything this run created, whatever the test's outcome.
 *
 * The in-test delete steps are part of the flows under test and stay where they are — this is
 * the net under them. A spec that fails on an assertion between "create" and "delete" would
 * otherwise orphan its row forever, and the suite is meant to run unattended on a timer, where
 * a repeating failure would silently pile `… E2E <run-id>` rows into the demo account and skew
 * the very dashboard the suite checks.
 *
 * Selection is by `RUN_ID`, so a sweep can only ever touch data this process named. It works off
 * the API rather than the browser, so it still runs when a test failed with the page in any
 * state at all. Returns what it deleted, which is what `cleanup.spec.ts` asserts on.
 */
export async function sweepRunData(request: APIRequestContext): Promise<string[]> {
  const headers = await apiHeaders(request);

  const removed: string[] = [];
  // Substring, because the id sits inside a name the specs build — and the id carries four
  // random characters, so matching something a person happened to type is not a real case.
  const mine = (value: unknown): boolean => typeof value === "string" && value.includes(RUN_ID);

  const sweep = async (
    listPath: string,
    deletePath: string,
    label: string,
    nameOf: (row: Record<string, unknown>) => unknown
  ) => {
    const listed = await request.get(`${API_BASE}/${listPath}`, { headers });
    if (!listed.ok()) return;
    for (const row of (await listed.json()) as Record<string, unknown>[]) {
      if (!mine(nameOf(row))) continue;
      const gone = await request.delete(`${API_BASE}/${deletePath}/${row.id}`, { headers });
      if (gone.ok()) {
        removed.push(`${label} ${String(nameOf(row))}`);
      } else {
        // Never silent: a delete that keeps failing (a foreign key still pointing at the row,
        // say) is the accumulation this sweep exists to prevent, and only the run's own output
        // can surface it — no assertion is watching the other specs' afterEach sweeps.
        console.warn(
          `e2e cleanup could not delete ${label} ${row.id} (${String(nameOf(row))}): HTTP ${gone.status()}`
        );
      }
    }
  };

  await sweep("expenses", "expenses", "expense", (e) => e.description);
  // Budgets and bills reference a category, so they go before the categories they hang on.
  // `/budgets` lists one month at a time, and a run that started at 23:59 would look for its
  // own budget in the wrong month — so both the month the process started in and the month it
  // is in now get swept.
  for (const month of budgetMonths()) {
    await sweep(`budgets?month=${month}`, "budgets", "budget", (b) => b.categoryName);
  }
  await sweep("recurring", "recurring", "bill", (b) => b.name);
  await sweep("goals", "goals", "goal", (g) => g.name);
  await sweep("categories", "categories", "category", (c) => c.name);

  return removed;
}
