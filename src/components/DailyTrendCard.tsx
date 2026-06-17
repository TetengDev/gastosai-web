import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDailyReport } from "../api/expenses";
import type { DailyReport } from "../api/types";
import { Card } from "./ui";
import { formatCurrency } from "../lib/formatters";

interface Props {
  month: string;
}

function formatMonthTitle(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

export default function DailyTrendCard({ month }: Props) {
  const [data, setData] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    getDailyReport(month)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    fetchData();
    window.addEventListener("gastosai:expense-changed", fetchData);
    return () => window.removeEventListener("gastosai:expense-changed", fetchData);
  }, [fetchData]);

  const chartData = data.map((d) => ({
    day: d.date.split("-")[2],
    total: d.total,
  }));

  const hasData = chartData.some((d) => d.total > 0);

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <div className="font-display text-[22px] font-medium tracking-tight text-ink-hi">
          Daily Trend
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          {formatMonthTitle(month)}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 h-[180px] animate-pulse rounded-xl bg-surface-2" />
      ) : !hasData ? (
        <div className="mt-6 flex h-[180px] items-center justify-center text-sm text-ink-3">
          No expenses this month.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180} className="mt-6">
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "var(--ga-text3)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis width={0} hide />
            <Tooltip
              formatter={(v) => formatCurrency(v as number)}
              contentStyle={{
                borderRadius: "0.75rem",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              }}
            />
            <Bar dataKey="total" fill="#1f8a5b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
