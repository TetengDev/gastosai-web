/**
 * `npm run load:local`: the concurrent-user load run. Refuses a non-local target, runs the
 * Artillery scenario, sweeps whatever a failed user left, and prints the summary. See README.md.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RUN_ID } from "../support/run-id.ts";
import { ACCOUNTS, ARTILLERY_VERSION, settingsFrom, summarize, type Settings } from "./plan.ts";
import { sweepAccount } from "./sweep.ts";

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

// Ctrl-C reaches Artillery too; ignoring it here lets the sweep below still run afterwards. The
// sweep cannot hang in its place: every request it makes has a timeout.
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

let leftovers = 0;
const months = [...new Set([startMonth, manilaMonth()])];
for (const account of ACCOUNTS.slice(0, settings.users)) {
  const { removed, failed } = await sweepAccount(account, { api: settings.api, runId: RUN_ID, months });
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
