import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InfoTip from "../components/ui/InfoTip";

describe("InfoTip", () => {
  it("exposes the text as the button's accessible label", () => {
    render(<InfoTip text="Explains the metric" />);
    expect(screen.getByRole("button", { name: "Explains the metric" })).toBeInTheDocument();
  });

  it("shows the tooltip on focus and hides on blur", () => {
    render(<InfoTip text="Explains the metric" />);
    const btn = screen.getByRole("button", { name: "Explains the metric" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Explains the metric");
    fireEvent.blur(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
