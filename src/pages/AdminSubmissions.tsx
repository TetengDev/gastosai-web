import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubmissions, markSubmissionHandled, type Submission } from "../api/submissions";
import { Button } from "../components/ui";
import { formatDate } from "../lib/formatters";

export default function AdminSubmissions() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getSubmissions()
      .then(setItems)
      .catch(() => setError("Failed to load submissions."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handle = async (id: number) => {
    const updated = await markSubmissionHandled(id);
    setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  return (
    <div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink-hi">Messages</h1>
      <p className="mt-2 text-[15px] text-ink-2">Contact and suggestion submissions from users.</p>

      {loading && <p className="mt-8 text-sm text-ink-3">Loading…</p>}
      {error && <p className="mt-8 text-sm text-[#b30000]">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="mt-8 text-sm text-ink-3">No messages yet.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-8 space-y-4">
          {items.map((s) => (
            <div key={s.id} className={`rounded-2xl border border-edge bg-surface p-5 ${s.handled ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">
                    {s.type}
                  </span>
                  <span className="text-xs text-ink-3">{formatDate(s.createdAt)}</span>
                </div>
                {!s.handled && (
                  <Button variant="secondary" onClick={() => void handle(s.id)}>
                    Mark handled
                  </Button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[15px] text-ink">{s.message}</p>
              {(s.name || s.email) && (
                <p className="mt-2 text-xs text-ink-3">{[s.name, s.email].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
