import { useEffect, useState } from "react";
import { getCategories } from "../api/categories";
import type { Category, Expense, ExpenseRequest, ExpenseType } from "../api/types";
import { toDateTimeLocal } from "../lib/formatters";
import { CAT_TTL_MS, RATE_TTL_MS, getCategoryCache, rateCache, setCategoryCache } from "../lib/cache";
import CurrencySelect from "./CurrencySelect";

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱", USD: "$", EUR: "€", SGD: "S$", JPY: "¥", GBP: "£", AUD: "A$",
};

interface Props {
  expense?: Expense;
  onSave: (data: ExpenseRequest) => Promise<void>;
  onClose: () => void;
}

export default function ExpenseModal({ expense, onSave, onClose }: Props) {
  const now = new Date().toISOString().slice(0, 16);
  const [form, setForm] = useState<ExpenseRequest>({
    amount: expense?.amount ?? (0 as unknown as number),
    category: expense?.category ?? "Uncategorized",
    date: expense?.date ? toDateTimeLocal(expense.date) : now,
    description: expense?.description ?? "",
    expenseType: expense?.expenseType ?? "PERSONAL",
    reimbursable: expense?.reimbursable ?? false,
    currency: expense?.currency ?? "PHP",
    exchangeRate: expense?.exchangeRate ?? 1,
  });
  const [categories, setCategories] = useState<Category[]>([]);
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
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
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
    "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500";
  const labelClass =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 border border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-5 text-lg">
          {expense ? "Edit Expense" : "New Expense"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Currency</label>
            <CurrencySelect
              value={form.currency ?? "PHP"}
              onChange={(c) => {
                setSuggestedRate(null);
                setForm((f) => ({ ...f, currency: c, exchangeRate: c === "PHP" ? 1 : f.exchangeRate }));
              }}
            />
          </div>
          <div>
            <label className={labelClass}>Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium select-none">
                {CURRENCY_SYMBOLS[form.currency ?? "PHP"] ?? form.currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    amount:
                      parseFloat(e.target.value) || (0 as unknown as number),
                  }))
                }
                className={`${inputClass} pl-10`}
                placeholder="0.00"
              />
            </div>
          </div>
          {form.currency !== "PHP" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Exchange Rate (1 {form.currency} = ? PHP)
                </label>
                {rateFetching && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">Fetching rate…</span>
                )}
                {!rateFetching && suggestedRate !== null && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Suggested: {suggestedRate.toFixed(4)}
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={form.exchangeRate}
                onChange={(e) => setForm((f) => ({ ...f, exchangeRate: parseFloat(e.target.value) || 1 }))}
                className={inputClass}
              />
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                Rate is suggested and may not reflect real-time market prices. Adjust if needed.
              </p>
            </div>
          )}
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className={inputClass}
            >
              {categories.length === 0 && (
                <option value="Uncategorized">Uncategorized</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date & Time</label>
            <input
              type="datetime-local"
              value={form.date ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, date: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What was this expense for?"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
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
          <div className="flex items-center gap-3">
            <input
              id="reimbursable"
              type="checkbox"
              checked={form.reimbursable ?? false}
              onChange={(e) =>
                setForm((f) => ({ ...f, reimbursable: e.target.checked }))
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 cursor-pointer"
            />
            <label
              htmlFor="reimbursable"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
            >
              Reimbursable
            </label>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 transition-all font-semibold shadow-md shadow-indigo-500/25"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
