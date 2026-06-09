import { useState } from "react";
import ExpenseModal from "../components/ExpenseModal";
import type { Expense } from "../api/types";
import { useExpenses } from "../hooks/useExpenses";
import { formatCurrency, formatDate } from "../lib/formatters";

export default function Expenses() {
  const { expenses, loading, error, add, update, remove } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (loading)
    return (
      <div className="flex justify-center py-20 text-gray-400">Loading...</div>
    );
  if (error)
    return <p className="text-red-500 text-center py-8">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Add Expense
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {expenses.length === 0 ? (
          <p className="p-8 text-gray-400 text-center text-sm">
            No expenses yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {e.category}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {e.description}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-6 py-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => setEditing(e)}
                        className="text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(e.id)}
                        className="text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Delete expense?
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
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
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
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
