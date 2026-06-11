export const AVATAR_COLORS = [
  { key: "violet-indigo", from: "from-violet-500", to: "to-indigo-600" },
  { key: "rose-pink", from: "from-rose-500", to: "to-pink-600" },
  { key: "amber-orange", from: "from-amber-500", to: "to-orange-600" },
  { key: "emerald-teal", from: "from-emerald-500", to: "to-teal-600" },
  { key: "sky-blue", from: "from-sky-500", to: "to-blue-600" },
  { key: "slate-gray", from: "from-slate-500", to: "to-gray-600" },
] as const;

export type AvatarColorKey = (typeof AVATAR_COLORS)[number]["key"];

export function getAvatarGradient(avatarColor: string | null | undefined): string {
  const preset = AVATAR_COLORS.find((c) => c.key === avatarColor);
  return preset ? `${preset.from} ${preset.to}` : "from-violet-500 to-indigo-600";
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CATEGORY_COLORS = [
  { bg: "bg-violet-100",  darkBg: "dark:bg-violet-900/30",  text: "text-violet-700",  darkText: "dark:text-violet-300",  dot: "bg-violet-500",  chart: "#7c3aed" },
  { bg: "bg-blue-100",    darkBg: "dark:bg-blue-900/30",    text: "text-blue-700",    darkText: "dark:text-blue-300",    dot: "bg-blue-500",    chart: "#2563eb" },
  { bg: "bg-emerald-100", darkBg: "dark:bg-emerald-900/30", text: "text-emerald-700", darkText: "dark:text-emerald-300", dot: "bg-emerald-500", chart: "#059669" },
  { bg: "bg-amber-100",   darkBg: "dark:bg-amber-900/30",   text: "text-amber-700",   darkText: "dark:text-amber-300",   dot: "bg-amber-500",   chart: "#d97706" },
  { bg: "bg-rose-100",    darkBg: "dark:bg-rose-900/30",    text: "text-rose-700",    darkText: "dark:text-rose-300",    dot: "bg-rose-500",    chart: "#e11d48" },
  { bg: "bg-cyan-100",    darkBg: "dark:bg-cyan-900/30",    text: "text-cyan-700",    darkText: "dark:text-cyan-300",    dot: "bg-cyan-500",    chart: "#0891b2" },
  { bg: "bg-orange-100",  darkBg: "dark:bg-orange-900/30",  text: "text-orange-700",  darkText: "dark:text-orange-300",  dot: "bg-orange-500",  chart: "#ea580c" },
  { bg: "bg-pink-100",    darkBg: "dark:bg-pink-900/30",    text: "text-pink-700",    darkText: "dark:text-pink-300",    dot: "bg-pink-500",    chart: "#db2777" },
  { bg: "bg-teal-100",    darkBg: "dark:bg-teal-900/30",    text: "text-teal-700",    darkText: "dark:text-teal-300",    dot: "bg-teal-500",    chart: "#0d9488" },
  { bg: "bg-indigo-100",  darkBg: "dark:bg-indigo-900/30",  text: "text-indigo-700",  darkText: "dark:text-indigo-300",  dot: "bg-indigo-500",  chart: "#4f46e5" },
];

export function getCategoryColor(category: string) {
  const hash = Array.from(category).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

export function getCategoryColors() {
  return CATEGORY_COLORS.map((c) => c.chart);
}

export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₱${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (date: string | null | undefined): string => {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const toDateTimeLocal = (date: string | null | undefined): string => {
  if (!date) return "";
  return date.slice(0, 16);
};

export const formatMonth = (month: string): string => {
  return new Date(month + "-01").toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
};
