import { CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { type Alert, getAlerts, markAlertRead } from "../api/alerts";
import { Card, IconButton, InfoTip } from "./ui";

function severityColor(severity: Alert["severity"]): string {
  if (severity === "CRITICAL") return "#ff7759";
  if (severity === "WARNING") return "#e8590c";
  return "#1863dc";
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
    <Card>
      <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Spending alerts
        <InfoTip text="Notifications when you approach or exceed a category budget this month." />
      </p>

      {loading && (
        <div className="mt-4 animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-surface-2" />
          ))}
        </div>
      )}

      {!loading && error && <p className="mt-4 text-sm text-[#b30000]">{error}</p>}

      {!loading && !error && alerts.length === 0 && (
        <p className="py-4 text-center text-sm text-ink-3">No active alerts</p>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="mt-4 space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: severityColor(alert.severity), opacity: alert.read ? 0.4 : 1 }}
              />
              <p className={`flex-1 text-[14.5px] leading-relaxed ${alert.read ? "text-ink-3" : "text-ink"}`}>
                {alert.message}
              </p>
              {!alert.read && (
                <IconButton onClick={() => void handleRead(alert.id)} title="Mark as read">
                  <CheckCheck className="h-4 w-4" />
                </IconButton>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <Link to="/alerts" className="text-[15px] font-medium text-link hover:underline">
          View all alerts →
        </Link>
      </div>
    </Card>
  );
}
