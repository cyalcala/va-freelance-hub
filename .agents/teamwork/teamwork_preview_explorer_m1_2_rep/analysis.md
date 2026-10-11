# Investigation Analysis: Publication Gateway Uncertainty, Ledger Reconciliation, and Withdrawal Architecture

**Document Version:** 1.0.0  
**Timestamp:** 2026-10-11T05:25:00Z  
**Agent:** Teamwork Explorer (`teamwork_preview_explorer_m1_2_rep`)  
**Target Milestone:** `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`  

---

## 1. Executive Summary

This investigation analyzes the end-to-end architecture governing public opportunity exposure, gateway uncertainty handling, ledger reconciliation, withdrawal propagation, and snapshot serving bounds in VA Freelance Hub.

### Core Discoveries
1. **Publication Gateway (`packages/scraper/publication-gateway.ts`)**:
   - Implements a single front door for all public mutations (`publishPublicExposure`).
   - Uses an append-only, idempotent ledger `source_publication_ledger` (migration `0041`) keyed by `retry_key`.
   - Distinctly handles failures occurring *before* persistence (fails closed with `{ ok: true, mode: 'blocked' | 'rolled_back' }` or `{ ok: false, reason }`) versus *during/after* persistence (emits `POST_PERSISTENCE_FAILURE` with `exposure: "UNKNOWN"`).
   - Lost ledger acknowledgements (when physical rows are persisted and ownership is verified, but ledger insertion fails) are captured in `publication_outcome_uncertainty` (migration `0056`) via `recordLostAcknowledgement`.
   - Gaps exist where persistence throws, acknowledgement formatting fails, or ownership fails *after* persistence has executed: in these cases, `exposure: "UNKNOWN"` is returned to the caller, but **no** marker is recorded in `publication_outcome_uncertainty`.

2. **Opportunity Withdrawal & Deactivation**:
   - Stored opportunities are deactivated via multiple mechanisms in `apps/web/src/pages/api/cron/verify-links.ts`:
     - `withdrawInvalidPublicDrift`: Deactivates explicit onsite/hybrid or out-of-window dates with `inactive_reason = 'publication-drift'`.
     - `withdrawUnreceiptedAcknowledgements`: Deactivates IDs marked in `publication_outcome_uncertainty` that lack a valid ledger receipt, setting `inactive_reason = 'publication-unreceipted'`.
     - Stale Feed Archival: Deactivates rows unseen in feeds for 30+ days with `inactive_reason = 'stale-feed'`.
     - Link Verifier: Deactivates URLs after 3 consecutive dead responses (`'link-unavailable'`), bad URLs (`'invalid-source-url'`), or geo locks detected on page (`'policy-rejected'`).
   - Inactive reasons are classified in `apps/web/src/lib/inactive-reason.ts` as feed-recoverable (`'stale-feed'`, `'link-unavailable'`) vs non-feed-recoverable (`'publication-drift'`, `'publication-unreceipted'`).
   - **Policy Change / Opt-Out Gap:** Active opportunities in D1 are **not** automatically scanned for subsequent source opt-outs (`source_opt_outs`) or policy lease expiries after they are published.

3. **Public Serving Snapshot Exposure Bounds & LKG Fallback (`apps/web/src/lib/public-serving-snapshot.ts`)**:
   - Serving is completely decoupled from direct `opportunities` table queries for visitors; public pages read from a single materialized snapshot (`public_serving_snapshot` row 1 in D1) or memory slot or edge cache or bundled `durable_lkg` (`data/public-lkg.json`).
   - Refresh bounds: 15 minutes fresh (`FRESH_MS`), 60 minutes stale threshold (`REBUILD_AFTER_MS`), 1-minute stale recheck interval, 10-minute reconstruction lease.
   - Anti-collapse protection (`validateSnapshotCandidate`): Rejects any snapshot candidate where job count collapses below 10% of active board or drops to 0.
   - **Click Gateway Defense:** Direct link resolution (`apps/web/src/pages/api/click/[id].ts`) queries D1 directly with `is_active = 1 AND ph_eligibility IN (PUBLIC_PH_ELIGIBILITIES)`. Even if a withdrawn job remains in a stale snapshot or LKG fallback, click returns 404 or 503, preventing seekers from visiting withdrawn links.

4. **Requirements for `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`**:
   - Addresses the contract statement:
     > *"Partial failure and later invalidation are observable and safely repairable across serving. Lost ACK, duplicate retry, ledger conflict, policy change, and stale/LKG exposure require explicit safe exposure bounds, durable uncertainty, and idempotent reconciliation receipts. Do not block the writer. Do not record CLOSED. Do not claim MATH-08."*
   - Requires formalizing observable invariants in `packages/scraper/manila-day.ts` extending `activeMatchedManilaStillPublicCount` to incorporate withdrawal state, uncertainty markers, and exposure bounds without claiming closed-day flow or MATH-08.

