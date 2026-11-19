/**
 * The pure half of the load run: what it is allowed to target, its shape, who signs in, and how
 * the Artillery report is read back. `run.ts` and `artillery/scenario.ts` both import it, so the
 * runner and a direct `artillery run` refuse the same targets.
 */

/** Exact pin: `npx -y artillery@<this>`. Nothing is added to package.json. */
export const ARTILLERY_VERSION = "2.0.34";

export const LOCAL_WEB = "http://localhost:5173";
export const LOCAL_API = "http://localhost:8080";

export type Account = { email: string; password: string };

/**
 * The accounts the backend seeds locally (`AppDataLoader`, with sample data on). Virtual users
 * share them round-robin; the run never registers a new one. The demo account honours the same
 * overrides as `e2e/support/auth.ts`, which cannot be imported here: it reads `import.meta.url`
 * at load, and Artillery bundles the scenario to CommonJS.
 */
export const ACCOUNTS: Account[] = [
  {
    email: process.env.E2E_EMAIL ?? "demo@gastosai.dev",
    password: process.env.E2E_PASSWORD ?? "demo123",
  },
  { email: "free@gastosai.dev", password: "free123" },
  { email: "premium@gastosai.dev", password: "premium123" },
  { email: "trial@gastosai.dev", password: "trial123" },
];

export const accountFor = (vu: number): Account => ACCOUNTS[vu % ACCOUNTS.length];

export type Settings = {
  target: string;
  api: string;
  users: number;
  rampSeconds: number;
  holdSeconds: number;
};

type Env = Record<string, string | undefined>;

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const positiveInt = (env: Env, name: string, fallback: number): number => {
  const raw = env[name] ?? String(fallback);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a whole number of at least 1, got "${raw}".`);
  }
  return value;
};

/** Read the run's settings from the environment; throws on a refused target or a bad number. */
export function settingsFrom(env: Env): Settings {
  const target = env.LOAD_TARGET ?? LOCAL_WEB;
  const api = env.LOAD_API_URL ?? env.E2E_API_URL ?? LOCAL_API;
  const local = originOf(target) === LOCAL_WEB && originOf(api) === LOCAL_API;
  if (!local && env.LOAD_ALLOW_REMOTE !== "1") {
    throw new Error(
      `Refusing to load-test ${target} (API ${api}). This run only targets ${LOCAL_WEB} and its ` +
        `API on ${LOCAL_API} unless LOAD_ALLOW_REMOTE=1 is set: every virtual user writes real ` +
        `rows, and writing to a non-local backend leaves rows behind whenever a run is cut short.`
    );
  }
  return {
    target,
    api,
    users: positiveInt(env, "LOAD_USERS", 10),
    rampSeconds: positiveInt(env, "LOAD_RAMP_SECONDS", 60),
    holdSeconds: positiveInt(env, "LOAD_HOLD_SECONDS", 60),
  };
}

/** The only `/ai/` routes that are plain reads; every other one may reach a model. */
const PLAIN_AI_READS = new Set(["usage", "languages"]);

/** Requests the scenario routes through `blockedRequest`: API paths, on any origin. */
export const API_REQUEST = /^https?:\/\/[^/]+\/(api\/v\d+|ai)\//;

/**
 * Why the load run must not send `url`, or null if it may. Two cases:
 *
 * - an API call to any origin but the vetted one, which is how a dev server started with
 *   `VITE_API_URL` pointing elsewhere would otherwise write to that backend, past the env guard;
 * - an `/ai/` route other than the plain reads (chat, query, receipt vision, insights, and
 *   whatever is added later). `/chat/conversations` and `/user/ai-settings` are not `/ai/` routes.
 */
export function blockedRequest(url: string, api: string): string | null {
  const parsed = new URL(url);
  if (parsed.origin !== originOf(api)) return `API call to ${parsed.origin}, not ${api}`;
  const ai = /^\/(?:api\/v\d+\/)?ai\/([^/]+)/.exec(parsed.pathname);
  return ai && !PLAIN_AI_READS.has(ai[1]) ? `AI endpoint ${parsed.pathname}` : null;
}

/** Counter prefix the scenario emits per error response: `<prefix><status> <METHOD> <path>`. */
export const HTTP_ERROR = "load.http_error.";

type Summary = { p50: number; p95: number; p99: number };
export type ArtilleryReport = {
  aggregate: { counters?: Record<string, number>; summaries?: Record<string, Summary> };
};

const row = (label: string, s: Summary) =>
  `  ${label.padEnd(44)}${[s.p50, s.p95, s.p99].map((v) => String(Math.round(v)).padStart(8)).join("")}`;

/** The end-of-run digest: percentiles, HTTP errors by status, and failed virtual users. */
export function summarize(report: ArtilleryReport): { text: string; failed: number } {
  const counters = report.aggregate.counters ?? {};
  const summaries = Object.entries(report.aggregate.summaries ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const header = `  ${"".padEnd(44)}${["p50", "p95", "p99"].map((h) => h.padStart(8)).join("")}`;

  const pages = summaries.flatMap(([key, s]) => {
    // `browser.page.<metric>.<url>`; CLS and INP are left out, they are not load times.
    const m = /^browser\.page\.(TTFB|FCP|LCP)\.(.+)$/.exec(key);
    return m ? [row(`${m[1]} ${originOf(m[2]) ? new URL(m[2]).pathname : m[2]}`, s)] : [];
  });
  const steps = summaries.flatMap(([key, s]) =>
    key.startsWith("browser.step.") ? [row(key.slice("browser.step.".length), s)] : []
  );
  const httpErrors = Object.entries(counters)
    .map(([key, n]) => [/^browser\.page\.codes\.(\d+)$/.exec(key)?.[1], n] as const)
    .filter(([status]) => Number(status) >= 400)
    .map(([status, n]) => `${status} × ${n}`);
  const httpErrorRequests = Object.entries(counters)
    .filter(([key]) => key.startsWith(HTTP_ERROR))
    .sort(([, a], [, b]) => b - a)
    .map(([key, n]) => `  ${key.slice(HTTP_ERROR.length)} × ${n}`);
  const errors = Object.entries(counters)
    .filter(([key]) => key.startsWith("errors."))
    .map(([key, n]) => `  ${key.slice("errors.".length)} × ${n}`);
  const failed = counters["vusers.failed"] ?? 0;

  const text = [
    "Page loads (ms)",
    header,
    ...(pages.length ? pages : ["  (none recorded)"]),
    "Steps (ms)",
    header,
    ...(steps.length ? steps : ["  (none recorded)"]),
    `HTTP errors by status: ${httpErrors.length ? httpErrors.join(", ") : "none"}`,
    ...httpErrorRequests,
    `Failed virtual users: ${failed} of ${counters["vusers.created"] ?? 0}`,
    ...(errors.length ? ["Errors:", ...errors] : []),
  ].join("\n");
  return { text, failed };
}
