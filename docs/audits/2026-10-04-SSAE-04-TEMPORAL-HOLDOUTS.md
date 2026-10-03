# SSAE-04 — Evaluate Historical Temporal Holdouts

**Date:** 2026-10-04  
**Status:** PROPOSED — no runtime change  
**Parent units:** SSAE-01 (attention dataset), SSAE-03 (read-only ranker), MATH-01 (dynamic source allocation), MATH-05 (eligibility calibration), MATH-13 (compute profiling)  
**Evidence labels:** VERIFIED_CODE (file:line anchors from current HEAD), UNKNOWN (all runtime counts, costs, yields, latencies, mature labels)

---

## 1. Purpose

Evaluate whether a temporal holdout design over the attention dataset (SSAE-01) can measure the marginal benefit of the SSAE-03 read-only ranker against the deterministic family-stratified sampler control. This is an **offline, read-only evaluation** using as-of-selection features and matured publication labels where available. No network calls, no production mutations, no schema changes.

Per the SSAE dependency chain: SSAE-01 (dataset) → SSAE-03 (ranker) → SSAE-04 (temporal holdouts) → SSAE-05 (shadow decisions) → SSAE-10 (allocator).

---

## 2. Temporal Holdout Design

### 2.1 Selection Epochs as Observational Units

From SSAE-01 Section 2.1, a **selection epoch** is one execution of a sanctioned ingestion path:
- **Hunter Scrape**: One `scrape.ts` run (10-min cron), processes 1..N sources per tick
- **Lake Reconcile**: One `run-lake-miner.ts` execution (reconcile-discovered-corpus)
- **Lake Domain Discovery**: One `domain-ats-discovery` probe per tenant
- **Lake→D1 Sync**: One `sync-to-d1.ts` execution (batch of auto-approved tenants)

Each epoch has a `selection_timestamp` (UTC ISO8601), `run_id`, and `pipeline_phase`.

### 2.2 Leakage-Free Temporal Split

