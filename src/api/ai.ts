import api from "./client";
import type { ChatMessageDto, ChatResponse, Conversation, ParsedExpenseResult } from "./types";

export type ChatMode = "plain" | "professional" | "genz";

export interface AiQueryResponse {
  answer: unknown;
}

export const askQuery = (question: string, mode: ChatMode) =>
  api.post<AiQueryResponse>("/ai/query", { question, mode }).then((r) => r.data);

export async function chatAction(message: string, mode: string, conversationId?: number): Promise<ChatResponse> {
  const res = await api.post<ChatResponse>("/ai/chat", { message, mode, conversationId });
  return res.data;
}

export const listConversations = () =>
  api.get<Conversation[]>("/chat/conversations").then((r) => r.data);

export const getConversationMessages = (id: number) =>
  api.get<ChatMessageDto[]>(`/chat/conversations/${id}`).then((r) => r.data);

export const deleteConversation = (id: number) =>
  api.delete(`/chat/conversations/${id}`);

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
