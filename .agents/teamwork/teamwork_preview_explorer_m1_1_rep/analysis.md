# Manila Day Flows & Invariant Architecture Analysis

**Investigator**: Explorer Agent (`teamwork_preview_explorer_m1_1_rep`)  
**Target Files**: `packages/scraper/manila-day.ts`, `packages/scraper/publication-gateway.integration.test.ts`, `packages/scraper/publication-uncertainty.ts`, `packages/scraper/publication-gateway.ts`  
**Timestamp**: 2026-10-11T05:25:00Z  

---

## 1. Executive Summary

This investigation analyzed the architectural structure, invariant enforcement patterns, and uncertainty/withdrawal contracts in `packages/scraper/manila-day.ts`, `packages/scraper/publication-gateway.integration.test.ts`, and associated subsystems.

Key findings:
1. **Layered Verification Pipeline in `manila-day.ts`**: The still-public count reader functions form a strict, hierarchically composed chain of predicate verifiers (`freshMatched` → `applyMatched` → `phMatched` → `canonicalUrlMatched` → `sourceMatched` → `activeMatched`). Each layer calls its predecessor and requires an exact set match (`samePositiveIds`) against an additional constraint set. Any violation immediately causes the function to return `null` (absent) rather than a degraded or partial count.
2. **Universal Flow Invariant (`*ManilaDayFlowCount === null`)**: Every single `*ManilaDayFlowCount` function in `manila-day.ts` unconditionally returns `null` for any `dayState` (`"OPEN"`, `"CLOSED"`, or arbitrary strings) and any count (including 100/150 floor counts). An open snapshot reader lacks closed-day cryptographic/ledger evidence, so caller-supplied state cannot fabricate a completed flow.
3. **Integration Test Invariant Verification Pattern**: Tests in `publication-gateway.integration.test.ts` operate in two complementary modes: (a) end-to-end database-backed lifecycle tests verifying mutations against `BunDb`/SQLite, and (b) synthetic fixture tests verifying that intact populated snapshot pairs (`idsKnown === true`, count = 5) still return `null` for all flow count calls.
4. **Uncertainty & Withdrawal Architecture**: While `manila-day.ts` contains read-only count queries, the uncertainty and withdrawal contracts live in `packages/scraper/publication-uncertainty.ts`, `packages/scraper/publication-gateway.ts`, and `apps/web/src/lib/publication-drift-withdrawal.ts`. When post-persistence failures occur (such as a ledger write failing after persistence succeeds), the gateway does NOT roll back; it records a durable marker in `publication_outcome_uncertainty` with `exposure: "UNKNOWN"`. Asynchronous reconciliation via `withdrawUnreceiptedAcknowledgements` deactivates orphaned records idempotently with `inactive_reason = 'publication-unreceipted'`.

---

## 2. In-Depth Analysis of `manila-day.ts` Invariants and Readers

### 2.1 The Architectural Call Hierarchy

In `packages/scraper/manila-day.ts`, still-public counts evaluate whether the IDs recorded in an open Manila day snapshot pair remain valid across an evolving series of filtering criteria:

```
agreedManilaStillPublicCount(stillPublicCount, pair)
  └── servingMatchedManilaStillPublicCount(stillPublicCount, pair, servingIds)
        └── remoteMatchedManilaStillPublicCount(..., remoteIds)
              └── freshMatchedManilaStillPublicCount(..., freshIds)
                    └── applyMatchedManilaStillPublicCount(..., applyIds)
                          └── phMatchedManilaStillPublicCount(..., phIds)
                                └── canonicalUrlMatchedManilaStillPublicCount(..., rows)
                                      └── sourceMatchedManilaStillPublicCount(..., ownedRows, publishingSourceId)
                                            └── activeMatchedManilaStillPublicCount(..., activeIds)
```

### 2.2 Detailed Implementation Breakdown

#### A. `freshMatchedManilaStillPublicCount` (lines 536–546) & `freshMatchedManilaDayFlowCount` (lines 551–555)
```typescript
export function freshMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  remoteIds: readonly number[],
  freshIds: readonly number[],
): number | null {
  const matched = remoteMatchedManilaStillPublicCount(stillPublicCount, pair, remoteIds, remoteIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, freshIds)) return null;
  return matched;
}

export function freshMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}
```
- **Invariant**: Verifies that all `stillPublicIds` match `remoteIds` and simultaneously match `freshIds` (original posting within inclusive 30 days). If any job is outside the window or unknown, it returns `null`.
- **Flow Count**: Unconditionally returns `null`.

