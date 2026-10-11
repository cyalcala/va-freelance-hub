# E2E Test Infra: VA Freelance Hub — Date Prefence Evidence

## Test Philosophy
- Opaque-box and requirement-driven testing with in-memory SQLite executing all 59 production migrations.
- Complete coverage of date edge cases: missing, non-date, future (+1ms, +1ns), stale (30d+1ms, 30d+1ns), impossible calendar (Sep 31, non-leap Feb 29, 24:01).
- Direct assertion on physical database state: `SELECT COUNT(*) FROM opportunities WHERE isActive = 1 AND phEligibility IN ('eligible', 'eligible_likely')`.

## Test Execution Commands
- Targeted Date Prefence Suite:
  `bun test --no-env-file --preload ./scripts/ci/test-environment.ts apps/web/tests/native-fresh-scrape-posting-date.test.ts`
- Gateway Suites:
  `bun test --no-env-file --preload ./scripts/ci/test-environment.ts packages/scraper/publication-gateway.test.ts`
  `bun test --no-env-file --preload ./scripts/ci/test-environment.ts packages/scraper/publication-gateway.integration.test.ts`
- Full Regression Suite:
  `bun test --no-env-file --preload ./scripts/ci/test-environment.ts`
- Typecheck:
  `bun run typecheck`
- Production Build:
  `bun run build`
- CI Guardrails:
  `bun scripts/ci/check-production-guardrails.ts`
  `bun scripts/ci/audit-parameters.ts`

## Coverage Tiers
- **Tier 1: Feature Coverage**:
  - Missing dates withheld (`posting-freshness-unknown`, 0 public rows, 0 ledger rows)
  - Non-date strings withheld (`posting-freshness-invalid`, 0 public rows, 0 ledger rows)
  - Future dates withheld (`posting-freshness-future`, 0 public rows, 0 ledger rows)
  - Stale dates withheld (`posting-freshness-stale`, 0 public rows, 0 ledger rows)
  - Valid RFC 5322 dates parsed and published (1 public row, 1 ledger row)
  - Valid ISO 8601 dates parsed and published (1 public row, 1 ledger row)
- **Tier 2: Boundary & Corner Cases**:
  - Exactly 30 days old (`T_now - 30 * 86400000 ms`) -> WITHIN_WINDOW, published
  - 30 days + 1 millisecond old -> STALE, withheld
  - 30 days + 1 nanosecond old -> STALE, withheld
  - Future by 1 millisecond -> FUTURE, withheld
  - Future by 1 nanosecond -> FUTURE, withheld
  - September 31 (impossible 30-day month) -> INVALID/null, withheld, NO rollover to Oct 1
  - February 29 in non-leap year 2026 -> INVALID/null, withheld
  - Leap year 2024 February 29 -> parsed, evaluated (stale if >30d)
  - Hour 24:01:00 -> INVALID/null, withheld
- **Tier 3: Mixed Batches & Concurrency**:
  - Mixed batches: valid fresh + invalid Sep 31 + stale + future. Only valid fresh exposed publicly.
  - Multi-source sequential batches with post-persistence failure stops sequential writes.
- **Tier 4: End-to-End Scrape & Web Serving**:
  - Invoking `/api/cron/scrape` with simulated feed fixtures.
  - Asserting public opportunity queries (`publicOpportunityFilters()`).
