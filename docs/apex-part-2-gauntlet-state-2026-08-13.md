# Part 2 - Apex Implementation Gauntlet State

Date: 2026-08-13
Plan: `docs/apex-part-1-audit-and-implementation-plan-2026-08-12.md`
Branch: `codex/apex-gauntlet`

## Binding execution rules

1. Execute one reviewable Gauntlet unit at a time: targeted verification -> test-first implementation where code changes -> focused verification/measurement -> independent critic -> KEEP, REVISE, or REVERT.
2. Preserve the Part 1 invariants and do-not-touch list. A plan item is not permission for broad refactoring.
3. If implementation evidence reveals that a core planning assumption is false, do not silently redesign the system. Record the contradiction, evidence, affected plan sections, and smallest viable alternatives. Deviate autonomously only when the correction is local and does not alter architecture, contracts, invariants, or scope.
4. Do not claim production, data, billing, secret, or provider evidence that was not directly observed.
5. Keep unrelated pre-existing changes in the primary checkout untouched.

## Baseline

- Isolated worktree created from `be7638e`.
- `bun install --frozen-lockfile`: exit 0, 864 packages installed.
- `bun run test`: 327 pass, 0 fail, 615 expectations across 36 files.
- `bun run typecheck`: exit 0.
- `bun run build`: exit 0; 1,808 client modules; server build 60.93 seconds.

## Gauntlet ledger

| Unit | Finding | State | Decision | Evidence / follow-up |
| --- | --- | --- | --- | --- |
| 1 | OPS-01 release PR #56 | Production accepted | REVISE -> KEEP | PR #56 merged as `7616f80`; run `31686932747` applied migration 0030 and passed FTS, then Pages publish failed on missing `MessageChannel`. The bounded compatibility correction merged through PR #57 as `1371bf7`; release run `31687601151` passed validation, build, migrations, FTS integrity, and Pages deploy. Production smoke returned Cloudflare 200s for seven core routes. Sentinel run `31688782482` found `INGEST_DIAG_ROWS=1`, heartbeat age `0h`, and 41 source-health rows. Its `triageAiUnavailable=50` degradation is tracked under AI-01 rather than hidden inside release acceptance. |
| 2 | COR-01 FTS row/card contract | Production accepted | REVISE -> KEEP | Replaced `SELECT o.*` with a bound, shared FTS query projecting the 11-field `OpportunityCardData` contract. The in-memory SQLite FTS5 fixture proves active/category/type/platform filters, BM25 order, all camelCase fields, internal/external links, and no `url=undefined`; final critic: KEEP. PR #58 merged as `9930634`; release run `31688576077` passed the full pipeline. Production searches for `assistant` and `developer` rendered 30 cards each with zero undefined URLs and both internal and external targets. |
| 3 | AI-01 active model ladder | Reverted from production; evidence-gated defer | REVERT | Workflow dispatch `31690030037` ran from unaccepted commit `e02fa72`. Its independent `source-health-rollup` job committed the rollup on top of that branch SHA and pushed `HEAD:main` as `56fbddd`, bypassing the intended review/defer boundary. The incomplete AI slice was therefore deployed before corpus/cost acceptance and before critic corrections. Revert commit `489b027` removes exactly `e02fa72`; AI-01 remains deferred pending an unchanged production-contract corpus, account neuron evidence, and a safe non-production harness. |
| 4 | SEC-01 click analytics | Production accepted | KEEP | Missing/unproven limiter now performs zero analytics writes; allowed, over-limit, limiter-error, and D1-error paths preserve the validated redirect; unsafe targets remain rejected before analytics. Six focused tests plus 344-test full suite, typecheck, build, and guardrail audit passed. Independent critic: KEEP. PR #60 merged as `f7bf8e0`; release run `31692363962` passed validation, migration, FTS integrity, and Pages deploy. |

## Plan contradictions

### C-01 - Native `MessageChannel` support does not cover Pages publish-time validation

- **False assumption:** Part 1 and commit `805a43b` treated the bundle polyfill as dead because the configured Workers compatibility date provides `MessageChannel` at request runtime.
- **Contradicting evidence:** release run `31686932747` successfully built, applied migration 0030, and passed FTS integrity, then `wrangler pages deploy` rejected the Function with `ReferenceError: MessageChannel is not defined` while evaluating React DOM Server in `_@astro-renderers_*.mjs`.
- **Affected plan sections:** OPS-01 release evidence/acceptance, the do-not-touch dependency line, and Unit 1's assumption that the existing branch could deploy without a release correction.
- **Boundary:** this is a Pages publish-time module-evaluation compatibility defect, not evidence for a platform redesign.
- **Smallest alternatives:** (A) restore a bundle-first conditional shim before React's module evaluation and add an artifact guard; (B) change the rendering/dependency line, which is larger and violates the preservation rule. Proceed with A only after a failing regression test.

### C-02 - A branch-dispatched reporting job can promote unreviewed code to `main`

- **False assumption:** manual Sentinel evaluation runs on `codex/apex-gauntlet` were treated as branch-scoped evidence collection and therefore unable to change the production branch.
- **Contradicting evidence:** run `31690030037` used head SHA `e02fa72`. Although the run failed overall, `source-health-rollup` committed its documentation update on top of that SHA and executed `git push origin HEAD:main`, producing main commit `56fbddd` with parent `e02fa72`. The subsequent main release deployed the incomplete, critic-rejected AI slice.
- **Affected plan sections:** AI-01's explicit live-evidence-before-rollout gate, the Gauntlet's KEEP/REVISE/REVERT boundary, release branch ownership, and the source-health reporting workflow's mutation contract.
- **Boundary:** this incident does not authorize completing or redesigning AI behavior in production. The immediate correction is to revert only the unaccepted commit and separately harden the reporting workflow so non-main dispatches cannot push code to `main`.
- **Smallest alternatives:** (A) revert `e02fa72`, then require the rollup mutation job to run only from `main` and check out/push the main ref explicitly; (B) make the rollup artifact-only on non-main refs. Apply A without altering the scheduler or data model.

## Rejected or reverted changes

- AI-01 commit `e02fa72` was promoted by a reporting workflow before acceptance and is reverted by `489b027`. The model migration remains deferred; no production-quality conclusion was inferred from its configuration or mocks.

## Intentionally retained

- Existing Astro/Cloudflare Pages/D1 architecture and migration-first release path.
- Pre-existing dirty/generated files in the primary checkout.
