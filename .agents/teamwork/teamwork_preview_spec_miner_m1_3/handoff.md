# Handoff Report: PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT

**Agent:** Specification Miner (`teamwork_preview_spec_miner_m1_3`)  
**Task:** Extract the exact specification, invariants, constraints, and acceptance criteria for `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`.  
**Date:** 2026-10-11  

---

## 1. Observation

Direct observations from authoritative project sources and repository state:

1. **`astra777.txt` Section E (lines 189–193, 205–206):**
   > "The code uses row mutation → row observation → ledger append, then asynchronous snapshot/cache/UI propagation. It is not distributed ACID; this audit does not demand a replacement architecture. Missing work is an explicit safe, observable, idempotent reconciliation and withdrawal model."
   > "Gateway policy is read at publication-gateway.ts:195 before persistence. Post-write row ownership is not a transactionally fenced registry epoch. Canary cumulative ledger triggers execute after physical writes. STRONG INFERENCE: revocation or competing-cap decisions can leave physical effects despite later receipt refusal... UNKNOWN truthfully preserves ambiguity but does not itself compensate or withdraw."
   > "This is an unresolved withdrawal/consistency contract, not a finding that accepted ADR-010 behavior alone violates governance. ADR-010 intentionally retains stale/LKG availability. Snapshot validation can reject empty or suspiciously collapsed boards, including legitimate mass withdrawal. No universal maximum stale-board age exists. Refresh thresholds/cache TTLs are not a proven withdrawal deadline. Preserve ADR-010 and reconcile revocation explicitly."

