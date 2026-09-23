---
name: verify-gastosai-web
description: Drive the real gastosai web app (React/Vite on :5173 against the local API on :8080) with Playwright and capture proof that a change works. Use when asked to verify, demo, screenshot or prove web behavior end to end, before reporting a web change complete, and when a PR needs runtime evidence rather than a green unit suite.
---

# Verify gastosai-web

The web app is the primary user surface: React 19 + Vite on `http://localhost:5173`, talking to
the Spring backend on `http://localhost:8080/api/v2`, which talks to Postgres on `:5433`. This
skill is how an agent drives that stack the way a user does and comes back with evidence.

It does not replace [`verification-discipline`](../verification-discipline/SKILL.md) — that one
governs *how you report*; this one governs *how you drive*. Read both before claiming a web change
works.

The feature recipes live in [`features/`](features/README.md). Read
[`features/README.md`](features/README.md) before driving anything.

## Launch

The stack is brought up by the workspace, not by hand. **From this repo the workspace is `..`**:

```bash
python3 ../scripts/verify_local.py --up      # Postgres :5433, API :8080, Vite :5173, demo login
```

It prints one table covering all four and already knows the traps that cost about a hundred turns
to rediscover: CORS admits `:5173` only, bare `npx vite` does not load `VITE_API_URL`, ports
5173/5175 are often held by unrelated apps, and the backend's demo account is fixed at startup from
its `.env`.

Ready means every row in that table reads OK, including the demo login. A Vite row that is up
while the API row is down produces a rendered app that fails every request — that is not ready.

Teardown:

```bash
python3 ../scripts/verify_local.py --down    # stops the backend and the dev server
```

`--down` leaves Postgres running on purpose. Nothing here stops the database; do not add that.

`playwright.config.ts` has **no `webServer` block**, deliberately — one bring-up, many runs. So the
stack outlives an individual test run, and forgetting to bring it up produces connection-refused
noise rather than an automatic start.

## Doctor

One read-only check, before driving anything and again whenever a result looks wrong:

```bash
python3 ../scripts/verify_local.py           # no --up: reports, starts nothing
```

Require, in this order:

1. Postgres `:5433` answering.
2. API `:8080` answering.
3. Vite `:5173` answering — and it must be Vite started with the repo's env, not a stray
   `npx vite`, or `VITE_API_URL` is unset and every call goes to the wrong origin.
4. The demo login (`demo@gastosai.dev` / `demo123`) succeeding against `/api/v2/auth/login`.

If the login row fails but the API row passes, the account is the problem, not the process: the
backend fixes that account at startup from its `.env`. Restarting the API re-applies it.

**Never drive an instance you did not confirm with this check.** There is exactly one local stack,
one database and one demo account — see *Isolation* below.

## Drive

The harness is Playwright, already wired to this app. Use it; do not write a new driver.

```bash
npm run e2e:happy                               # the whole tagged happy suite
npx playwright test e2e/happy/expenses.spec.ts  # one feature
npm run e2e:report                              # open the HTML report of the last run
```

What the harness gives you, all from `e2e/support/` (import from `../support`, the barrel):

| Helper | What it does |
|---|---|
| `login(page)` / `signOut(page)` | The real sign-in form round-trip. `e2e/global-setup.ts` runs `login` once per run and saves `e2e/.auth/state.json`. |
| `STORAGE_STATE` | That saved session. Every spec that is not itself about auth does `test.use({ storageState: STORAGE_STATE })` instead of logging in again. |
| `uniqueName("Coffee")` | `"Coffee E2E <RUN_ID>"`. Stamp every row you create, so a crashed run's leftovers read as somebody else's data. |
| `sweepRunData(request)` | Deletes, over the API, everything carrying this run's `RUN_ID`. Call it in `afterEach`. |
| `apiHeaders(request)` | `Authorization` from the saved session — does **not** spend a login. |
| `modalWithTitle(page, title)` / `confirmInModal(page, title, button)` | Scope to the modal panel (`div.animate-pop`). Page-wide `getByRole("button", { name: "Delete" })` is ambiguous the moment a confirm dialog opens. |
| `API_BASE` | `http://localhost:8080/api/v2`, for asserting the side effect behind the screen. |

Selector rules that hold across this app:

- Prefer roles and accessible names: `getByRole("button", { name: "Save", exact: true })`.
- Form fields inside a modal are reached through `modalWithTitle(...)`, then a placeholder
  (`getByPlaceholder("What was this expense for?")`) or `locator('input[type="number"]').first()`.
- Rows are `page.locator("table tbody tr").filter({ hasText: name })`; goal cards are
  `page.locator("div.group").filter({ hasText: name })`.
- Row action buttons appear on hover — `await row.hover()` before clicking Delete on Expenses and
  Goals.
- Never assert on tab order or coordinates.

