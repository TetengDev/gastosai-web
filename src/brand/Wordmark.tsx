import type { CSSProperties } from "react";

const LETTERS = [..."GastosAI"];

/**
 * "GastosAI" with "AI" in brand green. Inside a link, hovering or focusing it rolls each letter
 * up and back (`.ga-roll` in index.css). The name is read once from the sr-only copy; the doubled
 * letters are hidden, so a screen reader never spells the word out twice.
 */
export default function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">GastosAI</span>
      <span aria-hidden="true" className="ga-roll">
        {LETTERS.map((ch, i) => (
          <span key={i} className={`ga-roll-letter${i >= 6 ? " text-brand" : ""}`} style={{ "--i": i } as CSSProperties}>
            <span>{ch}</span>
            <span>{ch}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
