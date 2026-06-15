import api from "./client";
import type { RecurringExpenseRequest, RecurringExpenseResponse, UpcomingBillResponse } from "./types";

export const getRecurring = () =>
  api.get<RecurringExpenseResponse[]>("/recurring").then((r) => r.data);

export const createRecurring = (data: RecurringExpenseRequest, force = false) =>
  api.post<RecurringExpenseResponse>("/recurring", data, { params: force ? { force: true } : {} }).then((r) => r.data);

export const updateRecurring = (id: number, data: RecurringExpenseRequest) =>
  api.put<RecurringExpenseResponse>(`/recurring/${id}`, data).then((r) => r.data);

export const deleteRecurring = (id: number) =>
  api.delete(`/recurring/${id}`);

export const getUpcomingBills = (month: string) =>
  api.get<UpcomingBillResponse[]>("/recurring/upcoming", { params: { month } }).then((r) => r.data);

export const deleteAllRecurring = (): Promise<void> =>
  api.delete("/recurring").then(() => undefined);
