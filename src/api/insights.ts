import api from "./client";
import type { components } from "./generated/schema";
// springdoc marks every response property optional, which is wrong for an
// insight — the API sends all of them, or fails the request. `Complete` puts
// that back.
import type { Complete } from "./typeHelpers";

type Schemas = components["schemas"];

export type TopCategoryInsight = Complete<Schemas["TopCategoryInsightResponseV2"]>;
export type MonthSummaryInsight = Complete<Schemas["MonthSummaryInsightResponse"]>;
export type RecommendationsInsight = Complete<Schemas["RecommendationsInsightResponse"]>;

export const getTopCategoryInsight = (month: string): Promise<TopCategoryInsight> =>
  api.get<TopCategoryInsight>("/ai/insights/top-category", { params: { month } }).then((r) => r.data);

export const getMonthSummaryInsight = (month: string): Promise<MonthSummaryInsight> =>
  api.get<MonthSummaryInsight>("/ai/insights/month-summary", { params: { month } }).then((r) => r.data);

export const getRecommendationsInsight = (month: string): Promise<RecommendationsInsight> =>
  api.get<RecommendationsInsight>("/ai/insights/recommendations", { params: { month } }).then((r) => r.data);
