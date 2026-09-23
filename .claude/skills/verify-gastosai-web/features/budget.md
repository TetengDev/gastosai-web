# Budgets

Budgets lets a user cap monthly spending per category, including creating the category inline from
the budget form, see the cap formatted as pesos, and delete the budget without losing the category
it was set on.

## Sub-features

- `bud-open` opens the `Add Budget` modal from the list or the empty state.
- `bud-category` creates or picks a category from inside the form's combobox.
- `bud-create` saves a monthly cap and renders the row.
- `bud-format` renders the cap as `₱2,500.00`.
- `bud-delete` removes the budget and leaves its category behind.

## How to get to it (user POV)

- Choose `Budget` in the navbar, or open `http://localhost:5173/budget`.
- Choose `Add Budget` on a populated list, or `Set your first budget` on an empty one.
- Choose `Delete` on a row, then confirm in the `Delete budget for "<category>"?` dialog.

## Driving it with Playwright

Preconditions:

- Doctor passes.
- Session reused: `test.use({ storageState: STORAGE_STATE })`.
- `afterEach` calls `sweepRunData(request)`; the sweep deletes budgets before the categories they
  hang on, and covers both the month the process started in and the current month.
- The category name is `uniqueName("Budget")`, so the form creates a fresh one.

- **Open the form.** Choose the add button. Run
  `npx playwright test e2e/happy/budget.spec.ts`. The spec clicks
  `getByRole("button", { name: /Add Budget|Set your first budget/ })` and
  `modalWithTitle(page, "Add Budget")` appears.
- **Create the category inline.** Type into the combobox and pick the offered entry.
  `form.getByPlaceholder("Select or create a category").fill(category)`, then
  `form.getByRole("listitem").filter({ hasText: category }).click()`. The input then *has value*
  `category` — assert that before saving.
- **Enter the cap and save.** `form.locator('input[type="number"]').first().fill("2500")`, then
  `form.getByRole("button", { name: "Save", exact: true }).click()`. The modal detaches.
- **Confirm the row.** `page.locator("table tbody tr").filter({ hasText: category })` has count 1
  and contains `₱2,500.00`.
- **Delete the budget.** `row.getByRole("button", { name: "Delete", exact: true }).click()` then
  `confirmInModal(page, 'Delete budget for "<category>"?')`. The row drops to count 0.
- **Confirm the side effect.** Deleting a budget must not delete its category. With
  `authToken(page)`, `GET ${API_BASE}/categories` still contains `category`; the spec then deletes
  it over the API as its own cleanup.
- **Proof.** The rendered cap plus the category still present in the API listing after the delete.

## Gotchas

- Filling the combobox is not selecting. Without the `getByRole("listitem")` click the form holds
  typed text and saves against no category — which is why the spec asserts `toHaveValue` first.
- The delete confirm title embeds the category name in double quotes. Build it from the same
  variable; a hand-typed title silently matches nothing and `confirmInModal` times out.
- `/budgets` lists one month at a time. A run that started at 23:59 looks for its budget in the
  wrong month — `sweepRunData` handles both months, a hand-rolled cleanup will not.
- Budget rows have no hover requirement, unlike Expenses and Goals. Do not copy the `hover()` line
  across.
