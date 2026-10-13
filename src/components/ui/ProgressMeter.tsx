import type { MeterTone } from "../../lib/pisoMood";
import { cn } from "./cn";

interface Props {
  /** The server's percentage. May exceed 100; the bar clamps, the reported value does not. */
  percent: number;
  /** From `budgetTone` or `goalTone` — never chosen from the number itself. */
  tone: MeterTone;
  /** Accessible name, e.g. the category or goal name. */
  label: string;
  height?: number;
  className?: string;
}

const FILL: Record<MeterTone, string> = {
  onTrack: "bg-brand",
  goal: "bg-brand",
  warning: "bg-warn-ink",
  over: "bg-warn-ink",
  paused: "bg-ink-3",
};

export default function ProgressMeter({ percent, tone, label, height = 8, className }: Props) {
  const value = Number.isFinite(percent) ? percent : 0;
  const width = Math.max(0, Math.min(100, value));
  const shown = Math.round(value);
  const overflowShare = tone === "over" && value > 100 ? ((value - 100) / value) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(100, shown)}
      aria-valuenow={shown}
      aria-valuetext={`${shown}%`}
      className={cn("relative overflow-hidden rounded-full bg-track", className)}
      style={{ height }}
    >
      <div
        data-testid="meter-fill"
        className={cn("animate-meter h-full rounded-full", FILL[tone])}
        style={{ width: `${width}%` }}
      />
      {overflowShare > 0 && (
        <div
          data-testid="meter-overflow"
          className="ga-hatch absolute inset-y-0 right-0"
          style={{ width: `${overflowShare}%` }}
        />
      )}
    </div>
  );
}
