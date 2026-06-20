export const EXPENSE_LOG_KEYWORDS = [
  "spent", "bought", "paid", "purchased", "ordered", "charged",
  "nagbayad", "binayad", "nagastos", "bumili", "nagbili",
  "nagkain", "nagorder", "nag-order", "nag-bayad", "nakabili",
];

export const QUERY_PHRASES = [
  "how much", "total", "show", "list", "what", "when", "which",
  "where", "did i", "have i", "how many", "magkano",
];

export const REPORT_PHRASES = [
  "by category", "by month", "summary", "breakdown", "spending",
  "expenses this", "expenses last", "expenses in", "expenses by",
];

export const CRUD_WORD_KEYWORDS = [
  "budget", "goal", "recurring",
  "delete", "remove", "update", "edit", "modify",
  "rename", "category", "categories",
  "subscription", "plan", "profile",
  "nickname", "avatar",
  "alert", "alerts", "bills",
];

export const CRUD_PHRASE_KEYWORDS = [
  "create a", "add a", "set a", "make a", "set up",
  "list my", "show my categories", "list categories",
  "what plan", "my plan", "my subscription",
  "show my goals", "show my budgets", "show my recurring", "show my alerts", "show my bills",
  "list goals", "list budgets", "list recurring", "list alerts", "list bills",
  "my goals", "my budgets", "my recurring", "my alerts",
  "upcoming bills", "upcoming payments",
  "monthly report", "spending report",
  "search expenses", "find expenses", "search for expenses",
  "get category totals", "category totals",
];

export function looksLikeNlQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (CRUD_WORD_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`).test(lower))) return false;
  if (CRUD_PHRASE_KEYWORDS.some((k) => lower.includes(k))) return false;
  if (text.includes("?")) return true;
  if (QUERY_PHRASES.some((q) => lower.includes(q))) return true;
  if (REPORT_PHRASES.some((q) => lower.includes(q))) return true;
  if (/\b(this month|last month|this week|last week)\b/.test(lower) && !/\d/.test(text)) return true;
  return false;
}

export function looksLikeExpenseLog(text: string): boolean {
  const lower = text.toLowerCase();
  if (CRUD_WORD_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`).test(lower))) return false;
  if (CRUD_PHRASE_KEYWORDS.some((k) => lower.includes(k))) return false;
  if (text.includes("?")) return false;
  if (QUERY_PHRASES.some((q) => lower.includes(q))) return false;
  if (!/\d/.test(text)) return false;
  if (EXPENSE_LOG_KEYWORDS.some((k) => lower.includes(k))) return true;
  if (/(pesos?|php|₱)/i.test(text)) return true;
  return true;
}
