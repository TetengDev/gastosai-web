import { useCallback, useEffect, useState } from "react";
import { AI_SETTINGS_CHANGED_EVENT, clearAiKey, getAiSettings, updateAiSettings } from "../api/aiSettings";
import { Button } from "./ui";

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
    <section className="mt-6 rounded-2xl border border-edge bg-surface p-8">
      <div className="font-display text-[21px] font-medium tracking-tight text-ink-hi">AI Provider Key</div>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
        Use your own OpenAI API key for AI features (insights, chat, receipt scanning). Your key is
        stored encrypted and used only for your requests.
      </p>

      {!loading && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-[13.5px] ${
            openaiKeySet
              ? "border-[#1f8a5b]/30 bg-[#e7f6ee] text-[#1f8a5b]"
              : "border-warn-edge bg-warn-bg text-warn-ink"
          }`}
        >
          {openaiKeySet
            ? "Using your own OpenAI key."
            : "Using the shared key (rate-limited). Add your own for full access."}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder={openaiKeySet ? "Enter a new key to replace" : "sk-..."}
          autoComplete="off"
          className="flex-1 rounded-xl border border-edge-input bg-input px-3.5 py-3 font-mono text-sm text-ink"
        />
        <Button type="button" onClick={save} disabled={saving || !keyInput.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {openaiKeySet && (
          <Button type="button" variant="ghost" onClick={remove} disabled={saving}>
            Remove
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-sm font-medium text-[#b30000]">{error}</p>}
      <p className="mt-3.5 text-[13px] text-ink-3">
        Get a key at platform.openai.com → API keys. You can remove it anytime.
      </p>
    </section>
  );
}
