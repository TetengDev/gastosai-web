import { useCallback, useEffect, useState } from "react";
import { invalidateCategoryCache } from "../lib/cache";
import {
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Droplets,
  Dumbbell,
  Film,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Monitor,
  Music,
  Package,
  Pencil,
  Phone,
  Plane,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Utensils,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  createCategory,
  deleteAllCategories,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../api/categories";
import type { Category } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { Button, ConfirmDialog, IconButton, Modal, PageHeader, SelectionBar } from "../components/ui";
import { useMultiSelect } from "../hooks/useMultiSelect";
import { getCategoryColor } from "../lib/formatters";

const AVAILABLE_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Droplets,
  Dumbbell,
  Film,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Monitor,
  Music,
  Package,
  Phone,
  Plane,
  ShoppingBag,
  Sparkles,
  Tag,
  Utensils,
  Users,
  Wallet,
  Zap,
};

const CATEGORY_NAME_ICON_MAP: Record<string, LucideIcon> = {
  "Cleaning Essentials": Sparkles,
  "Date": Heart,
  "Extras": Package,
  "Family Contributions": Users,
  "Hygiene Essentials": Droplets,
  "Meal Plan": Utensils,
  "Monthly Personal": Wallet,
  "Monthly Utilities": Zap,
  "Training/Upskilling": GraduationCap,
  "Transaction Fees": CreditCard,
  "Transportation": Car,
  "Uncategorized": Tag,
  "Vacation": Plane,
};

function isDefaultCategory(name: string): boolean {
  return name === "Uncategorized";
}

function getCategoryIcon(cat: Category): LucideIcon {
  if (cat.icon && cat.icon in AVAILABLE_ICONS) {
    return AVAILABLE_ICONS[cat.icon];
  }
  return CATEGORY_NAME_ICON_MAP[cat.name] ?? Tag;
}

