import type { FeatureKey } from "../api/entitlements";

const FEATURE_LABELS: Record<FeatureKey, string> = {
  AI_ANALYTICS: "AI-powered analytics",
  NL_CHATBOT: "Natural-language assistant",
  EXPORT_CSV: "CSV export",
  EXPORT_PDF: "PDF export",
  BUDGET_FORECASTING: "Budget forecasting",
  TREND_ANALYSIS: "Multi-month trend analysis",
  CUSTOM_CATEGORIES: "Custom categories",
  UNLIMITED_TRANSACTIONS: "Unlimited transactions",
  ADVANCED_INSIGHTS: "Advanced insights",
  ANOMALY_DETECTION: "Spending anomaly detection",
};

interface Props {
  feature: FeatureKey;
  compact?: boolean;
}

/** Locked-state placeholder shown when a user lacks entitlement to a feature. */
export default function UpgradePrompt({ feature, compact = false }: Props) {
  const label = FEATURE_LABELS[feature] ?? "This feature";
  return (
    <div
      className={`rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20 text-center ${
        compact ? "p-3" : "p-6"
      }`}
    >
      <p className="text-xl" aria-hidden="true">🔒</p>
      <p className="mt-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
        {label} is a Premium feature
      </p>
      {!compact && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Upgrade your plan to unlock it.
        </p>
      )}
      <button
        type="button"
        className="mt-3 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Upgrade to Premium
      </button>
    </div>
  );
}
