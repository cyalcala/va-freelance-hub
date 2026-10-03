# SSAE-01 — As-of-Selection Attention Dataset Card

**Date:** 2026-10-04  
**Status:** PROPOSED — no runtime change  
**Parent unit (mathematical):** MATH-01 (constrained source allocation), MATH-05 (eligibility calibration), MATH-09 (entity resolution)  
**Source Perpetuity parent:** UNKNOWN — SSAE chain is a cross-cutting architecture; no SP unit currently owns the attention dataset artifact  
**Evidence labels:** VERIFIED_CODE (file:line anchors from current HEAD), UNKNOWN (all runtime counts, costs, yields, latencies)

---

## 1. Purpose

Build a versioned, as-of-selection attention dataset that captures the source-action contexts, resource costs, compatible mature marginal canonical fresh publication outcomes, intermediate discoveries/holds, censoring mechanisms, and attribution needed for the SSAE sparse-selection pipeline (SSAE-03 read-only ranker → SSAE-04 temporal holdouts → SSAE-05 shadow decisions → SSAE-10 allocator). This is a **read-only schema and query manifest**; no code is modified, no SQL mutations are executed, no production writes occur.

Per the SSAE dependency chain: SSAE-00 (profile) → SSAE-01 (dataset). This card depends on the SSAE-00 end-to-end boundary map and missing telemetry inventory.

---

## 2. Dataset Scope and Selection-Time Context

The attention dataset records one row per **source-action epoch** — a bounded unit of work where the system decides whether to FULL/REINDEX/REUSE/BOUNDED_REPLAY a specific source or tenant. The dataset is constructed from existing lawful lake/run/publication evidence through read-only derivation.

### 2.1 Selection Epoch Definition

A selection epoch corresponds to one execution of a sanctioned ingestion path:

| Path | Trigger | Selection Epoch Granularity | Code Anchor |
|------|---------|----------------------------|-------------|
| **Hunter Scrape** | Cloudflare Cron (10 min) → `/api/cron/scrape` | One `scrape.ts` run (processes 1..N sources per tick) | `apps/web/src/pages/api/cron/scrape.ts:999` `acquireRunLock()` |
| **Lake Miner** | GHA `23 */3 * * *` + GCP hourly `47 * * * *` | One `run-lake-miner.ts` execution (reconcile + domain discovery) | `scripts/lake/run-lake-miner.ts:85` `runLakeMiner()` |
| **Lake→D1 Sync** | GCP Cloud Scheduler `47 * * * *` | One `sync-to-d1.ts` execution (batch of auto-approved tenants) | `scripts/lake/sync-to-d1.ts:269` `syncQualifiedJobsToD1()` |

Each epoch carries a `selection_timestamp` (ISO8601, UTC), `run_id` (from `lake_runs` or Worker request ID), and `pipeline_phase` enum.

### 2.2 Versioned Source-Action Context Schema

