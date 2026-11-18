import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  createBudget,
  deleteAllBudgets,
  deleteBudget,
  getBudgetSummary,
  getBudgets,
  updateBudget,
} from "../api/budgets";
import { createCategory, getCategories } from "../api/categories";
import type { BudgetRequest, BudgetResponse, BudgetSummaryResponse } from "../api/budgets";
import type { Category } from "../api/categories";
import BudgetRuleCard from "../components/BudgetRuleCard";
import CategoryCombobox from "../components/CategoryCombobox";
import CurrencySelect from "../components/CurrencySelect";
import { Button, ConfirmDialog, IconButton, Modal, PageHeader, ProgressMeter, SelectionBar } from "../components/ui";
import { useMultiSelect } from "../hooks/useMultiSelect";
import { RATE_TTL_MS, rateCache } from "../lib/cache";
import { categoryIcon } from "../lib/categoryIcon";
import { EXPENSE_CHANGED } from "../lib/events";
import { budgetTone, pisoMoodFor, toBand } from "../lib/pisoMood";
import Piso from "../brand/Piso";
import { PISO_LABELS } from "../brand/pisoTokens";
import { centavosToAmount, currencySymbol, formatCentavos, formatCurrencyAmount, formatMonth, manilaMonth, parseAmountToCentavos } from "../lib/formatters";

const currentMonth = () => manilaMonth();

/** `yyyy-mm` moved by whole months. Calendar arithmetic on the key, not on any amount. */
function shiftMonth(yyyyMM: string, delta: number): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

const STEP_CLASS =
  "grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent";

