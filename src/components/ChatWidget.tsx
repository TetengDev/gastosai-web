import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { askQuery, askWithAttachment, type ChatMode } from "../api/ai";
import { importExpensesCsv } from "../api/expenses";
import { useAuth } from "../context/AuthContext";
import { useFeatures } from "../hooks/useFeatures";
import { formatCurrency, formatDate } from "../lib/formatters";

interface Message {
  role: "user" | "assistant";
  content: unknown;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentName?: string;
}

interface ModeTheme {
  headerGradient: string;
  avatarGradient: string;
  userBubble: string;
  activePill: string;
  inactivePill: string;
  sendBtn: string;
  fabGradient: string;
  fabShadow: string;
  chip: string;
  inputRing: string;
  accentText: string;
  msgBg: string;
  typingDot: string;
}

const MODE_THEMES: Record<ChatMode, ModeTheme> = {
  plain: {
    headerGradient: "from-violet-600 to-indigo-700",
    avatarGradient: "from-violet-600 to-indigo-600",
    userBubble: "from-violet-600 to-indigo-600",
    activePill: "bg-white/25 text-white shadow-sm",
    inactivePill: "text-white/70 hover:text-white hover:bg-white/15",
    sendBtn: "from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700",
    fabGradient: "from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700",
    fabShadow: "shadow-indigo-500/40 hover:shadow-indigo-500/50",
    chip: "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100",
    inputRing: "focus:ring-indigo-500",
    accentText: "text-indigo-700",
    msgBg: "bg-gray-50/30",
    typingDot: "bg-indigo-400",
  },
  professional: {
    headerGradient: "from-slate-700 to-slate-900",
    avatarGradient: "from-slate-500 to-slate-700",
    userBubble: "from-slate-600 to-slate-800",
    activePill: "bg-white/20 text-white shadow-sm",
    inactivePill: "text-white/60 hover:text-white hover:bg-white/15",
    sendBtn: "from-slate-600 to-slate-800 hover:from-slate-700 hover:to-slate-900",
    fabGradient: "from-slate-700 to-slate-900 hover:from-slate-800 hover:to-gray-950",
    fabShadow: "shadow-slate-700/50 hover:shadow-slate-800/60",
    chip: "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200",
    inputRing: "focus:ring-slate-500",
    accentText: "text-slate-800",
    msgBg: "bg-slate-50/40",
    typingDot: "bg-slate-400",
  },
  genz: {
    headerGradient: "from-pink-500 via-fuchsia-500 to-purple-600",
    avatarGradient: "from-pink-500 to-fuchsia-600",
    userBubble: "from-pink-500 to-fuchsia-500",
    activePill: "bg-white/25 text-white shadow-sm",
    inactivePill: "text-white/70 hover:text-white hover:bg-white/15",
    sendBtn: "from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600",
    fabGradient: "from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700",
    fabShadow: "shadow-pink-500/40 hover:shadow-pink-500/50",
    chip: "bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100",
    inputRing: "focus:ring-pink-500",
    accentText: "text-fuchsia-700",
    msgBg: "bg-pink-50/20",
    typingDot: "bg-pink-400",
  },
};

const MODES: { value: ChatMode; label: string; emoji: string }[] = [
  { value: "plain", label: "Plain", emoji: "📋" },
  { value: "professional", label: "Pro", emoji: "💼" },
  { value: "genz", label: "Gen Z", emoji: "✨" },
];

const SUGGESTED_PROMPTS = [
  "What did I spend most on?",
  "Total expenses this month",
  "List all expenses over ₱500",
  "How much did I spend last week?",
];

function makeWelcomeMessage(displayName?: string | null): Message {
  const greeting = displayName ? `Hi, ${displayName}!` : "Hi!";
  return {
    role: "assistant",
    content: `${greeting} I'm GastosAI. Ask me anything about your expenses in plain language.`,
    timestamp: new Date(),
  };
}

const HIDDEN_FIELDS = new Set(["id", "category_id", "categoryid"]);
const CURRENCY_KEYWORDS = ["amount", "total", "sum", "spent", "cost", "price", "fee"];

function isCurrencyKey(key: string): boolean {
  const k = key.toLowerCase();
  return CURRENCY_KEYWORDS.some((w) => k.includes(w));
}

function isDateKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes("date") || k === "created_at" || k === "updated_at";
}

