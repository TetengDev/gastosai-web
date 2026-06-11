import { useCallback, useEffect, useState } from "react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
  createBudget,
  deleteAllBudgets,
  deleteBudget,
  getBudgets,
  updateBudget,
} from "../api/budgets";
import { createCategory, getCategories } from "../api/categories";
import type { BudgetResponse } from "../api/types";
import type { Category } from "../api/types";
import CategoryCombobox from "../components/CategoryCombobox";
import { formatCurrency, formatMonth } from "../lib/formatters";

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
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  const openAdd = () => {
    setEditing(null);
    setSelectedCategoryName("");
    setCategoryId("");
    setAmountLimit("");
    setModalMonth(month);
    setModalError(null);
    setModalOpen(true);
  };

  const openEdit = (budget: BudgetResponse) => {
    setEditing(budget);
    setSelectedCategoryName(budget.categoryName);
    setCategoryId(budget.categoryId);
    setAmountLimit(String(budget.amountLimit));
    setModalMonth(budget.month);
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setSelectedCategoryName("");
    setCategoryId("");
    setAmountLimit("");
    setModalError(null);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryId === "") {
      setModalError("Please select a category.");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        categoryId: Number(categoryId),
        month: modalMonth,
        amountLimit: parseFloat(amountLimit),
      };
      if (editing) {
        const updated = await updateBudget(editing.id, payload);
        setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        const created = await createBudget(payload);
        setBudgets((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; detail?: string } } })
          ?.response?.data?.message ?? "Failed to save. Check your input.";
      setModalError(msg);
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
    } catch {
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-36 bg-gray-200 dark:bg-gray-800 rounded-lg" />
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
            Budgets
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {budgets.length} {budgets.length === 1 ? "budget" : "budgets"} for {formatMonth(month)}
            </p>
            {budgets.length > 0 && (
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
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={() => { void load(); }}
            title="Reload"
            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            + Add Budget
          </button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-16 text-center">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
            No budgets for this month
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-5">
            Set spending limits per category to track your budget
          </p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/25"
          >
            + Set your first budget
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Budget Limit
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {budgets.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                    {b.categoryName}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300 font-semibold">
                    {formatCurrency(b.amountLimit)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(b)}
                        title="Edit"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(b)}
                        title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-5 text-lg">
              {editing ? "Edit Budget" : "Add Budget"}
            </h3>
            <form onSubmit={(e) => { void handleSave(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Category
                </label>
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
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    ⚠ This retargets the budget — only the spending limit moves.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Month
                </label>
                {editing ? (
                  <div className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100">
                    {formatMonth(modalMonth)}
                  </div>
                ) : (
                  <input
                    type="month"
                    required
                    value={modalMonth}
                    onChange={(e) => setModalMonth(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Amount Limit
                </label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step={0.01}
                  value={amountLimit}
                  onChange={(e) => setAmountLimit(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
              {modalError && (
                <p className="text-red-500 text-sm">{modalError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all font-semibold"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
              Delete budget for "{confirmDelete.categoryName}"?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              This will remove the spending limit for{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {confirmDelete.categoryName}
              </span>{" "}
              in {formatMonth(confirmDelete.month)}.
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
                onClick={() => { void handleDelete(); }}
                className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold transition-colors"
              >
                {deleting ? "Deleting..." : "Confirm"}
              </button>
            </div>
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
              Delete all budgets?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 text-center">
              All {budgets.length} {budgets.length === 1 ? "budget" : "budgets"} for{" "}
              {formatMonth(month)} will be removed. This cannot be undone.
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
                    await deleteAllBudgets(month);
                    setBudgets([]);
                    setConfirmDeleteAll(false);
                  } catch (err: unknown) {
                    const msg =
                      (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                      ?? "Failed to delete all budgets.";
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
