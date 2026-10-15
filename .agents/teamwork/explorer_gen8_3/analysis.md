# Comprehensive Investigation Report: Pipeline Loss Tracking, Employer Reconciliation & Invariants / Savepoint

**Investigator**: Explorer 3 (teamwork_preview_explorer)  
**Date**: 2026-10-14 / 2026-10-15  
**Working Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_gen8_3`  
**Reference Baseline**: `astra777.txt`, `docs/SYSTEM_SAVEPOINT.md`, `package.json`, Git branch `codex/verified-flow-directory-checkpoint`

---

## 1. Executive Summary

This investigation analyzes the complete end-to-end ingestion and filtering lifecycle of VA Freelance Hub, diagnoses empirical opening loss across high-confidence remote and VA employers hiring in the Philippines, inspects the current state of mathematical requirements (MATH-01 through MATH-13) and operational invariants, and audits the test execution configuration.

### Key Discoveries:
1. **Pipeline Loss Architecture**: A 13-stage loss funnel exists between authoritative source posting and physical public serving:
   `Authoritative Source -> Discovery -> Fetch -> Parse -> Normalize -> Dedup -> PH Eligibility -> Policy -> Role Gates -> Triage -> Scoring -> Qualification -> Publication`.
2. **Root Causes of Missing Openings**:
   - The primary bottleneck causing missing openings for prioritized employers (e.g., 28 fresh misses for Hunt St, 7 for Coconut VA, 16 for Pearl Talent) is **NOT** overly strict qualification or flawed policy; it is **intake throughput constraints**:
     - **Workable 2-slot Rotation Starvation**: Only 2 of 7 admitted Workable tenants can be polled per scrape tick (60-minute cadence), leaving 5 tenants stalled in `ROTATION_DEFERRED` or `COOLDOWN`.
     - **Intake Cap Deferral**: The per-run batch limit (50 items) defers fresh ATS items when RSS heads take slots;
     - **Undeployed Code**: Crucial local fixes (commit `1a484bcd` for shared intake cap fairness, commit `887b1f29` adding Hammerjack's Teamtailor RSS, commit `8ed6ff83` preserving structured-geo roles from AI disagreement, and commit `83e15e38` fixing title-APAC geo overrides) have **not yet been deployed to the live Cloudflare Pages cron**.
   - **Genuine Ineligibility vs False Negatives**: For employers like Pineapple Staffing (0 jobs), RocketAMS (2 misses), HelloRache (2 misses), Hammerjack (37 hybrid, 4 onsite, 7 stale), and Remote Craft (all stale), the absence of listings from the public board is **mathematically and constitutionally correct** (stale >30 days, US-locked, hybrid, or onsite). Confidence in an employer must never bypass per-vacancy verification.
3. **MATH 1-13 Status**: Formally accepted: **0/13**. While foundational and local integrity prerequisites have been implemented across migrations 0020-0068 and tested locally (366+ targeted passing tests), end-to-end operational daily throughput of 100–150 verified Philippines jobs remains uncertified.
4. **Operational Invariants**:
   - Strict per-vacancy geoGate: Enforced before AI triage; structured geo is protected from model hallucination/unavailability.
   - 30-day freshness window: Enforced at ingest and publication; nanosecond future withheld; no date fabrication.
   - Billing ceilings strictly enforced: <=200 req/src/day, <=500 AI/day, <=50,000 writes/day; AI subrequest budget capped at 15 per run.
   - Database mutations chunked at 3 items per physical batch to respect Cloudflare D1's 100-bound-parameter limit.

---

## 2. 13-Stage Pipeline Loss Tracking

The pipeline operates through 13 sequential stages from source extraction to public exposure. A failure or drop at any stage halts progression for that vacancy:

```
[1. Authoritative Source]
        │
[2. Discovery] ───────── Drop: Unregistered ATS token, inactive/shadow registry policy
        │
[3. Fetch] ───────────── Drop: Workable 2-slot rotation, 60m cadence, robots.txt, 304, HTTP error
        │
[4. Parse] ───────────── Drop: Schema mismatch, empty payload, null fields
        │
[5. Normalize] ───────── Drop: Invalid/missing sourceUrl, unresolvable apply link
        │
[6. Dedup] ───────────── Drop: URL already in D1 (active or inactive), batch intake cap (50 limit)
        │
[7. PH Eligibility] ──── Drop: geoGate ineligible (country_locked: US, AU, JP, etc.)
        │
