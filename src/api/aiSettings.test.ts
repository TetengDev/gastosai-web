import { beforeEach, describe, expect, it, vi } from "vitest";
import api, { UNVERSIONED_BASE_URL } from "./client";
import { DEFAULT_AI_LANGUAGE, fetchAiLanguages } from "./aiSettings";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, default: { get: vi.fn() } };
});

/**
 * The supported set is configuration on the server, so the client must not hold
 * a copy of it. These assert the two things that replaces: the list is whatever
 * the server sent, in its order, and a failed call still yields a usable one.
 */
describe("fetchAiLanguages", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the languages the server offers, in order", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        { code: "en", displayName: "English" },
        { code: "ja", displayName: "日本語" },
      ],
    });

    await expect(fetchAiLanguages()).resolves.toEqual([
      { code: "en", displayName: "English" },
      { code: "ja", displayName: "日本語" },
    ]);
    // The contract publishes this path unversioned only; /api/v2 has no mirror.
    expect(api.get).toHaveBeenCalledWith("/ai/languages", { baseURL: UNVERSIONED_BASE_URL });
  });

  it("falls back to English alone when the call fails, so the picker still renders", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("network"));

    await expect(fetchAiLanguages()).resolves.toEqual([
      { code: DEFAULT_AI_LANGUAGE, displayName: "English" },
    ]);
  });
});
