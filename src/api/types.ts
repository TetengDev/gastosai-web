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
