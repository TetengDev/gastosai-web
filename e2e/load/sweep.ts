import type { Account } from "./plan.ts";

/**
 * The net under the load run's in-pass deletes: remove what one account still holds from this run.
 *
 * Same rule as `sweepRunData` in e2e/support (select by run id), which it cannot call: that holds
 * one cached demo-account session, and the load run writes as four accounts. Tighter than it, too:
 * a row must end in `uniqueName`'s own ` E2E <run-id>` suffix, so a short hand-set `E2E_RUN_ID`
 * cannot match a person's data.
 *
 * Never throws. A backend that died under load is exactly what a load run can find, and the run's
 * summary must still print, so every failure comes back as a line in `failed`.
 */
export type SweepOptions = {
  api: string;
  runId: string;
  /** Budget months to look in (`YYYY-MM`): a run can cross a month boundary. */
  months: string[];
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export type SweepResult = { removed: string[]; failed: string[] };

/** Per request. A backend that has stopped answering must not hang the sweep. */
const TIMEOUT_MS = 15_000;

export async function sweepAccount(account: Account, options: SweepOptions): Promise<SweepResult> {
  const {
    api,
    runId,
    months,
    fetch: send = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;
  const removed: string[] = [];
  const failed: string[] = [];
  const call = (path: string, init: RequestInit = {}) =>
    send(`${api}/api/v2/${path}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const mine = (name: unknown): name is string =>
    typeof name === "string" && name.endsWith(` E2E ${runId}`);

  try {
    const signIn = () =>
      call("auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account),
      });
    let login = await signIn();
    if (login.status === 429) {
      // Sign-in is capped per IP, and the run's users have just spent this minute's attempts.
      console.log(`Sweep: sign-in rate-limited for ${account.email}; retrying in 60 s.`);
      await sleep(60_000);
      login = await signIn();
    }
    if (!login.ok) return { removed, failed: [`${account.email}: sign-in failed, HTTP ${login.status}`] };
    const headers = { Authorization: `Bearer ${((await login.json()) as { token: string }).token}` };

    type List = [path: string, resource: string, nameOf: (row: Record<string, unknown>) => unknown];
    const lists: List[] = [
      ["expenses", "expenses", (e) => e.description],
      // Budgets go before the categories they hang on, or the category delete is refused.
      ...months.map((m): List => [`budgets?month=${m}`, "budgets", (b) => b.categoryName]),
      ["categories", "categories", (c) => c.name],
    ];
    for (const [path, resource, nameOf] of lists) {
      const listed = await call(path, { headers });
      if (!listed.ok) {
        failed.push(`${account.email}: could not list ${path}, HTTP ${listed.status}`);
        continue;
      }
      for (const row of (await listed.json()) as Record<string, unknown>[]) {
        const name = nameOf(row);
        if (!mine(name)) continue;
        const gone = await call(`${resource}/${row.id}`, { method: "DELETE", headers });
        (gone.ok ? removed : failed).push(`${account.email}: ${resource} "${name}" (HTTP ${gone.status})`);
      }
    }
  } catch (error) {
    failed.push(`${account.email}: ${(error as Error).message}`);
  }
  return { removed, failed };
}
