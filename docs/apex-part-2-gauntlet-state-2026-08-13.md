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
| 1 | OPS-01 release PR #56 | Deploy accepted; ingestion heartbeat pending | REVISE -> provisional KEEP | PR #56 merged as `7616f80`; run `31686932747` applied migration 0030 and passed FTS, then Pages publish failed on missing `MessageChannel`. The bounded compatibility correction merged through PR #57 as `1371bf7`; release run `31687601151` passed validation, build, migrations, FTS integrity, and Pages deploy. Production smoke returned Cloudflare 200s for `/`, `/opportunities`, `/directory`, `/categories/tech`, `/data-policy`, `/privacy`, and `/sitemap.xml`. Sentinel runs `31687728070` and `31688019982` passed and queried 41 source-health rows, but no first post-deploy `__ingest_diag__` row had arrived yet. |
| 2 | COR-01 FTS row/card contract | Implemented; deploy acceptance pending | REVISE -> KEEP | Replaced `SELECT o.*` with a bound, shared FTS query that projects the 11-field `OpportunityCardData` contract. The first source-text regression test was rejected by the critic. The revised in-memory SQLite FTS5 fixture executes the production query, proves active/category/type/platform filters, BM25 order, all camelCase fields, both internal and encoded external links, and no `url=undefined`; 11 focused assertions pass. Full suite: 329 pass, 0 fail; typecheck and build pass. Final critic: KEEP. |

## Plan contradictions

### C-01 - Native `MessageChannel` support does not cover Pages publish-time validation

- **False assumption:** Part 1 and commit `805a43b` treated the bundle polyfill as dead because the configured Workers compatibility date provides `MessageChannel` at request runtime.
- **Contradicting evidence:** release run `31686932747` successfully built, applied migration 0030, and passed FTS integrity, then `wrangler pages deploy` rejected the Function with `ReferenceError: MessageChannel is not defined` while evaluating React DOM Server in `_@astro-renderers_*.mjs`.
- **Affected plan sections:** OPS-01 release evidence/acceptance, the do-not-touch dependency line, and Unit 1's assumption that the existing branch could deploy without a release correction.
- **Boundary:** this is a Pages publish-time module-evaluation compatibility defect, not evidence for a platform redesign.
- **Smallest alternatives:** (A) restore a bundle-first conditional shim before React's module evaluation and add an artifact guard; (B) change the rendering/dependency line, which is larger and violates the preservation rule. Proceed with A only after a failing regression test.

## Rejected or reverted changes

None recorded yet.

## Intentionally retained

- Existing Astro/Cloudflare Pages/D1 architecture and migration-first release path.
- Pre-existing dirty/generated files in the primary checkout.
