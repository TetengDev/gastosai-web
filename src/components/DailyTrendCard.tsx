import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDailyReport } from "../api/expenses";
import type { DailyReport } from "../api/types";
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

  useEffect(() => {
    getDailyReport(month)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [month]);

  const chartData = data.map((d) => ({
    day: d.date.split("-")[2],
    total: d.total,
  }));

  const hasData = chartData.some((d) => d.total > 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      <div className="mb-4">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Daily Trend</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatMonthTitle(month)}</p>
      </div>

      {loading ? (
        <div className="h-[180px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      ) : !hasData ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          No expenses this month.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
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
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
