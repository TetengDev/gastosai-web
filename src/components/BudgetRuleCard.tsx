import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { assignBuckets, getBudgetRule, getBudgetRuleSummary, putBudgetRule, setBudgetRuleEnabled } from "../api/budgetRules";
import type { Bucket, BudgetRuleSummary, BudgetRuleType, Category } from "../api/types";
import { Button, InfoTip } from "./ui";
import { formatCurrency } from "../lib/formatters";

interface Props {
  month: string;
  categories: Category[];
  onCategoriesChanged: () => void;
}

const PRESETS: { value: BudgetRuleType; label: string; hint: string }[] = [
  { value: "FIFTY_THIRTY_TWENTY", label: "50 / 30 / 20", hint: "Needs / Wants / Savings" },
  { value: "SEVENTY_TWENTY_TEN", label: "70 / 20 / 10", hint: "Tighter savings" },
  { value: "CUSTOM", label: "Custom", hint: "Set your own split" },
];

const BUCKETS: Bucket[] = ["NEEDS", "WANTS", "SAVINGS"];
const BUCKET_LABEL: Record<Bucket, string> = { NEEDS: "Needs", WANTS: "Wants", SAVINGS: "Savings" };

function barColor(percentUsed: number): string {
  if (percentUsed >= 100) return "#e8590c";
  if (percentUsed >= 80) return "#d9a400";
  return "#1f8a5b";
}

export default function BudgetRuleCard({ month, categories, onCategoriesChanged }: Props) {
  const [ruleType, setRuleType] = useState<BudgetRuleType>("FIFTY_THIRTY_TWENTY");
  const [income, setIncome] = useState("0");
  const [needs, setNeeds] = useState(50);
  const [wants, setWants] = useState(30);
  const [savings, setSavings] = useState(20);
  const [summary, setSummary] = useState<BudgetRuleSummary | null>(null);
  const [enabled, setEnabledState] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [rule, sum] = await Promise.all([getBudgetRule(), getBudgetRuleSummary(month)]);
      setEnabledState(rule.enabled);
      setRuleType(rule.ruleType);
      setIncome(String(rule.monthlyIncome));
      setNeeds(rule.needsPct);
      setWants(rule.wantsPct);
      setSavings(rule.savingsPct);
      setSummary(sum);
    } catch {
      setError("Failed to load budgeting rule.");
    }
  }, [month]);

  const toggleFeature = async (value: boolean) => {
    await setBudgetRuleEnabled(value);
    setEnabledState(value);
    if (value) await load();
    window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await putBudgetRule({
        ruleType,
        monthlyIncome: parseFloat(income) || 0,
        ...(ruleType === "CUSTOM" ? { needsPct: needs, wantsPct: wants, savingsPct: savings } : {}),
      });
      setSummary(await getBudgetRuleSummary(month));
      window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail
          ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Failed to save. Custom percentages must sum to 100.",
      );
    } finally {
      setSaving(false);
    }
  };

  const setBucket = async (categoryId: number, bucket: Bucket | null) => {
    await assignBuckets([{ categoryId, bucket }]);
    onCategoriesChanged();
    setSummary(await getBudgetRuleSummary(month));
    window.dispatchEvent(new CustomEvent("gastosai:budget-changed"));
  };

  const customSum = needs + wants + savings;
  const inputClass = "rounded-xl border border-edge-input bg-input px-3 py-2 text-sm text-ink";

  // Opt-in: until the user turns the feature on, just invite them to try it.
  if (!enabled) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-edge bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-brand" />
          <div>
            <p className="font-display text-[17px] font-medium text-ink-hi">New — Budgeting Rules</p>
            <p className="mt-0.5 text-sm text-ink-2">
              Try a 50-30-20 plan: split your income across Needs, Wants & Savings and track each bucket. Optional — turn it off anytime.
            </p>
          </div>
        </div>
        <Button onClick={() => void toggleFeature(true)}>Try it</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-edge bg-surface p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-[19px] font-medium text-ink-hi">Budgeting Rule</h2>
          <InfoTip text="Split your monthly income across Needs / Wants / Savings and track spend per bucket." />
        </div>
        <button
          type="button"
          onClick={() => void toggleFeature(false)}
          className="text-xs font-medium text-ink-3 hover:text-ink-hi hover:underline"
        >
          Hide
        </button>
      </div>

      {/* Preset + income */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setRuleType(p.value);
                if (p.value === "FIFTY_THIRTY_TWENTY") { setNeeds(50); setWants(30); setSavings(20); }
                if (p.value === "SEVENTY_TWENTY_TEN") { setNeeds(70); setWants(20); setSavings(10); }
              }}
              title={p.hint}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                ruleType === p.value ? "bg-cta text-cta-fg" : "bg-surface-2 text-ink-2 hover:text-ink-hi"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-3">Monthly income (₱)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className={`${inputClass} w-40`}
          />
        </div>
        {ruleType === "CUSTOM" && (
          <div className="flex items-end gap-2">
            {([["Needs", needs, setNeeds], ["Wants", wants, setWants], ["Savings", savings, setSavings]] as const).map(
              ([label, val, setter]) => (
                <div key={label}>
                  <label className="mb-1 block text-xs font-medium text-ink-3">{label} %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={val}
                    onChange={(e) => setter(parseInt(e.target.value, 10) || 0)}
                    className={`${inputClass} w-20`}
                  />
                </div>
              ),
            )}
            <span className={`pb-2 text-xs font-medium ${customSum === 100 ? "text-ink-3" : "text-[#b30000]"}`}>
              = {customSum}%
            </span>
          </div>
        )}
        <Button onClick={() => void save()} disabled={saving || (ruleType === "CUSTOM" && customSum !== 100)}>
          {saving ? "Saving…" : "Save rule"}
        </Button>
      </div>

      {error && <p className="text-sm text-[#b30000]">{error}</p>}

      {/* Per-bucket target vs spent */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          {summary.buckets.map((b) => (
            <div key={b.bucket} className="rounded-xl border border-edge-2 bg-surface-2 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-ink-hi">{BUCKET_LABEL[b.bucket]}</span>
                <span className="font-mono text-[11px] text-ink-3">{b.percent}%</span>
              </div>
              <div className="mt-2 font-display text-[20px] font-medium text-ink-hi">
                {formatCurrency(b.spent)}
                <span className="ml-1 text-[13px] text-ink-3">/ {formatCurrency(b.target)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(b.percentUsed, 100)}%`, backgroundColor: barColor(b.percentUsed) }}
                />
              </div>
              <div className="mt-1.5 text-xs text-ink-3">
                {b.remaining >= 0 ? `${formatCurrency(b.remaining)} left` : `${formatCurrency(-b.remaining)} over`}
              </div>
            </div>
          ))}
        </div>
      )}
      {summary && summary.unassignedSpent > 0 && (
        <p className="text-xs text-ink-3">
          {formatCurrency(summary.unassignedSpent)} spent in categories not yet assigned to a bucket.
        </p>
      )}

      {/* Bucket assignment */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-2">Assign categories to buckets</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-edge-3 px-3 py-2">
              <span className="truncate text-sm text-ink">{c.name}</span>
              <select
                value={c.bucket ?? ""}
                onChange={(e) => void setBucket(c.id, (e.target.value || null) as Bucket | null)}
                className="rounded-lg border border-edge-input bg-surface px-2 py-1 text-xs text-ink"
              >
                <option value="">—</option>
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>{BUCKET_LABEL[b]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
