import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import Navbar from "./Navbar";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Demo User", nickname: "Demo", avatar: null, avatarColor: null },
    isAdmin: false,
    logout: vi.fn(),
  }),
}));
vi.mock("../hooks/useEntitlements", () => ({
  useEntitlements: () => ({ entitlements: null, has: () => true, loading: false }),
}));
vi.mock("./AdminViewAsToggle", () => ({ default: () => null }));
vi.mock("./NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("./TipsPopover", () => ({ default: () => null }));

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar isDark={false} onToggleDark={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("Navbar", () => {
  it("anchors every tour step target", () => {
    const { container } = renderNavbar();
    for (const tour of [
      "nav-dashboard",
      "nav-expenses",
      "nav-categories",
      "nav-budget",
      "nav-recurring",
      "nav-goals",
      "nav-settings",
    ]) {
      expect(container.querySelector(`[data-tour='${tour}']`)).not.toBeNull();
    }
  });

  it("anchors Dashboard and Categories on their own nav links", () => {
    const { container } = renderNavbar();
    expect(container.querySelector("[data-tour='nav-dashboard']")?.textContent).toBe("Dashboard");
    expect(container.querySelector("[data-tour='nav-categories']")?.textContent).toBe("Categories");
  });
});
