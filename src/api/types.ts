export type ExpenseType = "PERSONAL" | "BUSINESS";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface Expense {
  id: number;
  amount: number;
  currency: string;
  exchangeRate: number;
  amountInBaseCurrency: number;
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
  currency?: string;
  exchangeRate?: number;
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
  currency?: string;
  exchangeRate?: number;
}

export interface BudgetResponse {
  id: number;
  categoryId: number;
  categoryName: string;
  month: string;
  amountLimit: number;
  currency: string;
  exchangeRate: number;
  amountLimitInBaseCurrency: number;
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
  currency?: string;
  exchangeRate?: number;
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
  currency: string;
  exchangeRate: number;
}

export interface UpcomingBillResponse {
  id: number;
  name: string;
  amount: number;
  categoryName: string;
  frequency: RecurringFrequency;
  dueDate: string;
  currency: string;
}

export interface DailyReport {
  date: string;
  total: number;
}

export interface ChatPreviewData {
  toolName: string;
  params: Record<string, unknown>;
}

export interface ChatResponse {
  type: "action" | "text" | "query" | "preview" | "disambiguate";
  message: string;
  result: unknown;
  conversationId?: number;
}

export interface Conversation {
  id: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDto {
  id: number;
  role: "USER" | "ASSISTANT";
  content: string | null;
  toolName: string | null;
  responseType: string | null;
  createdAt: string;
}

export interface ChatAuditLogDto {
  id: number;
  userId: number;
  conversationId: number | null;
  toolName: string;
  status: "SUCCESS" | "FAILED";
  detail: string | null;
  createdAt: string;
}

export interface GoalChatItem {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  progressPercent: number;
  status: "ON_TRACK" | "BEHIND" | "COMPLETED" | "PAUSED";
  targetDate?: string;
}

export interface BudgetChatItem {
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: "ON_TRACK" | "WARNING" | "OVER_BUDGET";
}

export interface BudgetSummaryChatResult {
  month: string;
  totalBudgeted: number;
  totalSpent: number;
  safeToSpend: number;
  items: BudgetChatItem[];
}

export interface RecurringChatItem {
  id: number;
  name: string;
  amount: number;
  categoryName: string;
  frequency: RecurringFrequency;
  active: boolean;
}

export interface UpcomingBillChatItem {
  name: string;
  amount: number;
  dueDate: string;
}

export interface RecurringChatResult {
  items: RecurringChatItem[];
  upcoming: UpcomingBillChatItem[];
}

export interface AlertChatItem {
  id: number;
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  message: string;
  read: boolean;
}

export interface ExpenseChatItem {
  id: number;
  amount: number;
  category: string;
  date: string;
  description: string;
}

export interface CategoryTotalChatItem {
  category: string;
  total: number;
}

export interface MonthlyReportChatResult {
  month: string;
  totalSpent: number;
  categoryBreakdown: CategoryTotalChatItem[];
  topExpenses: ExpenseChatItem[];
}
