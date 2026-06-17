import { useEffect, useState } from "react";
import { getCategories } from "../api/categories";
import type { Category, Expense, ExpenseRequest, ExpenseType } from "../api/types";
import { toDateTimeLocal } from "../lib/formatters";
import { CAT_TTL_MS, RATE_TTL_MS, getCategoryCache, rateCache, setCategoryCache } from "../lib/cache";
import CurrencySelect from "./CurrencySelect";
import { Button, Modal } from "./ui";
import { useAuth } from "../context/AuthContext";

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱", USD: "$", EUR: "€", SGD: "S$", JPY: "¥", GBP: "£", AUD: "A$",
};

interface Props {
  expense?: Expense;
  onSave: (data: ExpenseRequest) => Promise<void>;
  onClose: () => void;
}

export default function ExpenseModal({ expense, onSave, onClose }: Props) {
  const { user } = useAuth();
  const now = new Date().toISOString().slice(0, 16);
  const [form, setForm] = useState<ExpenseRequest>({
    amount: expense?.amount ?? (0 as unknown as number),
    category: expense?.category ?? user?.defaultCategory ?? "Uncategorized",
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
    "w-full rounded-xl border border-edge-input bg-input px-4 py-2.5 text-sm text-ink";
  const labelClass = "block text-sm font-medium text-ink mb-1.5";

  return (
    <Modal open onClose={onClose} title={expense ? "Edit Expense" : "New Expense"}>
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
              <span className="absolute left-4 top-1/2 -translate-y-1/2 select-none text-sm font-medium text-ink-3">
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
                <label className="text-sm font-medium text-ink">
                  Exchange Rate (1 {form.currency} = ? PHP)
                </label>
                {rateFetching && <span className="text-xs text-ink-3">Fetching rate…</span>}
                {!rateFetching && suggestedRate !== null && (
                  <span className="text-xs text-[#1f8a5b]">Suggested: {suggestedRate.toFixed(4)}</span>
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
              <p className="mt-1.5 text-xs text-warn-ink">
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
              className="h-4 w-4 cursor-pointer rounded accent-[#1f8a5b]"
            />
            <label
              htmlFor="reimbursable"
              className="cursor-pointer select-none text-sm font-medium text-ink"
            >
              Reimbursable
            </label>
          </div>
          {error && <p className="text-sm text-[#b30000]">{error}</p>}
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
