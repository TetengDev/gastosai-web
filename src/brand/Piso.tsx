/**
 * Piso — a bamboo alkansya, and the product's only illustration.
 *
 * A vertical bamboo tube with a coin slot. The artwork is settled: it is not a pig, it has no
 * ears, no snout and no peso glyph. The geometry below is the handoff verbatim, inlined as JSX
 * rather than imported as an asset so it needs no SVG loader and so its five colour roles can be
 * driven from the tokens in `src/index.css`.
 *
 * Two rules live inside the component on purpose:
 *
 *  - **The size threshold.** Below 32px the face is four grey pixels, so below 32px it renders
 *    the faceless mark instead. A caller asking for a 16px avatar cannot get a broken face.
 *  - **Who announces.** `saved`, `overBudget` and `thinking` are states a screen reader needs;
 *    `resting` and `empty` sit beside text that already carries the meaning, so announcing them
 *    is noise. Callers do not get to choose, because the choice is a property of the state.
 *
 * Piso is never the only signal for a state — the text always stays.
 */

import {
  PISO_LABELS,
  PISO_MARK_THRESHOLD,
  PISO_MOUTHS,
  PISO_ROLES,
  pisoBody,
  pisoLine,
  type PisoState,
} from "./pisoTokens";

interface Props {
  state: PisoState;
  /** Rendered width and height in pixels. Below `PISO_MARK_THRESHOLD` this becomes the mark. */
  size?: number;
  className?: string;
}

export default function Piso({ state, size = 96, className }: Props) {
  const label = PISO_LABELS[state];

  // An announced state is an image with a name; a decorative one is hidden outright. Spreading a
  // single object keeps the two from ever being set at the same time.
  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": "true" } as const);

  const shared = {
    width: size,
    height: size,
    className,
    focusable: "false" as const,
    "data-piso-state": state,
    ...a11y,
  };

  if (size < PISO_MARK_THRESHOLD) {
    return (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...shared}>
        <rect
          x="5"
          y="3"
          width="14"
          height="18"
          rx="4"
          fill={pisoBody(state)}
          stroke={pisoLine(state)}
          strokeWidth="2"
        />
        <path d="M5 10h14" stroke={pisoLine(state)} strokeWidth="2" strokeLinecap="round" fill="none" />
        <rect x="9" y="5.6" width="6" height="2" rx="1" fill={pisoLine(state)} />
      </svg>
    );
  }

  const body = pisoBody(state);
  const line = pisoLine(state);

  return (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" {...shared}>
      {/* Ground shadow — the figure's own line colour, dropped to a hairline opacity. */}
      <ellipse cx="64" cy="117" rx="30" ry="4" fill={line} opacity=".12" />

      {/* The tube, its two bamboo nodes, and the coin slot. */}
      <rect x="28" y="20" width="72" height="94" rx="18" fill={body} stroke={line} strokeWidth="4.5" />
      <path d="M28 54h72M28 84h72" stroke={line} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <rect x="50" y="31" width="28" height="7" rx="3.5" fill={line} />

      {state === "saved" ? (
        /* Crescent eyes — the only state that closes them. */
        <path
          d="M47 69q5-6 10 0M71 69q5-6 10 0"
          stroke={line}
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <>
          <circle cx="52" cy="68" r="4.2" fill={line} />
          <circle cx="76" cy="68" r="4.2" fill={line} />
        </>
      )}

      <path
        d={PISO_MOUTHS[state]}
        stroke={line}
        strokeWidth="3.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* A coin on its way into the slot. */}
      {state === "saved" && (
        <circle cx="64" cy="12" r="9" fill={PISO_ROLES.amberBg} stroke={PISO_ROLES.amberFg} strokeWidth="3" />
      )}

      {/* A hairline crack, not a break: over budget is a warning, not a failure. */}
      {state === "overBudget" && (
        <path
          d="M90 88l-8 10 7 3-6 9"
          stroke={line}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Three static dots. Nothing in Piso animates. */}
      {state === "thinking" && (
        <>
          <circle cx="46" cy="11" r="5" fill={line} opacity=".35" />
          <circle cx="64" cy="11" r="5" fill={line} opacity=".6" />
          <circle cx="82" cy="11" r="5" fill={line} opacity="1" />
        </>
      )}
    </svg>
  );
}
