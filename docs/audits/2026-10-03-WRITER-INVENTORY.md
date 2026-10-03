# Writer Inventory — Every Path That Inserts, Reactivates, or Publishes Rows

**Generated:** 2026-10-04 | **Session:** v6.2 shift | **Branch:** `opencode/shift-20261003-2357` | **HEAD:** `4d2e61c244338f76398e76444c1b80651925c848` | **Evidence:** VERIFIED_CODE

---

## Summary

| # | Writer Path | Trigger | Authority Check | Receipt | Bypasses Gateway? |
|---|-------------|---------|-----------------|---------|-------------------|
| 1 | `scripts/lake/sync-to-d1.ts` (buildSyncSql) | CLI `bun run lake:sync`, GHA `gha-lake-publish.yml` (17 4,16 * * *), GCP `lake-publish-job` (hourly :47) | Hard-coded `BASE_AUTHORIZED_SOURCE_IDS` + `decideAutoPublish` on `lake_ats_discovery.auto_approved` | `buildPublicationReceiptSql` writes ledger but `published_ids_json='[]'`; `published_count = candidate count` | **YES** — raw INSERT, never calls `publishPublicExposure` |
| 2 | `packages/scraper/publication-gateway.ts` (`publishPublicExposure`) | Called by #3, #4, #5, #6 | `loadPublicationPolicy` → registry + `source_opt_outs` + lease expiry + canary cap | `INSERT_LEDGER_SQL` with actual `published_ids_json` | N/A — this IS the gateway |
| 3 | `apps/web/src/lib/publish-opportunities.ts` (`publishGroupedInserts`, `publishGroupedActivations`) | Scrape inline, drain, reactivate, gate-eligible, ingest | Delegates to gateway | Delegates to gateway | NO — uses gateway |
| 4 | `apps/web/src/pages/api/cron/scrape.ts` (inline scrape) | Cloudflare Worker cron (10min), GHA `gha-hunter-pulse.yml` (15min) | Registry overlay + `loadPublicationPolicy` via gateway | Via gateway | NO — uses gateway when `publicationDb` present |
| 5 | `apps/web/src/pages/api/cron/scrape.ts` (pending-triage drain) | Same as #4, when `DRAIN_PENDING_TRIAGE=1` or AI keys present | Via gateway | Via gateway | NO — uses gateway |
| 6 | `apps/web/src/pages/api/cron/scrape.ts` (`recoverGateEligiblePending`) | Same as #4, inline path | **BYPASSES GATEWAY** when `publicationDb` is null (lines 584-586) | No ledger write when bypassing | **YES** — direct `db.update` when no `publicationDb` |
| 7 | `apps/web/src/pages/api/cron/scrape.ts` (`reactivateFeedConfirmedJobs`) | Same as #4, after dedup | **BYPASSES GATEWAY** when `publicationDb` is null (lines 636-642) | No ledger write when bypassing | **YES** — direct `db.update` when no `publicationDb` |
| 8 | `apps/web/src/pages/api/ingest.ts` | Authorized POST to `/api/ingest` | `normalizeOpportunityForInsert` → geoGate; **sourceId from client** (line 60) | Via gateway when `publicationDb` present (line 162) | **YES** — direct insert when no `publicationDb` (lines 166-168) |
| 9 | `scripts/graduation/*.ts` (e.g., `promote-proven-shadow-canary.ts`) | Manual execution | `decideTypedTransition` + manual evidence review | `source_transition_events` insert | **YES** — raw D1 via wrangler, no gateway |
| 10 | `packages/db/migrations/0052_founder_fast_track_canary_graduation.sql` | CI migration apply | Founder directive (no registry gate) | Trigger `source_registry_state_requires_transition_event` | **YES** — raw SQL, drops/recreates trigger |
| 11 | `scripts/lake/auto-publish-policy.ts` (`decideAutoPublish`, `concentrationAllowance`) | Called by #1 | Wilson lower bound, Jev, concentration (when inventory supplied) | Returns decision, no ledger | N/A — policy helper, not writer |

