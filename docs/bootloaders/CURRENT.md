# Current resume pointer

Updated 2026-10-04 at the PR #168 review (shift 20261003-2357, through session 42). This is navigation and dated evidence,
not policy, a runtime health report or a dispatch command.

Read the newest applicable entries in [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md).
The latest checkpoint is "PR #168 Tech-Lead Review Fixup Before Merge". The latest shift work entry is "Session 42 v6.5 Priority Cases A-G Offline Verification" (test-only; 2115 pass / 1 skip at `a155cb1c`).
No MATH item or SSAE card is ACCEPTED: the MATH items below stay OPEN and the SSAE cards stay PROPOSED. "Complete" below means the evidence slice is committed, not that the register item is resolved.
SSAE-05 (PROPOSED, VERIFIED_CODE, no runtime change) complete — shadow decisions at scripts/lake/shadow-decisions.ts + deterministic fixtures/tests at scripts/lake/shadow-decisions.test.ts (71 tests) + compareSelectorOutputs helper + runMultiEpochShadowDecisions tests committed.
SSAE-06 (PROPOSED, VERIFIED_CODE, no runtime change) complete — measurement contracts at docs/audits/2026-10-04-SSAE-06-MEASUREMENT-CONTRACTS.md.
SSAE-04 (PROPOSED, VERIFIED_CODE, no runtime change) complete — holdout evaluation at docs/audits/2026-10-04-SSAE-04-TEMPORAL-HOLDOUTS.md + deterministic fixtures/tests at scripts/lake/temporal-holdout-eval.test.ts (24 tests).
SSAE-03 (PROPOSED, VERIFIED_CODE, no runtime change) complete — ranker created at scripts/lake/source-ranker.ts with 42 tests.
SSAE-02 (PROPOSED, VERIFIED_CODE, no runtime change) complete — contract created at docs/audits/2026-10-04-SSAE-02-COMPACT-SOURCE-MEMORY.md.
SSAE-01 (PROPOSED, VERIFIED_CODE, no runtime change) complete — dataset card created at docs/audits/2026-10-04-SSAE-01-ATTENTION-DATASET-CARD.md.
SSAE-00 (PROPOSED, VERIFIED_CODE, no runtime change) complete.
MATH-06A (OPEN, evidence only, VERIFIED_CODE) complete — inventory fixed against HEAD `b6736aeecec8`, 42 tests pass.
MATH-12 register state: OPEN (stage-aware replay fixtures, 24 tests, VERIFIED_CODE).
MATH-05 register state: OPEN (fixtures verified, import fix applied, VERIFIED_CODE).
MATH-09 register state: OPEN (ASHBY_CONTENT_HASH removed, gap fixture added, VERIFIED_CODE).

## Canonical entry points

- [Maintainer bootloader v6.1](MAINTAINER_BOOTLOADER.md): copy into a fresh session and supply TASK.
- [Master operating prompt v6.0](MASTER_OPERATING_PROMPT.md): full contract, including section 10B.
- [Execution prompt v6.0](EXECUTION_PROMPT.md): concrete task wrapper.
- [Sparse strategy](../strategies/SPARSE_SOURCE_ATTENTION_STRATEGY.md) and
  [SSAE-00..15 work cards](../plans/SPARSE_SOURCE_ATTENTION_IMPLEMENTATION_PLAN.md):
  proposed application design and supporting units.
- [Revision review](../audits/2026-10-03-SPARSE-PROMPT-REVIEW.md):
  source coverage, checks, findings and local-only completion limits.

Retain the [MATH-01..13 program](../plans/MATHEMATICAL_IMPROVEMENT_PLAN.md),
[Source Perpetuity execution queue](../plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md)
and [Global Miner overlay](../SOURCE_UNIVERSE_GLOBAL_MINER_MASTER_PROMPT.md)
within the current task's authority. A documentation/audit task does not start
operational mining. Refresh unresolved incidents, including the saved EX-03
error/observation follow-on; this revision does not declare them fixed.

**Next single action:** SSAE-07 processing modes and cache validity as a pure module plus tests, or Wave 2 characterization of MATH-02, MATH-10 and MATH-13 (session 42 NEXT). SSAE-06 mature labels stay blocked until live labels exist. Also open a separately authorised unit for the stale Groq default model in `triage.ts` (see the PR #168 review entry). Owner/controller: maintainer. Trigger: reviewer picks the next slice.

The former long pointer's historical entries remain in SYSTEM_SAVEPOINT and
Git at `a176bb5d881eb7314222f534a7d1f63f02691987`; they are not competing
current NEXT instructions.
