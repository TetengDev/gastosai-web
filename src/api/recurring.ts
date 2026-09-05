import api from "./client";
import type { components } from "./generated/schema";
// `Nullable` marks the schedule fields the API sends as `null` on top of the
// ones it always sends (a weekly bill has no day of the month, a monthly one
// has no month of the year).
import type { Complete, Nullable } from "./typeHelpers";

type Schemas = components["schemas"];

/** The same nullability, on the request side: the fields stay optional. */
type NullableOptional<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P] | null;
};

export type RecurringFrequency = Schemas["RecurringExpenseRequestV2"]["frequency"];

/**
 * Clearing a schedule field is how the form switches frequency, so the three
 * of them accept `null` as well as being omitted.
 */
export type RecurringExpenseRequest = NullableOptional<
  Schemas["RecurringExpenseRequestV2"],
  "dayOfMonth" | "dayOfWeek" | "monthOfYear"
>;

export type RecurringExpenseResponse = Nullable<
  Schemas["RecurringExpenseResponseV2"],
  "dayOfMonth" | "dayOfWeek" | "monthOfYear"
>;

/**
 * `/recurring/upcoming` used to be the one endpoint in this module the contract did not
 * describe — springdoc emitted a bare `object` for its 200 body, so the shape was stated
 * here by hand. The v2 contract publishes `UpcomingBillResponseV2`, so it is derived now.
 */
export type UpcomingBillResponse = Complete<Schemas["UpcomingBillResponseV2"]>;

export const getRecurring = (): Promise<RecurringExpenseResponse[]> =>
  api.get<RecurringExpenseResponse[]>("/recurring").then((r) => r.data);

export const createRecurring = (
  data: RecurringExpenseRequest,
  force = false,
): Promise<RecurringExpenseResponse> =>
  api.post<RecurringExpenseResponse>("/recurring", data, { params: force ? { force: true } : {} }).then((r) => r.data);

export const updateRecurring = (id: number, data: RecurringExpenseRequest): Promise<RecurringExpenseResponse> =>
  api.put<RecurringExpenseResponse>(`/recurring/${id}`, data).then((r) => r.data);

export const deleteRecurring = (id: number) =>
  api.delete(`/recurring/${id}`);

export const getUpcomingBills = (month: string): Promise<UpcomingBillResponse[]> =>
  api.get<UpcomingBillResponse[]>("/recurring/upcoming", { params: { month } }).then((r) => r.data);

export const deleteAllRecurring = (): Promise<void> =>
  api.delete("/recurring").then(() => undefined);
