import api from "./client";
import type { Bucket, BudgetRule, BudgetRuleSummary, BudgetRuleType } from "./types";

export interface BudgetRulePayload {
  ruleType: BudgetRuleType;
  monthlyIncome: number;
  needsPct?: number;
  wantsPct?: number;
  savingsPct?: number;
}

export const getBudgetRule = () =>
  api.get<BudgetRule>("/budget-rules").then((r) => r.data);

export const putBudgetRule = (payload: BudgetRulePayload) =>
  api.put<BudgetRule>("/budget-rules", payload).then((r) => r.data);

export const setBudgetRuleEnabled = (enabled: boolean) =>
  api.put<BudgetRule>("/budget-rules/enabled", { enabled }).then((r) => r.data);

export const assignBuckets = (assignments: { categoryId: number; bucket: Bucket | null }[]) =>
  api.put("/budget-rules/buckets", { assignments }).then((r) => r.data);

export const getBudgetRuleSummary = (month: string) =>
  api.get<BudgetRuleSummary>("/budget-rules/summary", { params: { month } }).then((r) => r.data);
