# Specification Mining Analysis: PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT

## Executive Summary

This document extracts the authoritative specification, invariants, constraints, function signatures, counterexamples, boundary conditions, and preserved holds for `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`.

The specification is synthesized from:
1. `astra777.txt` (Section E: "Actual consistency and withdrawal contract" lines 187–206, Section H: "Ten nastiest remaining problems" #3: "Uncertain effects/later drift", #6: "Withdrawal versus stale/LKG", Section D: "All-writer map", and Section J lines 348–357: "PROBLEM UNIT: uncertain effects and withdrawal contract").
2. `docs/SYSTEM_SAVEPOINT.md` (lines 32–38, 2815–2875, 2903–2908, and latest continuations).
3. `docs/bootloaders/CURRENT.md` (lines 3–12, 766–777).
4. `docs/operations/PUBLICATION_MANILA_DAY_ACTIVE_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`, `PUBLICATION_DRIFT_WITHDRAWAL_2026-10-10.md`, `PUBLICATION_LOST_ACKNOWLEDGEMENT_RECORD_2026-10-10.md`, `PUBLICATION_SHARED_RESERVATION_2026-10-10.md`, and `PUBLICATION_SOURCE_POLICY_EPOCH_SEQUENTIAL_2026-10-10.md`.
5. `docs/plans/MATHEMATICAL_IMPROVEMENT_PLAN.md` (MATH-06 lines 462–478, lines 1556–1567) and `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md` (lines 875).

---

## 1. Context and Problem Definition

### 1.1 Architectural Reality
VA Freelance Hub operates across a distributed boundary:
- Primary background compute / scheduling: Google Cloud Platform (Cloud Run / Cloud Scheduler)
- Acquisition lake: Turso
- Governed public serving store: Cloudflare D1
- Public edge serving: Cloudflare Pages / Astro

Physical publication follows a decoupled pipeline:
$$\text{Row Mutation (D1)} \longrightarrow \text{Row Observation} \longrightarrow \text{Ledger Append (D1)} \longrightarrow \text{Asynchronous Snapshot / Cache / UI Propagation}$$

This is **not distributed ACID**. A network partition, unhandled failure, timeout, or concurrency race between row insertion and ledger confirmation leaves **partial failure and uncertain effects**. Furthermore, postings that were valid at publish time can experience **later drift** (e.g., workplace changes from remote to onsite/hybrid, or posting date ages out of the inclusive 30-day window).

### 1.2 Core Objective of the Contract
`PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT` guarantees:
1. **Observable Partial Failure:** Ambiguous post-persistence outcomes (`POST_PERSISTENCE_FAILURE`) are marked `UNKNOWN` and durably recorded in `publication_outcome_uncertainty`.
2. **Safe Exposure Bounds Across Serving:** Invalidation (unreceipted acknowledgements, drift off remote, stale date) deactivates physical rows in D1. Live Apply (`/api/click/[id]`) rejects withdrawn rows (HTTP 404), while public snapshot rebuilds preserve ADR-010 Last Known Good (LKG) board availability by preventing destructive board collapses.
3. **Idempotent Reconciliation Receipts:** Compensating withdrawal passes execute idempotent CAS updates, emit structured receipts, and never roll back rows that have valid ledger receipts.
4. **Truthful Manila-Day Measurement:** Manila-day still-public readers verify that still-public IDs are free of unconfirmed uncertainty and withdrawals. An open or closed day count remains `null` (not a completed flow).

---

## 2. Invariants Required for the Contract

### Invariant 1: Durable Uncertainty on Lost Acknowledgements
- **Trigger:** Gateway executes `request.persist()`, receiving physical opportunity IDs, but the subsequent insert into `source_publication_ledger` fails (timeout, constraint violation, conflict).
- **Rule:** The physical opportunity row is **NOT** deleted or rolled back inside the transaction. The gateway returns `POST_PERSISTENCE_FAILURE` with `exposure: "UNKNOWN"`.
- **Marker:** The gateway attempts an append-only write to `publication_outcome_uncertainty`:
  - `source_id`: canonical source ID
  - `tick_key`: channel + ISO instant
  - `retry_key`: unique retry key
  - `opportunity_ids_json`: JSON array of persisted IDs
  - `reason`: strictly `'ledger-acknowledgement-unconfirmed'`
  - `recorded_at`: canonical ISO UTC instant
- **Isolation:** If marker insertion fails (or duplicates), the gateway catches the error. The caller's result remains `UNKNOWN`.

### Invariant 2: Ledger Receipt Precedence over Uncertainty Markers
- **Rule:** A valid success receipt in `source_publication_ledger` (`mode IN ('unlimited', 'capped')`, `published_count > 0`, and the ID present in `published_ids_json`) is authoritative proof of publication.
- **Precedence:** If an opportunity ID is referenced in `publication_outcome_uncertainty` but also appears in a valid ledger receipt for that source, the ledger receipt **wins**.
- **Effect:** The opportunity is **NOT** deactivated by reconciliation passes; it remains active and public.

### Invariant 3: Idempotent Bounded Reconciliation & Invalidation
- **Unreceipted Acknowledgements Pass (`withdrawUnreceiptedAcknowledgements`):**
  - Identifies IDs in `publication_outcome_uncertainty` lacking a corresponding ledger receipt.
  - Deactivates only those active opportunities matching `source_id` and public PH eligibility:
    - `is_active = 0`
    - `inactive_reason = 'publication-unreceipted'`
    - `updated_at = observedAt`
  - Returns `{ withdrawnIds: number[] }`.
  - Calling twice in succession yields `{ withdrawnIds: [] }`.
- **Public Drift Invalidation Pass (`withdrawInvalidPublicDrift`):**
  - Scans active public opportunities where `locationType IN ('onsite', 'hybrid')` or `postedAt` is outside the inclusive 30-day window (`INVALID`, `FUTURE`, `STALE`).
  - Rechecks evidence at write time using a CAS predicate (`matchedEvidence` in the `WHERE` clause).
  - Deactivates matching rows:
    - `is_active = 0`
    - `inactive_reason = 'publication-drift'`
    - `updated_at = observedAt`
  - Returns `{ examined: number, withdrawnIds: number[] }`.
  - Calling twice in succession yields `{ examined: candidates.length, withdrawnIds: [] }`.
- **Permanence:** Inactive reasons `'publication-unreceipted'` and `'publication-drift'` are **not feed-recoverable** (a subsequent feed pull cannot reactivate them).

### Invariant 4: Serving Bounds and ADR-010 LKG Preservation
- **Live Outbound Apply Refusal (`/api/click/[id]`):**
  - Uses `publicOpportunityFilters()`: `is_active = 1` and `ph_eligibility IN ('eligible_verified', 'eligible_likely')`.
  - Withdrawn items immediately return HTTP 404, preventing job seekers from being sent to dead or invalid jobs.
  - If D1 is unavailable, returns HTTP 503 (`Retry-After: 30`, `Cache-Control: no-store`). Never bypasses eligibility checks.
- **Serving Snapshot Protection (`public-serving-snapshot.ts`):**
  - Rebuilding snapshots filters on the public predicate.
  - `validateSnapshotCandidate`: Rejects empty candidates or candidates where job count collapses below 10% of active board (when active board $\ge 20$).
  - Per ADR-010, the active LKG board is retained. Stale board availability is preserved rather than serving an empty board.

### Invariant 5: Manila-Day Snapshot & Flow Invariants
- **First Publish Accounting:** A withdrawn opportunity remains in `first_publish_count` and `firstPublishIds` for the Manila date of its first exposure (historical event integrity).
- **Still-Public Accounting:** A withdrawn opportunity leaves `still_public_count` and leaves `stillPublicIds`.
- **Snapshot Pair Reader:**
  - Evaluates an intact snapshot pair (`idsKnown === true`) against active IDs and unreceipted/uncertain IDs.
  - If all 5 IDs are active and free of unconfirmed uncertainty markers, returns the matched count (5).
  - If any ID is inactive, withdrawn, or has an unconfirmed uncertainty marker, returns `null`.
- **Flow Count Function:**
  - `flowCount("OPEN", matched)` returns `null`.
  - `flowCount("CLOSED", matched)` returns `null`.
  - Caller-supplied floor counts (100, 150) return `null`.
  - No `CLOSED` row is written to `source_publication_manila_open_snapshot`.

---

## 3. Function Signatures and Return Value Contracts

### 3.1 Manila-Day Flow Accounting (`packages/scraper/manila-day.ts`)

```typescript
/**
 * Verifies that an intact snapshot pair's still-public IDs remain active and
 * free of unreceipted uncertainty markers or pending withdrawals.
 * Disagreement or presence of unconfirmed uncertainty returns null.
 */
export function uncertainMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  rows: readonly { id: number; sourceUrl: string }[],
  ownedRows: readonly { id: number; sourceId: string }[],
  publishingSourceId: string,
  activeIds: readonly number[],
  uncertainIds: readonly number[],
): number | null;

/**
 * An uncertain-effects / withdrawal-matched still-public count on an OPEN snapshot
 * is not a completed Manila-day flow. Caller-supplied CLOSED state does not create
 * closed-day evidence. Caller-supplied 100 and 150 floor counts stay absent.
 */
export function uncertainMatchedManilaDayFlowCount(
  dayState: string,
  matchedCount: number | null,
): number | null;
```

#### Contract Table for `uncertainMatchedManilaStillPublicCount`

| Condition | Return Value | Rationale |
|---|---|---|
| `pair == null` or `pair.idsKnown !== true` | `null` | Unknown snapshot IDs cannot verify absence of uncertainty |
| `stillPublicCount !== pair.stillPublicIds.length` | `null` | Count disagreement indicates corrupted or mismatched snapshot |
| Any `id` in `pair.stillPublicIds` is missing from `activeIds` | `null` | Withdrawn or inactive ID cannot be matched |
| Any `id` in `pair.stillPublicIds` is present in `uncertainIds` | `null` | Unconfirmed uncertainty marker invalidates clean exposure |
| All 5 IDs in `pair.stillPublicIds` match active IDs, URLs, owned source, and $\emptyset \cap \text{uncertainIds}$ | `matched` (e.g. 5) | Exact agreement across all public invariants |

#### Contract Table for `uncertainMatchedManilaDayFlowCount`

| Inputs (`dayState`, `matchedCount`) | Return Value | Rationale |
|---|---|---|
| `("OPEN", 5)` | `null` | An OPEN day snapshot is not a completed flow |
| `("CLOSED", 5)` | `null` | No closed-day evidence exists; caller cannot fabricate CLOSED |
| `("OPEN", 100)` | `null` | Floor threshold 100 is not a flow |
| `("OPEN", 150)` | `null` | Stretch threshold 150 is not a flow |
| `("OPEN", null)` | `null` | Missing matched count stays absent |
| `("", 5)` | `null` | Invalid day state |

---

### 3.2 Publication Uncertainty Domain (`packages/scraper/publication-uncertainty.ts`)

```typescript
export const PUBLICATION_UNRECEIPTED_INACTIVE_REASON = "publication-unreceipted";

export interface UncertaintyDatabase {
  prepare(query: string): UncertaintyStatement;
}

/**
 * Records persisted opportunity IDs when subsequent ledger insert fails.
 * Does NOT roll back the physical row. Swallows errors to preserve UNKNOWN.
 */
export async function recordLostAcknowledgement(
  db: UncertaintyDatabase,
  request: { sourceId: string; tickKey: string; retryKey: string; now: string },
  ids: readonly number[],
): Promise<void>;

/**
 * Idempotently deactivates IDs named in publication_outcome_uncertainty
 * that have no matching success receipt in source_publication_ledger.
 */
export async function withdrawUnreceiptedAcknowledgements(
  db: UncertaintyDatabase,
  observedAt: string,
): Promise<{ withdrawnIds: number[] }>;
```

---

### 3.3 Publication Drift Withdrawal Domain (`apps/web/src/lib/publication-drift-withdrawal.ts`)

```typescript
export const PUBLICATION_DRIFT_INACTIVE_REASON = "publication-drift";

export type PublicationDriftWithdrawal = {
  examined: number;
  withdrawnIds: number[];
};

/**
 * Idempotently removes already-public rows whose stored workplace is explicit
 * non-remote, or whose stored original date is outside the current inclusive
 * 30-day window. Unknown dates and null workplace stay public.
 */
export async function withdrawInvalidPublicDrift(
  db: PublicationDb,
  observedAt: string,
): Promise<PublicationDriftWithdrawal>;
```

---

## 4. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Uncertainty Recording | `recordLostAcknowledgement` | Records unconfirmed ledger write in `publication_outcome_uncertainty` | `db`, `request`, `ids: number[]` | `Promise<void>` | Swallows duplicates/errors; caller stays `UNKNOWN` | `publication-uncertainty.ts:26` |
| 2 | Uncertainty Withdrawal | `withdrawUnreceiptedAcknowledgements` | Deactivates unreceipted marked IDs with reason `publication-unreceipted` | `db`, `observedAt: string` | `{ withdrawnIds: number[] }` | Missing table returns `{ withdrawnIds: [] }` | `publication-uncertainty.ts:53` |
| 3 | Drift Withdrawal | `withdrawInvalidPublicDrift` | Deactivates stored onsite/hybrid and stale original dates with CAS predicate | `db`, `observedAt: string` | `{ examined, withdrawnIds }` | Invalid observation instant returns `{ examined: 0, withdrawnIds: [] }` | `publication-drift-withdrawal.ts:26` |
| 4 | Live Apply Guard | Live Click Predicate | Outbound redirect checks `is_active = 1` and public PH eligibility | `id`, `url`, D1 binding | `302 Redirect` or `404 Not Found` | DB failure returns 503; invalid URL returns 403; withdrawn row returns 404 | `apps/web/src/pages/api/click/[id].ts:60` |
| 5 | Snapshot Anti-Collapse | `validateSnapshotCandidate` | Rejects candidate board if jobs collapse below 10% of active board | `candidate`, `activeBoard` | `{ ok: boolean, reason?: string }` | Returns `ok: false`; active LKG board retained | `public-serving-snapshot.ts:180` |
| 6 | Gateway Sequential Re-read | Policy Epoch Re-read | Re-reads source policy and canary cap immediately prior to `request.persist()` | `db`, `sourceId` | `PublicationPolicySnapshot` | Blocked/opted-out writes `blocked` ledger row and aborts before persist | `publication-gateway.ts:316` |
| 7 | Shared Reservation | Shared Canary Hold | Inserts reservation row in `source_publication_reservation` before persist | `source_id`, `tick_key`, `retry_key`, `count` | `void` | Trigger aborts if cap exceeded or table missing | `0057_publication_reservation.sql` |
| 8 | Manila-Day Reader | Active-Matched Still-Public Count | Verifies still-public IDs match active set | `stillPublicCount`, `pair`, `urlRows`, `ownedRows`, `publishingSourceId`, `activeIds` | `number \| null` | Mismatch or missing ID returns `null` | `manila-day.ts:664` |
| 9 | Manila-Day Reader | Uncertain-Effects Withdrawal Count | Verifies still-public IDs are free of unconfirmed uncertainty and withdrawals | `stillPublicCount`, `pair`, `urlRows`, `ownedRows`, `publishingSourceId`, `activeIds`, `uncertainIds` | `number \| null` | Presence of uncertain/withdrawn ID returns `null` | `SYSTEM_SAVEPOINT.md:32`, `astra777.txt:348` |
| 10 | Manila-Day Flow | Uncertain-Effects Day Flow Count | Evaluates whether matched uncertain-effects count constitutes a completed flow | `dayState: string`, `matchedCount: number \| null` | `number \| null` | Returns `null` for OPEN, CLOSED, 100, 150, or null | `manila-day.ts:687`, `SYSTEM_SAVEPOINT.md:32` |

---

## 5. Edge Cases and Counterexamples

| # | Feature | Input / Scenario | Observed / Mandated Behavior |
|---|---|---|---|
| 1 | `recordLostAcknowledgement` | Empty `ids` array `[]` or non-ISO timestamp | Returns immediately; zero rows inserted into `publication_outcome_uncertainty`. |
| 2 | `recordLostAcknowledgement` | Duplicate `retry_key` inserted | SQLite unique constraint caught; function swallows error; caller remains `UNKNOWN`. |
| 3 | `publication_outcome_uncertainty` | Direct SQLite UPDATE or DELETE attempted | Aborts via triggers: `'publication uncertainty is append-only'`. |
| 4 | `publication_outcome_uncertainty` | Caller attempts to supply positive `id` | Aborts via trigger: `'uncertainty id is SQLite-assigned'`. |
| 5 | `withdrawUnreceiptedAcknowledgements` | Opportunity has uncertainty marker AND a valid success ledger receipt | Ledger receipt takes precedence; opportunity is NOT deactivated; `withdrawnIds` does not contain it. |
| 6 | `withdrawUnreceiptedAcknowledgements` | Pre-existing active row has no ledger row and NO uncertainty marker | Historical stock is NOT treated as a lost ACK; row stays public. |
| 7 | `withdrawUnreceiptedAcknowledgements` | Second invocation on same database | Idempotent: returns `{ withdrawnIds: [] }`. |
| 8 | `withdrawInvalidPublicDrift` | Active opportunity with `postedAt = null` and `locationType = null` | Stays public; missing workplace is not non-remote proof; unknown date is existing hold. |
| 9 | `withdrawInvalidPublicDrift` | Opportunity concurrently edited from `onsite` to `remote` before withdrawal query | CAS predicate (`matchedEvidence`) fails in `WHERE` clause; 0 rows updated; not counted in `withdrawnIds`. |
| 10 | `withdrawInvalidPublicDrift` | Invalid `observedAt` timestamp (`"2026-01-01T00:00:00.000Z"` with `"invalid"`) | Returns `{ examined: 0, withdrawnIds: [] }` without executing DB candidate query. |
| 11 | `/api/click/[id]` | Click on opportunity withdrawn via `publication-drift` | Query with `publicOpportunityFilters()` finds no active row; returns HTTP 404. |
| 12 | `/api/click/[id]` | D1 database throws quota or timeout error | Catches error; logs warning; returns HTTP 503 (`Retry-After: 30`, `Cache-Control: no-store`). |
| 13 | `validateSnapshotCandidate` | Candidate has 1 job while active board has 25 jobs | Validation fails (`Suspicious job count collapse`); active board retained in memory. |
| 14 | `validateSnapshotCandidate` | Candidate has 0 jobs | Validation fails (`Unexpected empty candidate: 0 jobs`); LKG retained. |
| 15 | `uncertainMatchedManilaStillPublicCount` | Snapshot pair has 5 IDs, but ID 5 is present in `uncertainIds` | Returns `null`. |
| 16 | `uncertainMatchedManilaStillPublicCount` | Snapshot pair has 5 IDs, but ID 5 has become inactive | Returns `null`. |
| 17 | `uncertainMatchedManilaStillPublicCount` | Snapshot pair has 5 IDs, all active, no uncertainty markers | Returns `5`. |
| 18 | `uncertainMatchedManilaDayFlowCount` | Called with `dayState = "OPEN"` and `matchedCount = 5` | Returns `null` (not 5 and not 0). |
| 19 | `uncertainMatchedManilaDayFlowCount` | Called with `dayState = "CLOSED"` and `matchedCount = 5` | Returns `null` (caller cannot fabricate closed-day flow). |
| 20 | `uncertainMatchedManilaDayFlowCount` | Called with `dayState = "OPEN"` and `matchedCount = 100` | Returns `null` (floor threshold is not a flow). |
| 21 | `uncertainMatchedManilaDayFlowCount` | Called with `dayState = "OPEN"` and `matchedCount = 150` | Returns `null` (stretch threshold is not a flow). |
| 22 | Writer/Reader Isolation | Execution of reader functions | `source_publication_ledger` remains count 0; `day_state = 'CLOSED'` rows remain count 0. |

---

## 6. Preserved Holds and Negative Constraints

The implementation of `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT` must strictly adhere to these mandatory holds:

1. **Do NOT block the writer:**
   - Reader and reconciliation routines must be decoupled from ingestion writers.
   - Reconcilers run via asynchronous background jobs (e.g. `verify-links` cron), not inline with public ingest.
2. **Do NOT record CLOSED:**
   - Stored snapshot state remains `OPEN`. No `CLOSED` snapshot row is written to `source_publication_manila_open_snapshot`.
   - Flow readers return `null` for `"CLOSED"`.
3. **Do NOT claim MATH-08:**
   - Portfolio concentration figures (25% top source share, 40% top provider family share) remain diagnostic metrics.
   - This contract does not claim resolution of correlated failure domains or MATH-08 acceptance.
4. **Do NOT grant a source, change cadence, or add a clock:**
   - No new source admissions or registry overrides.
   - No cadence modifications to existing crons.
   - No new cron clocks or `julianday('now')` expressions added to migrations.
5. **Preserve existing stock and directory holds:**
   - Unknown dates and null workplace stay public.
   - Historical stock lacking ledger entries is NOT treated as failed acknowledgements.
   - Directory entries 234 (Upwork) and 237 (IntoGreat) remain proposals; 236 (FVA) remains parked; zero directory SQL executed.
   - Raw-lake sync remains fenced (`QUALIFIED_READY` is not publication authority).
   - Migrations 0056 through 0068 remain unapplied in production D1 until authorized.