```sql
-- Proposed derived table (not created; query manifest only)
CREATE VIEW attention_dataset AS
SELECT
  -- Identity & versioning
  epoch_id,                          -- UUID per selection epoch (run_id + phase + sequence)
  selection_timestamp,               -- UTC ISO8601 when epoch began
  pipeline_phase,                    -- 'hunter_scrape' | 'lake_reconcile' | 'lake_domain_discovery' | 'lake_sync'
  processor_version,                 -- git SHA of the executing code (from build env or runtime)
  policy_version,                    -- ACCEPTED_PARAMETERS.yaml hash or version tag

  -- Source/action identification
  source_id,                         -- e.g., 'we-work-remotely', 'breezy:20four7va', 'greenhouse:gitlab'
  source_platform,                   -- 'WeWorkRemotely', 'Breezy', 'Greenhouse', 'RSS', 'JSON_API'
  declared_capability,               -- 'rss_xml', 'ats_json', 'public_json_api', 'structured_xml', 'static_html'
  payload_kind,                      -- 'xml', 'json', 'html'

  -- Action feasibility & mode
  action_mode,                       -- 'FULL' | 'REINDEX' | 'REUSE' | 'BOUNDED_REPLAY' (inferred per SSAE-02 contract)
  feasibility_gate,                  -- 'permitted' | 'rate_limited' | 'robots_blocked' | 'opt_out' | 'unknown'
  feasibility_reason,                -- free text from gate evaluation

  -- Resource costs (actual, not estimated)
  fetch_latency_ms,                  -- UNKNOWN (not currently instrumented)
  fetch_bytes,                       -- UNKNOWN
  parse_latency_ms,                  -- UNKNOWN
  geo_gate_latency_ms,               -- UNKNOWN (pure function, ~microseconds)
  ai_calls_consumed,                 -- UNKNOWN (only budget exhaustion visible)
  ai_latency_ms,                     -- UNKNOWN
  db_write_latency_ms,               -- UNKNOWN (D1 upsert + FTS trigger)
  gateway_latency_ms,                -- UNKNOWN (publication-gateway.ts 7 checks)
  total_epoch_latency_ms,            -- UNKNOWN

  -- Evidence quality & dependency validity
  material_hash,                     -- bodyHash from conditional.ts or contentHash from lake-shared.ts
  conditional_validators,            -- {etag, lastModified, bodyHash} from conditional state
  dependency_versions,               -- {geoGate_version, processor_version, policy_version, model_version}
  evidence_expiry_at,                -- when current evidence becomes stale (TTL from policy)
  opt_out_status,                    -- current opt-out flag from source registry
  withdrawal_status,                 -- any withdrawal signal detected

  -- Intermediate outcomes (censored/held)
  raw_items_fetched,                 -- items from feed/API before normalization
  items_normalized,                  -- items after normalizeScrapedItems / extractJobs
  items_geo_gated,                   -- items passed to geoGate
  geo_eligible_verified,             -- geoGate verdict = 'eligible_verified'
  geo_eligible_likely,               -- geoGate verdict = 'eligible_likely'
  geo_ineligible,                    -- geoGate verdict = 'ineligible'
  geo_unclear,                       -- geoGate verdict = 'unclear'
  items_triage_pending,              -- items sent to AI triage (Hunter path)
  items_triage_resolved,             -- items returned from AI with decision
  items_qualified_ready,             -- status = 'QUALIFIED_READY' in lake or passed gateway
  items_published,                   -- items with ledger receipt in source_publication_ledger
  items_held,                        -- items in SHADOW/pending/AMBIGUOUS/unclear
  items_rejected,                    -- items EXCLUDED/auto_rejected

  -- Attribution & deduplication
  canonical_fingerprint,             -- computeFingerprint(company, title, apply_domain) from lake-shared.ts:32
  sighting_count,                    -- from lake_candidate_jobs.sighting_count or scrape deduplication
  provenance_sources,                -- array of source_ids that contributed to this canonical entity
  first_observation_at,              -- earliest raw observation timestamp
  first_publication_at,              -- earliest ledger receipt timestamp (NULL if never published)

  -- Marginal yield (mature labels only)
  marginal_fresh_qualified_published,-- canonical fresh qualified jobs first-published in this epoch (FRESH_DISCOVERY cohort)
  marginal_replay_published,         -- REPLAY_RECOVERY cohort
  marginal_reactivation_published,   -- REACTIVATION cohort
  marginal_backlog_published,        -- BACKLOG_IMPORT cohort
  marginal_unknown_published,        -- OTHER_NON_FRESH / unknown cohort

  -- Censoring indicators
  censored_by_ai_budget,             -- true if AI_SUBREQUEST_BUDGET_PER_RUN exhausted
  censored_by_concentration,         -- true if concentrationAllowance() returned allowed=0
  censored_by_opt_out,               -- true if source opted out
  censored_by_robots,                -- true if ROBOTS_ENFORCE_SOURCE_IDS blocked
  censored_by_lease_expiry,          -- true if source lease expired
  censored_by_hold_switch,           -- true if --hold-auto-approved active

FROM derived_epoch_evidence;
```

---

## 3. Query Manifest (Read-Only Derivation)

The dataset is assembled from existing tables and run ledgers via the following query patterns. All queries are **SELECT-only**; no DDL/DML.

