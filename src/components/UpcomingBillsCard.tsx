import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUpcomingBills } from "../api/recurring";
import type { UpcomingBillResponse } from "../api/types";
import { Card } from "./ui";
import { formatCurrency } from "../lib/formatters";

interface Props {
  month: string;
}

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleString("en-PH", { month: "short", day: "numeric" });
}

export default function UpcomingBillsCard({ month }: Props) {
  const [bills, setBills] = useState<UpcomingBillResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    getUpcomingBills(month)
      .then((data) => { setBills(data); setError(null); })
      .catch(() => setError("Could not load upcoming bills."))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    fetchData();
    window.addEventListener("gastosai:recurring-changed", fetchData);
    return () => window.removeEventListener("gastosai:recurring-changed", fetchData);
  }, [fetchData]);

  return (
    <Card>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Upcoming Bills
      </p>

      {loading && (
        <div className="mt-4 animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-surface-2" />
          ))}
        </div>
      )}

      {!loading && error && <p className="mt-4 text-sm text-ink-3">{error}</p>}

      {!loading && !error && bills.length === 0 && (
        <p className="mt-4 text-sm text-ink-3">No upcoming bills this month.</p>
      )}

      {!loading && !error && bills.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {bills.slice(0, 5).map((bill) => (
            <li key={bill.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-hi">
                  {bill.name}
                </span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="rounded-full bg-surface-4 px-2 py-0.5 text-xs text-ink-2">
                    {bill.categoryName}
                  </span>
                  <span className="text-xs text-ink-3">{formatDueDate(bill.dueDate)}</span>
                </div>
              </div>
              <span className="flex-shrink-0 text-right text-sm font-medium text-ink-hi">
                {bill.currency !== "PHP" && (
                  <span className="block text-xs font-medium text-link">
                    {bill.currency} {bill.amount.toFixed(2)}
                  </span>
                )}
                {formatCurrency(bill.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Link to="/recurring" className="text-sm font-medium text-link hover:underline">
          View all →
        </Link>
      </div>
    </Card>
  );
}
