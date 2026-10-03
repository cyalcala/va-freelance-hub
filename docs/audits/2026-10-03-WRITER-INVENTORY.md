# Writer Inventory — Every Path That Inserts, Reactivates, or Publishes Rows

**Generated:** 2026-10-03 | **Session:** 76 | **Branch:** `opencode/shift-20261002-2118` | **Evidence:** VERIFIED_CODE

---

## Summary

| # | Writer Path | Trigger | Authority Check | Receipt | Bypasses Gateway? |
|---|-------------|---------|-----------------|---------|-------------------|
| 1 | `scripts/lake/sync-to-d1.ts` (buildSyncSql) | CLI `bun run lake:sync`, GHA `gha-lake-publish.yml`, GCP `lake-publish-job` | Hard-coded `BASE_AUTHORIZED_SOURCE_IDS` + `decideAutoPublish` on `lake_ats_discovery.auto_approved` | `buildPublicationReceiptSql` writes ledger but `published_ids_json='[]'`; `published_count = candidate count` | **YES** — raw INSERT, never calls `publishPublicExposure` |
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

**File:** `scripts/lake/sync-to-d1.ts:184-200, 353-372`
**Trigger:** `bun run lake:sync` (GHA hourly at :47, GCP hourly at :47, manual)
**Authority:**
- Hard-coded `BASE_AUTHORIZED_SOURCE_IDS` (lines 27-40): exact-six + himalayas + 5 breezy
- `decideAutoPublish` on `lake_ats_discovery` where `review_status = 'auto_approved'` (lines 95-109)
- **No** `source_registry` query, **no** `source_opt_outs` check, **no** lease expiry check
- `fetchD1InventorySnapshot` called but **optional** (line 277); when null, `concentrationAllowance` returns `UNKNOWN` and allows full cohort (auto-publish-policy.ts:79-80)

**Receipt:** `buildPublicationReceiptSql` (lines 204-220)
- `published_count = candidate count` (counts reactivations as publications)
- `published_ids_json = '[]'` (empty array — no actual opportunity IDs recorded)
- `mode = 'unlimited'`
- Written **after** all upserts succeed (line 371), not atomically

**Reactivation:** `ON CONFLICT(source_url) DO UPDATE SET is_active = 1` (line 196-198) — reactivates any conflicting URL regardless of prior state

**Gap (F1/F4):** This is the primary lake bypass documented in audit F1. It writes directly to D1 without gateway enforcement.

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

## Trigger → Dispatch → Decision → Write → Receipt → Public Visibility → Rollback Trace

### Lake Sync (#1)
```
Trigger: GHA gha-lake-publish.yml (hourly :47) / GCP lake-publish-job (hourly :47) / manual
  → Dispatch: syncQualifiedJobsToD1(limit, dryRun, {holdAutoApproved})
  → Decision: planAutoPublishSources() → decideAutoPublish() per tenant
  → Write: buildSyncSql() → raw INSERT ON CONFLICT (reactivates) + buildPublicationReceiptSql()
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

## Known Gaps (from Audits F1, F2, F4 + MERGE_RUBRIC)

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

---

## Files NOT in This Inventory (Read-Only or Non-Writers)

- `scripts/lake/domain-ats-discovery.ts` — discovery only, writes to Turso lake, not D1
- `scripts/lake/run-lake-miner.ts` — orchestration, writes to Turso
- `apps/web/src/pages/api/cron/shadow-dispatch.ts` — writes `shadow_observations`, not `opportunities`
- `packages/scraper/candidate-shadow.ts` — probe only, zero D1 writes
- `scripts/diagnostics/*.ts` — read-only
- `apps/web/src/lib/public-query.ts` — read-only public queries