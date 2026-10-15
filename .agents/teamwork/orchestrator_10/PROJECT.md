# Project: VA Freelance Hub — Pipeline Bloat Elimination & Trusted Employer Scaling (Gen 10)

## Architecture
- **Ingestion & Intake Slicing**: `apps/web/src/pages/api/cron/scrape.ts`, `apps/web/src/lib/conditional-state.ts`
  - `selectIntakeBatch`: Multi-source round-robin intake sharing the 1–100 cap without RSS head-of-line blocking.
  - `selectWorkableRotation`: 2-slot hourly cadence per Workable tenant with durable `lastAttemptAt`.
  - In-memory batch dedup by `sourceUrl` before `selectIntakeBatch`.
- **Filtering & Gate Consolidation**: `packages/scraper/triage.ts`, `packages/scraper/geoGate.ts`, `packages/scraper/json.ts`
  - Removal of timezone exclusions from `GEOGRAPHIC_EXCLUSION_REGEX` (allowing legitimate US-hours VA roles).
  - Step 2b early rejection in `geoGate.ts` for localized European domestic markers (`m/w/d`, etc.) before AI triage.
  - Unification of location pin detection with `detectStructuredLocationPin`.
  - Refinement of `PHYSICAL_OR_LOGISTICS_ROLE_REGEX` to prevent false drops on "Service Delivery Manager".
- **Shift & Working-Hour Classification**: `packages/scraper/shiftClassifier.ts`
  - Explicit PHT daytime spans (`8:00 AM - 5:00 PM Manila Time`, `8am - 5pm PHT`) and structured APAC/AU/NZ timezone metadata (`AEST`, `AWST`, `NZST`).
  - Strict safeguard against schedule fabrication without explicit textual or timezone evidence.
  - Pipeline propagation: Preserving `clientTimezone` from triage into D1 `opportunities` rows in `scrape.ts`.
- **Employer Evidence & Qualification**:
  - 5-tier employer evidence hierarchy: Level 1 (Legal Entity), Level 2 (Explicit Mandate), Level 3 (ATS Preset), Level 4 (Ingestion History >= 5), Level 5 (Curated Directory).
  - Strict 4-way separation matrix: `Employer PH confidence != Job validity != PH eligibility != Role relevance`.
  - Zero bypass: Employer trust cannot override `geoGate`, `assessPostingFreshness`, or workplace location types.
- **Pipeline Loss & Reconciliation**:
  - 13-stage loss tracking matrix across authoritative ATS feeds vs public board.
  - Systematic reconciliation for prioritized employers: Hunt St, Coconut VA, CrewBloom, Pearl Talent, Hammerjack, MultiplyMii, 20Four7VA.
