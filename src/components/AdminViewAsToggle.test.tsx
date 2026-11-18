import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminViewAsToggle from "./AdminViewAsToggle";

const panel = () => screen.queryByLabelText("Plan");

function renderViewAs() {
  const under = vi.fn();
  render(
    <>
      <AdminViewAsToggle />
      <main>
        <button onClick={under}>Under the bar</button>
      </main>
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "View as (admin)" }));
  expect(panel()).not.toBeNull();
  return { under };
}

beforeEach(() => localStorage.clear());

describe("AdminViewAsToggle — dismissal (TEN-500)", () => {
  it("closes on a click on the page below the bar, without activating what was under it", () => {
    const { under } = renderViewAs();
    fireEvent.click(screen.getByRole("button", { name: "Under the bar" }), { detail: 1 });
    expect(panel()).toBeNull();
    expect(under).not.toHaveBeenCalled();
  });

  it("closes on Escape from inside the panel, returning focus to its toggle", () => {
    renderViewAs();
    const inside = panel()!;
    inside.focus();
    fireEvent.keyDown(inside, { key: "Escape" });
    expect(panel()).toBeNull();
    expect(screen.getByRole("button", { name: "View as (admin)" })).toHaveFocus();
  });

  it("closes on Escape", () => {
    renderViewAs();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(panel()).toBeNull();
  });

  it("stays open while a setting is changed, and its toggle still closes it", () => {
    renderViewAs();
    fireEvent.click(panel()!);
    fireEvent.change(panel()!, { target: { value: "FREE" } });
    expect(localStorage.getItem("gastosai:viewas:plan")).toBe("FREE");
    expect(panel()).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View as (admin)" }));
    expect(panel()).toBeNull();
  });
});
