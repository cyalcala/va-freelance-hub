# Handoff Report: Investigation of Publication Gateway Uncertainty, Ledger Reconciliation, and Withdrawal Architecture

**Agent:** Teamwork Explorer (`teamwork_preview_explorer_m1_2_rep`)  
**Parent / Caller:** `ab0e672b-5bad-47de-b38b-27a86a9fe0d1`  
**Milestone:** `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`  
**Status:** Hard Handoff (Investigation Complete)  
**Detailed Analysis File:** `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_explorer_m1_2_rep\analysis.md`  

---

## 1. Observation

Direct code observations from inspected files:

1. **Publication Gateway (`packages/scraper/publication-gateway.ts`)**:
   - `publishPublicExposure` (lines 263–534):
     - Line 279–281: `const prior = await db.prepare(LOAD_RETRY_SQL).bind(request.retryKey).first<PublicationReplayRow>(); if (prior) return replayedResult(prior, request);`
     - Lines 348–350: `function postPersistenceFailure(reason: string): PublishPublicExposureResult { return { ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true, exposure: "UNKNOWN", reason }; }`
     - Lines 506–509: If `persist(request.proposedCount)` throws, catches and returns `postPersistenceFailure("publication persistence did not complete with a valid acknowledgement")`. No uncertainty marker is written.
     - Lines 511–513: If `snapshotAcknowledgement(persisted)` returns null, returns `postPersistenceFailure("publication persistence returned an invalid acknowledgement")`. No uncertainty marker is written.
     - Lines 515–521: If `hasCurrentOwnership(db, request.sourceId, acknowledgement.ids, request.now)` fails or throws, returns `postPersistenceFailure(...)`. No uncertainty marker is written.
     - Lines 523–528: If `insertLedger(...)` throws, it executes:
       ```ts
       await recordLostAcknowledgement(db, request, acknowledgement.ids);
       return postPersistenceFailure("publication acknowledgement ledger write did not complete");
       ```
     - Lines 536–552: Canary capacity reservation via `reserveCanaryCapacity` using `source_publication_reservation` (migration `0057`).
     - Lines 597–835: Post-ledger side-effects record portfolio measurements and Manila day open snapshots (`INSERT INTO source_publication_manila_open_snapshot ... 'OPEN'`). Day state is never `CLOSED`. Errors in side-effects are swallowed (`catch {}`) so they do not convert a successful ledger write into `UNKNOWN`.

2. **Publication Uncertainty (`packages/scraper/publication-uncertainty.ts`)**:
   - Lines 17–19: `INSERT INTO publication_outcome_uncertainty (source_id, tick_key, retry_key, opportunity_ids_json, reason, recorded_at) VALUES (?, ?, ?, ?, 'ledger-acknowledgement-unconfirmed', ?)`
   - Lines 53–102: `withdrawUnreceiptedAcknowledgements(db, observedAt)`:
     - Scans `publication_outcome_uncertainty`.
     - Checks if a matching positive receipt exists in `source_publication_ledger`.
     - If no receipt exists, updates `opportunities`: `SET is_active = 0, inactive_reason = 'publication-unreceipted', updated_at = ?`.
     - Non-feed-recoverable reason. Repeated invocations withdraw 0 IDs.

3. **Opportunity Withdrawal & Link Verification (`apps/web/src/lib/publication-drift-withdrawal.ts` & `apps/web/src/pages/api/cron/verify-links.ts`)**:
   - `withdrawInvalidPublicDrift` (`publication-drift-withdrawal.ts`, lines 26–72):
     - Scans `opportunities` where `is_active = true` and `ph_eligibility IN (PUBLIC_PH_ELIGIBILITIES)` for `locationType IN ('onsite', 'hybrid')` or `postedAt` outside the 30-day window.
     - Deactivates matching rows with `is_active = false, inactive_reason = 'publication-drift'`.
   - `api/cron/verify-links.ts` (lines 91–250):
     - Executes `withdrawInvalidPublicDrift` and `withdrawUnreceiptedAcknowledgements`.
     - Archives stale feeds: `unixepoch(coalesce(lastSeenInFeedAt, scrapedAt)) < unixepoch(staleCutoff)` -> `inactive_reason = 'stale-feed'`.
     - Deactivates failed HTTP checks after 3 strikes -> `inactive_reason = 'link-unavailable'`.
     - Deactivates landing page geo locks -> `inactive_reason = 'policy-rejected', ph_eligibility = 'ineligible'`.
   - `apps/web/src/lib/inactive-reason.ts` (lines 1–10):
     - `RECOVERABLE_INACTIVE_REASONS = ["stale-feed", "link-unavailable"] as const`.
     - `isFeedRecoverableInactiveReason` returns false for `'publication-drift'`, `'publication-unreceipted'`, `'policy-rejected'`, `'invalid-source-url'`.

