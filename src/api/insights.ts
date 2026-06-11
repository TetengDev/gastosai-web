import api from "./client";
import type { TopCategoryInsight, MonthSummaryInsight, RecommendationsInsight } from "./types";

export const getTopCategoryInsight = (month: string) =>
  api.get<TopCategoryInsight>("/ai/insights/top-category", { params: { month } }).then((r) => r.data);

export const getMonthSummaryInsight = (month: string) =>
  api.get<MonthSummaryInsight>("/ai/insights/month-summary", { params: { month } }).then((r) => r.data);

export const getRecommendationsInsight = (month: string) =>
  api.get<RecommendationsInsight>("/ai/insights/recommendations", { params: { month } }).then((r) => r.data);