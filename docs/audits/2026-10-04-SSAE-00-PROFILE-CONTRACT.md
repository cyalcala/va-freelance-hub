# SSAE-00 — End-to-End Cost Profile Contract

**Date:** 2026-10-04\
**Status:** PROPOSED — no runtime change\
**Parent unit (mathematical):** MATH-13 (End-to-end latency and Amdahl analysis)\
**Source Perpetuity parent:** UNKNOWN (recorded as a gap — no executable SP unit currently maps to this profile work)\
**Evidence labels:** VERIFIED_CODE (file:line anchors), UNKNOWN (all runtime counts and latencies)

---

## 1. Purpose

Recover the actual selection → fetch → wait → parse → geo → AI → DB → publication boundary map for the two active ingestion paths, with clocks, schedules, stage costs, missing telemetry, and a comparable Amdahl hypothesis. This is a **read-only audit**; no code is modified, no SQL is executed, no production writes occur.

---

## 2. Two Active Ingestion Paths

### Path A — Lake Miner (Turso Reservoir → D1 via GCP)

```
[GHA schedule] → run-lake-miner.ts → reconcile-discovered-corpus.ts
    ↓                                              ↓
[domain-ats-discovery.ts] ←────────────────── ingest-to-lake.ts
    ↓                                              ↓
[lake_candidate_jobs] ←────────────────────── processAndRefineCandidate
    ↓
[GCP Cloud Scheduler] → lake-publish-job → sync-to-d1.ts
    ↓                                              ↓
[auto-publish-policy.ts] → decideAutoPublish → buildSyncSql
    ↓                                              ↓
[D1 upsert via Cloudflare API] ←────────────── publication-gateway.ts
    ↓
[Public exposure on Astro surface]
```

### Path B — Hunter Scrape (Freshness Worker → Astro API → D1)

```
[Cloudflare Cron] → freshness-cron Worker (every 10 min)
    ↓
POST /api/cron/scrape (Astro Pages Function)
    ↓
runLockOutcome + robotsModeForSourceId
    ↓
fetchSourceWithStatus (RSS/HTML/JSON/ATS)
    ↓
normalizeScrapedItems + geoGate
    ↓
decideTriage (AI ladder) / skepticEligibilityCheck
    ↓
drainPendingTriageInline / recoverGateEligiblePending
    ↓
publishPublicExposure → publication-gateway.ts (7 checks)
    ↓
D1 upsert (opportunities) + source_publication_ledger
    ↓
[Public exposure on Astro surface]
```

---

## 3. Detailed Boundary Map with File:Line Anchors

### 3.1 Lake Miner Path — Phase 1: Reconciliation

