import api from "./client";

export interface Alert {
  id: number;
  type: "BUDGET_WARNING" | "BUDGET_EXCEEDED" | "SPENDING_SPIKE";
  severity: "INFO" | "WARNING" | "CRITICAL";
  month: string;
  categoryName: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
}

export const getAlerts = (month: string) =>
  api.get<Alert[]>(`/alerts?month=${month}`).then((r: { data: Alert[] }) => r.data);

export const markAlertRead = (id: number) =>
  api.patch<Alert>(`/alerts/${id}/read`).then((r: { data: Alert }) => r.data);

export const dismissAlert = (id: number) =>
  api.patch<Alert>(`/alerts/${id}/dismiss`).then((r: { data: Alert }) => r.data);

export const deleteAlert = (id: number) => api.delete(`/alerts/${id}`);
