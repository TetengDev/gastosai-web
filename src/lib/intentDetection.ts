export const EXPENSE_LOG_KEYWORDS = [
  "spent", "bought", "paid", "purchased", "ordered", "charged",
  "nagbayad", "binayad", "nagastos", "bumili", "nagbili",
  "nagkain", "nagorder", "nag-order", "nag-bayad", "nakabili",
];

export const QUERY_PHRASES = [
  "how much", "total", "show", "list", "what", "when", "which",
  "where", "did i", "have i", "how many", "magkano",
];

export function looksLikeExpenseLog(text: string): boolean {
  const lower = text.toLowerCase();
  if (EXPENSE_LOG_KEYWORDS.some((k) => lower.includes(k))) return true;
  if (/(pesos?|php|₱)/i.test(text)) return true;
  if (!/\d/.test(text)) return false;
  if (text.includes("?")) return false;
  if (QUERY_PHRASES.some((q) => lower.includes(q))) return false;
  return true;
}
