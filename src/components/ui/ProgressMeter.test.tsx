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
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "130",
    );
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
    render(
      <ProgressMeter percent={Number.NaN} tone="onTrack" label="Food budget" />,
    );
    expect(screen.getByTestId("meter-fill")).toHaveStyle({ width: "0%" });
  });

  it.each([80, 100, 130])(
    "outlines the over track with a border and gap at percent %i, warning does not",
    (percent) => {
      const { unmount } = render(
        <ProgressMeter percent={percent} tone="over" label="Over" />,
      );
      const over = screen.getByRole("progressbar");
      expect(over).toHaveClass("border", "border-warn-ink", "p-px");
      expect(screen.getByTestId("meter-fill").parentElement).not.toBe(over);
      unmount();
      render(<ProgressMeter percent={percent} tone="warning" label="Warn" />);
      const warn = screen.getByRole("progressbar");
      expect(warn).not.toHaveClass("border");
      expect(warn).not.toHaveClass("p-px");
    },
  );

  it("keeps the overflow segment inside the gap", () => {
    render(<ProgressMeter percent={130} tone="over" label="Over" />);
    expect(screen.getByTestId("meter-overflow").parentElement).toBe(
      screen.getByTestId("meter-fill").parentElement,
    );
    expect(screen.getByTestId("meter-overflow").parentElement).not.toBe(
      screen.getByRole("progressbar"),
    );
  });

  it("shows a bar inside the ring and gap at the smallest supported over height", () => {
    render(<ProgressMeter percent={130} tone="over" label="Over" height={6} />);
    expect(screen.getByRole("progressbar")).toHaveStyle({ height: "6px" });
    expect(screen.getByTestId("meter-fill").parentElement).not.toBe(
      screen.getByRole("progressbar"),
    );
  });
});
