import { useCallback, useEffect, useState } from "react";
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
import { getCategoryReport, getExpenses, getMonthlyComparison, getMonthlyReport } from "../api/expenses";
import type { BudgetSummaryResponse, CategoryReport, Expense, MonthlyComparison, MonthlyReport } from "../api/types";
import AiInsightsCard from "../components/AiInsightsCard";
import FeatureGate from "../components/FeatureGate";
import AlertsCard from "../components/AlertsCard";
import BudgetOverviewCard from "../components/BudgetOverviewCard";
import DailyTrendCard from "../components/DailyTrendCard";
import DashboardHero, { type HeroStat } from "../components/DashboardHero";
import GoalProgressCard from "../components/GoalProgressCard";
import TopExpensesCard from "../components/TopExpensesCard";
import UpcomingBillsCard from "../components/UpcomingBillsCard";
import { Card, InfoTip } from "../components/ui";
import { formatCurrency, formatDate, getCategoryColor } from "../lib/formatters";

const currentMonth = new Date().toISOString().slice(0, 7);

function formatMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

function prevMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 2, 1).toLocaleString("default", { month: "short", year: "numeric" });
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
      getExpenses(),
      getMonthlyReport(),
      getMonthlyComparison(currentMonth),
      getBudgetSummary(currentMonth).catch(() => null),
    ])
      .then(([cats, expenses, monthly, mom, budget]) => {
        setCategoryData(cats);
        setRecentExpenses(expenses.slice(0, 10));
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
  const today = new Date().getDate();
  const dailyAvg = today > 0 ? total / today : 0;
  const topCategory = categoryData.length > 0
    ? [...categoryData].sort((a, b) => Number(b.total) - Number(a.total))[0]
    : null;
  const remainingBudget =
    budgetSummary && budgetSummary.items.length > 0 ? budgetSummary.safeToSpend : null;

  const momPercent = momData?.changePercent ?? null;
  const momValue =
    momPercent === null
      ? "—"
      : momPercent === 0
        ? "±0%"
        : `${momPercent > 0 ? "+" : ""}${momPercent.toFixed(1)}%`;

  const heroStats: HeroStat[] = [
    {
      label: "vs Last Month",
      value: momValue,
      sub: momData ? `vs ${prevMonthLabel(momData.month)}` : "No prior data",
    },
    {
      label: "Daily Average",
      value: formatCurrency(dailyAvg),
      sub: `Day ${today} of month`,
    },
    {
      label: "Biggest Category",
      value: topCategory ? topCategory.category : "—",
      sub: topCategory ? formatCurrency(Number(topCategory.total)) : "No data yet",
    },
    {
      label: "Remaining Budget",
      value: remainingBudget !== null ? formatCurrency(remainingBudget) : "—",
      sub: remainingBudget !== null ? "safe to spend" : "No budget set",
    },
  ];

  if (loading)
    return (
      <div className="animate-pulse space-y-7">
        <div className="h-56 rounded-[22px] bg-surface-2" />
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-7">
            <div className="h-64 rounded-2xl bg-surface-2" />
            <div className="h-64 rounded-2xl bg-surface-2" />
          </div>
          <div className="space-y-7">
            <div className="h-64 rounded-2xl bg-surface-2" />
            <div className="h-44 rounded-2xl bg-surface-2" />
          </div>
        </div>
      </div>
    );

  if (error)
    return <p className="py-8 text-center text-[#b30000]">{error}</p>;

  return (
    <div className="space-y-9">
      <DashboardHero
        monthLabel={formatMonthLabel(currentMonth)}
        total={total}
        momPercent={momPercent}
        prevMonthLabel={momData ? prevMonthLabel(momData.month) : null}
        stats={heroStats}
      />

      <FeatureGate feature="ADVANCED_INSIGHTS">
        <AiInsightsCard month={currentMonth} />
      </FeatureGate>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.7fr_1fr]">
        {/* Left: daily trend + category breakdown */}
        <div className="space-y-7">
          <DailyTrendCard month={currentMonth} />

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
                    className="grid grid-cols-[110px_1fr_72px] items-center gap-4 sm:grid-cols-[140px_1fr_78px]"
                  >
                    <div className="truncate text-right text-sm text-ink">{c.name}</div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-track">
                      <div
                        className="h-full rounded-full bg-[#003c33]"
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
        </div>

        {/* Right: budget + alerts */}
        <div className="space-y-7">
          <BudgetOverviewCard month={currentMonth} />
          <AlertsCard />
        </div>
      </div>

      {/* Extras (not in the mock) kept below, restyled */}
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
        <GoalProgressCard />
        <UpcomingBillsCard month={currentMonth} />
      </div>

      <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
        <TopExpensesCard month={currentMonth} />

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
            <ResponsiveContainer width="100%" height={180} className="mt-4">
              <BarChart
                data={monthlyData.slice(-6)}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
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
                  tickFormatter={(v) => formatCurrency(v as number)}
                  width={80}
                />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Bar dataKey="total" fill="#1f8a5b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent expenses */}
      <div className="overflow-hidden rounded-2xl border border-edge bg-surface">
        <div className="flex items-center justify-between border-b border-edge-2 px-7 py-4">
          <div className="flex items-center gap-1.5">
            <h2 className="font-display text-lg font-medium text-ink-hi">Recent Expenses</h2>
            <InfoTip text="Your 10 most recently added expenses across all categories." />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
            {recentExpenses.length} most recent
          </span>
        </div>
        {recentExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="mb-3 text-4xl">💸</p>
            <p className="font-semibold text-ink">No expenses yet</p>
            <p className="mt-1 text-sm text-ink-3">Add an expense to see it here</p>
          </div>
        ) : (
          <ul>
            {recentExpenses.map((e) => {
              const color = getCategoryColor(e.category ?? "");
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between border-b border-edge-3 px-7 py-3.5 transition-colors last:border-0 hover:bg-surface-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${color.dot}`} />
                    <div className="min-w-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.darkBg} ${color.text} ${color.darkText}`}
                      >
                        {e.category}
                      </span>
                      {e.description && (
                        <p className="mt-0.5 truncate text-sm text-ink-2">{e.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <div className="font-display font-medium text-ink-hi">
                      {formatCurrency(e.amount)}
                    </div>
                    <div className="text-xs text-ink-3">{formatDate(e.date)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