---

## 2. Codebase Architecture & File Mapping

| Module / File Path | Architectural Role | Key Functions & Exports |
|---|---|---|
| `packages/scraper/publication-gateway.ts` | Authoritative single public exposure gateway | `publishPublicExposure()`, `loadPublicationPolicy()`, `publicationTickKey()`, `LEGACY_EXACT_SIX_SOURCE_IDS` |
| `packages/scraper/publication-uncertainty.ts` | Uncertainty marker recording & reconciliation | `recordLostAcknowledgement()`, `withdrawUnreceiptedAcknowledgements()`, `PUBLICATION_UNRECEIPTED_INACTIVE_REASON` |
| `packages/scraper/manila-day.ts` | Manila calendar date, first-publish receipts & snapshot flow invariant readers | `activeMatchedManilaStillPublicCount()`, `activeMatchedManilaDayFlowCount()`, `latestManilaSnapshotPair()`, `manilaFirstPublishIds()` |
| `apps/web/src/lib/public-opportunities.ts` | Public D1 query predicates & eligibility filtering | `publicOpportunityFilters()`, `PUBLIC_PH_ELIGIBILITIES`, `PUBLIC_PH_ELIGIBILITY_SQL` |
| `apps/web/src/lib/publication-drift-withdrawal.ts` | Drift reconciliation for non-remote & stale posting dates | `withdrawInvalidPublicDrift()`, `PUBLICATION_DRIFT_INACTIVE_REASON` |
| `apps/web/src/lib/inactive-reason.ts` | Inactive reason taxonomy | `RECOVERABLE_INACTIVE_REASONS`, `isFeedRecoverableInactiveReason()` |
| `apps/web/src/lib/publish-opportunities.ts` | Batch grouping & transaction orchestration for inserts/activations | `publishGroupedInserts()`, `publishGroupedActivations()`, `PublicationOutcomeUnknownError` |
| `apps/web/src/lib/publication-retry-key.ts` | Deterministic request material serialization & SHA-256 retry keys | `publicationRetryKey()`, `snapshotPublicationInserts()`, `snapshotPublicationUpdate()` |
| `apps/web/src/lib/public-serving-snapshot.ts` | Multi-tier public board cache, anti-collapse validation, lease management | `loadPublicBoard()`, `resolvePublicBoard()`, `validateSnapshotCandidate()`, `promoteSnapshot()` |
| `apps/web/src/lib/durable-lkg-snapshot.ts` | Static bundled fallback when D1 is unavailable | `getDurableLkgSnapshot()` |
| `apps/web/src/pages/api/click/[id].ts` | Outbound apply redirect handler with live D1 validation gate | `GET`, `createClickHandler()` |
| `apps/web/src/pages/api/cron/verify-links.ts` | Cron runner orchestrating drift, lost ACK withdrawal, stale archiving & link checks | `POST` |
| `packages/db/migrations/0041_publication_ledger.sql` | Migration defining append-only publication ledger | `source_publication_ledger` table & triggers |
| `packages/db/migrations/0056_publication_outcome_uncertainty.sql` | Migration defining append-only publication outcome uncertainty | `publication_outcome_uncertainty` table & triggers |
| `packages/db/migrations/0057_publication_reservation.sql` | Migration defining shared canary capacity reservations | `source_publication_reservation` table & triggers |

---

## 3. Deep Dive: Handling of Failure Modes in `packages/scraper/publication-gateway.ts`

### 3.1 `POST_PERSISTENCE_FAILURE` and Exposure `UNKNOWN`

When `publishPublicExposure()` is invoked, the gateway executes the following stages:

```
[Request Ingest]
       │
       ▼
[Check Existing Ledger (LOAD_RETRY_SQL)] ──(Found)──► [replayedResult()]
       │ (Not found)
       ▼
[Authority & Canary Check 1]
       │ (Capped: check tick sum / roll back if exceeded)
       ▼
[Authority & Canary Check 2 (Epoch Check)]
       │ (Capped: reserveCanaryCapacity in 0057)
       ▼
[persist(allowedCount) Callback] ────────(Throws)────────► postPersistenceFailure()
       │ (Succeeds)                                             (exposure: UNKNOWN)
       ▼
[snapshotAcknowledgement(persisted)] ───(Invalid)────────► postPersistenceFailure()
       │ (Valid: count & IDs extracted)                         (exposure: UNKNOWN)
       ▼
[hasCurrentOwnership(db, sourceId, ids)] (Fails/Throws)──► postPersistenceFailure()
       │ (All IDs active, fresh, valid URLs, remote)            (exposure: UNKNOWN)
       ▼
[insertLedger(db, ...)] ─────────────────(Throws)────────► recordLostAcknowledgement()
       │ (Committed)                                            │
       ▼                                                        ▼
[recordPortfolioExposure() & recordManilaDay()]           postPersistenceFailure()
       │                                                        (exposure: UNKNOWN)
       ▼
[Return { ok: true, publishedCount, ids }]
```

