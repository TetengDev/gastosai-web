import { describe, it, expect, afterEach } from "vitest";
import type { AxiosAdapter } from "axios";
import api from "./client";
import { createExpense, updateExpense } from "./expenses";

/**
 * What actually goes on the wire.
 *
 * The adapter is the last thing axios calls before the network, so a request captured here is
 * the request the backend would receive — path, and body after serialization. That is the level
 * TEN-346's acceptance criterion is stated at: 150.75 typed, 15075 sent.
 *
 * Only the tail of the URL is asserted: the host in front of it comes from `VITE_API_URL` and
 * differs between a developer's machine and CI.
 */
const captureRequests = () => {
  const seen: { url: string; body: unknown }[] = [];
  api.defaults.adapter = ((config) => {
    seen.push({
      url: `${config.baseURL ?? ""}${config.url ?? ""}`,
      body: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
    });
    return Promise.resolve({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    });
  }) as AxiosAdapter;
  return seen;
};

describe("expenses transport", () => {
  afterEach(() => {
    delete api.defaults.adapter;
  });

  it("posts an amount to /api/v2/expenses as the integer centavos it was given", async () => {
    const seen = captureRequests();

    await createExpense({ amount: 15075, description: "Lunch" });

    expect(seen).toHaveLength(1);
    expect(seen[0].url.endsWith("/api/v2/expenses")).toBe(true);
    expect(seen[0].body).toMatchObject({ amount: 15075 });
  });

  // Serialization is the last place a centavo can go missing: an amount that arrived as an
  // integer must not come out of JSON.stringify as 15075.0000001 or "150.75".
  it("serializes the amount as a bare integer, not a decimal or a string", async () => {
    const seen = captureRequests();

    await createExpense({ amount: 887, description: "Coffee" });

    expect(seen[0].body).toEqual(expect.objectContaining({ amount: 887 }));
    expect(Number.isInteger((seen[0].body as { amount: number }).amount)).toBe(true);
  });

  it("puts an updated amount to the same versioned path", async () => {
    const seen = captureRequests();

    await updateExpense(42, { amount: 190000, description: "Rent" });

    expect(seen[0].url.endsWith("/api/v2/expenses/42")).toBe(true);
    expect(seen[0].body).toMatchObject({ amount: 190000 });
  });
});
