import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { askQuery, askWithAttachment, chatAction, type ChatMode } from "../api/ai";
import { updateBudget } from "../api/budgets";
import { getCategories } from "../api/categories";
import { createExpense, deleteExpense, importExpensesCsv, parseExpense } from "../api/expenses";
import type { ChatPreviewData, ParsedExpenseResult } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useFeatures } from "../hooks/useFeatures";
import { useAiAvailability } from "../hooks/useAiAvailability";
import { formatCurrency, formatDate } from "../lib/formatters";
import { looksLikeExpenseLog, looksLikeNlQuery } from "../lib/intentDetection";
import { TypingDots, BotAvatar, ExpandIcon, CollapseIcon } from "./chat/ChatChrome";
import { actionLabel, savedLabel, buildPreviewFields, buildConfirmMessage, dispatchDataEvents } from "./chat/chatActions";

interface Message {
  role: "user" | "assistant";
  content: unknown;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentName?: string;
  draft?: ParsedExpenseResult;
  draftSaved?: boolean;
  draftEdits?: { amount?: number; date?: string; time?: string; description?: string };
  categoryOverride?: string;
  actionType?: "success" | "error";
  actionResult?: unknown;
  actionPreview?: ChatPreviewData & { originalMessage: string };
  actionPreviewConfirmed?: boolean;
  editedParams?: Record<string, unknown>;
  disambiguateItems?: Array<{ id: number; description: string; amount: number; date: string }>;
  selectedDisambiguateIds?: number[];
  draftCancelled?: boolean;
}

