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
  { bg: "bg-indigo-100",  darkBg: "dark:bg-indigo-900/30",  text: "text-indigo-700",  darkText: "dark:text-indigo-300",  dot: "bg-indigo-500",  chart: "#4F46E5" },
  { bg: "bg-blue-100",    darkBg: "dark:bg-blue-900/30",    text: "text-blue-700",    darkText: "dark:text-blue-300",    dot: "bg-blue-600",    chart: "#0072B2" },
  { bg: "bg-teal-100",    darkBg: "dark:bg-teal-900/30",    text: "text-teal-700",    darkText: "dark:text-teal-300",    dot: "bg-teal-600",    chart: "#009E73" },
  { bg: "bg-amber-100",   darkBg: "dark:bg-amber-900/30",   text: "text-amber-700",   darkText: "dark:text-amber-300",   dot: "bg-amber-500",   chart: "#E69F00" },
  { bg: "bg-sky-100",     darkBg: "dark:bg-sky-900/30",     text: "text-sky-700",     darkText: "dark:text-sky-300",     dot: "bg-sky-400",     chart: "#56B4E9" },
  { bg: "bg-orange-100",  darkBg: "dark:bg-orange-900/30",  text: "text-orange-700",  darkText: "dark:text-orange-300",  dot: "bg-orange-700",  chart: "#D55E00" },
  { bg: "bg-pink-100",    darkBg: "dark:bg-pink-900/30",    text: "text-pink-700",    darkText: "dark:text-pink-300",    dot: "bg-pink-400",    chart: "#CC79A7" },
  { bg: "bg-violet-100",  darkBg: "dark:bg-violet-900/30",  text: "text-violet-700",  darkText: "dark:text-violet-300",  dot: "bg-violet-600",  chart: "#7C3AED" },
  { bg: "bg-emerald-100", darkBg: "dark:bg-emerald-900/30", text: "text-emerald-700", darkText: "dark:text-emerald-300", dot: "bg-emerald-500", chart: "#059669" },
  { bg: "bg-cyan-100",    darkBg: "dark:bg-cyan-900/30",    text: "text-cyan-700",    darkText: "dark:text-cyan-300",    dot: "bg-cyan-500",    chart: "#0891B2" },
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

/**
 * Integer centavos as an exact decimal string — `15075` -> `"150.75"`.
 *
 * String slicing rather than `c / 100` is the point: division puts an IEEE-754 float between the
 * contract and the screen, which CLAUDE.md §1.3 rules out. Slicing is exact for every value the
 * `long` field can hold up to `Number.MAX_SAFE_INTEGER`, which is ₱90 trillion.
 *
 * Non-finite and non-integer inputs collapse to `"0.00"` rather than throwing: this sits on the
 * render path, and a malformed amount must not blank a whole page.
 */
export const centavosToAmount = (centavos: number): string => {
  if (!Number.isFinite(centavos)) return "0.00";
  const whole = Math.trunc(centavos);
  const digits = String(Math.abs(whole)).padStart(3, "0");
  return `${whole < 0 ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)}`;
};

/** Thousands separators for a run of digits, without going through `Number`. */
const groupDigits = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * An integer centavo amount rendered for display — `15075` -> `"₱150.75"`.
 *
 * This is the `/api/v2` counterpart to `formatCurrency`, which stays for the decimal amounts
 * `/api/v1` still serves. It groups the digits itself instead of handing them to
 * `toLocaleString`, because reaching a locale formatter means parsing the string back into a
 * float first — exactly the round-trip §1.3 forbids.
 */
export const formatCentavos = (centavos: number): string => {
  const amount = centavosToAmount(centavos);
  const negative = amount.startsWith("-");
  const [pesos, cents] = (negative ? amount.slice(1) : amount).split(".");
  return `${negative ? "-" : ""}₱${groupDigits(pesos)}.${cents}`;
};

/**
 * A typed amount parsed back to integer centavos — `"150.75"` -> `15075`, exactly.
 *
 * The float route is `parseFloat(input) * 100`, and it is wrong for amounts an expense tracker
 * sees constantly: `1.15` becomes `114.99999999999999` and `8.87` becomes `886.9999999999999`.
 * Truncating either loses a centavo, and the cases that survive — `150.75` lands on exactly
 * `15075` — are what makes the bug ship, because the obvious test passes. Every path here is
 * integer arithmetic on digit substrings instead, so the value that reaches the API is the value
 * that was typed, for every input rather than most of them.
 *
 * Returns `null` for anything that is not a well-formed amount, so a caller has to decide what an
 * unparseable input means rather than being handed a silently wrong number. More than two decimal
 * places is one of those cases: rounding it would spend a centavo the user never agreed to.
 * A leading `₱`, spaces and thousands separators are accepted, since people paste them.
 */
export const parseAmountToCentavos = (input: string): number | null => {
  const cleaned = input.trim().replace(/^₱/, "").replace(/[\s,]/g, "");
  const match = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;

  const [, sign, pesos, cents = ""] = match;
  const centavos = Number(pesos) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos)) return null;
  return sign === "-" ? -centavos : centavos;
};

/**
 * The app's business timezone. Day and month rollups are computed in Asia/Manila on the
 * backend, so every rendered timestamp must be resolved in that zone — not the device's.
 *
 * Without pinning this, `2026-06-26T12:00:00+08:00` renders as 12:00 PM in Manila but
 * 12:00 AM in New York and 05:00 AM in London. That silently places an expense in the wrong
 * day, and therefore the wrong monthly total, for anyone whose device is not set to PHT.
 */
export const APP_TIME_ZONE = "Asia/Manila";

export const formatDate = (date: string | null | undefined): string => {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
};

/** Day-and-month only, in the app's timezone. For compact lists and cards. */
export const formatDayMonth = (date: string | null | undefined): string => {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  });
};

/** Calendar date only, in the app's timezone. */
export const formatDateOnly = (date: string | null | undefined): string => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  });
};

/**
 * Value for a `<input type="datetime-local">`, which expects `YYYY-MM-DDTHH:mm` with no zone.
 *
 * Slicing rather than going through `Date` is deliberate: the API already serves the wall-clock
 * reading in Manila time, so the first 16 characters are exactly what the input needs. Parsing
 * into a `Date` would re-resolve it into the device's zone and shift the value in the form.
 */
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
