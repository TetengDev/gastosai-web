import { formatCurrencyAmount } from "../../lib/formatters";
import { cn } from "./cn";

type Size = "hero" | "row" | "inline";
type Tone = "neutral" | "positive" | "danger";

interface Props {
  centavos: number;
  currency?: string;
  size?: Size;
  tone?: Tone;
  className?: string;
}

const SIZE: Record<Size, string> = {
  hero: "font-display text-4xl font-medium",
  row: "font-mono text-sm",
  inline: "font-mono",
};

// `positive` is the deep green, not the brand green: brand on white is below AA for body text.
const TONE: Record<Tone, string> = {
  neutral: "text-ink-hi",
  positive: "text-deep",
  danger: "text-danger",
};

export default function Amount({
  centavos,
  currency = "PHP",
  size = "row",
  tone = "neutral",
  className,
}: Props) {
  return (
    <span className={cn("tabular-nums", SIZE[size], TONE[tone], className)}>
      {formatCurrencyAmount(centavos, currency)}
    </span>
  );
}
