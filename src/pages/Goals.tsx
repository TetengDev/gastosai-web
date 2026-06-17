import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createGoal, deleteGoal, getGoals, updateGoal, type Goal, type GoalRequest } from "../api/goals";
import CurrencySelect from "../components/CurrencySelect";
import { Button, ConfirmDialog, IconButton, Modal, PageHeader, ProgressBar, SelectionBar } from "../components/ui";
import { useMultiSelect } from "../hooks/useMultiSelect";
import { formatCurrency } from "../lib/formatters";

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱", USD: "$", EUR: "€", SGD: "S$", JPY: "¥", GBP: "£", AUD: "A$",
};

function formatGoalAmount(amount: number, currency: string): string {
  if (currency === "PHP") return formatCurrency(amount);
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${sym}${amount.toFixed(2)}`;
}

const STATUS_LABEL: Record<Goal["status"], string> = {
  ON_TRACK: "On Track",
  BEHIND: "Behind",
  COMPLETED: "Completed",
  PAUSED: "Paused",
};

const STATUS_BADGE: Record<Goal["status"], string> = {
  ON_TRACK: "bg-[#e7f6ee] text-[#1f8a5b] dark:bg-[#1f8a5b]/20 dark:text-[#7fd6b8]",
  BEHIND: "bg-warn-bg text-warn-ink",
  COMPLETED: "bg-[#e7f6ee] text-[#1f8a5b] dark:bg-[#1f8a5b]/20 dark:text-[#7fd6b8]",
  PAUSED: "bg-surface-2 text-ink-3",
};

const STATUS_COLOR: Record<Goal["status"], string> = {
  ON_TRACK: "#1f8a5b",
  BEHIND: "#e8590c",
  COMPLETED: "#1f8a5b",
  PAUSED: "#c4c4cc",
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
  currency: "PHP",
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
  const [conflict, setConflict] = useState<Goal | null>(null);

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
    setConflict(null);
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
      currency: goal.currency ?? "PHP",
    });
    setModalError(null);
    setConflict(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalError(null);
    setConflict(null);
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
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409 && !editing) {
        const existing = goals.find((g) => g.name.trim().toLowerCase() === form.name.trim().toLowerCase()) ?? null;
        setConflict(existing);
        setModalError(`A goal named "${form.name.trim()}" already exists.`);
      } else {
        setModalError("Failed to save goal.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAnyway = async () => {
    setSaving(true);
    setModalError(null);
    try {
      const created = await createGoal(form, true);
      setGoals((prev) => [created, ...prev]);
      closeModal();
      window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
    } catch {
      setModalError("Failed to save goal.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExisting = async () => {
    if (!conflict) return;
    setSaving(true);
    setModalError(null);
    try {
      const updated = await updateGoal(conflict.id, form);
      setGoals((prev) => prev.map((g) => (g.id === conflict.id ? updated : g)));
      closeModal();
      window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
    } catch {
      setModalError("Failed to update goal.");
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

  const sel = useMultiSelect(goals.map((g) => g.id));
  const [deletingSelected, setDeletingSelected] = useState(false);
  const deleteSelected = async () => {
    const ids = sel.selectedIds;
    setDeletingSelected(true);
    const results = await Promise.allSettled(ids.map((id) => deleteGoal(id)));
    const okIds = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    setGoals((prev) => prev.filter((g) => !okIds.has(g.id)));
    sel.replace(ids.filter((id) => !okIds.has(id)));
    if (okIds.size > 0) window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
    setDeletingSelected(false);
  };

  const inputClass = "w-full rounded-xl border border-edge-input bg-input px-3 py-2.5 text-sm text-ink";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  if (loading)
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-28 rounded-lg bg-surface-2" />
          <div className="h-11 w-32 rounded-full bg-surface-2" />
        </div>
        <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-2" />
          ))}
        </div>
      </div>
    );
  if (error) return <p className="py-8 text-center text-[#b30000]">{error}</p>;

  const activeCount = goals.filter((g) => g.status !== "COMPLETED" && g.status !== "PAUSED").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Goals"
        subtitle={
          goals.length > 0 ? (
            <span>
              {activeCount} active · {goals.filter((g) => g.status === "COMPLETED").length} completed
            </span>
          ) : undefined
        }
        actions={
          <>
            <IconButton onClick={() => void load()} title="Reload">
              <RotateCcw className="h-4 w-4" />
            </IconButton>
            <Button onClick={openAdd}>
              <Plus className="h-[15px] w-[15px]" />
              Add Goal
            </Button>
          </>
        }
      />

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface p-16 text-center">
          <p className="mb-3 text-4xl">🎯</p>
          <p className="text-lg font-semibold text-ink-hi">No goals yet</p>
          <p className="mb-5 mt-1 text-sm text-ink-3">Set a savings goal and track your progress</p>
          <Button onClick={openAdd}>
            <Plus className="h-[15px] w-[15px]" />
            Add your first goal
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <SelectionBar count={sel.count} onDelete={() => void deleteSelected()} onClear={sel.clear} deleting={deletingSelected} noun="goal" />
          <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className={`group rounded-2xl border bg-surface p-7 transition-shadow hover:shadow-md ${sel.selected.has(goal.id) ? "border-[#1f8a5b] ring-1 ring-[#1f8a5b]" : "border-edge"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <input type="checkbox" aria-label={`Select ${goal.name}`} checked={sel.selected.has(goal.id)} onChange={() => sel.toggle(goal.id)} className="rounded accent-[#1f8a5b]" />
                  <h3 className="flex-1 truncate font-display text-[23px] font-medium tracking-tight text-ink-hi">
                    {goal.name}
                  </h3>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium ${STATUS_BADGE[goal.status]}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[goal.status] }} />
                    {STATUS_LABEL[goal.status]}
                  </span>
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton onClick={() => openEdit(goal)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton onClick={() => setConfirmDelete(goal)} title="Delete" className="hover:text-[#b30000]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-baseline justify-between">
                <span className="font-display text-[18px] font-medium text-deep">
                  {formatGoalAmount(goal.savedAmount, goal.currency ?? "PHP")}{" "}
                  <span className="text-sm font-normal text-ink-2">saved</span>
                </span>
                <span className="font-mono text-sm text-ink-2">{goal.progressPercent}%</span>
              </div>
              <ProgressBar
                percent={goal.progressPercent}
                color={STATUS_COLOR[goal.status]}
                className="mt-3"
              />
              <div className="mt-4 flex items-center justify-between text-[13.5px] text-ink-2">
                <span>Target: {formatGoalAmount(goal.targetAmount, goal.currency ?? "PHP")}</span>
                {goal.targetDate && <span>By {formatTargetDate(goal.targetDate)}</span>}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Goal" : "Add Goal"}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Goal Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Emergency Fund"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <CurrencySelect value={form.currency ?? "PHP"} onChange={(c) => setForm((f) => ({ ...f, currency: c }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Target Amount ({CURRENCY_SYMBOLS[form.currency ?? "PHP"] ?? form.currency})
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.targetAmount || ""}
                onChange={(e) => setForm((f) => ({ ...f, targetAmount: parseFloat(e.target.value) || 0 }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Saved So Far ({CURRENCY_SYMBOLS[form.currency ?? "PHP"] ?? form.currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.savedAmount || ""}
                onChange={(e) => setForm((f) => ({ ...f, savedAmount: parseFloat(e.target.value) || 0 }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>
              Target Date <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <input
              type="date"
              value={form.targetDate ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value || null }))}
              className={inputClass}
            />
          </div>
          {editing && (
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.paused}
                onChange={(e) => setForm((f) => ({ ...f, paused: e.target.checked }))}
                className="h-4 w-4 rounded accent-[#1f8a5b]"
              />
              <span className="text-sm text-ink">Pause this goal</span>
            </label>
          )}
        </div>

        {modalError && <p className="mt-4 text-sm text-[#b30000]">{modalError}</p>}

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>
            Cancel
          </Button>
          {modalError && conflict !== null && !editing ? (
            <>
              <Button className="flex-1" disabled={saving} onClick={handleUpdateExisting}>
                {saving ? "…" : "Update existing"}
              </Button>
              <Button variant="secondary" className="flex-1" disabled={saving} onClick={handleCreateAnyway}>
                Create anyway
              </Button>
            </>
          ) : (
            <Button className="flex-1" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Goal"}
            </Button>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete goal?"
        message={
          confirmDelete ? (
            <>
              <span className="font-medium text-ink">{confirmDelete.name}</span> will be permanently removed.
            </>
          ) : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
