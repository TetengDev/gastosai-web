import { useEffect, useId, useState } from "react";
import { getCategories } from "../api/categories";
import type { Category } from "../api/categories";
import { getBudgetSummary } from "../api/budgets";
import { getExpensesPage } from "../api/expenses";
import type { Expense, ExpenseRequest, ExpenseType } from "../api/expenses";
import {
  APP_TIME_ZONE,
  centavosToAmount,
  currencySymbol,
  formatCentavos,
  formatCurrencyAmount,
  manilaDate,
  manilaMonth,
  parseAmountToCentavos,
  toDateTimeLocal,
} from "../lib/formatters";
import { CAT_TTL_MS, RATE_TTL_MS, getCategoryCache, rateCache, setCategoryCache } from "../lib/cache";
import CurrencySelect from "./CurrencySelect";
import { Button, Modal } from "./ui";
import { useAuth } from "../context/AuthContext";

const CHIP_COUNT = 6;
/** How long the confirmation waits for the post-save budget summary before stating the amount alone. */
const SUMMARY_WAIT_MS = 1500;
const TOAST_MS = 4000;

/**
 * `yyyy-mm-ddTHH:mm` for Manila's now: the value a `datetime-local` input takes, as wall-clock
 * time in the app's zone. `toISOString()` is UTC and pre-filled yesterday until 08:00 Manila.
 * `h23`, not `hour12: false`, which renders midnight as `24:00`.
 */
function manilaNow(now = new Date()): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return `${manilaDate(now)}T${time}`;
}

/**
 * R19's line. `remaining` is the server's figure for the category's budget line in the expense's
 * month, read after the save; nothing here is derived from budgeted or spent.
 */
async function loggedLine(req: ExpenseRequest): Promise<string> {
  const logged = `Logged ${formatCurrencyAmount(req.amount, req.currency ?? "PHP")}`;
  const month = req.date ? req.date.slice(0, 7) : manilaMonth();
  const summary = await Promise.race([
    getBudgetSummary(month),
    new Promise<null>((resolve) => setTimeout(resolve, SUMMARY_WAIT_MS, null)),
  ]).catch(() => null);
  const remaining = summary?.items.find((i) => i.categoryName === req.category)?.remaining;
  if (remaining == null) return logged;
  return remaining >= 0
    ? `${logged} · ${formatCentavos(remaining)} left in ${req.category}`
    : `${logged} · Over by ${formatCentavos(-remaining)} in ${req.category}`;
}

/**
 * ponytail: a one-off imperative toast, not a primitive (R17). Both hosts unmount the modal the
 * moment `onSave` resolves, so it lives on <body>. Move it to components/ui/ when a second caller
 * appears. The live region goes in empty and is filled a tick later, so screen readers announce it.
 */
function showToast(text: string) {
  document.querySelectorAll("[data-expense-toast]").forEach((n) => n.remove());
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.dataset.expenseToast = "";
  el.className =
    "fixed bottom-6 left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-cta px-5 py-3 text-center text-sm font-medium text-cta-fg shadow-lg";
  document.body.appendChild(el);
  setTimeout(() => { el.textContent = text; }, 0);
  setTimeout(() => el.remove(), TOAST_MS);
}

interface Props {
  expense?: Expense;
  onSave: (data: ExpenseRequest) => Promise<void>;
  onClose: () => void;
}

