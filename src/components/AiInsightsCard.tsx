import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTopCategoryInsight, getMonthSummaryInsight, getRecommendationsInsight } from "../api/insights";
import type { TopCategoryInsight, MonthSummaryInsight, RecommendationsInsight } from "../api/types";
import { useAiAvailability } from "../hooks/useAiAvailability";
import { Card } from "./ui";

interface Props {
  month: string;
}

function MiniSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-surface-2" />
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

  if (aiAvailable === false) {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-edge-2 py-6">
        <div className="font-mono text-xs uppercase tracking-[0.12em] text-ink-3">AI Insights</div>
        <div className="flex-1 text-[17px] text-ink">
          Insights need your AI key to analyze spending patterns and surface anomalies.
        </div>
        <Link to="/settings" className="whitespace-nowrap text-base font-medium text-link hover:underline">
          Connect your key in Settings →
        </Link>
      </div>
    );
  }

  return (
    <Card>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">AI Insights</p>

      {allFailed ? (
        <p className="mt-4 text-sm text-[#b30000]">Unable to load AI insights.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 text-xs text-ink-2">Top Category</p>
            {topCategory ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink-hi">{topCategory.category}</span>
                <span className="text-sm text-ink-2">₱{topCategory.total.toLocaleString()}</span>
                <span className="text-xs text-ink-3">{topCategory.percentOfMonthTotal}% of month</span>
              </div>
            ) : topLoading ? <MiniSkeleton /> : null}
          </div>
          <div>
            <p className="mb-1 text-xs text-ink-2">Month Summary</p>
            {summary ? (
              <p className="text-sm text-ink">{summary.summary}</p>
            ) : sumLoading ? <MiniSkeleton lines={2} /> : null}
          </div>
          <div>
            <p className="mb-1 text-xs text-ink-2">Recommendations</p>
            {recommendations ? (
              <ul className="space-y-1">
                {recommendations.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink">
                    <span>→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : recLoading ? <MiniSkeleton lines={2} /> : null}
          </div>
        </div>
      )}
    </Card>
  );
}
