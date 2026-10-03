# Current resume pointer

Updated 2026-10-04 for v6.2 shift (session 3). This is navigation and dated evidence,
not policy, a runtime health report or a dispatch command.

Read the newest applicable entries in [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md).
The latest checkpoint is "MATH-05 Metric Cohort Separation Fixtures Added + MATH-09 Identity Fixtures: ASHBY_CONTENT_HASH Removed, fingerprint_hash Gap Pinned."
Both MATH-05 (21 tests) and MATH-09 (30 tests) pass; full suite 1,821 pass; audits clean.
MATH-05 register state: OPEN (fixtures added, VERIFIED_CODE).
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

**Next single action:** MATH-12 stage-aware replay fixtures (`scripts/diagnostics/extract-shadow-dispatch-evidence.test.ts`) → SSAE-00 profile contract doc (`docs/audits/2026-10-04-SSAE-00-PROFILE-CONTRACT.md`) per tech lead foundation wave. Owner/controller: maintainer; trigger: next authorized session.

The former long pointer's historical entries remain in SYSTEM_SAVEPOINT and
Git at `a176bb5d881eb7314222f534a7d1f63f02691987`; they are not competing
current NEXT instructions.
