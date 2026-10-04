# MATH Wave 2 characterization: MATH-02, MATH-10, MATH-13

**Date:** 2026-10-04. **Status:** PROPOSED evidence slice. **Register state:** MATH-02,
MATH-10 and MATH-13 all stay **OPEN**. Nothing here is accepted, deployed, observed
or rolled out.

**Code:** `scripts/lake/math-wave2-characterization.test.ts` (28 tests, 245 assertions).
This document describes those tests; it does not implement, accept or certify
anything, and completing it moves no MATH card.

## Why this slice

The mathematical strategy places MATH-02 (queues), MATH-10 (change detection) and
MATH-13 (profiling) in the same **Processing** wave and states their live
constraints directly:

| Card | Register constraint (2026-09-27 plan, unchanged) | What this slice adds |
| --- | --- | --- |
| MATH-02 | "pure helpers; live telemetry unverified" | Behavioral characterization of the helpers and of the one real bounded-admission control that exists |
| MATH-10 | "invalidation coverage unverified" | The invalidation ladder, exercised branch by branch, plus two reproducible findings |
| MATH-13 | "comparable profile required" | The algebra of the Amdahl bound over a declared workload, and the stage/byte accounting contracts |

SSAE cards supply the supporting contracts (see the mapping below). The Source
Perpetuity plan remains the sole executable source queue; this is not a second queue
and creates no accepted MATH-14.

## What is characterized, and what is NOT

**Characterized (VERIFIED_LOCAL, this SHA only):** the deterministic behavior of
existing pure functions in `scripts/ci/queue-metrics.ts`,
`scripts/lake/candidate-pool.ts`, `packages/scraper/contentHash.ts`,
`packages/scraper/conditional.ts`, `apps/web/src/lib/conditional-state.ts`,
`scripts/lake/source-ranker.ts` and `scripts/lake/measurement-contracts.ts`.

**Not characterized, and explicitly UNKNOWN:**

- Live arrival, service and residence telemetry for MATH-02. No test here reads D1
  or Turso. `auditQueueInstrumentation()` says so in its own warnings, and this slice
  does not contradict it.
- A production stage profile for MATH-13. `SYNTHETIC_STAGE_MS` is a **declared
  fixture**, not a measurement. The repository has no profiler and no populated
  stage-latency telemetry, so the MATH-13 baseline remains UNKNOWN.
- Any publication, freshness, cost or latency effect. Nothing in this slice touches a
  writer, a clock, a gateway or a parameter.

## Mapping to SSAE cards

| Challenge | SSAE cards that own the supporting contract | Relationship |
| --- | --- | --- |
| MATH-02 queue capacity and backpressure | SSAE-06 (measurement contracts), SSAE-08 (bounded pool), SSAE-10 (allocator), SSAE-12 (optional host sharding) | The characterized `boundedRebuildTick` / `dueWork` truncation are SSAE-08's bounded-work accounting; SSAE-06 owns the missing telemetry that would turn this from characterization into a baseline |
| MATH-10 change detection and invalidation | SSAE-02 (state/dependency contract), SSAE-07 (processing modes and cache validity), SSAE-09 (field-sensitive delta and exact bounded replay) | `selectProcessingMode` in `source-ranker.ts` is the **pre-SSAE-07** form of the mode ladder. SSAE-07 is still in PR #169 and SSAE-09 is gated on it (`02 + 07 -> 09`), so neither can be built on from `main` yet |
| MATH-13 profiling and Amdahl | SSAE-00 (profile end-to-end costs), SSAE-06C/06D (stage latency and byte accounting), SSAE-12 (optional sharding) | SSAE-00's deliverable is the comparable profile that does not yet exist. The byte/latency validators characterized here are the contracts that profile would populate |

## Two reproducible findings

Both are asserted as **current behavior** with the consequence named. Neither is
patched here; each needs its own authorized unit.

### F-W2-1 — a changed material digest does not invalidate a cached mode (MATH-10)

