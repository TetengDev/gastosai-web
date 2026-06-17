import { cn } from "./cn";

interface Props {
  /** 0–100. */
  percent: number;
  /** Fill color (CSS color). Defaults to the brand green. */
  color?: string;
  /** Track height in px. */
  height?: number;
  className?: string;
}

export default function ProgressBar({
  percent,
  color = "#1f8a5b",
  height = 8,
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn("overflow-hidden rounded-full bg-track", className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}
