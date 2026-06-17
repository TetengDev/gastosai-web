import { ArrowDown, ArrowUp } from "lucide-react";
import { formatCurrency } from "../lib/formatters";
import { InfoTip } from "./ui";

export interface HeroStat {
  label: string;
  value: string;
  sub: string;
}

interface Props {
  monthLabel: string;
  total: number;
  /** Month-over-month change %, or null when there is no prior data. */
  momPercent: number | null;
  prevMonthLabel: string | null;
  stats: HeroStat[];
}

export default function DashboardHero({
  monthLabel,
  total,
  momPercent,
  prevMonthLabel,
  stats,
}: Props) {
  const [intPart, decPart] = formatCurrency(total).split(".");
  const spendingLess = momPercent !== null && momPercent < 0;

  return (
    <div className="grid items-center gap-8 overflow-hidden rounded-[22px] bg-hero p-8 text-white md:grid-cols-[1fr_1.15fr] md:gap-12 md:p-11">
      <div>
        <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-[#7fd6b8]">
          Total spend · {monthLabel}
          <InfoTip onDark text="Your total spending for the current month, with how it compares to last month and key stats." />
        </div>
        <div className="mt-3.5 font-display text-6xl font-medium leading-none tracking-tight md:text-[84px]">
          {intPart}
          {decPart && (
            <span className="text-3xl text-[#9fe3c9] md:text-[46px]">.{decPart}</span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {momPercent !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(159,227,201,0.15)] px-3 py-1 text-[13px] font-medium text-[#9fe3c9]">
              {momPercent > 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {Math.abs(momPercent).toFixed(1)}% vs {prevMonthLabel}
            </span>
          )}
          <span className="text-sm text-white/55">
            {momPercent === null
              ? "No prior month to compare."
              : spendingLess
                ? "You're spending less this month."
                : momPercent === 0
                  ? "On par with last month."
                  : "You're spending more this month."}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/12">
        {stats.map((s) => (
          <div key={s.label} className="bg-hero p-5 md:p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7fd6b8]">
              {s.label}
            </div>
            <div className="mt-2 font-display text-2xl font-medium tracking-tight text-white">
              {s.value}
            </div>
            <div className="mt-1 text-[12.5px] text-white/50">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
