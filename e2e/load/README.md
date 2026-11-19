# Load run: many users at once, against the local stack

`npm run load:local` runs many simulated users through the app together, in real headless Chromium,
clicking real UI. It shows how the backend and the web app hold up under concurrency before
anything reaches production.

## What it does

[Artillery](https://www.artillery.io/)'s Playwright engine starts the virtual users. Each one
signs in as one of the seeded local accounts (`demo@`, `free@`, `premium@`, `trial@gastosai.dev`,
assigned in turn), then repeats a pass until the run ends:

1. open the Dashboard;
2. add an expense, then delete it;
3. create a budget for a fresh category, then delete both;
4. open Goals, then Recurring.

Every row a user creates is named `Load … E2E <run-id>`, and the pass deletes it again. When
Artillery finishes, `run.ts` sweeps each account for anything still carrying the run id: a user
that failed half-way leaves rows, and this is where they go. The sweep uses the same rule as
`sweepRunData` in `e2e/support`, tightened to the exact ` E2E <run-id>` suffix. If the backend
died under load, the sweep reports what it could not clean, and the summary still prints.

The run never calls the AI endpoints (chat, receipt scan, insights). Every API request a page
makes is checked as it leaves the browser. The first one that goes to an `/ai/` route (other
than the plain reads `/ai/usage` and `/ai/languages`) or to any backend but the vetted API closes
the page, and that user fails with the reason. The second case is how a dev server started with
`VITE_API_URL` pointing elsewhere is caught, which the environment check alone cannot see.
Requests are watched, not routed: Playwright's `page.route` turns the HTTP cache off, and with it
on, every page load measured about 2.5 times slower.

Each page does still read `GET /chat/conversations`: the chat widget loads its history on every
signed-in page. That read is plain CRUD; no model is involved.

Artillery runs through `npx -y artillery@2.0.34` (pinned in `plan.ts`), so it is not a
dependency of this repo. It launches the Chromium that the repo's `@playwright/test` installed,
not one of its own. Telemetry is off.

## Running it

```bash
python3 ../scripts/verify_local.py --up   # Postgres, API :8080, web :5173
npm run load:local
```

It needs Node 22.18 or later, which runs `run.ts` without a build step. The `free@`, `premium@`
and `trial@` accounts are seeded when the backend runs with sample data,
which is the local default (`GASTOS_SEED_SAMPLE_DATA`, default `true`).

## Changing the ramp

By default, users arrive one by one over 60 s until 10 are running, and those 10 then keep going
for another 60 s.

| Variable | Default | Meaning |
|---|---|---|
| `LOAD_USERS` | `10` | users at the peak |
| `LOAD_RAMP_SECONDS` | `60` | time over which they arrive |
| `LOAD_HOLD_SECONDS` | `60` | time all of them keep running after that |

```bash
LOAD_USERS=4 LOAD_RAMP_SECONDS=20 LOAD_HOLD_SECONDS=30 npm run load:local
```

Two backend limits set the ceiling, and both bite before your laptop does:

- **Sign-in is capped at 10 a minute per IP**, and every user comes from localhost. That is why a
  user signs in once and then loops, rather than signing in again for every pass. More than 10
  sign-ins within one minute get `429`, and that count includes any you made by hand just before
  the run. To go higher, lengthen the ramp, or start the backend with
  `PUBLIC_RATE_LIMIT_PER_MINUTE` raised.
- **Writes are capped at 60 a minute per account.** Each pass makes about six writes and is paced
  to one every 30 s, which keeps 10 users (three on the busiest account) under the cap. Past about
  16 users, an account starts returning `429` on writes. To go further, raise
  `WRITE_RATE_LIMIT_PER_MINUTE` on the backend.

So the default is a gentle baseline, not a stress test. On a laptop a pass is about 2.5 s of
work followed by think time, so ten users seldom hit the server at the same instant. Real
pressure means raising both backend limits, then `LOAD_USERS`, and shortening `PASS_MS` in
`artillery/scenario.ts`.

## Why it is local only

The run refuses any target other than `http://localhost:5173` and its API on
`http://localhost:8080`:

```
Refusing to load-test https://example.com (API http://localhost:8080). This run only targets ...
```

Every user writes real rows. On the local stack a crashed run costs nothing, but against a shared
or production backend it leaves those rows in real accounts. `LOAD_TARGET` and `LOAD_API_URL`
change the target, and `LOAD_ALLOW_REMOTE=1` lifts the refusal. Lift it only on purpose.

## Reading the report

Artillery prints its own report every 10 s and again at the end. After that, `run.ts` prints a
short summary. This one is from a default run on 2026-11-19, trimmed:

```
Page loads (ms)                                    p50     p95     p99
  FCP /expenses                                     67      81      81
  LCP /budget                                      101     111     120
  TTFB /                                             5      20      20
Steps (ms)                                         p50     p95     p99
  add_expense                                      460     518     529
  sign_in                                          450     488     488
HTTP errors by status: 400 × 87
  400 GET /api/v2/alerts × 87
Failed virtual users: 0 of 10
Sweep: no rows left behind.
```

- **Page loads** are the browser's own timings for each full navigation: time to first byte
  (`TTFB`), first paint with content (`FCP`), and largest paint (`LCP`). A page is missing from
  `LCP` when the browser recorded no final value for it before the user moved on.
- **Steps** are wall-clock times for each step of the pass, from its first action to the last
  thing it waits for. Watch how they rise as users climb.
- **HTTP errors** counts every response of 400 or more that the pages received, API and assets
  alike, then lists the request behind each one, with numeric ids folded to `:id`. A `429` means the run hit a backend rate limit
  (see above), not that the app broke. The `400 GET /api/v2/alerts` above is a backend bug that
  the run surfaced: the `premium@` account's alerts for that month fail even with no load.
- **Failed virtual users** counts users that threw: a step timed out, an element never appeared,
  or a request was blocked (`Blocked during <step>: …`). `Errors:` lists why. The command exits `1` when any user failed or
  the sweep could not clean up.

The full Artillery JSON report is written to `e2e/load/reports/<run-id>.json` (gitignored). Its
`aggregate` block holds every counter and percentile, and `intermediate` holds the same numbers in
10 s slices, which shows when during the ramp a metric moved.

## Files

| File | Role |
|---|---|
| `run.ts` | the runner: guard, `npx artillery run`, sweep, summary |
| `artillery/scenario.ts` | the Artillery script: phases and the user's pass |
| `artillery/package.json` | marks the folder CommonJS, because Artillery bundles the scenario to CJS |
| `plan.ts` | target and request guards, run shape, accounts, report summary (pure) |
| `sweep.ts` | the end-of-run sweep of one account |
| `plan.test.ts`, `sweep.test.ts` | their tests: `npx playwright test e2e/load` |