#### B. `applyMatchedManilaStillPublicCount` (lines 560–570) & `applyMatchedManilaDayFlowCount` (lines 575–579)
```typescript
export function applyMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  freshIds: readonly number[],
  applyIds: readonly number[],
): number | null {
  const matched = freshMatchedManilaStillPublicCount(stillPublicCount, pair, freshIds, freshIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, applyIds)) return null;
  return matched;
}

export function applyMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}
```
- **Invariant**: Verifies that all `stillPublicIds` have resolvable outbound application/source URLs (`resolvePublicationOutboundUrl`). If any URL cannot be resolved, returns `null`.
- **Flow Count**: Unconditionally returns `null`.

#### C. `phMatchedManilaStillPublicCount` (lines 583–593) & `phMatchedManilaDayFlowCount` (lines 598–602)
```typescript
export function phMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  applyIds: readonly number[],
  phIds: readonly number[],
): number | null {
  const matched = applyMatchedManilaStillPublicCount(stillPublicCount, pair, applyIds, applyIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, phIds)) return null;
  return matched;
}

export function phMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}
```
- **Invariant**: Requires all `stillPublicIds` to possess Philippine eligibility (`PUBLIC_PH_ELIGIBILITIES`: "ph-only", "worldwide"). If any job is marked "ineligible", returns `null`.
- **Flow Count**: Unconditionally returns `null`.

#### D. `canonicalUrlMatchedManilaStillPublicCount` (lines 607–619) & `canonicalUrlMatchedManilaDayFlowCount` (lines 624–628)
```typescript
export function canonicalUrlMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  phIds: readonly number[],
  rows: readonly { id: number; sourceUrl: string }[],
): number | null {
  const matched = phMatchedManilaStillPublicCount(stillPublicCount, pair, phIds, phIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, rows.map((row) => row.id))) return null;
  const canonical = rows.map((row) => canonicalizeSourceUrl(row.sourceUrl));
  if (new Set(canonical).size !== canonical.length) return null;
  return matched;
}

export function canonicalUrlMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}
```
- **Invariant**: Verifies that every opportunity has a distinct canonical source URL (`canonicalizeSourceUrl`). If two or more IDs collapse to the same canonical URL, returns `null`. Does NOT collapse or pick a winner.
- **Flow Count**: Unconditionally returns `null`.

#### E. `sourceMatchedManilaStillPublicCount` (lines 633–651) & `sourceMatchedManilaDayFlowCount` (lines 656–660)
```typescript
export function sourceMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  rows: readonly { id: number; sourceUrl: string }[],
  ownedRows: readonly { id: number; sourceId: string }[],
  publishingSourceId: string,
): number | null {
  const matched = canonicalUrlMatchedManilaStillPublicCount(
    stillPublicCount,
    pair,
    rows.map((row) => row.id),
    rows,
  );
  if (matched === null || !pair) return null;
  if (publishingSourceId.length === 0) return null;
  if (!samePositiveIds(pair.stillPublicIds, ownedRows.map((row) => row.id))) return null;
  if (!ownedRows.every((row) => row.sourceId === publishingSourceId)) return null;
  return matched;
}

export function sourceMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}
```
- **Invariant**: Verifies that all `stillPublicIds` belong strictly to `publishingSourceId`. If any ID was transferred, reassigned, or originated from another source, returns `null`.
- **Flow Count**: Unconditionally returns `null`.

#### F. `activeMatchedManilaStillPublicCount` (lines 664–682) & `activeMatchedManilaDayFlowCount` (lines 687–691)
```typescript
export function activeMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  rows: readonly { id: number; sourceUrl: string }[],
  ownedRows: readonly { id: number; sourceId: string }[],
  publishingSourceId: string,
  activeIds: readonly number[],
): number | null {
  const matched = sourceMatchedManilaStillPublicCount(
    stillPublicCount,
    pair,
    rows,
    ownedRows,
    publishingSourceId,
  );
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, activeIds)) return null;
  return matched;
}

export function activeMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}
```
- **Invariant**: Verifies that every single ID in `pair.stillPublicIds` is actively marked `is_active = 1` in the database. If even one ID is soft-deleted, deactivated, or missing from `activeIds`, returns `null`.
- **Flow Count**: Unconditionally returns `null`.

