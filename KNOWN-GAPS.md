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

## 3. Tests fail on Node 26 locally; CI pins Node 20

`src/test/tips.test.ts` and `src/test/TipsPopover.test.tsx` fail on **Node 26** with
`localStorage is undefined`. Node 26 ships a native experimental `localStorage` global that
displaces the one jsdom installs on `window`, and it is inert without `--localstorage-file`:

```
ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
```

This is an environment artifact, not a code defect — all 185 tests pass on Node 20, which is
what `.github/workflows/continuous-integration.yml` pins and what CI actually runs.

**If you develop on Node 26**, either use Node 20 locally (`nvm use 20`) or expect those six
failures. The real fix is to stop relying on the ambient global — have the tips helpers take
storage as a dependency, or stub it in `src/test/setup.ts` — which would make the suite
independent of the runtime's built-ins.

---

## 4. `openapi-typescript` needs a peer-dependency override

`openapi-typescript@7.13.0` declares `peer typescript@^5.x`, but this project is on
`typescript@6.0.3`, so a plain `npm install` fails with `ERESOLVE`. `package.json` carries a
narrow override:

```json
"overrides": { "openapi-typescript": { "typescript": "$typescript" } }
```

This pins openapi-typescript's `typescript` to the root version rather than disabling peer
resolution project-wide (`legacy-peer-deps`), which would mask unrelated conflicts — the same
concern that made the monorepo hold TypeScript majors back manually.

Verified working: codegen runs and the emitted `schema.d.ts` type-checks cleanly under
TypeScript 6. Remove the override once openapi-typescript widens its peer range.

---

## 5. `CONTRACT.md` referred to a Supabase anon key

The shared contract text originally described the Supabase anon key as the client's only
credential. That is not this app: auth is a **backend-issued JWT** held in `localStorage`, and
Supabase is the managed Postgres host only — there is no Supabase client SDK or anon key in
this repo. `CONTRACT.md` has been corrected in both repos; noted here because the mobile repo's
`CLAUDE.md` still carries the original wording and needs the same fix when it is created.
