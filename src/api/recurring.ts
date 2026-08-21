import api from "./client";
import type { components } from "./generated/schema";
// `Nullable` marks the schedule fields the API sends as `null` on top of the
// ones it always sends (a weekly bill has no day of the month, a monthly one
// has no month of the year).
import type { Nullable } from "./typeHelpers";

type Schemas = components["schemas"];

/** The same nullability, on the request side: the fields stay optional. */
type NullableOptional<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P] | null;
};

export type RecurringFrequency = Schemas["RecurringExpenseRequest"]["frequency"];

/**
 * Clearing a schedule field is how the form switches frequency, so the three
 * of them accept `null` as well as being omitted.
 */
export type RecurringExpenseRequest = NullableOptional<
  Schemas["RecurringExpenseRequest"],
  "dayOfMonth" | "dayOfWeek" | "monthOfYear"
>;

export type RecurringExpenseResponse = Nullable<
  Schemas["RecurringExpenseResponse"],
  "dayOfMonth" | "dayOfWeek" | "monthOfYear"
>;

/**
 * `/recurring/upcoming` is the one endpoint in this module the contract does not
 * describe: springdoc emits a bare `object` for its 200 body, so there is no
 * `UpcomingBillResponse` schema to derive from. Every field a bill shares with a
 * recurring expense is still taken from the contract; only `dueDate` — computed
 * per occurrence and never persisted — is stated here. Replace this the moment
 * the backend publishes the schema.
 */
export type UpcomingBillResponse = Pick<
  RecurringExpenseResponse,
  "id" | "name" | "amount" | "categoryName" | "frequency" | "currency"
> & {
  dueDate: string;
};

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
