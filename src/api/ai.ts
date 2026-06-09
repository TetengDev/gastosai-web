import api from "./client";

export type ChatMode = "plain" | "professional" | "genz";

export interface AiQueryResponse {
  answer: unknown;
}

export const askQuery = (question: string, mode: ChatMode) =>
  api.post<AiQueryResponse>("/ai/query", { question, mode }).then((r) => r.data);

export const askWithAttachment = (question: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  if (question.trim()) form.append("question", question.trim());
  return api
    .post<AiQueryResponse>("/ai/vision", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};