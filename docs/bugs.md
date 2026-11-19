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
| 2026-10-13 | Review of [#80](https://github.com/TetengDev/gastosai-web/pull/80) | `BudgetRuleCard` colours its bar from its own threshold, not the server's budget status | `barColor` re-derives the status on the client | [TEN-441](https://linear.app/tengdev/issue/TEN-441) ([TEN-452](https://linear.app/tengdev/issue/TEN-452) closed as its duplicate) | open |
| 2026-10-13 | Playwright, against the local stack | The login page's Email and Password inputs have no accessible name; `getByLabel(/email/i)` finds nothing | The `<label>`s are not associated with their inputs: no `id`/`htmlFor` and no `aria-label` | [TEN-547](https://linear.app/tengdev/issue/TEN-547) | fixed on `release/ten-547-web-platform-correct-dark-mode-and-credential-au` |
| 2026-10-13 | Review of [#83](https://github.com/TetengDev/gastosai-web/pull/83) | From 00:00 to 08:00 Manila time on the 1st, Dashboard, Budget and alerts show the previous month, disagreeing with the nav mood mark | Each took the current month as `new Date().toISOString().slice(0, 7)`, the UTC month | [TEN-458](https://linear.app/tengdev/issue/TEN-458) | open |
| 2026-10-22 | Review of [#84](https://github.com/TetengDev/gastosai-web/pull/84) | From 00:00 to 08:00 Manila time on the 1st, the assistant pre-fills the previous month on budget previews and on confirming a budget update | `ChatWidget` and `chatActions` defaulted `month` to `new Date().toISOString().slice(0, 7)`, the UTC month | [TEN-470](https://linear.app/tengdev/issue/TEN-470) | open |
| 2026-10-23 | Review of [#84](https://github.com/TetengDev/gastosai-web/pull/84) ([TEN-458](https://linear.app/tengdev/issue/TEN-458)) | Left open past Manila midnight on the 1st, Dashboard and the unread-alert badge keep asking for the previous month until the tab is reloaded | `Dashboard` and `useUnreadAlertCount` computed the month once, at module load, not when they fetch | [TEN-471](https://linear.app/tengdev/issue/TEN-471) | fixed in [#89](https://github.com/TetengDev/gastosai-web/pull/89) |
| 2026-10-23 | Final review of [#89](https://github.com/TetengDev/gastosai-web/pull/89) ([TEN-471](https://linear.app/tengdev/issue/TEN-471)) | Outside UTC+8, or from 16:00 to 24:00 UTC, Dashboard counted the wrong day of the month: at 00:30 Manila on 1 Oct a UTC browser read 30 Sep, so days left said 1 and the daily average divided by 30 | `Dashboard` keyed the month by Manila but took the day from `new Date().getDate()`, the browser's day. The hero rewrite (`a1f34e6`) already switched to a Manila date; this release moves that helper into `formatters.ts` as `manilaDate()` and pins it with a fake-clock test | [TEN-484](https://linear.app/tengdev/issue/TEN-484) | fixed in [#102](https://github.com/TetengDev/gastosai-web/pull/102) |
| 2026-10-28 | The [TEN-459](https://linear.app/tengdev/issue/TEN-459) session ([#94](https://github.com/TetengDev/gastosai-web/pull/94)) | An open nav popover (Admin, Menu, View as, Tips) did not close on a click on the page below the 72px bar; only Escape, the toggle or a click on the bar closed it | Each popover closed through a `fixed inset-0` backdrop, but the nav's `backdrop-blur-md` makes the nav the containing block for fixed descendants, so the backdrop covered only the bar. Replaced by `useDismiss`, a capture-phase document listener that closes and swallows the outside click | [TEN-500](https://linear.app/tengdev/issue/TEN-500) | fixed in [#102](https://github.com/TetengDev/gastosai-web/pull/102) |
| 2026-10-29 | `e2e/happy/auth.spec.ts`, against the local stack | Signing out from the dashboard left the visitor on `/`, showing the landing page instead of the sign-in form | Since the landing page ([TEN-485](https://linear.app/tengdev/issue/TEN-485)), a logged-out `/` is a public route rather than a protected one; the sign-out button only cleared the session and relied on the route guard to redirect | [TEN-507](https://linear.app/tengdev/issue/TEN-507) | fixed in [#97](https://github.com/TetengDev/gastosai-web/pull/97) |
| 2026-11-18 | Design review of [TEN-442](https://linear.app/tengdev/issue/TEN-442) | Every dialog (add expense, budgets, goals, confirmations) was a plain box to a screen reader: no dialog role or name, Escape did nothing, and Tab walked out into the page behind it | The shared `Modal` rendered a styled `div` with no `role="dialog"`, labelling, Escape handler, focus trap or focus return | [TEN-442](https://linear.app/tengdev/issue/TEN-442) | fixed in `c92174c` (release/wave8-web) |
| 2026-11-18 | Whole-branch review of release/wave8-web | Deleting a selection where one row failed left every selected row on screen with no message, and a retry re-sent the ones already deleted | `deleteSelected` in `Expenses.tsx` used `Promise.all` with a silent catch and no refetch | [TEN-440](https://linear.app/tengdev/issue/TEN-440) | fixed in `814f412` (release/wave8-web) |
| 2026-11-19 | `modern-web-guidance` legacy-scan, [TEN-547](https://linear.app/tengdev/issue/TEN-547) | A dark-OS user saw the page paint light, then flip dark, on every load | `App.tsx` added the `.dark` class in a `useEffect`, after first paint | [TEN-547](https://linear.app/tengdev/issue/TEN-547) | fixed on `release/ten-547-web-platform-correct-dark-mode-and-credential-au` |
| 2026-11-19 | `modern-web-guidance` legacy-scan, [TEN-547](https://linear.app/tengdev/issue/TEN-547) | In dark mode, scrollbars, date pickers, selects and autofill backgrounds stayed light | No `color-scheme` was declared anywhere, so the browser themed native UI as light | [TEN-547](https://linear.app/tengdev/issue/TEN-547) | fixed on `release/ten-547-web-platform-correct-dark-mode-and-credential-au` |
| 2026-11-19 | `modern-web-guidance` legacy-scan, [TEN-547](https://linear.app/tengdev/issue/TEN-547) | After the first visit the app never followed the OS scheme again, even for users who never touched the toggle | `App.tsx` wrote `theme` to `localStorage` on every load, so the first visit's OS scheme was pinned for good | [TEN-547](https://linear.app/tengdev/issue/TEN-547) | fixed on `release/ten-547-web-platform-correct-dark-mode-and-credential-au` |

## Tests and tooling

| Found | Found via | Symptom | Cause | Issue | Status |
|---|---|---|---|---|---|
| 2026-10-13 | CI on [#80](https://github.com/TetengDev/gastosai-web/pull/80) | The audit step failed | `source-map-js` 1.2.1 (GHSA-68fv-2mgg-jv7q), already on `main` | — | fixed in [#79](https://github.com/TetengDev/gastosai-web/pull/79) |
| 2026-11-17 | CI on `main` and every open PR | Two `Dashboard.test.tsx` tests failed from 2026-11-01: the days-left hero read "September closed under budget", and "Needs attention" listed 2 rows instead of 1 | The two tests fake the clock to fixed October dates, while the fixtures key `BUDGET`/`PREV_BUDGET` to the real month; outside October the faked current month is served the over-budget previous-month summary. Test-only, the app is right | [TEN-531](https://linear.app/tengdev/issue/TEN-531) | fixed in [#101](https://github.com/TetengDev/gastosai-web/pull/101) |
