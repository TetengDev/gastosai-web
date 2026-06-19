import api from "./client";

export interface AiUsage {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  visionUsed: number;
  visionLimit: number;
  managed: boolean;
  resetsAt: string;
}

export const getAiUsage = () =>
  api.get<AiUsage>("/ai/usage").then((r) => r.data);
