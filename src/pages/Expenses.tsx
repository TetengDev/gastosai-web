import { useRef, useState } from "react";
import ExpenseModal from "../components/ExpenseModal";
import { importExpensesCsv, type ImportResult } from "../api/expenses";
import type { Expense } from "../api/types";
import { useExpenses } from "../hooks/useExpenses";
import { useFeatures } from "../hooks/useFeatures";
import { formatCurrency, formatDate, getCategoryColor } from "../lib/formatters";

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export default function Expenses() {
  const features = useFeatures();
  const { expenses, loading, error, add, update, remove, removeAll, refresh } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importExpensesCsv(file);
      setImportResult(result);
      if (result.imported > 0) await refresh();
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Import failed. Check the file format."] });
    } finally {
      setImporting(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-10 w-36 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm h-64" />
      </div>
    );
  if (error)
    return <p className="text-red-500 text-center py-8">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Expenses
          </h1>
          {expenses.length > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {expenses.length} total entries
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {expenses.length > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              Delete All
            </button>
          )}
          {features?.csvImport && (
            <>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvChange}
              />
              <button
                onClick={() => csvInputRef.current?.click()}
                disabled={importing}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import CSV"}
              </button>
            </>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {importResult && (
        <div
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
            importResult.errors.length > 0
              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
          }`}
        >
          <div className="flex-1">
            <p className="font-medium">
              {importResult.imported} expense{importResult.imported !== 1 ? "s" : ""} imported
              {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
            </p>
            {importResult.errors.length > 0 && (
              <ul className="mt-1 text-xs space-y-0.5 opacity-80">
                {importResult.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                {importResult.errors.length > 3 && (
                  <li>…and {importResult.errors.length - 3} more</li>
                )}
              </ul>
            )}
          </div>
          <button
            onClick={() => setImportResult(null)}
            className="opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">🧾</p>
            <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
              No expenses yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-5">
              Track your first expense and see your spending patterns
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/25"
            >
              + Add your first expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">
                    Date & Time
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-5 py-3.5 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {expenses.map((e) => {
                  const color = getCategoryColor(e.category ?? "");
                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {formatDate(e.date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color.bg} ${color.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                          {e.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {e.description || (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditing(e)}
                            title="Edit"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(e.id)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <TrashIcon />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-center mb-1">
              Delete expense?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await remove(confirmDelete);
                  setConfirmDelete(null);
                  setDeleting(false);
                }}
                className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteAll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <TrashIcon />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-center mb-1">
              Delete all expenses?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
              This will permanently remove all {expenses.length} expenses. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                disabled={deletingAll}
                onClick={async () => {
                  setDeletingAll(true);
                  await removeAll();
                  setConfirmDeleteAll(false);
                  setDeletingAll(false);
                }}
                className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold transition-colors"
              >
                {deletingAll ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

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
