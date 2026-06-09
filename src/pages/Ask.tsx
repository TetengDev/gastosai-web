import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { askQuery } from "../api/ai";
import { formatCurrency } from "../lib/formatters";

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
    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none">
      G
    </div>
  );
}

function renderAnswer(answer: unknown): ReactNode {
  if (answer === null || answer === undefined)
    return <span>No results found.</span>;
  if (typeof answer === "string") return <span>{answer}</span>;
  if (typeof answer === "number") return <span>{formatCurrency(answer)}</span>;
  if (Array.isArray(answer)) {
    if (answer.length === 0) return <span>No results found.</span>;
    const keys = Object.keys(answer[0] as object);
    return (
      <div className="overflow-x-auto mt-1">
        <table className="text-xs w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              {keys.map((k) => (
                <th key={k} className="px-3 py-2 text-left text-gray-500 font-medium">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(answer as Record<string, unknown>[]).map((row, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k} className="px-3 py-2 text-gray-700">
                    {String(row[k] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <pre className="text-xs whitespace-pre-wrap">
      {JSON.stringify(answer, null, 2)}
    </pre>
  );
}

export default function Ask() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      const res = await askQuery(trimmed);
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
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <BotAvatar />
          <div>
            <h1 className="font-semibold text-gray-900 leading-tight">GastosAI</h1>
            <p className="text-xs text-gray-400">Your expense assistant</p>
          </div>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearConversation}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && <BotAvatar />}
            <div
              className={`flex flex-col gap-1 ${
                m.role === "user" ? "items-end max-w-[78%]" : "items-start max-w-[85%]"
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm"
                }`}
              >
                {m.role === "user" ? (
                  <span>{m.content as string}</span>
                ) : (
                  renderAnswer(m.content)
                )}
              </div>
              <span className="text-xs text-gray-400 px-1">
                {m.timestamp.toLocaleTimeString("en-PH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 justify-start">
            <BotAvatar />
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
              <TypingDots />
            </div>
          </div>
        )}

        {showSuggestions && (
          <div className="pt-1">
            <p className="text-xs text-gray-400 mb-2.5 text-center">Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void sendMessage(p)}
                  className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 hover:bg-indigo-100 transition-colors"
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
      <div className="border-t border-gray-200 px-4 py-3 flex-shrink-0 bg-white">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your expenses..."
            autoFocus
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            aria-label="Send"
            className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <svg
              className="w-4 h-4 translate-x-px"
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
  );
}
