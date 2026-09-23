# Goals

Goals lets a user set a savings target, record progress against it, and watch the card's percentage
and saved amount move. Goals render as cards, not table rows, so the locators differ from every
other feature here.

## Sub-features

- `goal-open` opens the `Add Goal` modal from the list or the empty state.
- `goal-create` saves a name and target and renders a card at `0%`.
- `goal-contribute` edits the saved amount and moves the percentage.
- `goal-delete` removes the card through the confirm dialog.

## How to get to it (user POV)

- Choose `Goals` in the navbar, or open `http://localhost:5173/goals`.
- Choose `Add Goal` on a populated list, or `Add your first goal` on an empty one.
- Hover a card and choose `Edit` to contribute, or `Delete` and confirm in `Delete goal?`.

## Driving it with Playwright

Preconditions:

- Doctor passes.
- Session reused: `test.use({ storageState: STORAGE_STATE })`.
- `afterEach` calls `sweepRunData(request)`.
- The name is `uniqueName("Fund")`.

- **Open the form.** Choose the add button. Run
  `npx playwright test e2e/happy/goals.spec.ts`. The spec clicks
  `getByRole("button", { name: /^Add Goal$|Add your first goal/ }).first()` and
  `modalWithTitle(page, "Add Goal")` appears.
- **Enter the goal.** `form.getByPlaceholder("e.g. Emergency Fund").fill(name)` and
  `form.locator('input[type="number"]').first().fill("10000")`, then
  `form.getByRole("button", { name: "Add Goal", exact: true }).click()`.
- **Confirm the new card.** `page.locator("div.group").filter({ hasText: name })` has count 1 and
  contains `Target: ₱10,000.00` and `0%`.
- **Contribute.** Hover the card, choose `Edit`, set the saved amount, save.
  `card.hover()`, `card.getByRole("button", { name: "Edit", exact: true }).click()`,
  `modalWithTitle(page, "Edit Goal")`, `edit.locator('input[type="number"]').nth(1).fill("2500")`,
  `edit.getByRole("button", { name: "Save Changes", exact: true }).click()`.
- **Confirm the progress moved.** The same card now contains `₱2,500.00` and `25%` — the derived
  percentage is the proof that the backend, not the browser, did the arithmetic.
- **Delete it.** `card.hover()`, `card.getByRole("button", { name: "Delete", exact: true })`,
  `confirmInModal(page, "Delete goal?")`. The filtered locator drops to count 0.
- **Proof.** The `0%` → `25%` transition with both amounts, which no single screen capture shows.

## Gotchas

- Goals are cards (`div.group`), not `table tbody tr`. Copying the row locator from Expenses finds
  nothing and reads as "the goal was not created".
- In the edit modal the number inputs are ordered target first, saved second — `.nth(1)` is the
  contribution. `.first()` overwrites the target instead and the percentage looks wrong for a
  reason that is not the app.
- The create button is `Add Goal` in both the list and the modal. The spec's `^Add Goal$` anchor
  plus `.first()` is what keeps the click on the list button.
- Edit and Delete only appear on hover — hover again after the modal closes; the earlier hover does
  not survive it.
- The percentage is computed server-side. A card showing `25%` with a saved amount the API does not
  carry is a real bug, not a rendering nit.
