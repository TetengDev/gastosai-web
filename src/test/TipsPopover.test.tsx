import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import TipsPopover from "../components/TipsPopover";
import { getDismissedTips } from "../lib/tips";

describe("TipsPopover", () => {
  beforeEach(() => localStorage.clear());

  it("opens the popover and shows a tip", () => {
    render(<TipsPopover />);
    fireEvent.click(screen.getByRole("button", { name: "Tips" }));
    expect(screen.getByText("Tips")).toBeInTheDocument();
    expect(screen.getByText("Got it")).toBeInTheDocument();
  });

  it("dismisses a tip and persists it", () => {
    render(<TipsPopover />);
    fireEvent.click(screen.getByRole("button", { name: "Tips" }));
    expect(getDismissedTips()).toHaveLength(0);
    fireEvent.click(screen.getByText("Got it"));
    expect(getDismissedTips()).toHaveLength(1);
  });
});
