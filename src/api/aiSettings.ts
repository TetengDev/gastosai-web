import api, { UNVERSIONED_BASE_URL } from "./client";
import type { components } from "./generated/schema";
import type { Complete, Nullable } from "./typeHelpers";

type Schemas = components["schemas"];

/**
 * A language the server offers for AI prose.
 *
 * The set is configuration-driven on the backend and served by
 * `GET /ai/languages`, so `code` stays the contract's bare string — the server
 * rejects anything it does not know with a 400. There is no local union to keep
 * in step with it, which is the point. `Complete` puts back the presence
 * springdoc drops: both fields are always sent.
 */
export type AiLanguageOption = Complete<Schemas["AiLanguageOption"]>;

/** The language the API falls back to for a user who has not chosen one. */
export const DEFAULT_AI_LANGUAGE = "en";

/** What the picker falls back to, so a failed call still leaves a usable control. */
const ENGLISH_ONLY: AiLanguageOption[] = [{ code: DEFAULT_AI_LANGUAGE, displayName: "English" }];

/**
 * The picker's options, in the order the server gives. A failed call returns
 * English alone rather than throwing: a settings page that cannot render its
 * language control is worse than one offering only the default.
 *
 * The contract publishes this at `/ai/languages` and nowhere else — `/api/v2`
 * does not mirror it — so it is read from the unversioned surface, like
 * `/expenses/projects`. Nothing money-bearing crosses it: a code and a name.
 */
export const fetchAiLanguages = async (): Promise<AiLanguageOption[]> => {
  try {
    const { data } = await api.get<AiLanguageOption[]>("/ai/languages", {
      baseURL: UNVERSIONED_BASE_URL,
    });
    return data;
  } catch {
    return ENGLISH_ONLY;
  }
};

/**
 * springdoc marks every response property optional: the key flags and
 * `aiAvailable` are always sent, and the two languages are always present but
 * `null` until the user picks one — which is what `Nullable` says.
 */
export type AiSettings = Nullable<
  Schemas["AiSettingsResponse"],
  "insightLanguage" | "chatLanguage"
>;

/**
 * An omitted field leaves the stored value alone, which is what makes the two
 * languages independent: saving one sends only that one.
 */
export type AiSettingsUpdate = Schemas["AiSettingsRequest"];

export const AI_SETTINGS_CHANGED_EVENT = "gastosai:ai-settings-changed";

export const getAiSettings = () =>
  api.get<AiSettings>("/user/ai-settings").then((r) => r.data);

export const updateAiSettings = (body: AiSettingsUpdate) =>
  api.put<AiSettings>("/user/ai-settings", body).then((r) => r.data);

export const clearAiKey = (provider: "openai" | "claude") =>
  api.delete<AiSettings>(`/user/ai-settings/${provider}`).then((r) => r.data);