### 3.1 Hunter Scrape Epochs

```sql
-- Source: apps/web/src/pages/api/cron/scrape.ts run lock + source_fetch_state
-- Each scrape run acquires RUN_LOCK_TTL_MIN=8 lock (line 999)
-- source_fetch_state rows with key='__scrape_run_lock__' mark epoch boundaries

SELECT
  sf.key as run_lock_key,
  sf.lastAttemptAt as selection_timestamp,
  sf.lastSuccessAt as epoch_end_timestamp,
  'hunter_scrape' as pipeline_phase,
  -- Join to source-level fetch outcomes via source_fetch_state per source_id
  sf.source_id,
  sf.lastHttpStatus,
  sf.lastDurationMs as fetch_latency_ms,
  sf.lastItemsFetched as raw_items_fetched,
  sf.lastItemsNormalized as items_normalized,
  -- geoGate outcomes not directly logged; would need to reconstruct from scrape.ts flow
  -- AI budget: AI_SUBREQUEST_BUDGET_PER_RUN=15 (line 124) — per-tick consumption not logged
  -- publication via publishPublicExposure → publication-gateway.ts
FROM source_fetch_state sf
WHERE sf.key = '__scrape_run_lock__'
  AND sf.lastAttemptAt IS NOT NULL;
```

**Gaps:** Per-source geoGate breakdown, AI call counts, triage pending/resolved counts, publication gateway latency not logged per epoch.

### 3.2 Lake Reconciliation Epochs

```sql
-- Source: lake_runs table (scripts/lake/reconcile-discovered-corpus.ts:152)
-- script = 'reconcile-discovered-corpus'
-- stats_json contains: corpusSize, sliceSize, byFamilySlice, domainsScanned, admitted, shadowed, rejected, jobsIngested, marginalQualifiedYieldPerProbe

SELECT
  lr.id as run_id,
  lr.startedAt as selection_timestamp,
  lr.finishedAt as epoch_end_timestamp,
  'lake_reconcile' as pipeline_phase,
  json_extract(lr.stats_json, '$.perFamily') as per_family_slice,
  json_extract(lr.stats_json, '$.sliceSize') as slice_size,
  json_extract(lr.stats_json, '$.domainsScanned') as domains_scanned,
  json_extract(lr.stats_json, '$.admitted') as admitted_count,
  json_extract(lr.stats_json, '$.shadowed') as shadowed_count,
  json_extract(lr.stats_json, '$.rejected') as rejected_count,
  json_extract(lr.stats_json, '$.jobsIngested') as jobs_ingested,
  json_extract(lr.stats_json, '$.marginalQualifiedYieldPerProbe') as marginal_yield_per_probe,
  -- No per-source breakdown in current ledger
  -- No fetch/parse/geo latency breakdown
FROM lake_runs lr
WHERE lr.script = 'reconcile-discovered-corpus';
```

### 3.3 Lake Domain Discovery Epochs

```sql
-- Source: lake_runs table (scripts/lake/run-lake-miner.ts:206)
-- script = 'run-lake-miner' (aggregate) or domain-ats-discovery internal
-- lake_ats_discovery rows record per-tenant evaluation

SELECT
  lad.id as tenant_id,
  lad.source_id,
  lad.ats_family as source_platform,
  lad.probe_url,
  lad.job_count as raw_items_fetched,
  lad.qualified_ready as items_qualified_ready,
  lad.ph_rate,
  lad.review_status as feasibility_gate,  -- 'auto_approved' | 'shadow_monitor' | 'auto_rejected' | 'discovered'
  lad.admission_reason as feasibility_reason,
  lad.jev_raw,
  lad.last_evaluated_at as selection_timestamp,
  'lake_domain_discovery' as pipeline_phase,
  -- Probe latency: INTER_PROBE_DELAY_MS_DEFAULT=1500ms clamped 1000-2000 (domain-ats-discovery.ts:59)
  -- Actual HTTP latency not logged
  -- geoGate per-job not logged; only aggregate qualified_ready
FROM lake_ats_discovery lad
WHERE lad.review_status != 'discovered';
```

### 3.4 Lake→D1 Sync Epochs

