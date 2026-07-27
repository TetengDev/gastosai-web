# Pre-PR quality checklist — gastosai-web

Run this **before** pushing a branch or opening a pull request. Every item marked **Blocker**
must pass first.

Ported from the monorepo's `ai/skills/shared/pre-pr-checklist.md`. Adapted for the polyrepo:
the backend half is gone, `CHANGELOG.md` was dropped in the split, commands are POSIX, and the
contract drift guard is new — it did not exist when the spec was a shared file.
**Section 6 (execution testing) is unchanged — it is the part that matters most and the part
most often skipped.**

---

## 1. Static analysis

```bash
npm run lint          # 0 errors
npm run typecheck     # tsc -b, both project references
```

**Blocker:** any ESLint error or type error.

Rules worth watching: `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`,
`@typescript-eslint/no-explicit-any` (use `unknown` for caught errors),
`@typescript-eslint/no-unused-vars`.

---

## 2. Tests

```bash
npm run test:run
npm run test:coverage   # when the change is non-trivial
```

**Blocker:** any failing test.

**Warning:** line coverage below 70% — note it in the PR and add a follow-up.

> Six tests fail on **Node 26** because its native experimental `localStorage` displaces jsdom's.
> CI pins Node 20, where all pass. See `KNOWN-GAPS.md` — do not "fix" them by weakening the tests.

---

## 3. The pinned contract

This repo **consumes** `@tetengdev/gastosai-api-contract` at an exact version.

```bash
npm run gen:api
git status --porcelain src/api/generated    # must be empty
```

**Blocker:** a stale or uncommitted generated client. Note `--porcelain`, not `git diff`: a
never-committed `src/api/generated/` is untracked and `git diff` ignores it, so the guard would
pass without checking anything.

Never hand-edit `src/api/generated/`. Never add a request/response type outside it.

---

## 4. No secrets

```bash
git status --porcelain
git diff --staged
```

**Blocker:** any `.env`, API key, token or password staged. Everything in this repo ships to the
browser — there is no such thing as a secret here.

---

## 5. Version bump

**Blocker if application code changed.** Once per PR, based on the highest-impact change:

| Commit type | Bump |
|---|---|
| `fix:`, `perf:` | PATCH |
| `feat:` | MINOR |
| `!` or `BREAKING CHANGE:` | MAJOR |
| `docs:`, `chore:`, `ci:`, `refactor:`, `test:` | none |

The version lives in `package.json`.

---

## 6. Mandatory execution testing — no exceptions

**Every change must actually be run before the PR opens.** A green test suite, a clean lint and a
passing type-check are not sufficient — the code must execute in a browser.

Minimum: **≥ 90% of touched paths exercised at runtime.**

| Change type | Minimum execution required |
|---|---|
| UI change | Start the full stack, open the browser, click through the affected flow **and at least one edge case** (empty, error, or validation) |
| API call site | Trigger it and confirm the response renders, not just that it 200s |
| Build/config change | `npm run build`, then preview the built output — dev-server-only verification does not count |
| Dependency change | Start the app; confirm nothing regressed at runtime, not only that it installs |

**Blocker:** application code changed with no runtime evidence. State in the PR body what you ran
and what you observed. "Tests pass" is not an answer to this item.

Smoke test: golden path → one edge case → glance at adjacent features for regressions.

---

## 7. Branch and scope

```bash
git branch --show-current      # must not be main
git diff main...HEAD --stat
```

Lanes are enforced by CI (`Validate release branch`):

- `release/*` — application changes and version bumps
- `meta/*` — docs, CI, tooling. **Must not touch `src/` or change the version.**
- `dependabot/*` — dependency updates

---

## Summary

```
[ ] npm run lint             — 0 errors
[ ] npm run typecheck        — clean
[ ] npm run test:run         — green (Node 20)
[ ] src/api/generated        — regenerated, committed, clean
[ ] No secrets staged
[ ] Version bumped (if app code changed)
[ ] EXECUTED in a browser    — golden path + one edge case, evidence in the PR body
[ ] On a correct branch lane
```
