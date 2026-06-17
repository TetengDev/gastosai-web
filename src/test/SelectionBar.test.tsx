import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectionBar from "../components/ui/SelectionBar";

describe("SelectionBar", () => {
  const noop = () => {};

  it("renders nothing when count is 0", () => {
    const { container } = render(<SelectionBar count={0} onDelete={noop} onClear={noop} />);
    expect(container.firstChild).toBeNull();
  });

  it("uses the singular noun for count 1", () => {
    render(<SelectionBar count={1} onDelete={noop} onClear={noop} noun="budget" />);
    expect(screen.getByText("1 budget selected")).toBeInTheDocument();
  });

  it("defaults plural to noun + 's'", () => {
    render(<SelectionBar count={3} onDelete={noop} onClear={noop} noun="budget" />);
    expect(screen.getByText("3 budgets selected")).toBeInTheDocument();
  });

  it("honors an explicit irregular plural", () => {
    render(<SelectionBar count={2} onDelete={noop} onClear={noop} noun="category" nounPlural="categories" />);
    expect(screen.getByText("2 categories selected")).toBeInTheDocument();
  });

  it("fires onDelete and onClear", () => {
    const onDelete = vi.fn();
    const onClear = vi.fn();
    render(<SelectionBar count={2} onDelete={onDelete} onClear={onClear} noun="item" />);
    fireEvent.click(screen.getByText("Clear"));
    fireEvent.click(screen.getByText(/Delete selected/));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("disables the delete button and shows busy label while deleting", () => {
    render(<SelectionBar count={2} onDelete={noop} onClear={noop} deleting noun="item" />);
    const btn = screen.getByRole("button", { name: /Deleting/ });
    expect(btn).toBeDisabled();
  });
});
