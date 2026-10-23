import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import LoginPage from "./LoginPage";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ login: vi.fn() }) }));

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage product tour (TEN-485)", () => {
  it("does not mount the video until the visitor asks for it", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /watch the 60-second tour/i })).toBeTruthy();
    expect(document.querySelector("video")).toBeNull();
  });

  it("opens the tour with its source, poster and captions, and closing unmounts it", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole("button", { name: /watch the 60-second tour/i }));

    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video!.getAttribute("src")).toBe("/tour/gastosai-tour.mp4");
    expect(video!.getAttribute("poster")).toBe("/tour/gastosai-tour.jpg");
    expect(video!.getAttribute("preload")).toBe("none");
    expect(video!.hasAttribute("controls")).toBe(true);
    expect(video!.hasAttribute("playsinline")).toBe(true);
    const track = video!.querySelector("track");
    expect(track?.getAttribute("kind")).toBe("captions");
    expect(track?.getAttribute("src")).toBe("/tour/gastosai-tour.en.vtt");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(document.querySelector("video")).toBeNull();
  });
});
