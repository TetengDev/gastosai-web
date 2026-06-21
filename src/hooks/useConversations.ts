import { useCallback, useEffect, useState } from "react";
import { deleteConversation, listConversations } from "../api/ai";
import type { Conversation } from "../api/types";

/** Loads + manages the signed-in user's chat conversation list (history drawer). */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConversations(await listConversations());
    } catch {
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const remove = async (id: number): Promise<void> => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  return { conversations, loading, error, refresh, remove };
}