2. **`astra777.txt` Section H (#3 & #6, lines 291, 294):**
   > "| 3 | Uncertain effects/later drift | VERIFIED mechanism; extent UNKNOWN | Rows outlive failed receipts/changed validity | ACK/ledger failure and drift across row/snapshot/Apply | Durable uncertainty; explicit safe, idempotent reconciliation |"
   > "| 6 | Withdrawal versus stale/LKG | VERIFIED code/ADR tradeoff | Invalid inventory remains discoverable | Single and mass revocation under D1 failure | Accepted cross-surface withdrawal/stale exposure contract |"

3. **`astra777.txt` Section J (lines 348–357):**
   > "### PROBLEM UNIT: uncertain effects and withdrawal contract"
   > "**Invariant/objective:** partial failure and later invalidation are observable and safely repairable across serving."
   > "**Why next:** guarded activation leaves already-written rows and stale boards unresolved."
   > "**Evidence required:** row/ACK/ledger/snapshot fault matrix, later drift and mass withdrawal."
   > "**Minimal boundary:** gateway plus smallest compatible durable reconciliation/serving mechanism under ADR-010; no blanket distributed-ACID demand."
   > "**Adversarial tests:** lost ACK, duplicate retry, ledger conflict, policy change, stale/LKG, legitimate empty withdrawal, concurrent Inngest siblings."
   > "**Native verification:** transaction/constraint effects and actual public/Apply selectors; later authorized runtime observation."
   > "**Acceptance:** explicit safe exposure bounds, durable uncertainty, idempotent reconciliation/withdrawal receipts."
   > "**Unblocks:** trustworthy visibility and governed lake-commit prerequisites."

4. **`docs/SYSTEM_SAVEPOINT.md` lines 32–38:**
   > "**One NEXT: PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT.**"
   > "Partial failure and later invalidation are observable and safely repairable across serving."
   > "Lost ACK, duplicate retry, ledger conflict, policy change, and stale/LKG exposure require explicit safe exposure bounds, durable uncertainty, and idempotent reconciliation receipts. Do not block the writer. Do not record CLOSED. Do not claim MATH-08."
   > "Do not grant a source, change cadence, or add a clock."

5. **`docs/bootloaders/CURRENT.md` lines 10–12:**
   > "Behavior SHA `5f642df1`. Sole NEXT is PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT in the newest savepoint."

6. **Recent Implementation and Integration Tests:**
   - Commit `5f642df1` (`packages/scraper/publication-gateway.integration.test.ts:5842–5891`): Implemented `activeMatchedManilaStillPublicCount` (returns 5 when all 5 IDs remain active, null when any ID is inactive) and `activeMatchedManilaDayFlowCount` (returns null for OPEN and CLOSED).
   - Inactive reason constants:
     - `PUBLICATION_DRIFT_INACTIVE_REASON = "publication-drift"` (`apps/web/src/lib/publication-drift-withdrawal.ts:10`)
     - `PUBLICATION_UNRECEIPTED_INACTIVE_REASON = "publication-unreceipted"` (`packages/scraper/publication-uncertainty.ts:3`)
   - Serving guards:
     - `/api/click/[id].ts:60–67`: Queries `publicOpportunityFilters()`, returning 404 for deactivated opportunities.
     - `public-serving-snapshot.ts:269–289`: Rejects collapsed candidates and retains active LKG board per ADR-010.

---

## 2. Logic Chain

1. **Premise 1 (Decoupled Persistence & Ledger):** In `publication-gateway.ts`, physical rows are persisted in `opportunities` before writing `source_publication_ledger`. When the ledger append fails, physical rows exist but lack confirmed publication status. Returning `POST_PERSISTENCE_FAILURE` with `UNKNOWN` truthfully captures this state, while recording the affected IDs in `publication_outcome_uncertainty` creates a durable trail without premature rollback (Obs 1, Obs 4).
2. **Premise 2 (Ledger Receipt Dominance):** A valid receipt in `source_publication_ledger` is definitive proof of publication. If an opportunity ID is cited in `publication_outcome_uncertainty` but has a success ledger receipt, the receipt supersedes the uncertainty marker, and the job must not be deactivated (Obs 1, Obs 6).
3. **Premise 3 (Idempotent Bounded Invalidation):** Unreceipted markers without a ledger receipt must be deactivated via `withdrawUnreceiptedAcknowledgements` (`inactive_reason = 'publication-unreceipted'`). Stored opportunities that drift to onsite/hybrid or invalid dates must be deactivated via `withdrawInvalidPublicDrift` (`inactive_reason = 'publication-drift'`). Both operations must use conditional CAS predicates and structured receipts to ensure strict idempotence (Obs 3, Obs 6).
4. **Premise 4 (Serving Bounds under ADR-010):** When withdrawals occur, live outbound clicks (`/api/click/[id]`) immediately refuse the deactivated IDs with HTTP 404. However, snapshot candidate validation (`validateSnapshotCandidate`) rejects collapsed or empty candidate boards, preventing site-wide blackouts by maintaining the Last Known Good (LKG) board under ADR-010 (Obs 1, Obs 3, Obs 6).
5. **Premise 5 (Manila-Day Flow Invariance):** Following the established progression in `packages/scraper/manila-day.ts` (from fresh, apply, PH, canonical URL, source, to active), the uncertain-effects and withdrawal reader (`uncertainMatchedManilaStillPublicCount`) must verify that all still-public snapshot IDs are active and free of unconfirmed uncertainty markers. If any still-public ID has an unconfirmed marker or has been withdrawn, it returns `null`. The corresponding flow function (`uncertainMatchedManilaDayFlowCount`) must return `null` for both `OPEN` and caller-supplied `CLOSED` states, ensuring open days are never counted as completed flows (Obs 4, Obs 5, Obs 6).

---

## 3. Caveats

1. **Production Runtime Database State:** All observations and code analyses are based on checked-out repository code, native migrations, and in-memory SQLite fixtures. Deployed Cloudflare D1 and Google Cloud Run state was not directly probed (consistent with read-only audit constraints).
2. **Undeployed Migrations:** Migrations 0056 (`publication_outcome_uncertainty`) and 0057 (`source_publication_reservation`) are code-complete but documented as unapplied in production D1. Software contracts must fail closed or safely no-op when these tables are absent.
3. **Historical Stock Scope:** Opportunities created prior to gateway instrumentation lack ledger rows. The contract explicitly excludes historical stock lacking uncertainty markers from unreceipted withdrawal.

---

## 4. Conclusion

`PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT` is fully specified and ready for implementation. The contract spans two harmonized surfaces:
1. **The System Consistency & Serving Invalidation Surface:**
   - Durable uncertainty logging for lost acknowledgements (`POST_PERSISTENCE_FAILURE`, `exposure: "UNKNOWN"`).
   - Structured idempotent withdrawal passes with non-feed-recoverable reasons (`publication-unreceipted`, `publication-drift`).
   - Hard-stop outbound Apply refusal (HTTP 404) coupled with ADR-010 LKG board preservation.
2. **The Manila-Day Flow Accounting Surface (`packages/scraper/manila-day.ts`):**
   - `uncertainMatchedManilaStillPublicCount`: Returns the matched safe integer count (e.g. 5) when all still-public IDs are active and free of unconfirmed uncertainty markers, and `null` otherwise.
   - `uncertainMatchedManilaDayFlowCount`: Returns `null` for `"OPEN"`, `"CLOSED"`, 100, 150, or `null`.
   - Mandatory holds strictly preserved: zero writer blocking, zero `CLOSED` rows recorded, zero MATH-08 claims, zero source/cadence/clock modifications.

---

## 5. Verification Method

To independently verify this specification and its future implementation:

1. **Inspect Documentation Analysis:**
   - Read `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_spec_miner_m1_3\analysis.md`.
2. **Execute Targeted Integration Suite:**
   ```powershell
   bun test packages/scraper/publication-gateway.integration.test.ts
   ```
   Confirm all existing 302 tests pass without regressions.
3. **Execute Native Drift and Verifier Tests:**
   ```powershell
   bun test apps/web/tests/native-publication-drift.test.ts
   ```
4. **Typecheck and Build:**
   ```powershell
   bun run typecheck
   bun run build
   ```
5. **Invalidation Conditions:**
   - If any implementation writes a `CLOSED` row to `source_publication_manila_open_snapshot`, the invariant is broken.
   - If `uncertainMatchedManilaDayFlowCount("OPEN", 5)` returns a non-null number, the contract is violated.
   - If historical stock lacking an uncertainty marker is deactivated by `withdrawUnreceiptedAcknowledgements`, the contract is violated.
   - If `/api/click/[id]` redirects an inactive or withdrawn job, the contract is violated.
