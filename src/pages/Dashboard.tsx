import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import GoalProgressCard from "../components/GoalProgressCard";
import TopExpensesCard from "../components/TopExpensesCard";
import UpcomingBillsCard from "../components/UpcomingBillsCard";
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
    return sorted.map((c) => ({
      name: c.category,
      value: Number(c.total),
      color: getCategoryColor(c.category).chart,
    }));
  }
  const top = sorted.slice(0, MAX_SLICES);
  const othersTotal = sorted.slice(MAX_SLICES).reduce((s, c) => s + Number(c.total), 0);
  return [
    ...top.map((c) => ({
      name: c.category,
      value: Number(c.total),
      color: getCategoryColor(c.category).chart,
    })),
    { name: "Others", value: othersTotal, color: "#9ca3af" },
  ];
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "green" | "red" | "neutral";
}) {
  const valueColor =
    highlight === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : highlight === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-900 dark:text-gray-100";
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-xl font-extrabold tracking-tight truncate ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
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
  // momData is refetched on gastosai:expense-changed, so editing a current-month expense updates this.
  const total = momData?.currentTotal ?? 0;
  const chartData = buildChartData(categoryData);
  const today = new Date().getDate();
  const dailyAvg = today > 0 ? total / today : 0;
  const topCategory = categoryData.length > 0
    ? [...categoryData].sort((a, b) => Number(b.total) - Number(a.total))[0]
    : null;
  const remainingBudget =
    budgetSummary && budgetSummary.items.length > 0 ? budgetSummary.safeToSpend : null;

  const momPercent = momData?.changePercent ?? null;
  const momHighlight: "green" | "red" | "neutral" =
    momPercent === null ? "neutral" : momPercent > 0 ? "red" : "green";
  const momValue =
    momPercent === null
      ? "—"
      : momPercent === 0
        ? "±0%"
        : `${momPercent > 0 ? "+" : ""}${momPercent.toFixed(1)}%`;

  if (loading)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-44 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
            <div className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <div className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
            <div className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );

  if (error)
    return <p className="text-red-500 text-center py-8">{error}</p>;

  return (
    <div className="space-y-6">
      {/* Row 1: KPI mini-cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="This Month"
          value={formatCurrency(total)}
          sub={formatMonthLabel(currentMonth)}
        />
        <KpiCard
          label="vs Last Month"
          value={momValue}
          sub={momData ? `vs ${prevMonthLabel(momData.month)}` : "No prior data"}
          highlight={momHighlight}
        />
        <KpiCard
          label="Daily Average"
          value={formatCurrency(dailyAvg)}
          sub={`Day ${today} of month`}
        />
        <KpiCard
          label="Biggest Category"
          value={topCategory ? topCategory.category : "—"}
          sub={topCategory ? formatCurrency(Number(topCategory.total)) : "No data yet"}
        />
        <KpiCard
          label="Remaining Budget"
          value={remainingBudget !== null ? formatCurrency(remainingBudget) : "—"}
          sub={remainingBudget !== null ? "safe to spend" : "No budget set"}
          highlight={
            remainingBudget === null ? "neutral" : remainingBudget >= 0 ? "green" : "red"
          }
        />
      </div>

      {/* Row 2: AI Insights (premium) */}
      <FeatureGate feature="ADVANCED_INSIGHTS">
        <AiInsightsCard month={currentMonth} />
      </FeatureGate>

      {/* Row 3: Main 2-panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: daily trend + category breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <DailyTrendCard month={currentMonth} />

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Spending by Category
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatMonthLabel(currentMonth)}
                </p>
              </div>
              {categoryData.length > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {categoryData.length} {categoryData.length === 1 ? "category" : "categories"}
                </span>
              )}
            </div>
            {chartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                No category data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 38)}>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCurrency(v as number)}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(v as number)}
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: budget + alerts */}
        <div className="space-y-6">
          <BudgetOverviewCard month={currentMonth} />
          <AlertsCard />
        </div>
      </div>

      {/* Row 4: Goals + Upcoming bills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GoalProgressCard />
        <UpcomingBillsCard month={currentMonth} />
      </div>

      {/* Row 5: Top expenses + Monthly trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopExpensesCard month={currentMonth} />

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <div className="mb-4">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Monthly Trend</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last 6 months</p>
          </div>
          {monthlyData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              No monthly data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={monthlyData.slice(-6)}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v: string) => {
                    const [y, m] = v.split("-").map(Number);
                    return new Date(y, m - 1, 1).toLocaleString("default", { month: "short" });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v as number)}
                  width={80}
                />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 6: Recent expenses */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Recent Expenses</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {recentExpenses.length} most recent
          </span>
        </div>
        {recentExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-gray-600 dark:text-gray-400 font-semibold">No expenses yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Add an expense to see it here
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentExpenses.map((e) => {
              const color = getCategoryColor(e.category ?? "");
              return (
                <li
                  key={e.id}
                  className="px-6 py-3.5 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${color.bg} ${color.darkBg} ${color.text} ${color.darkText}`}
                      >
                        {e.category}
                      </span>
                      {e.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                          {e.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(e.amount)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(e.date)}
                    </div>
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
