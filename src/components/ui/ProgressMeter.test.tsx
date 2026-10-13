import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProgressMeter from "./ProgressMeter";

describe("ProgressMeter", () => {
  it("is a named progressbar carrying the true figure", () => {
    render(<ProgressMeter percent={84.4} tone="warning" label="Food budget" />);
    const bar = screen.getByRole("progressbar", { name: "Food budget" });
    expect(bar).toHaveAttribute("aria-valuenow", "84");
    expect(bar).toHaveAttribute("aria-valuetext", "84%");
  });

  it("clamps the drawn width at 100 but reports 130", () => {
    render(<ProgressMeter percent={130} tone="over" label="Food budget" />);
    expect(screen.getByTestId("meter-fill")).toHaveStyle({ width: "100%" });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "130");
  });

  it("draws the overflow share as a hatched segment only when over", () => {
    render(<ProgressMeter percent={125} tone="over" label="Food budget" />);
    // 25 of 125 is the overflow: one fifth of the bar.
    expect(screen.getByTestId("meter-overflow")).toHaveStyle({ width: "20%" });
  });

  it("draws no overflow for a goal past 100", () => {
    render(<ProgressMeter percent={120} tone="goal" label="Trip fund" />);
    expect(screen.queryByTestId("meter-overflow")).toBeNull();
  });

  it("treats a non-finite percent as zero", () => {
    render(<ProgressMeter percent={Number.NaN} tone="onTrack" label="Food budget" />);
    expect(screen.getByTestId("meter-fill")).toHaveStyle({ width: "0%" });
  });
});
