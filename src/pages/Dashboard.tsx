import { useCallback, useEffect, useState } from "react";
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
import type { BudgetSummaryResponse, CategoryReport, Expense, MonthlyComparison, MonthlyReport } from "../api/types";
import AiInsightsCard from "../components/AiInsightsCard";
import FeatureGate from "../components/FeatureGate";
import BudgetOverviewCard from "../components/BudgetOverviewCard";
import DailyTrendCard from "../components/DailyTrendCard";
import GoalProgressCard from "../components/GoalProgressCard";
import TopExpensesCard from "../components/TopExpensesCard";
import UpcomingBillsCard from "../components/UpcomingBillsCard";
import { Button, Card, InfoTip } from "../components/ui";
import { formatCurrency, formatDate } from "../lib/formatters";
import { categoryIcon } from "../lib/categoryIcon";
import CategoryChip from "../components/CategoryChip";

const currentMonth = new Date().toISOString().slice(0, 7);

function formatMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

function prevMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 2, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

/** Split a formatted peso amount into its main part and the cents, so the cents can render smaller. */
function splitAmount(n: number): { head: string; dec: string } {
  const s = formatCurrency(n);
  const idx = s.lastIndexOf(".");
  if (idx === -1) return { head: s, dec: "" };
  return { head: s.slice(0, idx), dec: s.slice(idx + 1) };
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
  const dailyAvg = today > 0 ? total / today : 0;

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
      <div className="animate-pulse space-y-7">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-3">
          <div className="h-40 rounded-2xl bg-surface-2" />
          <div className="h-40 rounded-2xl bg-surface-2" />
          <div className="h-40 rounded-2xl bg-surface-2" />
        </div>
        <div className="h-32 rounded-2xl bg-surface-2" />
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.7fr_1fr]">
          <div className="h-80 rounded-2xl bg-surface-2" />
          <div className="h-80 rounded-2xl bg-surface-2" />
        </div>
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_1.5fr]">
          <div className="h-72 rounded-2xl bg-surface-2" />
          <div className="h-72 rounded-2xl bg-surface-2" />
        </div>
        <div className="h-64 rounded-2xl bg-surface-2" />
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-64 rounded-2xl bg-surface-2" />
          <div className="h-64 rounded-2xl bg-surface-2" />
          <div className="h-64 rounded-2xl bg-surface-2" />
        </div>
      </div>
    );

  if (error)
    return (
      <Card className="mx-auto mt-8 max-w-md text-center">
        <p className="text-[#b30000]">{error}</p>
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

  const kpiStrip = (
    <div className="grid grid-cols-1 items-stretch gap-7 lg:grid-cols-3">
      {/* Total Spend (brand hero) */}
      <div className="rounded-2xl bg-hero p-7 text-white">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7fd6b8]">
          Total Spend · {monthLabel}
        </div>
        <div className="mt-2.5 flex items-end font-display text-[44px] font-medium leading-none tracking-tight">
          <span>{totalSplit.head}</span>
          {totalSplit.dec && <span className="text-[24px] text-[#9fe3c9]">.{totalSplit.dec}</span>}
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {momPercent !== null && momPercent !== 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                momPercent > 0 ? "bg-[#ff9b8a]/20 text-[#ffb4a6]" : "bg-[#9fe3c9]/15 text-[#9fe3c9]"
              }`}
            >
              {momPercent > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(momPercent).toFixed(1)}% vs {prevMonthLabel(momData!.month)}
            </span>
          )}
          <span className="text-xs text-white/70">{momCaption}</span>
        </div>
      </div>

      {/* Remaining Budget */}
      <Card tone="panel" className="h-full">
        <div className="flex items-center gap-1.5">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            Remaining Budget
          </div>
          <InfoTip text="What's left to spend this month while staying within your budgets." />
        </div>
        <div className="mt-2.5 flex items-end font-display text-[44px] font-medium leading-none tracking-tight text-[#003c33] dark:text-[#7fd6b8]">
          {budgetSplit ? (
            <>
              <span>{budgetSplit.head}</span>
              {budgetSplit.dec && <span className="text-[24px] opacity-60">.{budgetSplit.dec}</span>}
            </>
          ) : (
            "—"
          )}
        </div>
        <div className="mt-3.5 text-[12.5px] text-ink-2">
          {budgetSplit
            ? `${formatCurrency(dailyAllowance)} / day safe · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
            : "No budget set"}
        </div>
      </Card>

      {/* Daily Average */}
      <Card className="h-full">
        <div className="flex items-center gap-1.5">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            Daily Average
          </div>
          <InfoTip text="Average spend per day so far this month (total ÷ days elapsed)." />
        </div>
        <div className="mt-2.5 flex items-end font-display text-[44px] font-medium leading-none tracking-tight text-ink-hi">
          <span>{avgSplit.head}</span>
          {avgSplit.dec && <span className="text-[24px] text-ink-3">.{avgSplit.dec}</span>}
        </div>
        <div className="mt-3.5 text-[12.5px] text-ink-2">
          Day {today} of {daysInMonth} · {monthLabel}
        </div>
      </Card>
    </div>
  );

  const recentExpensesCard = (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-edge bg-surface">
      <div className="flex items-center justify-between border-b border-edge-2 px-6 py-4">
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-[19px] font-medium text-ink-hi">Recent Expenses</h2>
          <InfoTip text="Your most recently added expenses across all categories." />
        </div>
      </div>
      {recentExpenses.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
          <p className="mb-3 text-4xl">💸</p>
          <p className="font-semibold text-ink">No expenses yet</p>
          <p className="mt-1 text-sm text-ink-3">Add an expense to see it here</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {recentExpenses.slice(0, 10).map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 border-b border-edge-3 px-6 py-3 transition-colors last:border-0 hover:bg-surface-2"
            >
              <div className="min-w-0">
                <CategoryChip name={e.category ?? "Uncategorized"} />
                {e.description && (
                  <p className="mt-0.5 truncate text-sm text-ink-2">{e.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="font-display font-medium text-ink-hi">{formatCurrency(e.amount)}</div>
                <div className="text-xs text-ink-3">{formatDate(e.date)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const spendingByCategoryCard = (
    <Card>
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-1.5">
          <div className="font-display text-[22px] font-medium tracking-tight text-ink-hi">
            Spending by Category
          </div>
          <InfoTip text="Your total spend per category (all time), longest bar = highest spend." />
        </div>
        {categoryData.length > 0 && (
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
            {categoryData.length} {categoryData.length === 1 ? "category" : "categories"}
          </div>
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
                  className="h-full rounded-full bg-[#1f8a5b]"
                  style={{ width: `${chartMax > 0 ? (c.value / chartMax) * 100 : 0}%` }}
                />
              </div>
              <div className="text-right font-mono text-[12.5px] text-ink-2">
                {formatCurrency(c.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const monthlyTrendCard = (
    <Card>
      <div className="flex items-center gap-1.5">
        <div className="font-display text-[22px] font-medium tracking-tight text-ink-hi">
          Monthly Trend
        </div>
        <InfoTip text="Total spend per month over the last 6 months." />
      </div>
      <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Last 6 months
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
              tickFormatter={(v) => abbrevCurrency(v as number)}
              width={56}
            />
            <Tooltip formatter={(v) => [formatCurrency(v as number), "Spend"]} />
            <Bar dataKey="total" fill="#1f8a5b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );

  return (
    <div className="space-y-7">
      {/* Row 1: KPI strip */}
      {kpiStrip}

      {/* Row 2: AI interpretation of this month */}
      <FeatureGate feature="ADVANCED_INSIGHTS">
        <AiInsightsCard month={currentMonth} />
      </FeatureGate>

      {/* Row 3: Spending breakdown vs budget */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.7fr_1fr]">
        {spendingByCategoryCard}
        <BudgetOverviewCard month={currentMonth} />
      </div>

      {/* Row 4: Recent expenses beside the two trend charts (grouped together) */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_1.5fr]">
        {recentExpensesCard}
        <div className="flex flex-col gap-7">
          <DailyTrendCard month={currentMonth} />
          {monthlyTrendCard}
        </div>
      </div>

      {/* Row 6: Forward-looking + ranked */}
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
        <UpcomingBillsCard month={currentMonth} />
        <GoalProgressCard />
        <TopExpensesCard month={currentMonth} />
      </div>
    </div>
  );
}

/** Compact peso label for chart axes (₱12.5k); full precision stays in tooltips. */
function abbrevCurrency(n: number): string {
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    return `₱${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `₱${n}`;
}
