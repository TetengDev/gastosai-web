import { BellOff, CheckCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type Alert, dismissAlert, getAlerts, markAlertRead } from "../api/alerts";

function severityBadge(severity: Alert["severity"]) {
  if (severity === "CRITICAL")
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (severity === "WARNING")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
}

function typeLabel(type: Alert["type"]) {
  if (type === "BUDGET_WARNING") return "Budget Warning";
  if (type === "BUDGET_EXCEEDED") return "Budget Exceeded";
  return "Spending Spike";
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    getAlerts(month)
      .then((data) => {
        setAlerts(data);
        setError(null);
      })
      .catch(() => setError("Failed to load alerts."))
      .finally(() => setLoading(false));
  }, [month]);

  const handleRead = async (id: number) => {
    const updated = await markAlertRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDismiss = async (id: number) => {
    await dismissAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Spending Alerts
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-16 text-center">
          <BellOff className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            No active alerts for this month
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Alerts are generated when spending approaches or exceeds budget limits.
          </p>
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm p-5 transition-colors ${
                alert.read
                  ? "border-gray-100 dark:border-gray-800 opacity-70"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex flex-col gap-1.5 shrink-0 pt-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${severityBadge(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                      {typeLabel(alert.type)}
                      {alert.categoryName && (
                        <span className="ml-1 text-indigo-500 dark:text-indigo-400">
                          · {alert.categoryName}
                        </span>
                      )}
                    </p>
                    <p
                      className={`text-sm ${
                        alert.read
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!alert.read && (
                    <button
                      onClick={() => void handleRead(alert.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => void handleDismiss(alert.id)}
                    title="Dismiss"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
