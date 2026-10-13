import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useEntitlements } from "../hooks/useEntitlements";
import { getPricing, startCheckout } from "../api/subscription";
import type { BillingPeriod, PricingItem } from "../api/subscription";
import { Button } from "../components/ui";
// Plan prices have always been integer centavos. They now render through the same formatter as
// every other amount, which drops the `/ 100` float that stood between the price and the screen.
import { formatCentavos } from "../lib/formatters";

/**
 * The nine premium features, in three named clusters.
 *
 * Nine flat strings in one list is nine things to read and no shape to read them in. The clusters
 * are a grouping only — every string is the one it always was, because the feature list is copy
 * the product owns and this file is not allowed to reword it.
 *
 * Exported for its own test, which asserts all nine survive the regrouping. It is page copy with
 * exactly one consumer, so it stays beside the page rather than moving to a shared module — the
 * same trade `Dashboard.tsx` makes for its two exported centavo helpers.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const PREMIUM_FEATURE_GROUPS = [
  {
    title: "Track without limits",
    features: ["Unlimited transactions", "Custom categories", "CSV & PDF export"],
  },
  {
    title: "Understand your spending",
    features: [
      "AI-powered analytics & insights",
      "Multi-month trend analysis",
      "Spending anomaly detection",
    ],
  },
  {
    title: "Ask and plan ahead",
    features: [
      "Natural-language assistant",
      "Budget forecasting",
      "Professional & Gen Z chat tones",
    ],
  },
] as const;

export default function Pricing() {
  const { entitlements, loading: entLoading } = useEntitlements();
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    getPricing()
      .then(setPricing)
      .catch(() => setPricingError("Failed to load pricing. Please refresh."));
  }, []);

  const isPremium = entitlements?.plan === "PREMIUM" && entitlements?.status === "ACTIVE";

  const activePrice = pricing.find((p) => p.period === period);
  const monthlyPrice = pricing.find((p) => p.period === "MONTHLY");
  const annualPrice = pricing.find((p) => p.period === "ANNUAL");

  const annualSavings =
    monthlyPrice && annualPrice
      ? Math.round((1 - annualPrice.amountCentavos / (monthlyPrice.amountCentavos * 12)) * 100)
      : null;

  const handleUpgrade = async () => {
    setCheckoutError(null);
    setChecking(true);
    try {
      const res = await startCheckout(period);
      window.location.href = res.checkoutUrl;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.message ??
        (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.detail ??
        "Failed to start checkout. Please try again.";
      setCheckoutError(msg);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="m-0 font-display text-4xl font-medium tracking-tight text-ink-hi md:text-5xl">
        Pricing
      </h1>
      <p className="mt-2 text-base text-ink-2">Simple pricing. Cancel anytime.</p>

      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border border-edge bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setPeriod("MONTHLY")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              period === "MONTHLY" ? "bg-cta text-cta-fg" : "text-ink-2 hover:text-ink-hi"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod("ANNUAL")}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              period === "ANNUAL" ? "bg-cta text-cta-fg" : "text-ink-2 hover:text-ink-hi"
            }`}
          >
            Annual
            {annualSavings !== null && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${period === "ANNUAL" ? "bg-white/20 text-cta-fg" : "bg-brand/10 text-brand"}`}>
                ~{annualSavings}% off
              </span>
            )}
          </button>
        </div>
      </div>

      {pricingError && (
        <p className="mt-6 text-center text-sm font-medium text-danger">{pricingError}</p>
      )}

      {/* The paid plan is the recommendation, so it is wider, warmer and taller-typed than the
          free one. Two equal tiles asked the reader to choose between them unaided. */}
      <div className="mt-8 grid items-start gap-6 md:grid-cols-[1fr_1.3fr]">
        <div data-plan="free" className="rounded-xl border border-edge-2 bg-surface-2 p-6">
          <div className="text-sm font-medium text-ink-2">Free</div>
          <div className="mt-1 font-display text-3xl font-medium tracking-tight text-ink-2">₱0</div>
          <div className="mt-0.5 text-sm text-ink-3">forever</div>

          <ul className="mt-5 space-y-2.5">
            {["Up to 50 transactions/month", "Basic expense tracking", "Category management", "Manual insights"].map(
              (f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                  {f}
                </li>
              )
            )}
          </ul>

          <div className="mt-7">
            {isPremium || entLoading ? null : (
              <Button variant="secondary" className="w-full" disabled>
                Current plan
              </Button>
            )}
            {!isPremium && !entLoading && (
              <div className="mt-2 text-center text-xs text-ink-3">Your current plan</div>
            )}
          </div>
        </div>

        <div
          data-plan="premium"
          className="relative rounded-2xl border-2 border-brand bg-surface p-8 shadow-lg shadow-brand/5"
        >
          <div className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            Recommended
          </div>
          <div className="font-mono text-xs uppercase tracking-[0.12em] text-brand">Premium</div>

          {activePrice ? (
            <>
              <div className="mt-2 font-display text-5xl font-medium tracking-tight text-ink-hi">
                {formatCentavos(activePrice.amountCentavos)}
              </div>
              {/* The annual saving is announced once, by the period toggle above, where it is
                  still a reason to switch. Repeating it here was the same fact twice. */}
              <div className="mt-1 text-sm text-ink-2">
                {period === "MONTHLY" ? "per month" : "per year"}
              </div>
            </>
          ) : (
            <div className="mt-2 h-12 w-32 animate-pulse rounded-lg bg-surface-2" />
          )}

          <div className="mt-7 space-y-5">
            {PREMIUM_FEATURE_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="m-0 font-mono text-xs uppercase tracking-[0.12em] text-ink-3">
                  {group.title}
                </h3>
                <ul className="mt-2.5 space-y-2.5">
                  {group.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8">
            {isPremium ? (
              <Button variant="secondary" className="w-full" disabled>
                Current plan
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleUpgrade}
                disabled={checking || !activePrice}
              >
                {checking ? "Redirecting…" : "Upgrade to Premium"}
              </Button>
            )}
            {checkoutError && (
              <p className="mt-2 text-sm font-medium text-danger">{checkoutError}</p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-3">
        Payments are processed securely by PayMongo. Cancel anytime from your billing settings.
      </p>
    </div>
  );
}
