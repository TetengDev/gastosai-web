import api from "./client";
import type { components } from "./generated/schema";
// `Complete` marks the fields the API always sends; `Nullable` the ones it
// sends as `null` — here an event with no authenticated user, a tool call made
// outside a conversation, a day with no AI spend.
import type { Complete, Nullable } from "./typeHelpers";

type Schemas = components["schemas"];

/**
 * The contract types an audit entry's `status` as a bare string — the backend's
 * enum is not expressed in the spec, so this is the one field the generated
 * types cannot narrow on their own. The values still come from the contract's
 * own string type; only the domain is added.
 */
export type ChatAuditStatus = "SUCCESS" | "FAILED";

export type ChatAuditLogDto = Omit<
  Nullable<Schemas["ChatAuditLogDto"], "conversationId" | "detail">,
  "status"
> & {
  status: Extract<Schemas["ChatAuditLogDto"]["status"], string> & ChatAuditStatus;
};

export type TopUserItem = Nullable<Schemas["TopUserItem"], "userId">;

/** `Complete` is shallow, so the item type is narrowed explicitly. */
export type ObservabilitySummary = Omit<Complete<Schemas["ObservabilitySummary"]>, "topUsers30d"> & {
  topUsers30d: TopUserItem[];
};

export type AiUsageSummaryItem = Nullable<
  Schemas["AiUsageSummaryItem"],
  "inputTokens" | "outputTokens" | "estimatedCostUsd"
>;

export type ObservabilityCost = Omit<
  Nullable<Schemas["ObservabilityCost"], "todayCostUsd">,
  "monthToDate"
> & {
  monthToDate: AiUsageSummaryItem[];
};

export type AppEventDto = Nullable<
  Schemas["AppEventDto"],
  "requestId" | "userId" | "path" | "httpStatus" | "message"
>;

export type ObservabilityHealth = Complete<Schemas["ObservabilityHealth"]>;

export const getChatAuditLog = (limit = 100): Promise<ChatAuditLogDto[]> =>
  api.get<ChatAuditLogDto[]>("/admin/chat-audit", { params: { limit } }).then((r) => r.data);

export const getObservabilitySummary = (): Promise<ObservabilitySummary> =>
  api.get<ObservabilitySummary>("/admin/observability/summary").then((r) => r.data);

export const getObservabilityCost = (): Promise<ObservabilityCost> =>
  api.get<ObservabilityCost>("/admin/observability/cost").then((r) => r.data);

export const getObservabilityEvents = (type?: string, limit = 100): Promise<AppEventDto[]> =>
  api
    .get<AppEventDto[]>("/admin/observability/events", { params: { type, limit } })
    .then((r) => r.data);

export const getObservabilityHealth = (): Promise<ObservabilityHealth> =>
  api.get<ObservabilityHealth>("/admin/observability/health").then((r) => r.data);
