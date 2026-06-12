export type ExpenseType = "PERSONAL" | "BUSINESS";

export interface Expense {
  id: number;
  amount: number;
  category: string;
  date: string;
  description: string;
  expenseType: ExpenseType;
  reimbursable: boolean;
}

export interface ExpenseRequest {
  amount: number;
  category?: string;
  date?: string;
  description: string;
  expenseType?: ExpenseType;
  reimbursable?: boolean;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
}

export interface CategoryRequest {
  name: string;
  icon?: string | null;
}

export interface MonthlyReport {
  month: string;
  total: number;
}

export interface CategoryReport {
  category: string;
  total: number;
}

export interface ParsedExpenseResult {
  amount: number | null;
  category: string | null;
  date: string | null;
  description: string | null;
  confidence: string;
  saveable: boolean;
  hint: string | null;
  rejectionMessage: string | null;
}

export interface MonthlyComparison {
  month: string;
  currentTotal: number;
  previousTotal: number;
  changePercent: number | null;
}

export interface BudgetRequest {
  categoryId: number;
  month: string;
  amountLimit: number;
}

export interface BudgetResponse {
  id: number;
  categoryId: number;
  categoryName: string;
  month: string;
  amountLimit: number;
}

export interface BudgetSummaryItem {
  categoryId: number;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: "ON_TRACK" | "WARNING" | "OVER_BUDGET";
}

export interface BudgetSummaryResponse {
  month: string;
  items: BudgetSummaryItem[];
  totalBudgeted: number;
  totalSpent: number;
  safeToSpend: number;
  dailyAllowance: number;
}

export interface TopCategoryInsight {
  month: string;
  category: string;
  total: number;
  percentOfMonthTotal: number;
}

export interface MonthSummaryInsight {
  month: string;
  summary: string;
}

export interface RecommendationsInsight {
  month: string;
  recommendations: string[];
}

export type RecurringFrequency = "MONTHLY" | "WEEKLY" | "YEARLY";

export interface RecurringExpenseRequest {
  name: string;
  amount: number;
  categoryName?: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthOfYear?: number | null;
  active?: boolean;
}

export interface RecurringExpenseResponse {
  id: number;
  name: string;
  amount: number;
  categoryName: string;
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  monthOfYear: number | null;
  active: boolean;
}

export interface UpcomingBillResponse {
  id: number;
  name: string;
  amount: number;
  categoryName: string;
  frequency: RecurringFrequency;
  dueDate: string;
}

export interface DailyReport {
  date: string;
  total: number;
}
