import { useCallback, useEffect, useState } from "react";
import { getTopTransactions } from "../api/expenses";
import type { Expense } from "../api/types";
import { Card, InfoTip } from "./ui";
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
    <Card>
      <div className="flex items-center gap-1.5">
        <div className="font-display text-[22px] font-medium tracking-tight text-ink-hi">
          Top Expenses
        </div>
        <InfoTip text="Your five largest individual expenses this month." />
      </div>
      <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        This month · top 5
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-ink-3">
          No expenses this month.
        </div>
      ) : (
        <ul className="mt-2">
          {expenses.map((e, index) => {
            const color = getCategoryColor(e.category ?? "");
            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 border-b border-edge-3 py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-4 flex-shrink-0 text-right text-xs font-semibold text-ink-3">
                    {index + 1}
                  </span>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.darkBg} ${color.text} ${color.darkText}`}
                  >
                    {e.category}
                  </span>
                  <span className="truncate text-sm text-ink-2">{e.description}</span>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-semibold text-ink-hi">
                    {formatCurrency(e.amount)}
                  </div>
                  <div className="text-xs text-ink-3">{formatShortDate(e.date)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
