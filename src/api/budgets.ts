import api from "./client";
import type { components } from "./generated/schema";
// springdoc marks every response property optional, which is wrong for a
// budget — the API sends all of them. `Complete` puts that back.
import type { Complete } from "./typeHelpers";

type Schemas = components["schemas"];

/**
 * The contract types a summary item's `status` as a bare string — the backend's
 * enum is not expressed in the spec, so this is the one field the generated
 * types cannot narrow on their own. The values still come from the contract's
 * own string type; only the domain is added.
 */
export type BudgetStatus = "ON_TRACK" | "WARNING" | "OVER_BUDGET";

export type BudgetRequest = Schemas["BudgetRequestV2"];
export type BudgetResponse = Complete<Schemas["BudgetResponseV2"]>;

export type BudgetSummaryItem = Omit<Complete<Schemas["BudgetSummaryItemV2"]>, "status"> & {
  status: Extract<Schemas["BudgetSummaryItemV2"]["status"], string> & BudgetStatus;
};

/** `Complete` is shallow, so the item type is narrowed explicitly. */
export type BudgetSummaryResponse = Omit<Complete<Schemas["BudgetSummaryResponseV2"]>, "items"> & {
  items: BudgetSummaryItem[];
};

export const getBudgets = (month: string): Promise<BudgetResponse[]> =>
  api.get<BudgetResponse[]>("/budgets", { params: { month } }).then((r) => r.data);

export const createBudget = (data: BudgetRequest, force = false): Promise<BudgetResponse> =>
  api.post<BudgetResponse>("/budgets", data, { params: force ? { force: true } : {} }).then((r) => r.data);

export const updateBudget = (id: number, data: BudgetRequest): Promise<BudgetResponse> =>
  api.put<BudgetResponse>(`/budgets/${id}`, data).then((r) => r.data);

export const deleteBudget = (id: number): Promise<void> =>
  api.delete(`/budgets/${id}`).then(() => undefined);

export const getBudgetSummary = (month: string): Promise<BudgetSummaryResponse> =>
  api.get<BudgetSummaryResponse>("/budgets/summary", { params: { month } }).then((r) => r.data);

export const deleteAllBudgets = (month: string): Promise<void> =>
  api.delete("/budgets", { params: { month } }).then(() => undefined);
