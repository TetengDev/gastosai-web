import { EXPENSE_CHANGED } from "../lib/events";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getBudgetSummary } from "../api/budgets";
import { getCategoryReport, getExpensesPage, getMonthlyComparison, getMonthlyReport } from "../api/expenses";
import { getRecurring, getUpcomingBills, markRecurringPaid } from "../api/recurring";
import type { BudgetSummaryItem, BudgetSummaryResponse } from "../api/budgets";
import type { CategoryReport, Expense, MonthlyReport } from "../api/expenses";
import type { RecurringExpenseResponse, UpcomingBillResponse } from "../api/recurring";
import AiInsightsCard from "../components/AiInsightsCard";
import FeatureGate from "../components/FeatureGate";
import DailyTrendCard from "../components/DailyTrendCard";
import GoalProgressCard from "../components/GoalProgressCard";
import TopExpensesCard from "../components/TopExpensesCard";
import { Amount, Button, Card, Celebrate, InfoTip, ProgressMeter } from "../components/ui";
import { formatCentavos, formatDate, formatDayMonth, manilaDate, manilaMonth } from "../lib/formatters";
import { categoryIcon } from "../lib/categoryIcon";
import { useAuth } from "../context/AuthContext";
import { hasCelebrated } from "../lib/celebrateStore";
import { budgetTone, pisoMoodFor, toBand, worstBand } from "../lib/pisoMood";
import type { PisoState } from "../brand/pisoTokens";
import CategoryChip from "../components/CategoryChip";
import Piso from "../brand/Piso";

function formatMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

function monthName(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "long" });
}

/** Calendar arithmetic on `yyyy-mm-dd` strings, in UTC so no device zone can shift a day. */
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function previousMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

/** How long each celebration holds the hero before the next one in the queue takes its place. */
const CELEBRATION_HOLD_MS = 1500;

/** Bills count as needing attention from today through a week out, inclusive. */
const BILL_WINDOW_DAYS = 7;

const MAX_SLICES = 8;

function buildChartData(categoryData: CategoryReport[]) {
  const sorted = [...categoryData].sort((a, b) => Number(b.total) - Number(a.total));
  if (sorted.length <= MAX_SLICES) {
    return sorted.map((c) => ({ name: c.category, value: Number(c.total) }));
  }
  const top = sorted.slice(0, MAX_SLICES);
  const othersTotal = sorted.slice(MAX_SLICES).reduce((s, c) => s + Number(c.total), 0);
  return [
    ...top.map((c) => ({ name: c.category, value: Number(c.total) })),
    { name: "Others", value: othersTotal },
  ];
}

