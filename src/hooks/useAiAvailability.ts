import { useCallback, useEffect, useState } from "react";
import { AI_SETTINGS_CHANGED_EVENT, getAiSettings } from "../api/aiSettings";
import { VIEW_AS_CHANGED_EVENT } from "../api/entitlements";

/**
 * Whether AI features are usable for the current user (own key set, or shared key enabled server-side).
 * Returns null while loading. Honors the admin "View As: AI off" override and refetches on changes.
 */
export function useAiAvailability(): boolean | null {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    if (localStorage.getItem("gastosai:viewas:ai") === "off") {
      setAiAvailable(false);
      return;
    }
    getAiSettings()
      .then((s) => setAiAvailable(s.aiAvailable))
      .catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const handler = () => refresh();
    window.addEventListener(AI_SETTINGS_CHANGED_EVENT, handler);
    window.addEventListener(VIEW_AS_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(AI_SETTINGS_CHANGED_EVENT, handler);
      window.removeEventListener(VIEW_AS_CHANGED_EVENT, handler);
    };
  }, [refresh]);

  return aiAvailable;
}
