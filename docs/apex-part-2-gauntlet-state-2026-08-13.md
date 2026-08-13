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
| 2 | COR-01 FTS row/card contract | Production accepted | REVISE -> KEEP | Replaced `SELECT o.*` with a bound, shared FTS query that projects the 11-field `OpportunityCardData` contract. The first source-text regression test was rejected by the critic. The revised in-memory SQLite FTS5 fixture executes the production query, proves active/category/type/platform filters, BM25 order, all camelCase fields, both internal and encoded external links, and no `url=undefined`; final critic: KEEP. PR #58 merged as `9930634`; release run `31688576077` passed validation, build, migrations, FTS, and Pages deploy. Live `assistant` and `developer` searches each rendered 30 cards with zero undefined URLs and both internal/external link paths. |
| 3 | AI-01 active model ladder | Implemented; critic and live evaluation pending | Pending | Current Cloudflare primary sources confirm the three old fallback IDs were deprecated on 2026-05-30, while `llama-3.1-8b-instruct-fast` and `llama-3.3-70b-instruct-fp8-fast` remain active and support JSON mode. Runtime and workflow ladders now use only those IDs; capability membership controls `response_format`; per-attempt model/depth/latency/outcome/token usage is emitted; CI rejects retired workflow IDs. A 12-case PH-geo corpus (4 positive, 6 hard-negative, 2 unclear) was frozen before rollout. Mocked malformed/quota/all-fail behavior remains fail-closed. Full suite: 335 pass, 0 fail; typecheck, guardrail audit, and build pass. Production before the change recorded `triageAiUnavailable=50`; corpus quality and dashboard neuron delta remain explicit live gates. |

AI-01 primary sources checked on 2026-08-13:

- <https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/>
- <https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/>
- <https://developers.cloudflare.com/workers-ai/features/json-mode/>
- <https://developers.cloudflare.com/workers-ai/platform/pricing/>

## Plan contradictions

### C-01 - Native `MessageChannel` support does not cover Pages publish-time validation

- **False assumption:** Part 1 and commit `805a43b` treated the bundle polyfill as dead because the configured Workers compatibility date provides `MessageChannel` at request runtime.
- **Contradicting evidence:** release run `31686932747` successfully built, applied migration 0030, and passed FTS integrity, then `wrangler pages deploy` rejected the Function with `ReferenceError: MessageChannel is not defined` while evaluating React DOM Server in `_@astro-renderers_*.mjs`.
- **Affected plan sections:** OPS-01 release evidence/acceptance, the do-not-touch dependency line, and Unit 1's assumption that the existing branch could deploy without a release correction.
- **Boundary:** this is a Pages publish-time module-evaluation compatibility defect, not evidence for a platform redesign.
- **Smallest alternatives:** (A) restore a bundle-first conditional shim before React's module evaluation and add an artifact guard; (B) change the rendering/dependency line, which is larger and violates the preservation rule. Proceed with A only after a failing regression test.

### C-02 - A usable current-model quality baseline is not presently evidenced

- **False assumption:** AI-01 assumed the current 3.3-70B path could serve as a live quality baseline while retired fallbacks were replaced.
- **Contradicting evidence:** the first durable production heartbeat after Unit 1 reported `triageAiUnavailable=50`; no production model-attempt trace, frozen-corpus output, or account neuron delta predates the change. This means the existing runtime cannot yet be treated as a measured usable baseline.
- **Affected plan sections:** AI-01 baseline comparison, Unit 3's corpus precision/recall gate, staging/manual pulse telemetry requirement, and cost/neuron acceptance.
- **Boundary:** active model IDs and response handling can be corrected locally, but model-quality acceptance and account-level cost evidence cannot be inferred from mocks or configuration.
- **Smallest alternatives:** (A) run the frozen corpus in an isolated authenticated evaluation against the active 70B and replacement 8B models, archive per-case outputs/latency/usage and the dashboard neuron delta, then decide rollout; (B) keep AI-01 unmerged/deferred with an explicit owner and review date. Do not deploy solely because conformance tests pass.

### C-03 - Retired model IDs are not the only cause of production AI unavailability

- **False assumption:** AI-01 could be read as if replacing retired fallback IDs would by itself restore the production AI path.
- **Contradicting evidence:** Sentinel run `31688782482` reported both `triageAiUnavailable=50` and a sweep diagnostic of `Too many subrequests by single Worker invocation`. The latter is an independent platform-limit failure that a model-ladder change cannot correct.
- **Affected plan sections:** AI-01's production acceptance claim and REL-04's sweep reliability/cap work. Any claim that Unit 3 alone resolves the observed AI degradation is invalid.
- **Boundary:** model IDs, response normalization, fail-closed behavior, and attempt telemetry are local AI-01 corrections. Changing sweep batching, invocation topology, or persistence alters runtime behavior and belongs to REL-04 or a separately approved architecture decision.
- **Smallest alternatives:** (A) accept AI-01 only for demonstrated model compatibility and quality, explicitly carrying the subrequest failure into REL-04; (B) defer AI-01 production rollout if the two failure modes cannot be independently measured. Do not silently redesign the sweep in Unit 3.

## Rejected or reverted changes

None recorded yet.

## Intentionally retained

- Existing Astro/Cloudflare Pages/D1 architecture and migration-first release path.
- Pre-existing dirty/generated files in the primary checkout.