function leftFor(centavos: number, daysLeft: number): string {
  const left = formatCentavos(centavos);
  return `${left} left for ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
}

/**
 * One sentence that says what Piso's face says. Every figure in it is the server's: the remaining
 * amount is `safeToSpend`, and "over" is that figure's sign, never a client-side comparison.
 */
function statusLine(
  mood: PisoState,
  budget: BudgetSummaryResponse | null,
  daysLeft: number,
  closedMonth: string | null,
): ReactNode {
  if (mood === "cheer" && closedMonth) return `${monthName(closedMonth)} closed under budget. Nice one.`;
  // Empty and no-budget copy is word for word with mobile Home (R2, TEN-504).
  if (mood === "empty") return "Nothing logged yet. Your first expense goes straight into Piso's slot.";
  if (!budget || budget.items.length === 0) {
    return (
      <>
        No budget set for this month.{" "}
        <Link to="/budget" className="font-medium text-ink-hi underline underline-offset-2">
          Set one
        </Link>
      </>
    );
  }
  if (budget.safeToSpend < 0) return `Over by ${formatCentavos(-budget.safeToSpend)}`;
  const left = leftFor(budget.safeToSpend, daysLeft);
  // Word for word with mobile Home (TEN-444).
  if (mood === "overBudget") return `A budget ran over · ${left}`;
  if (mood === "worried") return `Close to the limit · ${left}`;
  return left;
}

/**
 * A bill in Needs attention; `line` is the sub-line under its name. `canMarkPaid` is false on a row
 * due next month: the mark is for the current month, so it would record the wrong one (R6).
 */
type BillRow = { bill: UpcomingBillResponse; line: string; overdue: boolean; canMarkPaid: boolean };

type AttentionRow = { kind: "budget"; item: BudgetSummaryItem } | ({ kind: "bill" } & BillRow);

function dueIn(days: number): string {
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

const dueDay = (ymd: string) => formatDayMonth(ymd + "T00:00:00+08:00");

/**
 * Needs attention's bill rows: overdue first, then bills due within the window. Every due date is
 * the server's (`/recurring/upcoming`) and the paid state is the server's (`/recurring`, joined by
 * id, R2); this only compares Manila `yyyy-mm-dd` strings. A bill missing from `recurring` (or the
 * list failing to load) is never overdue, never hidden and offers no Mark paid: without its paid
 * state there is no knowing what a mark would mean. That is the behaviour before 3.5.0.
 *
 * - Overdue this month: unpaid, with a due date this month before today. One row per bill, at its
 *   most recent missed date, replacing its upcoming rows (R4).
 * - Unpaid last month: `lastPaidMonth` before last month (null never counts, R1), and only for a
 *   bill the server says was due last month (R3). A bill overdue both ways gets the dated line.
 * - A bill paid for this month or later shows no row due this month; next month's rows still show
 *   (R5).
 */
function billRows(
  upcoming: UpcomingBillResponse[],
  upcomingLastMonth: UpcomingBillResponse[],
  recurring: RecurringExpenseResponse[],
  today: string,
): BillRow[] {
  const month = today.slice(0, 7);
  const lastMonth = previousMonth(month);
  const paid = new Map(recurring.map((r) => [r.id, r]));
  // Marked paid for this month or later; a `lastPaidMonth` at or after this month means nothing is
  // overdue. A bill with no record is neither paid nor unpaid.
  const paidUp = (r: RecurringExpenseResponse) =>
    r.paidThisMonth || (r.lastPaidMonth !== null && r.lastPaidMonth >= month);
  const unpaid = (id: number) => {
    const r = paid.get(id);
    return !!r && !paidUp(r);
  };

  const overdue = new Map<number, BillRow>();
  for (const bill of [...upcoming].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    if (bill.dueDate.startsWith(month) && bill.dueDate < today && unpaid(bill.id)) {
      overdue.set(bill.id, {
        bill,
        line: `Overdue · was due ${dueDay(bill.dueDate)}`,
        overdue: true,
        canMarkPaid: true,
      });
    }
  }
  for (const bill of upcomingLastMonth) {
    const last = paid.get(bill.id)?.lastPaidMonth ?? null;
    if (!overdue.has(bill.id) && unpaid(bill.id) && last !== null && last < lastMonth) {
      overdue.set(bill.id, { bill, line: "Overdue · not paid last month", overdue: true, canMarkPaid: true });
    }
  }

  const soon = upcoming
    .map((bill) => ({ bill, inDays: daysBetween(today, bill.dueDate) }))
    .filter(({ bill, inDays }) => inDays >= 0 && inDays <= BILL_WINDOW_DAYS && !overdue.has(bill.id))
    .filter(({ bill }) => {
      const r = paid.get(bill.id);
      return !(bill.dueDate.startsWith(month) && r && paidUp(r));
    })
    .sort((a, b) => a.inDays - b.inDays)
    .map(({ bill, inDays }) => ({
      bill,
      line: `${dueIn(inDays)} · ${dueDay(bill.dueDate)}`,
      overdue: false,
      canMarkPaid: bill.dueDate.startsWith(month) && paid.has(bill.id),
    }));

  return [...overdue.values(), ...soon];
}

export default function Dashboard() {
  const account = useAuth().user?.email;
  const [categoryData, setCategoryData] = useState<CategoryReport[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyReport[]>([]);
  const [total, setTotal] = useState(0);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummaryResponse | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  // The `month-<yyyy-mm>` event to celebrate, frozen at load: Celebrate marks it seen as it mounts,
  // so reading the flag again on the next render would pull the cheer straight back out.
  const [monthCelebration, setMonthCelebration] = useState<string | null>(null);
  // Celebrations waiting for the hero, played one at a time: the month first (it is queued with
  // the page's data, before the goals strip mounts), then each COMPLETED goal the strip reports.
  // Only unseen events get in; Celebrate marks each one seen as it mounts.
  const [celebrations, setCelebrations] = useState<string[]>([]);
  const queueCelebrations = useCallback(
    (events: string[]) =>
      setCelebrations((queue) => {
        const fresh = events.filter((e) => account && !queue.includes(e) && !hasCelebrated(account, e));
        return fresh.length > 0 ? [...queue, ...fresh] : queue;
      }),
    [account],
  );
  const playing = celebrations[0];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  // One Mark paid at a time: every Mark paid button is disabled from the click until the refetch lands.
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(false);
  // The Manila day the last load was for. Read at fetch time so a tab left open past midnight on
  // the 1st asks for the new month; it is set with the data, so the labels never disagree with it.
  const [today, setToday] = useState(() => manilaDate(new Date()));

  const fetchData = useCallback(() => {
    const now = new Date();
    const month = manilaMonth(now);
    const day = manilaDate(now);
    const prev = previousMonth(month);
    const horizon = addDays(day, BILL_WINDOW_DAYS);
    // The bills endpoint is per month, so a window that crosses the month end needs both.
    const billMonths = horizon.slice(0, 7) === month ? [month] : [month, horizon.slice(0, 7)];

    return Promise.all([
      getCategoryReport(),
      getExpensesPage({ page: 0, size: 5 }),
      getMonthlyReport(),
      getMonthlyComparison(month),
      getBudgetSummary(month).catch(() => null),
      getBudgetSummary(prev).catch(() => null),
      Promise.all(billMonths.map((m) => getUpcomingBills(m)))
        .then((r) => r.flat())
        .catch(() => [] as UpcomingBillResponse[]),
      // Last month's occurrences, for the unpaid-last-month check (R3), and the paid state (R2).
      // Either failing falls back to upcoming rows only.
      getUpcomingBills(prev).catch(() => [] as UpcomingBillResponse[]),
      getRecurring().catch(() => [] as RecurringExpenseResponse[]),
    ])
      .then(([cats, expenses, monthly, mom, budget, prevBudget, upcoming, upcomingPrev, recurring]) => {
        setToday(day);
        setCategoryData(cats);
        setRecentExpenses(expenses.content);
        setMonthlyData(monthly);
        // "This month" is the current-month total, not the all-time category report.
        setTotal(mom.currentTotal);
        setBudgetSummary(budget);
        // The two months' responses can overlap, so one occurrence is kept per bill and due date.
        const unique = [...new Map(upcoming.map((b) => [`${b.id}-${b.dueDate}`, b])).values()];
        setBills(billRows(unique, upcomingPrev, recurring, day));
        // A month closes under budget when it had budgets and the server put none of them over.
        const prevBands = (prevBudget?.items ?? []).map((i) => toBand(i.status));
        const closedUnder = prevBands.length > 0 && worstBand(prevBands) !== "OVER_BUDGET";
        const event = `month-${prev}`;
        const cheer = closedUnder && account && !hasCelebrated(account, event);
        setMonthCelebration(cheer ? event : null);
        if (cheer) queueCelebrations([event]);
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, [account, queueCelebrations]);

  const markPaid = async (id: number) => {
    setMarking(true);
    setMarkError(false);
    try {
      // The month is read at click time: `today` is frozen at the last load.
      await markRecurringPaid(id, manilaMonth(new Date()));
      // Refetch here rather than through `gastosai:recurring-changed`, so the buttons stay disabled
      // until the row has left; a click in between would send the mark again.
      await fetchData();
    } catch {
      setMarkError(true);
    } finally {
      setMarking(false);
    }
  };

  useEffect(() => {
    if (!playing) return;
    // Re-checked as each event reaches the head: another tab may have played one while it waited.
    const next = () =>
      setCelebrations((queue) => queue.slice(1).filter((e) => !!account && !hasCelebrated(account, e)));
    const t = setTimeout(next, CELEBRATION_HOLD_MS);
    return () => clearTimeout(t);
  }, [playing, account]);

  useEffect(() => {
    fetchData();
    const events = [EXPENSE_CHANGED, "gastosai:budget-changed", "gastosai:recurring-changed"];
    for (const e of events) window.addEventListener(e, fetchData);
    return () => {
      for (const e of events) window.removeEventListener(e, fetchData);
    };
  }, [fetchData]);

  if (loading)
    return (
      // Mirrors the real layout: the hero, then quieter sections.
      <div className="mx-auto max-w-3xl animate-pulse space-y-10">
        <div className="h-60 rounded-2xl bg-surface-2" />
        <div className="space-y-3">
          <div className="h-5 w-40 rounded bg-surface-2" />
          <div className="h-14 rounded-xl bg-surface-2" />
          <div className="h-14 rounded-xl bg-surface-2" />
        </div>
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 w-56 shrink-0 rounded-xl bg-surface-2" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-surface-2" />
      </div>
    );

  if (error)
    return (
      <Card className="mx-auto mt-8 max-w-md text-center">
        <p className="text-danger">{error}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchData();
          }}
        >
          Try again
        </Button>
      </Card>
    );

  const currentMonth = today.slice(0, 7);
  const monthLabel = formatMonthLabel(currentMonth);
  const [cy, cm] = currentMonth.split("-").map(Number);
  // Today counts, as on mobile: the last day of the month still has 1 day left.
  const daysLeft = new Date(cy, cm, 0).getDate() - Number(today.slice(8, 10)) + 1;

  const items = budgetSummary?.items ?? [];
  const bands = items.map((i) => toBand(i.status));
  const mood = pisoMoodFor({
    bands,
    hasExpenses: recentExpenses.length > 0,
    cheer: monthCelebration !== null,
  });
  const worst = worstBand(bands);
  // The server's whole-number share of the month's budget, for the bar's width and its caption; the
  // bar's colour comes from the server's bands. The guard stays here: the server sends 0 when
  // nothing is budgeted, which reads the same as "nothing spent".
  const usedPercent =
    budgetSummary && budgetSummary.totalBudgeted > 0 ? budgetSummary.percentUsed : null;
  const amber = mood === "worried" || mood === "overBudget";

  const hero = (
    // `dark` is deliberate: the tile is a permanently dark surface, so the tokens inside it resolve
    // in their dark form in both themes.
    <div data-kpi="Total Spend" className="dark rounded-2xl bg-hero p-5 text-ink-hi sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 text-sm font-medium text-ink">Total Spend · {monthLabel}</h1>
          <Amount
            centavos={total}
            size="hero"
            className="mt-2 block text-[clamp(1.875rem,8vw,3.75rem)] leading-none tracking-tight"
          />
        </div>
        <div className="shrink-0">
          {/* Keyed, so each event in the queue mounts its own Celebrate and is marked seen. If it
              declines to play (the flag cannot be written), Piso's mood holds the slot. */}
          {playing ? (
            <Celebrate key={playing} event={playing} size={96} fallback={<Piso state={mood} size={96} />} />
          ) : (
            <Piso state={mood} size={96} />
          )}
        </div>
      </div>

      {budgetSummary && usedPercent !== null && items.length > 0 && (
        <div className="mt-6">
          <ProgressMeter
            percent={usedPercent}
            tone={budgetTone(worst ?? "ON_TRACK")}
            label="Month budget"
            height={10}
          />
          <p className="m-0 mt-2 font-mono text-xs tabular-nums text-ink">
            {formatCentavos(budgetSummary.totalSpent)} of {formatCentavos(budgetSummary.totalBudgeted)} budgeted ·{" "}
            {usedPercent}%
          </p>
        </div>
      )}

      <p
        data-testid="hero-status"
        className={`m-0 mt-4 text-base font-medium ${amber ? "text-warn-ink" : "text-ink"}`}
      >
        {statusLine(mood, budgetSummary, daysLeft, monthCelebration && previousMonth(currentMonth))}
      </p>
      {/* The cheer line is about last month; it must not hide that this one is over. */}
      {mood === "cheer" && budgetSummary && budgetSummary.items.length > 0 && budgetSummary.safeToSpend < 0 && (
        <p className="m-0 mt-1 text-base font-medium text-warn-ink">
          Over by {formatCentavos(-budgetSummary.safeToSpend)}
        </p>
      )}
    </div>
  );

  const attention: AttentionRow[] = [
    ...items
      .filter((i) => toBand(i.status) === "OVER_BUDGET")
      .map((item) => ({ kind: "budget" as const, item })),
    ...items
      .filter((i) => toBand(i.status) === "WARNING")
      .map((item) => ({ kind: "budget" as const, item })),
    ...bills.map((b) => ({ kind: "bill" as const, ...b })),
  ];

  const attentionSection = attention.length > 0 && (
    <section data-section="attention" aria-labelledby="attention-heading">
      <h2 id="attention-heading" className="m-0 font-display text-lg font-medium text-ink-hi">
        Needs attention
      </h2>
      {markError && (
        <p role="alert" className="m-0 mt-3 text-sm text-danger">
          Could not mark that bill paid. Try again.
        </p>
      )}
      <ul className="m-0 mt-3 list-none divide-y divide-edge-3 rounded-xl border border-edge bg-surface p-0">
        {attention.map((row) =>
          row.kind === "budget" ? (
            <li key={`budget-${row.item.categoryId}`}>
              <Link
                to="/budget"
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-ink-hi">{row.item.categoryName}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-warn-ink">
                      {Math.round(row.item.percentUsed)}% used
                    </span>
                  </div>
                  <ProgressMeter
                    percent={row.item.percentUsed}
                    tone={budgetTone(toBand(row.item.status))}
                    label={`${row.item.categoryName} budget`}
                    height={6}
                    className="mt-2"
                  />
                </div>
                <span className="w-28 shrink-0 text-right text-xs text-ink-2">
                  {row.item.remaining < 0
                    ? `Over by ${formatCentavos(-row.item.remaining)}`
                    : `${formatCentavos(row.item.remaining)} left`}
                </span>
              </Link>
            </li>
          ) : (
            // A button cannot sit inside a link, so the row is the link plus the action beside it. On
            // a phone the action wraps under the link, so the name keeps its width.
            <li key={`bill-${row.bill.id}-${row.bill.dueDate}`} className="flex flex-wrap items-center sm:flex-nowrap">
              <Link
                to="/recurring"
                className="flex min-w-0 flex-1 basis-full items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2 sm:basis-auto"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-hi">{row.bill.name}</span>
                  {/* Overdue is amber, never red (spec §3). */}
                  <span className={`text-xs ${row.overdue ? "text-warn-ink" : "text-ink-2"}`}>{row.line}</span>
                </div>
                <Amount centavos={row.bill.amount} currency={row.bill.currency} className="w-28 shrink-0 text-right" />
              </Link>
              {row.canMarkPaid && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mx-4 mb-3 min-h-11 shrink-0 sm:mb-0 sm:ml-0"
                  // "Mark paid" leads the name, so speaking the visible label hits it (WCAG 2.5.3).
                  aria-label={`Mark paid: ${row.bill.name}`}
                  disabled={marking}
                  onClick={() => void markPaid(row.bill.id)}
                >
                  Mark paid
                </Button>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  );

  const recentSection = (
    <section data-section="recent" aria-labelledby="recent-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-heading" className="m-0 font-display text-lg font-medium text-ink-hi">
          Recent
        </h2>
        {recentExpenses.length > 0 && (
          <Link to="/expenses" className="text-sm font-medium text-ink-hi underline-offset-4 hover:underline">
            See all expenses
          </Link>
        )}
      </div>
      {recentExpenses.length === 0 ? (
        <p className="m-0 mt-3 text-sm text-ink-2">
          <span className="font-medium text-ink">No expenses yet</span> — log one and it shows up here.
        </p>
      ) : (
        <ul className="m-0 mt-3 list-none divide-y divide-edge-3 p-0">
          {recentExpenses.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <CategoryChip name={e.category ?? "Uncategorized"} />
                {e.description && <p className="m-0 mt-0.5 truncate text-sm text-ink-2">{e.description}</p>}
              </div>
              <div className="shrink-0 text-right">
                <Amount centavos={e.amount} currency={e.currency} className="block" />
                <span className="text-xs text-ink-3">{formatDate(e.date)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const chartData = buildChartData(categoryData);
  const chartMax = chartData.length > 0 ? Math.max(...chartData.map((c) => c.value)) : 0;

  const spendingByCategorySection = (
    <section data-section="categories">
      <div className="flex items-baseline justify-between gap-3 border-b border-edge pb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="m-0 font-display text-xl font-medium tracking-tight text-ink-hi">
            Spending by Category
          </h2>
          <InfoTip text="Your total spend per category (all time), longest bar = highest spend." />
        </div>
        {/* Metadata, not navigation — so it reads as a caption rather than a fifth eyebrow. */}
        {categoryData.length > 0 && (
          <span className="shrink-0 text-xs text-ink-3">
            {categoryData.length} {categoryData.length === 1 ? "category" : "categories"}
          </span>
        )}
      </div>
      {chartData.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-ink-3">
          No category data yet.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {chartData.map((c) => (
            <div
              key={c.name}
              className="grid grid-cols-[110px_1fr_72px] items-center gap-4 sm:grid-cols-[136px_1fr_86px]"
            >
              <div className="flex min-w-0 items-center justify-end gap-1.5 text-sm text-ink">
                {(() => { const Ic = categoryIcon(c.name); return <Ic className="h-3.5 w-3.5 shrink-0 text-ink-3" />; })()}
                <span className="truncate">{c.name}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-track">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${chartMax > 0 ? (c.value / chartMax) * 100 : 0}%` }}
                />
              </div>
              <div className="text-right font-mono text-xs text-ink-2">
                {formatCentavos(c.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const monthlyTrendSection = (
    <section data-section="monthly">
      <div className="flex items-baseline justify-between gap-3 border-b border-edge pb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="m-0 font-display text-xl font-medium tracking-tight text-ink-hi">
            Monthly Trend
          </h2>
          <InfoTip text="Total spend per month over the last 6 months." />
        </div>
        <span className="shrink-0 text-xs text-ink-3">Last 6 months</span>
      </div>
      {monthlyData.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-ink-3">
          No monthly data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210} className="mt-4">
          <BarChart data={monthlyData.slice(-6)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ga-border)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--ga-text3)" }}
              tickLine={false}
              tickFormatter={(v: string) => {
                const [y, m] = v.split("-").map(Number);
                return new Date(y, m - 1, 1).toLocaleString("default", { month: "short" });
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--ga-text3)" }}
              tickFormatter={(v) => abbrevCentavos(v as number)}
              width={56}
            />
            <Tooltip formatter={(v) => [formatCentavos(v as number), "Spend"]} />
            <Bar dataKey="total" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );

  const insightsSection = (
    <section data-section="insights" className="border-t border-edge pt-6">
      <button
        type="button"
        aria-expanded={insightsOpen}
        aria-controls={insightsOpen ? "insights-panel" : undefined}
        onClick={() => setInsightsOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span>
          <span className="block font-display text-lg font-medium text-ink-hi">Insights</span>
          <span className="block text-sm text-ink-3">Trends, top expenses and AI notes</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-ink-3 transition-transform motion-reduce:transition-none ${
            insightsOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {/* Rendered only when open, so a collapsed section costs no AI calls. */}
      {insightsOpen && (
        <div id="insights-panel" className="mt-6 space-y-10">
          <FeatureGate feature="ADVANCED_INSIGHTS">
            <AiInsightsCard month={currentMonth} />
          </FeatureGate>
          <DailyTrendCard month={currentMonth} />
          {monthlyTrendSection}
          <TopExpensesCard month={currentMonth} />
          {spendingByCategorySection}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {hero}
      {attentionSection}
      <GoalProgressCard onCompleted={queueCelebrations} />
      {recentSection}
      {insightsSection}
    </div>
  );
}

/**
 * Compact peso label for chart axes (₱12.5k); full precision stays in tooltips.
 *
 * Both branches go through `formatCentavos` instead of assembling a `₱` string here, which keeps
 * the peso sign in `formatters.ts` where CLAUDE.md puts it. The thousands branch reuses the
 * formatter's two decimal places to mean tenths of a thousand: ₱12,500 is 1,250,000 centavos,
 * `Math.round(c / 1000)` is 1250, and the formatter renders that as `₱12.50` — the `₱12.5` the
 * axis wants, once the trailing zeros come off.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function abbrevCentavos(centavos: number): string {
  // Strips only zeros that sit after the decimal point, plus the point itself once nothing is left
  // behind it: `₱12.50` -> `₱12.5`, `₱1,000.00` -> `₱1,000`. The anchored fraction group is what
  // keeps it off the pesos — a bare `/\.?0+$/` would turn a point-less `₱100` into `₱1`.
  const trimZeros = (s: string) => s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  if (Math.abs(centavos) >= 100_000) {
    return `${trimZeros(formatCentavos(Math.round(centavos / 1000)))}k`;
  }
  return trimZeros(formatCentavos(centavos));
}
