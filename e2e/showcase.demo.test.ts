import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SHOWCASE_SCENES, newTraces, scene } from "./support";

/**
 * The guard rails around the showcase artifact.
 *
 * `showcase.demo.ts` itself cannot be asserted on by running it — running it *is* the recording,
 * it takes minutes, and it needs the whole local stack. What can be checked cheaply is the part
 * that keeps going wrong when someone edits it later: a scene quietly dropped from the story, a
 * second copy of the caption helper pasted in, a cleanup that stops running on failure, and the
 * recording script losing one of the four properties the issue asks it to have.
 *
 * Playwright rather than Vitest because `vitest.config.ts` excludes `e2e/**` — the specs here are
 * Playwright's, and a Vitest file in this directory would be collected by neither.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(here, rel), "utf8");

const walkthrough = read("showcase.demo.ts");
const script = read("../scripts/record-showcase.sh");
const pkg = JSON.parse(read("../package.json")) as { scripts: Record<string, string> };

test.describe("showcase · the story", () => {
  test("walks every beat the showcase promises, in order", () => {
    expect(SHOWCASE_SCENES.map((s) => s.id)).toEqual([
      "sign-in",
      "dashboard",
      "add-expense",
      "budgets",
      "goals",
      "recurring",
      "assistant",
      "export",
    ]);
  });

  test("names every scene it films, and nothing it does not", () => {
    for (const s of SHOWCASE_SCENES) {
      expect(walkthrough, `scene "${s.id}" is declared but never filmed`).toContain(`"${s.id}"`);
    }
  });

  test("a mistyped scene id fails loudly rather than captioning nothing", () => {
    expect(() => scene("budgeets")).toThrow(/unknown showcase scene/);
    expect(scene("budgets").title).toMatch(/50 \/ 30 \/ 20/);
  });
});

test.describe("showcase · captions and cleanup", () => {
  test("uses the shared caption helper rather than a second copy", () => {
    expect(walkthrough).toMatch(/import \{[\s\S]*caption[\s\S]*\} from "\.\/support"/);
    // The styling belongs to `support/caption.ts`; a copy here is the thing that drifts.
    expect(walkthrough).not.toContain("__demo_caption");
    expect(walkthrough).not.toContain("createElement");
  });

  test("holds every caption long enough to read", () => {
    // `caption()` defaults to BEAT and the walkthrough only ever lengthens it, never shortens it.
    const shortened = walkthrough.match(/caption\(page,[^)]*?,\s*BEAT\s*-/g);
    expect(shortened, "a caption shorter than one beat cannot be read").toBeNull();
  });

  test("sweeps from afterEach, so cleanup runs on failure too", () => {
    expect(walkthrough).toMatch(/test\.afterEach\([\s\S]*sweepShowcase\(request, traces\)/);
    expect(walkthrough).not.toMatch(/test\.afterAll\([\s\S]*sweepShowcase/);
  });

  test("starts each run with nothing to undo", () => {
    const traces = newTraces();
    expect(traces.conversationIds).toEqual([]);
    expect(traces.budgetRuleBefore).toBeNull();
  });
});

test.describe("showcase · the recording script", () => {
  test("is executable, so `./scripts/record-showcase.sh` is one command", () => {
    const mode = fs.statSync(path.join(here, "../scripts/record-showcase.sh")).mode;
    expect(mode & 0o111, "record-showcase.sh needs its executable bit").toBeGreaterThan(0);
    expect(pkg.scripts.showcase).toContain("scripts/record-showcase.sh");
  });

  test("refuses to start when the local stack is not up", () => {
    expect(script).toContain("probe \"$WEB_URL\"");
    expect(script).toContain("probe \"$API_URL/actuator/health\"");
    expect(script).toMatch(/is not answering at[\s\S]*exit 1/);
  });

  test("names the output after the version in package.json", () => {
    expect(script).toContain('VERSION="$(node -p "require(\'./package.json\').version")"');
    expect(script).toContain('FINAL="$OUT_DIR/gastosai-showcase-${VERSION}.mp4"');
  });

  test("probes for the drawtext filter, not merely for an ffmpeg binary", () => {
    expect(script).toContain("-hide_banner -filters");
    expect(script).toContain('*" drawtext "*');
    // Read into a variable and matched in the shell: piping into `grep -q` would kill ffmpeg with
    // SIGPIPE and, under `pipefail`, answer "no drawtext" for a binary that has it.
    expect(script).toMatch(/filters=\$\("\$candidate" -hide_banner -filters/);
  });

  test("still writes an MP4, untitled and with a warning, when drawtext is missing", () => {
    expect(script).toContain("the showcase will be written untitled");
    expect(script).toMatch(/cp "\$\{TITLED:-\$BODY\}" "\$FINAL"/);
    expect(script).toContain("no title card on $FINAL");
  });

  test("can hand the finished file to attach_evidence.py, but only when asked", () => {
    expect(script).toContain("../scripts/attach_evidence.py");
    expect(script).toMatch(/if \[\[ -n "\$ISSUE" \]\]; then/);
    // The 50 MB ceiling is Linear's, so it is checked on the path that uploads.
    expect(script).toContain("SIZE_MB >= 50");
  });
});
