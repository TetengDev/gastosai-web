import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { askQuery, type ChatMode } from "../api/ai";
import { formatCurrency, formatDate } from "../lib/formatters";

interface Message {
  role: "user" | "assistant";
  content: unknown;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "What did I spend most on?",
  "Total expenses this month",
  "List all expenses over ₱500",
  "How much did I spend last week?",
];

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hi! I'm GastosAI. Ask me anything about your expenses in plain language.",
  timestamp: new Date(),
};

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

function renderAnswer(answer: unknown): ReactNode {
  if (answer === null || answer === undefined)
    return <span>No results found.</span>;
  if (typeof answer === "string") return <span>{answer}</span>;
  if (typeof answer === "number")
    return (
      <span className="font-semibold text-indigo-700">
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
              className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-800 font-medium leading-snug flex-1">
                  {String(row.description ?? "—")}
                </span>
                {row.amount != null && (
                  <span className="text-sm font-semibold text-indigo-600 whitespace-nowrap shrink-0">
                    {formatCurrency(Number(row.amount))}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                {row.category != null && (
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
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

    // Aggregated / summary data: label on left, metric on right
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
                    ? "font-semibold text-indigo-700 text-sm whitespace-nowrap"
                    : "text-sm text-gray-700 truncate"
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
            <span className="text-xs text-gray-500">{humanLabel(k)}</span>
            <span className="text-sm font-medium">{formatField(k, row[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(answer)}</span>;
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-0.5">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
    </div>
  );
}

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none">
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

const MODES: { value: ChatMode; label: string }[] = [
  { value: "plain", label: "Plain" },
  { value: "professional", label: "Professional" },
  { value: "genz", label: "Gen Z" },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("plain");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages, loading, open]);

  const sendMessage = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, timestamp: new Date() },
    ]);
    setQuestion("");
    setLoading(true);
    setError(null);
    try {
      const res = await askQuery(trimmed, mode);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, timestamp: new Date() },
      ]);
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
    void sendMessage(question);
  };

  const clearConversation = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setError(null);
    inputRef.current?.focus();
  };

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <>
      {/* Chat panel — independently positioned so content never affects its size */}
      {open && (
        <div
          className={
            fullscreen
              ? "fixed inset-4 z-50 bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden"
              : "fixed bottom-24 right-6 z-50 w-96 h-[32rem] bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden"
          }
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <BotAvatar />
              <div>
                <h2 className="font-semibold text-gray-900 text-sm leading-tight">
                  GastosAI
                </h2>
                <p className="text-xs text-gray-400">Your expense assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button
                  onClick={clearConversation}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setFullscreen((f) => !f)}
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {fullscreen ? <CollapseIcon /> : <ExpandIcon />}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50 flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-gray-400 mr-1 uppercase tracking-wide">Mode</span>
            {MODES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  mode === value
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3 bg-gray-50/30">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && <BotAvatar />}
                <div
                  className={`flex flex-col gap-0.5 min-w-0 ${
                    m.role === "user"
                      ? "items-end max-w-[78%]"
                      : "items-start max-w-[88%]"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed overflow-hidden ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm w-full"
                    }`}
                  >
                    {m.role === "user" ? (
                      <span>{m.content as string}</span>
                    ) : (
                      renderAnswer(m.content)
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
                <BotAvatar />
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <TypingDots />
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
                      className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 hover:bg-indigo-100 transition-colors"
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
          <div className="border-t border-gray-200 px-3 py-3 flex-shrink-0 bg-white">
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about your expenses..."
                className="flex-1 border border-gray-300 rounded-full px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                aria-label="Send"
                className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
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

      {/* Toggle button — always fixed at bottom-right, independent of panel */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close chat" : "Open chat"}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
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
