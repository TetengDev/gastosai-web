import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

/** A page with an opener button, so focus has somewhere to come back to. */
function Host({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal
        open={open}
        title="Add savings"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <input aria-label="Amount" />
        <button>Save</button>
      </Modal>
    </>
  );
}

const openHost = (onClose?: () => void) => {
  render(<Host onClose={onClose} />);
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
};

describe("Modal", () => {
  it("is a modal dialog named by its title", () => {
    openHost();
    const dialog = screen.getByRole("dialog", { name: "Add savings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Add savings" })).toBeTruthy();
  });

  // e2e/support/dialog.ts scopes every modal by this class.
  it("keeps the animate-pop panel class", () => {
    openHost();
    expect(screen.getByRole("dialog")).toHaveClass("animate-pop");
  });

  it("moves focus into the dialog when it opens", () => {
    openHost();
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    openHost(onClose);
    fireEvent.keyDown(screen.getByLabelText("Amount"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("wraps Tab from the last control to the first, and Shift+Tab back", () => {
    openHost();
    const close = screen.getByRole("button", { name: "Close" });
    const save = screen.getByRole("button", { name: "Save" });

    save.focus();
    fireEvent.keyDown(save, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(save);
  });

  // A click on the panel's padding focuses the panel itself (tabIndex -1); Tab must not leave from there.
  it("keeps Tab and Shift+Tab inside when the panel itself has focus", () => {
    openHost();
    const dialog = screen.getByRole("dialog");

    dialog.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));

    dialog.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
  });

  it("returns focus to the control that opened it", () => {
    const opener = openHost();
    expect(document.activeElement).not.toBe(opener);
    fireEvent.keyDown(screen.getByLabelText("Amount"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
