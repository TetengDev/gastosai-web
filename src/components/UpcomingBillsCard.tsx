import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUpcomingBills } from "../api/recurring";
import type { UpcomingBillResponse } from "../api/types";
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
        Upcoming Bills
      </p>

      {loading && (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-gray-400 dark:text-gray-500">{error}</p>
      )}

      {!loading && !error && bills.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">No upcoming bills this month.</p>
      )}

      {!loading && !error && bills.length > 0 && (
        <ul className="space-y-2">
          {bills.slice(0, 5).map((bill) => (
            <li key={bill.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate block">
                  {bill.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {bill.categoryName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDueDate(bill.dueDate)}
                  </span>
                </div>
              </div>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100 flex-shrink-0">
                {formatCurrency(bill.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Link
          to="/recurring"
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View all →
        </Link>
      </div>
    </div>
  );
}