#### Detailed Characteristics:
1. **Definition of `postPersistenceFailure` (Lines 348–350)**:
   ```ts
   function postPersistenceFailure(reason: string): PublishPublicExposureResult {
     return { ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true, exposure: "UNKNOWN", reason };
   }
   ```
2. **Caller Handling in `publishGroupedInserts` and `publishGroupedActivations` (`apps/web/src/lib/publish-opportunities.ts`)**:
   ```ts
   if (!result.ok) {
     return "persistenceAttempted" in result && result.persistenceAttempted === true
       ? { published, failed: true, publicationOutcome: "UNKNOWN" }
       : { published, failed: true };
   }
   ```
   - If `publicationOutcome === "UNKNOWN"`: The loop over grouped sources halts immediately.
   - The caller does not throw an unhandled exception or crash the process; it returns the confirmed published count lower bound.
   - Sequential processing of remaining sources is aborted to prevent compounding uncertain state.

### 3.2 Lost Ledger Acknowledgement

A **Lost Ledger Acknowledgement** occurs when:
1. `persist()` completes.
2. `snapshotAcknowledgement()` extracts valid, safe, distinct IDs.
3. `hasCurrentOwnership()` confirms that all returned IDs are present in `opportunities`, active (`is_active = 1`), PH-eligible, within the 30-day freshness window, and remote.
4. `insertLedger()` fails to write to `source_publication_ledger`.

#### Handling Mechanism:
- **Recording (Lines 523–528)**:
  ```ts
  try {
    await insertLedger(db, request, mode, acknowledgement.publishedCount, acknowledgement.ids);
  } catch {
    // Either write may already have committed. This is not a rollback or a zero-exposure receipt.
    await recordLostAcknowledgement(db, request, acknowledgement.ids);
    return postPersistenceFailure("publication acknowledgement ledger write did not complete");
  }
  ```
- **Durable Uncertainty Marker (`packages/scraper/publication-uncertainty.ts`)**:
  Inserts a row into `publication_outcome_uncertainty`:
  ```sql
  INSERT INTO publication_outcome_uncertainty (
    source_id, tick_key, retry_key, opportunity_ids_json, reason, recorded_at
  ) VALUES (?, ?, ?, ?, 'ledger-acknowledgement-unconfirmed', ?)
  ```
  - `retry_key` is enforced unique in migration `0056`.
  - The table is strictly append-only (triggers reject UPDATE and DELETE).
  - Swallows duplicate or transient errors to ensure the gateway writer is not crashed.
- **Reconciliation via `withdrawUnreceiptedAcknowledgements()`**:
  - Runs during the periodic `api/cron/verify-links` cron job.
  - Sequentially scans `publication_outcome_uncertainty`.
  - For each ID in `opportunity_ids_json`:
    - Checks if an active receipt exists in `source_publication_ledger`:
      ```sql
      SELECT id FROM source_publication_ledger
      WHERE source_id = ? AND mode IN ('unlimited', 'capped') AND published_count > 0
        AND EXISTS (SELECT 1 FROM json_each(published_ids_json) WHERE value = ?)
      LIMIT 1
      ```
    - If a valid receipt exists: **No action taken** (receipt wins).
    - If no valid receipt exists and the opportunity is currently active:
      ```sql
      UPDATE opportunities
      SET is_active = 0, inactive_reason = 'publication-unreceipted', updated_at = ?
      WHERE id = ? AND source_id = ? AND is_active = 1 AND ph_eligibility IN (...)
      ```
    - Idempotent: repeated calls withdraw 0 items.

### 3.3 Duplicate Retries

`retry_key` uniquely identifies the publication operation. It is generated by `publicationRetryKey()` in `apps/web/src/lib/publication-retry-key.ts`:
```ts
publication-retry-v1:${sha256Hex(canonicalJson({ version: 1, sourceId, tickKey, action, proposedCount, material }))}
```

#### Handling Mechanism:
- On gateway invocation, `LOAD_RETRY_SQL` queries `source_publication_ledger WHERE retry_key = ?`.
- **Case 1: Ledger row exists (`prior` is non-null)**:
  - Invokes `replayedResult(prior, request)` (Lines 243–261).
  - Validates that `sourceId`, `tickKey`, `proposedCount`, and `publishedIdsJson` strictly match the inbound request.
  - If valid: returns `{ ok: true, mode: row.mode, publishedCount: row.publishedCount, ids, replayed: true }`.
  - **`persist()` is never called.** Physical rows are not inserted or activated again.
  - If stored record is corrupt or does not match request: returns `{ ok: false, reason: "stored publication retry is invalid or does not match the request" }`.
