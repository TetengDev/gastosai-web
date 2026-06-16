import api from "./client";

export interface AiSettings {
  openaiKeySet: boolean;
  claudeKeySet: boolean;
}

export const getAiSettings = () =>
  api.get<AiSettings>("/user/ai-settings").then((r) => r.data);

export const updateAiSettings = (body: { openaiApiKey?: string; claudeApiKey?: string }) =>
  api.put<AiSettings>("/user/ai-settings", body).then((r) => r.data);

export const clearAiKey = (provider: "openai" | "claude") =>
  api.delete<AiSettings>(`/user/ai-settings/${provider}`).then((r) => r.data);
