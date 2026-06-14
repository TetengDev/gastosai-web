import { useCallback, useEffect, useState } from "react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
  createRecurring,
  deleteAllRecurring,
  deleteRecurring,
  getRecurring,
  updateRecurring,
} from "../api/recurring";
import { getCategories } from "../api/categories";
import type { Category, RecurringExpenseRequest, RecurringExpenseResponse, RecurringFrequency } from "../api/types";
import CategoryCombobox from "../components/CategoryCombobox";
import CurrencySelect from "../components/CurrencySelect";
import { RATE_TTL_MS, rateCache } from "../lib/cache";
import { formatCurrency } from "../lib/formatters";

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱", USD: "$", EUR: "€", SGD: "S$", JPY: "¥", GBP: "£", AUD: "A$",
};

const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

const FREQUENCY_BADGE: Record<RecurringFrequency, string> = {
  MONTHLY: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  WEEKLY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  YEARLY: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  MONTHLY: "Monthly",
  WEEKLY: "Weekly",
  YEARLY: "Yearly",
};

const MONTH_NAMES: Record<number, string> = {
  1: "January", 2: "February", 3: "March", 4: "April",
  5: "May", 6: "June", 7: "July", 8: "August",
  9: "September", 10: "October", 11: "November", 12: "December",
};

const MONTH_MAX_DAYS: Record<number, number> = {
  1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
};

const DEFAULT_FORM: RecurringExpenseRequest = {
  name: "",
  amount: 0,
  categoryName: "",
  frequency: "MONTHLY",
  dayOfMonth: 1,
  dayOfWeek: 1,
  monthOfYear: 1,
  active: true,
  currency: "PHP",
  exchangeRate: 1,
};

function dayInfo(bill: RecurringExpenseResponse): string {
  if (bill.frequency === "MONTHLY") return `Day ${bill.dayOfMonth ?? "-"}`;
  if (bill.frequency === "WEEKLY") return `Every ${DAY_NAMES[bill.dayOfWeek ?? 1] ?? "-"}`;
  if (bill.frequency === "YEARLY") {
    const month = bill.monthOfYear != null ? MONTH_NAMES[bill.monthOfYear] : "-";
    return `${month} ${bill.dayOfMonth ?? "-"}`;
  }
  return "";
}

