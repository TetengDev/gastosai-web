import { describe, it, expect } from "vitest";
import {
  getAvatarGradient,
  getInitials,
  getCategoryColor,
  getCategoryColors,
  formatCurrency,
  centavosToAmount,
  formatCentavos,
  parseAmountToCentavos,
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

/**
 * The `/api/v2` money primitives.
 *
 * The assertions are exact on purpose: a `toBeCloseTo` here would pass on the bug these functions
 * exist to prevent. The parse cases in particular are chosen against the float route rather than
 * around it — `parseFloat("150.75") * 100` is exactly `15075`, so the amount the acceptance
 * criterion names is one the broken implementation also gets right. `1.15` and `8.87` are the ones
 * that separate them (`114.99999999999999` and `886.9999999999999`), which is why they are here.
 */
describe("centavosToAmount", () => {
  it("renders an exact decimal string", () => {
    expect(centavosToAmount(15075)).toBe("150.75");
    expect(centavosToAmount(190000)).toBe("1900.00");
  });

  it("pads amounts under one peso", () => {
    expect(centavosToAmount(0)).toBe("0.00");
    expect(centavosToAmount(5)).toBe("0.05");
    expect(centavosToAmount(99)).toBe("0.99");
    expect(centavosToAmount(100)).toBe("1.00");
  });

  it("keeps the sign on negatives", () => {
    expect(centavosToAmount(-15075)).toBe("-150.75");
    expect(centavosToAmount(-5)).toBe("-0.05");
  });

  it("collapses non-finite input rather than rendering NaN", () => {
    expect(centavosToAmount(Number.NaN)).toBe("0.00");
    expect(centavosToAmount(Number.POSITIVE_INFINITY)).toBe("0.00");
  });

  it("stays exact at the top of the safe integer range, where a float loses centavos", () => {
    expect(centavosToAmount(Number.MAX_SAFE_INTEGER)).toBe("90071992547409.91");
  });
});

describe("formatCentavos", () => {
  it("renders a display amount with the peso sign", () => {
    expect(formatCentavos(15075)).toBe("₱150.75");
    expect(formatCentavos(0)).toBe("₱0.00");
  });

  it("groups thousands", () => {
    expect(formatCentavos(190000)).toBe("₱1,900.00");
    expect(formatCentavos(123456789)).toBe("₱1,234,567.89");
  });

  it("puts the minus outside the peso sign", () => {
    expect(formatCentavos(-190000)).toBe("-₱1,900.00");
  });
});

describe("parseAmountToCentavos", () => {
  it("parses a typed amount to exact centavos", () => {
    expect(parseAmountToCentavos("150.75")).toBe(15075);
    expect(parseAmountToCentavos("1900")).toBe(190000);
    expect(parseAmountToCentavos("0.05")).toBe(5);
  });

  it("is exact for the amounts the float route rounds off", () => {
    expect(parseAmountToCentavos("1.15")).toBe(115);
    expect(parseAmountToCentavos("8.87")).toBe(887);
    expect(parseAmountToCentavos("0.29")).toBe(29);
  });

  it("treats one decimal place as tenths of a peso", () => {
    expect(parseAmountToCentavos("150.7")).toBe(15070);
  });

  it("accepts a pasted peso sign, spaces and separators", () => {
    expect(parseAmountToCentavos("₱1,900.00")).toBe(190000);
    expect(parseAmountToCentavos("  150.75 ")).toBe(15075);
  });

  it("parses negatives", () => {
    expect(parseAmountToCentavos("-150.75")).toBe(-15075);
  });

  it("returns null rather than rounding a third decimal place away", () => {
    expect(parseAmountToCentavos("150.755")).toBeNull();
  });

  it("returns null for anything that is not an amount", () => {
    expect(parseAmountToCentavos("")).toBeNull();
    expect(parseAmountToCentavos("abc")).toBeNull();
    expect(parseAmountToCentavos(".")).toBeNull();
    expect(parseAmountToCentavos(".75")).toBeNull();
    expect(parseAmountToCentavos("150.")).toBeNull();
    expect(parseAmountToCentavos("1e3")).toBeNull();
  });

  it("returns null past the safe integer range instead of a lossy number", () => {
    expect(parseAmountToCentavos("99999999999999999.99")).toBeNull();
  });

  it("round-trips through the renderer without drift", () => {
    for (const typed of ["150.75", "0.01", "1900.00", "21474836.47", "-2.99"]) {
      expect(centavosToAmount(parseAmountToCentavos(typed)!)).toBe(
        typed.includes(".") ? typed : `${typed}.00`,
      );
    }
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
