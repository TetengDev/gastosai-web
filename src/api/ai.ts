import api from "./client";

export type ChatMode = "plain" | "professional" | "genz";

export interface AiQueryResponse {
  answer: unknown;
}

export const askQuery = (question: string, mode: ChatMode) =>
  api.post<AiQueryResponse>("/ai/query", { question, mode }).then((r) => r.data);