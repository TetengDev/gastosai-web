import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
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
import { Button, ConfirmDialog, IconButton, Modal, PageHeader, SelectionBar } from "../components/ui";
import { useMultiSelect } from "../hooks/useMultiSelect";
import { RATE_TTL_MS, rateCache } from "../lib/cache";
import { categoryIcon } from "../lib/categoryIcon";
import { formatCurrency } from "../lib/formatters";

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱", USD: "$", EUR: "€", SGD: "S$", JPY: "¥", GBP: "£", AUD: "A$",
};

const DAY_NAMES: Record<number, string> = {
  1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday",
};

const FREQUENCY_BADGE: Record<RecurringFrequency, string> = {
  MONTHLY: "bg-[#eaecff] text-[#4338ca] dark:bg-[#4338ca]/20 dark:text-[#a5b4fc]",
  WEEKLY: "bg-[#e7f6ee] text-[#1f8a5b] dark:bg-[#1f8a5b]/20 dark:text-[#7fd6b8]",
  YEARLY: "bg-warn-bg text-warn-ink",
};

const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  MONTHLY: "Monthly", WEEKLY: "Weekly", YEARLY: "Yearly",
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
  const [confirmDelete, setConfirmDelete] = useState<RecurringExpenseResponse | null>(null);
  const [deletingOne, setDeletingOne] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RecurringExpenseResponse | null>(null);
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
    const handler = () => { void load(); };
    window.addEventListener("gastosai:recurring-changed", handler);
    return () => window.removeEventListener("gastosai:recurring-changed", handler);
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
    setConflict(null);
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
    setConflict(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setModalError(null);
    setConflict(null);
  };

  const finishSave = () => {
    closeModal();
    void load();
    window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
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
      finishSave();
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string; detail?: string } } })?.response;
      if (response?.status === 409 && !editTarget) {
        const existing = bills.find(
          (b) => b.name.trim().toLowerCase() === form.name.trim().toLowerCase() && b.frequency === form.frequency
        ) ?? null;
        setConflict(existing);
        setModalError(`A ${String(form.frequency).toLowerCase()} recurring expense named "${form.name.trim()}" already exists.`);
      } else {
        setModalError(response?.data?.message ?? response?.data?.detail ?? "Failed to save. Check your input.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAnyway = async () => {
    setSaving(true);
    setModalError(null);
    try {
      await createRecurring(form, true);
      finishSave();
    } catch {
      setModalError("Failed to save. Check your input.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExisting = async () => {
    if (!conflict) return;
    setSaving(true);
    setModalError(null);
    try {
      await updateRecurring(conflict.id, form);
      finishSave();
    } catch {
      setModalError("Failed to update.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingOne(true);
    try {
      await deleteRecurring(confirmDelete.id);
      setBills((prev) => prev.filter((b) => b.id !== confirmDelete.id));
      setConfirmDelete(null);
      window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
    } catch {
      setError("Failed to delete.");
      setConfirmDelete(null);
    } finally {
      setDeletingOne(false);
    }
  };

  const setField = <K extends keyof RecurringExpenseRequest>(
    key: K,
    value: RecurringExpenseRequest[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const sel = useMultiSelect(bills.map((b) => b.id));
  const [deletingSelected, setDeletingSelected] = useState(false);
  const deleteSelected = async () => {
    const ids = sel.selectedIds;
    setDeletingSelected(true);
    const results = await Promise.allSettled(ids.map((id) => deleteRecurring(id)));
    const okIds = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    setBills((prev) => prev.filter((b) => !okIds.has(b.id)));
    sel.replace(ids.filter((id) => !okIds.has(id)));
    if (okIds.size > 0) window.dispatchEvent(new CustomEvent("gastosai:recurring-changed"));
    setDeletingSelected(false);
  };

  const inputClass = "w-full rounded-xl border border-edge-input bg-input px-4 py-2.5 text-sm text-ink";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  if (loading)
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 rounded-lg bg-surface-2" />
          <div className="h-11 w-32 rounded-full bg-surface-2" />
        </div>
        <div className="h-64 rounded-2xl bg-surface-2" />
      </div>
    );

  if (error)
    return (
      <div className="py-8 text-center">
        <p className="mb-3 text-[#b30000]">{error}</p>
        <button onClick={() => { void load(); }} className="text-sm text-link underline">
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recurring Bills"
        subtitle={<span>{bills.length} {bills.length === 1 ? "bill" : "bills"} configured</span>}
        onDeleteAll={bills.length > 0 ? () => setConfirmDeleteAll(true) : undefined}
        actions={
          <>
            <IconButton onClick={() => { void load(); }} title="Reload">
              <RotateCcw className="h-4 w-4" />
            </IconButton>
            <Button onClick={openAdd}>
              <Plus className="h-[15px] w-[15px]" />
              Add Bill
            </Button>
          </>
        }
      />

      {bills.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface p-16 text-center">
          <p className="mb-3 text-4xl">🔁</p>
          <p className="text-lg font-semibold text-ink-hi">No recurring bills yet</p>
          <p className="mb-5 mt-1 text-sm text-ink-3">Track bills that repeat monthly, weekly, or yearly</p>
          <Button onClick={openAdd}>
            <Plus className="h-[15px] w-[15px]" />
            Add your first bill
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <SelectionBar count={sel.count} onDelete={() => void deleteSelected()} onClear={sel.clear} deleting={deletingSelected} noun="bill" />
          <div className="overflow-hidden rounded-2xl border border-edge">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge-2 bg-surface-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                <th className="w-10 px-6 py-4">
                  <input type="checkbox" aria-label="Select all" checked={sel.allSelected} onChange={sel.toggleAll} className="rounded accent-[#1f8a5b]" />
                </th>
                <th className="px-6 py-4 text-left font-normal">Name</th>
                <th className="hidden px-6 py-4 text-left font-normal sm:table-cell">Category</th>
                <th className="hidden px-6 py-4 text-left font-normal md:table-cell">Schedule</th>
                <th className="px-6 py-4 text-right font-normal">Amount</th>
                <th className="px-6 py-4 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} className="border-b border-edge-3 transition-colors last:border-0 hover:bg-surface-2">
                  <td className="px-6 py-5">
                    <input type="checkbox" aria-label={`Select ${bill.name}`} checked={sel.selected.has(bill.id)} onChange={() => sel.toggle(bill.id)} className="rounded accent-[#1f8a5b]" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: bill.active ? "#1f8a5b" : "#c4c4cc" }}
                        title={bill.active ? "Active" : "Inactive"}
                      />
                      <div>
                        <p className="font-medium text-ink-hi">{bill.name}</p>
                        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${FREQUENCY_BADGE[bill.frequency]}`}>
                          {FREQUENCY_LABEL[bill.frequency]}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-6 py-5 text-ink-2 sm:table-cell">
                    <span className="inline-flex items-center gap-1.5">
                      {(() => { const Ic = categoryIcon(bill.categoryName); return <Ic className="h-3.5 w-3.5 shrink-0 text-ink-3" />; })()}
                      {bill.categoryName}
                    </span>
                  </td>
                  <td className="hidden px-6 py-5 text-ink-2 md:table-cell">{dayInfo(bill)}</td>
                  <td className="px-6 py-5 text-right">
                    <span className="inline-flex items-center justify-end gap-2">
                      {bill.currency !== "PHP" && (
                        <span className="rounded-md bg-link/10 px-1.5 py-0.5 font-mono text-[11px] text-link">
                          {bill.currency} {bill.amount.toFixed(2)}
                        </span>
                      )}
                      <span className="font-display text-[17px] font-medium text-ink-hi">
                        {formatCurrency(bill.amount * (bill.exchangeRate ?? 1))}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <IconButton onClick={() => openEdit(bill)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton onClick={() => setConfirmDelete(bill)} title="Delete" className="hover:text-[#b30000]">
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={closeModal} title={editTarget ? "Edit Bill" : "Add Bill"} maxWidthClass="max-w-sm">
        <form onSubmit={(e) => { void handleSave(e); }} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Netflix, Electricity"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
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
            <label className={labelClass}>Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 select-none text-sm font-medium text-ink-3">
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
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
          {form.currency !== "PHP" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
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
                onChange={(e) => setField("exchangeRate", parseFloat(e.target.value) || 1)}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-warn-ink">
                Rate is suggested and may not reflect real-time market prices. Adjust if needed.
              </p>
            </div>
          )}
          <div>
            <label className={labelClass}>Category</label>
            <CategoryCombobox
              categories={categories}
              value={form.categoryName ?? ""}
              onChange={(name) => setField("categoryName", name)}
              allowCreate
              placeholder="Select or create a category"
            />
          </div>
          <div>
            <label className={labelClass}>Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => {
                const freq = e.target.value as RecurringFrequency;
                setField("frequency", freq);
                if (freq === "MONTHLY") setField("dayOfMonth", Math.min(form.dayOfMonth ?? 1, 28));
              }}
              className={inputClass}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          {form.frequency === "YEARLY" && (
            <div>
              <label className={labelClass}>Month</label>
              <select
                value={form.monthOfYear ?? 1}
                onChange={(e) => {
                  const m = parseInt(e.target.value);
                  setField("monthOfYear", m);
                  const maxDay = MONTH_MAX_DAYS[m] ?? 31;
                  setField("dayOfMonth", Math.min(form.dayOfMonth ?? 1, maxDay));
                }}
                className={inputClass}
              >
                {Object.entries(MONTH_NAMES).map(([v, label]) => (
                  <option key={v} value={parseInt(v)}>{label}</option>
                ))}
              </select>
            </div>
          )}
          {(form.frequency === "MONTHLY" || form.frequency === "YEARLY") && (
            <div>
              <label className={labelClass}>Day of Month</label>
              <input
                type="number"
                required
                min={1}
                max={form.frequency === "YEARLY" ? (MONTH_MAX_DAYS[form.monthOfYear ?? 1] ?? 31) : 28}
                value={form.dayOfMonth ?? 1}
                onChange={(e) => setField("dayOfMonth", parseInt(e.target.value))}
                className={inputClass}
              />
              {form.frequency === "MONTHLY" && (
                <p className="mt-1 text-xs text-ink-3">
                  Max 28 — ensures bill fires every month including February.
                </p>
              )}
            </div>
          )}
          {form.frequency === "WEEKLY" && (
            <div>
              <label className={labelClass}>Day of Week</label>
              <select
                value={form.dayOfWeek ?? 1}
                onChange={(e) => setField("dayOfWeek", parseInt(e.target.value))}
                className={inputClass}
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
              className="h-4 w-4 rounded accent-[#1f8a5b]"
            />
            <label htmlFor="active-check" className="text-sm font-medium text-ink">Active</label>
          </div>
          {modalError && <p className="text-sm text-[#b30000]">{modalError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>
              Cancel
            </Button>
            {modalError && conflict !== null && !editTarget ? (
              <>
                <Button type="button" className="flex-1" disabled={saving} onClick={handleUpdateExisting}>
                  {saving ? "…" : "Update existing"}
                </Button>
                <Button type="button" variant="secondary" className="flex-1" disabled={saving} onClick={handleCreateAnyway}>
                  Create anyway
                </Button>
              </>
            ) : (
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete ? `Delete "${confirmDelete.name}"?` : "Delete bill?"}
        message="This recurring bill will be removed. This cannot be undone."
        confirmLabel="Delete"
        loading={deletingOne}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { void handleDelete(); }}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        title="Delete all recurring bills?"
        message={`All ${bills.length} ${bills.length === 1 ? "bill" : "bills"} will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete all"
        loading={deletingAll}
        error={deleteAllError}
        onCancel={() => { setConfirmDeleteAll(false); setDeleteAllError(null); }}
        onConfirm={async () => {
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
      />
    </div>
  );
}
