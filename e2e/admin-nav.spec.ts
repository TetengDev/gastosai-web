import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE_STATE } from "./support";

const here = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = path.join(here, "artifacts");

test.use({ storageState: STORAGE_STATE });

/**
 * The top bar fits one row for both roles (TEN-494). The run signs in as the demo user, so the
 * admin case sets `role: "ADMIN"` on the stored user: that is what the nav reads to draw the admin
 * controls. It is a layout check only — the backend still treats the session as the demo user.
 */
async function asRole(page: Page, role: "USER" | "ADMIN") {
  await page.goto("/");
  await page.evaluate((r) => {
    const user = JSON.parse(localStorage.getItem("auth_user") ?? "{}");
    localStorage.setItem("auth_user", JSON.stringify({ ...user, role: r }));
  }, role);
  await page.reload();
  await expect(page.getByTestId("nav-log-expense")).toBeVisible();
}

const TOUR_ANCHORS = ["dashboard", "expenses", "categories", "budget", "recurring", "goals", "settings"];

function measure(page: Page) {
  return page.locator("nav.sticky").evaluate((nav, anchors) => ({
    overflow: nav.scrollWidth - window.innerWidth,
    missingAnchors: anchors.filter((a) => !document.querySelector(`[data-tour='nav-${a}']`)),
    wrapped: [...nav.querySelectorAll("a, button")]
      .filter((e) => (e as HTMLElement).innerText.trim() && e.getBoundingClientRect().height > 44)
      .map((e) => (e as HTMLElement).innerText),
  }), TOUR_ANCHORS);
}

// TEN-459 extends TEN-494's 1024–1440 down to phones: 768px overflowed by 202px (246px for admins).
for (const role of ["USER", "ADMIN"] as const) {
  for (const width of [360, 375, 768, 1024, 1280, 1536]) {
    test(`${role} top bar fits one row at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await asRole(page, role);
      expect(await measure(page)).toEqual({ overflow: 0, missingAnchors: [], wrapped: [] });
      await expect(page.getByTestId("nav-log-expense")).toBeVisible();
      await page.locator("nav.sticky").screenshot({ path: path.join(ARTIFACTS, `nav-${role}-${width}.png`) });
    });
  }
}

for (const role of ["USER", "ADMIN"] as const) {
  test(`${role} reaches every page and Tips from the menu at 375px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await asRole(page, role);
    const nav = page.locator("nav.sticky");
    const menu = nav.locator("#nav-overflow-menu");
    for (const [name, href] of [
      ["Expenses", "/expenses"],
      ["Categories", "/categories"],
      ["Budget", "/budget"],
      ["Recurring", "/recurring"],
      ["Goals", "/goals"],
      ["Dashboard", "/"],
    ]) {
      await nav.getByRole("button", { name: "Menu" }).click();
      await menu.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(href);
    }
    await nav.getByRole("button", { name: "Menu" }).click();
    if (role === "ADMIN") {
      // Hrefs only: the session is really the demo user's, so the admin API would sign it out.
      await expect(menu.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/admin/submissions");
      await expect(menu.getByRole("link", { name: "Chat Audit" })).toHaveAttribute("href", "/admin/chat-audit");
      await expect(menu.getByRole("link", { name: "Observability" })).toHaveAttribute("href", "/admin/observability");
    }
    await page.screenshot({ path: path.join(ARTIFACTS, `nav-${role}-375-menu-open.png`), clip: { x: 0, y: 0, width: 375, height: 520 } });
    await menu.getByRole("button", { name: "Tips" }).click();
    // The panel's own heading, which only renders once the popover is open.
    await expect(menu.getByText("Tips", { exact: true })).toBeVisible();
  });
}

test("ADMIN menu holds the three admin pages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await asRole(page, "ADMIN");
  const nav = page.locator("nav.sticky");
  await expect(nav.getByRole("link", { name: "Chat Audit" })).toHaveCount(0);
  await nav.getByRole("button", { name: "Admin", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/admin/submissions");
  await expect(nav.getByRole("link", { name: "Chat Audit" })).toHaveAttribute("href", "/admin/chat-audit");
  await expect(nav.getByRole("link", { name: "Observability" })).toHaveAttribute("href", "/admin/observability");
  await page.screenshot({ path: path.join(ARTIFACTS, "nav-ADMIN-menu-open.png"), clip: { x: 0, y: 0, width: 1440, height: 260 } });
  await page.keyboard.press("Escape");
  await expect(nav.getByRole("link", { name: "Messages" })).toHaveCount(0);
});
