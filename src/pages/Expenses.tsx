import { EXPENSE_CHANGED } from "../lib/events";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ExpenseModal from "../components/ExpenseModal";
import {
  deleteExpense,
  downloadImportTemplate,
  exportExpenses,
  exportExpensesPdf,
  getDailyReport,
  getExpenses,
  getProjects,
  importExpensesCsv,
  type Expense,
  type ImportResult,
  type Project,
} from "../api/expenses";
import { useExpenses } from "../hooks/useExpenses";
import { useEntitlements } from "../hooks/useEntitlements";
import { useFeatures } from "../hooks/useFeatures";
import { useDismiss } from "../hooks/useDismiss";
import Piso from "../brand/Piso";
import { Amount, Button, Celebrate, ConfirmDialog, EmptyState, IconButton, Modal, PageHeader, SelectionBar } from "../components/ui";
import { formatCurrencyAmount, formatDayMonth, formatMonth, manilaMonth } from "../lib/formatters";
import CategoryChip from "../components/CategoryChip";

/** Spec §2: `saved` holds for 1.2 s after an expense is logged. */
const SAVED_MS = 1200;
const MENU_ID = "expenses-more-actions";

/** `yyyy-mm` moved by whole months. Calendar arithmetic on the key, not on any amount. */
function shiftMonth(yyyyMM: string, delta: number): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** The first and last calendar day of a `yyyy-mm`, as the list and export endpoints take them. */
function monthRange(yyyyMM: string): { from: string; to: string } {
  const [y, m] = yyyyMM.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${yyyyMM}-01`, to: `${yyyyMM}-${String(lastDay).padStart(2, "0")}` };
}

/**
 * Rows grouped by their Manila calendar day, in the order the server sent them (newest first).
 * The API serves Manila wall-clock timestamps, so the first ten characters are that day.
 */
function byDay(rows: Expense[]): [string, Expense[]][] {
  const days = new Map<string, Expense[]>();
  for (const e of rows) {
    const day = e.date.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), e]);
  }
  return [...days];
}

const STEP_CLASS =
  "grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent";
const inputClass = "w-full rounded-lg border border-edge-input bg-input px-3 py-2 text-sm text-ink";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2";
const menuItemClass =
  "flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-sm text-ink transition-colors hover:bg-surface-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

export default function Expenses() {
  const features = useFeatures();
  const { has: hasFeature, loading: entLoading } = useEntitlements();
  // The backend is the real gate; while entitlements load the control renders optimistically,
  // the way `FeatureGate` does.
  const canExportPdf = entLoading || hasFeature("EXPORT_PDF");
  // All-time: `total` is the server's count, which decides the first-run state (R23). The list
  // itself is the month's, fetched below.
  const { loading, error, total, add, update, remove, removeAll, refresh } = useExpenses();
  // `total` is also 0 before the first load and after a failed one, so only a load that succeeded
  // may decide "no expenses yet". Later refetch failures keep the last good count.
  const [hookLoaded, setHookLoaded] = useState(false);
  if (!loading && !error && !hookLoaded) setHookLoaded(true);

  const [month, setMonth] = useState(manilaMonth);
  const [rows, setRows] = useState<Expense[] | null>(null);
  // Day totals are the server's (R22). Null when the report failed: no totals, never a client sum.
  const [dayTotals, setDayTotals] = useState<Map<string, number> | null>(null);
  // The month the rows on screen belong to; after a step they are stale until the new month answers.
  const [dataMonth, setDataMonth] = useState<string | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [editing, setEditing] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saved, setSaved] = useState<{ first: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [strictImport, setStrictImport] = useState(false);
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [exportRange, setExportRange] = useState(() => monthRange(manilaMonth()));
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");

  // Only the newest request may write: a refetch fired by an event can resolve after a later step.
  const latest = useRef(0);
  const loadMonth = useCallback(async () => {
    const request = ++latest.current;
    setMonthError(null);
    try {
      const [list, report] = await Promise.all([
        getExpenses(monthRange(month)),
        getDailyReport(month).catch(() => null),
      ]);
      if (request !== latest.current) return;
      setRows(list);
      setDayTotals(report ? new Map(report.map((d) => [d.date, d.total])) : null);
      setDataMonth(month);
    } catch {
      if (request === latest.current) setMonthError(`Could not load ${formatMonth(month)}.`);
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMonth();
    const refetch = () => { void loadMonth(); };
    window.addEventListener(EXPENSE_CHANGED, refetch);
    return () => window.removeEventListener(EXPENSE_CHANGED, refetch);
  }, [loadMonth]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(null), SAVED_MS);
    return () => window.clearTimeout(timer);
  }, [saved]);

  // Tags exist only for the PDF report today, so they are fetched only for a plan that can ask
  // for one. An account with no tagged expense gets an empty list and no tag control at all.
  const entitledToPdf = !entLoading && hasFeature("EXPORT_PDF");
  useEffect(() => {
    if (!entitledToPdf) return;
    let active = true;
    getProjects()
      .then((data) => { if (active) setProjects(data); })
      .catch(() => { if (active) setProjects([]); });
    return () => { active = false; };
  }, [entitledToPdf]);

  // Escape or a click away closes the menu; focus goes back to its button only when it was inside.
  const menuRef = useDismiss<HTMLDivElement>(
    menuOpen,
    useCallback(() => {
      if (document.getElementById(MENU_ID)?.contains(document.activeElement)) toggleRef.current?.focus();
      setMenuOpen(false);
    }, []),
  );

  /** Every month change resets what belongs to the old month: the export range and the selection. */
  const goTo = (m: string) => {
    setMonth(m);
    setExportRange(monthRange(m));
    setSelectedIds(new Set());
  };
  const atCurrentMonth = month >= manilaMonth();
  const stale = dataMonth !== month;

  const q = query.trim().toLowerCase();
  const visible = (rows ?? []).filter(
    (e) => !q || (e.description ?? "").toLowerCase().includes(q) || (e.category ?? "").toLowerCase().includes(q),
  );
  const days = byDay(visible);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeletingSelected(true);
    try {
      await Promise.all([...selectedIds].map((id) => deleteExpense(id)));
      setSelectedIds(new Set());
      await refresh();
      window.dispatchEvent(new CustomEvent(EXPENSE_CHANGED));
    } catch {
      // leave selection; user can retry
    } finally {
      setDeletingSelected(false);
    }
  };

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importExpensesCsv(file, strictImport);
      setImportResult(result);
      if (result.imported > 0) {
        await refresh();
        void loadMonth();
      }
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Import failed. Check the file format."] });
    } finally {
      setImporting(false);
    }
  };

  const runExport = async (kind: "csv" | "pdf") => {
    if (exporting || exportingPdf) return;
    const setBusy = kind === "csv" ? setExporting : setExportingPdf;
    const range = { from: exportRange.from || undefined, to: exportRange.to || undefined };
    setBusy(true);
    setExportError(null);
    try {
      if (kind === "csv") await exportExpenses(range);
      else await exportExpensesPdf({ ...range, projectId: projectId ? Number(projectId) : undefined });
    } catch {
      setExportError(`The ${kind.toUpperCase()} could not be generated. Try again in a moment.`);
    } finally {
      setBusy(false);
    }
  };

  const openAdd = () => setShowAdd(true);
  // The dialog records whatever has focus as the place to return to; the menu item is about to
  // unmount, so hand focus to the toggle first.
  const closeMenuThen = (fn: () => void) => () => {
    toggleRef.current?.focus();
    setMenuOpen(false);
    fn();
  };

  if ((!hookLoaded && !error) || (hookLoaded && rows === null && !monthError))
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-40 rounded-lg bg-surface-2" />
          <div className="h-11 w-36 rounded-full bg-surface-2" />
        </div>
        <div className="h-64 rounded-2xl bg-surface-2" />
      </div>
    );

  if (!hookLoaded)
    return (
      <div className="py-8 text-center">
        <p role="alert" className="text-danger">{error}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void refresh()}>Try again</Button>
      </div>
    );

  // Just saved counts as not empty: the hook's count catches up on its own refetch.
  const firstRun = total === 0 && !saved;

  const modal = (showAdd || editing !== null) && (
    <ExpenseModal
      expense={editing ?? undefined}
      onSave={async (data) => {
        if (editing) {
          await update(editing.id, data);
        } else {
          // Read before the save: afterwards the account always holds one expense (R23).
          const first = hookLoaded && total === 0;
          const created = await add(data);
          setSaved({ first });
          // A back-dated expense lands in its own month; show that month rather than nothing.
          const filed = created.date?.slice(0, 7);
          if (filed && filed !== month) goTo(filed);
        }
        setEditing(null);
        setShowAdd(false);
      }}
      onClose={() => {
        setEditing(null);
        setShowAdd(false);
      }}
    />
  );

  if (firstRun)
    return (
      <div className="space-y-8">
        <PageHeader title="Expenses" />
        <EmptyState
          title="No expenses yet"
          body="Log what you spend and this page groups your month by day, with each day's total."
          action={{ label: "Log your first expense", onClick: openAdd }}
        />
        {modal}
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle={<span>{total} total entries</span>} />

      {/* Pinned under the 72px nav. Solid page colour, so rows scrolling beneath stay legible. */}
      <div className="sticky top-[72px] z-20 -mx-6 border-b border-edge-2 bg-page px-6 py-3 md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-72">
            <label className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" />
              <input
                type="search"
                aria-label="Search expenses"
                placeholder="Search description or category"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIds(new Set()); }}
                className="h-10 w-full rounded-full border border-edge-input bg-input pl-9 pr-4 text-sm text-ink placeholder:text-ink-2"
              />
            </label>
            <div ref={menuRef} className="relative">
              {/* Inside the dismiss root, so choosing a file does not close the menu, and outside the
                  panel, so it stays mounted when the menu does close. */}
              {features?.csvImport && (
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvChange} />
              )}
              <button
                ref={toggleRef}
                type="button"
                aria-label="More actions"
                title="More actions"
                aria-expanded={menuOpen}
                aria-controls={MENU_ID}
                onClick={() => setMenuOpen((o) => !o)}
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-edge-input bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-hi"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  id={MENU_ID}
                  className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-3 rounded-2xl border border-edge bg-surface p-3 shadow-lg"
                >
                  <fieldset className="space-y-2">
                    <legend className={`${labelClass} mb-2 px-1`}>Export</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="block px-1 text-xs text-ink-2">From</span>
                        <input
                          type="date"
                          aria-label="Export from"
                          value={exportRange.from}
                          onChange={(e) => setExportRange((r) => ({ ...r, from: e.target.value }))}
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block px-1 text-xs text-ink-2">To</span>
                        <input
                          type="date"
                          aria-label="Export to"
                          value={exportRange.to}
                          onChange={(e) => setExportRange((r) => ({ ...r, to: e.target.value }))}
                          className={inputClass}
                        />
                      </label>
                    </div>
                    {canExportPdf && projects.length > 0 && (
                      <label className="block space-y-1">
                        <span className="block px-1 text-xs text-ink-2">Tag</span>
                        <select
                          aria-label="Tag"
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">All tags</option>
                          {projects.map((p) => (
                            <option key={p.id} value={String(p.id)}>{p.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button type="button" className={menuItemClass} aria-disabled={exporting} onClick={() => void runExport("csv")}>
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {exporting ? "Exporting…" : "Export CSV"}
                    </button>
                    {canExportPdf && (
                      <button type="button" className={menuItemClass} aria-disabled={exportingPdf} onClick={() => void runExport("pdf")}>
                        {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        {exportingPdf ? "Exporting…" : "Export PDF"}
                      </button>
                    )}
                  </fieldset>
                  {features?.csvImport && (
                    <div className="space-y-1 border-t border-edge-2 pt-3">
                      <button
                        type="button"
                        className={menuItemClass}
                        aria-disabled={importing}
                        onClick={() => { if (!importing) csvInputRef.current?.click(); }}
                      >
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {importing ? "Importing…" : "Import CSV"}
                      </button>
                      <div className="flex items-center justify-between px-3">
                        <label className="inline-flex min-h-10 cursor-pointer select-none items-center gap-2 text-sm text-ink-2" title="Reject the whole file if any row is invalid">
                          <input
                            type="checkbox"
                            checked={strictImport}
                            onChange={(e) => setStrictImport(e.target.checked)}
                            className="h-4 w-4 rounded accent-brand"
                          />
                          Strict import
                        </label>
                        <IconButton
                          type="button"
                          onClick={closeMenuThen(() => setShowFormatHelp(true))}
                          aria-label="CSV format help"
                          title="CSV format help"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-edge-2 pt-3">
                    <button
                      type="button"
                      className={`${menuItemClass} text-danger`}
                      onClick={closeMenuThen(() => setConfirmDeleteAll(true))}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete all
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center rounded-full border border-edge-input bg-surface p-0.5">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goTo(shiftMonth(month, -1))}
              className={STEP_CLASS}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span aria-live="polite" className="px-1 text-center text-sm font-medium text-ink-hi sm:min-w-[9rem]">
              {formatMonth(month)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              // aria-disabled, not disabled: a disabled button drops focus the moment the step
              // that reached the current month lands.
              onClick={() => { if (!atCurrentMonth) goTo(shiftMonth(month, 1)); }}
              aria-disabled={atCurrentMonth}
              className={STEP_CLASS}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* R26: the save's reward, beside the button that started it. Reserved, so it never shifts the bar. */}
            <span className="grid h-10 w-10 place-items-center">
              {saved &&
                (saved.first ? (
                  <Celebrate event="first-expense" size={40} fallback={<Piso state="saved" size={40} />} />
                ) : (
                  <Piso state="saved" size={40} />
                ))}
            </span>
            <Button onClick={openAdd} aria-label="Add Expense">
              <Plus className="h-[15px] w-[15px]" aria-hidden="true" />
              Add<span className="hidden sm:inline"> Expense</span>
            </Button>
          </div>
        </div>
      </div>

      {exportError && (
        <p role="alert" className="text-sm text-danger">
          {exportError}
        </p>
      )}

      {monthError && (
        <p role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">
          {monthError}
          <button type="button" onClick={() => void loadMonth()} className="cursor-pointer text-ink-hi underline underline-offset-2">
            Try again
          </button>
        </p>
      )}

      {importResult && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            importResult.errors.length > 0
              ? "border-warn-edge bg-warn-bg text-warn-ink"
              : "border-brand/30 bg-green-soft text-deep"
          }`}
        >
          <div className="flex-1">
            <p className="font-medium">
              {importResult.imported} expense{importResult.imported !== 1 ? "s" : ""} imported
              {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
              {importResult.errors.length > 0 && `, ${importResult.errors.length} not imported`}
            </p>
            {importResult.errors.length > 0 && (
              <p className="mt-1 text-xs">
                Some rows couldn’t be imported. Check the format (amount required, one row per expense) or download the template.
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setImportResult(null)}
            className="cursor-pointer text-base leading-none opacity-70 transition-opacity hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {rows !== null && (
        <div aria-busy={stale && !monthError} inert={stale} className={stale ? "space-y-3 opacity-60 transition-opacity" : "space-y-3 transition-opacity"}>
          <SelectionBar
            count={selectedIds.size}
            noun="expense"
            deleting={deletingSelected}
            onDelete={() => void deleteSelected()}
            onClear={() => setSelectedIds(new Set())}
          />
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-edge bg-surface px-6 py-10 text-center text-sm text-ink-2">
              Nothing logged in {formatMonth(dataMonth ?? month)}.
            </p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-edge bg-surface px-6 py-10 text-center text-sm text-ink-2">
              <p>No expenses match “{query.trim()}”.</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 cursor-pointer text-ink-hi underline underline-offset-2"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-edge">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-edge-2 bg-surface-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">
                    <th className="w-10 px-5 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={visible.every((e) => selectedIds.has(e.id))}
                        onChange={(ev) => setSelectedIds(ev.target.checked ? new Set(visible.map((e) => e.id)) : new Set())}
                        className="rounded accent-brand"
                      />
                    </th>
                    <th className="px-3 py-3 text-left font-normal">Time</th>
                    <th className="px-3 py-3 text-left font-normal">Category</th>
                    <th className="px-3 py-3 text-left font-normal">Description</th>
                    <th className="px-5 py-3 text-right font-normal">Amount</th>
                    <th className="w-20 px-3 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                {days.map(([day, list]) => {
                  // R22: the server's figure, and none while a search hides some of the day's rows.
                  const dayTotal = q ? undefined : dayTotals?.get(day);
                  return (
                    <tbody key={day} className="border-t border-edge-2 first-of-type:border-t-0">
                      <tr className="bg-surface-2">
                        <th scope="rowgroup" colSpan={4} className="px-5 py-2.5 text-left font-medium text-ink-hi">
                          {formatDayMonth(day)}
                        </th>
                        <td className="whitespace-nowrap px-5 py-2.5 text-right">
                          {dayTotal != null && (
                            <>
                              <span className="sr-only">Day total </span>
                              <Amount centavos={dayTotal} />
                            </>
                          )}
                        </td>
                        <td />
                      </tr>
                      {list.map((e) => {
                        const tags = [e.expenseType === "BUSINESS" && "Business", e.reimbursable && "Reimb."].filter(Boolean);
                        return (
                          <tr key={e.id} className="group border-t border-edge-3 transition-colors hover:bg-surface-2">
                            <td className="px-5 py-3">
                              <input
                                type="checkbox"
                                aria-label={`Select ${e.description || "expense"}`}
                                checked={selectedIds.has(e.id)}
                                onChange={() => toggleSelect(e.id)}
                                className="rounded accent-brand"
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs tabular-nums text-ink-2">
                              <time dateTime={e.date}>{e.date.slice(11, 16)}</time>
                            </td>
                            <td className="px-3 py-3">
                              <CategoryChip name={e.category ?? "Uncategorized"} />
                            </td>
                            <td className="max-w-xs truncate px-3 py-3 text-ink">
                              {e.description || <span className="text-ink-2">No description</span>}
                              {tags.length > 0 && (
                                <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">
                                  {tags.join(" · ")}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right">
                              {e.currency !== "PHP" && (
                                <span className="mr-2 font-mono text-[11px] text-ink-2">
                                  {formatCurrencyAmount(e.amount, e.currency, "code")}
                                </span>
                              )}
                              <Amount centavos={e.amountInBaseCurrency} />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                                <IconButton onClick={() => setEditing(e)} aria-label="Edit" title="Edit">
                                  <Pencil className="h-4 w-4" />
                                </IconButton>
                                <IconButton onClick={() => setConfirmDelete(e.id)} aria-label="Delete" title="Delete" className="hover:text-danger">
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={showFormatHelp} onClose={() => setShowFormatHelp(false)} title="CSV import format">
        <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          <li><b>amount</b> — required, greater than 0 (currency symbols/commas are stripped).</li>
          <li><b>category</b> — optional; defaults to "Uncategorized".</li>
          <li><b>description</b> — optional.</li>
          <li><b>date</b> — optional; accepts <code>YYYY-MM-DD</code>, <code>MM/DD/YYYY</code>, <code>DD/MM/YYYY</code>, with or without time; defaults to now.</li>
          <li>Column order doesn't matter; the header row is required.</li>
          <li><b>Strict</b> mode: if any row is missing/invalid, the whole file is rejected.</li>
        </ul>
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={() => void downloadImportTemplate()}>
            <Download className="h-4 w-4" /> Download template
          </Button>
          <Button type="button" onClick={() => setShowFormatHelp(false)}>Got it</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete expense?"
        message="This action cannot be undone."
        loading={deleting}
        error={deleteError}
        onCancel={() => { setConfirmDelete(null); setDeleteError(null); }}
        onConfirm={async () => {
          if (confirmDelete === null) return;
          setDeleting(true);
          setDeleteError(null);
          try {
            await remove(confirmDelete);
            setConfirmDelete(null);
          } catch {
            setDeleteError("Could not delete that expense. Try again.");
          } finally {
            setDeleting(false);
          }
        }}
      />

      {/* Account-wide, not the month on screen: the endpoint takes no month, so the copy says so. */}
      <ConfirmDialog
        open={confirmDeleteAll}
        title="Delete all expenses?"
        message={`This will permanently remove all ${total} expenses, in every month. This action cannot be undone.`}
        confirmLabel="Delete all"
        loading={deletingAll}
        error={deleteError}
        onCancel={() => { setConfirmDeleteAll(false); setDeleteError(null); }}
        onConfirm={async () => {
          setDeletingAll(true);
          setDeleteError(null);
          try {
            await removeAll();
            setConfirmDeleteAll(false);
          } catch {
            setDeleteError("Could not delete your expenses. Try again.");
          } finally {
            setDeletingAll(false);
          }
        }}
      />

      {modal}
    </div>
  );
}
