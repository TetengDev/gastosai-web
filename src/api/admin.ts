import api from "./client";
import type {
  AppEventDto,
  ChatAuditLogDto,
  ObservabilityCost,
  ObservabilityHealth,
  ObservabilitySummary,
} from "./types";

export const getChatAuditLog = (limit = 100) =>
  api.get<ChatAuditLogDto[]>("/admin/chat-audit", { params: { limit } }).then((r) => r.data);

export const getObservabilitySummary = () =>
  api.get<ObservabilitySummary>("/admin/observability/summary").then((r) => r.data);

export const getObservabilityCost = () =>
  api.get<ObservabilityCost>("/admin/observability/cost").then((r) => r.data);

export const getObservabilityEvents = (type?: string, limit = 100) =>
  api
    .get<AppEventDto[]>("/admin/observability/events", { params: { type, limit } })
    .then((r) => r.data);

export const getObservabilityHealth = () =>
  api.get<ObservabilityHealth>("/admin/observability/health").then((r) => r.data);
