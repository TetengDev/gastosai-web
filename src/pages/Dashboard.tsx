import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
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
import type { BudgetSummaryResponse } from "../api/budgets";
import type { CategoryReport, Expense, MonthlyComparison, MonthlyReport } from "../api/expenses";
import AiInsightsCard from "../components/AiInsightsCard";
import FeatureGate from "../components/FeatureGate";
import BudgetOverviewCard from "../components/BudgetOverviewCard";
import DailyTrendCard from "../components/DailyTrendCard";
import GoalProgressCard from "../components/GoalProgressCard";
import TopExpensesCard from "../components/TopExpensesCard";
import UpcomingBillsCard from "../components/UpcomingBillsCard";
import { Button, Card, InfoTip } from "../components/ui";
import { formatCentavos, formatDate } from "../lib/formatters";
import { categoryIcon } from "../lib/categoryIcon";
import CategoryChip from "../components/CategoryChip";
import Piso from "../brand/Piso";

const currentMonth = new Date().toISOString().slice(0, 7);

function formatMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

function prevMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 2, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

/** Split a formatted centavo amount into its main part and the cents, so the cents can render smaller. */
function splitAmount(centavos: number): { head: string; dec: string } {
  const s = formatCentavos(centavos);
  const idx = s.lastIndexOf(".");
  if (idx === -1) return { head: s, dec: "" };
  return { head: s.slice(0, idx), dec: s.slice(idx + 1) };
}

/**
 * The month's spend so far, averaged over the elapsed days, as a whole number of centavos.
 *
 * The rounding is the point: the average of an integer number of centavos is not itself one, and
 * `formatCentavos` renders a non-integer as `"0.00"` rather than throwing. Dropping the rounding
 * would therefore show a plausible zero on the dashboard instead of failing loudly.
 */
// Exported for its own test; it is centavo arithmetic on the money path, not a component.
// eslint-disable-next-line react-refresh/only-export-components
export function dailyAverageCentavos(totalCentavos: number, elapsedDays: number): number {
  return elapsedDays > 0 ? Math.round(totalCentavos / elapsedDays) : 0;
}

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

