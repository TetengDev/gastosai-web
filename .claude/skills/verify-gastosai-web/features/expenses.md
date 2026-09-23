# Expenses

Expenses lets a user record what they spent, see it listed immediately as pesos, and delete it
again. It is where the money invariant is observable: amounts leave the browser as integer centavos
and are formatted only at the display edge.

## Sub-features

- `exp-open` opens the `New Expense` modal from the list, including the empty-state button.
- `exp-create` saves an amount and description and renders the row.
- `exp-centavos` sends `15075`, not `150.75`, in the POST body.
- `exp-format` renders the saved amount as `₱150.75`.
- `exp-delete` removes the row through the confirm dialog.

## How to get to it (user POV)

- Choose `Expenses` in the navbar, or open `http://localhost:5173/expenses`.
- Choose `Add Expense` on a populated list, or `Add your first expense` on an empty one.
- Hover a row and choose `Delete`, then confirm in the `Delete expense?` dialog.

## Driving it with Playwright

Preconditions:

- Doctor passes.
- Session reused: `test.use({ storageState: STORAGE_STATE })`.
- `afterEach` calls `sweepRunData(request)` — the net under the in-test delete.
- The description is `uniqueName("Coffee")`, so nothing collides with the ~190 seeded rows.

- **Open the form.** Choose the add button. Run
  `npx playwright test e2e/happy/expenses.spec.ts`. The spec clicks
  `getByRole("button", { name: /Add Expense|Add your first expense/ })` and
  `modalWithTitle(page, "New Expense")` appears.
- **Enter the expense.** Type the amount and what it was for.
  `form.locator('input[type="number"]').first().fill("150.75")` and
  `form.getByPlaceholder("What was this expense for?").fill(description)`.
- **Save, and watch both halves at once.** Choose `Save` while waiting on the outbound request.
  `page.waitForRequest(r => r.method() === "POST" && r.url().endsWith("/api/v2/expenses"))` paired
  with the click; `JSON.parse(request.postData()).amount` is `15075`. The modal detaches.
- **Confirm the rendered row.** The list shows exactly one matching row.
  `page.locator("table tbody tr").filter({ hasText: description })` has count 1 and contains
  `₱150.75`.
- **Delete it.** Hover the row, choose `Delete`, confirm. `row.hover()`,
  `row.getByRole("button", { name: "Delete", exact: true }).click()`,
  `confirmInModal(page, "Delete expense?")`. The filtered locator drops to count 0.
- **Proof.** The request body value and the row text are the proof; a screenshot of the list alone
  cannot tell `15075` from a float round-trip. Stage what a PR needs in
  `e2e/artifacts/<topic>/` and attach it — that directory is gitignored.

## Gotchas

- The row's `Delete` button only appears on hover. Clicking without `row.hover()` misses.
- Once the confirm dialog opens, two buttons are named `Delete`. Always go through
  `confirmInModal` / `modalWithTitle`, never a page-wide `getByRole`.
- Creating the row through `POST /api/v2/expenses` proves the API, not the screen. For a UI claim,
  click through the UI — `e2e/happy/cleanup.spec.ts` is the one place the API shortcut is correct,
  because the sweep is what it verifies.
- Amounts carry a thousands separator (`₱1,234.56`). Assert the formatted string, not the digits.
- A crashed run leaves `… E2E <run-id>` rows behind. The next run's sweep will not touch them —
  they carry a different id by design. Delete them by hand if the demo account gets noisy.
