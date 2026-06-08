export interface Expense {
  id: number;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface ExpenseRequest {
  amount: number;
  category: string;
  date?: string;
  note?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface MonthlyReport {
  month: string;
  total: number;
}

export interface CategoryReport {
  category: string;
  total: number;
}