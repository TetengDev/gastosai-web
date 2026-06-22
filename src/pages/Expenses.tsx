import { Download, HelpCircle, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ExpenseModal from "../components/ExpenseModal";
import { deleteExpense, downloadImportTemplate, exportExpenses, getExpenses, importExpensesCsv, type ImportResult } from "../api/expenses";
import type { Expense } from "../api/types";
import { useExpenses } from "../hooks/useExpenses";
import { useFeatures } from "../hooks/useFeatures";
import { Button, ConfirmDialog, IconButton, Modal, PageHeader } from "../components/ui";
import { formatCurrency, formatDate } from "../lib/formatters";
import CategoryChip from "../components/CategoryChip";

export default function Expenses() {
  const features = useFeatures();
  const { expenses, loading, loadingMore, error, total, hasMore, add, update, remove, removeAll, refresh, loadMore } = useExpenses();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[] | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [strictImport, setStrictImport] = useState(false);
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [isFetchingFilter, setIsFetchingFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

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
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
    } catch {
      // leave selection; user can retry
    } finally {
      setDeletingSelected(false);
    }
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!from && !to) {
        setFilteredExpenses(null);
        setIsFetchingFilter(false);
        return;
      }
      setIsFetchingFilter(true);
      getExpenses({ from: from || undefined, to: to || undefined })
        .then((data) => { if (active) setFilteredExpenses(data); })
        .catch(() => { if (active) setFilteredExpenses([]); })
        .finally(() => { if (active) setIsFetchingFilter(false); });
    }, 350);
    return () => { clearTimeout(timer); active = false; };
  }, [from, to]);

  const displayExpenses = (from || to) ? (filteredExpenses ?? expenses) : expenses;

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importExpensesCsv(file, strictImport);
      setImportResult(result);
      if (result.imported > 0) await refresh();
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Import failed. Check the file format."] });
    } finally {
      setImporting(false);
    }
  };

  const clearFilter = () => { setFrom(""); setTo(""); setFilteredExpenses(null); setIsFetchingFilter(false); };

  const inputClass =
    "rounded-lg border border-edge-input bg-input px-3 py-2 text-sm text-ink";
  const labelClass = "font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3";

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
  if (error) return <p className="py-8 text-center text-[#b30000]">{error}</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expenses"
        subtitle={
          total > 0 ? (
            <span>
              {(from || to) ? `${displayExpenses.length} of ${total}` : `${total} total`} entries
            </span>
          ) : undefined
        }
        onDeleteAll={total > 0 ? () => setConfirmDeleteAll(true) : undefined}
        actions={
          <>
            {features?.csvImport && (
              <>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCsvChange}
                />
                <Button variant="secondary" onClick={() => csvInputRef.current?.click()} disabled={importing}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? "Importing…" : "Import CSV"}
                </Button>
                <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-ink-2" title="Reject the whole file if any row is invalid">
                  <input
                    type="checkbox"
                    checked={strictImport}
                    onChange={(e) => setStrictImport(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[#1f8a5b]"
                  />
                  Strict
                </label>
                <IconButton type="button" onClick={() => setShowFormatHelp(true)} aria-label="CSV format help" title="CSV format help">
                  <HelpCircle className="h-4 w-4" />
                </IconButton>
              </>
            )}
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-[15px] w-[15px]" />
              Add Expense
            </Button>
          </>
        }
      />

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-4">
        <span className={labelClass}>From</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        <span className={labelClass}>To</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        {isFetchingFilter && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" />}
        {(from || to) && !isFetchingFilter && (
          <button onClick={clearFilter} className="text-sm text-ink-3 transition-colors hover:text-ink">
            Clear
          </button>
        )}
        {total > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportExpenses({ from: from || undefined, to: to || undefined });
              } catch {
                // silent fail
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        )}
      </div>

      {importResult && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            importResult.errors.length > 0
              ? "border-warn-edge bg-warn-bg text-warn-ink"
              : "border-[#1f8a5b]/30 bg-[#e7f6ee] text-[#1f8a5b]"
          }`}
        >
          <div className="flex-1">
            <p className="font-medium">
              {importResult.imported} expense{importResult.imported !== 1 ? "s" : ""} imported
              {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
              {importResult.errors.length > 0 && `, ${importResult.errors.length} not imported`}
            </p>
            {importResult.errors.length > 0 && (
              <p className="mt-1 text-xs opacity-80">
                Some rows couldn’t be imported. Check the format (amount required, one row per expense) or download the template.
              </p>
            )}
          </div>
          <button onClick={() => setImportResult(null)} className="text-base leading-none opacity-60 transition-opacity hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {total === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface p-16 text-center">
          <p className="mb-3 text-4xl">🧾</p>
          <p className="text-lg font-semibold text-ink-hi">No expenses yet</p>
          <p className="mb-5 mt-1 text-sm text-ink-3">Track your first expense and see your spending patterns</p>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-[15px] w-[15px]" />
            Add your first expense
          </Button>
        </div>
      ) : displayExpenses.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface p-12 text-center">
          <p className="mb-3 text-3xl">🔍</p>
          <p className="font-semibold text-ink-hi">No expenses match this filter</p>
          <button onClick={clearFilter} className="mt-3 text-sm text-link hover:underline">
            Clear filter
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-edge">
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between border-b border-edge-2 bg-[#b30000]/5 px-6 py-2.5">
              <span className="text-sm text-ink">{selectedIds.size} selected</span>
              <Button variant="danger" size="sm" onClick={deleteSelected} disabled={deletingSelected}>
                <Trash2 className="h-3.5 w-3.5" />
                {deletingSelected ? "Deleting…" : `Delete selected (${selectedIds.size})`}
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge-2 bg-surface-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  <th className="w-10 px-5 py-4">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={displayExpenses.length > 0 && displayExpenses.every((e) => selectedIds.has(e.id))}
                      onChange={(ev) => setSelectedIds(ev.target.checked ? new Set(displayExpenses.map((e) => e.id)) : new Set())}
                      className="rounded accent-[#1f8a5b]"
                    />
                  </th>
                  <th className="px-5 py-4 text-left font-normal">Date &amp; time</th>
                  <th className="px-5 py-4 text-left font-normal">Category</th>
                  <th className="px-5 py-4 text-left font-normal">Description</th>
                  <th className="px-5 py-4 text-left font-normal">Type</th>
                  <th className="px-5 py-4 text-right font-normal">Amount</th>
                  <th className="w-16 px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {displayExpenses.map((e) => {
                  const typeLabel = e.expenseType === "BUSINESS" ? "Business" : "Personal";
                  return (
                    <tr key={e.id} className="group border-b border-edge-3 transition-colors last:border-0 hover:bg-surface-2">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${e.description || "expense"}`}
                          checked={selectedIds.has(e.id)}
                          onChange={() => toggleSelect(e.id)}
                          className="rounded accent-[#1f8a5b]"
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-ink">{formatDate(e.date)}</td>
                      <td className="px-5 py-4">
                        <CategoryChip name={e.category ?? "Uncategorized"} />
                      </td>
                      <td className="max-w-xs truncate px-5 py-4 text-ink">
                        {e.description || <span className="text-ink-3">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-[11px] uppercase tracking-[0.06em]">
                        <span className={e.expenseType === "BUSINESS" ? "text-link" : "text-ink-3"}>
                          {typeLabel}
                        </span>
                        {e.reimbursable && <span className="text-ink-3"> · Reimb.</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span className="inline-flex items-center justify-end gap-2">
                          {e.currency !== "PHP" && (
                            <span className="rounded-md bg-link/10 px-1.5 py-0.5 font-mono text-[11px] text-link">
                              {e.currency} {e.amount.toFixed(2)}
                            </span>
                          )}
                          <span className="font-display font-medium text-ink-hi">
                            {formatCurrency(e.amountInBaseCurrency)}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <IconButton onClick={() => setEditing(e)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton onClick={() => setConfirmDelete(e.id)} title="Delete" className="hover:text-[#b30000]">
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!(from || to) && hasMore && (
            <div className="flex items-center justify-center border-t border-edge-2 bg-surface-2 px-6 py-3">
              <Button variant="secondary" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {loadingMore ? "Loading…" : `Load more (${displayExpenses.length} of ${total})`}
              </Button>
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
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete === null) return;
          setDeleting(true);
          await remove(confirmDelete);
          setConfirmDelete(null);
          setDeleting(false);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        title="Delete all expenses?"
        message={`This will permanently remove all ${expenses.length} expenses. This action cannot be undone.`}
        confirmLabel="Delete all"
        loading={deletingAll}
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={async () => {
          setDeletingAll(true);
          await removeAll();
          setConfirmDeleteAll(false);
          setDeletingAll(false);
        }}
      />

      {(showAdd || editing !== null) && (
        <ExpenseModal
          expense={editing ?? undefined}
          onSave={async (data) => {
            if (editing) {
              await update(editing.id, data);
            } else {
              await add(data);
            }
            setEditing(null);
            setShowAdd(false);
          }}
          onClose={() => {
            setEditing(null);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
