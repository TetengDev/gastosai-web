import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getObservabilityCost,
  getObservabilityEvents,
  getObservabilityHealth,
  getObservabilitySummary,
} from "../api/admin";
import type {
  AppEventDto,
  ObservabilityCost,
  ObservabilityHealth,
  ObservabilitySummary,
} from "../api/types";
import { formatDate } from "../lib/formatters";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-edge bg-surface-2 px-5 py-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">{label}</div>
      <div className="mt-1 font-display text-2xl font-medium text-ink-hi">{value}</div>
    </div>
  );
}

const usd = (v: string | null) => (v == null ? "$0.00" : `$${Number(v).toFixed(4)}`);
const uptime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function EventTable({ title, rows, empty }: { title: string; rows: AppEventDto[]; empty: string }) {
  return (
    <div className="mt-8">
      <h2 className="font-display text-xl font-medium text-ink-hi">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">{empty}</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-edge">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge-2 bg-surface-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  <th className="px-5 py-4 text-left font-normal">Time</th>
                  <th className="px-5 py-4 text-left font-normal">Type</th>
                  <th className="px-5 py-4 text-left font-normal">Path</th>
                  <th className="px-5 py-4 text-left font-normal">Status</th>
                  <th className="px-5 py-4 text-left font-normal">User</th>
                  <th className="px-5 py-4 text-left font-normal">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-edge-3 last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-ink">{formatDate(e.createdAt)}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink">{e.eventType}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-2">{e.path ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-2">{e.httpStatus ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-3">{e.userId ? "#" + e.userId : "—"}</td>
                    <td className="max-w-xs truncate px-5 py-3 text-ink-3">{e.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminObservability() {
  const { isAdmin } = useAuth();
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [cost, setCost] = useState<ObservabilityCost | null>(null);
  const [events, setEvents] = useState<AppEventDto[]>([]);
  const [health, setHealth] = useState<ObservabilityHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      getObservabilitySummary(),
      getObservabilityCost(),
      getObservabilityEvents(undefined, 200),
      getObservabilityHealth(),
    ])
      .then(([s, c, e, h]) => {
        setSummary(s);
        setCost(c);
        setEvents(e);
        setHealth(h);
      })
      .catch(() => setError("Failed to load observability data."))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const mtdCost = cost?.monthToDate.reduce((sum, i) => sum + Number(i.estimatedCostUsd ?? "0"), 0) ?? 0;
  const errors = events.filter((e) => e.severity === "ERROR");
  const abuse = events.filter((e) => e.severity === "WARN");

  return (
    <div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink-hi">Observability</h1>
      <p className="mt-2 text-[15px] text-ink-2">System health, user activity, AI cost, and recent operational events.</p>

      {loading && <p className="mt-8 text-sm text-ink-3">Loading…</p>}
      {error && <p className="mt-8 text-sm text-[#b30000]">{error}</p>}

      {!loading && !error && (
        <>
          <h2 className="mt-8 font-display text-xl font-medium text-ink-hi">System</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Database" value={health?.dbUp ? "UP" : "DOWN"} />
            <Stat label="Version" value={health?.version ?? "—"} />
            <Stat label="Uptime" value={health ? uptime(health.uptimeSeconds) : "—"} />
          </div>

          <h2 className="mt-8 font-display text-xl font-medium text-ink-hi">Users &amp; activity</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Total users" value={summary?.totalUsers ?? 0} />
            <Stat label="New today" value={summary?.signupsToday ?? 0} />
            <Stat label="New 7d" value={summary?.signups7d ?? 0} />
            <Stat label="New 30d" value={summary?.signups30d ?? 0} />
            <Stat label="Active 24h" value={summary?.activeUsers24h ?? 0} />
            <Stat label="Active 7d" value={summary?.activeUsers7d ?? 0} />
          </div>

          <h2 className="mt-8 font-display text-xl font-medium text-ink-hi">AI cost</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Today (USD)" value={usd(cost?.todayCostUsd ?? null)} />
            <Stat label="Month-to-date" value={`$${mtdCost.toFixed(4)}`} />
            <Stat label="Success today" value={cost?.successToday ?? 0} />
            <Stat label="Failed today" value={cost?.failedToday ?? 0} />
          </div>

          <h2 className="mt-8 font-display text-xl font-medium text-ink-hi">Top users by AI requests (30d)</h2>
          {summary && summary.topUsers30d.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-edge">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge-2 bg-surface-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                    <th className="px-5 py-4 text-left font-normal">User</th>
                    <th className="px-5 py-4 text-left font-normal">AI requests</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topUsers30d.map((u) => (
                    <tr key={u.userId ?? "unknown"} className="border-b border-edge-3 last:border-0">
                      <td className="px-5 py-3 text-ink">{u.userId ? "#" + u.userId : "—"}</td>
                      <td className="px-5 py-3 text-ink-2">{u.requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-3">No AI activity yet.</p>
          )}

          <EventTable title="Recent errors" rows={errors} empty="No server errors recorded." />
          <EventTable title="Abuse-guard trips" rows={abuse} empty="No abuse-guard trips recorded." />
        </>
      )}
    </div>
  );
}
