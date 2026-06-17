export interface Tip {
  id: string;
  text: string;
}

/** Rotating "did you know" tips surfaced via the navbar tips popover. */
export const TIPS: Tip[] = [
  { id: "byo-key", text: "Add your own OpenAI key in Settings to unlock AI insights, chat, and receipt scanning." },
  { id: "chat-log", text: "You can log an expense straight from the chat — try “spent 250 on lunch at Jollibee”." },
  { id: "chat-tones", text: "The chat assistant has tones: Plain, Pro, and Gen Z. Switch them in the chat header." },
  { id: "multi-delete", text: "Tick the checkboxes on Expenses, Budgets, Recurring, Goals, or Categories to delete several at once." },
  { id: "csv-import", text: "Import a bank/statement CSV on the Expenses page — use Strict mode to reject a file if any row is invalid." },
  { id: "recurring", text: "Set up Recurring Bills so monthly/weekly costs show up as upcoming bills on your dashboard." },
  { id: "goals", text: "Track savings targets under Goals — the dashboard shows your progress and status." },
  { id: "budgets", text: "Set per-category budgets to get a safe-to-spend figure and spending alerts." },
  { id: "fx", text: "Logging a foreign-currency expense? Pick the currency and we’ll convert it to ₱ with a suggested rate." },
  { id: "dark-mode", text: "Toggle light/dark mode with the sun/moon icon in the navbar." },
  { id: "replay-tour", text: "Want the walkthrough again? Replay the product tour from Settings." },
];

const KEY = "gastosai:tips:dismissed";

export function getDismissedTips(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function dismissTip(id: string): void {
  const next = new Set(getDismissedTips());
  next.add(id);
  localStorage.setItem(KEY, JSON.stringify([...next]));
}

export function resetTips(): void {
  localStorage.removeItem(KEY);
}
