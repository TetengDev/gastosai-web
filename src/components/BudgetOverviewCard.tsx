import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBudgetSummary } from "../api/budgets";
import type { BudgetSummaryResponse } from "../api/types";
import { formatCurrency } from "../lib/formatters";

interface Props {
  month: string;
}

const STATUS_BAR: Record<string, string> = {
  ON_TRACK: "bg-emerald-500",
  WARNING: "bg-amber-500",
  OVER_BUDGET: "bg-red-500",
};

export default function BudgetOverviewCard({ month }: Props) {
  const [summary, setSummary] = useState<BudgetSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBudgetSummary(month)
      .then((data) => { setSummary(data); setError(null); })
      .catch(() => setError("Failed to load budget summary."))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
        Budget Overview
      </p>

      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="space-y-2 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {!loading && !error && summary && summary.items.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
            No budgets set for this month
          </p>
          <Link
            to="/budget"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Set budgets →
          </Link>
        </div>
      )}

      {!loading && !error && summary && summary.items.length > 0 && (
        <>
          <div className="mb-4">
            <p
              className={`text-3xl font-extrabold tracking-tight ${
                summary.safeToSpend >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(summary.safeToSpend)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Safe to Spend</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Daily Allowance:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(summary.dailyAllowance)}
              </span>
            </p>
          </div>

          <div className="space-y-3">
            {summary.items.slice(0, 5).map((item) => (
              <div key={item.categoryId}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[60%]">
                    {item.categoryName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                    {item.percentUsed.toFixed(0)}% used
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR[item.status] ?? "bg-gray-400"}`}
                    style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {summary.items.length > 5 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              +{summary.items.length - 5} more —{" "}
              <Link to="/budget" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                view all
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
