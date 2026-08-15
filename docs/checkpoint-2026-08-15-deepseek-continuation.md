# Checkpoint - DeepSeek v4 Flash 0731 (OpenRouter) Continuation

Date: 2026-08-15
Prior implementation agent: Codex 5.6 Sol Medium (Apex Gauntlet Part 2)
Continuing agent: **DeepSeek v4 Flash 0731 from OpenRouter**
Plan: `docs/apex-part-1-audit-and-implementation-plan-2026-08-12.md`
Prior gauntlet state: `docs/apex-part-2-gauntlet-state-2026-08-13.md`
Working branch: `codex/apex-flash-continuation` (from `origin/main` `9967263`)

## Purpose

Record that DeepSeek v4 Flash 0731 (OpenRouter) is continuing the Apex
implementation program originally meant for Codex 5.6 Sol Medium. The previous
agent completed Gauntlet units 1-9 (production accepted except unit 9, which is
code-accepted with production evidence pending) and reverted the unaccepted
AI-01 rollout. This checkpoint binds the continuation to the same Part 1
invariants and the same Gauntlet loop so evidence stays comparable.

## Binding execution rules (unchanged from Part 2)

1. Execute one reviewable Gauntlet unit at a time: targeted verification ->
   test-first implementation where code changes -> focused
   verification/measurement -> independent critic -> KEEP, REVISE, or REVERT.
2. Preserve the Part 1 invariants and do-not-touch list. A plan item is not
   permission for broad refactoring.
3. If implementation evidence reveals that a core planning assumption is
   false, record the contradiction, evidence, affected plan sections, and
   smallest viable alternatives. Deviate autonomously only when the correction
   is local and does not alter architecture, contracts, invariants, or scope.
4. Do not claim production, data, billing, secret, or provider evidence that
   was not directly observed.
5. Keep unrelated pre-existing changes in the primary checkout untouched.
6. The AI-01 model ladder remains **deferred** pending an unchanged
   production-contract corpus, account neuron evidence, and a safe
   non-production harness (Part 2 C-04, review date 2026-08-14). This
   continuation does not reopen or complete that rollout.

## State handed over

- Unit 1 OPS-01: PR #56 merged `7616f80`; release run `31687601151` green.
- Unit 2 COR-01: PR #58 merged `9930634`; production search verified.
- Unit 3 AI-01: REVERTED (`489b027`); deferred pending evidence.
- Unit 4 SEC-01: PR #60 merged `f7bf8e0`.
- Unit 5 REL-05: PR #62 merged `edf879e`.
- Unit 6 DATA-01: PR #63 merged `fbb7318`.
- Unit 7 REL-02: PR #64 merged `458b2ec`.
- Unit 8 REL-01/OPS-03: PR #65 merged `7943cb1`.
- Unit 9 REL-03: code accepted on `codex/apex-gauntlet`; production evidence
  pending; main got the equivalent via #68 (`63e1898`).

## Units remaining in this continuation

| Unit | Finding | Scope | Status |
| --- | --- | --- | --- |
| 10 | REL-04 | Sweep counters after durable writes; budget fail-closed when quota state unavailable | **COMPLETED** |
| 11 | REL-06 | Aggregate conditional/ATS/rotation state-write failures into durable diagnostics | **COMPLETED** |
| 12 | OPS-02 | Hunter lock-held/backlog handling truthful; no lease redesign | **COMPLETED** |
| 13 | AI-02 | Skeptic metrics/tests first (safe slice) — added `skepticUnavailable` tracking to sweep stats | **COMPLETED (safe slice)** |
| 14 | DATA-04 | Caller inventory and read-only cohort archive; no mutation without policy | *Evidence-gated* |
| 15 | DATA-02 | Homepage company count uses directory visibility predicate | **COMPLETED** |
| 16 | SEC-02 | Measure external response sizes before choosing ceilings (measurement gate) | *Measurement-gated* |
| 17a-c | COMP-01 | Durable per-source robots observe evidence (additive migration first) | *Deferred (requires deployment)* |
| 18 | DATA-03 | Read-only source-stratified stale/unseen/duplicate report | *Remote D1 access required* |
| 19 | REL-07 | Sweep recovery/current status recorded; stop repeating stale warnings | **COMPLETED** |
| 20 | PERF-01/02 | Origin/result-byte measurement before projections/concurrency | *Measurement-gated* |
| 21 | DEP-01 | Reviewed expiring dependency exceptions + scheduled reporting | **COMPLETED** |

