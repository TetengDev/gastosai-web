import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConversations } from "./useConversations";
import * as ai from "../api/ai";
import type { Conversation } from "../api/types";

vi.mock("../api/ai");

const sample: Conversation[] = [
  { id: 1, title: "Food spend", createdAt: "2026-06-20T10:00:00", updatedAt: "2026-06-21T10:00:00" },
  { id: 2, title: "Budget", createdAt: "2026-06-19T10:00:00", updatedAt: "2026-06-20T10:00:00" },
];

describe("useConversations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads conversations on mount", async () => {
    vi.mocked(ai.listConversations).mockResolvedValue(sample);
    const { result } = renderHook(() => useConversations());
    await waitFor(() => expect(result.current.conversations).toHaveLength(2));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("removes a conversation locally after delete", async () => {
    vi.mocked(ai.listConversations).mockResolvedValue(sample);
    vi.mocked(ai.deleteConversation).mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useConversations());
    await waitFor(() => expect(result.current.conversations).toHaveLength(2));

    await act(async () => {
      await result.current.remove(1);
    });
    expect(ai.deleteConversation).toHaveBeenCalledWith(1);
    expect(result.current.conversations.map((c) => c.id)).toEqual([2]);
  });

  it("sets an error when loading fails", async () => {
    vi.mocked(ai.listConversations).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useConversations());
    await waitFor(() => expect(result.current.error).toBe("Failed to load conversations"));
  });
});