[8. Policy] ──────────── Drop: Posting date >30 days old (STALE) or in future (FUTURE)
        │
[9. Role Gates] ──────── Drop: Non-remote workplace (explicit hybrid or onsite)
        │
[10. Triage] ─────────── Drop: AI ineligible, consensus split, AI budget exceeded (deferred)
        │
[11. Scoring] ────────── Drop: Category unmapped, dayshift unstated (falls to default/unknown)
        │
[12. Qualification] ──── Drop: Canary cap (max 2 items/tick/canary source)
        │
[13. Publication] ────── Drop: D1 batch insert failure, snapshot lag / serving staleness
```

### Stage Details and Observable Drop-offs:

1. **Stage 1: Authoritative Source**
   - *Mechanisms*: Employer careers portal, public ATS APIs (Workable widget JSON, Breezy `/json`, Ashby job-board API, Lever JSON, Greenhouse boards JSON), and RSS feeds (Teamtailor, Remotive, WWR, Jobicy, RemoteOK).
   - *Loss Modes*: Source careers page unreachable, API deprecation, private/unlisted endpoints.

2. **Stage 2: Discovery**
   - *Mechanisms*: `packages/scraper/sources.ts` (static sources), `va_directory` table, `source_registry` table in D1, merged via `mergeRegistryAtsSources(atsAgencies, registryPolicies)`.
   - *Code Evidence*: `apps/web/src/pages/api/cron/scrape.ts:1016-1037`, `2307`.
   - *Loss Modes*:
     - Uncataloged employer (e.g., Hammerjack prior to commit `887b1f29` was in directory with no ATS token and missing from `sources.ts`).
     - Registry policy not in `active` or `canary` operational state (`packages/scraper/policy-resolver.ts`).
     - Soft-hidden directory entries (`soft_hide = 1` or broken links).

3. **Stage 3: Fetch**
   - *Mechanisms*:
     - **Workable 2-Slot Rotation**: `selectWorkableRotation` (`apps/web/src/lib/workable-rotation.ts`). Slices sorted Workable tenants down to at most 2 active fetch slots per run.
     - **Cadence Skips**: `atsFetchCadenceSkip(platform, lastAttemptAt, observedAt, 60_000 * 60)`. Enforces 60-minute quiet period per source.
     - **Robots Gate**: `checkRobots(atsUrl, { mode, store })`.
     - **Conditional Request (304)**: `notModified === true` when ETag or bodyHash matches previous fetch state.
   - *Loss Modes*: Rotation starvation (5 of 7 Workable tenants skipped per tick), cooldown skips, robots blocks, network timeout (AbortSignal 15s).

4. **Stage 4: Parse**
   - *Mechanisms*: `fetchATSFeed` (`packages/scraper/ats.ts`), `fetchRSSFeed` (`packages/scraper/rss.ts`), `fetchJSONSource` (`packages/scraper/json.ts`).
   - *Code Evidence*: Workable widget returns `{ jobs: [...] }` where `description` is always `null` in the account widget endpoint!
   - *Loss Modes*: Non-JSON response, malformed XML, missing title or URL fields.

5. **Stage 5: Normalize**
   - *Mechanisms*: `normalizeScrapedItems(rawItems)` (`apps/web/src/pages/api/cron/scrape.ts:102-128`).
   - *Filters*: `sanitizeSourceUrl(item.sourceUrl)` drops URLs with invalid schemes; `sanitizeApplyUrlForSource` checks cross-company anomalous hosts.
   - *Loss Modes*: Missing `sourceUrl` (`droppedNoUrl`), unresolvable apply URLs fallback to source listing.

6. **Stage 6: Dedup & Intake Slicing**
   - *Mechanisms*: `omitKnownSourceUrls(allItems, existingUrls)` (`scrape.ts:2669`) and `selectIntakeBatch(newItems, limit)` (`scrape.ts:2726`).
   - *Code Evidence*: All known URLs (both active opportunities and inactive rejected/stale rows) are in `existingUrls`.
   - *Loss Modes*:
     - Legitimate dedup: previously processed job is dropped (expected).
     - **Intake Cap Deferral**: Default per-run limit is 50. If 150 new items arrive, 50 are selected and 100 deferred (`intake.deferred`).

7. **Stage 7: PH Eligibility**
   - *Mechanisms*: `geoGate` (`packages/scraper/geoGate.ts`). Runs BEFORE any AI triage call.
   - *Filters*:
     - Ineligible scopes: `country_locked` (e.g. US, Australia, UK, Japan, Canada), `us_citizens_only`, `local_only`, `non_english_local`.
     - Eligible scopes: `ph_only`, `apac_incl_ph`, `worldwide`, `unknown`.
   - *Code Evidence*: Ineligible items are written to `rejectedItems` with `isActive: false`, `inactiveReason: "policy-rejected"`, `tags: ["geo-gate-rejected"]`.
   - *Recent Invariant*: Title APAC token does NOT override structured country location (commit `83e15e38`).

8. **Stage 8: Policy & Freshness**
   - *Mechanisms*: `assessPostingFreshness(item.postedAt, observedAt)` (`packages/scraper/publication-freshness.ts`).
   - *Filters*:
     - Posting instant must be within 30 inclusive days (`WITHIN_WINDOW`).
     - Sub-millisecond future dates, invalid dates, and dates > 30 days old are withheld (`postingFreshnessWithheld`).
   - *Code Evidence*: `inactiveReason: "posting-freshness-stale"` or `"posting-freshness-future"`.

9. **Stage 9: Role Gates (Workplace Type)**
   - *Mechanisms*: `locationType` check and `noExplicitNonRemoteWorkplace` (`apps/web/src/lib/publication-remote.ts`).
   - *Filters*: Explicitly onsite (`locationType === "onsite"`, "(onsite)" in locationRaw) or hybrid roles are rejected.

10. **Stage 10: Triage**
    - *Mechanisms*: `decideTriage(item, { geoScope }, aiEnv)` (`packages/scraper/triage-decision.ts`).
    - *Constraints*:
      - Concurrency: 2.
      - Per-run subrequest budget: `AI_SUBREQUEST_BUDGET_PER_RUN = 15`. Once exhausted, remaining gate-passed items are persisted as `pendingItems` (`pending-triage`) for subsequent ticks.
      - Consensus Check: For `geoScope === "unknown"`, an L2 skeptic evaluates the initial AI verdict. If split, quarantined (`consensusQuarantined`).
      - Core Invariant (Commit `8ed6ff83`): If `geoGate` already verified `ph_only`, `apac_incl_ph`, or `worldwide`, an AI model disagreement or AI provider outage does NOT reject the listing.

11. **Stage 11: Scoring & Shift Classification**
    - *Mechanisms*: `classifyShift(title, description)` (`packages/scraper/shiftClassifier.ts`), `mapTriageCategoryToUiCategory`.
    - *Constraint*: `classifyShift` returns `day_shift` ONLY for explicit stated phrases (e.g. "Day Shift", "Day Shift, Remote (PH)"). General company location (e.g. Australian client) without schedule claim remains `unknown`.

12. **Stage 12: Qualification (Canary Controls)**
    - *Mechanisms*: `publishGroupedInserts` with canary cap enforcement (`canary_max_new_items_per_tick = 2` for canary sources in `source_registry`).
    - *Constraint*: Canary sources publish at most 2 new listings per tick to prevent unverified flooding.

13. **Stage 13: Publication & Serving**
    - *Mechanisms*: D1 batch insert into `opportunities` table in chunks of 3 (`D1_INSERT_BATCH_SIZE = 3`), updating snapshot in `public_serving_snapshot` (`0054_public_serving_snapshot.sql`).
    - *Edge Cache*: Public board serves from Cloudflare Edge memory/D1 snapshot with 5-minute bounded TTL (`PAGES_SNAPSHOT_RELEASE_2026-10-13.md`).

---

## 3. Vetted Employer Root Cause Reconciliation

A systematic audit was conducted against the empirical evidence recorded in `astra777.txt` (Oct 14 audit) and live code logic for prioritized high-confidence employers:

| Employer | ATS / Source ID | Discovered Roles | Qualified (PH + Remote + Fresh <=30d) | Published on Live Board | Missing / Unaccounted | Exact Drop-off Stage & Root Cause Diagnosis | Actionable Remedy |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Hunt St** | `workable:hunt-st` | 135 | 79 | 51–52 | 27–28 | **FETCH (Rotation Starvation) & DEDUP (Intake Cap Deferral)**: Only 2 Workable slots per tick; 79 qualified items exceed the 50-limit batch cap; live Pages cron has not loaded shared-cap commit `1a484bcd`. | Deploy commit `1a484bcd` to Pages cron; sequential ticks will ingest deferred backlog. |
| **Coconut VA** | `workable:coconutva` | 30–31 | 10–11 | 3–4 | 7 | **FETCH (Rotation Starvation) & DEDUP (Cap Deferral)**: Same Workable 2-slot rotation and undeployed intake cap. Note: 1 role ("International Talent Pool") has US scalar country and is correctly held at PH Eligibility. | Deploy shared intake cap. Maintain strict US scalar location hold. |
| **CrewBloom** | `workable:crewbloom` | 149 | 7 | 6 | 1 | **DEDUP (Cap Deferral)**: Single missing role ("Bookkeeper (QuickBooks Online)") was cap-deferred beside newer RSS items on live cron. | Deploy shared intake cap to cron. |
| **Pearl Talent** | `workable:pearltalent` | 286–292 | 25–27 | 11–18 | 8–16 | **FETCH (Rotation Starvation) & DEDUP (Cap Deferral)**: Pearl Talent is rotated behind Hunt/Coconut; cap-deferred on fetch. Other 265 roles are country-locked or stale. | Deploy shared intake cap; Workable rotation will cycle through. |
| **Hammerjack** | `hammerjack` (Teamtailor RSS) | 53 | 5 | 0 | 5 | **DISCOVERY & PUBLICATION DEPLOYMENT**: Feed was missing from scraper config until commit `887b1f29`. In feed: 5 fully remote PH roles, 37 hybrid, 4 onsite, 7 stale. 0 public because commit is not deployed to live cron. | Deploy commit `887b1f29` to Pages cron. Hybrid/onsite remain properly filtered. |
| **MultiplyMii** | `ashby:multiplymii` | 57 | 32 | 31 | 1 | **TRIAGE (Model Disagreement before fix)**: 1 missing ("Implementation Specialist (Quickbooks / NetSuite)", Ashby ID `d3b62dba...`). Commit `8ed6ff83` protects structured geo against AI rejection, pending deploy. | Deploy commit `8ed6ff83` to Pages cron. |
| **20Four7VA** | `breezy:20four7va` | 112 | 86–87 | 87 | 0 | **RECONCILED (0 Missing)**: 100% of fresh, remote, PH-eligible openings are published. Suspected missing CPT-11528 was verified present (search term limit was >8 words). | None required. Verified clean intake. |
| **Pineapple Staffing** | `workable:pineapple-staffing` | 3 | 0 | 0 | 0 | **CONSTITUTIONAL ZERO (0 Missing)**: 3 open roles from 2020–2022 are US telecommuting and STALE (>3 years old). Zero public count is mathematically correct. | Maintain strict rejection. Employer trust must never bypass date/geo gates. |
| **RocketAMS** | `workable:rocketams` | 9 | 7 | 7 | 0 | **CONSTITUTIONAL ZERO (0 Missing)**: 7 public. 2 absences are Japan (stale) and Australia (country-locked). Zero false negatives. | Maintain strict rejection of country-locked roles. |
| **HelloRache** | `workable:hello-rache` | 3 | 1 | 1 | 0 | **CONSTITUTIONAL ZERO (0 Missing)**: 1 public. 2 absences are US healthcare roles from stale dates. Zero false negatives. | Maintain strict rejection of US-only roles. |
| **Sourcefit** | `breezy:sourcefit` | 88 | 34 | 34 | 0 | **RECONCILED (0 Missing)**: 34 fresh remote PH published. Eastwood onsite listings correctly excluded. | None required. |
| **Yokly** | `breezy:yokly` | 11 | 5 | 5 | 0 | **RECONCILED (0 Missing)**: All 5 fresh PH listings published. | None required. |
| **VALUE Virtual Assistants** | `breezy:value-virtual-assistants` | 11 | 3 | 3 | 0 | **RECONCILED (0 Missing)**: All 3 fresh PH listings published. | None required. |
| **Remote Craft** | `breezy:remote-craft` | - | 0 | 0 | 0 | **CONSTITUTIONAL ZERO**: All PH roles are >30 days stale. Fresh qualified count is 0. | None required. Correctly withheld. |

---

## 4. Current State of Operational Invariants & MATH 1-13

### A. Operational Invariants Status

1. **Strict Per-Vacancy geoGate**:
   - Location: `packages/scraper/geoGate.ts`.
   - Invariant: Evaluates every opening independently. No company-level allowlist exists.
   - Verification: Calling `geoGate` with US location, "(onsite)", or explicit foreign locks returns `ineligible`.
   - Protected Fix: Commit `83e15e38` ensures title token `APAC` does not override structured country location (e.g. Jobicy "Director of Customer Success, APAC" located in Australia is `country_locked`).
   - Protected Fix: Commit `8ed6ff83` ensures structured geo scopes (`ph_only`, `apac_incl_ph`, `worldwide`) are not unpublished if Workers AI disagrees or fails.

2. **30-Day Freshness Window**:
   - Location: `packages/scraper/publication-freshness.ts` (`assessPostingFreshness`).
   - Invariant: Posting instant must be within 30 inclusive days before evaluation instant (`observedAt`). Sub-millisecond future dates are withheld. Stale dates (>30 days) are withheld. Missing dates fail closed as unknown.
   - Verification: Passed all 34 adversarial tests in `publication-freshness.test.ts`.

3. **Production Billing Ceilings**:
   - Request Ceiling: `<= 200 requests/source/day`.
   - AI Spend Ceiling: `<= 500 AI calls/day`.
   - Database Write Ceiling: `<= 50,000 writes/day`.
   - Single-Run Subrequest Guard: `AI_SUBREQUEST_BUDGET_PER_RUN = 15` in `scrape.ts` to guarantee compliance with Cloudflare Workers Free plan's 50 subrequests/invocation limit.

4. **Idempotency, Deduplication & Batch Protection**:
   - Dedup: `omitKnownSourceUrls` drops URLs present in `opportunities` table.
   - Idempotent Writes: `onConflictDoNothing()` on unique constraints (`source_url`, `content_hash`).
   - D1 Parameter Limits: Inserts are partitioned into chunks of 3 (`D1_INSERT_BATCH_SIZE = 3`) to stay strictly below Cloudflare D1's 100-bound-parameter ceiling (3 rows * ~28 columns = 84 parameters <= 100).

### B. MATH 1-13 Requirements Status Matrix

| ID | Challenge Name | Mathematical / Operational Objective | Current Implementation State | Production Rollout Gap |
| :--- | :--- | :--- | :--- | :--- |
| **MATH-01** | Dynamic Source Allocation | Constrained source allocation & multi-armed bandit | OPEN (0/1). Static rotation in `selectWorkableRotation`. | Needs empirical yield/cost data per source. |
| **MATH-02** | Queueing & Backpressure | Intake queue capacity & subrequest backpressure | OPEN (0/1). `AI_SUBREQUEST_BUDGET_PER_RUN = 15` and `selectIntakeBatch` implemented. | Live queue telemetry across full 24h unverified. |
| **MATH-03** | Marginal Portfolio Coverage | Marginal fresh yield over source overlap | OPEN (0/1). Baseline overlap analysis recorded in lake scripts. | Unified incremental yield scoring not wired into cron. |
| **MATH-04** | Arrival Modeling & Adaptive Polling | Poisson arrival & host backoff | DELIVERED in part. Migration 0051 (`shadow_host_backoff.sql`) and 60m cadence active. | Adaptive Poisson polling not dynamic. |
| **MATH-05** | Qualification & Calibration | False negative & false positive rate calibration | OPEN (0/1). Denominator defect fixed in test metrics. | Controlled live evaluation before publication needed. |
| **MATH-06** | Publication States & Guarded Transitions | Finite state machine, uncertainty, idempotent receipts | OPEN (0/1). Migrations 0056-0068 define publication ledger and uncertainty receipts. | Multi-tick atomic gateway release pending deployment. |
| **MATH-07** | Reservoir Value & Freshness Decay | Time-decay value & 30-day window | OPEN (0/1). Strict 30d freshness cutoff implemented. | Empirical value decay curve unmodeled. |
| **MATH-08** | Diversity & Correlated Failure Risk | Portfolio concentration & single-point-of-failure risk | OPEN (0/1). `portfolio-concentration.ts` exists. | Unwired from real-time scheduler. |
| **MATH-09** | Canonical Identity & Record Linkage | Cross-posting dedup & entity linkage | OPEN (0/1). URL dedup and content hashing active. | Cross-platform entity resolution not automated. |
| **MATH-10** | Change Detection & Work Avoidance | ETags, HTTP 304, bodyHash matching | OPEN (0/1). Migration 0020 conditional fetch state active. | Invalidation coverage verification pending. |
| **MATH-11** | Cost-Aware AI Cascade | Hierarchical model ladder & free-tier preservation | OPEN (0/1). Workers AI -> Gemini -> Groq ladder in `triage-decision.ts`. | Dynamic cost optimization unwired. |
| **MATH-12** | Statistical Source Health Monitoring | CUSUM / EWMA error rates & automated quarantine | OPEN (0/1). Source fetch events logged; pause logic active. | Formal sequential analysis / CUSUM unintegrated. |
| **MATH-13** | End-to-End Latency & Amdahl Analysis | Stage profiling & critical path analysis | OPEN (0/1). Run duration and stage metrics logged in ingest diagnostics. | Standardized end-to-end profile across full runs needed. |

**Overall Mathematical Status**: **0/13 Accepted** in production. No mathematical requirement can be marked complete without end-to-end reproducible live certification.

---

## 5. Test Execution and Runner Architecture

- **Test Framework**: Bun test v1.3.14 (`bun test`).
- **Test Config** (`package.json:14`):
  ```sh
  bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper ./packages/db ./apps/web/tests ./scripts/ci ./scripts/gha ./scripts/diagnostics ./scripts/lake ./workers/freshness-cron/src ./scripts/gcp
  ```
- **Typecheck**: `bunx tsc --noEmit -p apps/web/tsconfig.json`
- **Build**: `bun run --cwd apps/web build`
- **Key Targeted Suites Verified**:
  - `apps/web/tests/rotation-vs-intake.test.ts` (3/3 pass): Separates Workable rotation misses from intake cap deferral.
  - `apps/web/tests/followup-intake-gates.test.ts` (3/3 pass): Proves deferred ATS items pass on follow-up runs while bad items are rejected.
  - `apps/web/tests/intake-fairness.test.ts` (3/3 pass): Proves shared cap fair allocation.
  - `packages/scraper/geoGate.test.ts` (30/30 pass): Proves strict geographic boundary rules.
  - `packages/scraper/publication-freshness.test.ts` (34/34 pass): Proves 30-day age and future date rejection.
  - `packages/scraper/triage-decision.test.ts` (9/9 pass): Proves structured geo resilience and consensus splits.
  - `packages/scraper/shiftClassifier.test.ts` (15/15 pass): Proves strict dayshift evidence classification.
  - `packages/scraper/teamtailor-rss-workplace.test.ts` (4/4 pass): Proves Hammerjack Teamtailor remoteStatus parsing.

---

## 6. Actionable Implementation & Deployment Roadmap

To achieve the objective of scaling toward 100–150 newly published verified Philippine-eligible remote jobs per day without violating constitutional invariants:

1. **Deploy Committed Local Slices to Cloudflare Pages Cron**:
   - Commits `1a484bcd` (fair intake cap), `887b1f29` (Hammerjack Teamtailor RSS), `8ed6ff83` (structured geo triage override), and `83e15e38` (title APAC pin fix) are currently committed locally on `codex/verified-flow-directory-checkpoint` but **undeployed to production Pages**.
   - Immediate gain upon deployment:
     - Hammerjack: +5 fresh verified remote jobs.
     - Hunt St: Unblocks 28 deferred fresh jobs across subsequent ticks.
     - Coconut VA: Unblocks 7 deferred fresh jobs.
     - Pearl Talent: Unblocks 16 deferred fresh jobs.
     - MultiplyMii: Protects 1 missing NetSuite role from triage rejection.
     - Total immediate newly published jobs: **~57 high-confidence verified openings**.

2. **Reconcile Workable Rotation Scheduling**:
   - Currently, 7 admitted Workable canaries are throttled by `selectWorkableRotation` (2 slots/tick, 60m interval).
   - At 144 ticks/day (10-minute cron), each tenant gets ~41 opportunities to be selected per day, which is sufficient if intake cap deferral is eliminated and lastAttemptAt is respected.
   - Do **NOT** raise the 2-slot limit until production lastAttemptAt latency is measured under the new shared intake batching.

3. **Dayshift Classification Hygiene**:
   - Maintain the strict invariant in `classifyShift`: Australian/APAC client without explicit schedule remains `unknown`. Never fabricate schedule claims. Only roles stating "Day Shift", "AU business hours", or "APAC daytime" receive the `day_shift` tag.