---

## Detailed Writer Analysis

### 1. `scripts/lake/sync-to-d1.ts` — Lake → D1 Sync (PRIMARY BYPASS)

**File:** `scripts/lake/sync-to-d1.ts:162-201` (buildSyncSql), `353-372` (sync loop), `204-220` (buildPublicationReceiptSql)
**Trigger:** `bun run lake:sync` (GHA `gha-lake-publish.yml`: `17 4,16 * * *` 2x/day; GCP `lake-publish-job`: hourly at :47 UTC; manual)
**Authority:**
- Hard-coded `BASE_AUTHORIZED_SOURCE_IDS` (lines 27-40): exact-six + himalayas + 5 breezy
- `decideAutoPublish` on `lake_ats_discovery` where `review_status = 'auto_approved'` (lines 111-133)
- **No** `source_registry` query, **no** `source_opt_outs` check, **no** lease expiry check
- `fetchD1InventorySnapshot` called but **optional** (line 277); when null, `concentrationAllowance` returns `UNKNOWN` and allows full cohort (auto-publish-policy.ts:79-80)

**Receipt:** `buildPublicationReceiptSql` (lines 204-220)
- `published_count = candidate count` (counts reactivations as publications)
- `published_ids_json = '[]'` (empty array — no actual opportunity IDs recorded)
- `mode = 'unlimited'`
- Written **after** all upserts succeed (line 371), not atomically

**Hard-coded schema values (line 190-193):**
- `type = 'freelance'` (maps to JSON-LD `CONTRACTOR` via `apps/web/src/pages/jobs/[id].astro:161-163`)
- `location_type = 'remote'`
- `scraped_at = datetime('now')` — **ADR-002 violation**: sync event timestamp used instead of preserving unknown posting date
- `last_seen_in_feed_at = datetime('now')` — same ADR-002 concern

**Reactivation (ON CONFLICT, lines 195-199):**
```sql
ON CONFLICT(source_url) DO UPDATE SET
  last_seen_in_feed_at = datetime('now'),
  is_active = 1,
  ph_eligibility = excluded.ph_eligibility,
  geo_scope = excluded.geo_scope;
```
— **Reactivates ANY conflicting URL** including rows archived by verifier (`inactive_reason='verifier-failed'`), triage (`'triage-rejected'`), or takedown (`'takedown-archived'`). No check for prior inactivation reason.

**Gap (F1/F4/F2/ADR-002):** Primary lake bypass. Raw INSERT without gateway enforcement; empty receipt IDs; concentration guard disconnected; ADR-002 date honesty violated.

---

### 2. `packages/scraper/publication-gateway.ts` — The Gateway (AUTHORITATIVE PATH)

**File:** `packages/scraper/publication-gateway.ts`
**Trigger:** Called by writers #3, #4, #5, #6, #8
**Authority Checks (in `loadPublicationPolicy`, lines 99-135):**
1. `source_opt_outs` lookup (line 103) — checked FIRST
2. `source_registry` query (line 106)
3. **F4 Repair:** Missing registry → only exact-six (`LEGACY_EXACT_SIX_SOURCE_IDS`, lines 89-97) gets fallback `allowed/active`; all others get `needs_review/candidate` (lines 107-127)
4. Opt-out merges: effective opt-out → `blocked/retired` (lines 129-135)
5. Policy expiry check (line 207)
6. Compliance state must be `allowed` or `conditional` (line 212)
7. Operational state must be `active` (line 213) — **canary handled separately (lines 167-203)**

**Canary Logic (lines 167-203):**
- `decideCanaryPublication` enforces `canaryMaxNewItemsPerTick`
- Cumulative tick reservation via `LOAD_TICK_SUM_SQL` (line 164)
- Rollback to shadow on cap breach or policy expiry (lines 178-188)

**Receipt:** `insertLedger` (lines 233-253)
- `published_ids_json` contains **actual IDs** from `persist` callback
- `published_count` clamped to `proposed_count` (lines 263-268)
- Written **before** returning success (lines 229, 202)

