import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import App from "../App";

const auth = vi.hoisted(() => ({ user: null as null | { email: string } }));

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: auth.user, isAdmin: false, isLoading: false, login: vi.fn() }),
}));
// The logged-in shell fetches data on mount; only which page `/` resolves to matters here.
vi.mock("./Dashboard", () => ({ default: () => <p>dashboard page</p> }));
vi.mock("../components/AnnouncementBar", () => ({ default: () => null }));
vi.mock("../components/Navbar", () => ({ default: () => null }));
vi.mock("../components/ChatWidget", () => ({ default: () => null }));
vi.mock("../components/FirstRunTour", () => ({ default: () => null }));

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  auth.user = null;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

describe("landing page at / (TEN-485)", () => {
  it("shows logged-out visitors the landing page with a way in", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1, name: "Saan napunta ang sweldo ko?" })).toBeTruthy();
    const create = screen.getAllByRole("link", { name: "Create account" });
    expect(create.length).toBe(2);
    create.forEach((l) => expect(l.getAttribute("href")).toBe("/register"));
    const signIn = screen.getAllByRole("link", { name: "Sign in" });
    signIn.forEach((l) => expect(l.getAttribute("href")).toBe("/login"));
    expect(screen.getAllByRole("listitem").length).toBe(6);
  });

  it("plays the tour muted and looping in the hero, with controls and captions", () => {
    renderAt("/");
    const video = document.querySelector("video")!;
    expect(video.getAttribute("src")).toBe("/tour/gastosai-tour.mp4");
    expect(video.getAttribute("poster")).toBe("/tour/gastosai-tour.jpg");
    expect(video.hasAttribute("autoplay")).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.hasAttribute("loop")).toBe(true);
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.getAttribute("preload")).toBe("auto");
    const track = video.querySelector("track");
    expect(track?.getAttribute("kind")).toBe("captions");
    expect(track?.getAttribute("src")).toBe("/tour/gastosai-tour.en.vtt");
  });

  it("leaves the tour paused and unfetched for reduced-motion visitors", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    renderAt("/");
    const video = document.querySelector("video")!;
    expect(video.hasAttribute("autoplay")).toBe(false);
    expect(video.getAttribute("preload")).toBe("none");
  });

  it("still sends logged-out visitors of app pages to /login", () => {
    renderAt("/expenses");
    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByText("Saan napunta ang sweldo ko?")).toBeNull();
  });

  it("gives logged-in users the dashboard at /", () => {
    auth.user = { email: "demo@gastosai.dev" };
    renderAt("/");
    expect(screen.getByText("dashboard page")).toBeTruthy();
    expect(screen.queryByText("Saan napunta ang sweldo ko?")).toBeNull();
  });
});
