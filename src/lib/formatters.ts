export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CATEGORY_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500", chart: "#7c3aed" },
  { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   chart: "#2563eb" },
  { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500",chart: "#059669" },
  { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500",  chart: "#d97706" },
  { bg: "bg-rose-100",   text: "text-rose-700",   dot: "bg-rose-500",   chart: "#e11d48" },
  { bg: "bg-cyan-100",   text: "text-cyan-700",   dot: "bg-cyan-500",   chart: "#0891b2" },
  { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", chart: "#ea580c" },
  { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500",   chart: "#db2777" },
  { bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-500",   chart: "#0d9488" },
  { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", chart: "#4f46e5" },
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