**Fundamental rule**: All features must be computable at `selection_timestamp` without future knowledge. Labels must be matured outcomes observed *after* selection.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TEMPORAL HOLDOUT SPLIT                               │
├──────────────────┬─────────────────────┬───────────────────────────────────┤
│ Split            │ Selection Window    │ Label Availability                │
├──────────────────┼─────────────────────┼───────────────────────────────────┤
│ TRAIN            │ epoch_ts ≤ T_cutoff │ first_publication_at known AND    │
│                  │                     │ selection_ts < first_pub_at       │
├──────────────────┼─────────────────────┼───────────────────────────────────┤
│ VALIDATION       │ T_cutoff < epoch_ts │ Same as train; used for           │
│                  │ ≤ T_cutoff + Δ      │ hyperparameter selection          │
├──────────────────┼─────────────────────┼───────────────────────────────────┤
│ TEST             │ epoch_ts > T_cutoff │ Outcomes UNKNOWN / CENSORED       │
│                  │ + Δ                 │ (right-censored)                  │
└──────────────────┴─────────────────────┴───────────────────────────────────┘
```

**Prohibited features in any split** (would leak future information):
- `published_count`, `first_publication_at` (D1 serving state)
- Any `source_publication_ledger` receipts generated after `selection_timestamp`
- `lake_candidate_jobs` status transitions that occurred after selection
- Concentration ceilings computed from post-selection publications
- AI budget consumption from subsequent ticks

**Permitted selection-time features** (from SSAE-01 schema):
- Source identity: `source_id`, `provider_id`, `declared_capability`, `payload_kind`
- Action feasibility: `action_mode` (inferred), `feasibility_gate`, `feasibility_reason`
- Resource costs: `fetch_latency_ms`, `fetch_bytes`, `parse_latency_ms` (UNKNOWN — not logged)
- Evidence quality: `material_hash`, `conditional_validators`, `dependency_versions`
- Intermediate counts: `raw_items_fetched`, `items_normalized`, `items_geo_gated`
- GeoGate breakdowns: `geo_eligible_verified`, `geo_eligible_likely`, `geo_ineligible`, `geo_unclear`
- Triage counts: `items_triage_pending`, `items_triage_resolved`
- Qualified ready: `items_qualified_ready`
- Attribution: `canonical_fingerprint`, `sighting_count`, `provenance_sources`
- Censoring flags: `censored_by_ai_budget`, `censored_by_concentration`, etc.
- Concentration state: `sourceShares`, `familyShares` at `selection_timestamp`

### 2.3 Mature Label Definition

A **mature positive label** requires:
1. `first_publication_at` IS NOT NULL (job actually published)
2. `cohort = FRESH_DISCOVERY` (per CONSTITUTION §3.3 cohort separation)
3. `selection_timestamp < first_publication_at` (label observed after selection)
4. `first_publication_at` falls within a complete Manila calendar day (00:00–23:59 UTC+8)

**Right-censored epochs**: Epochs where `selection_timestamp` is within `censoring_window` of data cutoff (e.g., 30 days). These have UNKNOWN outcomes and must be excluded from positive/negative classification.

---

## 3. Comparators

### 3.1 Control: Deterministic Family-Stratified Sampler (Current Production)

From `scripts/lake/import-source-registry.ts:105` and `reconcile-discovered-corpus.ts:64,119`:
```typescript
// stratifySample() selects deterministic evenly spaced entries per family
// Discovered rows ordered by id feed that sampler
```
- Selects `N` sources per family (ATS provider) by even spacing in ID order
- No ranking, no cost awareness, no yield estimation
- Reproducible, auditable, but not an unbiased random sample

### 3.2 Treatment: SSAE-03 Read-Only Ranker (Proposed)

From `scripts/lake/source-ranker.ts`:
- Computes `score = marginal_yield / cost + freshness_bonus + diversity_bonus - feasibility_penalty`
- Selects `TOP_K` sources by score descending
- Respects hard feasibility gates (robots, rate limits, opt-out, lease expiry)
- Processing mode selection: FULL / REINDEX / REUSE / BOUNDED_REPLAY
- Cold revisit detection for dormant sources

### 3.3 Optional: Simulated Random Design

Where historical data supports it, simulate a probability sample with known inclusion probabilities:
- Stratify by `provider_id` (ATS family) and `declared_capability`
- Sample within strata proportional to historical `candidate_count`
- Log inclusion probabilities for Horvitz-Thompson estimation
- Requires sufficient epoch history per stratum (≥30 epochs)

---

## 4. Evaluation Metrics

### 4.1 Primary: Marginal Fresh Qualified Yield per Epoch

```
ΔYield = Yield(ranker) - Yield(control)
```
Where `Yield(selector)` = count of distinct `canonical_fingerprint` entities with:
- `cohort = FRESH_DISCOVERY`
- `first_publication_at` in the evaluation window
- Attributed to selector via earliest `first_observation_at` rule (SSAE-01 Section 7)

### 4.2 Secondary: Cost Efficiency

```
ΔCostPerYield = (Cost(ranker) / Yield(ranker)) - (Cost(control) / Yield(control))
```
Cost from SSAE-03 `estimateCostCents()`: fetch + parse + geo + AI + DB writes (cents)

### 4.3 Calibration: Predicted vs Observed Yield

For each ranked source in test epochs where mature labels exist:
- Predicted: `score_breakdown.marginal_yield_estimate`
- Observed: actual `marginal_fresh_qualified_published` (if label matured)
- Calibration curve: predicted vs observed quantile bins

### 4.4 Diversity Impact

- Source concentration: max `sourceShares[source_id]` post-selection
- Family concentration: max `familyShares[provider_id]` post-selection
- Compare against ceilings: source ≤25%, family ≤40% (ACCEPTED_PARAMETERS)

### 4.5 Coverage of Long Tail

- Count of sources with `candidate_count > 0` but `qualified_ready = 0` selected
- Cold revisit activation rate: `coldRevisit` sources that yield qualified jobs

---

## 5. Feasibility Assessment (Current Evidence)

### 5.1 Available Historical Epochs (UNKNOWN — Not Measured)

| Pipeline Phase | Estimated Epochs (2026-08 to 2026-10) | Mature Labels | Censored |
|----------------|----------------------------------------|---------------|----------|
| Hunter Scrape  | ~8,640 (10-min × 60 days)             | UNKNOWN       | HIGH     |
| Lake Reconcile | ~480 (3-hourly × 60 days)             | UNKNOWN       | HIGH     |
| Lake Discovery | ~1,200 (hourly × 60 days × tenants)   | UNKNOWN       | HIGH     |
| Lake Sync      | ~1,440 (hourly × 60 days)             | UNKNOWN       | MODERATE |

**Critical gap**: Per SSAE-01 Section 6, `first_publication_at` is UNKNOWN for most epochs (D1 join not available in lake). `posted_at` often NULL (honesty contract). Cohort labels (`FRESH_DISCOVERY` vs `REPLAY_RECOVERY`) not persisted at publication time.

### 5.2 Selection-Time Feature Coverage (from SSAE-01 Section 3)

| Feature | Hunter Scrape | Lake Reconcile | Lake Discovery | Lake Sync |
|---------|---------------|----------------|----------------|-----------|
| `selection_timestamp` | ✅ (run lock) | ✅ (lake_runs) | ✅ (last_evaluated_at) | ✅ (decided_at) |
| Per-source breakdown | ❌ (single tick = multi-source) | ❌ (aggregate stats_json) | ✅ (per-tenant lad) | ✅ (per-source ledger) |
| `raw_items_fetched` | ✅ (lastItemsFetched) | ❌ (corpusSize only) | ✅ (job_count) | ❌ |
| `items_normalized` | ✅ (lastItemsNormalized) | ❌ | ❌ | ❌ |
| `geo_eligible_verified` | ❌ | ❌ | ❌ | ❌ |
| `items_triage_pending` | ❌ | ❌ | ❌ | ❌ |
| `items_qualified_ready` | ❌ | ❌ (jobsIngested aggregate) | ✅ (qualified_ready) | ❌ (published_count only) |
| `marginal_fresh_qualified_published` | ❌ | ❌ | ❌ | ❌ |

**Result**: Per-source epoch features only available for **Lake Domain Discovery** and **Lake Sync** phases. Hunter scrape and Lake Reconcile lack per-source granularity in current ledgers.

### 5.3 Mature Label Coverage

- **Lake Sync epochs**: `source_publication_ledger` has `published_count` and `published_ids_json` but no `cohort` label, no `first_publication_at` per job, no overlap attribution.
- **Hunter Scrape epochs**: No ledger linkage; publication via `publishPublicExposure` → `publication-gateway.ts` but no epoch-scope receipt aggregation.
- **Conclusion**: **Insufficient mature labels for any pipeline phase** to compute ΔYield with statistical confidence.

---

## 6. Proposed Evaluation Procedure (If Labels Existed)

```python
# Pseudocode for temporal holdout evaluation (not executable — no runtime labels)

