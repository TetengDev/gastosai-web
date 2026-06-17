import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

interface Props {
  /** Explanation shown on hover/focus. */
  text: string;
  /** Use light icon colors for placement on a dark/colored surface (e.g. the hero). */
  onDark?: boolean;
}

/**
 * Small "?" icon with a hover/focus tooltip explaining a dashboard metric.
 * The tooltip is portaled to <body> with fixed positioning so it is never
 * clipped by an `overflow-hidden` ancestor card.
 */
export default function InfoTip({ text, onDark = false }: Props) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
  };
  const hide = () => setPos(null);

  return (
    <span className="inline-flex align-middle">
      <button
        ref={ref}
        type="button"
        aria-label={text}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`flex transition-colors ${onDark ? "text-white/60 hover:text-white" : "text-ink-3 hover:text-ink-hi"}`}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {pos &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
            className="pointer-events-none z-[100] w-52 rounded-lg border border-edge bg-surface px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