- **Case 2: Previous attempt failed at `insertLedger` (Ledger row does NOT exist)**:
  - `LOAD_RETRY_SQL` returns null.
  - The retry enters the main execution path again.
  - For canary sources: `reserveCanaryCapacity()` checks `LOAD_RESERVATION_SQL WHERE retry_key = ?`. Since the previous reservation committed with this `retry_key`, it recognises the existing reservation (`if (existing?.retry_key === request.retryKey) return true;`) and permits the write.
  - `persist()` is called again!
    - For `publishGroupedInserts`: Attempting `insertBatch()` again with the same material may create duplicate opportunity rows or fail on unique URL indexes.
    - For `publishGroupedActivations`: Idempotently updates the same IDs.
  - If this second attempt succeeds at `insertLedger`:
    - A valid receipt is now committed to `source_publication_ledger`.
    - Although `publication_outcome_uncertainty` contains a marker from the prior failure, `withdrawUnreceiptedAcknowledgements` checks for a ledger receipt matching the ID. Finding one, it leaves the ID active.

### 3.4 Ledger Conflicts

A **Ledger Conflict** arises when two concurrent or racing processes attempt to publish under the same `retry_key`:
1. Both find `LOAD_RETRY_SQL` is null.
2. Both execute `persist()`.
3. Writer A commits to `source_publication_ledger`.
4. Writer B attempts `INSERT INTO source_publication_ledger`, which triggers a `UNIQUE(retry_key)` constraint violation.
5. Writer B catches the error in `packages/scraper/publication-gateway.ts`:
   - Calls `recordLostAcknowledgement(db, request, acknowledgement.ids)`.
   - Returns `postPersistenceFailure("publication acknowledgement ledger write did not complete")`.
6. Subsequent reconciliation:
   - If Writer B persisted the *same* IDs as Writer A (e.g. idempotent activation), `withdrawUnreceiptedAcknowledgements` finds Writer A's receipt and does **not** withdraw the IDs.
   - If Writer B created *different* IDs (e.g. concurrent inserts receiving new auto-increment IDs), Writer B's IDs have no matching ledger receipt, so `withdrawUnreceiptedAcknowledgements` safely deactivates Writer B's orphaned rows with `'publication-unreceipted'`.

### 3.5 Asymmetries and Gaps in Current Handling

| Execution Point | What Failed? | Did Physical Rows Change? | Gateway Result | Uncertainty Marker Created? | Eventual Recovery Path |
|---|---|---|---|---|---|
| `persist()` | Callback threw exception | Unknown (might have committed partially) | `POST_PERSISTENCE_FAILURE`, `exposure: "UNKNOWN"` | **NO** (IDs unknown) | **None** (Orphaned active rows stay active unless caught by drift/verifier) |
| `snapshotAcknowledgement()` | Returned malformed IDs or length mismatch | Yes (persistence already completed) | `POST_PERSISTENCE_FAILURE`, `exposure: "UNKNOWN"` | **NO** (Acknowledgement untrusted) | **None** |
| `hasCurrentOwnership()` | Contradiction detected (e.g. stale date, onsite) or query failed | Yes (rows were persisted/activated) | `POST_PERSISTENCE_FAILURE`, `exposure: "UNKNOWN"` | **NO** | Caught later by `withdrawInvalidPublicDrift` if onsite/stale-date |
| `insertLedger()` | SQLite constraint, trigger failure, or connection dropped | Yes (rows persisted and ownership verified) | `POST_PERSISTENCE_FAILURE`, `exposure: "UNKNOWN"` | **YES** (`recordLostAcknowledgement`) | Deactivated by `withdrawUnreceiptedAcknowledgements` |
| `recordLostAcknowledgement()` | `publication_outcome_uncertainty` missing or insert failed | Yes | `POST_PERSISTENCE_FAILURE`, `exposure: "UNKNOWN"` | **NO** (Swallowed in `catch`) | **None** |

---

## 4. Deep Dive: Opportunity Withdrawal, Link Verification & Stale Deactivation

### 4.1 Withdrawal Subsystems in the Codebase