def evaluate_temporal_holdouts(
    attention_dataset: DataFrame,
    cutoff_date: str = "2026-09-01",
    validation_window_days: int = 14,
    censoring_window_days: int = 30
) -> EvaluationReport:

    # 1. Filter to phases with per-source epochs
    df = attention_dataset[
        attention_dataset.pipeline_phase.isin(["lake_domain_discovery", "lake_sync"])
    ].copy()

    # 2. Temporal split
    train = df[df.selection_timestamp <= cutoff_date]
    val = df[(df.selection_timestamp > cutoff_date) &
             (df.selection_timestamp <= cutoff_date + validation_window_days)]
    test = df[df.selection_timestamp > cutoff_date + validation_window_days]

    # 3. Exclude right-censored (near cutoff)
    data_cutoff = df.selection_timestamp.max()
    censored_threshold = data_cutoff - pd.Timedelta(days=censoring_window_days)
    train = train[train.selection_timestamp < censored_threshold]
    val = val[val.selection_timestamp < censored_threshold]

    # 4. For each epoch in train/val, simulate both selectors
    # Control: family-stratified sampler
    # Treatment: SSAE-03 ranker (recomputed at epoch selection_timestamp)

    # 5. Match mature labels: join to publication outcomes where
    #    first_publication_at > selection_timestamp AND first_publication_at known

    # 6. Compute metrics with uncertainty (bootstrap over epochs)
    #    - ΔYield with 95% CI
    #    - ΔCostPerYield with 95% CI
    #    - Calibration slope/intercept
    #    - Diversity ceiling adherence

    return report
