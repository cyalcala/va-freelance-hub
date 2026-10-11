# Project: VA Freelance Hub — Posting Date Prefence & Scaling

## Architecture
- **Ingestion Pipeline**: `apps/web/src/pages/api/cron/scrape.ts` handles fresh scraping from RSS / RemoteOK.
- **Date Parsing & Freshness Normalization**:
  - `packages/scraper/source-posting-date.ts`: Validates raw ISO 8601 and RFC 5322 strings without permissive JavaScript Date rollover (e.g. Sept 31 -> Oct 1).
  - `packages/scraper/publication-freshness.ts`: Evaluates `assessPostingFreshness` against reference clock within inclusive 30 days (`30 * 86_400_000` ms), checking sub-millisecond precision.
  - `packages/scraper/admission-evidence.ts`: `isAdmissionInstant` checks strict ISO string format and round-trip equality.
- **Publication Gateway**: `packages/scraper/publication-gateway.ts` verifies lease, registry, and post-persistence ownership (`hasCurrentOwnership`) in 80-item batches before writing publication ledgers.
- **Public Serving**: `apps/web/src/lib/public-opportunities.ts` defines `publicOpportunityFilters` (`isActive = 1 AND phEligibility IN ('eligible', 'eligible_likely')`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Nonfuture posting verification | Verify postedAt <= observedAt (sub-millisecond precision) | M1 | astra777.txt §Principal finding, ORIGINAL_REQUEST R1 |
| 2 | Inclusive 30-day window | Posting age <= 30 days (30 * 86,400,000 ms) | M1 | astra777.txt, ORIGINAL_REQUEST R1 |
| 3 | Impossible calendar rejection | Reject impossible calendar dates (e.g. Sep 31) before Date normalization | M1 | astra777.txt §Principal finding |
| 4 | Pre-persistence date prefence | Filter out non-fresh items before DB insertion to prevent optimistic exposure | M1 | astra777.txt §Principal finding |
| 5 | Zero public rows on bad dates | Bad original dates yield zero active public-selectable rows in SQLite/D1 | M1 | ORIGINAL_REQUEST Acceptance Criteria |
| 6 | Zero ledger IDs on bad dates | Bad original dates yield zero successful publication ledger IDs | M1 | ORIGINAL_REQUEST Acceptance Criteria |
| 7 | Mixed batch isolation | In mixed batches, only qualified rows are exposed publicly | M1 | ORIGINAL_REQUEST Acceptance Criteria |
| 8 | Preservation of valid originals | Valid inclusive-window controls preserve original meaning and actual IDs | M1 | ORIGINAL_REQUEST Acceptance Criteria |
| 9 | Full regression integrity | Existing test suite (1,188+ tests), typecheck, and build pass cleanly | M2 | explorer_2/handoff.md, ORIGINAL_REQUEST R2 |
| 10| Canonical remote commit | Verified changes committed and pushed to Google Secure Source Manager | M3 | ORIGINAL_REQUEST R2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Date Prefence Enforcement & Native Test Proof | Verify & enforce pre-persistence date validation, zero public rows on bad dates, rejection of calendar rollover | none | IN_PROGRESS |
| M2 | Adversarial Hardening & Full Regression Suite | Targeted adversarial test cases, complete 1,188+ test run, typecheck, production build | M1 | PLANNED |
| M3 | Canonical Commit & Handoff Audit | Git commit and push to origin (Secure Source Manager), final victory audit package to Sentinel | M2 | PLANNED |

## Code Layout
- `apps/web/src/pages/api/cron/scrape.ts`: Scrape endpoint and pre-persistence freshness prefence
- `packages/scraper/source-posting-date.ts`: Date normalization and calendar validation
- `packages/scraper/publication-freshness.ts`: Inclusive 30-day window and sub-millisecond freshness evaluation
- `packages/scraper/publication-gateway.ts`: Publication gateway and ownership validation
- `apps/web/tests/native-fresh-scrape-posting-date.test.ts`: Native in-memory SQLite integration harness for date prefence
- `packages/scraper/publication-gateway.test.ts`: Gateway unit tests
- `packages/scraper/publication-gateway.integration.test.ts`: Gateway integration tests
