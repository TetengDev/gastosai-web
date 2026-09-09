import type { Page } from "@playwright/test";

/** How long a caption is held on screen by default, so a viewer can read it. */
export const BEAT = 2200;

/**
 * Draw a caption over the running app and hold it.
 *
 * Lifted out of `e2e/expenses-pagination.demo.ts` so the demo recording and any later showcase
 * share one implementation rather than each carrying a copy of the same styling.
 */
export async function caption(
  page: Page,
  text: string,
  holdMs: number = BEAT,
  where: CaptionPosition = "bottom"
): Promise<void> {
  await page.evaluate(
    ({ t, w }) => {
      let el = document.getElementById("__demo_caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "__demo_caption";
        document.body.appendChild(el);
      }
      el.style.cssText =
        `position:fixed;left:50%;${w === "top" ? "top" : "bottom"}:28px;` +
        "transform:translateX(-50%);z-index:99999;pointer-events:none;" +
        "background:rgba(17,24,39,.92);color:#fff;padding:12px 20px;border-radius:9999px;" +
        "font:600 16px/1.3 system-ui,Segoe UI,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3);" +
        "max-width:80vw;text-align:center;";
      el.textContent = t;
    },
    { t: text, w: where }
  );
  await page.waitForTimeout(holdMs);
}

/**
 * Where the caption sits. Bottom by default; `"top"` is for the scenes whose own UI lives at the
 * bottom of the window — the chat widget's composer is exactly where a bottom caption would land,
 * and a caption that covers the feature it is describing is worse than no caption at all.
 */
export type CaptionPosition = "bottom" | "top";
