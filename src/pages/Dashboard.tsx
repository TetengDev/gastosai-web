import { useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getCategoryReport, getExpenses } from "../api/expenses";
import type { CategoryReport, Expense } from "../api/types";
import {
  formatCurrency,
  formatDate,
  getCategoryColor,
} from "../lib/formatters";

export default function Dashboard() {
  const [categoryData, setCategoryData] = useState<CategoryReport[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCategoryReport(), getExpenses()])
      .then(([cats, expenses]) => {
        setCategoryData(cats);
        setRecentExpenses(expenses.slice(0, 10));
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  const total = categoryData.reduce((sum, c) => sum + Number(c.total), 0);
  const chartData = categoryData.map((c) => ({
    name: c.category,
    value: Number(c.total),
    color: getCategoryColor(c.category).chart,
  }));

  if (loading)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-gradient-to-r from-violet-200 to-indigo-200 dark:from-violet-900 dark:to-indigo-900 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  if (error)
    return <p className="text-red-500 text-center py-8">{error}</p>;

  return (
    <div className="space-y-6">
      {/* Hero spending card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 p-8 shadow-xl shadow-indigo-500/25">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_60%)]" />
        <div className="relative">
          <p className="text-xs font-semibold text-indigo-200 uppercase tracking-widest">
            Total Spending
          </p>
          <p className="mt-2 text-5xl font-extrabold text-white tracking-tight">
            {formatCurrency(total)}
          </p>
          <p className="mt-2 text-sm text-indigo-200">
            across {categoryData.length}{" "}
            {categoryData.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
      </div>

      {/* Chart + breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {chartData.length > 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              By Category
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={48}
                  paddingAngle={3}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v as number)}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "none",
                    boxShadow:
                      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            No category data yet.
          </div>
        )}

        {/* Category breakdown with progress bars */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
            Category Breakdown
          </p>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
              No categories yet.
            </div>
          ) : (
            <div className="space-y-4">
              {categoryData.map((c) => {
                const color = getCategoryColor(c.category);
                const pct =
                  total > 0 ? (Number(c.total) / total) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {c.category}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(Number(c.total))}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color.chart,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent expenses */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Recent Expenses
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {recentExpenses.length} most recent
          </span>
        </div>
        {recentExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-gray-600 dark:text-gray-400 font-semibold">
              No expenses yet
            </p>
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
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`}
                    />
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${color.bg} ${color.text}`}
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