export default function Dashboard() {
  const [categoryData, setCategoryData] = useState<CategoryReport[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyReport[]>([]);
  const [momData, setMomData] = useState<MonthlyComparison | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    void Promise.all([
      getCategoryReport(),
      getExpensesPage({ page: 0, size: 15 }),
      getMonthlyReport(),
      getMonthlyComparison(currentMonth),
      getBudgetSummary(currentMonth).catch(() => null),
    ])
      .then(([cats, expenses, monthly, mom, budget]) => {
        setCategoryData(cats);
        setRecentExpenses(expenses.content);
        setMonthlyData(monthly);
        setMomData(mom);
        setBudgetSummary(budget);
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener("gastosai:expense-changed", fetchData);
    return () => window.removeEventListener("gastosai:expense-changed", fetchData);
  }, [fetchData]);

  // "This Month" must be the current-month total (momData), not the all-time category report.
  const total = momData?.currentTotal ?? 0;
  const chartData = buildChartData(categoryData);
  const chartMax = chartData.length > 0 ? Math.max(...chartData.map((c) => c.value)) : 0;

  const monthLabel = formatMonthLabel(currentMonth);
  const [cy, cm] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(cy, cm, 0).getDate();
  const today = Math.min(new Date().getDate(), daysInMonth);
  const daysLeft = Math.max(daysInMonth - today, 0);
  const dailyAvg = dailyAverageCentavos(total, today);

  const remainingBudget =
    budgetSummary && budgetSummary.items.length > 0 ? budgetSummary.safeToSpend : null;
  const dailyAllowance = budgetSummary?.dailyAllowance ?? 0;

  const momPercent = momData?.changePercent ?? null;
  const momCaption =
    momPercent === null
      ? "No prior data"
      : momPercent > 0
        ? "Spending more"
        : momPercent < 0
          ? "Spending less"
          : "No change vs last month";

  if (loading)
    return (
      // The skeleton mirrors the real layout: one hero block beside two ruled columns, then
      // ruled sections. It used to be twelve rounded cards, which promised a card grid the
      // page no longer is.
      <div className="animate-pulse space-y-10">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.45fr_1.1fr]">
          <div className="h-40 rounded-2xl bg-surface-2" />
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
            <div className="space-y-3 py-1">
              <div className="h-3 w-28 rounded bg-surface-2" />
              <div className="h-10 w-36 rounded bg-surface-2" />
              <div className="h-3 w-40 rounded bg-surface-2" />
            </div>
            <div className="space-y-3 py-1">
              <div className="h-3 w-24 rounded bg-surface-2" />
              <div className="h-10 w-32 rounded bg-surface-2" />
              <div className="h-3 w-36 rounded bg-surface-2" />
            </div>
          </div>
        </div>
        <div className="h-28 rounded-lg bg-surface-2" />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.7fr_1fr]">
          <div className="h-72 rounded-lg bg-surface-2" />
          <div className="h-72 rounded-lg bg-surface-2" />
        </div>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div className="h-80 rounded-lg bg-surface-2" />
          <div className="h-80 rounded-lg bg-surface-2" />
        </div>
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
          Retry
        </Button>
      </Card>
    );

  const totalSplit = splitAmount(total);
  const budgetSplit = remainingBudget !== null ? splitAmount(remainingBudget) : null;
  const avgSplit = splitAmount(dailyAvg);

  const overBudget = (budgetSummary?.items ?? []).filter((i) => i.status === "OVER_BUDGET");

  const kpiStrip = (
    <div className="grid grid-cols-1 items-stretch gap-7 lg:grid-cols-[1.45fr_1.1fr]">
      {/*
        The hero is the one card on this page, because it is the one figure that outranks the
        others. `dark` is deliberate and is not a copy-paste slip: the tile is a permanently dark
        surface, so the token variables inside it are resolved in their dark form — that is how
        `text-deep` reads as mint on deep green in light mode and keeps working unchanged when
        the whole app flips. It replaces four hardcoded mint and coral literals.
      */}
      <div data-kpi="Total Spend" className="dark rounded-2xl bg-hero p-7 text-white">
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-deep">
          Total Spend · {monthLabel}
        </div>
        <div className="mt-3 flex items-end font-display text-5xl font-medium leading-none tracking-tight">
          <span>{totalSplit.head}</span>
          {totalSplit.dec && <span className="text-2xl text-deep">.{totalSplit.dec}</span>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {momPercent !== null && momPercent !== 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                // `chart-1`/`chart-2` are theme-invariant, so the coral delta is the same here as
                // it was. The mint delta uses `deep`, not `green-soft`: inside this tile's
                // dark-resolved scope `green-soft` is #003c33, which is the tile's own background.
                momPercent > 0 ? "bg-chart-1/20 text-chart-2" : "bg-deep/15 text-deep"
              }`}
            >
              {momPercent > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(momPercent).toFixed(1)}% vs {prevMonthLabel(momData!.month)}
            </span>
          )}
          <span className="text-xs text-white/70">{momCaption}</span>
        </div>
      </div>

      {/* Two secondary KPIs, separated by a hairline rule rather than wrapped in two cards. */}
      <div className="grid grid-cols-1 divide-y divide-edge sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div data-kpi="Remaining Budget" className="py-5 sm:py-1 sm:pr-7">
          <div className="flex items-center gap-1.5">
            <div className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">
              Remaining Budget
            </div>
            <InfoTip text="What's left to spend this month while staying within your budgets." />
          </div>
          {budgetSplit ? (
            <>
              <div className="mt-3 flex items-end font-display text-4xl font-medium leading-none tracking-tight text-deep">
                <span>{budgetSplit.head}</span>
                {budgetSplit.dec && <span className="text-2xl opacity-60">.{budgetSplit.dec}</span>}
              </div>
              <div className="mt-4 text-xs text-ink-2">
                {formatCentavos(dailyAllowance)} / day safe · {daysLeft}{" "}
                {daysLeft === 1 ? "day" : "days"} left
              </div>
            </>
          ) : (
            // A bare "—" here looked like a figure that failed to load. The sentence says
            // which of the two it is, and what to do about it.
            <>
              <div className="mt-3 font-display text-xl font-medium leading-tight text-ink-2">
                No budget set
              </div>
              <div className="mt-2 text-xs text-ink-3">
                Set a monthly budget to see what's safe to spend.
              </div>
            </>
          )}
        </div>

        <div data-kpi="Daily Average" className="py-5 sm:py-1 sm:pl-7">
          <div className="flex items-center gap-1.5">
            <div className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">
              Daily Average
            </div>
            <InfoTip text="Average spend per day so far this month (total ÷ days elapsed)." />
          </div>
          <div className="mt-3 flex items-end font-display text-4xl font-medium leading-none tracking-tight text-ink-hi">
            <span>{avgSplit.head}</span>
            {avgSplit.dec && <span className="text-2xl text-ink-3">.{avgSplit.dec}</span>}
          </div>
          <div className="mt-4 text-xs text-ink-2">
            Day {today} of {daysInMonth} · {monthLabel}
          </div>
        </div>
      </div>
    </div>
  );

  // A warning, not a failure: amber, no figure, and the sentence carries the meaning on its own.
  const overBudgetNotice = overBudget.length > 0 && (
    <div className="flex items-center gap-4 rounded-lg border border-warn-edge bg-warn-bg px-5 py-4">
      <Piso state="overBudget" size={48} className="shrink-0" />
      <div className="min-w-0">
        <p className="m-0 text-sm font-medium text-warn-ink">
          {overBudget.length === 1
            ? `${overBudget[0].categoryName} is over budget this month.`
            : `${overBudget.length} categories are over budget this month.`}
        </p>
        <Link to="/budget" className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink-hi">
          Review your budgets
        </Link>
      </div>
    </div>
  );

  const recentExpensesSection = (
    <section data-section="recent" className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-edge pb-3">
        <h2 className="m-0 font-display text-lg font-medium text-ink-hi">Recent Expenses</h2>
        <InfoTip text="Your most recently added expenses across all categories." />
      </div>
      {recentExpenses.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
          <Piso state="empty" size={72} />
          <p className="m-0 font-semibold text-ink">No expenses yet</p>
          <p className="m-0 text-sm text-ink-3">Add an expense to see it here</p>
        </div>
      ) : (
        <ul className="m-0 flex-1 list-none overflow-y-auto p-0">
          {recentExpenses.slice(0, 10).map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 border-b border-edge-3 py-3 transition-colors last:border-0 hover:bg-surface-2"
            >
              <div className="min-w-0">
                <CategoryChip name={e.category ?? "Uncategorized"} />
                {e.description && (
                  <p className="mt-0.5 truncate text-sm text-ink-2">{e.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="font-display font-medium text-ink-hi">{formatCentavos(e.amount)}</div>
                <div className="text-xs text-ink-3">{formatDate(e.date)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

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

  return (
    <div className="space-y-10">
      {/* Row 1: what this month costs, and what is left of it. */}
      {kpiStrip}

      {/* Row 2: the one thing that needs acting on, if there is one. */}
      {overBudgetNotice}

      {/* Row 3: AI interpretation of this month. */}
      <FeatureGate feature="ADVANCED_INSIGHTS">
        <AiInsightsCard month={currentMonth} />
      </FeatureGate>

      {/* Row 4: spending breakdown vs budget — items-start so the shorter side keeps its
          natural height instead of stretching into a tall empty panel. */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.7fr_1fr]">
        {spendingByCategorySection}
        <BudgetOverviewCard month={currentMonth} />
      </div>

      {/* Row 5: recent expenses beside the two trend charts. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.5fr]">
        {recentExpensesSection}
        <div className="flex flex-col gap-10">
          <DailyTrendCard month={currentMonth} />
          {monthlyTrendSection}
        </div>
      </div>

      {/*
        Row 6: forward-looking. Deliberately *not* the KPI row's three-up — two tiles with the
        ranked list spanning beneath them, so the eye reads a new kind of information rather than
        a second helping of the first row.
      */}
      <section className="border-t border-edge pt-8">
        <h2 className="m-0 font-display text-xl font-medium tracking-tight text-ink-hi">
          Coming up
        </h2>
        <div className="mt-5 grid grid-cols-1 items-start gap-7 md:grid-cols-2">
          <UpcomingBillsCard month={currentMonth} />
          <GoalProgressCard />
          <div className="md:col-span-2">
            <TopExpensesCard month={currentMonth} />
          </div>
        </div>
      </section>
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
