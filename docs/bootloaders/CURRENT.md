# Current resume pointer

Updated 2026-10-04 for v6.2 shift (session 11). This is navigation and dated evidence,
not policy, a runtime health report or a dispatch command.

Read the newest applicable entries in [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md).
The latest checkpoint is "SSAE-02 Compact Source Memory Contract Delivered (session 11)."
SSAE-02 (PROPOSED, VERIFIED_CODE, no runtime change) complete — contract created at docs/audits/2026-10-04-SSAE-02-COMPACT-SOURCE-MEMORY.md.
SSAE-01 (PROPOSED, VERIFIED_CODE, no runtime change) complete — dataset card created at docs/audits/2026-10-04-SSAE-01-ATTENTION-DATASET-CARD.md.
SSAE-00 (PROPOSED, VERIFIED_CODE, no runtime change) complete.
MATH-06A (OPEN, evidence only, VERIFIED_CODE) complete — inventory fixed against HEAD `b6736aeecec8`, 42 tests pass.
MATH-12 (24 tests) passes; full suite 1,849 pass; audits clean.
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

**Next single action:** SSAE-03 (Implement a pure read-only source ranker) depends on SSAE-02 SourceMemoryRecord schema and replay_coverage matrix. Owner/controller: maintainer; trigger: next authorized mathematical maintenance task.

The former long pointer's historical entries remain in SYSTEM_SAVEPOINT and
Git at `a176bb5d881eb7314222f534a7d1f63f02691987`; they are not competing
current NEXT instructions.