`selectProcessingMode(record, versions)` reads `record.version_deps`. It never reads
`record.material_digests`. So a job whose material fields changed underneath an
unchanged `content_hash_version` is still classified `REUSE`.

The compensating control that does work today is bumping the digest implementation
version, which maps to `IDENTITY` and yields `BOUNDED_REPLAY`. That is a
process-version signal, not a content signal, so it cannot detect a change made by
the source rather than by a deploy.

This is precisely the SSAE strategy's requirement that "a same URL, fingerprint, ID
set, body hash or 304 cannot alone justify cached qualification", and precisely the
MATH-10 "invalidation coverage unverified" gap. **SSAE-09 owns the fix and is
blocked on PR #169.** Recorded, not worked around.

### F-W2-2 — `toContentHash` does not encode the title/URL split point (MATH-10)

`toContentHash(t, u)` hashes `` `${t}::${u}` `` with no length prefix and no
component validation. It is therefore injective only under the assumption that the
title contains no `::`. `toContentHash("A", "B::C")` and `toContentHash("A::B", "C")`
are the same digest.

Bounded consequence, verified by exhaustive enumeration over the split points: when
**both** second components are well-formed absolute `http(s)` URLs the alias has no
second preimage, because `::` cannot occur inside such a URL and the scheme anchors
the split. The exposure is limited to callers that put a non-canonical string in
either slot.

Not fixed here. Primary dedup is the `UNIQUE source_url` column, and changing this
hash is a schema-visible behavior change that also moves `content_hash_version`.

### Also recorded, lower severity

- `SourceFetchByteStats.avg_bytes_per_full_fetch` divides **total** bytes by **full**
  fetches. A 304 that still carries a body inflates it, so the field is an upper
  bound, not a per-full-fetch average.
- `queueStability` requires service **strictly** above arrival. A controller admitting
  work at exactly the service rate is `UNSTABLE`; bounded admission needs headroom.
- `littlesLaw` abstains when the interarrival CV is unknown even when `lambda * W` is
  computable. That is correct and is asserted as such.

## Preconditions this slice confirmed

- Bounded epochs are real: `DEFAULT_POOL_CONFIG` admits 200 of 5000 (4%) due work and
  rebuilds 250 of 5000 (5%) per epoch, and a 300-entry population needs exactly 12
  bounded ticks to complete one sweep. Those ratios are asserted, so a future default
  edit cannot silently turn a bounded epoch into a full rescan.
- Dormancy is never deletion: cold entries keep an explicit revisit due date and stay
  in the population.
- Validators are cleared whenever not every item reached a durable terminal outcome,
  so a changed feed cannot be 304-ed into a lost item.
- `validateFetchByteLog` refuses a `not_modified` claim that no conditional request or
  304 status supports, which is what stops a fabricated hit from inflating
  `cache_hit_rate`.
- `checkMeasurementContractMaturity` treats zero coverage as immature and names the
  missing contracts; the mature branch is deliberately not exercised, because live
  coverage is UNKNOWN from a read-only sandbox.

## What this slice does NOT do

It resolves no MATH card. It adds no gate, threshold or accepted parameter. It does
not lower the Wilson or sample floors, the Jev confidence floor or any quality
ceiling. It does not widen `BASE_AUTHORIZED_SOURCE_IDS`, does not touch the
publication gateway, and does not grant or simulate any publication authority. It
makes no runtime, cadence or SLO claim: the hourly GCP publisher and the three
shadow-dispatch clocks are unchanged and were not re-measured.

## Next

SSAE-09 remains the dependency-ordered next step, and it starts when SSAE-07
(`processing-modes.ts`, PR #169) lands on `main`. F-W2-1 should be carried into that
unit's contract as an acceptance fixture rather than re-derived. A separately
authorized unit for the stale Groq default model in `packages/scraper/triage.ts`
remains open from the PR #168 review and is **not** touched here.