interface ModeTheme {
  headerGradient: string;
  avatarGradient: string;
  userBubble: string;
  botBubble: string;
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
    headerGradient: "from-indigo-600 to-blue-700",
    avatarGradient: "from-indigo-600 to-blue-600",
    userBubble: "from-indigo-600 to-blue-600",
    botBubble: "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700",
    activePill: "bg-white/25 text-white shadow-sm",
    inactivePill: "text-white/70 hover:text-white hover:bg-white/15",
    sendBtn: "from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700",
    fabGradient: "from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700",
    fabShadow: "shadow-indigo-500/40 hover:shadow-indigo-500/50",
    chip: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-800/50",
    inputRing: "focus:ring-indigo-500",
    accentText: "text-indigo-700 dark:text-indigo-400",
    msgBg: "bg-gray-50/30",
    typingDot: "bg-indigo-400",
  },
  professional: {
    headerGradient: "from-slate-700 to-slate-900",
    avatarGradient: "from-slate-500 to-slate-700",
    userBubble: "from-slate-600 to-slate-800",
    botBubble: "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700",
    activePill: "bg-white/20 text-white shadow-sm",
    inactivePill: "text-white/60 hover:text-white hover:bg-white/15",
    sendBtn: "from-slate-600 to-slate-800 hover:from-slate-700 hover:to-slate-900",
    fabGradient: "from-slate-700 to-slate-900 hover:from-slate-800 hover:to-gray-950",
    fabShadow: "shadow-slate-700/50 hover:shadow-slate-800/60",
    chip: "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700",
    inputRing: "focus:ring-slate-500",
    accentText: "text-slate-800 dark:text-slate-200",
    msgBg: "bg-slate-50/40",
    typingDot: "bg-slate-400",
  },
  genz: {
    headerGradient: "from-pink-500 via-fuchsia-500 to-purple-600",
    avatarGradient: "from-pink-500 to-fuchsia-600",
    userBubble: "from-pink-500 to-fuchsia-500",
    botBubble: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800/50",
    activePill: "bg-white/25 text-white shadow-sm",
    inactivePill: "text-white/70 hover:text-white hover:bg-white/15",
    sendBtn: "from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600",
    fabGradient: "from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700",
    fabShadow: "shadow-pink-500/40 hover:shadow-pink-500/50",
    chip: "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-700 hover:bg-pink-100 dark:hover:bg-pink-800/50",
    inputRing: "focus:ring-pink-500",
    accentText: "text-fuchsia-700 dark:text-fuchsia-400",
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
  "create a budget for food ₱5000",
  "add 250 expense for lunch",
  "create goal Emergency Fund 10000",
  "add recurring Netflix 499 monthly",
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
  if (typeof answer === "string") return <span className={accentText}>{answer}</span>;
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
      <div className="w-full mt-1 divide-y divide-gray-100 dark:divide-gray-700">
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

function renderActionResult(msg: Message) {
  const isDelete = typeof msg.content === "string" && msg.content.toLowerCase().includes("deleted");
  return (
    <div className={`mt-2 border-l-2 ${isDelete ? "border-red-500 dark:border-red-400" : "border-green-500 dark:border-green-400"} pl-3`}>
      <p className={`text-sm font-medium ${isDelete ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>{msg.content as string}</p>
      {Boolean(msg.actionResult && typeof msg.actionResult === "object" && "id" in (msg.actionResult as object)) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ID: #{(msg.actionResult as { id: number }).id}</p>
      )}
    </div>
  );
}

export default function ChatWidget() {
  const features = useFeatures();
  const aiAvailable = useAiAvailability();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("plain");
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
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
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (categoryNames.length === 0) {
        void getCategories().then((cats) => setCategoryNames(cats.map((c) => c.name)));
      }
    }
  }, [open, categoryNames.length]);

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
      } else if (!file && looksLikeExpenseLog(trimmed)) {
        const draft = await parseExpense(trimmed);
        if (draft.saveable) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: null, timestamp: new Date(), draft },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: draft.hint ?? "I couldn't parse that as an expense. Try something like: 'spent 250 on lunch at Jollibee'.",
              timestamp: new Date(),
            },
          ]);
        }
      } else if (file && isImageFile(file)) {
        const draft = await askWithAttachment(trimmed, file, mode);
        if (draft.saveable) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: null, timestamp: new Date(), draft },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: draft.rejectionMessage ?? "That doesn't look like a receipt. Please attach a receipt, invoice, or bill.",
              timestamp: new Date(),
            },
          ]);
        }
      } else if (!file) {
        if (looksLikeNlQuery(trimmed)) {
          try {
            const queryRes = await askQuery(trimmed, mode);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: queryRes.answer ?? "No results found.", timestamp: new Date() },
            ]);
          } catch {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "I couldn't run that query right now. Try rephrasing — e.g. 'total spent this month' or 'expenses by category this month'.", timestamp: new Date() },
            ]);
          }
        } else {
          const res = await chatAction(trimmed, mode);
          if (res.type === "preview") {
            const previewData = res.result as { toolName: string; params: Record<string, unknown> };
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: res.message,
                timestamp: new Date(),
                actionPreview: { toolName: previewData.toolName, params: previewData.params, originalMessage: trimmed },
                editedParams: {},
              },
            ]);
          } else if (res.type === "disambiguate") {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: res.message,
                timestamp: new Date(),
                disambiguateItems: res.result as Array<{ id: number; description: string; amount: number; date: string }>,
              },
            ]);
          } else if (res.type === "action") {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: res.message, timestamp: new Date(), actionType: "success", actionResult: res.result },
            ]);
            dispatchDataEvents(trimmed);
          } else {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: res.message, timestamp: new Date() },
            ]);
          }
        }
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
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong.", timestamp: new Date(), actionType: "error" },
      ]);
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

  const confirmPreview = async (msgIndex: number, toolName: string, params: Record<string, unknown>, editedParams: Record<string, unknown>) => {
    setLoading(true);
    const mergedParams = { ...params, ...editedParams };

    if (toolName === "update_budget") {
      const id = Number(mergedParams.id);
      const categoryId = Number(mergedParams.categoryId);
      const month = String(mergedParams.month ?? new Date().toISOString().slice(0, 7));
      const amountLimit = Number(mergedParams.amountLimit);
      const categoryName = String(mergedParams.categoryName ?? "budget");
      try {
        const result = await updateBudget(id, { categoryId, month, amountLimit });
        setMessages((prev) =>
          prev.map((m, i) =>
            i === msgIndex
              ? { ...m, content: `Budget for ${categoryName} updated to ₱${amountLimit.toFixed(2)}.`, actionPreviewConfirmed: true, actionType: "success", actionResult: result }
              : m
          )
        );
        dispatchDataEvents("update_budget");
      } catch {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === msgIndex ? { ...m, content: "Failed to update budget. Please try again.", actionPreviewConfirmed: true } : m
          )
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    const confirmMsg = buildConfirmMessage(toolName, mergedParams);
    try {
      const res = await chatAction(confirmMsg, "execute");
      if (res.type === "action") {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === msgIndex
              ? { ...m, content: res.message, actionPreviewConfirmed: true, actionType: "success", actionResult: res.result }
              : m
          )
        );
        dispatchDataEvents(toolName);
      } else if (res.type === "preview") {
        const newPreviewData = res.result as { toolName: string; params: Record<string, unknown> };
        setMessages((prev) => [
          ...prev.map((m, i) =>
            i === msgIndex ? { ...m, actionPreviewConfirmed: true } : m
          ),
          {
            role: "assistant" as const,
            content: res.message,
            timestamp: new Date(),
            actionPreview: { toolName: newPreviewData.toolName, params: newPreviewData.params, originalMessage: "" },
            editedParams: {},
          },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === msgIndex ? { ...m, content: res.message, actionPreviewConfirmed: true } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex ? { ...m, content: "Failed to confirm action.", actionPreviewConfirmed: true } : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteDisambiguatedExpenses = async (
    items: Array<{ id: number; description: string; amount: number }>,
    msgIndex: number,
  ) => {
    setLoading(true);
    try {
      await Promise.all(items.map((it) => deleteExpense(it.id)));
      const summary =
        items.length === 1
          ? `"${items[0].description}" (${formatCurrency(items[0].amount)}) has been deleted from your expenses.`
          : `${items.length} expenses deleted: ${items.map((it) => `"${it.description}"`).join(", ")}.`;
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex
            ? { ...m, content: summary, actionType: "success", disambiguateItems: undefined, selectedDisambiguateIds: undefined }
            : m
        )
      );
      dispatchDataEvents("expense");
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex ? { ...m, content: "Failed to delete. Please try again." } : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleDisambiguateSelect = (msgIndex: number, id: number) => {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex) return m;
        const current = m.selectedDisambiguateIds ?? [];
        const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        return { ...m, selectedDisambiguateIds: updated };
      })
    );
  };

  const cancelPreview = (msgIndex: number) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIndex ? { ...m, content: "Action cancelled.", actionPreview: undefined } : m
      )
    );
  };

  const saveDraft = async (
    msgIndex: number,
    draft: ParsedExpenseResult,
    draftEdits?: { amount?: number; date?: string; time?: string; description?: string },
    categoryOverride?: string,
  ) => {
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const nowDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const datePart = draftEdits?.date ?? draft.date?.slice(0, 10) ?? nowDate;
      const timePart = draftEdits?.time ?? (datePart === nowDate ? nowTime : "00:00");
      const resolvedDate = `${datePart}T${timePart}:00`;
      await createExpense({
        amount: draftEdits?.amount ?? draft.amount ?? 0,
        category: categoryOverride ?? draft.category ?? undefined,
        date: resolvedDate,
        description: draftEdits?.description ?? draft.description ?? "",
      });
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, draftSaved: true } : m))
      );
      window.dispatchEvent(new CustomEvent("gastosai:expense-changed"));
    } catch {
      setError("Failed to save expense. Please try again.");
    }
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
                        : `${theme.botBubble} text-gray-800 dark:text-gray-100 rounded-bl-sm border shadow-sm w-full`
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
                    ) : m.actionPreview && m.actionPreviewConfirmed ? (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {actionLabel(m.actionPreview.toolName)}
                        </p>
                        <div className="space-y-1.5">
                          {buildPreviewFields(m.actionPreview.toolName, m.actionPreview.params, m.editedParams ?? {}).map(({ field, label, value }) => {
                            const displayVal = String(m.editedParams?.[field] ?? value);
                            return (
                              <div key={field} className="flex justify-between items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
                                <span className="text-sm font-medium dark:text-gray-200 text-right">{displayVal}</span>
                              </div>
                            );
                          })}
                        </div>
                        {m.actionType === "success" ? (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium pt-1">
                            {savedLabel(m.actionPreview.toolName)}
                          </p>
                        ) : m.actionType === "error" ? (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium pt-1">
                            {typeof m.content === "string" ? m.content : "Action failed."}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">Dismissed.</p>
                        )}
                      </div>
                    ) : m.actionPreview && !m.actionPreviewConfirmed ? (
                      <div className="space-y-2">
                        {typeof m.content === "string" && m.content && (
                          <p className="text-sm text-gray-700 dark:text-gray-200">{m.content}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {actionLabel(m.actionPreview.toolName)}
                        </p>
                        <div className="space-y-1.5">
                          {buildPreviewFields(m.actionPreview.toolName, m.actionPreview.params, m.editedParams ?? {}).map(({ field, label, value, inputType }) => {
                            const fieldVal = String(m.editedParams?.[field] ?? value);
                            const onFieldChange = (val: string) =>
                              setMessages((prev) =>
                                prev.map((msg, idx) =>
                                  idx === i ? { ...msg, editedParams: { ...(msg.editedParams ?? {}), [field]: val } } : msg
                                )
                              );
                            return (
                              <div key={field} className="flex justify-between items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
                                {inputType === "select" ? (
                                  <>
                                    <input
                                      type="text"
                                      list={`cat-${i}-${field}`}
                                      value={fieldVal}
                                      onChange={(e) => onFieldChange(e.target.value)}
                                      placeholder="Type or pick..."
                                      className="text-sm font-medium text-right bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-gray-200"
                                    />
                                    <datalist id={`cat-${i}-${field}`}>
                                      {categoryNames.map((n) => <option key={n} value={n} />)}
                                    </datalist>
                                  </>
                                ) : inputType === "freq-select" ? (
                                  <select
                                    value={fieldVal}
                                    onChange={(e) => onFieldChange(e.target.value)}
                                    className="text-sm font-medium bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-gray-200"
                                  >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="YEARLY">Yearly</option>
                                  </select>
                                ) : (
                                  <input
                                    type={inputType}
                                    defaultValue={value}
                                    onChange={(e) => onFieldChange(e.target.value)}
                                    className="text-sm font-medium text-right bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-gray-200"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => void confirmPreview(i, m.actionPreview!.toolName, m.actionPreview!.params, m.editedParams ?? {})}
                            disabled={loading}
                            className={`flex-1 text-xs font-medium py-1.5 rounded-lg bg-gradient-to-r ${theme.sendBtn} text-white disabled:opacity-40 transition-all`}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => cancelPreview(i)}
                            disabled={loading}
                            className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : m.disambiguateItems && m.disambiguateItems.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{m.content as string}</p>
                        <div className="space-y-1.5">
                          {m.disambiguateItems.map((item) => {
                            const selected = m.selectedDisambiguateIds?.includes(item.id) ?? false;
                            return (
                              <label
                                key={item.id}
                                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 border cursor-pointer transition-colors ${
                                  selected
                                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleDisambiguateSelect(i, item.id)}
                                  className="w-3.5 h-3.5 rounded accent-red-500 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.description}</p>
                                  <p className="text-xs text-gray-400">{formatCurrency(item.amount)} · {formatDate(item.date)}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {(m.selectedDisambiguateIds?.length ?? 0) > 0 && (
                          <button
                            onClick={() => {
                              const selected = m.disambiguateItems!.filter((it) => m.selectedDisambiguateIds!.includes(it.id));
                              void deleteDisambiguatedExpenses(selected, i);
                            }}
                            disabled={loading}
                            className="w-full text-xs font-medium py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 transition-colors"
                          >
                            Delete Selected ({m.selectedDisambiguateIds!.length})
                          </button>
                        )}
                      </div>
                    ) : m.draft && !m.draftCancelled ? (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">New expense</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Amount (₱)</span>
                            {m.draftSaved ? (
                              <span className={`text-sm font-semibold ${theme.accentText}`}>{formatCurrency(m.draftEdits?.amount ?? m.draft.amount ?? 0)}</span>
                            ) : (
                              <input
                                type="number"
                                defaultValue={m.draft.amount ?? 0}
                                min={0}
                                step={0.01}
                                onChange={(e) => setMessages((prev) => prev.map((msg, idx) => idx === i ? { ...msg, draftEdits: { ...(msg.draftEdits ?? {}), amount: parseFloat(e.target.value) || 0 } } : msg))}
                                className="text-sm font-semibold text-right bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-gray-200"
                              />
                            )}
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Description</span>
                            {m.draftSaved ? (
                              <span className="text-sm dark:text-gray-200 text-right">{m.draftEdits?.description ?? m.draft.description ?? ""}</span>
                            ) : (
                              <input
                                type="text"
                                defaultValue={m.draft.description ?? ""}
                                onChange={(e) => setMessages((prev) => prev.map((msg, idx) => idx === i ? { ...msg, draftEdits: { ...(msg.draftEdits ?? {}), description: e.target.value } } : msg))}
                                className="text-sm text-right bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-gray-200"
                              />
                            )}
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Category</span>
                            {m.draftSaved ? (
                              <span className="text-sm dark:text-gray-200">{m.categoryOverride ?? m.draft.category ?? ""}</span>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  list={`cat-draft-${i}`}
                                  value={m.categoryOverride ?? m.draft.category ?? ""}
                                  onChange={(e) => setMessages((prev) => prev.map((msg, idx) => idx === i ? { ...msg, categoryOverride: e.target.value } : msg))}
                                  placeholder="Type or pick..."
                                  className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-gray-200"
                                />
                                <datalist id={`cat-draft-${i}`}>
                                  {categoryNames.map((n) => <option key={n} value={n} />)}
                                </datalist>
                              </>
                            )}
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Date</span>
                            {m.draftSaved ? (
                              <span className="text-sm dark:text-gray-200">{formatDate(m.draftEdits?.date ?? m.draft.date)}</span>
                            ) : (
                              <input
                                type="date"
                                defaultValue={m.draft.date ? m.draft.date.slice(0, 10) : (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; })()}
                                onChange={(e) => setMessages((prev) => prev.map((msg, idx) => idx === i ? { ...msg, draftEdits: { ...(msg.draftEdits ?? {}), date: e.target.value } } : msg))}
                                className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-gray-200"
                              />
                            )}
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Time</span>
                            {m.draftSaved ? (
                              <span className="text-sm dark:text-gray-200">{m.draftEdits?.time ?? (() => { const n = new Date(); return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`; })()}</span>
                            ) : (
                              <input
                                type="time"
                                defaultValue={(() => { const n = new Date(); return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`; })()}
                                onChange={(e) => setMessages((prev) => prev.map((msg, idx) => idx === i ? { ...msg, draftEdits: { ...(msg.draftEdits ?? {}), time: e.target.value } } : msg))}
                                className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-gray-200"
                              />
                            )}
                          </div>
                        </div>
                        {m.draftSaved ? (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium pt-1">Saved to expenses</p>
                        ) : (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => void saveDraft(i, m.draft!, m.draftEdits, m.categoryOverride)}
                              disabled={loading}
                              className={`flex-1 text-xs font-medium py-1.5 rounded-lg bg-gradient-to-r ${theme.sendBtn} text-white disabled:opacity-40 transition-all`}
                            >
                              Save expense
                            </button>
                            <button
                              onClick={() => setMessages((prev) => prev.map((msg, idx) => idx === i ? { ...msg, draftCancelled: true } : msg))}
                              disabled={loading}
                              className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ) : m.draftCancelled ? (
                      <span className="text-sm text-gray-400 dark:text-gray-500 italic">Draft discarded.</span>
                    ) : m.actionType === "success" ? (
                      renderActionResult(m)
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
            {aiAvailable === false && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                Add your OpenAI key in{" "}
                <Link to="/settings" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Settings
                </Link>{" "}
                to use AI chat.
              </p>
            )}
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
                disabled={aiAvailable === false}
                placeholder={aiAvailable === false ? "Add your OpenAI key in Settings…" : pendingFile ? "Ask about this image…" : "Ask or tell me what to do…"}
                className={`flex-1 border border-gray-200 dark:border-gray-700 rounded-full px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-60 ${theme.inputRing}`}
              />
              <button
                type="submit"
                disabled={loading || aiAvailable === false || (!question.trim() && !pendingFile)}
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
          data-tour="chat"
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
