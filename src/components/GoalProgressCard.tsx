import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGoals, type Goal } from "../api/goals";
import { Card, InfoTip, ProgressBar } from "./ui";
import { formatCurrency } from "../lib/formatters";

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱", USD: "$", EUR: "€", SGD: "S$", JPY: "¥", GBP: "£", AUD: "A$",
};

function fmtGoal(amount: number, currency: string): string {
  if (currency === "PHP") return formatCurrency(amount);
  return `${CURRENCY_SYMBOLS[currency] ?? currency}${amount.toFixed(2)}`;
}

const STATUS_LABEL: Record<Goal["status"], string> = {
  ON_TRACK: "On Track",
  BEHIND: "Behind",
  COMPLETED: "Completed",
  PAUSED: "Paused",
};

const STATUS_BADGE: Record<Goal["status"], string> = {
  ON_TRACK: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  BEHIND: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  COMPLETED: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  PAUSED: "bg-surface-2 text-ink-3",
};

const STATUS_BAR: Record<Goal["status"], string> = {
  ON_TRACK: "#1f8a5b",
  BEHIND: "#e8590c",
  COMPLETED: "#1f8a5b",
  PAUSED: "#c4c4cc",
};

export default function GoalProgressCard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    getGoals()
      .then((data) => {
        setGoals(data);
        setError(null);
      })
      .catch(() => setError("Failed to load goals."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener("gastosai:goal-changed", fetchData);
    return () => window.removeEventListener("gastosai:goal-changed", fetchData);
  }, [fetchData]);

  const active = goals
    .filter((g) => g.status !== "COMPLETED" && g.status !== "PAUSED")
    .sort((a, b) => {
      if (!a.targetDate && !b.targetDate) return 0;
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return a.targetDate.localeCompare(b.targetDate);
    })
    .slice(0, 4);

  return (
    <Card>
      <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Savings Goals
        <InfoTip text="Progress toward your active savings goals — amount saved vs. target and status." />
      </p>

      {loading && (
        <div className="mt-4 animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-3/4 rounded bg-surface-2" />
              <div className="h-2 rounded-full bg-surface-2" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && <p className="mt-4 text-sm text-[#b30000]">{error}</p>}

      {!loading && !error && active.length === 0 && (
        <div className="py-4 text-center">
          <p className="mb-2 text-sm text-ink-2">No active goals</p>
          <Link to="/goals" className="text-sm font-medium text-link hover:underline">
            Set a goal →
          </Link>
        </div>
      )}

      {!loading && !error && active.length > 0 && (
        <div className="mt-4 space-y-4">
          {active.map((goal) => (
            <div key={goal.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="mr-2 flex-1 truncate text-sm font-medium text-ink">
                  {goal.name}
                </span>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[goal.status]}`}>
                  {STATUS_LABEL[goal.status]}
                </span>
              </div>
              <ProgressBar
                percent={goal.progressPercent}
                color={STATUS_BAR[goal.status]}
                height={6}
                className="mb-1"
              />
              <div className="flex justify-between text-xs text-ink-3">
                <span>{goal.progressPercent}% of {fmtGoal(goal.targetAmount, goal.currency ?? "PHP")}</span>
                <span>{fmtGoal(goal.savedAmount, goal.currency ?? "PHP")} saved</span>
              </div>
            </div>
          ))}
          <Link to="/goals" className="block pt-1 text-sm font-medium text-link hover:underline">
            View all goals →
          </Link>
        </div>
      )}
    </Card>
  );
}
