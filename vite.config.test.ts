// The coverage gate is config, so config is what has to be asserted: a denominator that
// quietly re-acquires a whole-directory exclude, or a floor that quietly drops, is exactly the
// regression ../docs/coverage.md exists to prevent.
import { describe, expect, it } from "vitest";
import type { UserConfig } from "vite";
import config from "./vite.config";

const coverage = (config as UserConfig & { test: { coverage: Record<string, unknown> } })
  .test.coverage;
const exclude = coverage.exclude as string[];
const thresholds = coverage.thresholds as { lines: number };

describe("coverage configuration", () => {
  it("measures the whole of src", () => {
    expect(coverage.include).toEqual(["src/**/*.{ts,tsx}"]);
  });

  it("excludes no whole application directory", () => {
    // These five are what TEN-397 removed. Re-adding any of them puts most of the app back
    // outside the denominator and makes the reported number describe a corner of the code.
    for (const banned of [
      "src/api/**",
      "src/hooks/**",
      "src/context/**",
      "src/pages/**",
      "src/components/**",
    ]) {
      expect(exclude).not.toContain(banned);
    }
  });

  it("keeps the API, hook, context, page and component layers in the denominator", () => {
    const stillMeasured = [
      "src/api/client.ts",
      "src/api/expenses.ts",
      "src/context/AuthContext.tsx",
      "src/hooks/useExpenses.ts",
      "src/pages/Dashboard.tsx",
      "src/components/ExpenseModal.tsx",
    ];
    for (const file of stillMeasured) {
      expect(exclude).not.toContain(file);
    }
  });

  it("excludes generated output, entry points and type-only files", () => {
    expect(exclude).toEqual(
      expect.arrayContaining([
        "src/api/generated/**",
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/App.tsx",
      ])
    );
  });

  it("sets a line floor that vitest run --coverage can fail on", () => {
    expect(thresholds.lines).toBeGreaterThanOrEqual(36);
    expect(Number.isInteger(thresholds.lines)).toBe(true);
    // A floor above the measured value fails the next unrelated PR; 100 would mean the floor
    // was estimated rather than measured.
    expect(thresholds.lines).toBeLessThan(100);
  });
});
