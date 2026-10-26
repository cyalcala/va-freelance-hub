> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

# Autonomous improvement checkpoint — 2026-10-18

Status: verified local/source correction checkpoint; continuous mission active.
No production deployment, migration, new source admission, completed MATH card
or certified daily publication target is claimed.

## Source changes and protected behavior

| Commit | Correction | Evidence / practical limit |
| --- | --- | --- |
| `59af2077b14c241adf9c834e73e5f1fcdc431b7a` | Missing source-yield measurements stay UNKNOWN; stored-only sources stay visible | Fixed live aggregate input: 64 -> 65 source rows; ten reconciliation deltas zero; no SQL/selection change |
| `69202e3f63a1162db18510dceec9dc41a94f0f54` | Removed employer catalog -> verified PH fallback | All twelve inspected non-test callers omit employer identity, so their behavior is preserved; explicit posting geography still decides |
| `c2012698a5f4158f0658de1487ff2f1364eff003` | Removed inferred publication, health and recall from the unused tracker | Empty tracker no longer fabricates20/20 published; explicit source/id observations deduplicate retries; incomplete cohort stays UNKNOWN |

The employer catalog had narrative labels and aliases without dated evidence,
exact source binding or role applicability. Counterexamples included an unrelated
tenant named Athena, another ATS reusing a token, unrecognized Canada restrictions,
and restrictions beyond the text limit. Removing its inference does not remove
an actual scoped employer-evidence system; that system remains to be proven.
Employer confidence, job validity, PH eligibility and role relevance stay distinct.

PipelineLossTracker is an unused helper, not live thirteen-stage observability.
Its published totals previously equaled expected openings minus loss-event count,
and health used an arbitrary50% ratio. Those inferences, substring/company-name
attribution, and unsupported recall division are removed. Observed receipt
counts are a lower bound, not complete current-cohort publication counts.

## Verification

All source files were frozen before the combined final verification:

- `bun run test`: **4499 pass,0 fail,331630 assertions,269 files,415.62s**.
- `bun run typecheck`: exit0.
- `bun run build`: exit0,74.10s.
- Production guardrails, accepted-parameter parity, constitution audit and
  orchestrator modification audit: all exit0. Existing provisional/missing-proof
  warnings remain; passing these audits does not accept MATH requirements.
- Current-only economics/snapshot tests46/0/132; combined employer/tracker and
  simulated integration tests209/0/1618.
- Independent reviews approve all three corrections. Separate independent
  geo/triage/freshness tests129/0/319 and tracker/e2e tests84/0/429 passed.
- Before-edit full baseline4469/0/331551,268 files. New adversarial cases first
  reproduced the source defects. Tests with simulated job counts are labelled
  as such; they do not certify real employer recall.

Rollback is per behavioral commit. Source/context changes are separate from
the future production release; no runtime rollback was needed for these edits.

## Actual system baseline and uncertainty

[Safe bounded runtime projection](../evidence/AUTONOMOUS_IMPROVEMENT_2026-10-18/observed-runtime-baseline.json)
preserves already-completed read-only GCP, Pages, D1 and Turso observations without
querying again. It records individual observation times and limits.

Pages is still deployment8c649da0/source34e3bd1e/schema0054. Seven admitted
Workables each have zero attempts/133rotation skips in24h. Complete October11–17
current-eligible storage proxy is35.4/day; certified first-publication throughput,
true PH false-negative rate, trusted-employer recall and complete latency are
UNKNOWN. Ledger report counts and retained ID counts disagree. The economics
capture's rolling-seven-day proxy37.29/day has a different time boundary.

GCP two hourly jobs succeed but sampled publisher receipts synced zero. Its
image label is October4 source, not the inspected checkout. Source and deployment
are not interchangeable. The old cache incident is not the main current task.

## Repository preservation and NEXT

The [repository audit](REPOSITORY_PARITY_2026-10-18.md) found27 GitHub-only bot
report descendants; root preserved them by fast-forward in SSM and GitLab.
Whole-ref and unattended mirror parity remain distinct from checkpoint equality.
No force, deletion, credential export or new grant was used. Source corrections
are on `codex/verified-flow-directory-checkpoint`; main is not advanced with
runtime code merely to back it up. Its GitHub workflow would apply pending
migrations and deploy the entire source tree.

NEXT is an isolated0054-compatible Workable selection/fair-intake release with
necessary original-date protection. A fresh immutable extraction of live source
reproduced two failures: registry-only starvation and stale PH publication.
The candidate's first native run passes11tests/104assertions, using real-shaped
widget responses through the parser, route and nativeSQLite/FTS public predicate.
It preserves caps/robots/negative geography/onsite/date guards and retry dedup.
These are initial candidate results; broader exact-source verification and
independent review remain pending, and **no deployment is accepted yet**.
The unchanged old gateway's empty ledger-ID receipts remain a material limit.

Independent native review subsequently found two release blockers that the
initial 11 tests did not cover: an existing inactive PH-verified row was revived
for a current onsite Workable posting, and an existing row with a 2020 original
date was revived when the current widget date was fresh. Both use the URL-only
reactivation path before new-item geo/date checks. Their regression cases and
Workable-scoped reactivation repair are required before acceptance. The retained
broader candidate run has 3103 passing tests and one snapshot failure-injection
timeout at 5000ms; it is not a green full-suite result.

The archived prior Astra SHA256 is
`f049f4d0540e30e7876c1dcbdf4594c84c9c569996f642e8e913840e9da6f5ff`.
The safe runtime baseline projection SHA256 is
`659378e91afd2065a50d2638f763739edc45dcf8512a15769d67005ae553da20`.
The committed economics input hash was checked against its comparison manifest;
the evidence directory preserves its bytes through Git.

Continue from [Astra](../../astra777.txt) and [SYSTEM_SAVEPOINT](../SYSTEM_SAVEPOINT.md).
The previous conflicting Astra is preserved byte-for-byte in
`docs/audits/ASTRA777_BEFORE_RECONCILIATION_2026-10-18.md`.
