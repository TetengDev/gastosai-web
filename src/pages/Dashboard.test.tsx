import { describe, expect, it } from "vitest";
import { abbrevCentavos, dailyAverageCentavos } from "./Dashboard";
import { formatCentavos } from "../lib/formatters";

describe("abbrevCentavos", () => {
  it("renders full precision below the 100,000-centavo threshold", () => {
    expect(abbrevCentavos(99_999)).toBe("₱999.99");
    expect(abbrevCentavos(45_050)).toBe("₱450.5");
  });

  it("switches to thousands exactly at the threshold", () => {
    expect(abbrevCentavos(100_000)).toBe("₱1k");
  });

  it("drops a trailing zero in the thousands form", () => {
    expect(abbrevCentavos(1_250_000)).toBe("₱12.5k");
  });

  it("keeps both decimals when neither is a trailing zero", () => {
    expect(abbrevCentavos(1_234_500)).toBe("₱12.35k");
  });

  it("renders whole thousands without a decimal point", () => {
    expect(abbrevCentavos(10_000_000)).toBe("₱100k");
  });

  it("renders zero without a decimal point", () => {
    expect(abbrevCentavos(0)).toBe("₱0");
  });

  it("keeps the sign on a negative amount, in both branches", () => {
    expect(abbrevCentavos(-1_250_000)).toBe("-₱12.5k");
    expect(abbrevCentavos(-45_050)).toBe("-₱450.5");
  });

  it("never trims a zero that sits before the decimal point", () => {
    // ₱1,000.00 and ₱100.00 are the values a bare /\.?0+$/ would eat into.
    expect(abbrevCentavos(100_000_000)).toBe("₱1,000k");
    expect(abbrevCentavos(99_000)).toBe("₱990");
  });
});

describe("dailyAverageCentavos", () => {
  it("reaches formatCentavos as a whole centavo when the quotient is not integral", () => {
    // 100,000 centavos over 3 days is 33,333.33... — formatCentavos renders a non-integer as
    // "0.00", so an unrounded average would show a plausible zero rather than failing.
    const avg = dailyAverageCentavos(100_000, 3);

    expect(Number.isInteger(avg)).toBe(true);
    expect(avg).toBe(33_333);
    expect(formatCentavos(avg)).toBe("₱333.33");
  });

  it("rounds a half centavo up rather than truncating", () => {
    expect(dailyAverageCentavos(101, 2)).toBe(51);
  });

  it("divides evenly when the total divides evenly", () => {
    expect(dailyAverageCentavos(90_000, 9)).toBe(10_000);
  });

  it("is zero before any day has elapsed", () => {
    expect(dailyAverageCentavos(100_000, 0)).toBe(0);
  });
});
