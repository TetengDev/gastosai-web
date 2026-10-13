import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Celebrate from "./Celebrate";

const cheering = (c: HTMLElement) => c.querySelector('[data-piso-state="cheer"]');

describe("Celebrate", () => {
  afterEach(() => vi.restoreAllMocks());

  // Spec §3: a storage failure skips the animation. An unwritable flag cannot stop a replay on
  // the next visit, so the celebration does not start at all.
  it("skips the celebration when the seen flag cannot be written", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { container } = render(<Celebrate event="goal-3" />);
    expect(cheering(container)).toBeNull();
  });

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
