import { expect, test } from "@playwright/test";
import { STORAGE_STATE, confirmInModal, modalWithTitle, sweepRunData, uniqueName } from "../support";

test.use({ storageState: STORAGE_STATE });

// The net under the in-test delete: a failure between "create" and "delete" must not orphan a goal.
test.afterEach(async ({ request }) => {
  await sweepRunData(request);
});

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

    // Add savings adds to what is saved: ₱1,000 on ₱0 of ₱10,000 is 10%.
    await card.getByRole("button", { name: "Add savings", exact: true }).click();
    const add = modalWithTitle(page, "Add savings");
    await add.getByLabel("Amount in pesos", { exact: true }).fill("1000");
    await add.getByRole("button", { name: "Add", exact: true }).click();
    await add.waitFor({ state: "detached", timeout: 15000 });

    await expect(card).toContainText("₱1,000.00");
    await expect(card).toContainText("10%");

    // Editing "Saved So Far" still sets the total outright.
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
