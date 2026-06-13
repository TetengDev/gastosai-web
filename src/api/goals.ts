import api from "./client";

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  progressPercent: number;
  targetDate: string | null;
  status: "ON_TRACK" | "BEHIND" | "COMPLETED" | "PAUSED";
  paused: boolean;
  createdAt: string;
  currency: string;
}

export interface GoalRequest {
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  paused: boolean;
  currency?: string;
}

export const getGoals = () => api.get<Goal[]>("/goals").then((r) => r.data);

export const createGoal = (data: GoalRequest) =>
  api.post<Goal>("/goals", data).then((r) => r.data);

export const updateGoal = (id: number, data: GoalRequest) =>
  api.put<Goal>(`/goals/${id}`, data).then((r) => r.data);

export const deleteGoal = (id: number) => api.delete(`/goals/${id}`);
