import api from "./client";

export type FeatureKey =
  | "AI_ANALYTICS"
  | "NL_CHATBOT"
  | "EXPORT_CSV"
  | "EXPORT_PDF"
  | "BUDGET_FORECASTING"
  | "TREND_ANALYSIS"
  | "CUSTOM_CATEGORIES"
  | "UNLIMITED_TRANSACTIONS"
  | "ADVANCED_INSIGHTS"
  | "ANOMALY_DETECTION";

export type PlanKey = "FREE" | "PREMIUM" | "TRIAL";

export type SubscriptionStatus = "ACTIVE" | "TRIAL" | "INACTIVE" | "EXPIRED" | "CANCELLED";

export interface Entitlements {
  plan: PlanKey;
  status: SubscriptionStatus;
  features: FeatureKey[];
}

export const getEntitlements = () =>
  api.get<Entitlements>("/user/entitlements").then((r) => r.data);
