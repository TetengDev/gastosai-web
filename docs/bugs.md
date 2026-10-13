# Bug log — gastosai-web

Every bug whose fault is in this repository, in the order it was found. Linear holds the work;
this file is the record of what went wrong, so a pattern stays visible after the issues close.

**Log a bug where its cause is, not where it was seen.** A bug spotted in the web app whose fault
is in the API goes in the backend's log, with "Found via" saying where it showed up. A bug with
faults in two repositories gets a row in each.

**Add a row when a bug is found**, even one fixed on the spot. Newest at the bottom. When the fix
merges, set **Status** to the PR that fixed it. A bug fixed before it was ever filed gets the
fixing commit or PR in place of an issue.

| Column | Contents |
|---|---|
| Found | Date, `YYYY-MM-DD` |
| Found via | Where it showed up: a local run, a review, CI, a test suite |
| Symptom | What a user or a run actually saw |
| Cause | Where the fault is, if known |
| Issue | The Linear issue, linked |
| Status | `open`, `fixed in <PR or commit>`, or `won't fix: <why>` |

## Product

| Found | Found via | Symptom | Cause | Issue | Status |
|---|---|---|---|---|---|
| 2026-10-13 | Review of [#80](https://github.com/TetengDev/gastosai-web/pull/80) | A celebration one account has seen is skipped for the next account in the same browser | `Celebrate`'s seen flags are not scoped to the signed-in user | [TEN-451](https://linear.app/tengdev/issue/TEN-451) | open |
| 2026-10-13 | Review of [#80](https://github.com/TetengDev/gastosai-web/pull/80) | `BudgetRuleCard` colours its bar from its own threshold, not the server's budget status | `barColor` re-derives the status on the client | [TEN-452](https://linear.app/tengdev/issue/TEN-452) | open |
| 2026-10-13 | Playwright, against the local stack | The login page's Email and Password inputs have no accessible name; `getByLabel(/email/i)` finds nothing | The `<label>`s are not associated with their inputs: no `id`/`htmlFor` and no `aria-label` | not filed yet | open |

## Tests and tooling

| Found | Found via | Symptom | Cause | Issue | Status |
|---|---|---|---|---|---|
| 2026-10-13 | CI on [#80](https://github.com/TetengDev/gastosai-web/pull/80) | The audit step failed | `source-map-js` 1.2.1 (GHSA-68fv-2mgg-jv7q), already on `main` | — | fixed in [#79](https://github.com/TetengDev/gastosai-web/pull/79) |