4. **Public Serving Snapshot Bounds (`apps/web/src/lib/public-serving-snapshot.ts`) & Click Gate (`apps/web/src/pages/api/click/[id].ts`)**:
   - Snapshot caching:
     - Warm in-memory slot TTL: 15 minutes (`FRESH_MS = 15 * 60 * 1000`).
     - Stale threshold: 60 minutes (`REBUILD_AFTER_MS = 60 * 60 * 1000`).
     - Cold isolate rebuild lease: 10 minutes (`LEASE_MS = 10 * 60 * 1000`).
     - Anti-collapse check (lines 278–293): Rejects candidate if `c.jobs.length < Math.floor(activeCount * 0.1)` or `c.jobs.length === 0`.
     - Fallback: `getDurableLkgSnapshot()` (`apps/web/src/lib/durable-lkg-snapshot.ts`) serves static bundled snapshot with header `X-Public-Snapshot: lkg_fallback`.
   - Click Endpoint gate (`click/[id].ts`, lines 60–102):
     - Live D1 query: `SELECT sourceUrl, applicationUrl FROM opportunities WHERE id = ? AND is_active = 1 AND ph_eligibility IN (PUBLIC_PH_ELIGIBILITIES)`.
     - If opportunity was deactivated in D1: returns 404 ("Job not found").
     - If D1 unavailable/timing out: returns 503 ("We couldn't verify this posting right now. Please retry shortly. A stale board cannot prove that this job remains eligible or unwithdrawn.").

5. **Manila Day Invariant Progression (`packages/scraper/manila-day.ts`)**:
   - Lines 536–692 implement:
     - `freshMatchedManilaStillPublicCount` -> `freshMatchedManilaDayFlowCount` (null)
     - `applyMatchedManilaStillPublicCount` -> `applyMatchedManilaDayFlowCount` (null)
     - `phMatchedManilaStillPublicCount` -> `phMatchedManilaDayFlowCount` (null)
     - `canonicalUrlMatchedManilaStillPublicCount` -> `canonicalUrlMatchedManilaDayFlowCount` (null)
     - `sourceMatchedManilaStillPublicCount` -> `sourceMatchedManilaDayFlowCount` (null)
     - `activeMatchedManilaStillPublicCount` -> `activeMatchedManilaDayFlowCount` (null)
   - Every `...DayFlowCount(dayState, ...)` returns `null` for both `"OPEN"` and caller-supplied `"CLOSED"`.

---

## 2. Logic Chain

1. **From Observations 1 & 2**:
   - When a writer persists rows but the ledger insertion fails, the physical rows exist in `opportunities` with `is_active = 1`.
   - The gateway records a durable uncertainty marker in `publication_outcome_uncertainty` and returns `POST_PERSISTENCE_FAILURE` with `exposure: "UNKNOWN"`.
   - Later, `withdrawUnreceiptedAcknowledgements` reconciles this by deactivating unreceipted IDs with `inactive_reason = 'publication-unreceipted'`.
   - Therefore, lost acknowledgements are durably recorded and safely repairable.

2. **From Observations 1, 3, & 4**:
   - When an opportunity is deactivated in D1, the public serving snapshot may lag for up to 15–60 minutes in memory/edge cache or indefinitely in LKG fallback.
   - However, the apply flow is guarded by `/api/click/[id]`, which verifies active status directly against D1 at request time.
   - If deactivated, `/api/click/[id]` returns 404; if D1 is unreachable, it returns 503 with the explicit reason `"A stale board cannot prove that this job remains eligible or unwithdrawn."`
   - Therefore, serving exposure is strictly bounded and safe against stale/LKG leaks.

