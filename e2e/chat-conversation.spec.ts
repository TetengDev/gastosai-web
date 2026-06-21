import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * E2E for chat conversation history (Phase 2b): a persisted conversation appears in the History
 * drawer and can be reopened, started fresh, and deleted. The conversation is seeded through the
 * API (with the logged-in token) so the test exercises the drawer UI deterministically without
 * depending on the frontend's chat-vs-query routing heuristics or LLM latency in the UI thread.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = path.join(here, "artifacts");
const API = process.env.E2E_API_URL ?? "http://localhost:8080";
const EMAIL = process.env.E2E_EMAIL ?? "demo@gastosai.dev";
const PASSWORD = process.env.E2E_PASSWORD ?? "demo123";

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$|\/dashboard/, { timeout: 15000 });
}

test("a persisted conversation shows in History and can be reopened, started new, and deleted", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);

  // Seed a conversation server-side using the browser's auth token (persists via POST /ai/chat).
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeTruthy();
  // Letters only — the redaction layer masks long digit runs (timestamps) in the stored title.
  const suffix = Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 6).padEnd(6, "x");
  const marker = `E2Ehist${suffix}`;
  const seed = await page.request.post(`${API}/ai/chat`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { message: marker, mode: "plain" },
    timeout: 90_000,
  });
  expect(seed.ok()).toBeTruthy();
  expect((await seed.json()).conversationId).toBeTruthy();

  // Open the chat widget → History drawer lists the seeded conversation.
  await page.getByRole("button", { name: "Open chat" }).click();
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByText("Conversations")).toBeVisible({ timeout: 10000 });
  const item = page.getByRole("button", { name: new RegExp(marker) });
  await expect(item).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACTS, "chat-01-history.png"), fullPage: true });

  // Reopen it → drawer closes, its messages load.
  await item.click();
  await expect(page.getByText("Conversations")).toBeHidden({ timeout: 10000 });
  await expect(page.getByText(marker).first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACTS, "chat-02-reopened.png"), fullPage: true });

  // New conversation from the drawer.
  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "+ New conversation" }).click();
  await expect(page.getByText("Conversations")).toBeHidden({ timeout: 10000 });

  // Delete the seeded conversation from history → it disappears.
  await page.getByRole("button", { name: "History" }).click();
  const row = page.getByRole("button", { name: new RegExp(marker) });
  await row.hover();
  await row.locator("xpath=following-sibling::button").click();
  await expect(page.getByRole("button", { name: new RegExp(marker) })).toHaveCount(0, { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACTS, "chat-03-after-delete.png"), fullPage: true });
});
