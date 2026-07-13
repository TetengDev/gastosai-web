import { useNavigate } from "react-router-dom";
import type { FeatureKey } from "../api/entitlements";
import { BILLING_ENABLED } from "../config/billing";

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
  CHAT_PERSONAS: "Professional & Gen Z chat tones",
};

interface Props {
  feature: FeatureKey;
  compact?: boolean;
}

/** Locked-state placeholder shown when a user lacks entitlement to a feature. */
export default function UpgradePrompt({ feature, compact = false }: Props) {
  const navigate = useNavigate();
  const label = FEATURE_LABELS[feature] ?? "This feature";
  return (
    <div
      className={`rounded-2xl border border-dashed border-brand/40 bg-brand/5 text-center ${
        compact ? "p-3" : "p-6"
      }`}
    >
      <p className="text-xl" aria-hidden="true">🔒</p>
      <p className="mt-1 text-sm font-semibold text-brand">
        {label} is a Premium feature
      </p>
      {!compact && (
        <p className="mt-1 text-xs text-ink-3">
          Upgrade your plan to unlock it.
        </p>
      )}
      {BILLING_ENABLED && (
        <button
          type="button"
          onClick={() => navigate("/pricing")}
          className="mt-3 rounded-full bg-cta px-4 py-1.5 text-sm font-medium text-cta-fg hover:opacity-90"
        >
          Upgrade to Premium
        </button>
      )}
    </div>
  );
}