**Idempotency:** `retryKey` deduplication (lines 158-161) — replays return prior result

**Gap:** Persistence occurs **before** ledger insert (lines 226, 199) — if ledger fails, row is already public with no receipt. No atomic reservation across writers.

---

### 3. `apps/web/src/lib/publish-opportunities.ts` — Gateway Adapter

**File:** `apps/web/src/lib/publish-opportunities.ts`
**Functions:**
- `publishGroupedInserts` (lines 42-76): Groups by `sourceId`, clamps canary proposal, calls gateway
- `publishGroupedActivations` (lines 78-110): For reactivations, groups by `sourceId`, calls gateway
- `canaryClampedProposal` (lines 26-40): Pre-clamps to canary cap to avoid gateway rollback

**Source ID Canonicalization (line 14-16):** `canonicalPublicationSourceId` → invalid/null → `"unattributed"` (falls into exact-six fallback)

**Gap:** When `publicationDb` is null (no D1 binding), callers bypass entirely (see #6, #7, #8).

---

### 4. `apps/web/src/pages/api/cron/scrape.ts` — Inline Scrape (MAIN PRODUCTION WRITER)

**File:** `apps/web/src/pages/api/cron/scrape.ts`

**Publication Paths:**

| Path | Lines | Gateway? | Notes |
|------|-------|----------|-------|
| Inline eligible insert | 2811-2834 | YES (when `publicationDb`) | `publishGroupedInserts` |
| Inline eligible insert (no gateway) | 2835-2863 | **NO** | Direct `db.insert().onConflictDoNothing()` |
| Pending-triage drain | 495-514 | YES (when `publicationDb`) | `publishPublicExposure` per item |
| Gate-eligible pending recovery | 570-612 | **PARTIAL** | Bypasses when `!publicationDb` (584-586) |
| Feed-confirmed reactivation | 614-672 | **PARTIAL** | Bypasses when `!publicationDb` (636-642) |
| Rejected/pending persistence | 2865-2915 | N/A | Inactive rows only, no gateway needed |

**Source ID:** From `attachSourceIdentity` (SP-01) — exact configured identity on every item.

**Registry Overlay (lines 1945-1959):** Loads `source_registry` policies per-tick; **aborts entire run if unavailable** (503). This is the only writer that fails closed on missing registry.

---

### 5. `apps/web/src/pages/api/ingest.ts` — Direct Ingest API

**File:** `apps/web/src/pages/api/ingest.ts`
**Trigger:** Authorized POST with `{ items: [...] }`
**Authority:**
- `normalizeOpportunityForInsert` (lines 40-87): Runs `geoGate`, sets `isActive` based on PH eligibility
- **Source ID from client** (line 60): `str(input.sourceId)?.toLowerCase() ?? null` — **no server-side validation against registry**
- `canonicalPublicationSourceId` in gateway maps invalid → `"unattributed"`

**Receipt:** Uses `publishGroupedInserts` when `publicationDb` (line 162); **direct insert when null** (lines 166-168)

**Gap:** Client-controlled `sourceId` with no registry validation at ingest time. Gateway only sees `"unattributed"` for invalid IDs.

---

### 6. `scripts/graduation/*.ts` — Source Promotion Scripts

**Files:** `scripts/graduation/promote-proven-shadow-canary.ts`, `execute-september-24-graduation.ts`, etc.
**Trigger:** Manual execution by maintainer
**Authority:** `decideTypedTransition` (transition-plane) with evidence from `source_admission_current_evidence` and `source_admission_qualifying_observations`
**Action:** Raw D1 writes via `wrangler d1 execute --remote`:
1. `INSERT INTO source_transition_events` (line 176-186)
2. Implicit `source_registry` update via trigger (migration 0041/0052)

**Gap:** No `publishPublicExposure` involvement. Promotion = registry state change only; publication happens on next scrape tick via gateway.

---

### 7. `packages/db/migrations/0052_founder_fast_track_canary_graduation.sql` — Migration Writer

**File:** `packages/db/migrations/0052_founder_fast_track_canary_graduation.sql`
**Trigger:** `ci-guardrail.yml` release job (auto-applies on push to main)
**Actions:**
1. `DROP TRIGGER IF EXISTS source_registry_state_requires_transition_event` (line 17)
2. `UPDATE source_registry SET operational_state = 'canary'...` (lines 20-33) — 8 sources at once
3. `UPDATE va_directory` (lines 36-40)
4. `CREATE TRIGGER source_registry_state_requires_transition_event` (lines 43-63)

**Gap:** 
- Drops the append-only transition trigger (violates ADR-008 tiered shadow)
- Promotes 8 sources simultaneously (violates "one provider at a time" in SP plan)
- No shadow observation evidence required — founder directive bypasses SP-23B/C
- Auto-applied on merge — no separate approval gate

---

### 8. `scripts/lake/auto-publish-policy.ts` — Policy Helper (NOT a writer)

**File:** `scripts/lake/auto-publish-policy.ts`
**Role:** Pure functions used by writer #1
**Key Behaviors:**
- `concentrationAllowance` (lines 74-113): Returns `UNKNOWN` when `inventory` is null or `activeTotal < 100` — **allows full cohort** (line 80)
- `decideAutoPublish` (lines 115-166): Wilson floor 20% (NOT in ACCEPTED_PARAMETERS), Jev 0.7 confidence (IS in params)
- **Jev ADMIT ≥0.7 publishes with "No human approval"** (line 138-140) — contradicts Constitution L1 ADVISE

---

## Additional Writers (Not in Original Inventory)

### 9. `packages/db/migrations/0031_remotephjobs_incident_repair.sql`
**Trigger:** CI migration apply
**Action:** UPDATE `opportunities` (lines 8-22) and `va_directory` (lines 24-51) — incident repair for remotephjobs.com misattribution

### 10. `packages/db/migrations/0046_reconcile_breezy_onsite_and_unclear_eligibility.sql`
**Trigger:** CI migration apply
**Action:** UPDATE `opportunities` (4 statements, lines 35-79) — Deactivates onsite Sourcefit, upgrades remote Sourcefit to `eligible_verified`, upgrades 20Four7VA to `eligible_likely`, reconciles gate-eligible pending rows

### 11. `packages/db/migrations/0047_deactivate_shadow_candidate_jobs_and_unclear_titles.sql`
**Trigger:** CI migration apply
**Action:** UPDATE `opportunities` (4 statements, lines 35-90) — Deactivates shadow/candidate/quarantined source jobs, deactivates Nearform country-locked, upgrades Yokly PH, deactivates unclear eligibility

---

## Lake Miner & Auto-Admission (Discovery → Lake → D1 Pipeline)

### `scripts/lake/domain-ats-discovery.ts` — Miner Auto-Admission
**Trigger:** GHA `gha-lake-miner.yml` (`23 */3 * * *` every 3 hours), manual `bun run lake:mine`
**Process:**
1. Probes Ashby/Breezy/Greenhouse/Lever/Workable public endpoints (lines 95-199)
2. **Ashby** (`api.ashbyhq.com/posting-api/job-board/{token}`): JSON API, robots "observe" (no crawl)
3. **Breezy** (`{tenant}.breezy.hr/json`): JSON endpoint, robots "observe"
4. **Robots handling:** Lake fetchers use `robotsHandling: "observe"` (ashby-canary.ts:48, breezy-canary.ts:52) — **no robots decision enforced**, just observed
5. Evaluates tenant via `decideAdmissionDeterministic` (lines 266-285): PH rate ≥20% + ≥3 jobs → `auto_approved`
6. Jev advisory fallback (`decideAdmission`, lines 293-326): advisory only, deterministic threshold enforces
7. Writes to `lake_ats_discovery` with `review_status = 'auto_approved'` (line 812)

**COMP-01C / COMP-01D:** Ashby and Breezy are the two ATS families with COMPLIANCE-01C/01D designations in source policy — lake miner probes them but **robots is observe-only, no blocking decision**.

### `scripts/lake/run-lake-miner.ts` — Orchestration
- Calls `domain-ats-discovery.ts` then triggers `lake:sync` (which calls `sync-to-d1.ts`)
- Agent-triggered GCP `lake-publish-job` runs hourly at :47 UTC (Cloud Scheduler)

### Remotive Source
- **Source config:** `packages/scraper/sources.ts:40-51` — RSS feed at `https://remotive.com/remote-jobs/feed`
- **Type:** `rss`, `collectionMethod: "rss_feed"`
- **JSON-LD/Sitemap:** Remotive provides RSS feed; JSON-LD structured data on job pages not harvested by current scraper
- **Robots:** In `ROBOTS_ENFORCE_SOURCE_IDS` (scrape.ts:54) — enforced for exact-six sources

---

## Migration Writers (Auto-Applied on Merge via `ci-guardrail.yml`)

| Migration | File | Key Actions |
|-----------|------|-------------|
| 0031 | `0031_remotephjobs_incident_repair.sql` | UPDATE opportunities/va_directory — incident repair |
| 0046 | `0046_reconcile_breezy_onsite_and_unclear_eligibility.sql` | 4 UPDATE statements on opportunities |
| 0047 | `0047_deactivate_shadow_candidate_jobs_and_unclear_titles.sql` | 4 UPDATE statements on opportunities |
| 0052 | `0052_founder_fast_track_canary_graduation.sql` | DROP TRIGGER, UPDATE source_registry (8 sources), UPDATE va_directory, CREATE TRIGGER |

---

## Trigger → Dispatch → Decision → Write → Receipt → Public Visibility → Rollback Trace

### Lake Sync (#1)
```
Trigger: GHA gha-lake-publish.yml (17 4,16 * * *) / GCP lake-publish-job (47 * * * *) / manual
  → Dispatch: syncQualifiedJobsToD1(limit, dryRun, {holdAutoApproved})
  → Decision: planAutoPublishSources() → decideAutoPublish() per tenant
  → Write: buildSyncSql() → raw INSERT ON CONFLICT (reactivates verifier/triage/takedown rows) + buildPublicationReceiptSql()
  → Receipt: source_publication_ledger (published_count=candidate count, published_ids_json='[]')
  → Public Visibility: Immediate (is_active=1)
  → Rollback: NONE — no compensating action, ledger doesn't record actual IDs
```

### Scrape Inline (#4)
```
Trigger: Cloudflare Worker cron (10min) / GHA hunter (15min)
  → Dispatch: fetch → dedup → triage → eligible items
  → Decision: publishGroupedInserts() → publishPublicExposure() per source
  → Write: db.insert() via persist callback → INSERT INTO opportunities
  → Receipt: INSERT INTO source_publication_ledger (with actual IDs)
  → Public Visibility: Immediate (is_active=1)
  → Rollback: Gateway has retryKey idempotency; no cross-writer reservation rollback
```

### Ingest API (#8)
```
Trigger: Authorized POST /api/ingest
  → Dispatch: normalizeOpportunityForInsert() → geoGate
  → Decision: publishGroupedInserts() or direct insert
  → Write: db.insert().onConflictDoNothing()
  → Receipt: Via gateway (with actual IDs) OR NONE (direct path)
  → Public Visibility: Immediate
  → Rollback: NONE for direct path
```

### Graduation Scripts (#9)
```
Trigger: Manual maintainer execution
  → Dispatch: queryD1() → decideTypedTransition()
  → Decision: Typed transition decision with evidence hash
  → Write: INSERT INTO source_transition_events via wrangler
  → Receipt: source_transition_events row + trigger-enforced source_registry update
  → Public Visibility: Next scrape tick (gateway reads new operational_state)
  → Rollback: Manual SQL only
```

---

## Known Gaps (from Audits F1, F2, F4 + MERGE_RUBRIC + ADR-002)

| Gap | Location | Severity | Evidence |
|-----|----------|----------|----------|
| **F1**: Lake sync bypasses gateway entirely | sync-to-d1.ts:184-200 | Critical | Raw INSERT, no registry/opt-out/lease check, receipt has empty IDs |
| **F2**: Concentration guard disconnected | sync-to-d1.ts:277, auto-publish-policy.ts:79-80 | Critical | `inventory` optional; when null, `concentrationAllowance` returns UNKNOWN → allows all |
| **F4**: Gateway fallback broader than exact-six | publication-gateway.ts:107-127 | High | Fixed in code (only exact-six gets fallback) but `unattributed` from invalid sourceId enters fallback |
| **Atomicity**: Persistence before ledger | publication-gateway.ts:199, 226 | High | Row public before receipt; ledger failure = orphan public row |
| **Cross-writer reservation**: None | All writers | Medium | Each writer checks tick sum independently; no cumulative reservation |
| **Ingest sourceId validation**: None | ingest.ts:60 | Medium | Client-controlled sourceId; invalid → "unattributed" → exact-six fallback |
| **Migration 0052**: Drops trigger, batch promotes | 0052_founder_fast_track...sql | High | Violates ADR-008, SP-23; auto-applied on merge |
| **Jev auto-publish**: L1 advisory publishes | auto-publish-policy.ts:138-140 | Medium | "No human approval" at Jev ≥0.7; Constitution says L1 ADVISE only |
| **ADR-002**: datetime('now') for scraped_at/last_seen | sync-to-d1.ts:193,196 | High | Sync timestamp ≠ posting date; unknown dates must stay NULL per ADR-002 |
| **Reactivation bypass**: ON CONFLICT revives archived | sync-to-d1.ts:195-199 | High | Reactivates verifier/triage/takedown-archived rows without review |
| **Miner robots**: Observe-only, no decision | domain-ats-discovery.ts, ashby/breezy-canary.ts | Medium | Robots "observe" only; no enforcement for lake fetchers |

---

## Files NOT in This Inventory (Read-Only or Non-Writers)

- `scripts/lake/domain-ats-discovery.ts` — discovery only, writes to Turso lake, not D1
- `scripts/lake/run-lake-miner.ts` — orchestration, writes to Turso
- `apps/web/src/pages/api/cron/shadow-dispatch.ts` — writes `shadow_observations`, not `opportunities`
- `packages/scraper/candidate-shadow.ts` — probe only, zero D1 writes
- `scripts/diagnostics/*.ts` — read-only
- `apps/web/src/lib/public-query.ts` — read-only public queries

---

## Repair Contract (PROPOSAL ONLY — Not Authorized for Implementation)

A repair contract addressing the above gaps would require:
1. **Lake sync gateway integration**: Route `sync-to-d1.ts` through `publishPublicExposure` with proper registry/opt-out/lease checks
2. **Receipt integrity**: Record actual `published_ids_json` in ledger, make receipt atomic with write
3. **Concentration enforcement**: Require inventory snapshot; fail closed when unavailable
4. **ADR-002 compliance**: Preserve NULL `posted_at`; use `coalesce(posted_at, scraped_at)` only for ordering
5. **Reactivation safety**: Add `WHERE inactive_reason NOT IN ('verifier-failed','triage-rejected','takedown-archived')` to ON CONFLICT
6. **Cross-writer reservation**: Atomic ticket reservation via `source_publication_ledger` before persist
7. **Migration governance**: Remove data-mutating migrations from auto-apply; require manual approval
8. **Jev advisory enforcement**: Remove "No human approval" path; Jev remains advisory per Constitution L1
9. **Miner robots decision**: Enforce robots verdict for lake fetchers before admission

**Status:** PROPOSAL. Requires MATH-06A acceptance evidence and authorized maintenance task. No production writes authorized by this document.