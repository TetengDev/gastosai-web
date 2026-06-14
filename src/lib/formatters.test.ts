import { describe, it, expect } from "vitest";
import {
  getAvatarGradient,
  getInitials,
  getCategoryColor,
  getCategoryColors,
  formatCurrency,
  formatDate,
  toDateTimeLocal,
  formatMonth,
} from "./formatters";

describe("getAvatarGradient", () => {
  it("returns gradient for known key", () => {
    expect(getAvatarGradient("violet-indigo")).toBe("from-violet-500 to-indigo-600");
    expect(getAvatarGradient("rose-pink")).toBe("from-rose-500 to-pink-600");
  });

  it("falls back to violet-indigo for unknown key", () => {
    expect(getAvatarGradient("unknown")).toBe("from-violet-500 to-indigo-600");
  });

  it("falls back for null or undefined", () => {
    expect(getAvatarGradient(null)).toBe("from-violet-500 to-indigo-600");
    expect(getAvatarGradient(undefined)).toBe("from-violet-500 to-indigo-600");
  });
});

describe("getInitials", () => {
  it("returns single initial for one-word name", () => {
    expect(getInitials("Lester")).toBe("L");
  });

  it("returns first + last initial for multi-word name", () => {
    expect(getInitials("Lester Bryan Ilao")).toBe("LI");
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns ? for empty string", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
  });

  it("uppercases initials", () => {
    expect(getInitials("alice bob")).toBe("AB");
  });
});

describe("getCategoryColor", () => {
  it("returns consistent color for same category name", () => {
    const c1 = getCategoryColor("Food");
    const c2 = getCategoryColor("Food");
    expect(c1.chart).toBe(c2.chart);
  });

  it("returns different colors for different names (probabilistic)", () => {
    const food = getCategoryColor("Food");
    const transport = getCategoryColor("Transport");
    // Different hash values — may differ; just assert structure is correct
    expect(food).toHaveProperty("chart");
    expect(transport).toHaveProperty("chart");
    expect(food.bg).toMatch(/^bg-/);
    expect(food.text).toMatch(/^text-/);
  });
});

describe("getCategoryColors", () => {
  it("returns array of hex color strings", () => {
    const colors = getCategoryColors();
    expect(colors.length).toBeGreaterThan(0);
    colors.forEach((c) => expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });
});

describe("formatCurrency", () => {
  it("formats number with peso sign and 2 decimal places", () => {
    expect(formatCurrency(1000)).toContain("₱");
    expect(formatCurrency(1000)).toContain("1,000.00");
  });

  it("parses string input", () => {
    expect(formatCurrency("500.5")).toContain("500.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0.00");
  });
});

describe("formatDate", () => {
  it("returns dash for null or undefined", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined)).toBe("-");
  });

  it("returns formatted date string for valid ISO date", () => {
    const result = formatDate("2026-06-14T10:00:00");
    expect(result).toContain("2026");
    expect(result).toContain("Jun");
    expect(result).toContain("14");
  });
});

describe("toDateTimeLocal", () => {
  it("returns empty string for null or undefined", () => {
    expect(toDateTimeLocal(null)).toBe("");
    expect(toDateTimeLocal(undefined)).toBe("");
  });

  it("slices to 16 chars for datetime-local input format", () => {
    expect(toDateTimeLocal("2026-06-14T10:30:00")).toBe("2026-06-14T10:30");
  });
});

describe("formatMonth", () => {
  it("formats YYYY-MM string to long month + year", () => {
    const result = formatMonth("2026-06");
    expect(result).toContain("2026");
    expect(result).toMatch(/June|Jun/);
  });
});
