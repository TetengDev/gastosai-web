import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  getInitials,
  getCategoryColor,
  getAvatarGradient,
  toDateTimeLocal,
} from "../lib/formatters";

describe("formatCurrency", () => {
  it("formats a positive integer with peso sign and two decimal places", () => {
    const result = formatCurrency(100);
    expect(result).toBe("₱100.00");
  });

  it("formats zero as ₱0.00", () => {
    expect(formatCurrency(0)).toBe("₱0.00");
  });

  it("formats a large number with comma separators", () => {
    const result = formatCurrency(10000);
    expect(result).toMatch(/₱10,000\.00/);
  });

  it("formats a decimal number correctly", () => {
    expect(formatCurrency(1234.5)).toBe("₱1,234.50");
  });

  it("accepts a string input and parses it", () => {
    expect(formatCurrency("250.00")).toBe("₱250.00");
  });

  it("formats a fractional value with two decimal places", () => {
    expect(formatCurrency(9.99)).toBe("₱9.99");
  });
});

describe("formatDate", () => {
  it("returns '-' for null", () => {
    expect(formatDate(null)).toBe("-");
  });

  it("returns '-' for undefined", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  it("returns '-' for empty string", () => {
    expect(formatDate("")).toBe("-");
  });

  it("formats a valid ISO date string into a human-readable form", () => {
    const result = formatDate("2024-01-15T10:30:00");
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/15/);
  });

  it("includes hour and minute in the output", () => {
    const result = formatDate("2024-06-01T14:00:00");
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe("getInitials", () => {
  it("returns '?' for an empty string", () => {
    expect(getInitials("")).toBe("?");
  });

  it("returns '?' for a whitespace-only string", () => {
    expect(getInitials("   ")).toBe("?");
  });

  it("returns the first letter uppercased for a single word", () => {
    expect(getInitials("lester")).toBe("L");
  });

  it("returns first and last initials uppercased for a two-word name", () => {
    expect(getInitials("lester ilao")).toBe("LI");
  });

  it("returns first and last initials for a three-word name", () => {
    expect(getInitials("Juan dela Cruz")).toBe("JC");
  });

  it("handles extra whitespace between words", () => {
    expect(getInitials("  John   Doe  ")).toBe("JD");
  });
});

describe("getCategoryColor", () => {
  it("returns an object with bg, darkBg, text, darkText, dot, chart keys", () => {
    const color = getCategoryColor("Food");
    expect(color).toHaveProperty("bg");
    expect(color).toHaveProperty("darkBg");
    expect(color).toHaveProperty("text");
    expect(color).toHaveProperty("darkText");
    expect(color).toHaveProperty("dot");
    expect(color).toHaveProperty("chart");
  });

  it("returns consistent color for the same category name", () => {
    expect(getCategoryColor("Groceries")).toEqual(getCategoryColor("Groceries"));
  });

  it("returns different colors for different category names (most cases)", () => {
    const a = getCategoryColor("Transport");
    const b = getCategoryColor("Entertainment");
    expect(a).not.toEqual(b);
  });

  it("returns a valid hex chart color", () => {
    const color = getCategoryColor("Utilities");
    expect(color.chart).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns a color for an unknown category (does not throw)", () => {
    expect(() => getCategoryColor("SomeRandomUnknownCategory")).not.toThrow();
    const color = getCategoryColor("SomeRandomUnknownCategory");
    expect(color).toHaveProperty("chart");
  });

  it("returns a color for an empty string category", () => {
    expect(() => getCategoryColor("")).not.toThrow();
  });
});

describe("getAvatarGradient", () => {
  it("returns the correct gradient for a known key", () => {
    expect(getAvatarGradient("violet-indigo")).toBe("from-violet-500 to-indigo-600");
  });

  it("returns the correct gradient for rose-pink", () => {
    expect(getAvatarGradient("rose-pink")).toBe("from-rose-500 to-pink-600");
  });

  it("returns the default violet-indigo gradient for null", () => {
    expect(getAvatarGradient(null)).toBe("from-violet-500 to-indigo-600");
  });

  it("returns the default gradient for undefined", () => {
    expect(getAvatarGradient(undefined)).toBe("from-violet-500 to-indigo-600");
  });

  it("returns the default gradient for an unknown key", () => {
    expect(getAvatarGradient("nonexistent-color")).toBe("from-violet-500 to-indigo-600");
  });
});

describe("toDateTimeLocal", () => {
  it("returns empty string for null", () => {
    expect(toDateTimeLocal(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(toDateTimeLocal(undefined)).toBe("");
  });

  it("slices to 16 characters for a full ISO datetime string", () => {
    expect(toDateTimeLocal("2024-01-15T10:30:00")).toBe("2024-01-15T10:30");
  });

  it("returns the first 16 chars for a datetime with timezone offset", () => {
    expect(toDateTimeLocal("2024-06-01T08:00:00+08:00")).toBe("2024-06-01T08:00");
  });
});
