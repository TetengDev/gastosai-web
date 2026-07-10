import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSubscription } from "../api/subscription";
import type { SubscriptionInfo } from "../api/types";
import { Button } from "./ui";

const PLAN_LABELS: Record<SubscriptionInfo["plan"], string> = {
  FREE: "Free",
  PREMIUM: "Premium",
  TRIAL: "Trial",
};

const STATUS_STYLES: Record<SubscriptionInfo["status"], string> = {
  ACTIVE: "bg-[#e7f6ee] text-[#1f8a5b] border-[#1f8a5b]/30",
  TRIAL: "bg-[#e7f6ee] text-[#1f8a5b] border-[#1f8a5b]/30",
  INACTIVE: "border-edge bg-surface-2 text-ink-2",
  EXPIRED: "bg-warn-bg text-warn-ink border-warn-edge",
  CANCELLED: "bg-warn-bg text-warn-ink border-warn-edge",
};

function formatPeriodEnd(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BillingSection() {
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubscription()
      .then(setSub)
      .catch(() => setError("Failed to load billing info."))
      .finally(() => setLoading(false));
  }, []);

  const isPremiumActive = sub?.plan === "PREMIUM" && sub?.status === "ACTIVE";
  const isExpiredOrCancelled = sub?.status === "EXPIRED" || sub?.status === "CANCELLED";

  return (
    <section className="mt-6 rounded-2xl border border-edge bg-surface p-8">
      <div className="font-display text-[21px] font-medium tracking-tight text-ink-hi">Billing & Plan</div>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
        Manage your subscription and upgrade your plan.
      </p>

      {loading && (
        <div className="mt-4 h-14 animate-pulse rounded-xl bg-surface-2" />
      )}

      {error && (
        <p className="mt-4 text-sm font-medium text-[#b30000]">{error}</p>
      )}

      {!loading && sub && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-2">Plan:</span>
            <span
              className={`rounded-full border px-3 py-0.5 text-[13px] font-semibold ${STATUS_STYLES[sub.status]}`}
            >
              {PLAN_LABELS[sub.plan]}
            </span>
            <span className={`rounded-full border px-3 py-0.5 text-[13px] font-medium ${STATUS_STYLES[sub.status]}`}>
              {sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}
            </span>
          </div>

          {sub.currentPeriodEnd && (
            <p className="text-[13px] text-ink-2">
              {isExpiredOrCancelled ? "Expired" : "Renews"}:{" "}
              <span className="font-medium text-ink">{formatPeriodEnd(sub.currentPeriodEnd)}</span>
              {sub.billingPeriod && (
                <span className="ml-2 text-ink-3">
                  ({sub.billingPeriod === "MONTHLY" ? "monthly" : "annual"})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        {isPremiumActive ? (
          <Button variant="secondary" onClick={() => navigate("/pricing")}>
            View plans
          </Button>
        ) : (
          <Button onClick={() => navigate("/pricing")}>
            {isExpiredOrCancelled ? "Renew Premium" : "Upgrade to Premium"}
          </Button>
        )}
      </div>
    </section>
  );
}
