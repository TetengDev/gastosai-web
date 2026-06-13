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
  ShoppingBag,
  Sparkles,
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

function getCategoryIcon(cat: Category): LucideIcon {
  if (cat.icon && cat.icon in AVAILABLE_ICONS) {
    return AVAILABLE_ICONS[cat.icon];
  }
  return CATEGORY_NAME_ICON_MAP[cat.name] ?? Tag;
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
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        const created = await createCategory(payload);
        setCategories((prev) => [...prev, created]);
      }
      closeModal();
      invalidateCategoryCache();
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save. Check your input.";
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
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to delete. The category may be in use or protected.";
      setDeleteError(msg);
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  if (error)
    return <p className="text-red-500 text-center py-8">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Categories
          </h1>
          {categories.length > 0 && (
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {categories.length} categories
              </p>
              {categories.filter((c) => c.name !== "Uncategorized").length > 0 && (
                <button
                  onClick={() => setConfirmDeleteAll(true)}
                  className="inline-flex items-center gap-1 text-xs text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete All
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            + Add Category
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-16 text-center">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
            No categories yet
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-5">
            Organize your expenses by creating categories
          </p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/25"
          >
            + Create your first category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const color = getCategoryColor(cat.name);
            const isDefault = cat.name === "Uncategorized";
            const Icon = getCategoryIcon(cat);
            return (
              <div
                key={cat.id}
                className={`group relative rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-default ${color.bg} ${color.darkBg}`}
              >
                <div className="mb-3 w-9 h-9 rounded-xl bg-white/50 dark:bg-white/10 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${color.text} ${color.darkText}`} />
                </div>
                <p className={`font-semibold text-sm leading-snug ${color.text} ${color.darkText}`}>
                  {cat.name}
                </p>
                {isDefault && (
                  <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/60 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border border-white/80 dark:border-gray-700">
                    Default
                  </span>
                )}
                {!isDefault && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(cat)}
                      title="Edit"
                      className="p-1.5 bg-white/70 hover:bg-white dark:bg-gray-900/70 dark:hover:bg-gray-900 rounded-lg text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(cat)}
                      title="Delete"
                      className="p-1.5 bg-white/70 hover:bg-white dark:bg-gray-900/70 dark:hover:bg-gray-900 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-5 text-lg">
              {editing ? "Edit Category" : "New Category"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={nameInput}
                  autoFocus
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Food, Transport, Utilities"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icon{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setIconInput(iconInput === name ? "" : name)}
                      title={name}
                      className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
                        iconInput === name
                          ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              {modalError && (
                <p className="text-red-500 text-sm">{modalError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
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
              Delete "{confirmDelete.name}"?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              All expenses in this category will be moved to{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Uncategorized
              </span>. This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 mb-4">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={() => { void handleDelete(); }}
                className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold transition-colors"
              >
                {deleting ? "Deleting..." : "Delete Category"}
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
              Delete all categories?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 text-center">
              All {categories.filter((c) => c.name !== "Uncategorized").length} categories will be removed.
              Expenses will be moved to Uncategorized. This cannot be undone.
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
                    await deleteAllCategories();
                    setCategories((prev) => prev.filter((c) => c.name === "Uncategorized"));
                    setConfirmDeleteAll(false);
                    invalidateCategoryCache();
                    window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
                  } catch (err: unknown) {
                    const msg =
                      (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                      ?? "Failed to delete all categories.";
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
