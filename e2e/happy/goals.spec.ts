import { expect, test } from "@playwright/test";
import { STORAGE_STATE, confirmInModal, modalWithTitle, uniqueName } from "../support";

test.use({ storageState: STORAGE_STATE });

test.describe("Happy · goals", { tag: "@happy" }, () => {
  test("creates a goal, contributes to it, and deletes it", async ({ page }) => {
    const name = uniqueName("Fund");

    await page.goto("/goals");
    await page.getByRole("button", { name: /^Add Goal$|Add your first goal/ }).first().click();

    const form = modalWithTitle(page, "Add Goal");
    await form.getByPlaceholder("e.g. Emergency Fund").fill(name);
    await form.locator('input[type="number"]').first().fill("10000");
    await form.getByRole("button", { name: "Add Goal", exact: true }).click();
    await form.waitFor({ state: "detached", timeout: 15000 });

    const card = page.locator("div.group").filter({ hasText: name });
    await expect(card).toHaveCount(1, { timeout: 15000 });
    await expect(card).toContainText("Target: ₱10,000.00");
    await expect(card).toContainText("0%");

    // Contributing is an edit of "Saved So Far" — the page has no separate contribute action.
    await card.hover();
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    const edit = modalWithTitle(page, "Edit Goal");
    await edit.locator('input[type="number"]').nth(1).fill("2500");
    await edit.getByRole("button", { name: "Save Changes", exact: true }).click();
    await edit.waitFor({ state: "detached", timeout: 15000 });

    await expect(card).toContainText("₱2,500.00");
    await expect(card).toContainText("25%");

    await card.hover();
    await card.getByRole("button", { name: "Delete", exact: true }).click();
    await confirmInModal(page, "Delete goal?");
    await expect(page.locator("div.group").filter({ hasText: name })).toHaveCount(0, {
      timeout: 15000,
    });
  });
});
