import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGoals, type Goal } from "../api/goals";
import { Celebrate, ProgressMeter } from "./ui";
import { formatCurrencyAmount } from "../lib/formatters";
import { goalTone } from "../lib/pisoMood";

/** Active goals soonest-deadline first, then completed ones; a paused goal is not news. */
function stripOrder(goals: Goal[]): Goal[] {
  const byDeadline = (a: Goal, b: Goal) => {
    if (!a.targetDate && !b.targetDate) return 0;
    if (!a.targetDate) return 1;
    if (!b.targetDate) return -1;
    return a.targetDate.localeCompare(b.targetDate);
  };
  const active = goals.filter((g) => g.status === "ON_TRACK" || g.status === "BEHIND").sort(byDeadline);
  const done = goals.filter((g) => g.status === "COMPLETED");
  return [...active, ...done];
}

/** The dashboard's goals strip: one horizontally scrolling row of meters. */
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
      .catch(() => setError("Couldn't load your goals."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener("gastosai:goal-changed", fetchData);
    return () => window.removeEventListener("gastosai:goal-changed", fetchData);
  }, [fetchData]);

  const shown = stripOrder(goals);

  return (
    <section data-section="goals" aria-labelledby="goals-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="goals-heading" className="m-0 font-display text-lg font-medium text-ink-hi">
          Goals
        </h2>
        {shown.length > 0 && (
          <Link to="/goals" className="text-sm font-medium text-ink-hi underline-offset-4 hover:underline">
            See all
          </Link>
        )}
      </div>

      {loading ? (
        <div className="mt-3 flex gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 w-56 shrink-0 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-ink-3">{error}</p>
      ) : shown.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">
          Nothing saved toward yet.{" "}
          <Link to="/goals" className="font-medium text-ink-hi underline underline-offset-4">
            Set a goal
          </Link>
        </p>
      ) : (
        <ul className="-mx-1 mt-3 flex snap-x list-none gap-3 overflow-x-auto px-1 pb-2">
          {shown.map((goal) => {
            const currency = goal.currency ?? "PHP";
            const completed = goal.status === "COMPLETED";
            return (
              <li
                key={goal.id}
                className="flex w-60 shrink-0 snap-start flex-col gap-2 rounded-xl border border-edge bg-surface p-4"
              >
                <div className="flex min-h-10 items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{goal.name}</span>
                  {completed ? (
                    <Celebrate event={`goal-${goal.id}`} size={40} />
                  ) : (
                    goal.status === "BEHIND" && <span className="shrink-0 text-xs text-warn-ink">Behind</span>
                  )}
                </div>
                <ProgressMeter
                  percent={goal.progressPercent}
                  tone={goalTone(goal.status)}
                  label={goal.name}
                  height={6}
                />
                <p className="m-0 text-xs tabular-nums text-ink-2">
                  {formatCurrencyAmount(goal.savedAmount, currency)} of{" "}
                  {formatCurrencyAmount(goal.targetAmount, currency)} · {Math.round(goal.progressPercent)}%
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