```
                               ┌─────────────────────────────────────────────────────────────┐
                               │                    Periodic Maintenance                     │
                               │             (apps/web/src/pages/api/cron/verify-links.ts)   │
                               └──────────────────────────────┬──────────────────────────────┘
                                                              │
         ┌─────────────────────────────────┬──────────────────┴──────────────┬─────────────────────────────────┐
         ▼                                 ▼                                 ▼                                 ▼
[withdrawInvalidPublicDrift] [withdrawUnreceiptedAcknowledgements]  [Stale Feed Archive]              [Link Verification & Geo Scan]
  - Location: onsite / hybrid   - Uncertainty markers without        - Unseen in feeds > 30 days       - Invalid URL syntax
  - Original date > 30 days old   ledger receipts                    - inactive_reason: 'stale-feed'   - 3 consecutive HTTP failures
  - inactive_reason:            - inactive_reason:                   - Recoverable via feed            - Geo Lock detected in page HTML
    'publication-drift'           'publication-unreceipted'                                            - inactive_reason:
  - Non-feed-recoverable        - Non-feed-recoverable                                                   'link-unavailable' (recoverable)
                                                                                                         'policy-rejected' (non-recoverable)
```

### 4.2 Inactive Reason Taxonomy & Reversibility (`apps/web/src/lib/inactive-reason.ts`)

The codebase enforces a strict boundary between reasons that a healthy source feed may reverse versus permanent administrative/safety invalidations:

```ts
export const RECOVERABLE_INACTIVE_REASONS = ["stale-feed", "link-unavailable"] as const;
```

- **Feed-Recoverable Reasons**:
  - `stale-feed`: The job was absent from the feed for 30 days, but if reappearing in a fresh feed, it can be reactivated.
  - `link-unavailable`: Transient HTTP errors or site outages. If the job reappears in an authoritative feed, it can be reactivated.
- **Non-Feed-Recoverable Reasons**:
  - `publication-drift`: Stored workplace was explicit onsite/hybrid or original date exceeded 30-day window. Feeds cannot silently revive this without qualifying anew.
  - `publication-unreceipted`: Persisted without confirmed ledger acknowledgement.
  - `policy-rejected`: Disqualified by geo-evidence (e.g. landing page scanner detected country-locking or US-only restriction).
  - `invalid-source-url`: Malformed URL.

### 4.3 Policy Change and Opt-Out Exposure Gaps

1. **Pre-Write Policy Checks**:
   - `packages/scraper/publication-gateway.ts` verifies source compliance (`allowed` or `conditional`), operational state (`active` or `canary`), opt-out (`source_opt_outs`), and policy lease expiry.
   - It performs an epoch check right before persistence to catch mid-tick policy changes.
2. **Post-Write Invalidation Gap**:
   - If an employer or provider issues an opt-out *after* opportunities have already been published to D1:
     - A row is inserted into `source_opt_outs` (migration `0037`).
     - Future writes for that `sourceId` are blocked.
     - In the data lake (`scripts/lake/source-ranker.ts` and `observation-clocks.ts`), `applyRestriction()` marks the source as `BOUNDED_REPLAY` and hides it from the lake public view.
     - **However, in D1 serving (`opportunities` table):** No cron or query scans active opportunities against `source_opt_outs`! The existing opportunities remain `is_active = 1` until they naturally age out (30 days) or fail link verification.
   - The same gap exists for expired policy leases: active jobs from a source whose lease expired continue to be served on the board until natural expiry.

---

## 5. Deep Dive: Public Serving Snapshot Exposure Bounds & LKG Fallback

### 5.1 The Serving Hierarchy (`apps/web/src/lib/public-serving-snapshot.ts`)

Serving opportunities to visitors is completely decoupled from querying the `opportunities` table directly. The board is loaded via `loadPublicBoard()` through a 5-step fallback:

```
[Visitor Request: /, /categories, /opportunities, /jobs/[id]]
                            │
                            ▼
      1. In-Memory Warm Slot (0ms, 0 D1 reads, TTL = 15m)
                            │ (Expired or Cache Miss)
                            ▼
      2. Cloudflare Edge Cache (TTL = 24h, refresh if > 15m)
                            │ (Cache Miss)
                            ▼
      3. Stale In-Memory Slot (Serve stale, schedule background refresh)
                            │ (Cold Isolate)
                            ▼
      4. Cold Isolate D1 Snapshot Read (public_serving_snapshot row 1)
         ├─ Generated < 60m: Unpack & promote to memory/edge
         └─ Generated >= 60m or missing:
              Claim 10m lease -> Rebuild from opportunities & va_directory
                            │ (D1 Quota / Busy / Timeout / Build Fail)
                            ▼
      5. Durable Last-Known-Good (LKG) Snapshot (apps/web/src/data/public-lkg.json)
         Status: 'lkg_fallback', Header: 'X-Public-Snapshot: lkg_fallback'
```

### 5.2 Time Bounds & Thresholds

