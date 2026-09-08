import { expect, test } from "@playwright/test";
import { API_BASE, RUN_ID, apiHeaders, sweepRunData, uniqueName } from "../support";

/**
 * The safety net has to be verified like anything else: the other specs only exercise it on
 * their happy path, where it has nothing left to delete. This one hands it a row on purpose.
 */
// The net needs a net: this spec orphans rows deliberately, so a failure between two of its
// creates would leave behind exactly what it exists to prove gets cleaned up.
test.afterEach(async ({ request }) => {
  await sweepRunData(request);
});

test.describe("Happy · run cleanup", { tag: "@happy" }, () => {
  test("sweeps a row this run created and leaves everything else alone", async ({ request }) => {
    // The saved session's token — signing in again here would spend a rate-limited attempt.
    const headers = await apiHeaders(request);

    const before = await request.get(`${API_BASE}/expenses`, { headers });
    const otherCount = ((await before.json()) as { description?: string }[]).filter(
      (e) => !e.description?.includes(RUN_ID)
    ).length;

    // A row the in-test cleanup will never reach — the same shape an aborted spec leaves behind.
    const orphan = uniqueName("Orphan");
    const created = await request.post(`${API_BASE}/expenses`, {
      headers,
      data: { amount: 100, category: "Uncategorized", description: orphan, expenseType: "PERSONAL" },
    });
    expect(created.ok()).toBeTruthy();

    // Two more shapes, so the sweep is proven past the one entity the other specs create most.
    const orphanGoal = uniqueName("OrphanGoal");
    const goal = await request.post(`${API_BASE}/goals`, {
      headers,
      data: { name: orphanGoal, targetAmount: 100000, savedAmount: 0, targetDate: null, currency: "PHP" },
    });
    expect(goal.ok()).toBeTruthy();

    const orphanCategory = uniqueName("OrphanCat");
    const category = await request.post(`${API_BASE}/categories`, {
      headers,
      data: { name: orphanCategory, icon: null },
    });
    expect(category.ok()).toBeTruthy();

    const swept = await sweepRunData(request);
    expect(swept).toContain(`expense ${orphan}`);
    expect(swept).toContain(`goal ${orphanGoal}`);
    expect(swept).toContain(`category ${orphanCategory}`);

    const after = await request.get(`${API_BASE}/expenses`, { headers });
    const remaining = (await after.json()) as { description?: string }[];
    expect(remaining.filter((e) => e.description?.includes(RUN_ID))).toHaveLength(0);
    // The sweep is scoped to this run's id: nothing else moved.
    expect(remaining).toHaveLength(otherCount);
  });
});
