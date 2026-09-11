import { describe, it, expect, afterEach } from "vitest";
import type { AxiosAdapter } from "axios";
import api from "../../api/client";
import * as chatActions from "./chatActions";
import { confirmChatAction } from "./chatActions";

/**
 * What actually goes on the wire when a preview card is confirmed (TEN-167).
 *
 * The adapter is the last thing axios calls before the network, so a request captured here is
 * the request the backend would receive. That is the level the acceptance criterion is stated
 * at: the tool and its arguments, not a sentence rebuilt from them.
 *
 * Only the tail of the URL is asserted — the host in front of it comes from `VITE_API_URL` and
 * differs between a developer's machine and CI.
 */
const captureRequests = (data: unknown = {}) => {
  const seen: { url: string; body: unknown }[] = [];
  api.defaults.adapter = ((config) => {
    seen.push({
      url: `${config.baseURL ?? ""}${config.url ?? ""}`,
      body: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
    });
    return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config });
  }) as AxiosAdapter;
  return seen;
};

describe("confirmChatAction", () => {
  afterEach(() => {
    delete api.defaults.adapter;
  });

  it("posts the tool name and params, and no natural-language message", async () => {
    const seen = captureRequests();

    await confirmChatAction("create_budget", { categoryName: "Groceries", amountLimit: "8000", month: "2026-09" }, 42);

    expect(seen).toHaveLength(1);
    expect(seen[0].body).toEqual({
      toolName: "create_budget",
      params: { categoryName: "Groceries", amountLimit: "8000", month: "2026-09" },
      mode: "execute",
      conversationId: 42,
    });
    expect(seen[0].body).not.toHaveProperty("message");
  });

  /**
   * The contract publishes this endpoint on the unversioned surface only. A preview's `params`
   * are the v1 decimal arguments, so posting them under `/api/v2` — where every money field is
   * centavos — would confirm the amount a hundredfold.
   */
  it("posts to the unversioned /ai/chat/confirm, not to /api/v2", async () => {
    const seen = captureRequests();

    await confirmChatAction("create_expense", { amount: 150.75, description: "Lunch" });

    expect(seen[0].url.endsWith("/ai/chat/confirm")).toBe(true);
    expect(seen[0].url).not.toContain("/api/v2");
  });

  // The amounts are the server's own, handed back untouched: no parse, no rounding, no unit change.
  it("echoes the params unchanged rather than converting money", async () => {
    const seen = captureRequests();

    const params = { amount: 150.75, targetAmount: "1900.50", description: "Lunch" };
    await confirmChatAction("create_goal", params);

    expect((seen[0].body as { params: unknown }).params).toEqual(params);
  });

  it("omits conversationId when there is no thread yet", async () => {
    const seen = captureRequests();

    await confirmChatAction("delete_category", { name: "Unused" });

    expect(seen[0].body).not.toHaveProperty("conversationId");
  });

  it("returns the turn the server answered with", async () => {
    captureRequests({ type: "action", message: "Budget created for Groceries (₱8000).", result: { id: 7 }, conversationId: 42 });

    const res = await confirmChatAction("create_budget", { categoryName: "Groceries", amountLimit: "8000" });

    expect(res.type).toBe("action");
    expect(res.message).toBe("Budget created for Groceries (₱8000).");
    expect(res.conversationId).toBe(42);
  });

  // The acceptance criterion is deletion, not disuse: a sentence builder left exported is one
  // an import can quietly bring back.
  it("no longer exports a confirm-message builder", () => {
    expect(chatActions).not.toHaveProperty("buildConfirmMessage");
  });
});
