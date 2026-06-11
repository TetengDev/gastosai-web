import { useEffect, useState } from "react";
import { getTopCategoryInsight, getMonthSummaryInsight, getRecommendationsInsight } from "../api/insights";
import type { TopCategoryInsight, MonthSummaryInsight, RecommendationsInsight } from "../api/types";

interface Props {
  month: string;
}

export default function AiInsightsCard({ month }: Props) {
  const [topCategory, setTopCategory] = useState<TopCategoryInsight | null>(null);
  const [summary, setSummary] = useState<MonthSummaryInsight | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      getTopCategoryInsight(month),
      getMonthSummaryInsight(month),
      getRecommendationsInsight(month),
    ])
      .then(([top, sum, recs]) => {
        setTopCategory(top);
        setSummary(sum);
        setRecommendations(recs);
      })
      .catch(() => setError("Unable to load AI insights."))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
          AI Insights
        </p>
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
          AI Insights
        </p>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
        AI Insights
      </p>
      <div className="space-y-4">
        {topCategory && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top Category</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {topCategory.category}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                ₱{topCategory.total.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {topCategory.percentOfMonthTotal}% of month
              </span>
            </div>
          </div>
        )}
        {summary && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Month Summary</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{summary.summary}</p>
          </div>
        )}
        {recommendations && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recommendations</p>
            <ul className="space-y-1">
              {recommendations.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>→</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
