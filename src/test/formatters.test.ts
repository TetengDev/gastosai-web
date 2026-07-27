import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateOnly,
  formatDayMonth,
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


describe("timezone pinning", () => {
  // These run with the process timezone forced away from Manila. Without an explicit
  // `timeZone: "Asia/Manila"` the formatters resolve the API's +08:00 timestamps in the
  // device's zone, which silently shifts an expense into the wrong day — and therefore the
  // wrong monthly total, since the backend rolls months up in Asia/Manila.
  //
  // 01:00 Manila is the previous calendar day in both New York and UTC, so an unpinned
  // formatter fails these regardless of which machine runs them.
  const EARLY_MORNING_MANILA = "2026-06-26T01:00:00+08:00";
  // vi.stubEnv rather than touching process.env directly: it is typed by vitest, so this
  // needs no node types in the app tsconfig, and it restores cleanly.
  beforeEach(() => {
    vi.stubEnv("TZ", "America/New_York");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("formatDate keeps the Manila calendar day on a non-Manila device", () => {
    expect(formatDate(EARLY_MORNING_MANILA)).toContain("Jun 26");
  });

  it("formatDate keeps the Manila wall-clock hour", () => {
    // 01:00 in Manila, not 13:00 the previous day in New York.
    expect(formatDate(EARLY_MORNING_MANILA)).toMatch(/01:00\s*AM/i);
  });

  it("formatDayMonth keeps the Manila calendar day", () => {
    expect(formatDayMonth(EARLY_MORNING_MANILA)).toBe("Jun 26");
  });

  it("formatDateOnly keeps the Manila calendar day", () => {
    expect(formatDateOnly(EARLY_MORNING_MANILA)).toContain("Jun 26");
  });

  it("toDateTimeLocal returns the wall-clock reading unchanged", () => {
    // Slices the string rather than parsing it, so the form input is never re-zoned.
    expect(toDateTimeLocal(EARLY_MORNING_MANILA)).toBe("2026-06-26T01:00");
  });
});
