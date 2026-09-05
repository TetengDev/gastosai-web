import api from "./client";
import type { components } from "./generated/schema";
// `Complete` marks the fields the API always sends; `Nullable` the ones it
// sends as `null` — here an unparseable amount, and a first month with no
// previous month to compare against.
import type {
  AssertContractUnionCovered,
  Complete,
  CoversContractUnion,
  Nullable,
} from "./typeHelpers";

type Schemas = components["schemas"];

/**
 * The contract types `expenseType` as a bare string on both the request and
 * the response — the backend's enum is not expressed in the spec, so this is
 * the one field the generated types cannot narrow on their own. The values
 * still come from the contract's own string type; only the domain is added.
 */
export type ExpenseType = "PERSONAL" | "BUSINESS";

/**
 * The narrowing above is silent on its own: were the contract to publish the
 * real enum with a third member, `Extract<string, …> & ExpenseType` would keep
 * compiling and drop it. These two make that a build failure that names the
 * missing member. They are exported because `noUnusedLocals` is on, and they
 * are the proof the guard is wired — not decoration.
 */
export type ExpenseResponseTypeCovered = AssertContractUnionCovered<
  CoversContractUnion<Schemas["ExpenseResponseV2"]["expenseType"], ExpenseType>
>;
export type ExpenseRequestTypeCovered = AssertContractUnionCovered<
  CoversContractUnion<Schemas["ExpenseRequestV2"]["expenseType"], ExpenseType>
>;

export type Expense = Omit<Complete<Schemas["ExpenseResponseV2"]>, "expenseType"> & {
  expenseType: Extract<Schemas["ExpenseResponseV2"]["expenseType"], string> & ExpenseType;
};

export type ExpenseRequest = Omit<Schemas["ExpenseRequestV2"], "expenseType"> & {
  expenseType?: Extract<Schemas["ExpenseRequestV2"]["expenseType"], string> & ExpenseType;
};

/** `Complete` is shallow, so the page's element type is narrowed explicitly. */
export type ExpensePage = Omit<Complete<Schemas["PageResponseExpenseResponseV2"]>, "content"> & {
  content: Expense[];
};
/**
 * `limitReached` names the plan entitlement that stopped some rows, and arrives as `null` on
 * every import that hit no limit — which is nearly all of them. So it is neither `Complete` (the
 * contract 3.0.0 regen made it a required `string`, which promises a message that is usually not
 * there) nor plain `Nullable`, which would force the page's local error-path result to carry an
 * explicit `null`. Optional-and-nullable covers both the wire shape and a locally built one; the
 * counts and the error list are genuinely always sent.
 */
export type ImportResult = Omit<Complete<Schemas["ImportResult"]>, "limitReached"> & {
  limitReached?: string | null;
};
export type ParsedExpenseResult = Nullable<
  Schemas["ParsedExpenseResultV2"],
  "amount" | "category" | "date" | "description" | "hint" | "rejectionMessage"
>;
export type MonthlyReport = Complete<Schemas["MonthlyReportItemV2"]>;
export type MonthlyComparison = Nullable<Schemas["MonthlyComparisonResponseV2"], "changePercent">;
export type CategoryReport = Complete<Schemas["CategoryReportItemV2"]>;
export type DailyReport = Complete<Schemas["DailyReportItemV2"]>;

export const getExpenses = (params?: { from?: string; to?: string }) =>
  api.get<Expense[]>("/expenses", { params }).then((r) => r.data);

export const getExpensesPage = (params: { page: number; size: number; from?: string; to?: string }) =>
  api.get<ExpensePage>("/expenses/page", { params }).then((r) => r.data);

export const createExpense = (data: ExpenseRequest) =>
  api.post<Expense>("/expenses", data).then((r) => r.data);

export const updateExpense = (id: number, data: ExpenseRequest) =>
  api.put<Expense>(`/expenses/${id}`, data).then((r) => r.data);

export const deleteExpense = (id: number) =>
  api.delete(`/expenses/${id}`);

export const deleteAllExpenses = () =>
  api.delete("/expenses");

export const importExpensesCsv = (file: File, strict = false) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post<ImportResult>("/expenses/import", form, {
      params: strict ? { strict: true } : {},
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const downloadImportTemplate = async (): Promise<void> => {
  const res = await api.get<Blob>("/expenses/import/template", { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gastosai-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
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
