import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGoals, type Goal } from "../api/goals";
import { formatCurrency } from "../lib/formatters";

const STATUS_LABEL: Record<Goal["status"], string> = {
  ON_TRACK: "On Track",
  BEHIND: "Behind",
  COMPLETED: "Completed",
  PAUSED: "Paused",
};

const STATUS_BADGE: Record<Goal["status"], string> = {
  ON_TRACK: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  BEHIND: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  COMPLETED: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  PAUSED: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};

const STATUS_BAR: Record<Goal["status"], string> = {
  ON_TRACK: "bg-emerald-500",
  BEHIND: "bg-amber-500",
  COMPLETED: "bg-indigo-500",
  PAUSED: "bg-gray-400",
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
        Savings Goals
      </p>

      {loading && (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {!loading && !error && active.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No active goals</p>
          <Link
            to="/goals"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Set a goal →
          </Link>
        </div>
      )}

      {!loading && !error && active.length > 0 && (
        <div className="space-y-4">
          {active.map((goal) => (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                  {goal.name}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[goal.status]}`}>
                  {STATUS_LABEL[goal.status]}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR[goal.status]}`}
                  style={{ width: `${Math.min(100, goal.progressPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>{goal.progressPercent}% of {formatCurrency(goal.targetAmount)}</span>
                <span>{formatCurrency(goal.savedAmount)} saved</span>
              </div>
            </div>
          ))}
          <Link
            to="/goals"
            className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium pt-1"
          >
            View all goals →
          </Link>
        </div>
      )}
    </div>
  );
}
