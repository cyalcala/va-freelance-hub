# Project: VA Freelance Hub — Generation 13 Pipeline Optimization & Scale

## Architecture
- **Ingestion & Intake Slicing**:
  - `apps/web/src/pages/api/cron/scrape.ts`, `apps/web/src/lib/conditional-state.ts`
  - `selectIntakeBatch`: Multi-source round-robin intake sharing the 1–100 cap without RSS head-of-line blocking or rotation starvation.
  - `selectWorkableRotation`: 2-slot hourly cadence per Workable tenant with durable `lastAttemptAt`.
  - In-memory batch dedup by `sourceUrl` before `selectIntakeBatch`.
- **Filtering & Gate Consolidation**:
  - `packages/scraper/triage.ts`, `packages/scraper/geoGate.ts`, `packages/scraper/json.ts`
  - Single authoritative decision points for eligibility and geographic checks.
  - Removal of timezone exclusions from `GEOGRAPHIC_EXCLUSION_REGEX` (allowing legitimate US-hours VA roles).
  - Step 2b early rejection in `geoGate.ts` for European localized non-remote/student markers (`m/w/d`, etc.) before AI triage.
  - Dominance of structured country pins over title APAC tokens.
  - Refinement of `PHYSICAL_OR_LOGISTICS_ROLE_REGEX` to prevent false drops on "Service Delivery Manager".
- **Trusted Employer Evidence & 4-Way Separation Matrix**:
  - `packages/scraper/trustedEmployers.ts`
  - Strict formula: `Employer PH confidence != Job validity != PH eligibility != Role relevance`.
  - Authoritative employer evidence at `geoGate` Step 8 after all negative country locks and onsite markers have executed.
  - Strict preservation of Constitutional Zeros (Pineapple Staffing = 0, Affordable Staff onsite = 0, UpGuard Australia = 0).
- **Shift & Working-Hour Classification**:
  - `packages/scraper/shiftClassifier.ts`
  - Explicit PHT daytime spans (`8:00 AM - 5:00 PM Manila Time`, `8am - 5pm PHT`) and structured APAC/AU/NZ timezone metadata (`AEST`, `AWST`, `NZST`).
  - Strict safeguard against schedule fabrication without explicit textual or timezone evidence.
  - Public exposure on `/opportunities` filter dropdown and `slicePublicJobs`.
- **Pipeline Loss Tracking & Reconciliation**:
  - `packages/scraper/pipelineLossTracker.ts`
  - 13 canonical stages: SOURCE -> DISCOVERY -> FETCH -> PARSE -> NORMALIZE -> DEDUP -> PH_ELIGIBILITY -> POLICY -> ROLE_GATES -> TRIAGE -> SCORING -> QUALIFICATION -> PUBLICATION.
  - Systematic reconciliation of prioritized employers (Hunt St, Coconut VA, CrewBloom, Pearl Talent, Hammerjack, MultiplyMii, 20Four7VA, Sourcefit, RocketAMS).
- **Production Invariants & Living Engineering Memory**:
  - 30-day freshness window, per-vacancy geoGate, Cloudflare D1 parameter budget <= 100 per statement (28 params/row * 3 rows = 84 max), billing ceilings (<=200 req/src/day, <=500 AI/day, <=50,000 writes/day).
  - Continuous memory maintenance in `astra777.txt`.
  - Canonical git repository: Google Secure Source Manager (`origin`) on branch `codex/verified-flow-directory-checkpoint`, mirrored to GitHub (`github`) and GitLab (`gitlab`).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Baseline Survey & Code Verification | Deep exploration of codebase, tests, git branch state, and existing PRs/commits | M0 (Survey) | ORIGINAL_REQUEST | DONE |
| 2 | Behavioral Bloat Elimination & Gate Invariants | Audit live pipeline, eliminate redundant gates/timers/shims, consolidate heuristics, verify adversarial counterexamples | M1 | R1, astra777.txt | DONE |
| 3 | Trusted Employer Evidence & Dayshift Recognition | Enforce 4-way separation matrix, enhance dayshift classification (AU/NZ/APAC/PHT spans), verify public filters | M2 | R2, R3 | DONE |
| 4 | 13-Stage Loss Tracking & Systematic Employer Reconciliation | Implement PipelineLossTracker across all 13 stages, reconcile vetted employers (Hunt St, Coconut VA, Hammerjack, Pearl Talent, CrewBloom, 20Four7VA, etc.), verify Constitutional Zeros | M3 | R2 | IN_PROGRESS |
| 5 | Multi-Source Intake Fairness & Throughput Scaling | Expand selectIntakeBatch fairness across ATS, RSS, and structured discovery, preventing starvation and respecting D1 limits toward 100-150+ jobs/day | M4 | R4 | PLANNED |
| 6 | Full Regression, Memory Maintenance & Dual-Mirror Parity | Full test pass (bun test 100%), typecheck, build, update astra777.txt, commit to SSM (`origin`), mirror to GitHub and GitLab, victory audit handoff | M5 | R5 | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Survey & Baseline Mapping | 3 parallel Explorers surveying codebase, pipeline state, and git repo | none | DONE |
| 1 | Behavioral Bloat Elimination & Gate Consolidation | Consolidate redundant checks, preserve invariants and adversarial counterexamples | M0 | DONE |
| 2 | Trusted Employer Coverage & Dayshift Recognition | 4-way separation matrix, dayshift extraction & public filter exposure | M1 | DONE |
| 3 | 13-Stage Loss Tracking & Employer Reconciliation | 13-stage loss tracker, reconcile vetted employers, zero silent drops | M2 | IN_PROGRESS |
| 4 | Intake Fairness & Scalable Throughput | Multi-source intake balancing, rotation fairness, D1 batching limits | M3 | PLANNED |
| 5 | Full Verification, Memory & Repository Parity | Complete test suite, astra777.txt sync, SSM origin commit, GitHub/GitLab mirror sync, victory audit | M4 | PLANNED |

## Code Layout & Boundaries
- `apps/web/src/pages/api/cron/scrape.ts`: Ingestion loop, batch dedup, clientTimezone propagation, D1 insert.
- `apps/web/src/lib/conditional-state.ts`: `selectIntakeBatch`, `mergeSourceIdsByUrl`.
- `apps/web/src/lib/workable-rotation.ts`: `selectWorkableRotation`.
- `packages/scraper/triage.ts`: Multi-provider fallback check, `GEOGRAPHIC_EXCLUSION_REGEX`, category helper reuse.
- `packages/scraper/geoGate.ts`: `detectStructuredLocationPin`, Step 2b early European non-remote rejection, Step 8 trusted employer resolution.
- `packages/scraper/trustedEmployers.ts`: `TRUSTED_PH_EMPLOYERS`, 4-way separation matrix.
- `packages/scraper/shiftClassifier.ts`: Working-hour / dayshift classification, explicit PHT spans.
- `packages/scraper/pipelineLossTracker.ts`: 13-stage loss tracker, reconciliation logic.
- `packages/scraper/adversarial-counterexamples.test.ts`: Adversarial test suite for all invariants and counterexamples.
- `apps/web/tests/e2e/e2e-opaque-box-suite.test.ts`: 71-test E2E opaque-box suite across Tiers 1-4.
- `TEST_INFRA.md` & `TEST_READY.md`: E2E test architecture and readiness receipts.
- `astra777.txt`: Living engineering memory.
