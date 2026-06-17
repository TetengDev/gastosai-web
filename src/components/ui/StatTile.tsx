import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

/** Label/value/sub tile used in the dashboard hero stat grid. */
export default function StatTile({ label, value, sub }: Props) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-medium tracking-tight text-ink-hi">
        {value}
      </div>
      {sub && <div className="mt-1 text-[12.5px] text-ink-2">{sub}</div>}
    </div>
  );
}
