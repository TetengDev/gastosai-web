import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = path.join(here, "artifacts");

/**
 * The public landing page at `/` (TEN-485), logged out. Runs in installed Chrome rather than the
 * bundled Chromium, which ships without the H.264 decoder the tour video needs.
 */
test.use({ channel: "chrome", storageState: { cookies: [], origins: [] } });

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: true });
}

test.describe("Landing page", () => {
  test("logged-out / shows the hook, the features and the way in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Saan napunta ang sweldo ko?" })).toBeVisible();
    await expect(page.locator("main li")).toHaveCount(6);
    await shot(page, "landing-01-desktop");

    await page.getByRole("link", { name: "Sign in" }).last().click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/");
    await page.getByRole("link", { name: "Create account" }).first().click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("the tour plays by itself, muted, in the hero", async ({ page }) => {
    await page.goto("/");
    const video = page.locator("video");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15000 }).toBeGreaterThan(2);
    const state = await video.evaluate((v: HTMLVideoElement) => ({
      muted: v.muted,
      paused: v.paused,
      duration: Math.round(v.duration),
      width: v.videoWidth,
      tracks: v.textTracks.length,
      aboveFold: v.getBoundingClientRect().top < window.innerHeight,
    }));
    expect(state).toEqual({ muted: true, paused: false, duration: 60, width: 1920, tracks: 1, aboveFold: true });
    await shot(page, "landing-02-hero-playing");
  });

  test("fits a phone with no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await shot(page, "landing-03-phone");
  });

  test("app pages still send logged-out visitors to /login", async ({ page }) => {
    await page.goto("/expenses");
    await expect(page).toHaveURL(/\/login$/);
  });
});