| Parameter | Value | Definition & Behavior |
|---|---|---|
| `FRESH_MS` | 15 minutes (900,000 ms) | Duration an in-memory board is considered completely fresh without rechecking D1. |
| `REBUILD_AFTER_MS` | 60 minutes (3,600,000 ms) | Maximum age of a snapshot before it is considered stale and must be rebuilt from source tables. |
| `STALE_RECHECK_MS` | 1 minute (60,000 ms) | Recheck interval when serving a stale board, allowing newly promoted boards to be adopted quickly. |
| `LEASE_MS` | 10 minutes (600,000 ms) | Shared lock lease in D1 (`CLAIM_REFRESH_SQL`) preventing multiple concurrent isolates from rebuilding the snapshot simultaneously. |
| `DEPENDENCY_TIMEOUT_MS` | 2 seconds (2,000 ms) | Foreground deadline for cold snapshot loads before immediately falling back to Durable LKG. |
| `BACKGROUND_REFRESH_TIMEOUT_MS` | 25 seconds (25,000 ms) | Maximum background execution window (`waitUntil`) for rebuilds in Cloudflare Workers. |

### 5.3 Anti-Collapse Integrity Rules (`validateSnapshotCandidate`)

When a rebuild query completes, `validateSnapshotCandidate()` validates the candidate before promotion:
1. Validates ISO timestamp and non-empty `jobs` and `directory` arrays.
2. Validates schema and enum constraints on every job and directory row.
3. **Anti-Collapse Rule (Lines 269–293)**:
   - If the candidate contains **0 jobs**, it is unconditionally rejected (`"Unexpected empty candidate: 0 jobs vs N active jobs"` or `"Candidate snapshot has 0 jobs"`).
   - If the active board has >= 20 jobs, and the candidate has **< 10%** of active jobs:
     ```ts
     if (activeCount >= 20 && c.jobs.length < Math.floor(activeCount * 0.1)) {
       return { ok: false, reason: `Suspicious job count collapse: ${c.jobs.length} candidate jobs vs ${activeCount} active jobs` };
     }
     ```
   - If rejected: The active board remains untouched in memory, and the previous snapshot remains in D1.

### 5.4 The Exposure Gap and Click Gateway Safeguard

When an opportunity is deactivated in D1 (`is_active = 0` via drift withdrawal, lost ACK withdrawal, or link verification):
1. **Public Board Lag:**
   - The opportunity remains visible on index pages and `/jobs/[id]` until the snapshot is rebuilt and memory/edge caches expire (up to 15–60 minutes, or longer if anti-collapse blocks a radical shrinkage).
   - If D1 fails and LKG fallback is activated, the opportunity in `public-lkg.json` is displayed.
2. **The Defense-in-Depth Click Gate (`apps/web/src/pages/api/click/[id].ts`)**:
   - The user cannot apply directly from the snapshot; the "Apply" button routes through `/api/click/[id]`.
   - `/api/click/[id]` queries D1 directly:
     ```sql
     SELECT source_url, application_url FROM opportunities
     WHERE id = ? AND is_active = 1 AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
     ```
   - **If the opportunity was withdrawn in D1:** The query returns nothing, and the endpoint immediately returns **HTTP 404 ("Job not found")**.
   - **If D1 is unavailable or timing out:** The endpoint returns **HTTP 503**:
     `"We couldn't verify this posting right now. Please retry shortly."`
     With server telemetry: `"A stale board cannot prove that this job remains eligible or unwithdrawn."`
   - Thus, seekers are never redirected to dead or invalid jobs, even when the public catalog snapshot is lagging.

---

## 6. Architecture for `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`

### 6.1 Deconstructing the Mandate

> **Contract Statement:**
> *"Partial failure and later invalidation are observable and safely repairable across serving. Lost ACK, duplicate retry, ledger conflict, policy change, and stale/LKG exposure require explicit safe exposure bounds, durable uncertainty, and idempotent reconciliation receipts. Do not block the writer. Do not record CLOSED. Do not claim MATH-08."*

Breaking down each requirement:
1. **Observable across serving:**
   - Invalidation (drift, unreceipted ACK, policy opt-out, expired lease) must be queryable and measurable against both D1 storage and public serving snapshots.
   - Readers must be able to count how many public IDs remain valid vs how many are invalidated or in an uncertain state.
2. **Safely repairable:**
   - Withdrawn IDs can be deactivated in D1 idempotently without corrupting ledger history or triggering false rollbacks.
   - Inactive reason must clearly identify the cause (`publication-unreceipted`, `publication-drift`, `source-opt-out`, `policy-lease-expired`).