```sql
-- Source: lake_runs (script='lake:sync' or 'sync-to-d1') + source_publication_ledger
-- sync-to-d1.ts:269 syncQualifiedJobsToD1() builds batch SQL with publication receipts

SELECT
  spl.source_id,
  spl.tick_key,
  spl.retry_key,
  spl.mode,
  spl.proposed_count,
  spl.published_count,
  spl.published_ids_json,
  spl.decided_at as selection_timestamp,
  'lake_sync' as pipeline_phase,
  -- Gateway checks (7): registry, active/canary, lease, canary_cap, opt_out, eligible_verified, honest_date
  -- Concentration allowance from auto-publish-policy.ts
  -- D1 upsert latency UNKNOWN
FROM source_publication_ledger spl
WHERE spl.mode = 'unlimited'  -- lake sync mode
  AND spl.decided_at IS NOT NULL;
```

### 3.5 Lake Candidate Jobs (Canonical Entity Resolution)

```sql
-- Source: lake_candidate_jobs (ingest-to-lake.ts:51 fingerprint dedupe + lake-shared.ts:32 computeFingerprint)
-- Status flow: AMBIGUOUS → QUALIFIED_READY → SYNCED_TO_D1 (or EXCLUDED)

SELECT
  lcj.id,
  lcj.fingerprint_hash as canonical_fingerprint,
  lcj.source_id,
  lcj.source_platform,
  lcj.source_url,
  lcj.title,
  lcj.company,
  lcj.status,                           -- 'QUALIFIED_READY' | 'SYNCED_TO_D1' | 'AMBIGUOUS' | 'EXCLUDED'
  lcj.geo_scope,
  lcj.ph_eligibility,
  lcj.sighting_count,
  lcj.last_observed_at,
  lcj.posted_at,
  lcj.created_at as first_observation_at,
  -- Provenance from lake_sightings join
  (SELECT json_group_array(DISTINCT ls.source_id)
   FROM lake_sightings ls WHERE ls.candidate_id = lcj.id) as provenance_sources,
  -- First publication from ledger (requires join to opportunities + source_publication_ledger)
  NULL as first_publication_at  -- UNKNOWN without D1 join
FROM lake_candidate_jobs lcj
WHERE lcj.status IN ('QUALIFIED_READY', 'SYNCED_TO_D1');
```

---

## 4. Temporal / Independent-Label Coverage

### 4.1 Mature Label Availability

| Label | Source | Coverage | Maturity |
|-------|--------|----------|----------|
| **FRESH_DISCOVERY** | `source_publication_ledger` + `opportunities.posted_at` vs `scraped_at` | Only for published jobs with known `posted_at` | PARTIAL — `posted_at` often NULL (honesty contract) |
| **REPLAY_RECOVERY** | `reactivateFeedConfirmedJobs` + `recoverGateEligiblePending` paths | Hunter path only | PARTIAL — reactivation logic exists but cohort labels not persisted |
| **REACTIVATION** | `lake_candidate_jobs` status transitions | Lake path | UNKNOWN — no explicit reactivation flag in lake |
| **BACKLOG_IMPORT** | Historical imports (pre-2026-08) | Legacy | HISTORICAL — not part of current epoch stream |
| **QUALIFIED_READY** | `lake_candidate_jobs.status` | Lake path only | GOOD — explicit enum |
| **ELIGIBLE_VERIFIED/LIKELY** | `geoGate` verdict + `ph_eligibility` column | Both paths | GOOD — deterministic |
| **ADMIT/SHADOW/REJECT** | `lake_ats_discovery.review_status` + `jev_raw` | Lake domain discovery only | GOOD — explicit |

### 4.2 Censoring Mechanisms (Selection Bias Sources)

