import api from "./client";
import type { components } from "./generated/schema";
import type {
  AssertContractUnionCovered,
  CoversContractUnion,
  Nullable,
} from "./typeHelpers";

type Schemas = components["schemas"];

/**
 * The contract types both language fields as bare strings — the backend's
 * `AiLanguage` allow-list is not expressed in the spec. The values are a closed
 * set on the server (anything else is a 400), so the domain is added here.
 */
export type AiLanguage = "en" | "fil";

/** The language the API falls back to for a user who has not chosen one. */
export const DEFAULT_AI_LANGUAGE: AiLanguage = "en";

export const AI_LANGUAGES: { code: AiLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fil", label: "Filipino" },
];

/**
 * Build failures that name the missing member should the contract later publish
 * the real enum. Exported because `noUnusedLocals` is on.
 */
export type AiSettingsInsightLanguageCovered = AssertContractUnionCovered<
  CoversContractUnion<Schemas["AiSettingsResponse"]["insightLanguage"], AiLanguage>
>;
export type AiSettingsChatLanguageCovered = AssertContractUnionCovered<
  CoversContractUnion<Schemas["AiSettingsResponse"]["chatLanguage"], AiLanguage>
>;

type ResponseLanguage = Extract<Schemas["AiSettingsResponse"]["insightLanguage"], string> &
  AiLanguage;

/**
 * springdoc marks every response property optional: the key flags and
 * `aiAvailable` are always sent, and the two languages are always present but
 * `null` until the user picks one — which is what `Nullable` says.
 */
export type AiSettings = Nullable<
  Omit<Schemas["AiSettingsResponse"], "insightLanguage" | "chatLanguage"> & {
    insightLanguage?: ResponseLanguage;
    chatLanguage?: ResponseLanguage;
  },
  "insightLanguage" | "chatLanguage"
>;

/**
 * An omitted field leaves the stored value alone, which is what makes the two
 * languages independent: saving one sends only that one.
 */
export type AiSettingsUpdate = Omit<
  Schemas["AiSettingsRequest"],
  "insightLanguage" | "chatLanguage"
> & {
  insightLanguage?: Extract<Schemas["AiSettingsRequest"]["insightLanguage"], string> & AiLanguage;
  chatLanguage?: Extract<Schemas["AiSettingsRequest"]["chatLanguage"], string> & AiLanguage;
};

export const AI_SETTINGS_CHANGED_EVENT = "gastosai:ai-settings-changed";

export const getAiSettings = () =>
  api.get<AiSettings>("/user/ai-settings").then((r) => r.data);

export const updateAiSettings = (body: AiSettingsUpdate) =>
  api.put<AiSettings>("/user/ai-settings", body).then((r) => r.data);

export const clearAiKey = (provider: "openai" | "claude") =>
  api.delete<AiSettings>(`/user/ai-settings/${provider}`).then((r) => r.data);
