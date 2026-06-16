import { useCallback, useEffect, useState } from "react";
import { AI_SETTINGS_CHANGED_EVENT, getAiSettings } from "../api/aiSettings";

/**
 * Whether AI features are usable for the current user (own key set, or shared key enabled server-side).
 * Returns null while loading. Refetches when AI settings change (AI_SETTINGS_CHANGED_EVENT).
 */
export function useAiAvailability(): boolean | null {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    getAiSettings()
      .then((s) => setAiAvailable(s.aiAvailable))
      .catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(AI_SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(AI_SETTINGS_CHANGED_EVENT, handler);
  }, [refresh]);

  return aiAvailable;
}
