# Sign in and sign out

Sign in lets a user reach the app with an email and password, holds the session as a JWT in
`localStorage`, and sign out returns them to the login screen with no token and no access to a
protected route.

## Sub-features

- `auth-signin` signs in through the password form and lands on the dashboard.
- `auth-nav` shows the signed-in navigation (an `Expenses` link, a `Sign out` button).
- `auth-signout` clears the token and returns to `/login`.
- `auth-guard` redirects an unauthenticated visit to a protected route back to `/login`.

## How to get to it (user POV)

- Open `http://localhost:5173/login` and use the password form — the only form on that page.
- Open any protected route (`/`, `/expenses`, `/budget`, `/goals`, `/recurring`) while signed out
  and be redirected to `/login`.
- Choose `Sign out` in the navbar from any signed-in page.
- (Not mapped) the magic-link form, which is on `/register`, not `/login`, and lands on
  `/auth/verify`.

## Driving it with Playwright

Preconditions:

- Doctor passes, including the demo login row.
- This is the one spec that must **not** reuse `STORAGE_STATE`: it declares
  `test.use({ storageState: { cookies: [], origins: [] } })`, because logging in is the thing under
  test.

- **Sign in.** Fill the password form and submit. Run
  `npx playwright test e2e/happy/auth.spec.ts`. `login(page)` fills
  `input[type="email"]` and `input[type="password"]`, clicks
  `getByRole("button", { name: "Sign in" })`, and the URL becomes `/`. (`login()` accepts
  `/\/$|\/dashboard/` — a permissive regex, not evidence that `/dashboard` exists.)
- **Confirm the signed-in shell.** The navbar renders for a session, not a guest.
  `getByRole("link", { name: "Expenses" })` and `getByRole("button", { name: "Sign out" })` are
  both visible.
- **Sign out.** Choose `Sign out`. `signOut(page)` clicks it and the URL becomes `/login`.
- **Confirm the token is gone.** `page.evaluate(() => localStorage.getItem("token"))` returns
  `null`. A redirect with a live token in storage is a fail.
- **Confirm the guard.** Navigate to `/expenses` while signed out. The URL becomes `/login`.
- **Proof.** The spec's `list` reporter line plus the recorded video under `test-results/`. Stage
  what a PR needs in `e2e/artifacts/<topic>/` and attach it — that directory is gitignored.

## Gotchas

- `/login` renders exactly one email input, and no magic-link form. `e2e/support/auth.ts` calls
  `.first()` and its comment claims two inputs — the call still works, the comment is stale
  (`src/pages/LoginPage.tsx:53`). The magic-link form is on `/register`.
- Login redirects to `/`. `/dashboard` is not a route at all: signed in it renders "404 Page not
  found" (`src/App.tsx:85`). Asserting `/dashboard` fails on a correct app.
- The backend rate-limits `/auth/login`. Every extra UI login spends an attempt; reuse
  `STORAGE_STATE` or `apiHeaders(request)` everywhere else, or a later run fails for a reason that
  is not the code.
- `e2e/.auth/state.json` holds a real JWT. Gitignored on purpose — never commit or print it.
- Global setup's UI login is occasionally flaky: on 2026-09-23 it failed once with the URL still on
  `/login`, while `POST /api/v2/auth/login` returned 200 on a direct probe seconds later, and the
  identical run passed on retry. Doctor, retry once, and only then treat it as a real failure.
- Registration arms the first-run tour, which overlays the app and swallows clicks. Login does not.