3. **From Observations 1, 3, & 5**:
   - The system currently enforces an unbroken invariant sequence proving that intact snapshot pairs with various matching criteria (`fresh`, `apply`, `ph`, `canonical-url`, `source`, `active`) do **not** constitute a completed Manila-day flow (`DayFlowCount` returns null; ledger is not written; `CLOSED` is never recorded).
   - In accordance with `SYSTEM_SAVEPOINT.md`, the next unit `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT` requires:
     > *"Partial failure and later invalidation are observable and safely repairable across serving. Lost ACK, duplicate retry, ledger conflict, policy change, and stale/LKG exposure require explicit safe exposure bounds, durable uncertainty, and idempotent reconciliation receipts. Do not block the writer. Do not record CLOSED. Do not claim MATH-08."*
   - Therefore, `packages/scraper/manila-day.ts` must be extended with:
     - `withdrawalSafeManilaStillPublicCount`: verifies that still-public IDs are active, free from unconfirmed uncertainty markers, and belong to a valid non-opted-out source.
     - `withdrawalSafeManilaDayFlowCount`: returns `null` for both OPEN and caller-supplied CLOSED, preserving the non-flow invariant without claiming MATH-08.

---

## 3. Caveats

1. **Undeployed Migrations in Production**:
   - Migrations `0056` (`publication_outcome_uncertainty`) and `0057` (`source_publication_reservation`) are verified in local code and bun:sqlite integration tests, but noted as unapplied to production D1 in `docs/SYSTEM_SAVEPOINT.md`.
2. **Policy Change Post-Write Gap**:
   - Opportunities whose sources opt out post-write are currently blocked from future ingestion, but D1 does not currently have a cron scanning and withdrawing already-active opportunities against `source_opt_outs`.
3. **No Code Modification**:
   - This task is strictly a read-only investigation. No implementation changes to source code or migrations were made.

---

## 4. Conclusion

1. **Current State:**
   - `packages/scraper/publication-gateway.ts` effectively separates pre-persistence blocks from post-persistence uncertainty (`POST_PERSISTENCE_FAILURE`, `exposure: "UNKNOWN"`).
   - Lost ledger acknowledgements are captured in `publication_outcome_uncertainty` and repaired via `withdrawUnreceiptedAcknowledgements`.
   - Duplicate retries are replayed idempotently without calling `persist()`.
   - Ledger conflicts are safely resolved because unique constraints on `retry_key` prevent double-allocation, and losing writers fall back to uncertainty markers.
   - Public snapshot lag is safely shielded from job seekers by the live D1 check in `/api/click/[id]`.
2. **Required Contract Implementation (`PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`)**:
   - Implement `withdrawalSafeManilaStillPublicCount` and `withdrawalSafeManilaDayFlowCount` in `packages/scraper/manila-day.ts`.
   - Add integration tests in `packages/scraper/publication-gateway.integration.test.ts` locking these readers.
   - Enforce:
     - Fails to `null` if any ID is marked in `publication_outcome_uncertainty` without a ledger receipt.
     - Fails to `null` if publishing source has opted out.
     - `withdrawalSafeManilaDayFlowCount` returns `null` for `"OPEN"` and caller-supplied `"CLOSED"`.
     - Zero ledger writes and zero `CLOSED` rows in `source_publication_manila_open_snapshot`.
     - Writer is never blocked; no claim of MATH-08.

---

## 5. Verification Method

To independently verify these findings and any future implementation:

1. **Inspect Files**:
   - `packages/scraper/publication-gateway.ts` (lines 263–534, 523–528)
   - `packages/scraper/publication-uncertainty.ts` (lines 17–102)
   - `packages/scraper/manila-day.ts` (lines 662–692)
   - `apps/web/src/lib/public-serving-snapshot.ts` (lines 269–293, 833–938)
   - `apps/web/src/pages/api/click/[id].ts` (lines 60–102)
   - `apps/web/src/pages/api/cron/verify-links.ts` (lines 91–116)

2. **Run Test Suites**:
   - Targeted gateway integration tests:
     ```sh
     bun test packages/scraper/publication-gateway.integration.test.ts
     ```
   - Full publication gateway unit tests:
     ```sh
     bun test packages/scraper/publication-gateway.test.ts
     ```
   - TypeScript typecheck:
     ```sh
     bun run typecheck
     ```
   - Guardrail CI audits:
     ```sh
     bun run scripts/ci/guardrail-audits.ts
     ```

3. **Invalidation Conditions**:
   - If `withdrawalSafeManilaDayFlowCount` returns a non-null number for an OPEN day, the invariant is violated.
   - If `CLOSED` is written to `source_publication_manila_open_snapshot`, the invariant is violated.
   - If a writer throws an unhandled error or crashes during verification, the non-blocking invariant is violated.
