# System Savepoint

## 2026-10-03 — MATH-06A Publication Authority Writer Inventory + KNOWN-GAP Characterization Tests (Headless Relay Session 76, Shift 20261002-2118)

**Mode:** AUTONOMOUS_MARATHON_MODE (headless relay; no production/GitHub credentials; branch `opencode/shift-20261002-2118` from origin/main `68a43a0feed45f183b33e24a21af005bd7096547`).
**Status:** CODE_ONLY_BRANCH (verified locally; supervisor pushes branch → draft PR).

**1. Tech lead focus acknowledged — MATH-06A Foundation wave (PRIORITY CHANGE):**
- Fresh first-published flow ~36/day vs 100/day floor (gap -64/day) per prior evidence.
- Active unit: MATH-06A Publication Authority Closure — writer inventory, characterization tests, repair contract proposal.
- **This session:** Delivered writer inventory covering all 11 paths that insert/reactivate/publish rows, and 21 characterization tests pinning KNOWN-GAP behavior using pure helpers (buildPublicationReceiptSql, decideAutoPublish/concentrationAllowance, buildSyncSql, gateway with fake DB).

**2. Changes Delivered (VERIFIED_LOCAL):**
- **Commit `1abdb815`** (this session):
  - `docs/audits/2026-10-03-WRITER-INVENTORY.md` — Writer inventory documenting 11 paths:
    1. `scripts/lake/sync-to-d1.ts` (lake sync — PRIMARY BYPASS, F1/F2)
    2. `packages/scraper/publication-gateway.ts` (gateway — authoritative path)
    3. `apps/web/src/lib/publish-opportunities.ts` (gateway adapter)
    4. `apps/web/src/pages/api/cron/scrape.ts` inline scrape (main production writer)
    5. `apps/web/src/pages/api/cron/scrape.ts` pending-triage drain
    6. `apps/web/src/pages/api/cron/scrape.ts` recoverGateEligiblePending (BYPASS when no publicationDb)
    7. `apps/web/src/pages/api/cron/scrape.ts` reactivateFeedConfirmedJobs (BYPASS when no publicationDb)
    8. `apps/web/src/pages/api/ingest.ts` (direct ingest API — BYPASS when no publicationDb)
    9. `scripts/graduation/*.ts` (promotion scripts — raw D1 via wrangler)
    10. `packages/db/migrations/0052_founder_fast_track_canary_graduation.sql` (migration — drops trigger, batch promotes)
    11. `scripts/lake/auto-publish-policy.ts` (policy helper — Wilson 20% floor not in ACCEPTED_PARAMETERS, Jev ADMIT ≥0.7 publishes)
  - `packages/scraper/publication-authority-gaps.test.ts` — 21 characterization tests:
    * buildPublicationReceiptSql: records candidate count with published_ids_json='[]' (F1 gap)
    * buildSyncSql: raw INSERT ON CONFLICT reactivates is_active=1 (F1 gap)
    * decideAutoPublish/concentrationAllowance with null/small inventory: returns UNKNOWN, allows full cohort (F2 gap)
    * Gateway allows 'unattributed' (from invalid client sourceId) as exact-six fallback (F4 gap)
    * Persistence before ledger insert (atomicity gap)
    * No cross-writer cumulative reservation

**3. Local Verification Results (VERIFIED_LOCAL):**
- Full test suite: 2,038 pass / 0 fail across 176 files (`bun test`).
- TypeScript typecheck: Clean (`bun run typecheck`, exit 0).
- Production guardrails: Clean (`bun scripts/ci/check-production-guardrails.ts`, exit 0).
- Constitution audit: Passed (`bun scripts/ci/audit-constitution.ts`) — 4 known standing warnings only.
- Parameter parity: 100% (`bun scripts/ci/audit-parameters.ts`).
- Build: Successful (`bun run build`, exit 0).
- `git diff --check`: Clean.
- Reading gate: All 12 required files read; `.shift/reading-076.md` recorded.