| Stage | File | Function/Line | Clocks / Scheduling | Notes |
|-------|------|---------------|---------------------|-------|
| **Schedule** | `.github/workflows/gha-lake-miner.yml:18` | `cron: '23 */3 * * *'` | Every 3 hours at minute 23 UTC | GHA concurrency group `gha-lake-miner` |
| **Entry** | `scripts/lake/run-lake-miner.ts:85` | `runLakeMiner()` | `startTime = Date.now()` | Reads `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| **Reconcile** | `scripts/lake/reconcile-discovered-corpus.ts:89` | `reconcileDiscoveredCorpus()` | `startedAt = new Date().toISOString()` | Loads `review_status='discovered'` rows |
| **Stratify** | `scripts/lake/import-source-registry.ts:119` | `stratifySample(all, perFamily)` | Deterministic evenly-spaced per family | Reproducible control sampler |
| **Bulk Discovery** | `scripts/lake/domain-ats-discovery.ts:768` | `runBulkAtsDiscovery()` | `probeDelayMs` default 1500ms | Family-pinned seeds, no 4x fan-out |
| **Ledger** | `scripts/lake/reconcile-discovered-corpus.ts:152` | `INSERT INTO lake_runs` | `finishedAt = new Date().toISOString()` | `dryRun` skips write |

### 3.2 Lake Miner Path — Phase 2: Domain ATS Discovery

| Stage | File | Function/Line | Clocks / Scheduling | Notes |
|-------|------|---------------|---------------------|-------|
| **Schedule** | Same GHA run (phase 2) | `runDomainAtsDiscovery()` | Called from `runLakeMiners.ts:156` | Same cron, sequential after reconcile |
| **Extract Candidates** | `scripts/lake/domain-ats-discovery.ts:459` | `extractDiscoveryCandidates()` | Queries `lake_candidate_jobs` with `status IN ('QUALIFIED_READY','SYNCED_TO_D1')` | Groups by company, orders by `MAX(sighting_count)` |
| **Probe Templates** | `scripts/lake/domain-ats-discovery.ts:95` | `ATS_PROBE_TEMPLATES` | 5 families: Breezy, Greenhouse, Workable, Lever, Ashby | Each has `buildUrl` + `extractJobs` |
| **Probe + Delay** | `scripts/lake/domain-ats-discovery.ts:507` | `probeTenantJobs()` + `sleep()` | `INTER_PROBE_DELAY_MS_DEFAULT=1500` (clamped 1000-2000) | Skip-on-429 host shielding |
| **GeoGate** | `scripts/lake/domain-ats-discovery.ts:536` | `computeTenantMetrics()` → `geoGate()` | Pure deterministic, no network | Classifies each job: `eligible_verified`, `eligible_likely`, `ineligible`, `unclear` |
| **Jev Decision** | `scripts/lake/domain-ats-discovery.ts:293` | `decideAdmission()` | Advisory only; `OPENROUTER_API_KEY` required | Falls back to deterministic thresholds |
| **Merge Decision** | `scripts/lake/domain-ats-discovery.ts:232` | `mergeAdmissionDecision()` | Wilson lower bound + Jev confidence ≥ 0.7 | Wilson ≥ 20% clears floor; Jev cannot veto cleared cohort |
| **Persist Discovery** | `scripts/lake/domain-ats-discovery.ts:624` | `INSERT INTO lake_ats_discovery` | `last_evaluated_at = datetime('now')` | `review_status`: `auto_approved` / `shadow_monitor` / `auto_rejected` |
| **Ingest Jobs** | `scripts/lake/domain-ats-discovery.ts:649` | `evaluateTenant()` → `processAndRefineCandidate()` | `ingestStats.qualifiedReady` counted | Writes to `lake_candidate_jobs` + `lake_sightings` |
| **Ledger** | `scripts/lake/run-lake-miner.ts:206` | `INSERT INTO lake_runs` | Aggregate of both phases | `script: 'run-lake-miner'` |

### 3.3 Lake Miner Path — Phase 3: Lake → D1 Sync (GCP Primary)

| Stage | File | Function/Line | Clocks / Scheduling | Notes |
|-------|------|---------------|---------------------|-------|
| **Schedule** | `infra/gcp/deploy-lake-publish.sh:18` | `CRON_SCHEDULE="47 * * * *"` | Hourly at minute 47 UTC | Cloud Scheduler → Cloud Run Job |
| **Deploy** | `infra/gcp/deploy-lake-publish.sh:111` | `gcloud run jobs deploy lake-publish-job` | `--cpu=1 --memory=512Mi --max-retries=1 --task-timeout=300s` | Secrets from Secret Manager |
| **Entry** | `scripts/lake/sync-to-d1.ts` (via `lake:sync`) | `planAutoPublishSources()` + `loadAutoApprovedTenants()` | Queries `lake_ats_discovery WHERE review_status='auto_approved'` | `--hold-auto-approved` kill switch |
| **Auto-Publish Policy** | `scripts/lake/auto-publish-policy.ts:115` | `decideAutoPublish()` | Wilson lower bound ≥ 0.20 OR Jev ADMIT @ ≥ 0.7 | Concentration ceilings: top source ≤ 25%, top family ≤ 40% |
| **Build SQL** | `scripts/lake/sync-to-d1.ts:162` | `buildSyncSql()` | `type='freelance'`, `location_type='remote'`, `is_active=1` | `posted_at` stays NULL if unknown (honesty contract) |
| **Upsert** | `scripts/lake/sync-to-d1.ts:195` | `ON CONFLICT(source_url) DO UPDATE` | `last_seen_in_feed_at = datetime('now')` | Revives `verifier`/`triage`/`takedown-archived` rows |
| **Publication Gateway** | `packages/scraper/publication-gateway.ts:146` | `publishPublicExposure()` | 7 checks: registry, active/canary, lease, canary cap, opt-out, eligible_verified, honest date | **Only path to public exposure** |
| **Ledger** | `packages/scraper/publication-gateway.ts:233` | `INSERT INTO source_publication_ledger` | `published_ids_json`, `tick_key`, `retry_key` | Idempotent via `retryKey` |

### 3.4 Hunter Scrape Path — Freshness Worker

| Stage | File | Function/Line | Clocks / Scheduling | Notes |
|-------|------|---------------|---------------------|-------|
| **Schedule** | `workers/freshness-cron/wrangler.toml:15` | `crons = ["*/10 * * * *"]` | Every 10 minutes | `workers_dev = false` (no public route) |
| **Entry** | `workers/freshness-cron/src/index.ts:52` | `scheduled(event, env, ctx)` | `event.scheduledTime` | `ctx.waitUntil(ping(env))` |
| **Auth** | `workers/freshness-cron/src/index.ts:25` | `timingSafeEqual()` | Constant-time secret compare | `PROXY_SECRET` from Worker secret |
| **Scrape POST** | `workers/freshness-cron/src/index.ts:36` | `fetch(env.SCRAPE_URL, ...)` | 60s timeout | `Authorization: Bearer ${PROXY_SECRET}` |
| **Shadow Dispatch** | `workers/freshness-cron/src/index.ts:56` | `if (minutes === 20) pingShadow()` | Once per hour at :20 | Independent promise; failure doesn't suppress scrape |

### 3.5 Hunter Scrape Path — Astro `/api/cron/scrape`

| Stage | File | Function/Line | Clocks / Scheduling | Notes |
|-------|------|---------------|---------------------|-------|
| **Auth** | `apps/web/src/pages/api/cron/scrape.ts:5` | `isAuthorized()` | `x-cron-secret` header | Mirrors Worker auth |
| **Run Lock** | `apps/web/src/pages/api/cron/scrape.ts:999` | `acquireRunLock()` | `RUN_LOCK_TTL_MIN=8` | `source_fetch_state` row `__scrape_run_lock__` |
| **Robots** | `apps/web/src/pages/api/cron/scrape.ts:56` | `robotsModeForSourceId()` | `ROBOTS_ENFORCE_SOURCE_IDS` (exact-six) | Observe for others; COMP-01B per-source canary |
| **Fetch** | `apps/web/src/pages/api/cron/scrape.ts:933` | `fetchSourceWithStatus()` | `conditionalValidatorsForPersistence` | 304/ETag/bodyHash support; `notModified` skips parse+triage |
| **Normalize** | `apps/web/src/pages/api/cron/scrape.ts:97` | `normalizeScrapedItems()` | `sanitizeSourceUrl`, `sanitizeApplyUrlForSource`, `toContentHash` | Drops no-URL, quarantines cross-company apply hosts |
| **GeoGate** | `apps/web/src/pages/api/cron/scrape.ts:415` | `geoGate()` | Pure deterministic | `geoScope` + `phEligibility` + `evidence` |
| **Triage (AI)** | `apps/web/src/pages/api/cron/scrape.ts:237` | `withAiSubrequestBudget()` | `AI_SUBREQUEST_BUDGET_PER_RUN=15` | Budgeted env wraps `AI.run`; throws `AiBudgetExceededError` |
| **Decide Triage** | `@va-hub/scraper/triage-decision.ts` | `decideTriage()` | Model ladder: 70B → 8B → 7B → skeptic | Fail-closed: `ai-unavailable` → `pending-triage` |
| **Pending Drain** | `apps/web/src/pages/api/cron/scrape.ts:364` | `drainPendingTriageInline()` | `PENDING_DRAIN_PER_TICK=4` | Cheap-first ladder (8B/7B); shares AI budget |
| **Gate Recovery** | `apps/web/src/pages/api/cron/scrape.ts:570` | `recoverGateEligiblePending()` | `GATE_ELIGIBLE_GEO_SCOPES` | Publishes `geoScope IN ('worldwide','apac_incl_ph','ph_only')` without AI |
| **Reactivation** | `apps/web/src/pages/api/cron/scrape.ts:614` | `reactivateFeedConfirmedJobs()` | `RECOVERABLE_INACTIVE_REASONS` + PH eligible | Feed-confirmed reactivation |
| **Unclear Sweep** | `apps/web/src/pages/api/cron/scrape.ts:1132` | `sweepUnclearBacklog()` | `DAILY_SWEEP_CAP=15`, `SWEEP_BUDGET_IDLE_TICK=2` | Fresh-first (10-day window); explicit counter in `source_fetch_state` |
| **Publication** | `apps/web/src/pages/api/cron/scrape.ts:495` | `publishPublicExposure()` | Via `publicationDbFromEnv()` | Same 7-check gateway as lake path |
| **Run Lock Release** | `apps/web/src/pages/api/cron/scrape.ts:1035` | `releaseRunLock()` | Fenced: only clears if `lastAttemptAt` matches | Prevents expired lock overwrite |

### 3.6 Hunter Scrape Path — Shadow Dispatch (GCP)

| Stage | File | Function/Line | Clocks / Scheduling | Notes |
|-------|------|---------------|---------------------|-------|
| **Schedule** | `infra/gcp/deploy-shadow-dispatch.sh:18` | `CRON_SCHEDULE="53 * * * *"` | Hourly at minute 53 UTC | Offset by 30 min from GHA lake-miner :23 |
| **Deploy** | `infra/gcp/deploy-shadow-dispatch.sh:120` | `gcloud run jobs deploy shadow-dispatch-job` | `--set-env-vars="SHADOW_DISPATCH_API_URL=..."` | Calls `/api/cron/shadow-dispatch` |
| **Entry** | `apps/web/src/pages/api/cron/shadow-dispatch.ts` | (not read) | Shadow observation only | No publication; reads state, proposes work |

---

## 4. Missing Telemetry (Instrumentation Gaps)

| Gap | Location | Impact |
|-----|----------|--------|
| **Per-stage latency breakdown** | Neither path emits stage-level timings (fetch vs parse vs geo vs AI vs DB vs gateway) | Cannot attribute end-to-end latency to a specific stage |
| **Queue residence time** | No `queue_admitted_at` / `queue_exit_at` on `lake_candidate_jobs` or `opportunities` | MATH-02 (queueing) lacks live arrival/service inputs |
| **AI call volume by stage** | `AiBudgetExceededError` only fires at cap; no histogram of calls per tick | MATH-11 (AI routing) cannot measure value of information |
| **Fetch byte counts** | `fetchSourceWithStatus` logs `durationMs` but not response bytes | Cost model (bytes/$ unknown) |
| **Conditional-fetch hit rate** | `notModified` boolean logged but not aggregated per source | MATH-10 (change detection) lacks cache-effectiveness signal |
| **Publication gateway latency** | `publishPublicExposure` has no internal timing | D1 write amplification (FTS triggers) unmeasured |
| **Lake → D1 sync batch size** | `sync-to-d1.ts` uses `--limit` but actual published count not correlated with latency | Batch-size vs latency curve unknown |
| **GCP job execution duration** | Cloud Run Job logs not ingested into repo telemetry | Scheduler drift vs actual runtime unknown |
| **Worker subrequest count** | Only budget exhaustion visible; no per-tick subrequest histogram | Cannot tune `AI_SUBREQUEST_BUDGET_PER_RUN` empirically |
| **Source-level freshness** | `source_fetch_state.lastAttemptAt` exists but `posted_at` vs `scraped_at` delta not tracked | MATH-04 (adaptive polling) lacks freshness benefit signal |

All runtime counts (jobs/day, latency ms, error rates, queue depths) are **UNKNOWN** — no live measurements were taken for this profile.

---

## 5. Amdahl Hypothesis

**Hypothesis:** The dominant bottleneck in end-to-end fresh job publication is **not** source fetch or parse, but the **AI triage subrequest budget** (Hunter path) and **GCP scheduler latency variance** (Lake path).

**Reasoning:**
- Hunter path: 10-min cron → 60s scrape timeout → AI budget 15 calls/tick → at 144 ticks/day, theoretical max 2,160 AI calls/day. Measured 2026-08: 10k neuron/day cap exhausted by 06:45Z, starving both sweep and fresh triage. The 50-subrequest/Worker cap and 10k neuron/account cap are hard platform limits.
- Lake path: GHA `23 */3 * * *` (8 runs/day) + GCP hourly (24 runs/day) → 32 discovery cycles/day. But GHA cron delivery dropped 75% of slots (per `gha-lake-publish.yml:9`), making GCP the de facto primary. Cloud Scheduler → Cloud Run Job cold start + container pull adds variable latency (unmeasured).
- D1 write path: `ON CONFLICT(source_url)` upsert + FTS trigger amplification (`meta.changes` > row count) → `clampLedgerPublishedCount` defensive clamp. Write amplification factor unmeasured.

**Predicted speedup ceiling:** Even if fetch/parse were zero-cost, the AI budget cap (Hunter) and scheduler variance (Lake) bound the maximum fresh publication rate. Profile the **actual** bottleneck before investing in fetch optimization (e.g., Rust/WASM parsing).

---

## 6. Parent Unit Mapping

- **MATH-13** (End-to-end latency and Amdahl analysis): This profile provides the boundary map and missing telemetry inventory that MATH-13's "comparable profile" prerequisite requires.
- **Source Perpetuity Implementation Plan**: No SP unit currently owns this cross-cutting profile. The plan's executable queue (SP-21 clock continuity, SP-22 shadow dispatcher, SP-23 capped canary) addresses scheduling and publication control, not compute profiling. Recorded as a **gap** — the Source Perpetuity parent is UNKNOWN.

---

## 7. Acceptance Checklist

- [x] Links resolve to current HEAD file:line (VERIFIED_CODE)
- [x] No SQL mutation text in this document (only SELECT/read references)
- [x] Document states "no runtime change"
- [x] Every runtime count labeled UNKNOWN
- [x] Parent unit (MATH-13) and Source Perpetuity gap identified
- [x] Two active paths fully mapped with clocks and file:line anchors
- [x] Missing telemetry table enumerates gaps for MATH-02/04/10/11/12/13
- [x] Amdahl hypothesis grounded in observed platform limits (50 subrequests, 10k neurons, GHA cron drift)

---

## 8. Next Action (if authorized)

SSAE-01 (Build an as-of-selection attention dataset) depends on this profile's boundary map and missing telemetry list. If MATH-13 accepts this profile as its prerequisite, SSAE-01 can proceed with a schema/query manifest for versioned source-action contexts. Otherwise, this profile remains a standalone audit artifact.

---

**Owner/Controller:** maintainer\
**Trigger:** next authorized mathematical maintenance task\
**Rollback:** N/A (no runtime change)