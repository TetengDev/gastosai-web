import { HelpCircle } from "lucide-react";

interface Props {
  /** Explanation shown on hover/focus. */
  text: string;
}

/** Small "?" icon with a hover/focus tooltip — used to explain dashboard metrics. */
export default function InfoTip({ text }: Props) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="flex text-ink-3 transition-colors hover:text-ink-hi"
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
