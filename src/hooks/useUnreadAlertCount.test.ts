import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAlerts } from "../api/alerts";
import { useUnreadAlertCount } from "./useUnreadAlertCount";

vi.mock("../api/alerts", () => ({ getAlerts: vi.fn().mockResolvedValue([]) }));

describe("useUnreadAlertCount", () => {
  afterEach(() => vi.useRealTimers());

  it("asks for the new Manila month on a refetch after midnight on the 1st", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T15:30:00Z")); // 23:30 Manila, 30 Sep
    renderHook(() => useUnreadAlertCount());
    await waitFor(() => expect(getAlerts).toHaveBeenLastCalledWith("2026-09"));

    vi.setSystemTime(new Date("2026-09-30T16:30:00Z")); // 00:30 Manila, 1 Oct
    act(() => {
      window.dispatchEvent(new Event("gastosai:expense-changed"));
    });
    await waitFor(() => expect(getAlerts).toHaveBeenLastCalledWith("2026-10"));
  });
});
