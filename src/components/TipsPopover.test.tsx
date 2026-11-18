import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TipsPopover from "./TipsPopover";

// The tips panel's heading: a plain "Tips" text node that only renders while open.
const panel = () => screen.queryByText("Tips", { selector: "div" });

function renderTips() {
  const under = vi.fn();
  render(
    <>
      <TipsPopover />
      <main>
        <button onClick={under}>Under the bar</button>
      </main>
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Tips" }));
  expect(panel()).not.toBeNull();
  return { under };
}

beforeEach(() => localStorage.clear());

describe("TipsPopover — dismissal (TEN-500)", () => {
  it("closes on a click on the page below the bar, without activating what was under it", () => {
    const { under } = renderTips();
    fireEvent.click(screen.getByRole("button", { name: "Under the bar" }));
    expect(panel()).toBeNull();
    expect(under).not.toHaveBeenCalled();
  });

  it("closes on Escape from inside the panel, returning focus to its toggle", () => {
    renderTips();
    const inside = screen.getByRole("button", { name: "Next tip" });
    inside.focus();
    fireEvent.keyDown(inside, { key: "Escape" });
    expect(panel()).toBeNull();
    expect(screen.getByRole("button", { name: "Tips" })).toHaveFocus();
  });

  it("closes on Escape", () => {
    renderTips();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(panel()).toBeNull();
  });

  it("stays open for a click inside it, and its toggle still closes it", () => {
    renderTips();
    fireEvent.click(screen.getByRole("button", { name: "Next tip" }));
    expect(panel()).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tips" }));
    expect(panel()).toBeNull();
  });
});
