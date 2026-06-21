import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getChatAuditLog } from "../api/admin";
import type { ChatAuditLogDto } from "../api/types";
import { formatDate } from "../lib/formatters";

export default function AdminChatAudit() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<ChatAuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    getChatAuditLog(200)
      .then(setItems)
      .catch(() => setError("Failed to load the audit log."))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink-hi">Chat Audit</h1>
      <p className="mt-2 text-[15px] text-ink-2">Every chatbot tool invocation (most recent first).</p>

      {loading && <p className="mt-8 text-sm text-ink-3">Loading…</p>}
      {error && <p className="mt-8 text-sm text-[#b30000]">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="mt-8 text-sm text-ink-3">No audit entries yet.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-edge">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge-2 bg-surface-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  <th className="px-5 py-4 text-left font-normal">Time</th>
                  <th className="px-5 py-4 text-left font-normal">User</th>
                  <th className="px-5 py-4 text-left font-normal">Tool</th>
                  <th className="px-5 py-4 text-left font-normal">Status</th>
                  <th className="px-5 py-4 text-left font-normal">Detail</th>
                  <th className="px-5 py-4 text-left font-normal">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-edge-3 last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-ink">{formatDate(a.createdAt)}</td>
                    <td className="px-5 py-3 text-ink-2">#{a.userId}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink">{a.toolName}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${a.status === "SUCCESS" ? "bg-[#1f8a5b]/10 text-[#1f8a5b]" : "bg-[#b30000]/10 text-[#b30000]"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-ink-3">{a.detail ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-3">{a.conversationId ? "#" + a.conversationId : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
