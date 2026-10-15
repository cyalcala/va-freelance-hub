# Project: VA Freelance Hub — Pipeline Bloat Elimination & Trusted Employer Scaling (Gen 9)

## Architecture
- **Ingestion & Intake Slicing**: `apps/web/src/pages/api/cron/scrape.ts`, `apps/web/src/lib/conditional-state.ts`
  - `selectIntakeBatch`: Multi-source round-robin intake sharing the 1–100 cap without RSS head-of-line blocking.
  - `selectWorkableRotation`: 2-slot hourly cadence per Workable tenant with durable `lastAttemptAt`.
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
| 2 | Adversarial Safety Tests for Simplified Layers | Adversarial suites for intake fairness, rotation decoupling, triage decisions, and geoGate invariants | M1 | R1 requirement |
| 3 | 5-Level Employer Evidence Model | Formalize organization-level trust without global allowlist; integrate into triage without bypassing job validity | M2 | explorer_gen8_2 handoff |
| 4 | D1 clientTimezone Pipeline Bug Fix | Fix `triagedItems.push` spread omission in `scrape.ts:3018-3043` to stop 100% data loss of timezone in D1 | M2 | explorer_gen8_2 handoff |
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
| M1 | Behavioral Bloat & Redundant Complexity Elimination | Formalize bloat ledger, verify and consolidate redundant gates, add adversarial tests for all simplified layers | none | READY |
| M2 | High-Confidence Trusted PH Employer Evidence & Dayshift Coverage | 5-tier evidence model, 4-way separation matrix, D1 clientTimezone fix, dayshift classifier with PHT daytime spans & APAC metadata | M1 | PLANNED |
| M3 | False-Negative Loss Tracking & Employer Reconciliation | 13-stage loss matrix, systematic reconciliation of 7 prioritized employers, eliminate intake/cadence drop-offs | M2 | PLANNED |
| M4 | Invariants, Memory, Dual Mirror & Sentinel Audit | Full regression/typecheck/build, astra777.txt update, SSM origin + GitLab gitlab push, victory audit report | M3 | PLANNED |

## Interface Contracts
### `packages/scraper/shiftClassifier.ts` ↔ Downstream Triage & Public Board
- `classifyShift(input: { title: string; description?: string | null; clientTimezone?: string | null }): { shiftCategory: ShiftCategory; isDayshift: boolean; confidence: ShiftConfidence; phWorkingHours: string | null }`
- Types: `ShiftCategory = "day_shift" | "night_shift" | "flexible" | "unknown"`
- Strict invariant: returns `day_shift` ONLY if explicit PHT daytime span or structured APAC/AU/NZ timezone is present without nightshift markers.

### Employer Evidence Model ↔ `packages/scraper/triage.ts` & `geoGate.ts`
- Evidence levels: `L1_REGISTERED_PH_ENTITY`, `L2_EXPLICIT_PH_MANDATE`, `L3_ATS_PH_PRESET`, `L4_INGESTION_HISTORY_GE5`, `L5_CURATED_DIRECTORY`
- Strict 4-way separation: `Employer PH confidence != Job validity != PH eligibility != Role relevance`
- Strict invariant: Employer evidence NEVER overrides `geoGate` (`ineligible`, `country_locked`, `onsite`) or `assessPostingFreshness` (`STALE`, `INVALID`, `FUTURE`).

### `apps/web/src/pages/api/cron/scrape.ts` ↔ D1 Database
- `triagedItems.push` spread MUST include `clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null`.
- `snapshotPublicationUpdate` MUST preserve `clientTimezone`.
