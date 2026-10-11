# Project: VA Freelance Hub — Manila Day Flow & Autonomous Execution Loop (Gen 6)

## Architecture
- **Manila Day Publication Accounting**: `packages/scraper/manila-day.ts`
  - Defines `phMatchedManilaDayFlowCount`, `canonicalUrlMatchedManilaDayFlowCount`, etc.
  - Invariant: A PH-matched still-public count is not a completed Manila-day flow (`phMatchedManilaDayFlowCount("OPEN", count)` is null, not count and not 0; `phMatchedManilaDayFlowCount("CLOSED", count)` is null; caller-supplied 100/150 return null).
- **Publication Gateway Integration**: `packages/scraper/publication-gateway.integration.test.ts`
  - Integration suite validating native SQLite snapshots, ledgers, and reader invariants.
- **Savepoint & Evidence Tracking**:
  - `docs/SYSTEM_SAVEPOINT.md`: Authoritative engineering savepoint with sole NEXT.
  - `docs/bootloaders/CURRENT.md`: Resume pointer.
  - `docs/operations/`: Detailed operations evidence documents.
- **Git Remote & Branch**:
  - Canonical remote: Google Secure Source Manager (`origin`)
  - Secondary remote: GitLab (`gitlab`, repository `cyrus-group4793641/va-freelance-hub`)
  - Branch: `codex/verified-flow-directory-checkpoint`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Completed predecessor slices | FAMILY_BREACH, FRESH_MATCHED, APPLY_MATCHED committed | M0 | Verified git log |
| 2 | PH matched is not completed flow | `phMatchedManilaDayFlowCount("OPEN", count)` is null, not count and not 0 | M1 | SYSTEM_SAVEPOINT sole NEXT |
| 3 | Closed state with PH matched is null | `phMatchedManilaDayFlowCount("CLOSED", count)` is null | M1 | SYSTEM_SAVEPOINT sole NEXT |
| 4 | Caller-supplied 100 & 150 stay absent | Caller-supplied 100 and 150 counts return null | M1 | SYSTEM_SAVEPOINT sole NEXT |
| 5 | Writer remains unblocked | Do not block the writer; ledger remains unmodified | M1 | SYSTEM_SAVEPOINT sole NEXT |
| 6 | Targeted adversarial verification | Run integration test for PH matched not a completed flow | M2 | Autonomous loop step 1 |
| 7 | Broader regression, typecheck, build | Run test suites, tsc, build cleanly, and 4 guardrail scripts | M2 | Autonomous loop step 2 |
| 8 | Git commit and dual remote push | Commit to SSM (origin) and mirror to GitLab (gitlab) | M3 | Autonomous loop step 3 |
| 9 | Checkpoint & evidence update | Update docs/SYSTEM_SAVEPOINT.md, CURRENT.md, and create operations evidence doc | M3 | Autonomous loop step 4 |
| 10 | Identify NEXT and continue | Identify next unresolved prerequisite (CANONICAL_URL_MATCH) and loop | M3 | Autonomous loop step 5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Predecessor slices committed | FAMILY_BREACH (52fd798a/92b562fc), FRESH_MATCHED (69f7f700/86a47c3a), APPLY_MATCHED (30a77752/31c3c073) | none | DONE |
| M1 | PUBLICATION_MANILA_DAY_PH_MATCHED_IS_NOT_A_COMPLETED_FLOW | Implement & verify PH matched flow invariants and test | M0 | IN_PROGRESS |
| M2 | Adversarial & Regression Suite Verification | Targeted test (298 pass), DB test (72 pass), typecheck, build, 4 guardrails | M1 | PLANNED |
| M3 | Canonical Commit, Dual Push & Savepoint Update | Git commit, push to SSM + GitLab, evidence docs, update savepoint with CANONICAL_URL_MATCH | M2 | PLANNED |

## Code Layout
- `packages/scraper/manila-day.ts`: Core readers and flow counters
- `packages/scraper/publication-gateway.integration.test.ts`: Integration test suite
- `docs/SYSTEM_SAVEPOINT.md`: Savepoint record
- `docs/bootloaders/CURRENT.md`: Continuation pointer
- `docs/plans/MATHEMATICAL_IMPROVEMENT_PLAN.md`: Mathematical progress register
- `docs/operations/`: Detailed evidence reports
