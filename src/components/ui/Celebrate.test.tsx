import { render as rtlRender } from "@testing-library/react";
import { StrictMode, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import { celebrationKey } from "../../lib/celebrateStore";
import Celebrate from "./Celebrate";

const cheering = (c: HTMLElement) => c.querySelector('[data-piso-state="cheer"]');

const ACCOUNT = "a@example.com";

/** Signs a user in the way AuthContext reads it at startup: a token and the user record. */
const signIn = () => {
  localStorage.setItem("token", "t");
  localStorage.setItem("auth_user", JSON.stringify({ email: ACCOUNT, name: "A", role: "USER" }));
};

const render = (ui: ReactElement) => rtlRender(<AuthProvider>{ui}</AuthProvider>);

const celebrateKeys = () =>
  Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter((k) =>
    k.startsWith("ga.celebrate."),
  );

describe("Celebrate, signed out", () => {
  // Matches mobile (TEN-454): the seen flag is per account, so with no account there is nothing
  // to scope it to. An `auth_user` record without a token is not a session in AuthContext either.
  it.each([
    ["no session at all", () => {}],
    ["a user record but no token", () => localStorage.setItem("auth_user", JSON.stringify({ email: ACCOUNT }))],
  ])("renders nothing and marks nothing with %s", (_, seed) => {
    seed();
    const { container } = render(<Celebrate event="first-expense" />);
    expect(cheering(container)).toBeNull();
    expect(container).toBeEmptyDOMElement();
    expect(celebrateKeys()).toEqual([]);
  });
});

describe("Celebrate", () => {
  beforeEach(signIn);
  afterEach(() => vi.restoreAllMocks());

  it("marks the event under the signed-in account, never an anon scope", () => {
    render(<Celebrate event="goal-5" />);
    expect(celebrateKeys()).toEqual([celebrationKey(ACCOUNT, "goal-5")]);
  });

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

  // StrictMode calls the state initializer twice; the second call finds the flag already set.
  // The first result must win, or marking before playing would cancel every celebration in dev.
  it("still plays under StrictMode's double invocation", () => {
    const { container } = render(
      <StrictMode>
        <Celebrate event="goal-strict" />
      </StrictMode>,
    );
    expect(cheering(container)).not.toBeNull();
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