3. **Five Explicit Failure & Invalidation Dimensions**:
   - **Lost ACK:** Handled via `publication_outcome_uncertainty` and `withdrawUnreceiptedAcknowledgements`.
   - **Duplicate retry:** Handled via deterministic `publicationRetryKey` and `replayedResult` without invoking `persist()`.
   - **Ledger conflict:** Unique constraints on `retry_key` prevent dual-allocation; losing concurrent writers fall back to uncertainty markers.
   - **Policy change:** Explicit detection of post-write opt-outs (`source_opt_outs`) and expired policy leases on active opportunities.
   - **Stale/LKG exposure:** Public snapshot exposure bounded by 60m rebuild TTL, with `/api/click/[id]` acting as the authoritative zero-exposure circuit breaker for withdrawn listings.
4. **Governing Invariants (Strict Prohibitions)**:
   - **Do not block the writer:** Gateway and scraper operations must fail open or gracefully record uncertainty; a verification or ledger error must never halt the scraping loop.
   - **Do not record CLOSED:** Stored day snapshots in `source_publication_manila_open_snapshot` must remain `day_state = 'OPEN'`. Readers must not fabricate or transition to `CLOSED`.
   - **Do not claim MATH-08:** This contract establishes observable withdrawal and uncertainty bounds; it is not completion of MATH-08 (Certified Fresh Daily Flow).

### 6.2 Existing Invariant Sequence in `packages/scraper/manila-day.ts`

The codebase already locks seven sequential invariants verifying that snapshot pairs are **not** completed Manila-day flows:

```
1. familyOkManilaStillPublicCount
   └── familyOkManilaDayFlowCount -> null

2. familyBreachManilaStillPublicCount
   └── familyBreachManilaDayFlowCount -> null

3. freshMatchedManilaStillPublicCount (Original date within 30 days)
   └── freshMatchedManilaDayFlowCount -> null

4. applyMatchedManilaStillPublicCount (Outbound URL resolves)
   └── applyMatchedManilaDayFlowCount -> null

5. phMatchedManilaStillPublicCount (PH eligibility preserved)
   └── phMatchedManilaDayFlowCount -> null

6. canonicalUrlMatchedManilaStillPublicCount (Distinct canonical URLs)
   └── canonicalUrlMatchedManilaDayFlowCount -> null

7. sourceMatchedManilaStillPublicCount (Matches publishing sourceId)
   └── sourceMatchedManilaDayFlowCount -> null

8. activeMatchedManilaStillPublicCount (All stillPublicIds active)
   └── activeMatchedManilaDayFlowCount -> null
```

In `activeMatchedManilaStillPublicCount`:
- Takes `(stillPublicCount, pair, urlRows, ownedRows, publishingSourceId, activeIds)`.
- If all still-public IDs are present in `activeIds`, returns the matched count.
- If any ID has been deactivated (e.g. withdrawn), it returns `null`.
- `activeMatchedManilaDayFlowCount("OPEN", matched)` returns `null`.
- `activeMatchedManilaDayFlowCount("CLOSED", matched)` returns `null`.

### 6.3 Proposed Types, Functions, and Contracts for the Next Unit

To address `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`, the following contracts and readers are required:

#### A. In `packages/scraper/manila-day.ts` (Reader Layer)
Extending the invariant chain to account for withdrawal state, uncertain markers, and unwithdrawn active IDs:

```ts
/**
 * An active-matched still-public count stays absent when any still-public ID
 * is marked uncertain in publication_outcome_uncertainty without a corresponding
 * ledger receipt, or has been invalidated by a policy change.
 */
export function withdrawalSafeManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  urlRows: readonly { id: number; sourceUrl: string }[],
  ownedRows: readonly { id: number; sourceId: string }[],
  publishingSourceId: string,
  activeIds: readonly number[],
  uncertainIds: readonly number[],
  optedOutSourceIds: readonly string[],
): number | null {
  const matched = activeMatchedManilaStillPublicCount(
    stillPublicCount,
    pair,
    urlRows,
    ownedRows,
    publishingSourceId,
    activeIds,
  );
  if (matched === null || !pair) return null;
  // If the publishing source has opted out, exposure is no longer safe
  if (optedOutSourceIds.includes(publishingSourceId)) return null;
  // If any still-public ID has an unconfirmed/uncertain ledger acknowledgement, exposure is uncertain
  const uncertainSet = new Set(uncertainIds);
  if (pair.stillPublicIds.some((id) => uncertainSet.has(id))) return null;
  return matched;
}

/**
 * A withdrawal-safe still-public count is not a completed Manila-day flow.
 * This reader has no closed-day evidence, so a caller-supplied CLOSED state
 * does not create one. The 100 floor is not a flow either.
 */
export function withdrawalSafeManilaDayFlowCount(
  dayState: string,
  matchedCount: number | null,
): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}
```

