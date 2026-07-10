import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useEntitlements } from "../hooks/useEntitlements";
import { getPricing, startCheckout } from "../api/subscription";
import type { BillingPeriod, PricingItem } from "../api/types";
import { Button } from "../components/ui";

function centavosToDisplay(centavos: number): string {
  return "₱" + (centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PREMIUM_FEATURES = [
  "Unlimited transactions",
  "AI-powered analytics & insights",
  "Natural-language assistant",
  "CSV & PDF export",
  "Budget forecasting",
  "Multi-month trend analysis",
  "Custom categories",
  "Spending anomaly detection",
  "Professional & Gen Z chat tones",
];

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
      <h1 className="m-0 font-display text-4xl font-medium tracking-tight text-ink-hi md:text-[44px]">
        Pricing
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">Simple pricing. Cancel anytime.</p>

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
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${period === "ANNUAL" ? "bg-white/20 text-cta-fg" : "bg-brand/10 text-brand"}`}>
                ~{annualSavings}% off
              </span>
            )}
          </button>
        </div>
      </div>

      {pricingError && (
        <p className="mt-6 text-center text-sm font-medium text-[#b30000]">{pricingError}</p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-edge bg-surface p-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Free</div>
          <div className="mt-2 font-display text-4xl font-medium tracking-tight text-ink-hi">₱0</div>
          <div className="mt-0.5 text-sm text-ink-2">forever</div>

          <ul className="mt-6 space-y-3">
            {["Up to 50 transactions/month", "Basic expense tracking", "Category management", "Manual insights"].map(
              (f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                  {f}
                </li>
              )
            )}
          </ul>

          <div className="mt-8">
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

        <div className="rounded-2xl border-2 border-brand bg-surface p-8 relative">
          <div className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white">
            Premium
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand">Premium</div>

          {activePrice ? (
            <>
              <div className="mt-2 font-display text-4xl font-medium tracking-tight text-ink-hi">
                {centavosToDisplay(activePrice.amountCentavos)}
              </div>
              <div className="mt-0.5 text-sm text-ink-2">
                {period === "MONTHLY" ? "per month" : "per year"}
                {period === "ANNUAL" && annualSavings !== null && (
                  <span className="ml-2 text-brand">~{annualSavings}% off</span>
                )}
              </div>
            </>
          ) : (
            <div className="mt-2 h-10 w-28 animate-pulse rounded-lg bg-surface-2" />
          )}

          <ul className="mt-6 space-y-3">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {f}
              </li>
            ))}
          </ul>

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
              <p className="mt-2 text-sm font-medium text-[#b30000]">{checkoutError}</p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[13px] text-ink-3">
        Payments are processed securely by PayMongo. Cancel anytime from your billing settings.
      </p>
    </div>
  );
}
