/**
 * Piso's contract: the states it can be in, the size at which it stops having a face, and the
 * five colour roles it is painted from.
 *
 * These live beside the component rather than inside it because they are not implementation
 * detail — the same five states and five roles are the API on both platforms, and keeping them
 * in a module of their own is also what lets `Piso.tsx` stay a file that only exports a
 * component (`react-refresh/only-export-components`).
 */

export const PISO_STATES = ["resting", "saved", "empty", "overBudget", "thinking"] as const;

export type PisoState = (typeof PISO_STATES)[number];

/** Below this width the face is four grey pixels, so below it Piso renders the faceless mark. */
export const PISO_MARK_THRESHOLD = 32;

/**
 * The five colour roles, each resolved from an existing token in `src/index.css`.
 *
 * Every one is a `var(--ga-*)` reference rather than a literal, which is what makes dark mode
 * work from one file: `.dark` redefines `--ga-green-hi`, `--ga-surface3` and the warn pair, and
 * the body/line swap falls out of that with no second code path in the component.
 *
 * `bodyMint` and `line` are deliberately the `--ga-green-soft` / `--ga-green-hi` pair, whose two
 * values swap between themes: `#003c33` on `#9fe3c9` at 8.44:1 in light, `#7fd6b8` on `#003c33`
 * at about 7.3:1 in dark. The character therefore inverts on its own and its outline keeps
 * reading at both ends. `--color-brand` (#1f8a5b) as the body would have measured 2.86:1 against
 * the line, which is why it is not used here. These names and values are shared with the mobile
 * twin and must not drift.
 */
export const PISO_ROLES = {
  bodyMint: "var(--ga-green-soft)",
  line: "var(--ga-green-hi)",
  warmPanel: "var(--ga-surface3)",
  amberBg: "var(--ga-warn-border)",
  amberFg: "var(--ga-warn-text)",
} as const;

/** Only these three are worth a screen reader's attention; the other two are decoration. */
export const PISO_LABELS: Partial<Record<PisoState, string>> = {
  saved: "Expense saved",
  overBudget: "Over budget",
  thinking: "Thinking",
};

export const PISO_MOUTHS: Record<PisoState, string> = {
  resting: "M57 77q7 5 14 0",
  // Wider than resting, which is the whole difference between pleased and content.
  saved: "M54 76q10 7 20 0",
  // Level, not downturned: waiting rather than sad.
  empty: "M57 78h14",
  overBudget: "M57 80q7-5 14 0",
  thinking: "M57 77q7 5 14 0",
};

/** `empty` waits on the warm panel; `overBudget` goes amber; everything else is mint. */
export function pisoBody(state: PisoState): string {
  if (state === "overBudget") return PISO_ROLES.amberBg;
  if (state === "empty") return PISO_ROLES.warmPanel;
  return PISO_ROLES.bodyMint;
}

/** Over budget takes the amber pair whole — amber, never the red danger token. */
export function pisoLine(state: PisoState): string {
  return state === "overBudget" ? PISO_ROLES.amberFg : PISO_ROLES.line;
}
