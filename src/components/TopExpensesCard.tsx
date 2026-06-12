import { useCallback, useEffect, useState } from "react";
import { getTopTransactions } from "../api/expenses";
import type { Expense } from "../api/types";
import { formatCurrency, getCategoryColor } from "../lib/formatters";

interface Props {
  month: string;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("default", { month: "short", day: "numeric" });
}

export default function TopExpensesCard({ month }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    getTopTransactions(month, 5)
      .then(setExpenses)
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    fetchData();
    window.addEventListener("gastosai:expense-changed", fetchData);
    return () => window.removeEventListener("gastosai:expense-changed", fetchData);
  }, [fetchData]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      <div className="mb-4">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Top Expenses</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">This month · top 5</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          No expenses this month.
        </div>
      ) : (
        <ul className="divide-y divide-gray-50 dark:divide-gray-800">
          {expenses.map((e, index) => {
            const color = getCategoryColor(e.category ?? "");
            return (
              <li key={e.id} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-4 flex-shrink-0 text-right">
                    {index + 1}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${color.bg} ${color.darkBg} ${color.text} ${color.darkText}`}
                  >
                    {e.category}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {e.description}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(e.amount)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {formatShortDate(e.date)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
