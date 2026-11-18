import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog";
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

  // A dropdown inside (CurrencySelect, CategoryCombobox) is absolutely positioned; any clipping
  // box between it and the overlay hides its list and the focus halo. The overlay is what
  // scrolls. jsdom loads no Tailwind, so this reads the utility classes rather than computed style.
  it("puts no clipping box between the content and the scrolling overlay", () => {
    openHost();
    const overlay = screen.getByRole("dialog").parentElement!;
    expect(overlay).toHaveClass("overflow-y-auto");

    const clipping = /(^|\s)(overflow(-[xy])?-(auto|hidden|scroll|clip)|max-h-\S+)(\s|$)/;
    for (let el = screen.getByRole("textbox", { name: "Amount" }).parentElement; el && el !== overlay; el = el.parentElement) {
      expect(el.className).not.toMatch(clipping);
    }
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

  it("holds focus on the panel when it has nothing focusable", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>Nothing to press here.</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);

    // fireEvent returns false when the default (moving focus out) was prevented.
    expect(fireEvent.keyDown(dialog, { key: "Tab" })).toBe(false);
    expect(fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(dialog);
  });

  // A confirm stacked over a form: Escape closes the confirm only, and focus goes back to the
  // control inside the form that opened it.
  it("closes only the top dialog on Escape and returns focus to its opener", () => {
    const closeForm = vi.fn();
    function Stack() {
      const [confirming, setConfirming] = useState(false);
      return (
        <Modal open title="Edit Goal" onClose={closeForm}>
          <button onClick={() => setConfirming(true)}>Remove</button>
          <ConfirmDialog
            open={confirming}
            title="Delete goal?"
            message="It will be removed."
            onConfirm={() => {}}
            onCancel={() => setConfirming(false)}
          />
        </Modal>
      );
    }
    render(<Stack />);
    const remove = screen.getByRole("button", { name: "Remove" });
    remove.focus();
    fireEvent.click(remove);

    const confirm = screen.getByRole("dialog", { name: "Delete goal?" });
    expect(confirm.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Delete goal?" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Edit Goal" })).toBeTruthy();
    expect(closeForm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(remove);
  });
});
