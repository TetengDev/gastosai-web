# gastosai-web verification map

This directory is the maintained source for verifying the user-facing behavior of the gastosai web
app. Read this index before driving the app, then use the matching feature file as the recipe.

A proof that drives one convenient entry point is incomplete when the feature file lists others.

## Baseline preconditions

- Bring the stack up from the workspace: `python3 ../scripts/verify_local.py --up`.
- Re-check it read-only before driving: `python3 ../scripts/verify_local.py` — Postgres `:5433`,
  API `:8080`, Vite `:5173` and the demo login must all pass.
- The app is at `http://localhost:5173`; the API is at `http://localhost:8080/api/v2`. The
  dashboard is `/`; `/dashboard` is not a route and renders 404.
- The account is `demo@gastosai.dev` / `demo123`, fixed at backend startup from its `.env`. It is
  seeded with close to two hundred expenses (191 on 2026-09-23, and the count drifts as runs and
  demos add rows), so assert on a delta, never on a total.
- `e2e/global-setup.ts` signs in once and writes `e2e/.auth/state.json`. Specs reuse it via
  `test.use({ storageState: STORAGE_STATE })`.
- Never drive an instance this run did not confirm with the doctor check.
- There is one stack, one database and one demo account. Do not start a second run against it.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names, flags and paths unchanged.
- Run browser actions through Playwright: `npx playwright test e2e/happy/<spec>.ts`.
- Run API-side setup, assertions and cleanup through the `request` fixture and `API_BASE`.
- Stamp every row created with `uniqueName(...)`, and sweep with `sweepRunData(request)` in
  `afterEach`. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes the rendered text of the asserted element and, when the text is inconclusive, a
  screenshot.
- Money proof includes both halves: integer centavos in the request body and the formatted `₱`
  string on screen.
- Mutation proof includes a read-only second view of the stored value — the API row, or the page
  reloaded.
- Record which feature file and entry point produced each artifact.
- `e2e/artifacts/` is gitignored. Anything a reviewer must see is attached with
  `python3 ../scripts/attach_evidence.py`, not left in the working tree.
- Report an unreachable path with the attempted command and the unmet precondition. Do not report a
  skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It
then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with Playwright` starts with `Preconditions:` and uses labeled bullets pairing each
   user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Sign in and sign out](./auth.md) covers the password form, the protected-route redirect, and
  token clearing.
- [Expenses](./expenses.md) covers adding an expense, the centavos invariant, the rendered row, and
  deletion.
- [Dashboard](./dashboard.md) covers the KPI strip, the category and trend charts, and the delta an
  added expense produces.
- [Budgets](./budget.md) covers creating a budget against a fresh category, the formatted cap, and
  deletion leaving the category behind.
- [Goals](./goals.md) covers creating a goal, contributing to it, the progress percentage, and
  deletion.

## Not yet mapped

Real user surfaces with no feature file yet. A proof that touches them is unguided; write the file
rather than improvising twice.

- **Recurring bills** (`/recurring`) — covered by `e2e/happy/recurring.spec.ts`, not yet mapped.
- **Assistant chat** — covered by `e2e/chat-conversation.spec.ts`, not tagged `@happy`.
- **Categories** (`/categories`), **Alerts** (`/alerts`), **Settings** (`/settings`).
- **Magic-link sign-in** (`/auth/verify`) and **registration** (`/register`), which arms the
  first-run tour.
- **Admin** (`/admin/submissions`, `/admin/chat-audit`, `/admin/observability`) and **billing**
  (`/pricing`, `/billing/return`).