---

## 3. Integration Test Patterns in `publication-gateway.integration.test.ts`

The integration test suite executes 302 integration tests. Across the test file, two distinct testing patterns verify Manila day flows:

### Pattern 1: Dynamic Lifecycle Invariant Adversarial Tests (lines 3160–3605)
For each predicate (fresh, apply, PH, canonical URL, source, active):
1. Execute `publishPublicExposure(new BunDb(sqlite), ...)` to establish genuine persisted database rows and initial snapshot records.
2. Load snapshot pairs via `loadSnapshotPair(sqlite)` and call `latestManilaSnapshotPair`.
3. Assert that initially all predicates match and the matched count equals the published count (e.g., 1).
4. Perform an adversarial in-place SQLite mutation:
   - For `fresh`: `UPDATE opportunities SET posted_at = '2020-01-01T00:00:00.000Z'` (stale) or `NULL`.
   - For `apply`: `UPDATE opportunities SET source_url = 'http://127.0.0.1/job', application_url = 'http://127.0.0.1/job'` (invalid loopback IP).
   - For `ph`: `UPDATE opportunities SET ph_eligibility = 'ineligible'`.
   - For `canonicalUrl`: `UPDATE opportunities SET source_url = 'https://Example.invalid/canonical-url-a'` (forcing duplicate canonical form).
   - For `source`: `UPDATE opportunities SET source_id = 'remotive'` (diverging from `we-work-remotely`).
   - For `active`: `UPDATE opportunities SET is_active = 0`.
5. Assert that the matched reader returns `null` (not 0, not a degraded count, not a partial set).
6. Verify database assertion:
   ```typescript
   expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
   ```
7. Revert the database mutation and assert the matched reader returns the positive count again.
8. Test the paired flow count function:
   ```typescript
   expect(activeMatchedManilaDayFlowCount(open!.day_state, matched)).toBeNull();
   expect(activeMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
   expect(activeMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
   expect(activeMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
   ```

### Pattern 2: Intact Populated Fixture Invariant Tests (lines 5622–5890)
These tests isolate the reader functions against populated, intact snapshot pairs without going through the ingestion write path:
- Directly inserts rows into `source_publication_manila_open_snapshot` and `source_publication_manila_snapshot_ids` with `day_state = 'OPEN'`, `first_publish_count = 5`, `still_public_count = 5`, and IDs `[1, 2, 3, 4, 5]`.
- Asserts that when all 5 IDs satisfy the invariant, the matching reader returns 5.
- Asserts that all variations of flow count return `null`:
  - `*ManilaDayFlowCount("OPEN", matched)` is `null`.
  - `*ManilaDayFlowCount("CLOSED", matched)` is `null`.
  - `*ManilaDayFlowCount("OPEN", 100)` is `null`.
  - `*ManilaDayFlowCount("OPEN", 150)` is `null`.
  - `*ManilaDayFlowCount("OPEN", null)` is `null`.
- Asserts that if any ID violates the constraint (e.g. subset `[1, 2, 3, 4]`), the matched reader returns `null`, and the flow count on that result also returns `null`.
- Asserts that the publication ledger remains untouched:
  ```typescript
  expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
  expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
  ```

---

## 4. Withdrawal, Uncertainty, and Ledger Reconciliation Subsystems

### 4.1 Subsystem Separation
Crucially, `packages/scraper/manila-day.ts` is purely a **read-side invariant calculator**. It does NOT perform state modifications, write transactions, rollbacks, or withdrawals.

The actual uncertainty, withdrawal, and ledger reconciliation mechanisms reside in:
1. `packages/scraper/publication-uncertainty.ts`
2. `packages/scraper/publication-gateway.ts`
3. `apps/web/src/lib/publication-drift-withdrawal.ts`
4. `apps/web/src/pages/api/cron/verify-links.ts`

### 4.2 Key Types, Tables, and Functions

