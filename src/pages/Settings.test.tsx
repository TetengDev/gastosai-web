import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings";
import {
  fetchAiLanguages,
  getAiSettings,
  updateAiSettings,
  type AiSettings,
} from "../api/aiSettings";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../components/AiKeySection", () => ({ default: () => null }));
vi.mock("../components/BillingSection", () => ({ default: () => null }));
vi.mock("../api/aiSettings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/aiSettings")>()),
  fetchAiLanguages: vi.fn(),
  getAiSettings: vi.fn(),
  updateAiSettings: vi.fn(),
}));

const mockFetchAiLanguages = vi.mocked(fetchAiLanguages);
const mockGetAiSettings = vi.mocked(getAiSettings);
const mockUpdateAiSettings = vi.mocked(updateAiSettings);
const mockUseAuth = vi.mocked(useAuth);

const settings = (over: Partial<AiSettings> = {}): AiSettings => ({
  openaiKeySet: false,
  claudeKeySet: false,
  aiAvailable: true,
  insightLanguage: null,
  chatLanguage: null,
  ...over,
});

const insightSelect = () => screen.getByLabelText("Insights") as HTMLSelectElement;
const assistantSelect = () => screen.getByLabelText("Assistant") as HTMLSelectElement;

/**
 * The two languages are one endpoint but two independent settings. These assert
 * what reaches the API layer — one field per save — and what comes back out of
 * a reload.
 */
describe("Settings AI language", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { name: "Demo", email: "demo@example.com" },
      updateProfile: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    mockFetchAiLanguages.mockResolvedValue([
      { code: "en", displayName: "English" },
      { code: "fil", displayName: "Filipino" },
    ]);
    mockGetAiSettings.mockResolvedValue(settings());
    mockUpdateAiSettings.mockImplementation(async (body) =>
      settings({
        insightLanguage: body.insightLanguage ?? null,
        chatLanguage: body.chatLanguage ?? null,
      }),
    );
  });

  const renderSettings = async () => {
    render(<Settings />);
    await waitFor(() => expect(insightSelect().disabled).toBe(false));
  };

  it("shows the stored languages, defaulting an unset one to English", async () => {
    mockGetAiSettings.mockResolvedValue(settings({ insightLanguage: "fil" }));
    await renderSettings();

    expect(insightSelect().value).toBe("fil");
    expect(assistantSelect().value).toBe("en");
  });

  it("sends only the insight language when the insight control changes", async () => {
    mockGetAiSettings.mockResolvedValue(settings({ insightLanguage: "en", chatLanguage: "en" }));
    mockUpdateAiSettings.mockResolvedValue(
      settings({ insightLanguage: "fil", chatLanguage: "en" }),
    );
    await renderSettings();

    fireEvent.change(insightSelect(), { target: { value: "fil" } });

    await waitFor(() => expect(mockUpdateAiSettings).toHaveBeenCalledTimes(1));
    expect(mockUpdateAiSettings.mock.calls[0][0]).toEqual({ insightLanguage: "fil" });
    await waitFor(() => expect(insightSelect().value).toBe("fil"));
    // Independent: the assistant did not move with it.
    expect(assistantSelect().value).toBe("en");
  });

  it("sends only the chat language when the assistant control changes", async () => {
    mockGetAiSettings.mockResolvedValue(settings({ insightLanguage: "fil", chatLanguage: "fil" }));
    mockUpdateAiSettings.mockResolvedValue(
      settings({ insightLanguage: "fil", chatLanguage: "en" }),
    );
    await renderSettings();

    fireEvent.change(assistantSelect(), { target: { value: "en" } });

    await waitFor(() => expect(mockUpdateAiSettings).toHaveBeenCalledTimes(1));
    expect(mockUpdateAiSettings.mock.calls[0][0]).toEqual({ chatLanguage: "en" });
    await waitFor(() => expect(assistantSelect().value).toBe("en"));
    expect(insightSelect().value).toBe("fil");
  });

  it("keeps the saved choice across a reload", async () => {
    const first = render(<Settings />);
    await waitFor(() => expect(insightSelect().disabled).toBe(false));
    fireEvent.change(insightSelect(), { target: { value: "fil" } });
    await waitFor(() => expect(mockUpdateAiSettings).toHaveBeenCalledTimes(1));
    first.unmount();

    // What the server now holds is what a fresh mount reads back.
    mockGetAiSettings.mockResolvedValue(settings({ insightLanguage: "fil" }));
    render(<Settings />);

    await waitFor(() => expect(insightSelect().value).toBe("fil"));
  });

  it("renders a language option for every language the server offers", async () => {
    mockFetchAiLanguages.mockResolvedValue([
      { code: "en", displayName: "English" },
      { code: "ja", displayName: "日本語" },
    ]);
    await renderSettings();

    // One per control.
    expect(await screen.findAllByRole("option", { name: "日本語" })).toHaveLength(2);
    expect(screen.queryAllByRole("option", { name: "Filipino" })).toHaveLength(0);
  });

  it("keeps the server's order", async () => {
    mockFetchAiLanguages.mockResolvedValue([
      { code: "en", displayName: "English" },
      { code: "ceb", displayName: "Cebuano" },
      { code: "ja", displayName: "日本語" },
    ]);
    await renderSettings();

    await waitFor(() =>
      expect([...insightSelect().options].map((o) => o.value)).toEqual(["en", "ceb", "ja"]),
    );
  });

  it("still shows a stored code the server no longer offers, rather than silently reselecting", async () => {
    mockFetchAiLanguages.mockResolvedValue([{ code: "en", displayName: "English" }]);
    mockGetAiSettings.mockResolvedValue(settings({ insightLanguage: "fil" }));
    await renderSettings();

    await waitFor(() => expect(insightSelect().value).toBe("fil"));
    expect([...insightSelect().options].map((o) => o.value)).toEqual(["en", "fil"]);
    // The assistant is unset, so it shows the default and gains no stray option.
    expect(assistantSelect().value).toBe("en");
    expect([...assistantSelect().options].map((o) => o.value)).toEqual(["en"]);
  });

  it("renders English alone when the languages call fails", async () => {
    // fetchAiLanguages absorbs the failure itself; the page gets the fallback.
    mockFetchAiLanguages.mockResolvedValue([{ code: "en", displayName: "English" }]);
    await renderSettings();

    expect([...insightSelect().options].map((o) => o.textContent)).toEqual(["English"]);
    expect(insightSelect().value).toBe("en");
  });

  it("reverts the control and reports the failure when the save fails", async () => {
    mockGetAiSettings.mockResolvedValue(settings({ insightLanguage: "en" }));
    mockUpdateAiSettings.mockRejectedValue(new Error("boom"));
    await renderSettings();

    fireEvent.change(insightSelect(), { target: { value: "fil" } });

    expect(await screen.findByText("Failed to save language.")).toBeInTheDocument();
    expect(insightSelect().value).toBe("en");
  });
});
