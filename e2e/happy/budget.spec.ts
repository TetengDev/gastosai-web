import { expect, test } from "@playwright/test";
import { API_BASE, STORAGE_STATE, authToken, confirmInModal, modalWithTitle, sweepRunData, uniqueName } from "../support";

test.use({ storageState: STORAGE_STATE });

// The net under the in-test deletes: a failure part-way through must not orphan the budget or
// the category it hangs on.
test.afterEach(async ({ request }) => {
  await sweepRunData(request);
});

test.describe("Happy · budgets", { tag: "@happy" }, () => {
  test("creates a budget for a fresh category and deletes it", async ({ page }) => {
    // A category of this run's own is what keeps the spec re-runnable: a budget is unique per
    // (category, month), so reusing a seeded category would hit the overwrite path instead of
    // the create path the moment the demo data already budgets it.
    const category = uniqueName("Budget");

    await page.goto("/budget");
    await page.getByRole("button", { name: /Add Budget|Set your first budget/ }).click();

    const form = modalWithTitle(page, "Add Budget");
    await form.getByPlaceholder("Select or create a category").fill(category);
    await form.getByRole("listitem").filter({ hasText: category }).click();
    await expect(form.getByPlaceholder("Select or create a category")).toHaveValue(category);

    await form.locator('input[type="number"]').first().fill("2500");
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await form.waitFor({ state: "detached", timeout: 15000 });

    const row = page.locator("table tbody tr").filter({ hasText: category });
    await expect(row).toHaveCount(1, { timeout: 15000 });
    await expect(row).toContainText("₱2,500.00");

    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await confirmInModal(page, `Delete budget for "${category}"?`);
    await expect(page.locator("table tbody tr").filter({ hasText: category })).toHaveCount(0, {
      timeout: 15000,
    });

    // The category the budget was hung on is this run's data too, so it goes as well. There is
    // no UI for deleting one from this page, hence the API call with the session's own token.
    const token = await authToken(page);
    const headers = { Authorization: `Bearer ${token}` };
    const listed = await page.request.get(`${API_BASE}/categories`, { headers });
    expect(listed.ok()).toBeTruthy();
    const created = (await listed.json()).find((c: { name: string }) => c.name === category);
    expect(created, `category "${category}" should still exist before cleanup`).toBeTruthy();
    expect((await page.request.delete(`${API_BASE}/categories/${created.id}`, { headers })).ok()).toBeTruthy();
  });
});
