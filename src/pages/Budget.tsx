import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  createBudget,
  deleteAllBudgets,
  deleteBudget,
  getBudgets,
  updateBudget,
} from "../api/budgets";
import { createCategory, getCategories } from "../api/categories";
import type { BudgetRequest, BudgetResponse } from "../api/types";
import type { Category } from "../api/types";
import CategoryCombobox from "../components/CategoryCombobox";
import CurrencySelect from "../components/CurrencySelect";
import { Button, ConfirmDialog, IconButton, Modal, PageHeader, SelectionBar } from "../components/ui";
import { useMultiSelect } from "../hooks/useMultiSelect";
import { RATE_TTL_MS, rateCache } from "../lib/cache";
import { formatCurrency, formatMonth } from "../lib/formatters";

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱", USD: "$", EUR: "€", SGD: "S$", JPY: "¥", GBP: "£", AUD: "A$",
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function Budget() {
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetResponse | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amountLimit, setAmountLimit] = useState("");
  const [modalMonth, setModalMonth] = useState(currentMonth);
  const [budgetCurrency, setBudgetCurrency] = useState("PHP");
  const [budgetExchangeRate, setBudgetExchangeRate] = useState(1);
  const [rateFetching, setRateFetching] = useState(false);
  const [suggestedRate, setSuggestedRate] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<BudgetResponse | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<BudgetResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetList, catList] = await Promise.all([getBudgets(month), getCategories()]);
      setBudgets(budgetList);
      setCategories(catList);
    } catch {
      setError("Failed to load budgets.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (budgetCurrency === "PHP") { setSuggestedRate(null); setBudgetExchangeRate(1); return; }
    const now = Date.now();
    const cached = rateCache[budgetCurrency];
    if (cached && now - cached.ts < RATE_TTL_MS) {
      setSuggestedRate(cached.rate);
      setBudgetExchangeRate(cached.rate);
      return;
    }
    setRateFetching(true);
    fetch(`https://open.er-api.com/v6/latest/${budgetCurrency}`)
      .then((r) => r.json())
      .then((data: { rates?: Record<string, number> }) => {
        const raw = data.rates?.["PHP"];
        if (raw) {
          const rate = parseFloat(raw.toFixed(4));
          rateCache[budgetCurrency] = { rate, ts: Date.now() };
          setSuggestedRate(rate);
          setBudgetExchangeRate(rate);
        }
      })
      .catch(() => {})
      .finally(() => setRateFetching(false));
  }, [budgetCurrency]);

  const openAdd = () => {
    setEditing(null);
    setConflict(null);
    setSelectedCategoryName("");
    setCategoryId("");
    setAmountLimit("");
    setModalMonth(month);
    setModalError(null);
    setBudgetCurrency("PHP");
    setBudgetExchangeRate(1);
    setSuggestedRate(null);
    setModalOpen(true);
  };

  const openEdit = (budget: BudgetResponse) => {
    setEditing(budget);
    setConflict(null);
    setSelectedCategoryName(budget.categoryName);
    setCategoryId(budget.categoryId);
    setAmountLimit(String(budget.amountLimit));
    setModalMonth(budget.month);
    setModalError(null);
    setBudgetCurrency(budget.currency ?? "PHP");
    setBudgetExchangeRate(budget.exchangeRate ?? 1);
    setSuggestedRate(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setConflict(null);
    setSelectedCategoryName("");
    setCategoryId("");
    setAmountLimit("");
    setModalError(null);
    setBudgetCurrency("PHP");
    setBudgetExchangeRate(1);
    setSuggestedRate(null);
  };

  const handleCreateCategory = async (name: string) => {
    try {
      const created = await createCategory({ name: name.trim(), icon: null });
      setCategories((prev) => [...prev, created]);
      setSelectedCategoryName(created.name);
      setCategoryId(created.id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? `Failed to create "${name}".`;
      setModalError(msg);
    }
  };

  const buildPayload = (): BudgetRequest => ({
    categoryId: Number(categoryId),
    month: modalMonth,
    amountLimit: parseFloat(amountLimit),
    currency: budgetCurrency,
    exchangeRate: budgetExchangeRate,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryId === "") {
      setModalError("Please select a category.");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const payload = buildPayload();
      if (editing) {
        const updated = await updateBudget(editing.id, payload);
        setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        const created = await createBudget(payload);
        setBudgets((prev) => [...prev, created]);
      }
      closeModal();
      window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string; detail?: string } } })?.response;
      if (response?.status === 409 && !editing) {
        const existing = budgets.find(
          (b) => b.categoryId === Number(categoryId) && b.month === modalMonth
        ) ?? null;
        setConflict(existing);
        setModalError("A budget for this category and month already exists. Overwrite it with the new amount?");
      } else {
        setModalError(response?.data?.message ?? response?.data?.detail ?? "Failed to save. Check your input.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOverwrite = async () => {
    setSaving(true);
    setModalError(null);
    try {
      const saved = await createBudget(buildPayload(), true);
      setBudgets((prev) =>
        prev.some((b) => b.id === saved.id)
          ? prev.map((b) => (b.id === saved.id ? saved : b))
          : [...prev, saved]
      );
      closeModal();
      window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
    } catch {
      setModalError("Failed to overwrite budget.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteBudget(confirmDelete.id);
      setBudgets((prev) => prev.filter((b) => b.id !== confirmDelete.id));
      setConfirmDelete(null);
      window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
    } catch {
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const sel = useMultiSelect(budgets.map((b) => b.id));
  const [deletingSelected, setDeletingSelected] = useState(false);
  const deleteSelected = async () => {
    const ids = sel.selectedIds;
    setDeletingSelected(true);
    const results = await Promise.allSettled(ids.map((id) => deleteBudget(id)));
    const okIds = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    setBudgets((prev) => prev.filter((b) => !okIds.has(b.id)));
    sel.replace(ids.filter((id) => !okIds.has(id)));
    if (okIds.size > 0) window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
    setDeletingSelected(false);
  };

  const inputClass = "w-full rounded-xl border border-edge-input bg-input px-4 py-2.5 text-sm text-ink";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  if (loading)
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-40 rounded-lg bg-surface-2" />
          <div className="h-11 w-36 rounded-full bg-surface-2" />
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
        title="Budgets"
        subtitle={
          <span>
            {budgets.length} {budgets.length === 1 ? "budget" : "budgets"} for {formatMonth(month)}
          </span>
        }
        onDeleteAll={budgets.length > 0 ? () => setConfirmDeleteAll(true) : undefined}
        actions={
          <>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-edge-input bg-surface px-3 py-2 text-sm text-ink"
            />
            <IconButton onClick={() => { void load(); }} title="Reload">
              <RotateCcw className="h-4 w-4" />
            </IconButton>
            <Button onClick={openAdd}>
              <Plus className="h-[15px] w-[15px]" />
              Add Budget
            </Button>
          </>
        }
      />

      {budgets.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface p-16 text-center">
          <p className="mb-3 text-4xl">💰</p>
          <p className="text-lg font-semibold text-ink-hi">No budgets for this month</p>
          <p className="mb-5 mt-1 text-sm text-ink-3">Set spending limits per category to track your budget</p>
          <Button onClick={openAdd}>
            <Plus className="h-[15px] w-[15px]" />
            Set your first budget
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <SelectionBar count={sel.count} onDelete={() => void deleteSelected()} onClear={sel.clear} deleting={deletingSelected} noun="budget" />
          <div className="overflow-hidden rounded-2xl border border-edge">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge-2 bg-surface-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                <th className="w-10 px-6 py-4">
                  <input type="checkbox" aria-label="Select all" checked={sel.allSelected} onChange={sel.toggleAll} className="rounded accent-[#1f8a5b]" />
                </th>
                <th className="px-6 py-4 text-left font-normal">Category</th>
                <th className="px-6 py-4 text-right font-normal">Budget limit</th>
                <th className="px-6 py-4 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id} className="border-b border-edge-3 transition-colors last:border-0 hover:bg-surface-2">
                  <td className="px-6 py-5">
                    <input type="checkbox" aria-label={`Select ${b.categoryName}`} checked={sel.selected.has(b.id)} onChange={() => sel.toggle(b.id)} className="rounded accent-[#1f8a5b]" />
                  </td>
                  <td className="px-6 py-5 font-medium text-ink-hi">{b.categoryName}</td>
                  <td className="px-6 py-5 text-right">
                    <span className="inline-flex items-center justify-end gap-2">
                      {b.currency !== "PHP" && (
                        <span className="rounded-md bg-link/10 px-1.5 py-0.5 font-mono text-[11px] text-link">
                          {b.currency} {b.amountLimit.toFixed(2)}
                        </span>
                      )}
                      <span className="font-display text-[17px] font-medium text-ink-hi">
                        {formatCurrency(b.amountLimitInBaseCurrency ?? b.amountLimit)}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <IconButton onClick={() => openEdit(b)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton onClick={() => setConfirmDelete(b)} title="Delete" className="hover:text-[#b30000]">
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Budget" : "Add Budget"} maxWidthClass="max-w-sm">
        <form onSubmit={(e) => { void handleSave(e); }} className="space-y-4">
          <div>
            <label className={labelClass}>Category</label>
            <CategoryCombobox
              categories={categories}
              value={selectedCategoryName}
              onChange={(name, id) => {
                setSelectedCategoryName(name);
                setCategoryId(id ?? "");
              }}
              onCreateCategory={handleCreateCategory}
              allowCreate
              placeholder="Select or create a category"
            />
            {editing && selectedCategoryName !== editing.categoryName && (
              <p className="mt-1 text-xs text-warn-ink">
                ⚠ This retargets the budget — only the spending limit moves.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Month</label>
            {editing ? (
              <div className="rounded-xl border border-edge-input bg-surface-2 px-4 py-2.5 text-sm text-ink">
                {formatMonth(modalMonth)}
              </div>
            ) : (
              <input
                type="month"
                required
                value={modalMonth}
                onChange={(e) => setModalMonth(e.target.value)}
                className={inputClass}
              />
            )}
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <CurrencySelect
              value={budgetCurrency}
              onChange={(c) => {
                setSuggestedRate(null);
                setBudgetCurrency(c);
                if (c === "PHP") setBudgetExchangeRate(1);
              }}
            />
          </div>
          <div>
            <label className={labelClass}>Amount Limit</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 select-none text-sm font-medium text-ink-3">
                {CURRENCY_SYMBOLS[budgetCurrency] ?? budgetCurrency}
              </span>
              <input
                type="number"
                required
                min={0.01}
                step={0.01}
                value={amountLimit}
                onChange={(e) => setAmountLimit(e.target.value)}
                placeholder="0.00"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
          {budgetCurrency !== "PHP" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-ink">
                  Exchange Rate (1 {budgetCurrency} = ? PHP)
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
                value={budgetExchangeRate}
                onChange={(e) => setBudgetExchangeRate(parseFloat(e.target.value) || 1)}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-warn-ink">
                Rate is suggested and may not reflect real-time market prices. Adjust if needed.
              </p>
            </div>
          )}
          {modalError && <p className="text-sm text-[#b30000]">{modalError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            {conflict !== null && !editing ? (
              <button
                type="button"
                onClick={handleOverwrite}
                disabled={saving}
                className="flex-1 rounded-full bg-[#e8590c] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Overwriting…" : "Overwrite existing"}
              </button>
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
        title={confirmDelete ? `Delete budget for "${confirmDelete.categoryName}"?` : "Delete budget?"}
        message={
          confirmDelete ? (
            <>
              This will remove the spending limit for{" "}
              <span className="font-medium text-ink">{confirmDelete.categoryName}</span> in{" "}
              {formatMonth(confirmDelete.month)}.
            </>
          ) : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { void handleDelete(); }}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        title="Delete all budgets?"
        message={`All ${budgets.length} ${budgets.length === 1 ? "budget" : "budgets"} for ${formatMonth(month)} will be removed. This cannot be undone.`}
        confirmLabel="Delete all"
        loading={deletingAll}
        error={deleteAllError}
        onCancel={() => { setConfirmDeleteAll(false); setDeleteAllError(null); }}
        onConfirm={async () => {
          setDeletingAll(true);
          setDeleteAllError(null);
          try {
            await deleteAllBudgets(month);
            setBudgets([]);
            setConfirmDeleteAll(false);
            window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? "Failed to delete all budgets.";
            setDeleteAllError(msg);
          } finally {
            setDeletingAll(false);
          }
        }}
      />
    </div>
  );
}
