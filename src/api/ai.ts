import api from "./client";

export interface AiQueryResponse {
  answer: unknown;
}

export const askQuery = (question: string) =>
  api.post<AiQueryResponse>("/ai/query", { question }).then((r) => r.data);