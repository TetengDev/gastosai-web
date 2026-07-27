# CLAUDE.md — gastosai-web

React 19 + TypeScript + Vite + Tailwind + Recharts. A presentation surface over the
gastosai backend. **This repo pins and consumes the published API contract.** Read
`CONTRACT.md` first, then `KNOWN-GAPS.md` for where today's code does not yet meet the
invariants below.

---

## 1. Invariants

1. **API types come from the pinned contract package**
   (`@tetengdev/gastosai-api-contract`) generated into `src/api/generated/` — never
   hand-edited. Migration of the existing hand-written types is in progress; see §3.
2. **No business logic in the browser.** Totals, budgets, categorization, AI
   orchestration, quota accounting — all backend. Render responses, send input.
3. **Money is never floating point in transit; format only at the display edge.** The API
   serves decimal amounts at full precision — never parse them into a float and round-trip.
4. **Times render in `Asia/Manila`** from the API's `+08:00` timestamps. Never build
   a naive local date from a timestamp.
5. **No AI provider key in the frontend, ever.** Auth is a backend-issued JWT held in
   `localStorage`; nothing else secret belongs in this repo.

---

## 2. Stack

- React 19, Vite, TypeScript (strict), Tailwind, Recharts.
- `@tetengdev/gastosai-api-contract` — **exact pinned version**, from GitHub Packages
  via `.npmrc` scoping `@tetengdev` with `${PACKAGE_TOKEN}`.
- `openapi-typescript` generates the types from the pinned package.
- Deploys to Vercel; `VITE_API_URL` points at the backend.

---

## 3. The contract loop

- `npm run gen:api` reads
  `node_modules/@tetengdev/gastosai-api-contract/openapi.json` and writes
  `src/api/generated/schema.d.ts`. Generated — never hand-edited.
- `src/api/client.ts` is the only hand-written transport code: base URL from
  `VITE_API_URL`, auth header injection, 401/403 handling.
- Upgrading the contract is deliberate: bump the pinned version, `gen:api`, fix the
  resulting TypeScript errors, migrate call sites. Those errors are the safety net.
- CI installs (with `PACKAGE_TOKEN`), runs `gen:api`, and fails if
  `src/api/generated/` is stale versus the pinned version, then type-checks.

**In-progress migration.** The 19 modules in `src/api/` and the types in `src/api/types.ts`
predate the contract and are still hand-written. They are being re-typed against
`generated/` module by module. Rules while that is underway:

- New API calls use the generated types. Do not add to `types.ts`.
- When you touch a module in `src/api/`, re-type it against `generated/` rather than
  extending the hand-written shape.
- `types.ts` is deleted when its last importer is migrated — not before.

---

## 4. Conventions

- TypeScript strict; new API shapes only from `generated/`, no `any` at the boundary.
- Server state via a query layer over the generated client; local UI state via React state.
- `src/lib/formatters.ts` is the only money/date formatting point.
- AI surfaces degrade gracefully on no-key / 429 with a friendly message.
- Env via `import.meta.env`; validate required vars at startup.

---

## 5. Definition of done

1. `npm run typecheck`, `npm run lint`, and `npm run test:run` pass.
2. Generated client matches the pinned contract (CI regen clean).
3. No new hand-written API types outside `generated/`.
4. No float money, no naive dates, no client-side business logic, no provider key.

---

## 6. Working agreement

**Do without asking:** build UI, add feature components and query hooks, add tests,
regenerate against a new pinned contract version, re-type an existing `src/api/` module
against `generated/`.

**Ask first:** bumping the pinned contract version across a breaking change, adding a
dependency, moving backend computation into the client, changing the auth flow.

**Never do:** hand-edit `generated/`, compute business values client-side, float math
on money, ship any non-public key, hardcode `₱` formatting outside `formatters.ts`,
generate from a live URL instead of the pinned package.

---

## 7. Commands

```bash
npm install            # needs PACKAGE_TOKEN for the private contract package
npm run gen:api        # openapi-typescript from the pinned contract -> src/api/generated
npm run dev            # Vite :5173
npm run typecheck
npm run test:run
npm run build
```
