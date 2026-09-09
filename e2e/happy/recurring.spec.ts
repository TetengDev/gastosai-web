import { expect, test } from "@playwright/test";
import { API_BASE, STORAGE_STATE, authToken, confirmInModal, modalWithTitle, sweepRunData, uniqueName } from "../support";

test.use({ storageState: STORAGE_STATE });

// The net under the in-test delete: a failure between "create" and "delete" must not orphan a bill.
test.afterEach(async ({ request }) => {
  await sweepRunData(request);
});

test.describe("Happy · recurring bills", { tag: "@happy" }, () => {
  test("adds a monthly bill and deletes it", async ({ page }) => {
    const name = uniqueName("Streaming");

    await page.goto("/recurring");

    // An existing category, so the only row this spec creates is the bill itself.
    const token = await authToken(page);
    const listed = await page.request.get(`${API_BASE}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listed.ok()).toBeTruthy();
    const categories: { name: string }[] = await listed.json();
    expect(categories.length, "the demo account should have at least one category").toBeGreaterThan(0);
    const category = categories[0].name;

    await page.getByRole("button", { name: /Add Bill|Add your first bill/ }).click();

    const form = modalWithTitle(page, "Add Bill");
    await form.getByPlaceholder("e.g. Netflix, Electricity").fill(name);
    await form.locator('input[type="number"]').first().fill("499");
    await form.getByPlaceholder("Select or create a category").fill(category);
    await form.getByRole("listitem").filter({ hasText: category }).first().click();
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await form.waitFor({ state: "detached", timeout: 15000 });

    const row = page.locator("table tbody tr").filter({ hasText: name });
    await expect(row).toHaveCount(1, { timeout: 15000 });
    await expect(row).toContainText("₱499.00");
    await expect(row).toContainText("Monthly");

    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await confirmInModal(page, `Delete "${name}"?`);
    await expect(page.locator("table tbody tr").filter({ hasText: name })).toHaveCount(0, {
      timeout: 15000,
    });
  });
});
