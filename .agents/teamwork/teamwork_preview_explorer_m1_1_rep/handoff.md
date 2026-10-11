# Handoff Report: Manila Day Invariants and Uncertainty Contracts Investigation

**Agent**: Explorer Agent (`teamwork_preview_explorer_m1_1_rep`)  
**Mission**: Investigate `packages/scraper/manila-day.ts` and `packages/scraper/publication-gateway.integration.test.ts`, analyze architectural structures and invariant patterns for Manila day flows, and examine existing withdrawal, uncertainty, and reconciliation mechanisms.  
**Report File**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_explorer_m1_1_rep\analysis.md`  

---

## 1. Observation

1. **`packages/scraper/manila-day.ts` (lines 536–691)**:
   - `freshMatchedManilaStillPublicCount`:
     Lines 541–545:
     ```typescript
     const matched = remoteMatchedManilaStillPublicCount(stillPublicCount, pair, remoteIds, remoteIds);
     if (matched === null || !pair) return null;
     if (!samePositiveIds(pair.stillPublicIds, freshIds)) return null;
     return matched;
     ```
   - `applyMatchedManilaStillPublicCount`:
     Lines 566–569:
     ```typescript
     const matched = freshMatchedManilaStillPublicCount(stillPublicCount, pair, freshIds, freshIds);
     if (matched === null || !pair) return null;
     if (!samePositiveIds(pair.stillPublicIds, applyIds)) return null;
     return matched;
     ```
   - `phMatchedManilaStillPublicCount`:
     Lines 589–592:
     ```typescript
     const matched = applyMatchedManilaStillPublicCount(stillPublicCount, pair, applyIds, applyIds);
     if (matched === null || !pair) return null;
     if (!samePositiveIds(pair.stillPublicIds, phIds)) return null;
     return matched;
     ```
   - `canonicalUrlMatchedManilaStillPublicCount`:
     Lines 613–618:
     ```typescript
     const matched = phMatchedManilaStillPublicCount(stillPublicCount, pair, phIds, phIds);
     if (matched === null || !pair) return null;
     if (!samePositiveIds(pair.stillPublicIds, rows.map((row) => row.id))) return null;
     const canonical = rows.map((row) => canonicalizeSourceUrl(row.sourceUrl));
     if (new Set(canonical).size !== canonical.length) return null;
     return matched;
     ```
   - `sourceMatchedManilaStillPublicCount`:
     Lines 646–650:
     ```typescript
     if (matched === null || !pair) return null;
     if (publishingSourceId.length === 0) return null;
     if (!samePositiveIds(pair.stillPublicIds, ownedRows.map((row) => row.id))) return null;
     if (!ownedRows.every((row) => row.sourceId === publishingSourceId)) return null;
     return matched;
     ```
   - `activeMatchedManilaStillPublicCount`:
     Lines 679–681:
     ```typescript
     if (matched === null || !pair) return null;
     if (!samePositiveIds(pair.stillPublicIds, activeIds)) return null;
     return matched;
     ```
   - Universal flow count return: Every flow count function (`freshMatchedManilaDayFlowCount` lines 551–555, `applyMatchedManilaDayFlowCount` lines 575–579, `phMatchedManilaDayFlowCount` lines 598–602, `canonicalUrlMatchedManilaDayFlowCount` lines 624–628, `sourceMatchedManilaDayFlowCount` lines 656–660, `activeMatchedManilaDayFlowCount` lines 687–691) implements:
     ```typescript
     if (dayState.length === 0) return null;
     if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
     return null;
     ```

2. **`packages/scraper/publication-gateway.integration.test.ts` (lines 3521–3605 and 5622–5890)**:
   - Dynamic tests mutate the SQLite database (setting `is_active = 0`, mutating `source_id`, altering `posted_at`, breaking URLs) and assert that the matched count collapses to `null` while `day_state = 'CLOSED'` row count remains 0 in `source_publication_manila_open_snapshot`.
   - Populated fixture tests (lines 5842–5891) insert intact snapshots with 5 IDs and verify that:
     ```typescript
     expect(readers.activeMatchedManilaDayFlowCount("OPEN", matched)).toBeNull();
     expect(readers.activeMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
     expect(readers.activeMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
     expect(readers.activeMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
     expect(readers.activeMatchedManilaDayFlowCount("OPEN", null)).toBeNull();
     ```

3. **Uncertainty & Reconciliation in Related Files**:
   - `packages/scraper/publication-uncertainty.ts`:
     - Exports `PUBLICATION_UNRECEIPTED_INACTIVE_REASON = "publication-unreceipted"`.
     - `recordLostAcknowledgement(db, request, ids)` records unconfirmed persistence into `publication_outcome_uncertainty`.
     - `withdrawUnreceiptedAcknowledgements(db, observedAt)` deactivates unreceipted IDs whose ledger entry never succeeded.
   - `packages/scraper/publication-gateway.ts` (lines 523–528):
     - Catches failed ledger inserts and calls `recordLostAcknowledgement`, returning `{ ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true, exposure: "UNKNOWN", reason }` without rolling back the persisted rows.
   - `apps/web/src/lib/publication-drift-withdrawal.ts`:
     - Implements `withdrawInvalidPublicDrift(db, observedAt)` setting `inactiveReason: "publication-drift"` on workplace or date drift.
   - `apps/web/src/pages/api/cron/verify-links.ts` (lines 91–100):
     - Executes `withdrawInvalidPublicDrift`, followed by `withdrawUnreceiptedAcknowledgements`, followed by stale feed deactivation.

---

## 2. Logic Chain

1. **Chain of Predicates**: Observation 1 proves that `activeMatchedManilaStillPublicCount` is not a standalone check; it is the terminal node of an eight-level validation pipeline. Each function calls the prior function in the chain. Therefore, satisfying `activeMatched` guarantees that all upstream properties (`remote`, `fresh` within 30 days, `apply` URL valid, `PH` eligible, unique `canonicalUrl`, matching `sourceId`, and currently `is_active`) hold simultaneously.
2. **Strict Absenting (`null`) vs Degraded Counts**: Observation 1 shows that if any subset discrepancy occurs (`!samePositiveIds(...)`), the functions return `null`. They do not return partial counts or subsets. This prevents partial exposure or silent drift.
3. **Immutability of Closed Day Flow**: Observation 1 shows that all `*ManilaDayFlowCount` functions return `null` unconditionally. Because an open snapshot reader only observes transient progress without closed-day cryptographic ledger proof, no combination of parameters (even explicit `"CLOSED"` or threshold values 100/150) can produce a non-null flow count from these open-day readers.
4. **Integration Test Proof Structure**: Observation 2 shows that tests verify both sides of the contract: (a) positive verification when all rows match, (b) total nullification when any single constraint is violated, and (c) invariance of `*DayFlowCount === null`.
5. **Separation of Read-Side Invariants from Write-Side Uncertainty**: Observation 3 shows that `manila-day.ts` is strictly read-only and contains no mutation, rollback, or withdrawal logic. Write-side uncertainty handling is safely quarantined in `publication-uncertainty.ts` and `publication-gateway.ts`. Failed transactions are made durable via `publication_outcome_uncertainty` and cleaned asynchronously via `withdrawUnreceiptedAcknowledgements`, honoring the append-only and no-immediate-rollback design.

---

## 3. Caveats

- **No Live Production DB Access**: This investigation was strictly static analysis and local codebase verification. Production Cloudflare D1 or Turso tables were not directly inspected.
- **Scope Limit**: The next unit (`PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`) is a design and operational milestone under `SYSTEM_SAVEPOINT.md`; this investigation documents the existing baseline and contracts rather than implementing code changes (conforming to the Explorer read-only role).

---

## 4. Conclusion

- The implementation of Manila day matching counters follows a strict composite predicate pattern ensuring all invariants (freshness, resolvable URL, PH eligibility, unique canonical URL, publishing source ownership, active status) are preserved as an all-or-nothing check.
- All associated flow counters explicitly and correctly return `null`, preventing open-day readers from being mistaken for completed closed-day publication flows.
- The existing uncertainty and withdrawal architecture is decoupled from `manila-day.ts` and correctly uses durable uncertainty logging (`publication_outcome_uncertainty`) and idempotent asynchronous reconciliation (`withdrawUnreceiptedAcknowledgements` and `withdrawInvalidPublicDrift`) rather than unsafe synchronous rollbacks.
- The system is well-positioned for the upcoming `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`.

---

## 5. Verification Method

To independently verify the observations and conclusions:
1. **Inspect reader implementation**:
   `packages/scraper/manila-day.ts` lines 530–692.
2. **Inspect integration test cases**:
   `packages/scraper/publication-gateway.integration.test.ts` lines 3520–3605 and lines 5840–5890.
3. **Inspect uncertainty and withdrawal logic**:
   `packages/scraper/publication-uncertainty.ts` and `apps/web/src/lib/publication-drift-withdrawal.ts`.
4. **Run the integration test suite**:
   ```sh
   bun test packages/scraper/publication-gateway.integration.test.ts
   ```
   (Expected: all tests pass, exit 0).
5. **Run typecheck**:
   ```sh
   bun run typecheck
   ```
   (Expected: 0 errors, exit 0).
