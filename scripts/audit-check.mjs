#!/usr/bin/env node
/**
 * Blocking dependency audit with expiring, justified exceptions.
 *
 * `npm audit --audit-level=high` is all-or-nothing: one advisory with no available fix forces
 * you to either disable the gate entirely or take a risky downgrade. Both are bad — the first
 * stops catching real issues, the second ships a regression to satisfy a scanner.
 *
 * This keeps the gate blocking for everything except advisories explicitly listed below, each
 * of which must carry a reason and an expiry. An expired exception FAILS the build, so a
 * waiver can never quietly become permanent.
 *
 * Usage: node scripts/audit-check.mjs
 */

import { execSync } from "node:child_process";

const MIN_SEVERITY = ["high", "critical"];

/**
 * Each entry needs: why it does not apply to this codebase, and when that reasoning must be
 * revisited. "There is no fix yet" alone is not a reason — that is just deferral.
 */
const EXCEPTIONS = [
  {
    id: "GHSA-qwww-vcr4-c8h2",
    package: "react-router",
    expires: "2026-10-31",
    reason:
      "RSC-mode CSRF. This app is a pure client-side SPA: BrowserRouter + Routes only, no " +
      "loaders/actions, no server entry, no SSR, and vercel.json serves it as static files. " +
      "The vulnerable code path (server-side action execution) does not exist here. No fixed " +
      "version is published — 7.18.1 is latest and still in range — and the suggested remedy " +
      "is a downgrade to 7.11.0, which is a routing regression for no security benefit. " +
      "Revisit when a patched release lands, or immediately if this app ever adopts RSC/SSR.",
  },
];

const raw = (() => {
  try {
    return execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (err) {
    // npm audit exits non-zero when it finds anything; the JSON still comes back on stdout.
    if (err.stdout) return err.stdout;
    throw err;
  }
})();

const report = JSON.parse(raw);
const today = new Date().toISOString().slice(0, 10);

let failed = false;

// An exception that has outlived its expiry is itself a failure — that is the forcing function.
for (const e of EXCEPTIONS) {
  if (e.expires < today) {
    console.error(`::error::Audit exception for ${e.id} (${e.package}) expired on ${e.expires}. Re-evaluate it and either remove it or extend it with fresh justification.`);
    failed = true;
  }
}

const allowed = new Set(EXCEPTIONS.map((e) => e.id));
const unexpected = [];

for (const [name, v] of Object.entries(report.vulnerabilities ?? {})) {
  if (!MIN_SEVERITY.includes(v.severity)) continue;

  const ids = (Array.isArray(v.via) ? v.via : [])
    .filter((x) => typeof x === "object" && x.url)
    .map((x) => x.url.split("/").pop());

  // Keep it only if every advisory behind it is individually waived.
  if (ids.length > 0 && ids.every((id) => allowed.has(id))) continue;

  // Packages vulnerable purely *because* a waived package is (e.g. react-router-dom via
  // react-router) inherit the waiver rather than needing their own entry.
  const viaNames = (Array.isArray(v.via) ? v.via : []).map((x) => (typeof x === "string" ? x : x.name));
  const inheritsWaiver =
    ids.length === 0 &&
    viaNames.length > 0 &&
    viaNames.every((n) => EXCEPTIONS.some((e) => e.package === n));
  if (inheritsWaiver) continue;

  unexpected.push({ name, severity: v.severity, ids: ids.join(", ") || viaNames.join(", ") });
}

if (unexpected.length > 0) {
  console.error(`::error::${unexpected.length} unwaived high/critical advisory(ies):`);
  for (const u of unexpected) console.error(`  ${u.severity.padEnd(8)} ${u.name}  (${u.ids})`);
  console.error("Fix them, or add a justified, expiring exception to scripts/audit-check.mjs.");
  failed = true;
}

if (failed) process.exit(1);

const waived = EXCEPTIONS.map((e) => `${e.id} until ${e.expires}`).join("; ");
console.log(`Audit clean at high+ severity. Waived: ${waived || "none"}.`);