export default function Budget() {
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [summary, setSummary] = useState<BudgetSummaryResponse | null>(null);
  // The month the rows on screen belong to. Set with the data, so after a step the previous
  // month's rows are known to be stale until the new month answers.
  const [dataMonth, setDataMonth] = useState<string | null>(null);
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
  const [recurring, setRecurring] = useState(false);
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

  // Only the newest request may write: a refetch fired by an event can resolve after a later one.
  const latest = useRef(0);

  /**
   * Two queries, not interchangeable: `/budgets` carries the definitions and ids that Edit and
   * Delete need, `/budgets/summary` the server's figures and bands. Refetches keep the page
   * mounted; only the first load shows the skeleton. A failed summary leaves the budgets
   * manageable, just without meters.
   */
  const load = useCallback(async () => {
    const request = ++latest.current;
    setError(null);
    try {
      const [budgetList, sum, catList] = await Promise.all([
        getBudgets(month),
        getBudgetSummary(month).catch(() => null),
        getCategories(),
      ]);
      if (request !== latest.current) return;
      setBudgets(budgetList);
      setSummary(sum);
      setCategories(catList);
      setDataMonth(month);
    } catch {
      if (request === latest.current) setError("Failed to load budgets.");
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Every write on this page, the rule card and the expense modal announce themselves; the
    // figures on the rows are the server's, so they are fetched again rather than patched here.
    const refetch = () => { void load(); };
    const events = ["gastosai:budget-changed", EXPENSE_CHANGED];
    for (const e of events) window.addEventListener(e, refetch);
    return () => {
      for (const e of events) window.removeEventListener(e, refetch);
    };
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
    setRecurring(false);
    setModalOpen(true);
  };

  const openEdit = (budget: BudgetResponse) => {
    setEditing(budget);
    setConflict(null);
    setSelectedCategoryName(budget.categoryName);
    setCategoryId(budget.categoryId);
    setAmountLimit(centavosToAmount(budget.amountLimit));
    setModalMonth(budget.month);
    setModalError(null);
    setBudgetCurrency(budget.currency ?? "PHP");
    setBudgetExchangeRate(budget.exchangeRate ?? 1);
    setSuggestedRate(null);
    setRecurring(budget.recurring ?? false);
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
    setRecurring(false);
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

  /** `amountLimitCentavos` is what the typed text parsed to — the field is never re-parsed here. */
  const buildPayload = (amountLimitCentavos: number): BudgetRequest => ({
    categoryId: Number(categoryId),
    month: modalMonth,
    amountLimit: amountLimitCentavos,
    currency: budgetCurrency,
    exchangeRate: budgetExchangeRate,
    recurring,
  });

  /**
   * The typed limit as integer centavos, or `null` when it is not a well-formed amount. More
   * than two decimal places lands here rather than being rounded into a limit nobody set.
   */
  const parsedAmountLimit = () => parseAmountToCentavos(amountLimit);
  const AMOUNT_ERROR = "Enter an amount like 1900 or 1900.50 — at most two decimal places.";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // `max` already stops this where the browser has a month picker; without one it is a text
    // field. A later month could be created but not seen here, because the stepper stops at now.
    if (!editing && modalMonth > currentMonth()) {
      setModalError("Choose this month or an earlier one.");
      return;
    }
    if (categoryId === "") {
      setModalError("Please select a category.");
      return;
    }
    const amountLimitCentavos = parsedAmountLimit();
    if (amountLimitCentavos === null) {
      setModalError(AMOUNT_ERROR);
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const payload = buildPayload(amountLimitCentavos);
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
    const amountLimitCentavos = parsedAmountLimit();
    if (amountLimitCentavos === null) {
      setModalError(AMOUNT_ERROR);
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const saved = await createBudget(buildPayload(amountLimitCentavos), true);
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

  // The fullest budget first, by the server's percentUsed. A budget the summary has not caught up
  // with yet (just created, refetch in flight) sits last, without a meter.
  const itemFor = new Map((summary?.items ?? []).map((i) => [i.categoryId, i]));
  const rows = budgets
    .map((b) => ({ b, item: itemFor.get(b.categoryId) }))
    .sort((x, y) => (y.item?.percentUsed ?? -1) - (x.item?.percentUsed ?? -1));

  // One Piso for the screen, in the worst row's server band. There is no visible mood line (mobile
  // has none), so the face carries the mood as its accessible name; `resting` has no label of its
  // own because elsewhere it sits beside text that already says it.
  const bands = rows.flatMap((r) => (r.item ? [toBand(r.item.status)] : []));
  const mood = pisoMoodFor({ bands, hasExpenses: true });
  const moodName = PISO_LABELS[mood] ?? (bands.length > 0 ? "All budgets on track" : "No budget figures yet");
  const stale = dataMonth !== month;
  const atCurrentMonth = month >= currentMonth();

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

  // Before anything has loaded there is no page to keep; after that a failure shows inline.
  if (error && dataMonth === null)
    return (
      <div className="py-8 text-center">
        <p className="mb-3 text-[#b30000]">{error}</p>
        <button onClick={() => { setLoading(true); void load(); }} className="text-sm text-link underline">
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Below sm Piso sits above the header; the actions are one wrapping container because
          PageHeader's own actions row does not wrap. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div role="img" aria-label={moodName} className="w-fit shrink-0">
          <span aria-hidden="true">
            <Piso state={mood} size={64} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <PageHeader
            title="Budgets"
            subtitle={
              <span>
                {budgets.length} {budgets.length === 1 ? "budget" : "budgets"}
              </span>
            }
            // While stale the rows are another month's; Delete all would wipe a month nobody has seen.
            onDeleteAll={budgets.length > 0 && !stale ? () => setConfirmDeleteAll(true) : undefined}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-full border border-edge-input bg-surface p-0.5">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setMonth((m) => shiftMonth(m, -1))}
                    className={STEP_CLASS}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span aria-live="polite" className="min-w-[9rem] text-center text-sm font-medium text-ink-hi">
                    {formatMonth(month)}
                  </span>
                  <button
                    type="button"
                    aria-label="Next month"
                    // aria-disabled, not disabled: a disabled button drops focus the moment the
                    // step that reached the current month lands.
                    onClick={() => { if (!atCurrentMonth) setMonth((m) => shiftMonth(m, 1)); }}
                    aria-disabled={atCurrentMonth}
                    className={STEP_CLASS}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <IconButton onClick={() => { void load(); }} title="Reload">
                  <RotateCcw className="h-4 w-4" />
                </IconButton>
                <Button onClick={openAdd} disabled={stale}>
                  <Plus className="h-[15px] w-[15px]" />
                  Add Budget
                </Button>
              </div>
            }
          />
        </div>
      </div>

      <BudgetRuleCard month={month} categories={categories} onCategoriesChanged={() => { void load(); }} />

      {error && (
        <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-danger">
          {error}
          <button type="button" onClick={() => { void load(); }} className="text-link underline">
            Retry
          </button>
        </p>
      )}

      <div aria-busy={stale && !error} inert={stale} className={stale ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {budgets.length === 0 ? (
          <div className="rounded-2xl border border-edge bg-surface p-16 text-center">
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
            <div className="overflow-x-auto rounded-2xl border border-edge">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge-2 bg-surface-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  <th className="w-10 px-3 py-4 sm:px-6">
                    <input type="checkbox" aria-label="Select all" checked={sel.allSelected} onChange={sel.toggleAll} className="rounded accent-[#1f8a5b]" />
                  </th>
                  <th className="px-3 py-4 text-left font-normal sm:px-6">Category</th>
                  <th className="hidden px-3 py-4 text-right font-normal sm:table-cell sm:px-6">Budget limit</th>
                  <th className="px-3 py-4 text-right font-normal sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ b, item }) => (
                  <tr key={b.id} className="border-b border-edge-3 transition-colors last:border-0 hover:bg-surface-2">
                    <td className="px-3 py-5 sm:px-6">
                      <input type="checkbox" aria-label={`Select ${b.categoryName}`} checked={sel.selected.has(b.id)} onChange={() => sel.toggle(b.id)} className="rounded accent-brand" />
                    </td>
                    <td className="px-3 py-5 sm:px-6">
                      <span className="inline-flex items-center gap-2 font-medium text-ink-hi">
                        {(() => { const Ic = categoryIcon(b.categoryName); return <Ic className="h-4 w-4 shrink-0 text-ink-3" />; })()}
                        {b.categoryName}
                        {b.recurring && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-brand">
                            ↻ Monthly
                          </span>
                        )}
                      </span>
                      {item && (
                        <>
                          <ProgressMeter
                            percent={item.percentUsed}
                            tone={budgetTone(toBand(item.status))}
                            label={`${b.categoryName} budget`}
                            className="mt-3"
                          />
                          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
                            <span className="font-mono tabular-nums text-ink-2">
                              {formatCentavos(item.spent)} of {formatCentavos(item.budgeted)} · {Math.round(item.percentUsed)}%
                            </span>
                            {item.remaining < 0 ? (
                              <span className="font-medium text-warn-ink">Over by {formatCentavos(-item.remaining)}</span>
                            ) : (
                              <span className="text-ink-2">{formatCentavos(item.remaining)} left</span>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="hidden px-3 py-5 text-right sm:table-cell sm:px-6">
                      <span className="inline-flex items-center justify-end gap-2">
                        {b.currency !== "PHP" && (
                          <span className="rounded-md bg-link/10 px-1.5 py-0.5 font-mono text-[11px] text-link">
                            {formatCurrencyAmount(b.amountLimit, b.currency, "code")}
                          </span>
                        )}
                        <span className="font-display text-[17px] font-medium text-ink-hi">
                          {formatCentavos(b.amountLimitInBaseCurrency ?? b.amountLimit)}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-5 sm:px-6">
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
      </div>

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
                max={currentMonth()}
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
                {currencySymbol(budgetCurrency)}
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
          <label className="flex items-center gap-2.5 rounded-xl border border-edge-input bg-surface px-4 py-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="rounded accent-[#1f8a5b]"
            />
            <span>
              Repeat every month
              <span className="ml-1 text-xs text-ink-3">— auto-carry this limit into future months</span>
            </span>
          </label>
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