| Artifact | Location | Role / Behavior |
|---|---|---|
| `publication_outcome_uncertainty` | `packages/db/migrations/0056_*.sql` & schema | Append-only table storing unacknowledged persistence attempts. Columns: `id`, `source_id`, `tick_key`, `retry_key`, `opportunity_ids_json`, `reason`, `recorded_at`. Triggers prevent UPDATE and DELETE. |
| `UNCERTAINTY_REASON` | `packages/scraper/publication-uncertainty.ts:4` | Fixed string `"ledger-acknowledgement-unconfirmed"`. |
| `PUBLICATION_UNRECEIPTED_INACTIVE_REASON` | `packages/scraper/publication-uncertainty.ts:3` | Fixed string `"publication-unreceipted"`. Non-feed-recoverable reason. |
| `recordLostAcknowledgement()` | `packages/scraper/publication-uncertainty.ts:26` | When `insertLedger` fails post-persistence in `publication-gateway.ts:526`, records the written IDs into `publication_outcome_uncertainty`. Swallows duplicate errors safely. |
| `withdrawUnreceiptedAcknowledgements()` | `packages/scraper/publication-uncertainty.ts:53` | Scans `publication_outcome_uncertainty`. Checks if `source_publication_ledger` contains a confirmed success receipt for each ID. If no receipt exists, updates `opportunities SET is_active = 0, inactive_reason = 'publication-unreceipted', updated_at = ?`. Idempotent. |
| `postPersistenceFailure()` | `packages/scraper/publication-gateway.ts:348` | Returns `{ ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true, exposure: "UNKNOWN", reason }`. Crucially: never rolls back the database row during write failure. |
| `withdrawInvalidPublicDrift()` | `apps/web/src/lib/publication-drift-withdrawal.ts:26` | Evaluates public rows for drift: deactivates rows if `locationType` is `"onsite"`/`"hybrid"` or if `postedAt` has aged outside the 30-day window. Sets `inactiveReason = 'publication-drift'`. |
| `verify-links.ts` cron | `apps/web/src/pages/api/cron/verify-links.ts:91-100` | Orchestrates the withdrawal pipeline: runs `withdrawInvalidPublicDrift`, then runs `withdrawUnreceiptedAcknowledgements`, then auto-archives 30-day stale feed items. |

### 4.3 Architectural Invariant: No Immediate Rollback on Write Failure
The publication gateway enforces an append-only, asynchronous reconciliation model:
1. When persistence succeeds but the ledger write fails, the gateway refuses to roll back the inserted opportunity rows because the transaction or sub-call may have already committed or partially persisted.
2. Rolling back in real-time risks creating silent drift or double-writing under concurrent retries.
3. Instead, the outcome is classified as `exposure: "UNKNOWN"` and recorded durably in `publication_outcome_uncertainty`.
4. Asynchronous reconciliation (`withdrawUnreceiptedAcknowledgements`) later evaluates whether a valid ledger receipt eventually committed (e.g. from a concurrent retry or delayed transaction). If no confirmed receipt exists, it safely deactivates the unreceipted records.
5. In accordance with ADR-010, this deactivation does not crash the public serving board; the public snapshot continues serving the Last Known Good (LKG) board until an atomic refresh takes place.

---

## 5. Synthesis & Context for Next Unit (`PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`)

From `docs/SYSTEM_SAVEPOINT.md`, `docs/IMPLEMENTATION_STATUS.md`, and `astra777.txt`:
- The previous sequence of local verification slices systematically established that intact snapshot pairs with any matched attribute (`FAMILY_OK`, `FAMILY_BREACH`, `FRESH_MATCHED`, `APPLY_MATCHED`, `PH_MATCHED`, `CANONICAL_URL_MATCHED`, `SOURCE_MATCHED`, `ACTIVE_MATCHED`) do NOT constitute a completed Manila-day flow (`*ManilaDayFlowCount(...) === null`).
- The current sole NEXT milestone is `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`:
  - Objective: Ensure partial failure, lost ACK, duplicate retry, ledger conflict, policy change, and stale/LKG exposure are observable and safely repairable across serving.
  - Constraints:
    - Explicit safe exposure bounds.
    - Durable uncertainty tracking.
    - Idempotent reconciliation and withdrawal receipts.
    - Do not block the writer.
    - Do not record `CLOSED` state in snapshots.
    - Do not claim MATH-08.
    - Do not grant a source, change cadence, or add a clock.