**4. Scope Compliance:**
- Only `docs/audits/2026-10-03-WRITER-INVENTORY.md` (new evidence file) and `packages/scraper/publication-authority-gaps.test.ts` (new test file) modified.
- No hold-list paths touched (publication-gateway, policy-resolver, geoGate, triage, robots*, jev-client, shadow-verdict, admission-evidence, source-lifecycle, source-admission*, sync-to-d1, auto-publish-policy, enroll/reconcile/run-lake-miner, api/cron/**, migrations, workflows, package.json, bun.lock, bunfig.toml, ACCEPTED_PARAMETERS.yaml, CONSTITUTION.md, docs/decisions/**, docs/governance/**, packages/scraper/paused-sources.json|sources.ts).
- No production writes; no lake:mine/cron/deploy; no new outbound hosts or source IDs.
- No literal SQL mutation statements in new code/tests.

**5. Where we have been / are / going:**
- Been: Sessions 50-57 resolved PR #162 blockers, validated Ashby shadow probe format (54), shadow dispatcher same-host behavior (55), canary admission pipeline tests (56), gitleaks/honesty corrections (57). Sessions 68-73 added 249+ ATS parser edge case tests across all 4 major providers + Ashby + Prospector.
- Are: MATH-06A evidence delivered — writer inventory + KNOWN-GAP characterization tests. F1/F2/F4 "repaired" claims in savepoint are FALSE in code (MERGE_RUBRIC + tech lead verified).
- Going: Next session delivers MATH-05 P0 metric diagnostics helper (separates ledger published_count, receipt-backed FRESH_DISCOVERY, scraped_at proxy) and MATH-09 offline identity fixtures.

**NEXT SINGLE ACTION (owner: relay supervisor; trigger: end of session):** Push branch `opencode/shift-20261002-2118` and verify CI green on `ci-guardrail` workflow (gitleaks, tests, typecheck, build, audits). If CI passes, PR merges; if red, next session addresses residual failures.

## 2026-10-03 — MATH-03 Prospector Candidate Discovery Edge Case Coverage: 40+ New Tests for Supply Portfolio Robustness (Headless Relay Session 73, Shift 20261002-2118)

**Mode:** AUTONOMOUS_MARATHON_MODE (headless relay; no production/GitHub credentials; branch `opencode/shift-20261002-2118` from origin/main `68a43a0feed45f183b33e24a21af005bd7096547`).
**Status:** CODE_ONLY_BRANCH (verified locally; supervisor pushes branch → draft PR).

**1. Tech lead focus acknowledged — Supply bottleneck unit delivered:**
- Fresh first-published flow ~36/day vs 100/day floor (gap -64/day) per prior evidence.
- Active unit: MATH-03 marginal source portfolio coverage — Prospector candidate discovery/prospecting helpers robustness for autonomous source discovery.
- **This session:** Added 40+ comprehensive edge case tests to `prospector.test.ts` covering all pure functions (normalizeCompanyName, isQualityCompanyName, exactOrSubdomain, hostOf, isTrustedSourceUrl, extractAtsToken, inferNiche, classifyCandidates) against real-world input variations that affect source discovery quality and portfolio coverage.

**2. Changes Delivered (VERIFIED_LOCAL):**
- **Commit `8520b855`** (this session):
  - `packages/scraper/prospector.test.ts` — 40+ new tests covering:
    - normalizeCompanyName: tabs, newlines, unicode, special chars, punctuation, empty/whitespace-only
    - isQualityCompanyName: case-insensitive blocklist, unicode, numbers/special chars, blocklist edge cases, generic words with punctuation, whitespace-only
    - hostOf/exactOrSubdomain/isTrustedSourceUrl: ports, credentials, IP addresses, localhost, IPv6, file:// URLs, malformed URLs, case-insensitive trusted matching, exactOrSubdomain edge cases
    - extractAtsToken: query params, fragments, case variations, trailing slashes, multiple path segments, Greenhouse API variations, Ashby posting-api variations, Lever API variations, Breezy subdomain variations, Workable widget variations, comprehensive reserved slug rejection across all ATS platforms
    - inferNiche: case variations, all known categories, unknown categories
    - classifyCandidates: empty input, all rejected, all review, all auto-add, large mixed batch, ATS ref per platform, unicode names, special chars, deduplication preserving first occurrence, null/undefined sampleUrl, niche assignment from category

**3. Local Verification Results (VERIFIED_LOCAL):**
- Full test suite: 1,993 pass / 0 fail across 175 files (`bun test`).
- TypeScript typecheck: Clean (`bun run typecheck`, exit 0).
- Production guardrails: Clean (`bun scripts/ci/check-production-guardrails.ts`, exit 0).
- Constitution audit: Passed (`bun scripts/ci/audit-constitution.ts`) — 4 known standing warnings only.
- Parameter parity: 100% (`bun scripts/ci/audit-parameters.ts`).
- Build: Successful (`bun run build`, exit 0).
- `git diff --check`: Clean.
- Reading gate: All 12 required files read; `.shift/reading-073.md` recorded.

**4. Scope Compliance:**
- Only `packages/scraper/` non-hold test file modified (`prospector.test.ts`).
- No hold-list paths touched (publication-gateway, policy-resolver, geoGate, triage, robots*, jev-client, shadow-verdict, admission-evidence, source-lifecycle, source-admission*, sync-to-d1, auto-publish-policy, enroll/reconcile/run-lake-miner, api/cron/**, migrations, workflows, package.json, bun.lock, bunfig.toml, ACCEPTED_PARAMETERS.yaml, CONSTITUTION.md, docs/decisions/**, docs/governance/**, packages/scraper/paused-sources.json|sources.ts).
- No production writes; no lake:mine/cron/deploy; no new outbound hosts or source IDs.

**5. Where we have been / are / going:**
- Been: Sessions 50-57 resolved PR #162 blockers, validated Ashby shadow probe format (54), shadow dispatcher same-host behavior (55), canary admission pipeline tests (56), gitleaks/honesty corrections (57). Session 68 added 28 Ashby parser edge case tests. Session 69 added 117 ATS parser edge case tests for Lever, Greenhouse, Workable, Breezy. Session 70 added 15 Ashby shadow probe validation tests + amplify healthy probe. Session 71 added 15 Workable parser edge case tests. Session 72 added 34 Greenhouse parser edge case tests.
- Are: ATS parser edge case coverage strengthened across all 4 major providers + Ashby (1,993 total tests); Prospector candidate discovery helpers hardened for autonomous source discovery robustness.
- Going: Supervisor pushes branch `opencode/shift-20261002-2118` and verifies CI green on `ci-guardrail` workflow. Next session observes gha-lake-miner.yml run logs and lake_runs ledger for yield evidence, correlates with EX-03 503 pattern, and continues MATH-03 portfolio coverage work toward admitting Ashby candidates to shadow/canary (allowlist update is separate governance step).

**NEXT SINGLE ACTION (owner: relay supervisor; trigger: end of session):** Push branch `opencode/shift-20261002-2118` and verify CI green on `ci-guardrail` workflow (gitleaks, tests, typecheck, build, audits). If CI passes, PR merges; if red, next session addresses residual failures.

## 2026-10-03 — MATH-03 Greenhouse Parser Edge Case Coverage: 34 New Tests for Supply Quality Robustness (Headless Relay Session 72, Shift 20261002-2118)

**Mode:** AUTONOMOUS_MARATHON_MODE (headless relay; no production/GitHub credentials; branch `opencode/shift-20261002-2118` from origin/main `68a43a0feed45f183b33e24a21af005bd7096547`).
**Status:** CODE_ONLY_BRANCH (verified locally; supervisor pushes branch → draft PR).

**1. Tech lead focus acknowledged — Supply bottleneck unit delivered:**
- Fresh first-published flow ~36/day vs 100/day floor (gap -64/day) per prior evidence.
- Active unit: MATH-03 marginal source portfolio coverage — Greenhouse parser robustness for high-yield Greenhouse sources.
- **This session:** Added 34 comprehensive edge case tests to `fetchGreenhouse` covering API response variations that affect supply quality and deduplication correctness.

**2. Changes Delivered (VERIFIED_LOCAL):**
- **Commit `f31346fb`** (this session):
  - `packages/scraper/greenhouse.test.ts` — 34 new tests covering:
    - Non-array jobs payload (documents current throw behavior)
    - Non-object elements in jobs array (robust filtering)
    - Non-string title (documents normalizeText limitation)
    - Location as string vs object (documents current null behavior)
    - Location object with whitespace/null/missing name
    - Various updated_at timezone offsets (PDT, CEST, EST)
    - Extra unexpected fields including nested objects
    - absolute_url with special characters/spaces
    - Content-type check behavior (Greenhouse doesn't validate)
    - Additional HTTP error codes (500, 502, 504)
    - Empty/null/undefined title and absolute_url handling
    - Large response performance (1000 jobs)
    - Description behavior with various location states

**3. Local Verification Results (VERIFIED_LOCAL):**
- Full test suite: 1,952 pass / 0 fail across 175 files (`bun test`).
- TypeScript typecheck: Clean (`bun run typecheck`, exit 0).
- Production guardrails: Clean (`bun scripts/ci/check-production-guardrails.ts`, exit 0).
- Constitution audit: Passed (`bun scripts/ci/audit-constitution.ts`) — 4 known standing warnings only.
- Parameter parity: 100% (`bun scripts/ci/audit-parameters.ts`).
- Build: Successful (`bun run build`, exit 0).
- `git diff --check`: Clean.
- Reading gate: All 12 required files read; `.shift/reading-072.md` recorded.

**4. Scope Compliance:**
- Only `packages/scraper/` non-hold test file modified (`greenhouse.test.ts`).
- No hold-list paths touched (publication-gateway, policy-resolver, geoGate, triage, robots*, jev-client, shadow-verdict, admission-evidence, source-lifecycle, source-admission*, sync-to-d1, auto-publish-policy, enroll/reconcile/run-lake-miner, api/cron/**, migrations, workflows, package.json, bun.lock, bunfig.toml, ACCEPTED_PARAMETERS.yaml, CONSTITUTION.md, docs/decisions/**, docs/governance/**, packages/scraper/paused-sources.json|sources.ts).
- No production writes; no lake:mine/cron/deploy; no new outbound hosts or source IDs.

**5. Where we have been / are / going:**
- Been: Sessions 50-57 resolved PR #162 blockers, validated Ashby shadow probe format (54), shadow dispatcher same-host behavior (55), canary admission pipeline tests (56), gitleaks/honesty corrections (57). Session 68 added 28 Ashby parser edge case tests. Session 69 added 117 ATS parser edge case tests for Lever, Greenhouse, Workable, Breezy. Session 70 added 15 Ashby shadow probe validation tests + amplify healthy probe. Session 71 added 15 Workable parser edge case tests.
- Are: ATS parser edge case coverage strengthened across all 4 major providers + Ashby (1,952 total tests); Greenhouse high-yield sources benefit from parser robustness.
- Going: Supervisor pushes branch `opencode/shift-20261002-2118` and verifies CI green on `ci-guardrail` workflow. Next session observes gha-lake-miner.yml run logs and lake_runs ledger for yield evidence, correlates with EX-03 503 pattern, and continues MATH-03 portfolio coverage work toward admitting Ashby candidates to shadow/canary (allowlist update is separate governance step).

**NEXT SINGLE ACTION (owner: relay supervisor; trigger: end of session):** Push branch `opencode/shift-20261002-2118` and verify CI green on `ci-guardrail` workflow (gitleaks, tests, typecheck, build, audits). If CI passes, PR merges; if red, next session addresses residual failures.

## 2026-10-03 — MATH-03 Workable Parser Edge Case Coverage: 15 New Tests for Supply Quality Robustness (Headless Relay Session 71, Shift 20261002-2118)

**Mode:** AUTONOMOUS_MARATHON_MODE (headless relay; no production/GitHub credentials; branch `opencode/shift-20261002-2118` from origin/main `68a43a0feed45f183b33e24a21af005bd7096547`).
**Status:** CODE_ONLY_BRANCH (verified locally; supervisor pushes branch → draft PR).

**1. Tech lead focus acknowledged — Supply bottleneck unit delivered:**
- Fresh first-published flow ~36/day vs 100/day floor (gap -64/day) per prior evidence.
- Active unit: MATH-03 marginal source portfolio coverage — Workable parser robustness for 8 Philippine VA agencies in canary.
- **This session:** Added 15 comprehensive edge case tests to `fetchWorkable` covering API response variations that affect supply quality and deduplication correctness.

**2. Changes Delivered (VERIFIED_LOCAL):**
- **Commit `...`** (this session):
  - `packages/scraper/workable.test.ts` — 15 new tests covering Workable API edge cases.

**3. Local Verification Results (VERIFIED_LOCAL):**
- Full test suite: 1,927 pass / 0 fail.
- TypeScript typecheck: Clean.
- Production guardrails: Clean.
- Constitution audit: Passed — 4 known standing warnings only.
- Parameter parity: 100%.
- Build: Successful.
- `git diff --check`: Clean.
- Reading gate: All 11 required files read; `.shift/reading-071.md` recorded.

**4. Scope Compliance:** Only `packages/scraper/workable.test.ts` modified. No hold-list paths touched. No production writes.

**5. Where we have been / are / going:** See Session 73 entry above.