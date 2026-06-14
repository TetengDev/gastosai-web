import { CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { type Alert, getAlerts, markAlertRead } from "../api/alerts";

function severityDot(severity: Alert["severity"]) {
  if (severity === "CRITICAL") return "bg-red-500";
  if (severity === "WARNING") return "bg-amber-400";
  return "bg-blue-400";
}

export default function AlertsCard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchData = useCallback(() => {
    getAlerts(currentMonth)
      .then((data) => {
        setAlerts(data.slice(0, 4));
        setError(null);
      })
      .catch(() => setError("Failed to load alerts."))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
    window.addEventListener("gastosai:expense-changed", fetchData);
    return () => window.removeEventListener("gastosai:expense-changed", fetchData);
  }, [fetchData]);

  const handleRead = async (id: number) => {
    const updated = await markAlertRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    window.dispatchEvent(new Event("gastosai:alert-changed"));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
        Spending Alerts
      </p>

      {loading && (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!loading && !error && alerts.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          No active alerts
        </p>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                alert.read
                  ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              }`}
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${severityDot(alert.severity)}`}
              />
              <p
                className={`text-sm flex-1 ${
                  alert.read
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {alert.message}
              </p>
              {!alert.read && (
                <button
                  onClick={() => void handleRead(alert.id)}
                  title="Mark as read"
                  className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <Link
          to="/alerts"
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
        >
          View all alerts →
        </Link>
      </div>
    </div>
  );
}