- **Operational Invariants & Memory**:
  - Strict per-vacancy geoGate, 30-day freshness window, billing ceilings (<=200 req/src/day, <=500 AI/day, <=50,000 writes/day).
  - Durable memory in `astra777.txt`, `docs/SYSTEM_SAVEPOINT.md`, and atomic commits to Google SSM (`origin`) mirrored to GitLab (`gitlab`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Behavioral Bloat Audit & Gate Consolidation | Remove 5 redundant gates (RSS-first slice, 2nd Workable clock, missing ATS sourceIdsByUrl, model triage veto on structured geo, title APAC token country override) | M1 | astra777.txt, bloat ledger |
| 2 | Code Cleanups & Gate Invariant Fixes | Fix triage.ts AI fallback check, remove EST/PST from geographic exclusion, add geoGate early European check, narrow delivery regex, dedup in-memory newItems, fix D1 clientTimezone propagation | M1 | explorer_m1_1, explorer_m1_2 handoffs |
| 3 | Adversarial Safety Tests for Simplified Layers | Adversarial suites for intake fairness, rotation decoupling, triage decisions, and geoGate invariants (`adversarial-counterexamples.test.ts`) | M1 | explorer_m1_3 handoff |
| 4 | 5-Level Employer Evidence Model | Formalize organization-level trust without global allowlist; integrate into triage without bypassing job validity | M2 | explorer_gen8_2 handoff |
| 5 | Dayshift Classification & Working-Hour Alignment | Enhance `classifyShift` with explicit PHT daytime spans and APAC timezones; prevent false schedule attributions | M2 | explorer_gen8_2 handoff |
| 6 | Public Shift Exposure & Filtering | Surface `shiftCategory` and `isDayshift` on `PublicJob` and add schedule filters on `/opportunities` | M2 | R2 requirement |
| 7 | 13-Stage Pipeline Loss Tracking | Formalize tracking across Discovery, Fetch, Parse, Normalize, Dedup, GeoGate, Policy, Role, Triage, Scoring, Qualification, Publication | M3 | explorer_gen8_3_rep handoff |
| 8 | High-Confidence Employer Reconciliation | Reconcile Hunt St, Coconut VA, CrewBloom, Pearl Talent, Hammerjack, MultiplyMii, 20Four7VA; eliminate root causes | M3 | R3 requirement |
| 9 | Constitutional Zeros Validation | Prove that absences for Pineapple Staffing, RocketAMS, HelloRache, Affordable Staff are valid invariant enforcements | M3 | explorer_gen8_3_rep handoff |
| 10 | Production Invariants & MATH 1-13 Continuity | Verify geoGate, 30-day freshness, billing ceilings, chunked writes, and test suite pass (379+ tests, 0 failures) | M4 | R4 requirement |
| 11 | Living Engineering Memory & Commit/Mirror | Synchronize `astra777.txt`, push commits to Google SSM (`origin`) on branch `codex/verified-flow-directory-checkpoint` and mirror to GitLab (`gitlab`) | M4 | R4 requirement |
| 12 | Sentinel Victory Handoff Report | Comprehensive evidence report for Sentinel independent victory audit | M4 | Autonomous loop |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Behavioral Bloat & Redundant Complexity Elimination | Consolidate redundant gates, clean bloat, propagate clientTimezone, add adversarial-counterexamples test suite | none | IN_PROGRESS |
| M2 | High-Confidence Trusted PH Employer Evidence & Dayshift Coverage | 5-tier evidence model, 4-way separation matrix, dayshift classifier with PHT daytime spans & APAC metadata, public schedule filters | M1 | PLANNED |
| M3 | False-Negative Loss Tracking & Employer Reconciliation | 13-stage loss matrix, systematic reconciliation of 7 prioritized employers, eliminate intake/cadence drop-offs | M2 | PLANNED |
| M4 | Invariants, Memory, Dual Mirror & Sentinel Audit | Full regression/typecheck/build, astra777.txt update, SSM origin + GitLab gitlab push, victory audit report | M3 | PLANNED |

## Code Layout & Boundaries
- `apps/web/src/pages/api/cron/scrape.ts`: Ingestion loop, batch dedup, clientTimezone propagation, D1 insert.
- `apps/web/src/lib/conditional-state.ts`: `selectIntakeBatch`, `mergeSourceIdsByUrl`.
- `apps/web/src/lib/workable-rotation.ts`: `selectWorkableRotation`.
- `packages/scraper/triage.ts`: Multi-provider fallback check, `GEOGRAPHIC_EXCLUSION_REGEX`, category helper reuse.
- `packages/scraper/geoGate.ts`: `detectStructuredLocationPin`, Step 2b early European non-remote rejection.
- `packages/scraper/json.ts`: `PHYSICAL_OR_LOGISTICS_ROLE_REGEX` refinement.
- `packages/scraper/shiftClassifier.ts`: Working-hour / dayshift classification.
- `packages/scraper/adversarial-counterexamples.test.ts`: Adversarial test suite for all M1 invariants and counterexamples.
- `astra777.txt`: Living engineering memory.
