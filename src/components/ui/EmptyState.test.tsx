import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("shows the empty Piso, the copy and exactly one action", () => {
    const onClick = vi.fn();
    const { container } = render(
      <EmptyState
        title="No expenses yet"
        body="Log one and Piso starts keeping count."
        action={{ label: "Log your first expense", onClick }}
      />,
    );
    expect(container.querySelector('[data-piso-state="empty"]')).not.toBeNull();
    expect(screen.getByRole("heading", { name: "No expenses yet" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Log your first expense" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
