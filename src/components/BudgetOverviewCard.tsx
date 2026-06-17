import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBudgetSummary } from "../api/budgets";
import type { BudgetSummaryResponse } from "../api/types";
import { Card, ProgressBar } from "./ui";
import { formatCurrency } from "../lib/formatters";

interface Props {
  month: string;
}

function barColor(percentUsed: number): string {
  if (percentUsed >= 80) return "#e8590c";
  if (percentUsed === 0) return "#c4c4cc";
  return "#1f8a5b";
}

export default function BudgetOverviewCard({ month }: Props) {
  const [summary, setSummary] = useState<BudgetSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    getBudgetSummary(month)
      .then((data) => { setSummary(data); setError(null); })
      .catch(() => setError("Failed to load budget summary."))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    fetchData();
    window.addEventListener("gastosai:expense-changed", fetchData);
    window.addEventListener("gastosai:budget-changed", fetchData);
    return () => {
      window.removeEventListener("gastosai:expense-changed", fetchData);
      window.removeEventListener("gastosai:budget-changed", fetchData);
    };
  }, [fetchData]);

  return (
    <Card tone="panel">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Budget overview
      </p>

      {loading && (
        <div className="mt-3 animate-pulse space-y-3">
          <div className="h-10 w-40 rounded-lg bg-track" />
          <div className="h-4 w-32 rounded bg-track" />
          <div className="mt-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 rounded-lg bg-track" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && <p className="mt-3 text-sm text-[#b30000]">{error}</p>}

      {!loading && !error && summary && summary.items.length === 0 && (
        <div className="py-4 text-center">
          <p className="mb-2 text-sm text-ink-2">No budgets set for this month</p>
          <Link to="/budget" className="text-sm font-medium text-link hover:underline">
            Set budgets →
          </Link>
        </div>
      )}

      {!loading && !error && summary && summary.items.length > 0 && (
        <>
          <div className="mt-2.5">
            <p className="font-display text-[42px] font-medium leading-none tracking-tight text-deep">
              {formatCurrency(summary.safeToSpend)}
            </p>
            <p className="mt-2 text-sm text-ink-2">
              Safe to spend · {formatCurrency(summary.dailyAllowance)} / day
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {summary.items.slice(0, 5).map((item) => (
              <div key={item.categoryId}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="truncate text-ink">{item.categoryName}</span>
                  <span
                    className="ml-2 flex-shrink-0 font-mono text-xs"
                    style={{ color: barColor(item.percentUsed) }}
                  >
                    {item.percentUsed.toFixed(0)}% used
                  </span>
                </div>
                <ProgressBar
                  percent={item.percentUsed}
                  color={barColor(item.percentUsed)}
                  height={6}
                />
              </div>
            ))}
          </div>

          {summary.items.length > 5 && (
            <p className="mt-3 text-xs text-ink-3">
              +{summary.items.length - 5} more —{" "}
              <Link to="/budget" className="text-link hover:underline">
                view all
              </Link>
            </p>
          )}
        </>
      )}
    </Card>
  );
}