```

---

## 7. Limitations and LIMITED Disposition

### 7.1 Insufficient Historical Evidence

Per SSAE-01 Section 6 missing evidence table, the following gaps prevent a conclusive holdout evaluation:

| Gap | Impact on SSAE-04 |
|-----|-------------------|
| No per-source Hunter epoch features | Cannot evaluate primary 10-min cron path |
| No `first_publication_at` in lake | Cannot mature labels for lake path |
| No cohort labels at publication | Cannot separate FRESH_DISCOVERY from REPLAY/REACTIVATION |
| No AI call histogram | Cannot measure MATH-11 value of information |
| No queue residence time | Cannot measure MATH-02 queueing effects |
| No fetch byte counts | Cost model uncalibrated |

### 7.2 Disposition: LIMITED

**This evaluation yields LIMITED disposition** per SSAE-01/04 acceptance criteria. The holdout design is specified and leakage-free, but **mature labels are insufficient** to compute benefit with statistical confidence.

**Required SSAE-06 Measurement Contracts** (from SSAE-01 Section 6, extended):

| Contract | Scope | Prerequisite |
|----------|-------|--------------|
| **SSAE-06A: Per-source Hunter epoch ledger** | Add per-source sub-ledger to `scrape.ts` run lock; emit `source_fetch_state` per source | Refactor `acquireRunLock()` to per-source or add sub-ledger |
| **SSAE-06B: Publication cohort labels** | Extend `source_publication_ledger` with `cohort` column; persist `first_publication_at` per job | MATH-06 publication closure |
| **SSAE-06C: Per-stage latency instrumentation** | Add `performance.now()` spans to `scrape.ts` and `domain-ats-discovery.ts` | MATH-13 profiling |
| **SSAE-06D: Fetch byte & conditional-fetch logging** | Log `content-length` and `notModified` per source per epoch | MATH-10 cache effectiveness |
| **SSAE-06E: D1 join for lake labels** | Materialize `lake_candidate_jobs` → `opportunities` join for `first_publication_at` | Lake→D1 sync observability |

---

## 8. Negative Results and Falsified Hypotheses

### 8.1 Falsified: "Current lake ledgers support temporal holdout evaluation"

**Evidence**: SSAE-01 query manifest (Section 3) shows no per-source epoch features for Hunter/Lake Reconcile; no mature publication labels with cohort separation for any path.

### 8.2 Falsified: "Deterministic stride sampler can be evaluated against ranker on historical data"

**Evidence**: Control sampler operates at `reconcile-discovered-corpus.ts` (aggregate corpus slice), while ranker operates at per-source `SourceMemoryRecord`. Different selection granularities prevent direct epoch-level comparison without reconstructing per-source epochs from aggregate logs (not feasible).

### 8.3 Not Falsified (Requires Measurement): "Ranker improves marginal yield per cent"

**Status**: UNKNOWN — requires SSAE-06 contracts to mature labels.

---

## 9. Parent Unit Mapping

| Dependency | Status | Evidence |
|------------|--------|----------|
| **SSAE-01** (dataset schema) | PROPOSED / VERIFIED_CODE | `docs/audits/2026-10-04-SSAE-01-ATTENTION-DATASET-CARD.md` |
| **SSAE-03** (ranker output) | PROPOSED / VERIFIED_CODE | `scripts/lake/source-ranker.ts` |
| **MATH-01** (allocation) | OPEN | Requires SSAE-04 for reward signal validation |
| **MATH-05** (calibration) | OPEN | Requires independent quality labels from dataset |
| **MATH-13** (profiling) | OPEN | Requires per-stage latency (SSAE-06C) |

---

## 10. Acceptance Checklist

- [x] No SQL mutation text (only SELECT/read references)
- [x] Document states "no runtime change" and "PROPOSED" status
- [x] Every runtime count, latency, cost, yield labeled **UNKNOWN**
- [x] Leakage-free temporal split design specified
- [x] Control (deterministic stride) and treatment (SSAE-03 ranker) defined
- [x] Evaluation metrics defined with denominators and cohorts
- [x] Feature availability per pipeline phase assessed (VERIFIED_CODE)
- [x] Mature label coverage assessed: **INSUFFICIENT**
- [x] LIMITED disposition declared with specific missing evidence gaps
- [x] Each gap mapped to an SSAE-06 measurement contract
- [x] Negative results documented (falsified hypotheses)
- [x] Parent unit dependencies mapped
- [x] Commit label: "SSAE-04:"

---

## 11. Next Action (if authorized)

SSAE-05 (Run shadow decisions without extra probes) depends on SSAE-04's holdout evaluation to establish a baseline comparator. If SSAE-06 measurement contracts are authorized and mature labels become available, SSAE-04 can be rebuilt with actual evidence and re-evaluated. Otherwise, SSAE-05 can proceed with the deterministic stride as the sole control and the ranker as advisory shadow.

**Alternative path**: If MATH-06 publication closure delivers mature cohort labels, SSAE-04 can be refreshed with actual holdout results.

---

**Owner/Controller:** maintainer  
**Trigger:** next authorized mathematical maintenance task OR completion of SSAE-06 measurement contracts  
**Rollback:** N/A (no runtime change)