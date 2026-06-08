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
import { formatCurrency, formatDate } from "../lib/formatters";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];

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
  }));

  if (loading)
    return (
      <div className="flex justify-center py-20 text-gray-400">Loading...</div>
    );
  if (error)
    return <p className="text-red-500 text-center py-8">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Total Spending
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(total)}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            across {categoryData.length} categories
          </p>
        </div>

        {chartData.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
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
                  outerRadius={80}
                  innerRadius={44}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v as number)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center text-gray-400 text-sm">
            No category data yet.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Expenses</h2>
        </div>
        {recentExpenses.length === 0 ? (
          <p className="p-8 text-gray-400 text-center text-sm">
            No expenses yet. Head to Expenses to add some.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentExpenses.map((e) => (
              <li
                key={e.id}
                className="px-6 py-3 flex justify-between items-center"
              >
                <div>
                  <span className="font-medium text-gray-800">
                    {e.category}
                  </span>
                  {e.note && (
                    <span className="ml-2 text-sm text-gray-400">{e.note}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {formatCurrency(e.amount)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(e.date)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}