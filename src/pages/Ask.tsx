import { useRef, useState } from "react";
import { askQuery } from "../api/ai";
import { formatCurrency } from "../lib/formatters";

interface Message {
  role: "user" | "assistant";
  content: unknown;
}

function renderAnswer(answer: unknown): React.ReactNode {
  if (answer === null || answer === undefined)
    return <span>No results found.</span>;
  if (typeof answer === "string") return <span>{answer}</span>;
  if (typeof answer === "number") return <span>{formatCurrency(answer)}</span>;
  if (Array.isArray(answer)) {
    if (answer.length === 0) return <span>No results found.</span>;
    const keys = Object.keys(answer[0] as object);
    return (
      <div className="overflow-x-auto mt-2">
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const res = await askQuery(q);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to get a response. Make sure the backend is running.";
      setError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="font-semibold text-gray-900">Ask AI</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Ask anything about your expenses in plain language.
          </p>
        </div>

        <div className="p-4 space-y-3 min-h-48 max-h-96 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-10">
              Your conversation will appear here.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-xl px-4 py-2 max-w-[85%] text-sm ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.role === "user" ? (
                  <span>{m.content as string}</span>
                ) : (
                  renderAnswer(m.content)
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-2 text-sm text-gray-400">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <form onSubmit={submit} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How much did I spend on food this month?"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Ask
            </button>
          </form>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <strong>Try asking:</strong> "What did I spend most on?", "Total expenses
        this month", "List all food expenses over ₱500"
      </div>
    </div>
  );
}