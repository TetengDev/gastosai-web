import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { AxiosAdapter } from "axios";
import ChatWidget from "./ChatWidget";
import api from "../api/client";
import { chatAction } from "../api/ai";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../hooks/useConversations";
import { useFeatures } from "../hooks/useFeatures";
import { useAiAvailability } from "../hooks/useAiAvailability";
import { useEntitlements } from "../hooks/useEntitlements";
import { looksLikeExpenseLog, looksLikeNlQuery } from "../lib/intentDetection";

vi.mock("../api/ai", () => ({
  chatAction: vi.fn(),
  askQuery: vi.fn(),
  askWithAttachment: vi.fn(),
  getConversationMessages: vi.fn(),
}));
vi.mock("../api/categories", () => ({ getCategories: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../hooks/useConversations", () => ({ useConversations: vi.fn() }));
vi.mock("../hooks/useFeatures", () => ({ useFeatures: vi.fn() }));
vi.mock("../hooks/useAiAvailability", () => ({ useAiAvailability: vi.fn() }));
vi.mock("../hooks/useEntitlements", () => ({ useEntitlements: vi.fn() }));
// The routing between a parsed expense, an NL query and an action turn is its own concern and has
// its own tests; pinning both predictions to false sends every message down the action path.
vi.mock("../lib/intentDetection", () => ({
  looksLikeExpenseLog: vi.fn(),
  looksLikeNlQuery: vi.fn(),
}));

/**
 * Confirming a preview card, at the level the TEN-167 criterion is stated: what the browser puts
 * on the wire when the user presses Confirm.
 *
 * Everything up to the card is mocked — the preview turn is handed to the widget as the server
 * would hand it over. The confirm call itself is the real one, captured at the axios adapter,
 * which is the last thing axios touches before the network.
 */
const captureRequests = (data: unknown = { type: "action", message: "Budget created for Groceries (₱8000).", result: { id: 7 } }) => {
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

const previewTurn = {
  type: "preview" as const,
  message: "Create budget for Groceries — ₱8000?",
  conversationId: 42,
  result: { toolName: "create_budget", params: { categoryName: "Groceries", amountLimit: "8000", month: "2026-09" } },
};

describe("ChatWidget preview confirmation", () => {
  beforeEach(() => {
    // jsdom implements no layout, so the scroll-to-bottom effect has nothing to call.
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(looksLikeExpenseLog).mockReturnValue(false);
    vi.mocked(looksLikeNlQuery).mockReturnValue(false);
    vi.mocked(getCategories).mockResolvedValue([]);
    vi.mocked(useFeatures).mockReturnValue({ csvImport: false, chatAttachments: false });
    vi.mocked(useAiAvailability).mockReturnValue(true);
    vi.mocked(useEntitlements).mockReturnValue({ entitlements: null, has: () => true, loading: false });
    vi.mocked(useConversations).mockReturnValue({
      conversations: [],
      loading: false,
      refresh: vi.fn(),
      remove: vi.fn(),
    } as unknown as ReturnType<typeof useConversations>);
    vi.mocked(useAuth).mockReturnValue({
      user: { name: "Teng" },
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(chatAction).mockResolvedValue(previewTurn as unknown as Awaited<ReturnType<typeof chatAction>>);
  });

  afterEach(() => {
    delete api.defaults.adapter;
    vi.clearAllMocks();
  });

  /** Opens the widget, sends one message, and waits for the preview card's Confirm button. */
  const openPreviewCard = async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ChatWidget />
      </MemoryRouter>
    );
    await user.click(screen.getByRole("button", { name: "Open chat" }));
    await user.type(screen.getByPlaceholderText("Ask or tell me what to do…"), "budget Groceries 8000");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument());
    return user;
  };

  it("confirms with the proposed tool and params, not a rebuilt sentence", async () => {
    const seen = captureRequests();
    const user = await openPreviewCard();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].url.endsWith("/ai/chat/confirm")).toBe(true);
    expect(seen[0].body).toEqual({
      toolName: "create_budget",
      params: { categoryName: "Groceries", amountLimit: "8000", month: "2026-09" },
      mode: "execute",
      conversationId: 42,
    });
    // The sentence the old buildConfirmMessage produced. Nothing on the wire resembles it.
    expect(JSON.stringify(seen[0].body)).not.toContain("create a budget for");
  });

  // An edit in a preview field overrides the proposed argument; it does not become prose either.
  it("sends an edited field as a param, keeping the rest of the proposal", async () => {
    const seen = captureRequests();
    const user = await openPreviewCard();

    const amountField = screen.getByDisplayValue("8000");
    await user.clear(amountField);
    await user.type(amountField, "9500");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].body).toMatchObject({
      toolName: "create_budget",
      params: { categoryName: "Groceries", amountLimit: "9500", month: "2026-09" },
    });
  });

  it("settles the card into its saved state once the server answers", async () => {
    captureRequests();
    const user = await openPreviewCard();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByText("Saved to budgets")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  // A rejected confirm must not leave a card that still offers to confirm — pressing it again
  // would run the action twice.
  it("closes the card without a saved state when the confirm fails", async () => {
    api.defaults.adapter = (() => Promise.reject(new Error("boom"))) as AxiosAdapter;
    const user = await openPreviewCard();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument());
    expect(screen.queryByText("Saved to budgets")).not.toBeInTheDocument();
  });
});