#### B. In `packages/scraper/publication-uncertainty.ts` (Reconciliation Layer)
Expanding uncertainty tracking to cover pre-ledger ownership and acknowledgement drops, and providing idempotent reconciliation receipts:

```ts
export type ReconciliationReceipt = {
  reconciledAt: string;
  withdrawnUnreceiptedIds: number[];
  withdrawnDriftIds: number[];
  withdrawnOptOutIds: number[];
  uncertainRemainingCount: number;
};
```

#### C. In `apps/web/src/lib/publication-drift-withdrawal.ts` or New Module
Adding withdrawal propagation for post-write policy opt-outs:

```ts
export const SOURCE_OPTOUT_INACTIVE_REASON = "source-opt-out";

/**
 * Idempotently withdraws public opportunities whose source has opted out
 * in source_opt_outs.
 */
export async function withdrawOptedOutSources(
  db: PublicationDb,
  observedAt: string,
): Promise<{ withdrawnIds: number[] }>;
```

#### D. In `apps/web/src/lib/public-serving-snapshot.ts` (Serving Exposure Bounds)
Formalizing the click gate's zero-exposure guarantee:
- Documenting and typing the guarantee that `/api/click/[id]` rejects all withdrawn IDs (`is_active = 0`) with 404 regardless of snapshot cache age.
- Proving that LKG fallback exposure is bounded by click-time D1 verification.

---

## 7. Comprehensive Findings Summary Matrix

| Failure / Invalidation Dimension | Current Detection Point | Current Storage / Marker | Reconciliation Mechanism | Serving Exposure Bound | Identified Architectural Gaps |
|---|---|---|---|---|---|
| **Lost ACK** | Gateway post-ledger catch | `publication_outcome_uncertainty` (0056) | `withdrawUnreceiptedAcknowledgements` in `verify-links` cron | `/api/click/[id]` returns 404 once deactivated in D1 | If `persist()` throws or `hasCurrentOwnership` fails, NO uncertainty row is inserted. |
| **Duplicate Retry** | Gateway `LOAD_RETRY_SQL` | `source_publication_ledger` (0041) | `replayedResult` returns receipt with `replayed: true` | N/A (idempotent, 0 new exposure) | If first attempt failed at ledger write, retry re-invokes `persist()`, potentially creating duplicate rows. |
| **Ledger Conflict** | Gateway `insertLedger` UNIQUE error | `publication_outcome_uncertainty` (0056) | Losing writer records uncertainty; cron deactivates conflicting IDs | `/api/click/[id]` returns 404 once deactivated | Canary reservation table (0057) mitigates cap breach, but unapplied in production. |
| **Policy Change (Opt-Out / Expiry)** | Gateway `loadPublicationPolicy` pre-persist | `source_opt_outs` (0037) & `source_registry` | Block future writes only | Lagging snapshot serves until 30d natural expiry; no active cron withdrawal | Active opportunities in D1 are **not** withdrawn when a source opts out post-write. |
| **Stale / LKG Exposure** | `loadPublicBoard()` age check | `public_serving_snapshot` (row 1) & `public-lkg.json` | Background refresh (`claimRefresh` + `rebuild`) | `validateSnapshotCandidate` prevents collapse; `/api/click/[id]` rejects 404/503 | Active board serves stale data for up to 60m; seeker sees listing on detail page but cannot Apply. |

---

## 8. Verification Strategy & Test Inventory

Any implementation of `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT` can be independently verified against:
1. **Targeted Integration Test (`packages/scraper/publication-gateway.integration.test.ts`)**:
   - Construct an intact snapshot pair with 5 active IDs.
   - Verify `withdrawalSafeManilaStillPublicCount` returns 5 when all 5 IDs are active, free from uncertainty markers, and belong to an active non-opted-out source.
   - Introduce an uncertainty marker for ID 5: verify `withdrawalSafeManilaStillPublicCount` drops to `null`.
   - Introduce a source opt-out for the publishing source: verify `withdrawalSafeManilaStillPublicCount` drops to `null`.
   - Verify `withdrawalSafeManilaDayFlowCount("OPEN", matched)` returns `null`.
   - Verify `withdrawalSafeManilaDayFlowCount("CLOSED", matched)` returns `null`.
   - Verify `withdrawalSafeManilaDayFlowCount("OPEN", 100)` and `(..., 150)` return `null`.
   - Verify no rows are written to `source_publication_ledger` and `day_state` remains `OPEN`.
2. **Typecheck & Regressions**:
   - `bun run typecheck` (`tsc`): Zero errors.
   - `bun test packages/scraper/publication-gateway.integration.test.ts`: All 302+ tests pass.
   - Guardrail audits: `bun run scripts/ci/guardrail-audits.ts` (4/4 pass).

---

*(End of Analysis)*
