import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTopCategoryInsight, getMonthSummaryInsight, getRecommendationsInsight } from "../api/insights";
import type { TopCategoryInsight, MonthSummaryInsight, RecommendationsInsight } from "../api/types";
import { useAiAvailability } from "../hooks/useAiAvailability";

interface Props {
  month: string;
}

function MiniSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      ))}
    </div>
  );
}

export default function AiInsightsCard({ month }: Props) {
  const aiAvailable = useAiAvailability();
  const [topCategory, setTopCategory] = useState<TopCategoryInsight | null>(null);
  const [summary, setSummary] = useState<MonthSummaryInsight | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsInsight | null>(null);
  const [topLoading, setTopLoading] = useState(true);
  const [sumLoading, setSumLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);

  useEffect(() => {
    if (!aiAvailable) return;
    // Each insight is an independent LLM call. Render each as soon as it resolves instead of
    // waiting for the slowest (Promise.all) — the card fills in progressively.
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTopLoading(true); setSumLoading(true); setRecLoading(true);
    setTopCategory(null); setSummary(null); setRecommendations(null);

    getTopCategoryInsight(month).then((d) => { if (active) setTopCategory(d); }).catch(() => {}).finally(() => { if (active) setTopLoading(false); });
    getMonthSummaryInsight(month).then((d) => { if (active) setSummary(d); }).catch(() => {}).finally(() => { if (active) setSumLoading(false); });
    getRecommendationsInsight(month).then((d) => { if (active) setRecommendations(d); }).catch(() => {}).finally(() => { if (active) setRecLoading(false); });

    return () => { active = false; };
  }, [month, aiAvailable]);

  const allDone = !topLoading && !sumLoading && !recLoading;
  const allFailed = allDone && !topCategory && !summary && !recommendations;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
        AI Insights
      </p>

      {aiAvailable === false ? (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p className="mb-2">AI insights need your OpenAI key.</p>
          <Link to="/settings" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Connect your key in Settings →
          </Link>
        </div>
      ) : allFailed ? (
        <p className="text-sm text-red-500">Unable to load AI insights.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top Category</p>
            {topCategory ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{topCategory.category}</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">₱{topCategory.total.toLocaleString()}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{topCategory.percentOfMonthTotal}% of month</span>
              </div>
            ) : topLoading ? <MiniSkeleton /> : null}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Month Summary</p>
            {summary ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">{summary.summary}</p>
            ) : sumLoading ? <MiniSkeleton lines={2} /> : null}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recommendations</p>
            {recommendations ? (
              <ul className="space-y-1">
                {recommendations.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : recLoading ? <MiniSkeleton lines={2} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
