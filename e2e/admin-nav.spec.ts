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
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
}

function measure(page: Page) {
  return page.locator("nav.sticky").evaluate((nav) => ({
    overflow: nav.scrollWidth - nav.clientWidth,
    wrapped: [...nav.querySelectorAll("a, button")]
      .filter((e) => (e as HTMLElement).innerText.trim() && e.getBoundingClientRect().height > 44)
      .map((e) => (e as HTMLElement).innerText),
  }));
}

for (const role of ["USER", "ADMIN"] as const) {
  for (const width of [1024, 1280, 1440]) {
    test(`${role} top bar fits one row at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await asRole(page, role);
      expect(await measure(page)).toEqual({ overflow: 0, wrapped: [] });
      await page.locator("nav.sticky").screenshot({ path: path.join(ARTIFACTS, `nav-${role}-${width}.png`) });
    });
  }
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
