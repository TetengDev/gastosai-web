import api from "./client";
import type { CategoryReport, DailyReport, Expense, ExpenseRequest, MonthlyComparison, MonthlyReport, ParsedExpenseResult } from "./types";

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const getExpenses = (params?: { from?: string; to?: string }) =>
  api.get<Expense[]>("/expenses", { params }).then((r) => r.data);

export const createExpense = (data: ExpenseRequest) =>
  api.post<Expense>("/expenses", data).then((r) => r.data);

export const updateExpense = (id: number, data: ExpenseRequest) =>
  api.put<Expense>(`/expenses/${id}`, data).then((r) => r.data);

export const deleteExpense = (id: number) =>
  api.delete(`/expenses/${id}`);

export const deleteAllExpenses = () =>
  api.delete("/expenses");

export const importExpensesCsv = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post<ImportResult>("/expenses/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const parseExpense = (text: string) =>
  api.post<ParsedExpenseResult>("/expenses/parse", { text }).then((r) => r.data);

export const getMonthlyReport = () =>
  api.get<MonthlyReport[]>("/expenses/report/monthly").then((r) => r.data);

export const getMonthlyComparison = (month: string) =>
  api.get<MonthlyComparison>("/expenses/report/monthly-comparison", { params: { month } }).then((r) => r.data);

export const getCategoryReport = () =>
  api.get<CategoryReport[]>("/expenses/report/category").then((r) => r.data);

export const getDailyReport = (month: string) =>
  api.get<DailyReport[]>("/expenses/report/daily", { params: { month } }).then((r) => r.data);

export const getTopTransactions = (month: string, limit = 5) =>
  api.get<Expense[]>("/expenses/report/top", { params: { month, limit } }).then((r) => r.data);

export const exportExpenses = async (params?: { from?: string; to?: string }): Promise<void> => {
  const res = await api.get<Blob>("/expenses/export", { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  a.click();
  URL.revokeObjectURL(url);
};