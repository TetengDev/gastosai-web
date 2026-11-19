import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PublicLayout from "../components/PublicLayout";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import VerifyMagicLink from "../pages/VerifyMagicLink";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: vi.fn(), register: vi.fn(), applySession: vi.fn() }),
}));
vi.mock("../api/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/auth")>()),
  verifyMagicLink: () => new Promise(() => {}),
}));

/** Every place the product names itself shows one lockup: the small Piso mark beside the rolling wordmark. */
const cases: [string, ReactElement, string, "link" | "heading"][] = [
  ["the public header", <PublicLayout>page</PublicLayout>, "/", "link"],
  ["the login page", <LoginPage />, "/login", "heading"],
  ["the register page", <RegisterPage />, "/register", "heading"],
  ["the magic-link page while signing in", <VerifyMagicLink />, "/verify?token=t", "heading"],
  ["the magic-link page on a bad link", <VerifyMagicLink />, "/verify", "heading"],
];

describe("the GastosAI lockup", () => {
  it.each(cases)("is the mark and the wordmark on %s", (_, ui, path, role) => {
    render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
    const lockup = screen.getByRole(role, { name: "GastosAI" });

    expect(lockup.querySelector(".ga-roll")).toBeTruthy();
    expect(lockup.querySelector("svg[data-piso-state]")?.getAttribute("viewBox")).toBe("0 0 64 64");
    expect(lockup.outerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
