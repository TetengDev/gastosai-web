import api from "./client";
import type { components } from "./generated/schema";
import type { ParsedExpenseResult } from "./expenses";

type Schemas = components["schemas"];

/**
 * springdoc expresses neither presence nor nullability: every response property
 * arrives optional and never nullable, which is wrong in both directions. These
 * two put it back — `Complete` for the fields the API always sends, `Nullable`
 * for the ones it sends as `null` (an untitled conversation, an assistant turn
 * that carried a tool call instead of prose).
 */
type Complete<T> = { [K in keyof T]-?: T[K] };
type Nullable<T, K extends keyof T> = Omit<Complete<T>, K> & {
  [P in K]-?: Exclude<T[P], undefined> | null;
};

/**
 * The contract types the chat mode, the response type and the message role as
 * bare strings — none of those backend enums is expressed in the spec, so they
 * are the fields the generated types cannot narrow on their own. The values
 * still come from the contract's own string types; only the domain is added.
 */
export type ChatMode = Extract<Schemas["AiQueryRequest"]["mode"], string> &
  ("plain" | "professional" | "genz");

export type ChatResponseType = Extract<Schemas["ChatResponse"]["type"], string> &
  ("action" | "text" | "query" | "preview" | "disambiguate");

export type ChatMessageRole = Extract<Schemas["ChatMessageDto"]["role"], string> &
  ("USER" | "ASSISTANT");

export type AiQueryRequest = Schemas["AiQueryRequest"];
export type AiQueryResponse = Complete<Schemas["AiQueryResponse"]>;

export type ChatRequest = Schemas["ChatRequest"];

/** `conversationId` stays optional: the API omits it on a turn with no thread. */
export type ChatResponse = Omit<Complete<Schemas["ChatResponse"]>, "type" | "conversationId"> & {
  type: ChatResponseType;
  conversationId?: Schemas["ChatResponse"]["conversationId"];
};

export type ChatMessageDto = Omit<
  Nullable<Schemas["ChatMessageDto"], "content" | "toolName" | "responseType">,
  "role"
> & {
  role: ChatMessageRole;
};

export type Conversation = Nullable<Schemas["ConversationSummaryDto"], "title">;

export const askQuery = (question: string, mode: ChatMode): Promise<AiQueryResponse> => {
  const body: AiQueryRequest = { question, mode };
  return api.post<AiQueryResponse>("/ai/query", body).then((r) => r.data);
};

export async function chatAction(
  message: string,
  mode: string,
  conversationId?: number,
): Promise<ChatResponse> {
  const body: ChatRequest = { message, mode, conversationId };
  const res = await api.post<ChatResponse>("/ai/chat", body);
  return res.data;
}

export const listConversations = (): Promise<Conversation[]> =>
  api.get<Conversation[]>("/chat/conversations").then((r) => r.data);

export const getConversationMessages = (id: number): Promise<ChatMessageDto[]> =>
  api.get<ChatMessageDto[]>(`/chat/conversations/${id}`).then((r) => r.data);

export const deleteConversation = (id: number) =>
  api.delete(`/chat/conversations/${id}`);

export const askWithAttachment = (
  question: string,
  file: File,
  mode: ChatMode,
): Promise<ParsedExpenseResult> => {
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