export default function ExpenseModal({ expense, onSave, onClose }: Props) {
  const { user } = useAuth();
  const ids = useId();
  const [form, setForm] = useState<ExpenseRequest>({
    amount: expense?.amount ?? (0 as unknown as number),
    category: expense?.category ?? user?.defaultCategory ?? "Uncategorized",
    date: expense?.date ? toDateTimeLocal(expense.date) : manilaNow(),
    description: expense?.description ?? "",
    expenseType: expense?.expenseType ?? "PERSONAL",
    reimbursable: expense?.reimbursable ?? false,
    currency: expense?.currency ?? "PHP",
    exchangeRate: expense?.exchangeRate ?? 1,
  });
  // The amount field holds the text as typed. `form.amount` is integer centavos and is only
  // written at submit, so no keystroke ever passes through a float on its way to the API.
  const [amountText, setAmountText] = useState(
    expense ? centavosToAmount(expense.amount) : ""
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateFetching, setRateFetching] = useState(false);
  const [suggestedRate, setSuggestedRate] = useState<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    const cached = getCategoryCache();
    if (cached && now - cached.ts < CAT_TTL_MS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategories(cached.data);
      return;
    }
    getCategories().then((data) => {
      setCategoryCache(data);
      setCategories(data);
    }).catch(() => {});
  }, []);

  // The Navbar mounts this modal with no list in hand, so it reads its own recent history.
  useEffect(() => {
    getExpensesPage({ page: 0, size: 50 })
      .then((page) => setRecent(page.content.map((e) => e.category)))
      .catch(() => {});
  }, []);

  /**
   * The six most recently used categories (R20): the first distinct ones met walking the history
   * newest first, topped up from the category list in its own order when history is short.
   */
  const chips = [...new Set([...recent, ...categories.map((c) => c.name)])]
    .filter((n): n is string => !!n)
    .slice(0, CHIP_COUNT);

  useEffect(() => {
    const currency = form.currency ?? "PHP";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currency === "PHP") { setSuggestedRate(null); return; }
    const now = Date.now();
    const cached = rateCache[currency];
    if (cached && now - cached.ts < RATE_TTL_MS) {
      setSuggestedRate(cached.rate);
      setForm((f) => ({ ...f, exchangeRate: cached.rate }));
      return;
    }
    setRateFetching(true);
    fetch(`https://open.er-api.com/v6/latest/${currency}`)
      .then((r) => r.json())
      .then((data: { rates?: Record<string, number> }) => {
        const raw = data.rates?.["PHP"];
        if (raw) {
          const rate = parseFloat(raw.toFixed(4));
          rateCache[currency] = { rate, ts: Date.now() };
          setSuggestedRate(rate);
          setForm((f) => ({ ...f, exchangeRate: rate }));
        }
      })
      .catch(() => {})
      .finally(() => setRateFetching(false));
  }, [form.currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmountToCentavos(amountText);
    // Mobile's copy, word for word. A third decimal never gets here: `step` refuses it first.
    if (amount === null || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const req = { ...form, amount };
      await onSave(req);
      // The host has closed the modal by now; the line is built and shown without it.
      if (!expense) void loggedLine(req).then(showToast);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save. Check your input.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-edge-input bg-input px-4 py-2.5 text-sm text-ink";
  const labelClass = "block text-sm font-medium text-ink mb-1.5";

  return (
    <Modal open onClose={onClose} title={expense ? "Edit Expense" : "New Expense"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${ids}-amount`} className={labelClass}>Amount</label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute left-4 top-1/2 -translate-y-1/2 select-none font-display text-2xl text-ink-2"
              >
                {currencySymbol(form.currency ?? "PHP")}
              </span>
              <input
                id={`${ids}-amount`}
                aria-label={
                  form.currency === "PHP" ? "Amount in pesos" : `Amount (${currencySymbol(form.currency ?? "PHP")})`
                }
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                autoFocus={!expense}
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                className="w-full rounded-2xl border border-edge-input bg-input py-3 pl-14 pr-4 font-display text-4xl font-medium tabular-nums text-ink-hi"
                placeholder="0.00"
              />
            </div>
          </div>
          {chips.length > 0 && (
            <div role="group" aria-label="Recent categories" className="flex flex-wrap gap-2">
              {chips.map((name) => {
                const on = form.category === name;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setForm((f) => ({ ...f, category: name }))}
                    className={`min-h-10 cursor-pointer rounded-full border px-3.5 text-sm transition-colors ${
                      on
                        ? "border-cta bg-cta text-cta-fg"
                        : "border-edge-input bg-surface text-ink hover:bg-surface-2"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
          <div>
            <label htmlFor={`${ids}-category`} className={labelClass}>Category</label>
            <select
              id={`${ids}-category`}
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className={inputClass}
            >
              {/* A chip or a default can name a category the list does not hold. */}
              {!categories.some((c) => c.name === form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${ids}-description`} className={labelClass}>Description</label>
            <input
              id={`${ids}-description`}
              type="text"
              required
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Lunch at Jollibee"
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${ids}-date`} className={labelClass}>Date & Time</label>
              <input
                id={`${ids}-date`}
                type="datetime-local"
                value={form.date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <span id={`${ids}-currency`} className={labelClass}>Currency</span>
              {/* CurrencySelect takes no id, so the label names the group that holds its button. */}
              <div role="group" aria-labelledby={`${ids}-currency`}>
              <CurrencySelect
                value={form.currency ?? "PHP"}
                onChange={(c) => {
                  setSuggestedRate(null);
                  setForm((f) => ({ ...f, currency: c, exchangeRate: c === "PHP" ? 1 : f.exchangeRate }));
                }}
              />
              </div>
            </div>
          </div>
          {form.currency !== "PHP" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={`${ids}-rate`} className="text-sm font-medium text-ink">
                  Exchange Rate (1 {form.currency} = ? PHP)
                </label>
                {rateFetching && <span className="text-xs text-ink-2">Fetching rate…</span>}
                {!rateFetching && suggestedRate !== null && (
                  <span className="text-xs text-deep">Suggested: {suggestedRate.toFixed(4)}</span>
                )}
              </div>
              <input
                id={`${ids}-rate`}
                type="number"
                step="0.0001"
                min="0.0001"
                value={form.exchangeRate}
                onChange={(e) => setForm((f) => ({ ...f, exchangeRate: parseFloat(e.target.value) || 1 }))}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-warn-ink">
                Rate is suggested and may not reflect real-time market prices. Adjust if needed.
              </p>
            </div>
          )}
          <div className="grid items-end gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${ids}-type`} className={labelClass}>Type</label>
              <select
                id={`${ids}-type`}
                value={form.expenseType ?? "PERSONAL"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expenseType: e.target.value as ExpenseType }))
                }
                className={inputClass}
              >
                <option value="PERSONAL">Personal</option>
                <option value="BUSINESS">Business</option>
              </select>
            </div>
            <div className="flex min-h-11 items-center gap-3">
              <input
                id={`${ids}-reimbursable`}
                type="checkbox"
                checked={form.reimbursable ?? false}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reimbursable: e.target.checked }))
                }
                className="h-4 w-4 cursor-pointer rounded accent-brand"
              />
              <label
                htmlFor={`${ids}-reimbursable`}
                className="cursor-pointer select-none text-sm font-medium text-ink"
              >
                Reimbursable
              </label>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
    </Modal>
  );
}
