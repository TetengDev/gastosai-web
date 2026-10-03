import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Piso from "./Piso";
import { PISO_MARK_THRESHOLD, PISO_ROLES, PISO_STATES } from "./pisoTokens";

/**
 * Piso is the only illustration in the product, so the things that can silently go wrong with it
 * are not visual: an announced state losing its label, a decorative one starting to announce
 * itself, a 16px avatar rendering a face as four grey pixels, or a hex literal creeping back in
 * and taking dark mode with it. Those four are what this file holds down.
 */

const svgOf = (el: HTMLElement) => el.querySelector("svg")!;

/** The eyes are the one element only the full face has — the mark carries no circles at all. */
const eyeCount = (svg: SVGElement) => svg.querySelectorAll('circle[r="4.2"]').length;

describe("Piso", () => {
  it("exports exactly the five documented states", () => {
    expect([...PISO_STATES]).toEqual([
      "resting",
      "saved",
      "empty",
      "overBudget",
      "thinking",
    ]);
  });

  it.each(PISO_STATES)("renders an svg for the %s state", (state) => {
    const { container } = render(<Piso state={state} />);
    expect(svgOf(container as HTMLElement)).toBeTruthy();
  });

  // --- Accessibility -------------------------------------------------------

  it.each([
    ["saved", "Expense saved"],
    ["overBudget", "Over budget"],
    ["thinking", "Thinking"],
  ] as const)("announces the %s state as %s", (state, label) => {
    const { container } = render(<Piso state={state} />);
    const svg = svgOf(container as HTMLElement);

    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe(label);
    expect(svg.getAttribute("aria-hidden")).toBeNull();
  });

  it.each(["resting", "empty"] as const)(
    "hides the decorative %s state from assistive technology",
    (state) => {
      const { container } = render(<Piso state={state} />);
      const svg = svgOf(container as HTMLElement);

      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.getAttribute("role")).toBeNull();
      expect(svg.getAttribute("aria-label")).toBeNull();
    }
  );

  // --- The size threshold --------------------------------------------------

  it("renders the full face at the default size", () => {
    const { container } = render(<Piso state="resting" />);
    const svg = svgOf(container as HTMLElement);

    expect(svg.getAttribute("viewBox")).toBe("0 0 128 128");
    expect(eyeCount(svg)).toBe(2);
    expect(svg.getAttribute("width")).toBe("96");
  });

  it("renders the faceless mark below the threshold, not a shrunken face", () => {
    const { container } = render(<Piso state="resting" size={24} />);
    const svg = svgOf(container as HTMLElement);

    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(eyeCount(svg)).toBe(0);
    expect(svg.getAttribute("width")).toBe("24");
  });

  it("switches at the threshold itself: below is the mark, at it is the face", () => {
    const below = render(<Piso state="resting" size={PISO_MARK_THRESHOLD - 1} />);
    const at = render(<Piso state="resting" size={PISO_MARK_THRESHOLD} />);

    expect(eyeCount(svgOf(below.container as HTMLElement))).toBe(0);
    expect(eyeCount(svgOf(at.container as HTMLElement))).toBe(2);
  });

  it.each(PISO_STATES)("falls back to the mark for %s when rendered small", (state) => {
    const { container } = render(<Piso state={state} size={16} />);
    const svg = svgOf(container as HTMLElement);

    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(eyeCount(svg)).toBe(0);
  });

  // --- Colour -------------------------------------------------------------

  it("exposes five colour roles and nothing else", () => {
    expect(Object.keys(PISO_ROLES).sort()).toEqual([
      "amberBg",
      "amberFg",
      "bodyMint",
      "line",
      "warmPanel",
    ]);
  });

  it("builds every role out of an index.css token rather than a literal", () => {
    for (const value of Object.values(PISO_ROLES)) {
      expect(value).toMatch(/var\(--ga-/);
      expect(value).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });

  it.each(PISO_STATES)("paints the %s state only from the five roles", (state) => {
    const { container } = render(<Piso state={state} size={96} />);
    const svg = svgOf(container as HTMLElement);
    const allowed = new Set<string>([...Object.values(PISO_ROLES), "none", "currentColor"]);

    for (const node of svg.querySelectorAll("*")) {
      for (const attr of ["fill", "stroke"] as const) {
        const value = node.getAttribute(attr);
        if (value === null) continue;
        expect(allowed, `${node.nodeName}[${attr}]="${value}"`).toContain(value);
      }
    }
  });

  it("emits no colour literal anywhere, at either size, in any state", () => {
    for (const state of PISO_STATES) {
      for (const size of [16, 24, 31, 32, 96, 128] as const) {
        const { container } = render(<Piso state={state} size={size} />);
        expect(svgOf(container as HTMLElement).outerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      }
    }
  });

  // --- What distinguishes the states --------------------------------------

  it("gives saved a coin above the slot and crescent eyes", () => {
    const { container } = render(<Piso state="saved" />);
    const svg = svgOf(container as HTMLElement);

    expect(svg.querySelector('circle[r="9"]')).toBeTruthy();
    expect(svg.innerHTML).toContain("M47 69q5-6 10 0M71 69q5-6 10 0");
  });

  it("gives empty a level mouth and the warm panel body, not the mint one", () => {
    const { container } = render(<Piso state="empty" />);
    const svg = svgOf(container as HTMLElement);
    const body = svg.querySelector('rect[rx="18"]')!;

    expect(body.getAttribute("fill")).toBe(PISO_ROLES.warmPanel);
    expect(svg.innerHTML).toContain("M57 78h14");
  });

  it("gives resting the mint body and a closed smile", () => {
    const { container } = render(<Piso state="resting" />);
    const svg = svgOf(container as HTMLElement);

    expect(svg.querySelector('rect[rx="18"]')!.getAttribute("fill")).toBe(PISO_ROLES.bodyMint);
    expect(svg.innerHTML).toContain("M57 77q7 5 14 0");
  });

  it("draws overBudget in the amber pair with a crack, never in a danger red", () => {
    const { container } = render(<Piso state="overBudget" />);
    const svg = svgOf(container as HTMLElement);
    const body = svg.querySelector('rect[rx="18"]')!;

    expect(body.getAttribute("fill")).toBe(PISO_ROLES.amberBg);
    expect(body.getAttribute("stroke")).toBe(PISO_ROLES.amberFg);
    expect(svg.innerHTML).toContain("M90 88l-8 10 7 3-6 9");
    expect(svg.innerHTML).toContain("M57 80q7-5 14 0");
  });

  it("gives thinking three dots at three opacities", () => {
    const { container } = render(<Piso state="thinking" />);
    const dots = [...svgOf(container as HTMLElement).querySelectorAll('circle[r="5"]')];

    expect(dots.map((d) => d.getAttribute("cx"))).toEqual(["46", "64", "82"]);
    expect(dots.map((d) => d.getAttribute("opacity"))).toEqual([".35", ".6", "1"]);
  });

  it("animates nothing, in any state", () => {
    for (const state of PISO_STATES) {
      const { container } = render(<Piso state={state} />);
      const svg = svgOf(container as HTMLElement);

      expect(svg.querySelector("animate, animateTransform, animateMotion")).toBeNull();
      expect(svg.outerHTML).not.toMatch(/animate-|transition/);
    }
  });
});
