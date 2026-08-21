import api from "./client";
import type { components } from "./generated/schema";
// springdoc marks every response property optional; the rule endpoints always
// send all of them. `Complete` puts that back.
import type { Complete } from "./typeHelpers";

type Schemas = components["schemas"];

export type Bucket = Extract<Schemas["BucketSummary"]["bucket"], string>;
export type BudgetRuleType = Extract<Schemas["BudgetRuleResponse"]["ruleType"], string>;

export type BudgetRule = Complete<Schemas["BudgetRuleResponse"]>;
export type BudgetRulePayload = Schemas["BudgetRuleRequest"];
export type BucketSummaryItem = Complete<Schemas["BucketSummary"]>;

/** `Complete` is shallow, so the bucket element type is narrowed explicitly. */
export type BudgetRuleSummary = Omit<Complete<Schemas["BudgetRuleSummaryResponse"]>, "buckets"> & {
  buckets: BucketSummaryItem[];
};

/** `bucket: null` unassigns a category; the key still comes from the contract. */
export type BucketAssignment = Omit<Schemas["Item"], "bucket"> & {
  bucket: Schemas["Item"]["bucket"] | null;
};

export const getBudgetRule = () =>
  api.get<BudgetRule>("/budget-rules").then((r) => r.data);

export const putBudgetRule = (payload: BudgetRulePayload) =>
  api.put<BudgetRule>("/budget-rules", payload).then((r) => r.data);

export const setBudgetRuleEnabled = (enabled: boolean) =>
  api.put<BudgetRule>("/budget-rules/enabled", { enabled } satisfies Schemas["BudgetRuleEnabledRequest"]).then((r) => r.data);

export const assignBuckets = (assignments: BucketAssignment[]) =>
  api.put("/budget-rules/buckets", { assignments }).then((r) => r.data);

export const getBudgetRuleSummary = (month: string) =>
  api.get<BudgetRuleSummary>("/budget-rules/summary", { params: { month } }).then((r) => r.data);
