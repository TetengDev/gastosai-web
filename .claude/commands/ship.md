---
description: Gate, open the PR, and put it through an independent review loop until it is production ready.
---

# /ship — gastosai-web

Take the current branch from "I think this is done" to a PR a human can merge.

**Linear issue: $ARGUMENTS** (e.g. `TEN-133`). **Required.** Resolve it before anything else; if
no key was given, or it does not resolve to an issue in the *GastosAI* project, stop immediately:

> `/ship requires a tracked Linear issue. No PR will be opened.`

Do not infer it from the branch name, do not guess from the diff, and never open the PR intending
to link it afterwards. The `Owns` block, the acceptance criteria and the review's scope all come
from the issue — without it the reviewer is judging the change only against itself.

**Full rules: `../docs/ship-loop.md`.** Read it. What follows is only the part
specific to this repo.

## Per pass

1. **Gate** — run the `pre-pr` agent. Red gate: fix, restart the pass, do not review.
2. **Publish** — `gh pr create` (or push to the existing PR), then:
   `python3 ../scripts/attach_evidence.py <ISSUE> <file> --caption "..." --pr <n> --repo gastosai-web`
   to link the PR and attach evidence. Move the issue to `In Review`.
3. **Review** — run the `pr-reviewer` agent **and** the `security-reviewer` agent, both with the
   PR number and the issue key. Independent passes over the same diff; neither sees the other's
   output. `security-reviewer` runs on every PR — there is no low-risk exemption for it.
4. **Audit** — run the `pr-review-auditor` agent with **both** finding lists and the PR number.
   **Low-risk changes skip this step**; medium and high always run it. Risk levels and the
   critical-domain list: `../docs/ship-loop.md`. When in doubt, take the higher level.
5. **Decide** — `APPROVE` stops the loop. Otherwise fix the upheld findings and start a new pass.

**Three passes**, and only for high-risk work or while valid blocking findings remain. A fourth is
never allowed — publish what was found and say it did not converge.

## What this repo's gates mean in practice

- **Evidence is a recording or a screenshot**, not a passing suite. `npm run e2e:demo` records a
  narrated walkthrough into `test-results-demo/`; attach that clip to the issue for any
  user-visible change.
- **Never hand-edit `src/api/generated/`.** If the contract pin moved, run `npm run gen:api` and
  commit the output in the same PR.
- **New API calls use generated types.** Do not add to `src/api/types.ts` — it is being retired,
  and adding to it moves the finish line backwards.
- No `any`. No float arithmetic on money. All `₱` formatting through `src/lib/formatters.ts`.
- The suite must pass on Node 20, which is what CI pins. If you are on Node 26 and six tests fail
  on `localStorage`, that is the known environment artifact — not a reason to change the tests.

## Publish the record

Post the findings-and-resolutions history — every pass, including rejected findings and why — as
both a PR comment and a Linear comment. "Addressed review feedback" is not a record.

Then stop. **Do not merge.** A human does that.
