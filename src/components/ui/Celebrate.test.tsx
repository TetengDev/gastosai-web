import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Celebrate from "./Celebrate";

const cheering = (c: HTMLElement) => c.querySelector('[data-piso-state="cheer"]');

describe("Celebrate", () => {
  it("plays once, then never again for the same event", () => {
    const first = render(<Celebrate event="first-expense" />);
    expect(cheering(first.container)).not.toBeNull();
    first.unmount();

    const second = render(<Celebrate event="first-expense" />);
    expect(cheering(second.container)).toBeNull();
  });

  it("keeps events independent", () => {
    render(<Celebrate event="goal-1" />);
    const other = render(<Celebrate event="goal-2" />);
    expect(cheering(other.container)).not.toBeNull();
  });

  it("hides the coin from assistive technology; Piso carries the announcement", () => {
    const { container } = render(<Celebrate event="month-2026-10" />);
    expect(container.querySelector('[data-testid="coin"]')).toHaveAttribute("aria-hidden", "true");
    expect(cheering(container)).toHaveAttribute("aria-label", "Celebrating");
  });

  // Under reduced motion `.animate-coin-drop` carries no animation (pinned in tokens.test.ts), so
  // the coin must be invisible at rest and the static cheer is the whole celebration.
  it("keeps the coin invisible unless its animation reveals it", () => {
    const { container } = render(<Celebrate event="goal-9" />);
    const coin = container.querySelector('[data-testid="coin"]');
    expect(coin).toHaveClass("opacity-0");
    expect(coin).toHaveClass("animate-coin-drop");
  });
});
