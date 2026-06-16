import { useCallback, useEffect, useState } from "react";
import { AI_SETTINGS_CHANGED_EVENT, clearAiKey, getAiSettings, updateAiSettings } from "../api/aiSettings";

export default function AiKeySection() {
  const [openaiKeySet, setOpenaiKeySet] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await getAiSettings();
      setOpenaiKeySet(s.openaiKeySet);
    } catch {
      setError("Failed to load AI settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const s = await updateAiSettings({ openaiApiKey: keyInput.trim() });
      setOpenaiKeySet(s.openaiKeySet);
      setKeyInput("");
      window.dispatchEvent(new CustomEvent(AI_SETTINGS_CHANGED_EVENT));
    } catch {
      setError("Failed to save key.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      const s = await clearAiKey("openai");
      setOpenaiKeySet(s.openaiKeySet);
      window.dispatchEvent(new CustomEvent(AI_SETTINGS_CHANGED_EVENT));
    } catch {
      setError("Failed to remove key.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">AI Provider Key</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Use your own OpenAI API key for AI features (insights, chat, receipt scanning). Your key is
        stored encrypted and used only for your requests.
      </p>

      {!loading && (
        <div
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            openaiKeySet
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
          }`}
        >
          {openaiKeySet
            ? "Using your own OpenAI key."
            : "Using the shared key (rate-limited). Add your own for full access."}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder={openaiKeySet ? "Enter a new key to replace" : "sk-..."}
          autoComplete="off"
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !keyInput.trim()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {openaiKeySet && (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium disabled:opacity-50 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>}
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Get a key at platform.openai.com → API keys. You can remove it anytime.
      </p>
    </section>
  );
}
