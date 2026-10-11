# Project: VA Freelance Hub — Manila Day Flow & Verified Autonomous Loop

## Architecture
- **Manila Day Publication Accounting**: `packages/scraper/manila-day.ts`
  - Defines `sameSourcePairManilaFamilyStatus`, `sameSourcePairManilaDayFlowCount`, `remoteMatchedManilaFamilyStatus`, `latestManilaSnapshotPair`, `loadedSameSourcePairManilaFamilyStatus`.
  - Invariant: An intact snapshot pair whose same-source family status is `OK` is not a completed Manila-day flow (`sameSourcePairManilaDayFlowCount` returns `null` for "OPEN" and "CLOSED" states; caller-supplied 100/150 return `null`).
- **Publication Gateway Integration**: `packages/scraper/publication-gateway.integration.test.ts`
  - Integration suite validating native SQLite snapshots, ledgers, and reader invariants.
- **Savepoint & Evidence Tracking**:
  - `docs/SYSTEM_SAVEPOINT.md`: Authoritative engineering savepoint with sole NEXT.
  - `docs/bootloaders/CURRENT.md`: Resume pointer.
  - `docs/operations/PUBLICATION_MANILA_DAY_FAMILY_OK_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`: Verified evidence document.
- **Git Remote & Branch**:
  - Canonical remote: Google Secure Source Manager (`origin`)
  - Branch: `codex/verified-flow-directory-checkpoint`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Family OK is not a completed flow | An intact snapshot pair whose family status is OK returns null flow count (not total, not 0) | M1 | SYSTEM_SAVEPOINT sole NEXT |
| 2 | Closed state with family OK is null | `sameSourcePairManilaDayFlowCount("CLOSED", "OK", total)` returns null | M1 | SYSTEM_SAVEPOINT sole NEXT |
| 3 | Caller-supplied 100 & 150 stay absent | Caller-supplied 100 and 150 counts return null | M1 | SYSTEM_SAVEPOINT sole NEXT |
| 4 | Writer remains unblocked | Do not block the writer; ledger remains unmodified | M1 | SYSTEM_SAVEPOINT sole NEXT |
| 5 | Targeted adversarial verification | Run integration test for family OK not a completed flow | M2 | Autonomous loop step 1 |
| 6 | Broader regression, typecheck, build | Run test suites, tsc, and build cleanly | M2 | Autonomous loop step 2 |
| 7 | Git commit and push | Commit to canonical Google Secure Source Manager on codex/verified-flow-directory-checkpoint | M3 | Autonomous loop step 3 |
| 8 | Checkpoint & evidence update | Update docs/SYSTEM_SAVEPOINT.md, CURRENT.md, and create operations evidence doc | M3 | Autonomous loop step 4 |
| 9 | Identify NEXT and continue | Identify next unresolved prerequisite and loop | M3 | Autonomous loop step 5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | PUBLICATION_MANILA_DAY_FAMILY_OK_IS_NOT_A_COMPLETED_FLOW verification | Implement/verify test & logic for family OK not completed flow | none | IN_PROGRESS |
| M2 | Adversarial & Regression Suite Verification | Targeted test (294+ pass), broader test suite, typecheck, build | M1 | PLANNED |
| M3 | Canonical Commit, Checkpoint Update & Continuation | Git commit/push, evidence docs, update savepoint with next NEXT | M2 | PLANNED |

## Code Layout
- `packages/scraper/manila-day.ts`: Core readers and flow counters
- `packages/scraper/publication-gateway.integration.test.ts`: Integration test suite
- `docs/SYSTEM_SAVEPOINT.md`: Savepoint record
- `docs/bootloaders/CURRENT.md`: Continuation pointer
- `docs/plans/MATHEMATICAL_IMPROVEMENT_PLAN.md`: Mathematical progress register
- `docs/operations/`: Detailed evidence reports