| Censoring Mechanism | Code Location | Effect on Dataset |
|---------------------|---------------|-------------------|
| **AI budget exhaustion** | `scrape.ts:124` `AI_SUBREQUEST_BUDGET_PER_RUN=15` | Items → `pending-triage`; never reach geoGate/qualification in same tick |
| **Concentration ceiling** | `auto-publish-policy.ts:74` `concentrationAllowance()` | Qualified jobs held at `HOLD` action; never reach D1 |
| **Opt-out** | `source_registry` + `decideAutoPublish` optOut check | Source excluded from sync plan entirely |
| **Robots enforcement** | `scrape.ts:56` `robotsModeForSourceId()` + `ROBOTS_ENFORCE_SOURCE_IDS` | Exact-six enforced; others observe-only |
| **Lease expiry** | `publication-gateway.ts` lease check | Source excluded from gateway |
| **Hold switch** | `sync-to-d1.ts:48` `--hold-auto-approved` | All auto-approved tenants held |
| **Rate limit / 429** | `domain-ats-discovery.ts:520` `rateLimitedHosts` shielding | Host skipped for remainder of run |
| **Minimum job threshold** | `domain-ats-discovery.ts:43` `MIN_JOBS_TO_EVALUATE=3` | Tenants with <3 jobs auto-rejected |
| **PH rate floors** | `auto-publish-policy.ts:12` `REJECT_PH_RATE_FLOOR=0.05` | Low-PH tenants rejected at sync time |

---

## 5. Deduplication and Leakage Checks

### 5.1 Identity Deduplication

| Layer | Mechanism | Code Anchor | Leakage Risk |
|-------|-----------|-------------|--------------|
| **Lake fingerprint** | `computeFingerprint(company, title, apply_domain)` SHA-256 truncated to 32 hex | `lake-shared.ts:32` | Different apply domains for same job → distinct fingerprints (intentional per SSAE strategy) |
| **Lake sighting** | `fingerprint_hash` OR `source_url` match → `recordSighting()` | `ingest-to-lake.ts:51` | `source_url` match may merge distinct jobs from same URL (e.g., paginated feed) |
| **Hunter scrape** | `contentHash` from `toContentHash(title, sourceUrl)` | `conditional.ts:10` `hashString()` | Same as lake fingerprint but different hash function |
| **D1 upsert** | `ON CONFLICT(source_url)` | `sync-to-d1.ts:195` + `scrape.ts:495` | `source_url` collision merges distinct jobs; `content_hash` in column but not in conflict key |

### 5.2 Temporal Leakage Prevention (Holdout Design)

Per SSAE-04 temporal holdout requirements, the dataset must support leakage-free temporal splits:

- **Selection-time features only**: All features must be computable at `selection_timestamp` without future knowledge.
- **Mature labels**: Only epochs where `first_publication_at` is known and `selection_timestamp < first_publication_at` can provide positive labels.
- **Right-censoring**: Epochs near the data cutoff have unknown publication outcomes → must be labeled `CENSORED`, not negative.
- **Prohibited features**: `published_count`, `first_publication_at`, any D1 serving state, ledger receipts generated after selection.

### 5.3 Proposed Holdout Split

```sql
-- Training: epochs where selection_timestamp <= '2026-09-01' AND first_publication_at IS NOT NULL
-- Validation: epochs where selection_timestamp BETWEEN '2026-09-01' AND '2026-09-15'
-- Test: epochs where selection_timestamp > '2026-09-15' (outcomes UNKNOWN/CENSORED)
-- All splits require first_publication_at to be known for positive labels
```

---

## 6. Missing Evidence → LIMITED Disposition

The following gaps render the dataset **LIMITED** per SSAE-01 acceptance criteria. Each gap requires a separately permitted SSAE-06 measurement contract to resolve.

