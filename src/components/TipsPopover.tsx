import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { TIPS, dismissTip, getDismissedTips, resetTips } from "../lib/tips";

export default function TipsPopover() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(() => getDismissedTips());
  const [idx, setIdx] = useState(0);

  const available = TIPS.filter((t) => !dismissed.includes(t.id));
  const current = available.length > 0 ? available[idx % available.length] : null;

  const next = () => setIdx((i) => i + 1);

  const gotIt = () => {
    if (!current) return;
    dismissTip(current.id);
    setDismissed(getDismissedTips());
    setIdx(0);
  };

  const reset = () => {
    resetTips();
    setDismissed([]);
    setIdx(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Tips"
        title="Tips"
        className="relative flex rounded-full p-2 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-hi"
      >
        <Lightbulb className="h-[18px] w-[18px]" />
        {available.length > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-nav" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-edge bg-surface p-4 shadow-2xl">
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <Lightbulb className="h-3.5 w-3.5 text-brand" />
              Tips
            </div>
            {current ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink">{current.text}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-ink-3">{available.length} left</span>
                  <div className="flex gap-2">
                    {available.length > 1 && (
                      <button onClick={next} className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-hi">
                        Next tip
                      </button>
                    )}
                    <button onClick={gotIt} className="rounded-lg bg-cta px-2.5 py-1 text-xs font-medium text-cta-fg transition-opacity hover:opacity-90">
                      Got it
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">You’re all caught up — no more tips for now.</p>
                <button onClick={reset} className="mt-3 text-xs font-medium text-link hover:underline">
                  Show tips again
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
