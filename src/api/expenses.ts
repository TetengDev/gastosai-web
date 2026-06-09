import api from "./client";
import type { CategoryReport, Expense, ExpenseRequest, MonthlyReport } from "./types";

export const getExpenses = () =>
  api.get<Expense[]>("/expenses").then((r) => r.data);

export const createExpense = (data: ExpenseRequest) =>
  api.post<Expense>("/expenses", data).then((r) => r.data);

export const updateExpense = (id: number, data: ExpenseRequest) =>
  api.put<Expense>(`/expenses/${id}`, data).then((r) => r.data);

export const deleteExpense = (id: number) =>
  api.delete(`/expenses/${id}`);

export const deleteAllExpenses = () =>
  api.delete("/expenses");

export const getMonthlyReport = () =>
  api.get<MonthlyReport[]>("/expenses/report/monthly").then((r) => r.data);

export const getCategoryReport = () =>
  api.get<CategoryReport[]>("/expenses/report/category").then((r) => r.data);