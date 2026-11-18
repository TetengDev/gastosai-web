import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CurrencySelect from "./CurrencySelect";
import { Modal } from "./ui";

describe("CurrencySelect inside a Modal", () => {
  // Escape belongs to the innermost thing that is open: the list first, then the dialog.
  it("closes its open list on Escape and leaves the dialog open, then lets Escape close the dialog", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Add Goal" onClose={onClose}>
        <CurrencySelect value="PHP" onChange={() => {}} />
      </Modal>,
    );
    const trigger = screen.getByRole("button", { name: /PHP/ });
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: /USD/ })).toBeTruthy();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("button", { name: /USD/ })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Add Goal" })).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
