import api from "./client";
import type { ChatAuditLogDto } from "./types";

export const getChatAuditLog = (limit = 100) =>
  api.get<ChatAuditLogDto[]>("/admin/chat-audit", { params: { limit } }).then((r) => r.data);
