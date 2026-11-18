import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CategoryCombobox from "./CategoryCombobox";
import { Modal } from "./ui";
import type { Category } from "../api/categories";

const FOOD = { id: 1, name: "Food" } as Category;

describe("CategoryCombobox inside a Modal", () => {
  // Escape belongs to the innermost thing that is open: the list first, then the dialog.
  it("closes its open list on Escape and leaves the dialog open, then lets Escape close the dialog", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Add Budget" onClose={onClose}>
        <CategoryCombobox categories={[FOOD]} value="" onChange={() => {}} />
      </Modal>,
    );
    const input = screen.getByPlaceholderText("Select category");
    fireEvent.focus(input);
    expect(screen.getByText("Food")).toBeTruthy();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByText("Food")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Add Budget" })).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