function humanLabel(key: string): string {
  const labels: Record<string, string> = {
    amount: "Amount",
    description: "Description",
    category: "Category",
    date: "Date",
    total: "Total",
    month: "Month",
    name: "Category",
    count: "Count",
    note: "Note",
  };
  return (
    labels[key.toLowerCase()] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatField(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (isCurrencyKey(key)) return formatCurrency(Number(value));
  if (isDateKey(key)) return formatDate(String(value));
  return String(value);
}

function renderAnswer(answer: unknown, accentText: string): ReactNode {
  if (answer === null || answer === undefined)
    return <span>No results found.</span>;
  if (typeof answer === "string") return <span>{answer}</span>;
  if (typeof answer === "number")
    return (
      <span className={`font-semibold ${accentText}`}>
        {formatCurrency(answer)}
      </span>
    );

  if (Array.isArray(answer)) {
    if (answer.length === 0) return <span>No results found.</span>;
    const rows = answer as Record<string, unknown>[];
    const keys = Object.keys(rows[0]).filter(
      (k) => !HIDDEN_FIELDS.has(k.toLowerCase())
    );
    const isExpenseList = keys.some((k) => k.toLowerCase() === "description");

    if (isExpenseList) {
      return (
        <div className="space-y-2 mt-1 w-full">
          <p className="text-xs text-gray-400">
            {rows.length} result{rows.length !== 1 ? "s" : ""}
          </p>
          {rows.map((row, i) => (
            <div
              key={i}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug flex-1">
                  {String(row.description ?? "—")}
                </span>
                {row.amount != null && (
                  <span className={`text-sm font-semibold whitespace-nowrap shrink-0 ${accentText}`}>
                    {formatCurrency(Number(row.amount))}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                {row.category != null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${accentText} bg-opacity-10`}>
                    {String(row.category)}
                  </span>
                )}
                {row.date != null && (
                  <span className="text-xs text-gray-400">
                    {formatDate(String(row.date))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    const firstRow = rows[0];
    const labelKeys = keys.filter(
      (k) => !isCurrencyKey(k) && typeof firstRow[k] !== "number"
    );
    const metricKeys = keys.filter(
      (k) => isCurrencyKey(k) || typeof firstRow[k] === "number"
    );
    const orderedKeys = [...labelKeys, ...metricKeys];

    return (
      <div className="w-full mt-1 divide-y divide-gray-100">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2">
            {orderedKeys.map((k, ki) => (
              <span
                key={k}
                className={
                  ki === orderedKeys.length - 1
                    ? `font-semibold text-sm whitespace-nowrap ${accentText}`
                    : "text-sm text-gray-700 dark:text-gray-300 truncate"
                }
              >
                {formatField(k, row[k])}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (typeof answer === "object" && answer !== null) {
    const row = answer as Record<string, unknown>;
    const keys = Object.keys(row).filter(
      (k) => !HIDDEN_FIELDS.has(k.toLowerCase())
    );
    return (
      <div className="space-y-1.5 mt-1 w-full">
        {keys.map((k) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{humanLabel(k)}</span>
            <span className="text-sm font-medium dark:text-gray-200">{formatField(k, row[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(answer)}</span>;
}

function TypingDots({ dotClass }: { dotClass: string }) {
  return (
    <div className="flex gap-1 items-center py-0.5">
      <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] ${dotClass}`} />
      <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] ${dotClass}`} />
      <span className={`w-2 h-2 rounded-full animate-bounce ${dotClass}`} />
    </div>
  );
}

function BotAvatar({ gradient }: { gradient: string }) {
  return (
    <div className={`w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none ${gradient}`}>
      G
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25" />
    </svg>
  );
}

export default function ChatWidget() {
  const features = useFeatures();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("plain");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => [
    makeWelcomeMessage(user?.nickname || user?.name),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = MODE_THEMES[mode];

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages, loading, open]);

  const clearPendingFile = () => {
    if (pendingFileUrl) URL.revokeObjectURL(pendingFileUrl);
    setPendingFile(null);
    setPendingFileUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    clearPendingFile();
    setPendingFile(file);
    setPendingFileUrl(URL.createObjectURL(file));
  };

  const isCsvFile = (f: File): boolean =>
    f.name.endsWith(".csv") || f.type === "text/csv";

  const isImageFile = (f: File): boolean =>
    f.type.startsWith("image/");

  const sendMessage = async (q: string, file?: File) => {
    const trimmed = q.trim();
    if (!trimmed && !file || loading) return;
    const attachmentUrl = file ? URL.createObjectURL(file) : undefined;
    const defaultLabel = file
      ? isCsvFile(file) ? "Import CSV" : isImageFile(file) ? "Analyze this image" : `Attach ${file.name}`
      : "";
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmed || defaultLabel,
        timestamp: new Date(),
        attachmentUrl,
        attachmentName: file?.name,
      },
    ]);
    setQuestion("");
    clearPendingFile();
    setLoading(true);
    setError(null);
    try {
      if (file && isCsvFile(file)) {
        const result = await importExpensesCsv(file);
        const summary = `Imported ${result.imported} expense${result.imported !== 1 ? "s" : ""}${result.skipped > 0 ? `, skipped ${result.skipped}` : ""}${result.errors.length > 0 ? `\n\nErrors:\n${result.errors.join("\n")}` : ""}.`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: summary, timestamp: new Date() },
        ]);
      } else if (!file || isImageFile(file)) {
        const res = file
          ? await askWithAttachment(trimmed, file)
          : await askQuery(trimmed, mode);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.answer, timestamp: new Date() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Unsupported file type "${(file.type || file.name.split(".").pop()) ?? "unknown"}". Please attach an image for analysis or a CSV file for import.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        "Failed to get a response. Make sure the backend is running.";
      setError(msg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    void sendMessage(question, pendingFile ?? undefined);
  };

  const clearConversation = () => {
    setMessages([makeWelcomeMessage(user?.nickname || user?.name)]);
    setError(null);
    inputRef.current?.focus();
  };

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <>
      {open && (
        <div
          className={
            fullscreen
              ? "fixed inset-4 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              : "fixed bottom-24 right-6 z-50 w-96 h-[32rem] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          }
        >
          {/* Header — themed gradient */}
          <div
            className={`bg-gradient-to-r ${theme.headerGradient} px-4 py-3 flex flex-col gap-2 flex-shrink-0`}
          >
            {/* Title row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BotAvatar gradient={theme.avatarGradient} />
                <div>
                  <h2 className="font-semibold text-white text-sm leading-tight">
                    GastosAI
                  </h2>
                  <p className="text-xs text-white/60">Your expense assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 1 && (
                  <button
                    onClick={clearConversation}
                    className="text-xs text-white/70 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/15 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setFullscreen((f) => !f)}
                  aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                >
                  {fullscreen ? <CollapseIcon /> : <ExpandIcon />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mode toggle — inside header */}
            <div className="flex items-center gap-1">
              {MODES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    mode === value ? theme.activePill : theme.inactivePill
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto min-h-0 p-3 space-y-3 transition-colors duration-300 ${theme.msgBg}`}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <BotAvatar gradient={theme.avatarGradient} />
                )}
                <div
                  className={`flex flex-col gap-0.5 min-w-0 ${
                    m.role === "user"
                      ? "items-end max-w-[78%]"
                      : "items-start max-w-[88%]"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed overflow-hidden transition-colors duration-300 ${
                      m.role === "user"
                        ? `bg-gradient-to-br ${theme.userBubble} text-white rounded-br-sm`
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-700 shadow-sm w-full"
                    }`}
                  >
                    {m.role === "user" ? (
                      <div className="space-y-1.5">
                        {m.attachmentUrl && (
                          <img
                            src={m.attachmentUrl}
                            alt={m.attachmentName ?? "attachment"}
                            className="max-w-[180px] rounded-lg object-cover"
                          />
                        )}
                        {(m.content as string) !== "Analyze this image" || !m.attachmentUrl ? (
                          <span>{m.content as string}</span>
                        ) : null}
                      </div>
                    ) : (
                      renderAnswer(m.content, theme.accentText)
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">
                    {m.timestamp.toLocaleTimeString("en-PH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <BotAvatar gradient={theme.avatarGradient} />
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <TypingDots dotClass={theme.typingDot} />
                </div>
              </div>
            )}

            {showSuggestions && (
              <div className="pt-1">
                <p className="text-xs text-gray-400 mb-2 text-center">
                  Try asking:
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => void sendMessage(p)}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors ${theme.chip}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3 flex-shrink-0 bg-white dark:bg-gray-900">
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            {pendingFile && pendingFileUrl && (
              <div className="flex items-center gap-2 mb-2">
                <div className="relative inline-block">
                  <img
                    src={pendingFileUrl}
                    alt={pendingFile.name}
                    className="h-14 w-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={clearPendingFile}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-700 dark:bg-gray-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
                <span className="text-xs text-gray-400 truncate max-w-[160px]">
                  {pendingFile.name}
                </span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              {features?.chatAttachments && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.csv,.xlsx,.xls,.json,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach file"
                    title="Attach image or CSV"
                    className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-colors ${
                      pendingFile
                        ? `${theme.accentText} bg-indigo-50 dark:bg-indigo-900/20`
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                  </button>
                </>
              )}
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={pendingFile ? "Ask about this image…" : "Ask about your expenses…"}
                className={`flex-1 border border-gray-200 dark:border-gray-700 rounded-full px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${theme.inputRing}`}
              />
              <button
                type="submit"
                disabled={loading || (!question.trim() && !pendingFile)}
                aria-label="Send"
                className={`w-8 h-8 bg-gradient-to-br text-white rounded-full flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0 ${theme.sendBtn}`}
              >
                <svg
                  className="w-3.5 h-3.5 translate-x-px"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle FAB — themed */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close chat" : "Open chat"}
          className={`w-14 h-14 bg-gradient-to-br text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 ${theme.fabGradient} ${theme.fabShadow}`}
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
