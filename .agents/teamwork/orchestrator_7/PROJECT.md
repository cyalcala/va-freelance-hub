# Project: VA Freelance Hub — Uncertain Effects Withdrawal Contract & Autonomous Execution Loop (Gen 7)

## Architecture
- **Manila Day Publication Accounting & Invariants**: `packages/scraper/manila-day.ts`
  - Defines readers, flow counters, snapshot pair evaluations, and withdrawal/uncertainty status.
- **Publication Gateway & Integration Tests**: `packages/scraper/publication-gateway.integration.test.ts`
  - Integration suite validating native SQLite snapshots, ledgers, uncertainty, and reader invariants.
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
| 1 | Completed predecessor slices | ACTIVE_MATCHED (code 5f642df1, doc 301820d3) committed | M0 | Verified git log |
| 2 | Codebase Survey & Invariant Investigation | Mapped withdrawal contracts, uncertain effects, and gateway tests | M1 | Survey Phase (DONE) |
| 3 | PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT Implementation | Implement explicit safe exposure bounds, durable uncertainty, and idempotent reconciliation receipts | M2 | SYSTEM_SAVEPOINT sole NEXT (IN_PROGRESS) |
| 4 | Targeted adversarial verification | Run targeted integration tests for uncertain effects and withdrawal invariants | M3 | Autonomous loop step 1 |
| 5 | Broader regression, typecheck, build | Run test suites, tsc, build cleanly, and 4 guardrail scripts | M3 | Autonomous loop step 2 |
| 6 | Git commit and dual remote push | Commit to SSM (origin) and mirror to GitLab (gitlab) | M4 | Autonomous loop step 3 |
| 7 | Checkpoint & evidence update | Update docs/SYSTEM_SAVEPOINT.md, CURRENT.md, and create operations evidence doc | M4 | Autonomous loop step 4 |
| 8 | Identify NEXT and continue | Identify next unresolved prerequisite and loop | M4 | Autonomous loop step 5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Predecessor slices committed | ACTIVE_MATCHED (code 5f642df1, doc 301820d3) | none | DONE |
| M1 | Survey & Technical Exploration | 3 Explorers mapped withdrawal contracts, uncertain effects in publication gateway, and test fixtures | M0 | DONE |
| M2 | PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT | Implement and lock uncertain effects withdrawal contract in manila-day.ts and test suite | M1 | IN_PROGRESS |
| M3 | Adversarial & Regression Suite Verification | Targeted tests, DB tests, typecheck, build, 4 guardrails | M2 | PLANNED |
| M4 | Canonical Commit, Dual Push & Savepoint Update | Git commit, push to SSM + GitLab, evidence docs, update savepoint with next item | M3 | PLANNED |

## Code Layout
- `packages/scraper/manila-day.ts`: Core readers, flow counters, snapshot evaluators
- `packages/scraper/publication-gateway.integration.test.ts`: Integration test suite
- `packages/scraper/publication-gateway.ts`: Gateway write fences, uncertainty handling
- `docs/SYSTEM_SAVEPOINT.md`: Savepoint record
- `docs/bootloaders/CURRENT.md`: Continuation pointer
- `docs/operations/`: Detailed evidence reports
