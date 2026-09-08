import type { Locator, Page } from "@playwright/test";

/**
 * The modal panel whose text contains `title` — a confirm dialog, or a form modal.
 *
 * `ConfirmDialog` and the row action buttons behind it both label a button "Delete", so a
 * page-wide `getByRole("button", { name: "Delete" })` is ambiguous the moment the dialog opens.
 * Scoping to the panel removes the ambiguity. The hook is `Modal`'s own `animate-pop` class
 * (`src/components/ui/Modal.tsx`): the panel carries no ARIA role to select on.
 */
export function modalWithTitle(page: Page, title: string | RegExp): Locator {
  return page.locator("div.animate-pop").filter({ hasText: title });
}

/** Click a button inside the modal identified by `title`, and wait for the modal to close. */
export async function confirmInModal(
  page: Page,
  title: string | RegExp,
  buttonName: string = "Delete"
): Promise<void> {
  const modal = modalWithTitle(page, title);
  await modal.getByRole("button", { name: buttonName, exact: true }).click();
  await modal.waitFor({ state: "detached", timeout: 15000 });
}
