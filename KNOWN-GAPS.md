# KNOWN-GAPS.md

Places where `CLAUDE.md` / `CONTRACT.md` describe a target the code has not reached yet.

Recorded rather than fixed because each is a substantial change in its own right, and bundling
them into the monorepo→polyrepo split would have meant changing application code and repository
layout at the same time. The split preserved behaviour exactly; these are the follow-ups.

Keep this file honest. When a gap closes, delete its entry.

---

## 1. The API layer is still hand-written

**Target:** every request/response type comes from `src/api/generated/`, produced by
`openapi-typescript` from the pinned contract package.
**Today:** the contract loop is wired — the pin, `gen:api`, and the CI drift guard all work —
but nothing consumes the generated types yet.

Still hand-written:

- 19 modules in `src/api/` (`expenses.ts`, `auth.ts`, `budgets.ts`, `categories.ts`, …)
- `src/api/types.ts` — 378 lines, 50 exported types
- 43 files import from `src/api/`; 24 of those import `src/api/types`

**Why it is not done here:** re-typing ~50 types and 43 call sites is a large diff, and doing it
in the same change as the repository split would have meant reviewing both at once with no way
to bisect a regression between them.

**How to close it, incrementally:**

1. New API calls use the generated types. Do not add to `types.ts`.
2. When you touch a module in `src/api/`, re-type it against `generated/` in that PR.
3. Delete `types.ts` when its last importer is gone — not before.

The generated types are already present and type-checked, so each migration step is a
mechanical, independently reviewable change.

---

## 2. Money is a decimal number in transit, not integer centavos

**Target (CONTRACT.md):** money is an integer number of centavos.
**Today:** the backend serves `BigDecimal` at full precision, so amounts arrive as JSON numbers
with a fractional part. Nothing here does float arithmetic on money, and the backend has a test
asserting no money field is ever declared `float`/`double` — but the representation is not the
one the contract describes.

This is a **breaking contract change** owned by the backend: it needs a major contract version
plus `/api/v2`, and this repo migrates only after that version is published. See
`gastosai-backend/KNOWN-GAPS.md`.

Until then: never parse an amount into a float and round-trip it, and keep all formatting in
`src/lib/formatters.ts`.

---

## 3. `CONTRACT.md` referred to a Supabase anon key

The shared contract text originally described the Supabase anon key as the client's only
credential. That is not this app: auth is a **backend-issued JWT** held in `localStorage`, and
Supabase is the managed Postgres host only — there is no Supabase client SDK or anon key in
this repo. `CONTRACT.md` has been corrected in both repos; noted here because the mobile repo's
`CLAUDE.md` still carries the original wording and needs the same fix when it is created.
