# Dashboard

The dashboard is the landing page after sign-in: a KPI strip with total spend, remaining budget and
daily average, a category breakdown and a monthly trend chart, and a further row of cards —
AI insights, budget overview, recent expenses, daily trend, upcoming bills, savings goals and top
expenses. It is the surface where an expense added elsewhere has to show up, without a reload.

## Sub-features

- `dash-kpi` renders `Total Spend · <month>`, `Remaining Budget` and `Daily Average`.
- `dash-money` renders the total as a formatted peso amount.
- `dash-charts` renders `Spending by Category` and `Monthly Trend` as Recharts surfaces.
- `dash-delta` moves the total by the amount of a newly added expense, live on the
  `gastosai:expense-changed` event, with no manual reload.
- `dash-cards` renders the secondary cards: budget overview, `Recent Expenses`, `Daily Trend`,
  `Upcoming Bills`, `Savings Goals` (the goals card's heading — not "Goal Progress", which is only
  the component's filename), `Top Expenses`.
- `dash-ai` renders the AI insights card — gated behind the `ADVANCED_INSIGHTS` feature, so absent
  is not automatically a failure.

## How to get to it (user POV)

- Sign in — login lands here.
- Open `http://localhost:5173/`. **Not `/dashboard`** — that path is not a route.
- Choose the logo or `Dashboard` in the navbar from any signed-in page.

## Driving it with Playwright

Preconditions:

- Doctor passes.
- Session reused: `test.use({ storageState: STORAGE_STATE })`.
- No cleanup needed for the read-only checks; a `dash-delta` proof creates an expense and so needs
  `sweepRunData(request)` in `afterEach`.

- **Open the dashboard.** Navigate to `/`. Run
  `npx playwright test e2e/happy/dashboard.spec.ts`.
- **Confirm the KPI strip.** The three tiles are visible: `getByText(/Total Spend ·/)` within 20s,
  and exact-match `Remaining Budget` and `Daily Average`.
- **Confirm the money format.** The hero tile carries a peso amount.
  `page.locator("div.bg-hero").filter({ hasText: /Total Spend ·/ })` contains
  `/₱[\d,]+\.\d{2}/`.
- **Confirm the charts.** Both headings are visible and a chart actually painted:
  `getByText("Spending by Category")`, `getByText("Monthly Trend")`, and
  `page.locator("svg.recharts-surface").first()` visible within 20s.
- **Confirm the delta (when the claim is about totals).** Read the total, add an expense through
  `/expenses` per [expenses.md](./expenses.md), return to `/` and read it again. The difference
  equals the amount added, and the new category appears in the breakdown. The page refetches on the
  `gastosai:expense-changed` window event, so a reload should not be needed — needing one is itself
  a finding.
- **Confirm the secondary cards when the claim touches them.** `e2e/happy/dashboard.spec.ts` asserts
  only the KPI strip and the two charts. `Recent Expenses`, `Daily Trend`, `Upcoming Bills`,
  `Savings Goals`, `Top Expenses` and the budget overview are unasserted: drive them by their
  visible headings before claiming the dashboard as a whole works. All seven were confirmed present
  on 2026-09-23.
- **Proof.** The KPI text and the delta arithmetic. This is the one feature where a screenshot of
  the charts adds something the text does not — capture it only when the chart itself is the claim.

## Gotchas

- The demo account already holds close to two hundred expenses (191 on 2026-09-23) and the count drifts.
  Assert the delta, never the absolute total.
- Charts load asynchronously; the 20s timeouts in the spec are load time, not slack. Do not shorten
  them to make a flake go away.
- A dashboard still showing the pre-add total is a fail even when the Expenses list updated — that
  is the exact bug this delta check exists for.
- The KPI month label is **not** derived from the API's `+08:00` timestamps: `Dashboard.tsx:28`
  computes it as `new Date().toISOString().slice(0, 7)`, which is the **UTC** month. Individual
  expense dates elsewhere on the page do render in `Asia/Manila` via `formatters.ts`. So between
  16:00 UTC and midnight Manila the label and the rows can disagree about the month — a real edge,
  not a flake to retry away.
- `Remaining Budget` reads oddly when no budget exists for the month. Create one via
  [budget.md](./budget.md) before treating that tile as a claim.
- The AI insights card is behind the `ADVANCED_INSIGHTS` gate. Its absence proves nothing about the
  dashboard; check the gate before filing a bug.
- **`div.bg-hero` matches two elements**: the KPI hero (`Dashboard.tsx:187`) and the
  `AnnouncementBar` (`AnnouncementBar.tsx:20`), which sits above it. `.first()` grabs the
  announcement, not the total — always `.filter({ hasText: /Total Spend ·/ })`.
- **The KPI labels are CSS-uppercased.** `innerText` returns `TOTAL SPEND · SEP 2026`, so a
  case-sensitive `body.innerText().includes("Total Spend")` is false on a working dashboard.
  Playwright's `getByText(/Total Spend ·/)` matches the DOM text and is unaffected — prefer it, and
  lowercase both sides if you must scrape text.
- The cards populate after their own fetches. A snapshot taken on `networkidle` or a fixed
  `waitForTimeout` can miss them; wait for `Total Spend ·` to be visible first.
