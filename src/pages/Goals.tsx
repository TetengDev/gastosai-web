import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createGoal, deleteGoal, getGoals, updateGoal, type Goal, type GoalRequest } from "../api/goals";
import { formatCurrency } from "../lib/formatters";

const STATUS_LABEL: Record<Goal["status"], string> = {
  ON_TRACK: "On Track",
  BEHIND: "Behind",
  COMPLETED: "Completed",
  PAUSED: "Paused",
};

const STATUS_BADGE: Record<Goal["status"], string> = {
  ON_TRACK: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  BEHIND: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  COMPLETED: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  PAUSED: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};

const STATUS_BAR: Record<Goal["status"], string> = {
  ON_TRACK: "bg-emerald-500",
  BEHIND: "bg-amber-500",
  COMPLETED: "bg-indigo-500",
  PAUSED: "bg-gray-400",
};

function formatTargetDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
}

const EMPTY_FORM: GoalRequest = {
  name: "",
  targetAmount: 0,
  savedAmount: 0,
  targetDate: null,
  paused: false,
};

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGoals(await getGoals());
    } catch {
      setError("Failed to load goals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalError(null);
    setModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      targetDate: goal.targetDate,
      paused: goal.paused ?? false,
    });
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setModalError("Name is required."); return; }
    if (!form.targetAmount || form.targetAmount <= 0) { setModalError("Target amount must be greater than 0."); return; }
    setSaving(true);
    setModalError(null);
    try {
      if (editing) {
        const updated = await updateGoal(editing.id, form);
        setGoals((prev) => prev.map((g) => (g.id === editing.id ? updated : g)));
      } else {
        const created = await createGoal(form);
        setGoals((prev) => [created, ...prev]);
      }
      closeModal();
      window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
    } catch {
      setModalError("Failed to save goal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteGoal(confirmDelete.id);
      setGoals((prev) => prev.filter((g) => g.id !== confirmDelete.id));
      setConfirmDelete(null);
      window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
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
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-10 w-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  if (error)
    return <p className="text-red-500 text-center py-8">{error}</p>;

  const activeCount = goals.filter((g) => g.status !== "COMPLETED" && g.status !== "PAUSED").length;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goals</h1>
          {goals.length > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {activeCount} active · {goals.filter((g) => g.status === "COMPLETED").length} completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            title="Reload"
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            + Add Goal
          </button>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-16 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">No goals yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-5">
            Set a savings goal and track your progress
          </p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/25"
          >
            + Add your first goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                  {goal.name}
                </h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[goal.status]}`}>
                    {STATUS_LABEL[goal.status]}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(goal)}
                      title="Edit"
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(goal)}
                      title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  <span>{formatCurrency(goal.savedAmount)} saved</span>
                  <span>{goal.progressPercent}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR[goal.status]}`}
                    style={{ width: `${Math.min(100, goal.progressPercent)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-2">
                <span>Target: {formatCurrency(goal.targetAmount)}</span>
                {goal.targetDate && (
                  <span>By {formatTargetDate(goal.targetDate)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-md mx-4 border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">
              {editing ? "Edit Goal" : "Add Goal"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Emergency Fund"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Target Amount (₱)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.targetAmount || ""}
                    onChange={(e) => setForm((f) => ({ ...f, targetAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Saved So Far (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.savedAmount || ""}
                    onChange={(e) => setForm((f) => ({ ...f, savedAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Target Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.targetDate ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value || null }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {editing && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.paused}
                    onChange={(e) => setForm((f) => ({ ...f, paused: e.target.checked }))}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Pause this goal</span>
                </label>
              )}
            </div>

            {modalError && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">{modalError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 font-semibold transition-all"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-center mb-1">
              Delete goal?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
              <strong>{confirmDelete.name}</strong> will be permanently removed.
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
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