export default function Recurring() {
  const [bills, setBills] = useState<RecurringExpenseResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringExpenseResponse | null>(null);
  const [form, setForm] = useState<RecurringExpenseRequest>(DEFAULT_FORM);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [rateFetching, setRateFetching] = useState(false);
  const [suggestedRate, setSuggestedRate] = useState<number | null>(null);

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cats] = await Promise.all([getRecurring(), getCategories()]);
      setBills(data);
      setCategories(cats);
    } catch {
      setError("Failed to load recurring bills.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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

  const openAdd = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setModalError(null);
    setSuggestedRate(null);
    setShowModal(true);
  };

  const openEdit = (bill: RecurringExpenseResponse) => {
    setEditTarget(bill);
    setForm({
      name: bill.name,
      amount: bill.amount,
      categoryName: bill.categoryName,
      frequency: bill.frequency,
      dayOfMonth: bill.dayOfMonth,
      dayOfWeek: bill.dayOfWeek,
      monthOfYear: bill.monthOfYear,
      active: bill.active,
      currency: bill.currency ?? "PHP",
      exchangeRate: bill.exchangeRate ?? 1,
    });
    setModalError(null);
    setSuggestedRate(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setModalError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      if (editTarget) {
        await updateRecurring(editTarget.id, form);
      } else {
        await createRecurring(form);
      }
      closeModal();
      void load();
      window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; detail?: string } } })
          ?.response?.data?.message ?? "Failed to save. Check your input.";
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRecurring(id);
      setBills((prev) => prev.filter((b) => b.id !== id));
      window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
    } catch {
      setError("Failed to delete.");
    } finally {
      setDeleting(null);
    }
  };

  const setField = <K extends keyof RecurringExpenseRequest>(
    key: K,
    value: RecurringExpenseRequest[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  if (loading)
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-44 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-10 w-36 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl" />
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );

  if (error)
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-3">{error}</p>
        <button
          onClick={() => { void load(); }}
          className="text-sm text-indigo-600 dark:text-indigo-400 underline"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Recurring Bills
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {bills.length} {bills.length === 1 ? "bill" : "bills"} configured
            </p>
            {bills.length > 0 && (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="inline-flex items-center gap-1 text-xs text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Delete All
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { void load(); }}
            title="Reload"
            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            + Add Bill
          </button>
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-16 text-center">
          <p className="text-4xl mb-3">🔁</p>
          <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
            No recurring bills yet
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-5">
            Track bills that repeat monthly, weekly, or yearly
          </p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md shadow-indigo-500/25"
          >
            + Add your first bill
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Category
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Schedule
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {bills.map((bill) => (
                <tr
                  key={bill.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${bill.active ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-600"}`}
                        title={bill.active ? "Active" : "Inactive"}
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{bill.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FREQUENCY_BADGE[bill.frequency]}`}>
                          {FREQUENCY_LABEL[bill.frequency]}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {bill.categoryName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {dayInfo(bill)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {bill.currency !== "PHP" && (
                      <span className="mr-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        {bill.currency} {bill.amount.toFixed(2)}
                      </span>
                    )}
                    {formatCurrency(bill.amount * (bill.exchangeRate ?? 1))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {deleting === bill.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Confirm?</span>
                        <button
                          onClick={() => { void handleDelete(bill.id); }}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleting(null)}
                          className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(bill)}
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(bill.id)}
                          title="Delete"
                          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-5 text-lg">
              {editTarget ? "Edit Bill" : "Add Bill"}
            </h3>
            <form onSubmit={(e) => { void handleSave(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Netflix, Electricity"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Currency
                </label>
                <CurrencySelect
                  value={form.currency ?? "PHP"}
                  onChange={(c) => {
                    setSuggestedRate(null);
                    setField("currency", c);
                    if (c === "PHP") setField("exchangeRate", 1);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium select-none">
                    {CURRENCY_SYMBOLS[form.currency ?? "PHP"] ?? form.currency}
                  </span>
                  <input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    value={form.amount || ""}
                    onChange={(e) => setField("amount", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
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
                    onChange={(e) => setField("exchangeRate", parseFloat(e.target.value) || 1)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                    Rate is suggested and may not reflect real-time market prices. Adjust if needed.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Category
                </label>
                <CategoryCombobox
                  categories={categories}
                  value={form.categoryName ?? ""}
                  onChange={(name) => setField("categoryName", name)}
                  allowCreate
                  placeholder="Select or create a category"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Frequency
                </label>
                <select
                  value={form.frequency}
                  onChange={(e) => {
                    const freq = e.target.value as RecurringFrequency;
                    setField("frequency", freq);
                    if (freq === "MONTHLY") {
                      setField("dayOfMonth", Math.min(form.dayOfMonth ?? 1, 28));
                    }
                  }}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              {form.frequency === "YEARLY" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Month
                  </label>
                  <select
                    value={form.monthOfYear ?? 1}
                    onChange={(e) => {
                      const m = parseInt(e.target.value);
                      setField("monthOfYear", m);
                      const maxDay = MONTH_MAX_DAYS[m] ?? 31;
                      setField("dayOfMonth", Math.min(form.dayOfMonth ?? 1, maxDay));
                    }}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    {Object.entries(MONTH_NAMES).map(([v, label]) => (
                      <option key={v} value={parseInt(v)}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
              {(form.frequency === "MONTHLY" || form.frequency === "YEARLY") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={form.frequency === "YEARLY"
                      ? (MONTH_MAX_DAYS[form.monthOfYear ?? 1] ?? 31)
                      : 28}
                    value={form.dayOfMonth ?? 1}
                    onChange={(e) => setField("dayOfMonth", parseInt(e.target.value))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  {form.frequency === "MONTHLY" && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Max 28 — ensures bill fires every month including February.
                    </p>
                  )}
                </div>
              )}
              {form.frequency === "WEEKLY" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Day of Week
                  </label>
                  <select
                    value={form.dayOfWeek ?? 1}
                    onChange={(e) => setField("dayOfWeek", parseInt(e.target.value))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active-check"
                  checked={form.active ?? true}
                  onChange={(e) => setField("active", e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <label htmlFor="active-check" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>
              {modalError && (
                <p className="text-red-500 text-sm">{modalError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 transition-all font-semibold"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteAll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-center mb-1">
              Delete all recurring bills?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 text-center">
              All {bills.length} {bills.length === 1 ? "bill" : "bills"} will be permanently removed.
              This cannot be undone.
            </p>
            {deleteAllError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 mb-4">
                {deleteAllError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmDeleteAll(false); setDeleteAllError(null); }}
                className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                disabled={deletingAll}
                onClick={async () => {
                  setDeletingAll(true);
                  setDeleteAllError(null);
                  try {
                    await deleteAllRecurring();
                    setBills([]);
                    setConfirmDeleteAll(false);
                    window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
                  } catch (err: unknown) {
                    const msg =
                      (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                      ?? "Failed to delete all recurring bills.";
                    setDeleteAllError(msg);
                  } finally {
                    setDeletingAll(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold transition-colors"
              >
                {deletingAll ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