## Evidence

Two destinations, and they are not interchangeable:

- **Suite runs:** `python3 ../scripts/run_e2e.py --up` writes `~/.claude/gastosai-e2e/<date>/` —
  `report.txt`, `summary.json`, and copies of `playwright-report/` and `test-results/`, so a red
  run is still readable tomorrow. Its exit code is the suite's.
- **A proof for an issue or PR:** stage it in `e2e/artifacts/<issue-or-topic>/`, alongside the
  existing `ten-366-record.md` and its screenshots — then **attach it**, because that directory is
  gitignored (`.gitignore:32`), like `test-results/` and `playwright-report/`. Nothing under
  `e2e/artifacts/` is tracked, so a proof left only there exists on one machine:

  ```bash
  python3 ../scripts/attach_evidence.py TEN-129 e2e/artifacts/<topic>/shot.png \
      --caption "what the reviewer should look at" --pr <N> --repo gastosai-web
  ```

  The caption is the point of the tool: say what to look at, not what shipped.

`playwright.config.ts` sets `video: "on"` and `screenshot: "on"` for every test, so a run already
produces shareable artifacts without asking.

Proof standards for this app:

- **Drive the real user path.** A row created through `POST /api/v2/expenses` proves the API, not
  the screen. If the claim is about the UI, click through the UI.
- **Capture the action and the resulting state**, not just the final screen — the pattern the
  expenses spec uses: assert the outbound request *and* the rendered row.
- **Verify the side effect.** Money is integer centavos in transit and formatted only at the
  display edge, so a proof about an amount asserts both halves: `15075` in the request body and
  `₱150.75` in the row. A screenshot alone cannot distinguish those.
- **Read text before pixels.** Playwright's `innerText`, the `list` reporter and `report.txt` are
  cheap; a screenshot costs roughly (width x height) / 750 tokens and stays in context for every
  turn after. Open the PNG only when the text is genuinely inconclusive.
- **Mocks only at a boundary production already isolates** (the AI provider). Never mock the
  backend to make a web proof pass.

## Cleanup

```bash
python3 ../scripts/verify_local.py --down
```

- Kill only what this run started. Never `pkill -f vite` or `pkill -f java` — the ports are
  routinely held by the user's unrelated apps, which is one of the traps `verify_local.py` exists
  to handle.
- Data cleanup is `sweepRunData(request)` in `afterEach`, scoped to `RUN_ID`. It deletes only rows
  this process named. A sweep that deletes by name prefix alone would eat a concurrent run's data.
- `e2e/.auth/state.json` holds a real JWT and is gitignored. Leave it; do not commit it, do not
  print it.
- **Cleanup never touches evidence.** `~/.claude/gastosai-e2e/<date>/` and
  `e2e/artifacts/**` survive teardown. If a cleanup step would remove them, the step is wrong. And
  because `e2e/artifacts/**` is gitignored, attach anything a reviewer needs before the checkout
  stops being the only copy.

## Isolation — read before running two of anything

There is **one** local stack, **one** database and **one** demo account. `playwright.config.ts`
sets `workers: 1` and `fullyParallel: false`, and `global-setup.ts` writes a single shared
`e2e/.auth/state.json`.

So: **do not start a second verification run against a stack another run is driving.** Two runs
survive data-wise (`RUN_ID` scoping is real), but they share the auth state file and the backend
rate-limits `/auth/login` — enough logins in a window and the *next* run fails for a reason that
has nothing to do with the code. Refusing to double-drive beats corrupting the user's session.

If you need parallelism, it is a stack-per-run problem (separate DB, API port, `E2E_BASE_URL`,
`E2E_API_URL`), not a Playwright `workers` setting. That work does not exist yet; say so rather
than faking it.

## Gotchas

- `npm install` needs `PACKAGE_TOKEN` for the pinned `@tetengdev/gastosai-api-contract` package.
  Without it the install 401s and nothing runs.
- The first-run tour overlays the app and swallows clicks. Registration arms it, login does not;
  global setup clears `gastosai:tour:completed` / `gastosai:tour:run` as insurance for a reused
  profile.
- `/login` has exactly **one** email input and no magic-link form — that form is on `/register`
  (`src/pages/RegisterPage.tsx`). `e2e/support/auth.ts` still calls `.first()` and its comment still
  claims two; the call is harmless, the comment is stale.
- Login redirects to `/`. **`/dashboard` is not a route** — signed in, it renders "404 Page not
  found" (`src/App.tsx:85`). Assert `/`, never `/dashboard`.
- Amounts render as `₱1,234.56` with a thousands separator. `toContainText("₱2500.00")` fails on a
  correct app.
- Timestamps render in `Asia/Manila` from the API's `+08:00`. A date assertion built from the
  runner's local clock is a false failure waiting for a trip abroad.
