import { ChevronDown, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createGoal, deleteGoal, getGoals, updateGoal, type Goal, type GoalRequest } from "../api/goals";
import Piso from "../brand/Piso";
import CurrencySelect from "../components/CurrencySelect";
import {
  Button,
  Celebrate,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  ProgressMeter,
  SelectionBar,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { hasCelebrated } from "../lib/celebrateStore";
import { goalTone, pisoMoodFor } from "../lib/pisoMood";
import { useMultiSelect } from "../hooks/useMultiSelect";
import {
  centavosToAmount,
  currencySymbol,
  formatCurrencyAmount,
  formatDateOnly,
  parseAmountToCentavos,
} from "../lib/formatters";

const STATUS_LABEL: Record<Goal["status"], string> = {
  ON_TRACK: "On Track",
  BEHIND: "Behind",
  COMPLETED: "Completed",
  PAUSED: "Paused",
};

// Tokens only. A goal filling up is good news, so on-track and completed share the brand green;
// paused text is ink-2, since ink-3 on surface-2 falls short of AA in dark.
const STATUS_BADGE: Record<Goal["status"], string> = {
  ON_TRACK: "bg-brand/10 text-deep",
  BEHIND: "bg-warn-bg text-warn-ink",
  COMPLETED: "bg-brand/10 text-deep",
  PAUSED: "bg-surface-2 text-ink-2",
};

const AMOUNT_ERROR = "Enter amounts like 10000 or 10000.50 — at most two decimal places.";

// How long a goal's cheer holds the header before the next one, or the resting face, returns.
const CELEBRATION_HOLD_MS = 1500;

/** The six fields the API takes back for a goal, read off the goal as it stands. */
const requestOf = (goal: Goal): GoalRequest => ({
  name: goal.name,
  targetAmount: goal.targetAmount,
  savedAmount: goal.savedAmount,
  targetDate: goal.targetDate,
  paused: goal.paused ?? false,
  currency: goal.currency ?? "PHP",
});

const EMPTY_FORM: GoalRequest = {
  name: "",
  targetAmount: 0,
  savedAmount: 0,
  targetDate: null,
  paused: false,
  currency: "PHP",
};

export default function Goals() {
  const account = useAuth().user?.email;
  const [goals, setGoals] = useState<Goal[]>([]);
  // `loaded` is whether any list has arrived. After that a reload is quiet: the cards stay, and a
  // failure shows inline rather than replacing a page that was working.
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalRequest>(EMPTY_FORM);
  // The two amount fields hold the text as typed. They become integer centavos once, in
  // `buildRequest`, so nothing between the keystroke and the request is a float.
  const [targetText, setTargetText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Goal | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add savings holds the goal's id, not the goal: the base for the sum is read from the list at
  // submit, so a reload while the dialog is open cannot leave it adding to a stale figure.
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addText, setAddText] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Goals the server has marked COMPLETED, waiting to cheer in the header one at a time. Only
  // unseen events get in, and the queue is state rather than a render-time read of the flag:
  // Celebrate marks the flag as it mounts, so re-reading it would pull the cheer straight back out.
  const [celebrations, setCelebrations] = useState<string[]>([]);
  const queueCelebrations = useCallback(
    (list: Goal[]) =>
      setCelebrations((queue) => {
        const fresh = list
          .filter((g) => g.status === "COMPLETED")
          .map((g) => `goal-${g.id}`)
          .filter((e) => account && !queue.includes(e) && !hasCelebrated(account, e));
        return fresh.length > 0 ? [...queue, ...fresh] : queue;
      }),
    [account],
  );
  const playing = celebrations[0];

  useEffect(() => {
    if (!playing) return;
    const next = () =>
      setCelebrations((queue) => queue.slice(1).filter((e) => !!account && !hasCelebrated(account, e)));
    const t = setTimeout(next, CELEBRATION_HOLD_MS);
    return () => clearTimeout(t);
  }, [playing, account]);

  // A save that completes a goal moves its card into the closed Achieved group, taking the control
  // that opened the dialog with it, so focus goes to the group's summary instead.
  const achievedRef = useRef<HTMLElement>(null);
  const focusAchieved = useRef(false);
  const noteCompleted = (before: Goal, after: Goal) => {
    if (after.status === "COMPLETED" && before.status !== "COMPLETED") focusAchieved.current = true;
  };
  useEffect(() => {
    if (!focusAchieved.current) return;
    focusAchieved.current = false;
    achievedRef.current?.focus();
  });

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await getGoals();
      setGoals(data);
      setLoaded(true);
      queueCelebrations(data);
    } catch {
      setError("Could not load your goals.");
    } finally {
      setRefreshing(false);
    }
  }, [queueCelebrations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTargetText("");
    setSavedText("");
    setModalError(null);
    setConflict(null);
    setModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setForm(requestOf(goal));
    setTargetText(centavosToAmount(goal.targetAmount));
    setSavedText(centavosToAmount(goal.savedAmount));
    setModalError(null);
    setConflict(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setTargetText("");
    setSavedText("");
    setModalError(null);
    setConflict(null);
  };

  /**
   * The form as the API takes it: both amounts parsed from their typed text to integer
   * centavos. Returns `null` — after setting the modal error — when either is malformed, so a
   * caller never sends an amount the user did not type.
   */
  const buildRequest = (): GoalRequest | null => {
    const targetAmount = parseAmountToCentavos(targetText);
    const savedAmount = savedText.trim() === "" ? 0 : parseAmountToCentavos(savedText);
    if (targetAmount === null || savedAmount === null) {
      setModalError(AMOUNT_ERROR);
      return null;
    }
    return { ...form, targetAmount, savedAmount };
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setModalError("Name is required."); return; }
    const request = buildRequest();
    if (!request) return;
    if (request.targetAmount <= 0) { setModalError("Target amount must be greater than 0."); return; }
    setSaving(true);
    setModalError(null);
    try {
      if (editing) {
        const updated = await updateGoal(editing.id, request);
        setGoals((prev) => prev.map((g) => (g.id === editing.id ? updated : g)));
        queueCelebrations([updated]);
        noteCompleted(editing, updated);
      } else {
        const created = await createGoal(request);
        setGoals((prev) => [created, ...prev]);
        queueCelebrations([created]);
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
    const request = buildRequest();
    if (!request) return;
    setSaving(true);
    setModalError(null);
    try {
      const created = await createGoal(request, true);
      setGoals((prev) => [created, ...prev]);
      queueCelebrations([created]);
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
    const request = buildRequest();
    if (!request) return;
    setSaving(true);
    setModalError(null);
    try {
      const updated = await updateGoal(conflict.id, request);
      setGoals((prev) => prev.map((g) => (g.id === conflict.id ? updated : g)));
      queueCelebrations([updated]);
      noteCompleted(conflict, updated);
      closeModal();
      window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
    } catch {
      setModalError("Failed to update goal.");
    } finally {
      setSaving(false);
    }
  };

  // Ignored mid-save: the answer would land in whichever dialog was open by then.
  const closeAddSavings = () => {
    if (!adding) setAddingId(null);
  };

  const openAddSavings = (goal: Goal) => {
    setAddingId(goal.id);
    setAddText("");
    setAddError(null);
  };

  /**
   * Sends the goal's new saved total: what it holds now plus the amount typed, both integer
   * centavos (R24). The server decides whether that completes the goal.
   */
  const handleAddSavings = async () => {
    if (adding) return;
    const goal = goals.find((g) => g.id === addingId);
    if (!goal) return;
    const entered = parseAmountToCentavos(addText);
    if (entered === null) { setAddError(AMOUNT_ERROR); return; }
    if (entered <= 0) { setAddError("Amount must be greater than 0."); return; }
    setAdding(true);
    setAddError(null);
    try {
      const updated = await updateGoal(goal.id, { ...requestOf(goal), savedAmount: goal.savedAmount + entered });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
      queueCelebrations([updated]);
      noteCompleted(goal, updated);
      setAddingId(null);
      window.dispatchEvent(new CustomEvent("gastosai:goal-changed"));
    } catch {
      setAddError("Could not add savings. Try again.");
    } finally {
      setAdding(false);
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

  if (!loaded && !error)
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

  // Before anything has loaded there is no page to keep; after that a failure shows inline.
  if (!loaded)
    return (
      <div className="py-8 text-center">
        <p className="mb-3 text-danger">{error}</p>
        <Button variant="secondary" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );

  // The split reads the server's status only, never progressPercent: a goal at 100% the server
  // has not closed stays in progress, with its Add savings.
  const active = goals.filter((g) => g.status !== "COMPLETED");
  const achieved = goals.filter((g) => g.status === "COMPLETED");
  const stale = refreshing;
  // Goals carry no budget bands, so the data mood is resting; a completed goal's cheer takes the
  // same slot, so the screen keeps one Piso.
  const mood = pisoMoodFor({ bands: [], hasExpenses: true });
  const moodName = playing ? "Celebrating" : "Resting";
  const addingGoal = goals.find((g) => g.id === addingId) ?? null;

  const goalCard = (goal: Goal, done: boolean) => {
    const currency = goal.currency ?? "PHP";
    const selected = sel.selected.has(goal.id);
    return (
      <div
        className={`group h-full rounded-2xl border bg-surface p-5 transition-shadow hover:shadow-md sm:p-7 ${selected ? "border-brand ring-1 ring-brand" : "border-edge"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <input type="checkbox" aria-label={`Select ${goal.name}`} checked={selected} onChange={() => sel.toggle(goal.id)} className="rounded accent-brand" />
            <h3 className="flex-1 truncate font-display text-xl font-medium tracking-tight text-ink-hi sm:text-[23px]">
              {goal.name}
            </h3>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-medium ${STATUS_BADGE[goal.status]}`}>
              {STATUS_LABEL[goal.status]}
            </span>
            {/* Revealed on hover where there is a fine pointer, and always on focus or touch. */}
            <div className="flex gap-0.5 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-fine:opacity-0">
              <IconButton onClick={() => openEdit(goal)} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton onClick={() => setConfirmDelete(goal)} title="Delete" className="hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-3">
          <span className="font-display text-[18px] font-medium text-deep">
            {formatCurrencyAmount(goal.savedAmount, currency)}{" "}
            <span className="text-sm font-normal text-ink-2">saved</span>
          </span>
          <span className="font-mono text-sm text-ink-2">{goal.progressPercent}%</span>
        </div>
        <ProgressMeter percent={goal.progressPercent} tone={goalTone(goal.status)} label={goal.name} className="mt-3" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13.5px] text-ink-2">
          <span>Target: {formatCurrencyAmount(goal.targetAmount, currency)}</span>
          {goal.targetDate && !done && <span>By {formatDateOnly(goal.targetDate)}</span>}
        </div>
        {!done && (
          <Button size="sm" className="mt-5 w-full sm:w-auto" onClick={() => openAddSavings(goal)}>
            <Plus className="h-[15px] w-[15px]" aria-hidden="true" />
            Add savings
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Below sm Piso sits above the header. Piso shows only with goals on screen: the empty state
          brings its own. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        {goals.length > 0 && (
          // While a reload is in flight the face may be about to change, so it is not announced.
          <div {...(stale ? { "aria-hidden": true } : { role: "img", "aria-label": moodName })} className="w-fit shrink-0">
            <span aria-hidden="true">
              {playing ? (
                <Celebrate key={playing} event={playing} size={64} fallback={<Piso state={mood} size={64} />} />
              ) : (
                <Piso state={mood} size={64} />
              )}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <PageHeader
            title="Goals"
            subtitle={
              goals.length > 0 ? (
                <span>
                  {active.length === 0
                    ? "Every goal reached"
                    : `${active.length} ${active.length === 1 ? "goal" : "goals"} in progress`}
                </span>
              ) : undefined
            }
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <IconButton onClick={() => void load()} title="Reload">
                  <RotateCcw className="h-4 w-4" />
                </IconButton>
                <Button onClick={openAdd}>
                  <Plus className="h-[15px] w-[15px]" />
                  Add Goal
                </Button>
              </div>
            }
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-danger">
          {error}
          <button type="button" onClick={() => void load()} className="cursor-pointer text-ink-hi underline">
            Try again
          </button>
        </p>
      )}

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface">
          <EmptyState
            title="No savings goals yet"
            body="A goal turns “I should save more” into a number you can watch move."
            action={{ label: "Add your first goal", onClick: openAdd }}
          />
        </div>
      ) : (
        <div aria-busy={stale} inert={stale} className={`space-y-6 transition-opacity ${stale ? "opacity-60" : ""}`}>
          <SelectionBar count={sel.count} onDelete={() => void deleteSelected()} onClear={sel.clear} deleting={deletingSelected} noun="goal" />
          {active.length > 0 && (
            <ul aria-label="Goals in progress" className="m-0 grid list-none grid-cols-1 gap-[22px] p-0 md:grid-cols-2">
              {active.map((goal) => (
                <li key={goal.id}>{goalCard(goal, false)}</li>
              ))}
            </ul>
          )}
          {achieved.length > 0 && (
            <details className="group/achieved">
              {/* A flex summary drops the native marker, so the chevron is the disclosure cue. */}
              <summary ref={achievedRef} className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 text-[15px] font-medium text-ink-2 hover:text-ink-hi [&::-webkit-details-marker]:hidden">
                {`Achieved (${achieved.length})`}
                <ChevronDown className="h-4 w-4 transition-transform group-open/achieved:rotate-180" aria-hidden="true" />
              </summary>
              <ul aria-label="Achieved goals" className="m-0 mt-3 grid list-none grid-cols-1 gap-[22px] p-0 md:grid-cols-2">
                {achieved.map((goal) => (
                  <li key={goal.id}>{goalCard(goal, true)}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <Modal open={addingGoal !== null} onClose={closeAddSavings} title="Add savings">
        {addingGoal && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddSavings();
            }}
          >
            <p className="mb-4 text-sm text-ink-2">
              <span className="font-medium text-ink">{addingGoal.name}</span> has{" "}
              {formatCurrencyAmount(addingGoal.savedAmount, addingGoal.currency ?? "PHP")} of{" "}
              {formatCurrencyAmount(addingGoal.targetAmount, addingGoal.currency ?? "PHP")}.
            </p>
            <label htmlFor="add-savings-amount" className={labelClass}>
              Amount in pesos
            </label>
            <input
              id="add-savings-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              autoFocus
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              aria-invalid={addError !== null}
              aria-describedby={addError ? "add-savings-error" : undefined}
              className={inputClass}
            />
            {addError && (
              <p id="add-savings-error" role="alert" className="mt-2 text-sm text-danger">
                {addError}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={closeAddSavings}>
                Cancel
              </Button>
              {/* aria-disabled, not disabled: a disabled button drops focus mid-save, and the guard
                  in the handler is what stops a second press adding the amount twice. */}
              <Button type="submit" className="flex-1 aria-disabled:cursor-not-allowed aria-disabled:opacity-50" aria-disabled={adding}>
                Add
              </Button>
            </div>
          </form>
        )}
      </Modal>

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
                Target Amount ({currencySymbol(form.currency ?? "PHP")})
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Saved So Far ({currencySymbol(form.currency ?? "PHP")})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={savedText}
                onChange={(e) => setSavedText(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>
              Target Date <span className="font-normal text-ink-2">(optional)</span>
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
                className="h-4 w-4 rounded accent-brand"
              />
              <span className="text-sm text-ink">Pause this goal</span>
            </label>
          )}
        </div>

        {modalError && <p className="mt-4 text-sm text-danger">{modalError}</p>}

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
