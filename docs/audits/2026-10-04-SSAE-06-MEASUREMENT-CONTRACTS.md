# SSAE-06 — Measurement Contracts for Per-Source Epoch Features

**Date:** 2026-10-04. **Status:** PROPOSED measurement contract.
**Dependencies:** SSAE-01 (attention dataset), SSAE-04 (temporal holdouts), SSAE-05 (shadow decisions)
**Owner:** Maintainer
**Trigger:** Next authorized mathematical maintenance task

## Purpose and Authority

SSAE-06 establishes measurement contracts to resolve LIMITED dispositions in SSAE-01 and SSAE-04 by defining specific instrumentation and audit contracts to gather missing evidence. These contracts do not implement changes but specify what measurements are required to graduate SSAE-01 and SSAE-04 from LIMITED status.

Per the [Sparse Source Attention Implementation Plan](../plans/SPARSE_SOURCE_ATTENTION_IMPLEMENTATION_PLAN.md):
- SSAE-06 may finish LIMITED with an explicit label/telemetry coverage gap, owner and measurement trigger.
- This disposition can dispatch a separately permitted, precontracted audit/instrumentation slice to obtain missing evidence.
- Successful ranker benefit is not a prerequisite for collecting labels.
- LIMITED supplies no rollout acceptance or authority to probe.

## Measurement Contracts

Based on gaps identified in SSAE-01 and SSAE-04 evaluations, the following measurement contracts are required:

### SSAE-06A: Per-source Hunter epoch ledger
**Purpose:** Track per-source fetch states to enable granular attribution and replay.
**Specification:** 
- Add per-source sub-ledger to `scrape.ts` run lock
- Emit `source_fetch_state` per source per epoch
- Refactor `acquireRunLock()` to support per-source tracking or add dedicated sub-ledger
**Evidence Required:** Timestamped fetch states per source enabling reconstruction of Hunter workflow
**Validation:** Complete per-source fetch state logs for evaluation window

### SSAE-06B: Publication cohort labels
**Purpose:** Enable cohort-based analysis of publication decisions for temporal holdouts.
**Specification:**
- Extend `source_publication_ledger` with `cohort` column (FRESH_DISCOVERY, REPLAY_RECOVERY, etc.)
- Persist `first_publication_at` per job for accurate cohort labeling
- Requires MATH-06 publication closure for verified first-publication timestamps
**Evidence Required:** Publication ledger with cohort classifications matching first-publication events
**Validation:** Ability to reconstruct FRESH_DISCOVERY cohort for holdout evaluation

### SSAE-06C: Per-stage latency instrumentation
**Purpose:** Measure bottleneck distribution across pipeline stages for optimization.
**Specification:**
- Add `performance.now()` spans to `scrape.ts` (fetch/parse/validate stages)
- Add `performance.now()` spans to `domain-ats-discovery.ts` (domain resolution stages)
- Record stage latencies per job per epoch
**Evidence Required:** Stage-level latency measurements correlated with job outcomes
**Validation:** Complete latency traces enabling bottleneck identification

### SSAE-06D: Fetch byte & conditional-fetch logging
**Purpose:** Quantify bandwidth usage and cache effectiveness for cost modeling.
**Specification:**
- Log `content-length` bytes fetched per source per epoch
- Log `notModified` (HTTP 304) responses per source per epoch
- Distinguish between full fetches and conditional validations
**Evidence Required:** Per-source byte fetch counts and conditional fetch ratios
**Validation:** Accurate bandwidth and cache hit rate measurements

### SSAE-06E: D1 join for lake labels
**Purpose:** Enable lake-to-serving feedback loop for label validation.
**Specification:**
- Materialize join between `lake_candidate_jobs` and `opportunities` tables
- Persist `first_publication_at` from D1 to lake for label validation
- Requires lake→D1 sync observability mechanisms
**Evidence Required:** Lake records with verified first-publication timestamps from D1
**Validation:** Ability to validate lake labels against actual publication events

## Acceptance Criteria

For each measurement contract:
1. **Schema/Query Manifest:** Documented interface for measurement collection
2. **Temporal/Independent-label Coverage:** Measurements available for evaluation window
3. **Deduplication/Leakage Checks:** No double-counting or premature exposure
4. **Missingness Handling:** Explicit tracking of unmeasured intervals
5. **Analysis Contract:** Clear specification of how measurements feed SSAE-01/04/05

## Verification Exit

SSAE-06 verification requires:
- Mature versioned measurement receipts that resolve specified LIMITED gaps
- Measurement contracts that feed back into SSAE-01 and SSAE-04 evaluations
- Audit inference with permitted probes, support/positivity and sample-power evidence
- HT/propensity or recall claims requiring valid sampling design
- NOTE: LIMITED evidence cannot accept rollout; contracts must mature evidence

## Failure/Rollback

- Stop measurement workload and retain lawful receipts
- Weak sample coverage blocks graduation but not source authority checks
- No runtime changes to revert; measurement contracts are specification only
- Rebuild derived artifacts without rewriting original evidence if needed

## Connection to SSAE Units

These measurement contracts support:
- SSAE-01: Resolve LIMITED dataset gaps for as-of-selection attention contexts
- SSAE-04: Enable mature label availability for temporal holdout evaluation
- SSAE-05: Provide measurement baseline for shadow decision comparisons
- SSAE-10: Supply marginal reward data for constrained allocator

## Next Dependency-Ready Unit

Upon completion of SSAE-06 measurement contracts and maturation of evidence:
- **SSAE-06 mature labels** -> refresh SSAE-01 and repeat SSAE-04/05 evaluation
- **SSAE-10** (Deterministic constrained allocator) depends on SSAE-06 and SSAE-03-09 evidence

---
*Verification: This document outlines measurement contracts only; no implementation or deployment is authorized.*
*Verification: No SQL mutations, network/production mutations, or hold-list code edits specified.*
*Verification: Commit label will be "SSAE-06:" when implemented.*