| Gap | Impact | Required SSAE-06 Contract |
|-----|--------|---------------------------|
| **Per-stage latency breakdown** | Cannot attribute cost to fetch/parse/geo/AI/DB/gateway; Amdahl hypothesis untestable | Instrument `scrape.ts` and `domain-ats-discovery.ts` with `performance.now()` spans per stage; emit to `lake_runs` or structured log |
| **AI call volume histogram** | MATH-11 value-of-information unmeasurable; budget tuning blind | Add per-tick AI subrequest counter to `source_fetch_state` or `lake_runs` |
| **Fetch byte counts** | Cost model (bytes/$) unknown; cannot optimize conditional fetch | Log `content-length` in `fetchSourceWithStatus` and `probeTenantJobs` |
| **Conditional-fetch hit rate** | MATH-10 cache effectiveness unknown | Aggregate `notModified` per source per epoch in `lake_runs` |
| **Queue residence time** | MATH-02 queueing model lacks arrival/service inputs | Add `queue_admitted_at` / `queue_exit_at` to `lake_candidate_jobs` and `opportunities` |
| **Publication gateway latency** | D1 write amplification unmeasured | Wrap `publishPublicExposure` with timing; log to ledger |
| **Source-level freshness delta** | `posted_at` vs `scraped_at` not tracked | Record `posted_at` at ingestion; compute delta at sync |
| **GCP job execution duration** | Scheduler drift vs runtime unknown | Ingest Cloud Run Job logs into `lake_runs` or separate telemetry table |
| **Hunter per-source outcome breakdown** | `scrape.ts` processes multiple sources per tick; no per-source epoch record | Refactor run lock to per-source or add per-source sub-ledger |
| **Canonical fresh cohort labels** | `FRESH_DISCOVERY` vs `REPLAY_RECOVERY` not persisted at publication time | Extend `source_publication_ledger` with `cohort` column per metric contract |

---

## 7. Attribution and Marginal Yield Rules

Per MASTER_OPERATING_PROMPT §9 and CONSTITUTION §3.3:

- **Canonical fresh qualified first-publication** = distinct `fingerprint_hash` entities where `cohort = FRESH_DISCOVERY` AND `first_publication_at` falls in the measured Manila day.
- **Marginal unique supply** = fresh qualified published in epoch MINUS overlap with other sources selected in same epoch (requires canonical fingerprint cross-source join).
- **Attribution rule**: A job published by source A that was also sighted by source B is attributed to the source with the **earliest first_observation_at**. Ties broken by `source_id` lexicographic.
- **Overlap deduction**: When computing marginal yield for allocator (SSAE-10), sum of per-source yields must subtract cross-source overlap using canonical fingerprint.

---

## 8. Parent Unit Dependencies

| Dependency | Status | Evidence |
|------------|--------|----------|
| **SSAE-00** (profile + missing telemetry) | PROPOSED / VERIFIED_CODE | `docs/audits/2026-10-04-SSAE-00-PROFILE-CONTRACT.md` |
| **MATH-01** (dynamic source allocation) | OPEN | Requires this dataset for reward signal |
| **MATH-05** (eligibility calibration) | OPEN / VERIFIED_CODE (fixtures) | Requires independent quality labels from dataset |
| **MATH-09** (entity resolution) | OPEN / VERIFIED_CODE (ASHBY_CONTENT_HASH removed) | Requires fingerprint/sighting analysis from dataset |

---

## 9. Acceptance Checklist

- [x] Links resolve to current HEAD file:line anchors (VERIFIED_CODE)
- [x] No SQL mutation text (only SELECT/read references in query manifest)
- [x] Document states "no runtime change" and "PROPOSED" status
- [x] Every runtime count, latency, cost, yield labeled **UNKNOWN**
- [x] Schema/query manifest covers both active ingestion paths (Hunter + Lake)
- [x] Temporal/independent-label coverage table enumerates maturity per label
- [x] Deduplication mechanisms documented with leakage risks
- [x] Censoring mechanisms table identifies all selection bias sources
- [x] Missing evidence table maps each gap to an SSAE-06 measurement contract
- [x] Attribution and marginal yield rules match MASTER_OPERATING_PROMPT §9
- [x] Parent unit mapping identifies MATH-01/05/09 and Source Perpetuity gap
- [x] Commit label will be "SSAE-01:"

---

## 10. Next Action (if authorized)

SSAE-02 (Define compact source memory and dependency contract) depends on this dataset's schema and missing-evidence inventory. If the mathematical challenges accept this dataset card as a prerequisite, SSAE-02 can proceed with a proposed typed field specification for durable source memory. Otherwise, this card remains a standalone audit artifact.

---

**Owner/Controller:** maintainer  
**Trigger:** next authorized mathematical maintenance task  
**Rollback:** N/A (no runtime change)