import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AVATAR_COLORS, getAvatarGradient, getInitials } from "../lib/formatters";
import AiKeySection from "../components/AiKeySection";
import { startTour } from "../components/FirstRunTour";

export default function Settings() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [selectedColor, setSelectedColor] = useState<string | null>(user?.avatarColor ?? null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradient = getAvatarGradient(selectedColor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), nickname: nickname.trim(), email: email.trim(), avatarColor: selectedColor });
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
          ?.detail ??
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
          ?.message ??
        "Failed to save changes.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Manage your profile preferences.</p>

      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20`}>
            <span className="text-white text-xl font-bold select-none">
              {getInitials(user?.name ?? "")}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {user?.nickname || user?.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">Avatar Color</p>
          <div className="flex gap-2.5">
            {AVATAR_COLORS.map(({ key, from, to }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedColor(key)}
                aria-label={`Avatar color: ${key}`}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${from} ${to} transition-all ${
                  selectedColor === key || (!selectedColor && key === "violet-indigo")
                    ? "ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800 scale-110"
                    : "opacity-60 hover:opacity-100 hover:scale-105"
                }`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="profile-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              placeholder="Your full name"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label
              htmlFor="profile-nickname"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Nickname{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="profile-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
              placeholder="How the app should call you"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              When set, this is shown in the navbar and used by the chatbot to greet you.
            </p>
          </div>

          {success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Profile saved.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={saving || !name.trim() || !email.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <AiKeySection />

      <section className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Product tour</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Replay the quick walkthrough of the app.</p>
        </div>
        <button
          type="button"
          onClick={startTour}
          className="px-4 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shrink-0"
        >
          Replay tour
        </button>
      </section>
    </div>
  );
}
