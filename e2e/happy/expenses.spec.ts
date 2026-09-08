import { expect, test } from "@playwright/test";
import { STORAGE_STATE, confirmInModal, modalWithTitle, uniqueName } from "../support";

test.use({ storageState: STORAGE_STATE });

test.describe("Happy · expenses", { tag: "@happy" }, () => {
  test("adds an expense, renders it as pesos, and deletes it", async ({ page }) => {
    const description = uniqueName("Coffee");

    await page.goto("/expenses");
    await page.getByRole("button", { name: /Add Expense|Add your first expense/ }).click();

    const form = modalWithTitle(page, "New Expense");
    await form.locator('input[type="number"]').first().fill("150.75");
    await form.getByPlaceholder("What was this expense for?").fill(description);

    // Both halves of the money invariant, on one action: what leaves the browser and what the
    // browser draws. The request body must carry integer centavos (15075) — a float round-trip
    // is the failure this guards — and the row must render the same amount as ₱150.75.
    const [request] = await Promise.all([
      page.waitForRequest(
        (r) => r.method() === "POST" && r.url().endsWith("/api/v2/expenses")
      ),
      form.getByRole("button", { name: "Save", exact: true }).click(),
    ]);
    expect(JSON.parse(request.postData() ?? "{}").amount).toBe(15075);
    await form.waitFor({ state: "detached", timeout: 15000 });

    const row = page.locator("table tbody tr").filter({ hasText: description });
    await expect(row).toHaveCount(1, { timeout: 15000 });
    await expect(row).toContainText("₱150.75");

    // Cleanup is part of the flow: the suite leaves the database as it found it.
    await row.hover();
    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await confirmInModal(page, "Delete expense?");
    await expect(page.locator("table tbody tr").filter({ hasText: description })).toHaveCount(0, {
      timeout: 15000,
    });
  });
});
