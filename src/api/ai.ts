import api from "./client";
import type { ChatResponse, ParsedExpenseResult } from "./types";

export type ChatMode = "plain" | "professional" | "genz";

export interface AiQueryResponse {
  answer: unknown;
}

export const askQuery = (question: string, mode: ChatMode) =>
  api.post<AiQueryResponse>("/ai/query", { question, mode }).then((r) => r.data);

export async function chatAction(message: string, mode: string): Promise<ChatResponse> {
  const res = await api.post<ChatResponse>("/ai/chat", { message, mode });
  return res.data;
}

export const askWithAttachment = (question: string, file: File, mode: ChatMode) => {
  const form = new FormData();
  form.append("file", file);
  form.append("mode", mode);
  if (question.trim()) form.append("question", question.trim());
  return api
    .post<ParsedExpenseResult>("/ai/vision", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
