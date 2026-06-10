export interface Expense {
  id: number;
  amount: number;
  category: string;
  date: string;
  description: string;
}

export interface ExpenseRequest {
  amount: number;
  category?: string;
  date?: string;
  description: string;
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
  amount: number;
  category: string;
  date: string;
  description: string;
  confidence: string;
  saveable: boolean;
  hint: string | null;
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