/** rgba tint (0.12) from a #rrggbb hex, matching the mock's icon tiles. */
function tint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [iconInput, setIconInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await getCategories());
    } catch {
      setError("Failed to load categories.");
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
    setNameInput("");
    setIconInput("");
    setModalError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setNameInput(cat.name);
    setIconInput(cat.icon ?? "");
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setNameInput("");
    setIconInput("");
    setModalError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      const payload = { name: nameInput.trim(), icon: iconInput || null };
      if (editing) {
        const updated = await updateCategory(editing.id, payload);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createCategory(payload);
        setCategories((prev) => [...prev, created]);
      }
      closeModal();
      invalidateCategoryCache();
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save. Check your input.";
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCategory(confirmDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setConfirmDelete(null);
      invalidateCategoryCache();
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete. The category may be in use or protected.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const customCount = categories.filter((c) => !isDefaultCategory(c.name)).length;

  const { user, updateProfile } = useAuth();
  const setDefault = async (name: string) => {
    if (!user) return;
    const next = user.defaultCategory === name ? null : name;
    try {
      await updateProfile({
        name: user.name,
        email: user.email,
        nickname: user.nickname ?? "",
        avatarColor: user.avatarColor,
        defaultCategory: next,
      });
    } catch {
      // ignore — non-critical preference
    }
  };

  const sel = useMultiSelect(categories.filter((c) => !isDefaultCategory(c.name)).map((c) => c.id));
  const [deletingSelected, setDeletingSelected] = useState(false);
  const deleteSelected = async () => {
    const ids = sel.selectedIds;
    setDeletingSelected(true);
    const results = await Promise.allSettled(ids.map((id) => deleteCategory(id)));
    const okIds = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    setCategories((prev) => prev.filter((c) => !okIds.has(c.id)));
    sel.replace(ids.filter((id) => !okIds.has(id)));
    if (okIds.size > 0) {
      invalidateCategoryCache();
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
    }
    setDeletingSelected(false);
  };

  if (loading)
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-44 rounded-lg bg-surface-2" />
          <div className="h-11 w-36 rounded-full bg-surface-2" />
        </div>
        <div className="grid grid-cols-2 gap-[18px] md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-surface-2" />
          ))}
        </div>
      </div>
    );
  if (error) return <p className="py-8 text-center text-[#b30000]">{error}</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Categories"
        subtitle={categories.length > 0 ? <span>{categories.length} categories</span> : undefined}
        onDeleteAll={customCount > 0 ? () => setConfirmDeleteAll(true) : undefined}
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-[15px] w-[15px]" />
            Add Category
          </Button>
        }
      />

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface p-16 text-center">
          <p className="mb-3 text-4xl">🏷️</p>
          <p className="text-lg font-semibold text-ink-hi">No categories yet</p>
          <p className="mb-5 mt-1 text-sm text-ink-3">Organize your expenses by creating categories</p>
          <Button onClick={openAdd}>
            <Plus className="h-[15px] w-[15px]" />
            Create your first category
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <SelectionBar count={sel.count} onDelete={() => void deleteSelected()} onClear={sel.clear} deleting={deletingSelected} noun="category" nounPlural="categories" />
          <div className="grid grid-cols-2 gap-[18px] md:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => {
            const color = getCategoryColor(cat.name).chart;
            const isDefault = isDefaultCategory(cat.name);
            const Icon = getCategoryIcon(cat);
            return (
              <div
                key={cat.id}
                className={`group relative rounded-2xl border bg-surface p-6 transition-shadow hover:shadow-md ${!isDefault && sel.selected.has(cat.id) ? "border-[#1f8a5b] ring-1 ring-[#1f8a5b]" : "border-edge"}`}
              >
                {!isDefault && (
                  <input
                    type="checkbox"
                    aria-label={`Select ${cat.name}`}
                    checked={sel.selected.has(cat.id)}
                    onChange={() => sel.toggle(cat.id)}
                    className="absolute right-3 top-3 z-10 rounded accent-[#1f8a5b]"
                  />
                )}
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: tint(color), color }}
                >
                  <Icon className="h-[22px] w-[22px]" />
                </div>
                <div className="mt-5 flex items-center gap-1.5">
                  <span className="truncate font-display text-[19px] font-medium tracking-tight text-ink-hi">
                    {cat.name}
                  </span>
                  {(() => {
                    const isPref = user?.defaultCategory === cat.name;
                    return (
                      <button
                        type="button"
                        onClick={() => void setDefault(cat.name)}
                        title={isPref ? "Default for new expenses (click to clear)" : "Set as default for new expenses"}
                        aria-label={isPref ? `${cat.name} is the default category` : `Set ${cat.name} as default`}
                        aria-pressed={isPref}
                        className={`flex shrink-0 rounded-md p-0.5 transition-colors ${isPref ? "text-[#1f8a5b]" : "text-ink-3 opacity-0 hover:text-ink-hi group-hover:opacity-100"}`}
                      >
                        <Star className="h-4 w-4" fill={isPref ? "currentColor" : "none"} />
                      </button>
                    );
                  })()}
                </div>
                {isDefault ? (
                  <div className="mt-3">
                    <span className="rounded-full border border-edge px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
                      Default
                    </span>
                  </div>
                ) : (
                  <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton onClick={() => openEdit(cat)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton onClick={() => setConfirmDelete(cat)} title="Delete" className="hover:text-[#b30000]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Category" : "New Category"} maxWidthClass="max-w-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Category Name</label>
            <input
              type="text"
              required
              maxLength={50}
              value={nameInput}
              autoFocus
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Food, Transport, Utilities"
              className="w-full rounded-xl border border-edge-input bg-input px-4 py-2.5 text-sm text-ink"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">
              Icon <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {Object.entries(AVAILABLE_ICONS).map(([name, Ic]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIconInput(iconInput === name ? "" : name)}
                  title={name}
                  className={`flex items-center justify-center rounded-xl p-2 transition-colors ${
                    iconInput === name
                      ? "bg-[#1f8a5b]/15 text-[#1f8a5b] ring-2 ring-[#1f8a5b]"
                      : "text-ink-2 hover:bg-surface-2"
                  }`}
                >
                  <Ic className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          {modalError && <p className="text-sm text-[#b30000]">{modalError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete ? `Delete "${confirmDelete.name}"?` : "Delete category?"}
        message={
          <>
            All expenses in this category will be moved to{" "}
            <span className="font-medium text-ink">Uncategorized</span>. This cannot be undone.
          </>
        }
        confirmLabel="Delete category"
        loading={deleting}
        error={deleteError}
        onCancel={() => { setConfirmDelete(null); setDeleteError(null); }}
        onConfirm={() => { void handleDelete(); }}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        title="Delete all categories?"
        message={`All ${customCount} custom categories will be removed. Expenses will be moved to Uncategorized. This cannot be undone.`}
        confirmLabel="Delete all"
        loading={deletingAll}
        error={deleteAllError}
        onCancel={() => { setConfirmDeleteAll(false); setDeleteAllError(null); }}
        onConfirm={async () => {
          setDeletingAll(true);
          setDeleteAllError(null);
          try {
            await deleteAllCategories();
            setCategories((prev) => prev.filter((c) => isDefaultCategory(c.name)));
            setConfirmDeleteAll(false);
            invalidateCategoryCache();
            window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              "Failed to delete all categories.";
            setDeleteAllError(msg);
          } finally {
            setDeletingAll(false);
          }
        }}
      />
    </div>
  );
}
