import api from "./client";
import type { components } from "./generated/schema";
// springdoc marks every response property optional, which is wrong for a goal — the API
// sends all of them. `Complete` puts that back; `Nullable` covers the one field the API
// really does send as `null`, a goal with no deadline.
import type { Nullable } from "./typeHelpers";

type Schemas = components["schemas"];

/**
 * `savedAmount` and `targetAmount` are integer centavos on `/api/v2`, so nothing here is a
 * peso amount. `progressPercent` is not money — it stays a decimal fraction.
 */
export type Goal = Nullable<Schemas["GoalResponseV2"], "targetDate">;

/**
 * Clearing the deadline is how the form removes a target date, so `targetDate` accepts
 * `null` as well as being omitted — the contract only expresses the omitted case.
 */
export type GoalRequest = Omit<Schemas["GoalRequestV2"], "targetDate"> & {
  targetDate?: string | null;
};

export const getGoals = () => api.get<Goal[]>("/goals").then((r) => r.data);

export const createGoal = (data: GoalRequest, force = false) =>
  api.post<Goal>("/goals", data, { params: force ? { force: true } : {} }).then((r) => r.data);

export const updateGoal = (id: number, data: GoalRequest) =>
  api.put<Goal>(`/goals/${id}`, data).then((r) => r.data);

export const deleteGoal = (id: number) => api.delete(`/goals/${id}`);
