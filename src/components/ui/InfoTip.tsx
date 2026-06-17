import { HelpCircle } from "lucide-react";

interface Props {
  /** Explanation shown on hover/focus. */
  text: string;
  /** Use light icon colors for placement on a dark/colored surface (e.g. the hero). */
  onDark?: boolean;
}

/** Small "?" icon with a hover/focus tooltip — used to explain dashboard metrics. */
export default function InfoTip({ text, onDark = false }: Props) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className={`flex transition-colors ${onDark ? "text-white/60 hover:text-white" : "text-ink-3 hover:text-ink-hi"}`}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded-lg border border-edge bg-surface px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
