/// <reference types="node" />
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Reads the real stylesheet so the test fails the moment the file and the
// assertions disagree, rather than restating hex values that prove nothing.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../index.css"), "utf-8");

// --- WCAG contrast helpers -------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Stylesheet parsing ------------------------------------------------

function extractBlock(source: string, selector: string): string {
  const selectorIndex = source.indexOf(`${selector} {`);
  if (selectorIndex === -1) {
    throw new Error(`Could not find "${selector} {" block in index.css`);
  }
  const braceStart = source.indexOf("{", selectorIndex);
  const braceEnd = source.indexOf("}", braceStart);
  return source.slice(braceStart, braceEnd);
}

function extractToken(block: string, name: string): string {
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) {
    throw new Error(`Could not find token "${name}" in block`);
  }
  return match[1];
}

const rootBlock = extractBlock(css, ":root");
const darkBlock = extractBlock(css, ".dark");

const rootTokens = {
  page: extractToken(rootBlock, "--ga-page"),
  text: extractToken(rootBlock, "--ga-text"),
  text2: extractToken(rootBlock, "--ga-text2"),
  text3: extractToken(rootBlock, "--ga-text3"),
  danger: extractToken(rootBlock, "--ga-danger"),
  greenHi: extractToken(rootBlock, "--ga-green-hi"),
  greenSoft: extractToken(rootBlock, "--ga-green-soft"),
};

const darkTokens = {
  page: extractToken(darkBlock, "--ga-page"),
  text: extractToken(darkBlock, "--ga-text"),
  text2: extractToken(darkBlock, "--ga-text2"),
  text3: extractToken(darkBlock, "--ga-text3"),
  danger: extractToken(darkBlock, "--ga-danger"),
  greenHi: extractToken(darkBlock, "--ga-green-hi"),
  greenSoft: extractToken(darkBlock, "--ga-green-soft"),
};