## Continuation baseline

- Branch created from `origin/main` `9967263` (2026-08-15).  
- Primary checkout still carries the pre-existing dirty/generated files
  (`apps/web/.astro/*`, `.claude/`, `graphify-out/`); they are not part of any
  implementation commit.
- Verification commands: `bun run test`, `bun run typecheck`, `bun run build`.

## Completed units (this session)

1. **Unit 15 (DATA-02)**: Homepage "Vetted companies" count now uses directory
   visibility predicate (`hires_filipinos = 1 AND link_fail_count < 3`).
   Extracted shared `directoryVisibilityFilters()` to prevent future drift.
   Tests: 2 new.

2. **Unit 10 (REL-04)**: Sweep counters (`retriaged`, `deactivated`, `upgraded`)
   now increment only after durable D1 writes. Quota read failure returns zero
   sweep work (fail-closed). Quota write failure surfaced in stats as
   `quotaUnavailable`. Tests: 4 new.

3. **Unit 11 (REL-06)**: `recordSourceFetchState` now returns `{ ok, error }`.
   `recordConditionalSourceStates` aggregates failures and surfaces them as
   `stateWriteOk`, `stateWriteFailed`, `stateWriteErrors` in all three response
   paths (idle, dedup, busy).

4. **Unit 12 (OPS-02)**: Lock-held scrape response now includes
   `backlogRemaining: 1` and `lockState: "held"` so Hunter's
   `backlogRemaining // 0` cannot silently default to completion. Hunter
   workflow checks `lockState` before reading backlog. Added `runDurationMs`
   telemetry to scrape response.

5. **Unit 19 (REL-07)**: Sweep diag row now receives a null-error "recovered"
   stamp after a failure-free sweep completes, so Sentinel can distinguish a
   fresh outage from a historical one.

6. **Unit 21 (DEP-01)**: Created `docs/decisions/DEP-01-dependency-exceptions.md`
   with documented path-based exception analysis for all 10 advisory findings.
   Added dependency exception doc existence check to CI guardrail.

7. **Unit 13 (AI-02, safe slice)**: Added `skepticUnavailable` counter to
   `UnclearSweepStats`. The sweep counts single-vote upgrades (skeptic
   unavailable) and exposes them as `unclearSkepticUnavailable` in all response
   paths.

## Units deferred (evidence- or owner-gated)

- **Unit 3 (AI-01)**: Deferred pending account neuron quota reset and
   production-contract corpus (Part 2 C-04, review date 2026-08-14).
- **Unit 13 (AI-02)**: Full skeptic policy (defer single-vote gate-unknown)
   requires explicit owner decision and independent critic. Safe metrics slice
   completed.
- **Unit 14 (DATA-04)**: Requires caller inventory and owner policy decision.
   No mutation before that.
- **Unit 16 (SEC-02)**: Requires measurement of external response sizes before
   choosing limits.
- **Unit 17 (COMP-01)**: Requires deployment of migration first.
- **Unit 18 (DATA-03)**: Requires remote D1 access (currently error 7403).
- **Unit 20 (PERF-01/02)**: Requires production timing measurements.

## Final verification

- Tests: **367 pass**, 0 fail, 945 expectations (was 361 baseline).
- Typecheck: exit 0.
- Build: exit 0.
- Guardrail tests: 12 pass, 0 fail.

## Stop conditions reminder (Part 1 section L)

Keep the loop truthful: no silent green, no unmeasured SLA, no bulk mutation,
no speculative index, no platform redesign.