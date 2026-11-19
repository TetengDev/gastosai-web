/**
 * `npm run load:local`: the concurrent-user load run. Refuses a non-local target, runs the
 * Artillery scenario, sweeps whatever a failed user left, and prints the summary. See README.md.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RUN_ID } from "../support/run-id.ts";
import {
  ACCOUNTS,
  ARTILLERY_VERSION,
  settingsFrom,
  summarize,
  type Account,
  type Settings,
} from "./plan.ts";

let settings: Settings;
try {
  settings = settingsFrom(process.env);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const here = import.meta.dirname;
const reportPath = path.join(here, "reports", `${RUN_ID}.json`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const manilaMonth = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" })
    .format(new Date());
const startMonth = manilaMonth();

console.log(
  `Load run ${RUN_ID}: ${settings.users} users ramping over ${settings.rampSeconds}s, ` +
    `held ${settings.holdSeconds}s, against ${settings.target} (API ${settings.api}).`
);

// Ctrl-C reaches Artillery too; ignoring it here lets the sweep below still run afterwards.
process.on("SIGINT", () => {});
const run = spawnSync(
  "npx",
  ["-y", `artillery@${ARTILLERY_VERSION}`, "run", path.join(here, "artillery", "scenario.ts"), "--output", reportPath],
  {
    stdio: "inherit",
    // E2E_RUN_ID makes the scenario stamp this process's id, so the sweep finds its rows.
    env: { ...process.env, E2E_RUN_ID: RUN_ID, ARTILLERY_DISABLE_TELEMETRY: "1" },
  }
);

/**
 * The net under the in-scenario deletes, by the same rule as `sweepRunData` in e2e/support:
 * delete what carries this run's id. It cannot call `sweepRunData` itself, which holds one
 * cached demo-account session, and this run writes as four accounts.
 */
async function sweep(account: Account): Promise<{ removed: string[]; failed: string[] }> {
  const api = `${settings.api}/api/v2`;
  const removed: string[] = [];
  const failed: string[] = [];

  let login = await signIn(api, account);
  if (login.status === 429) {
    // Sign-in is capped per IP and the users just spent this minute's attempts.
    console.log(`Sweep: sign-in rate-limited for ${account.email}; retrying in 60 s.`);
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    login = await signIn(api, account);
  }
  if (!login.ok) return { removed, failed: [`${account.email}: sign-in failed, HTTP ${login.status}`] };
  const headers = { Authorization: `Bearer ${((await login.json()) as { token: string }).token}` };

  const months = [...new Set([startMonth, manilaMonth()])];
  const lists: [string, string, (row: Record<string, unknown>) => unknown][] = [
    ["expenses", "expenses", (e) => e.description],
    // Budgets go before the categories they hang on.
    ...months.map((m): [string, string, (row: Record<string, unknown>) => unknown] => [
      `budgets?month=${m}`,
      "budgets",
      (b) => b.categoryName,
    ]),
    ["categories", "categories", (c) => c.name],
  ];
  for (const [list, resource, nameOf] of lists) {
    const listed = await fetch(`${api}/${list}`, { headers });
    if (!listed.ok) {
      failed.push(`${account.email}: could not list ${list}, HTTP ${listed.status}`);
      continue;
    }
    for (const row of (await listed.json()) as Record<string, unknown>[]) {
      const name = nameOf(row);
      if (typeof name !== "string" || !name.includes(RUN_ID)) continue;
      const gone = await fetch(`${api}/${resource}/${row.id}`, { method: "DELETE", headers });
      (gone.ok ? removed : failed).push(`${account.email}: ${resource} "${name}" (HTTP ${gone.status})`);
    }
  }
  return { removed, failed };
}

function signIn(api: string, account: Account): Promise<Response> {
  return fetch(`${api}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  });
}

let leftovers = 0;
for (const account of ACCOUNTS.slice(0, settings.users)) {
  const { removed, failed } = await sweep(account);
  for (const line of removed) console.log(`Sweep removed ${line}`);
  for (const line of failed) console.error(`Sweep could not clean ${line}`);
  leftovers += failed.length;
}

console.log(`\n── Load run ${RUN_ID} ──`);
let failedUsers = 0;
if (fs.existsSync(reportPath)) {
  const { text, failed } = summarize(JSON.parse(fs.readFileSync(reportPath, "utf8")));
  failedUsers = failed;
  console.log(text);
  console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);
} else {
  console.error("Artillery wrote no report.");
}
console.log(leftovers ? `Sweep: ${leftovers} problem(s), see above.` : "Sweep: no rows left behind.");

process.exit(run.status !== 0 || failedUsers > 0 || leftovers > 0 ? 1 : 0);