describe("design token contrast (WCAG AA)", () => {
  it("light theme: ga-text2 against ga-page is at least 4.5:1", () => {
    expect(contrastRatio(rootTokens.text2, rootTokens.page)).toBeGreaterThanOrEqual(4.5);
  });

  it("light theme: ga-text3 against ga-page is at least 4.5:1", () => {
    expect(contrastRatio(rootTokens.text3, rootTokens.page)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark theme: ga-text2 against ga-page is at least 4.5:1", () => {
    expect(contrastRatio(darkTokens.text2, darkTokens.page)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark theme: ga-text3 against ga-page is at least 4.5:1", () => {
    expect(contrastRatio(darkTokens.text3, darkTokens.page)).toBeGreaterThanOrEqual(4.5);
  });

  it("light theme: prominence decreases text > text2 > text3", () => {
    const text = contrastRatio(rootTokens.text, rootTokens.page);
    const text2 = contrastRatio(rootTokens.text2, rootTokens.page);
    const text3 = contrastRatio(rootTokens.text3, rootTokens.page);
    expect(text).toBeGreaterThan(text2);
    expect(text2).toBeGreaterThan(text3);
  });

  it("dark theme: prominence decreases text > text2 > text3", () => {
    const text = contrastRatio(darkTokens.text, darkTokens.page);
    const text2 = contrastRatio(darkTokens.text2, darkTokens.page);
    const text3 = contrastRatio(darkTokens.text3, darkTokens.page);
    expect(text).toBeGreaterThan(text2);
    expect(text2).toBeGreaterThan(text3);
  });
});

/**
 * The tokens added for TEN-433. Both earn an assertion for the same reason: their values were
 * chosen *because* of a contrast measurement, so the measurement is the thing worth pinning.
 */
describe("ga-danger is readable error text in both themes", () => {
  it("light theme: at least 4.5:1 against ga-page", () => {
    expect(contrastRatio(rootTokens.danger, rootTokens.page)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark theme: at least 4.5:1 against ga-page", () => {
    expect(contrastRatio(darkTokens.danger, darkTokens.page)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the green-soft / green-hi pair keeps Piso's outline readable", () => {
  // Piso paints its body from ga-green-soft and its line from ga-green-hi. The two swap between
  // themes, which is what makes the character invert from one stylesheet — but only if the pair
  // is a real contrast pair at both ends. #1f8a5b as the body measured 2.86:1 and was rejected
  // for exactly this reason, so the floor is asserted rather than trusted.
  it("light theme: the line reads against the body at AA for text", () => {
    expect(contrastRatio(rootTokens.greenHi, rootTokens.greenSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark theme: the line reads against the body at AA for text", () => {
    expect(contrastRatio(darkTokens.greenHi, darkTokens.greenSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it("the pair is the same two colours in both themes, just swapped", () => {
    expect(rootTokens.greenSoft).not.toBe(darkTokens.greenSoft);
    expect(darkTokens.greenSoft).toBe(rootTokens.greenHi);
  });
});

describe("focus ring uses a token, not a hardcoded colour", () => {
  function extractFocusRule(source: string): string {
    const selectorIndex = source.indexOf("input:focus");
    if (selectorIndex === -1) {
      throw new Error("Could not find the input:focus rule in index.css");
    }
    const braceStart = source.indexOf("{", selectorIndex);
    const braceEnd = source.indexOf("}", braceStart);
    return source.slice(selectorIndex, braceEnd + 1);
  }

  const focusRule = extractFocusRule(css);

  it("contains no hex literal", () => {
    expect(focusRule).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("contains no rgba( literal", () => {
    expect(focusRule).not.toMatch(/rgba\(/);
  });

  it("references the ga-green-hi token", () => {
    expect(focusRule).toMatch(/var\(--ga-green-hi\)/);
  });

  it("still provides a visible focus affordance (border and ring both present)", () => {
    expect(focusRule).toMatch(/border-color:/);
    expect(focusRule).toMatch(/box-shadow:/);
  });
});

describe("gaPop respects prefers-reduced-motion", () => {
  // Find the brace range of every at-rule block so a rule's position can be
  // tested for containment. A stylesheet-wide substring search is not enough:
  // the first version of this test passed when `.animate-pop` was moved into a
  // `reduce` query instead of `no-preference`, which runs the animation only
  // for readers who asked for less of it. Proven by mutating the stylesheet.
  function enclosingAtRules(source: string, position: number): string[] {
    const conditions: string[] = [];
    for (const match of source.matchAll(/@media([^{]*)\{/g)) {
      const openBrace = match.index! + match[0].length - 1;
      let depth = 1;
      let i = openBrace + 1;
      while (i < source.length && depth > 0) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        i++;
      }
      if (position > openBrace && position < i) {
        conditions.push(match[1].trim());
      }
    }
    return conditions;
  }

  const popRuleIndex = css.indexOf(".animate-pop {");

  it("declares the animate-pop rule", () => {
    expect(popRuleIndex).toBeGreaterThan(-1);
  });

  it("applies gaPop only when the reader has not asked for less motion", () => {
    const enclosing = enclosingAtRules(css, popRuleIndex);
    const gates = enclosing.filter((c) => c.includes("prefers-reduced-motion"));

    // The rule must be inside a reduced-motion query at all...
    expect(gates.length).toBeGreaterThan(0);
    // ...and that query must be the permissive direction. `reduce` here would
    // invert the meaning while still looking gated.
    expect(gates.some((c) => /prefers-reduced-motion:\s*no-preference/.test(c))).toBe(true);
    expect(gates.some((c) => /prefers-reduced-motion:\s*reduce/.test(c))).toBe(false);
  });

  it("keeps the animation itself attached to that rule", () => {
    const braceStart = css.indexOf("{", popRuleIndex);
    const braceEnd = css.indexOf("}", braceStart);
    expect(css.slice(braceStart, braceEnd)).toMatch(/animation:\s*gaPop/);
  });
});
