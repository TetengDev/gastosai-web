import type { Conversation } from "../api/types";

interface Props {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  loading: boolean;
  activeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Slide-over panel listing the user's past chat conversations (covers the widget body). */
export default function ChatHistoryDrawer({ open, onClose, conversations, loading, activeId, onSelect, onDelete, onNew }: Props) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">Conversations</h3>
        <button
          onClick={onClose}
          aria-label="Close history"
          className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <button
        onClick={onNew}
        className="m-3 rounded-lg border border-dashed border-edge px-3 py-2 text-sm font-medium text-link transition-colors hover:bg-surface-2"
      >
        + New conversation
      </button>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <p className="px-3 py-6 text-center text-sm text-ink-3">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-ink-3">No past conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2 ${
                c.id === activeId ? "bg-surface-2" : ""
              }`}
            >
              <button onClick={() => onSelect(c.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm text-ink">{c.title || "Untitled conversation"}</p>
                <p className="text-[11px] text-ink-3">{relativeTime(c.updatedAt)}</p>
              </button>
              <button
                onClick={() => onDelete(c.id)}
                aria-label="Delete conversation"
                className="rounded p-1 text-ink-3 opacity-0 transition-opacity hover:text-[#b30000] group-hover:opacity-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
