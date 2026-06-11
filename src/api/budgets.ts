import api from "./client";
import type { BudgetRequest, BudgetResponse, BudgetSummaryResponse } from "./types";

export const getBudgets = (month: string): Promise<BudgetResponse[]> =>
  api.get<BudgetResponse[]>("/budgets", { params: { month } }).then((r) => r.data);

export const createBudget = (data: BudgetRequest): Promise<BudgetResponse> =>
  api.post<BudgetResponse>("/budgets", data).then((r) => r.data);

export const updateBudget = (id: number, data: BudgetRequest): Promise<BudgetResponse> =>
  api.put<BudgetResponse>(`/budgets/${id}`, data).then((r) => r.data);

export const deleteBudget = (id: number): Promise<void> =>
  api.delete(`/budgets/${id}`).then(() => undefined);

export const getBudgetSummary = (month: string): Promise<BudgetSummaryResponse> =>
  api.get<BudgetSummaryResponse>("/budgets/summary", { params: { month } }).then((r) => r.data);

export const deleteAllBudgets = (month: string): Promise<void> =>
  api.delete("/budgets", { params: { month } }).then(() => undefined);
