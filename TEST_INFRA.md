# TEST_INFRA — E2E Opaque-Box Test Architecture & Infrastructure (Generation 13)

> **Document Version**: 1.0.0  
> **Target Branch**: `codex/verified-flow-directory-checkpoint`  
> **Scope**: Generation 13 Pipeline Optimization, Scale, and Invariant Verification  
> **Authoritative Source**: `ORIGINAL_REQUEST.md` (2026-10-14, 2026-10-15), `astra777.txt`, `PROJECT.md`

---

## 1. Test Philosophy & Principles

The Generation 13 E2E test architecture adopts a rigorous **opaque-box, requirement-driven** methodology. Tests treat the ingestion, classification, gating, batching, storage, and public serving pipelines as bounded black-box or opaque subsystems:
1. **Requirement-Driven Derivation**: Every test case originates directly from an invariant or requirement codified in `ORIGINAL_REQUEST.md`, `astra777.txt`, or `PROJECT.md`.
2. **Opaque-Box System Verification**: Tests supply realistic, raw domain inputs (candidate feeds, multi-source payloads, malformed strings, edge dates, boundary batch sizes) and assert solely against observable, contractually governed outputs (public snapshot query results from `slicePublicJobs`, machine-readable loss codes from `PipelineLossTracker`, geoGate verdicts, D1 parameter ceilings, and intake selection results).
3. **Strict Invariant Defense (Non-Facade)**: Facade tests that trivially assert truth are prohibited. Tests enforce real mathematical constraints:
   - **Constitutional Zeros**: Guaranteed 0% publication for known negative counterexamples (`Pineapple Staffing`, `Affordable Staff (onsite)`, `UpGuard Australia`).
   - **4-Way Separation Matrix**: `Employer PH confidence != Job validity != PH eligibility != Role relevance`.
   - **D1 Parameter Cap**: `parameters <= 100` per statement (28 parameters/row * 3 rows = 84 max bound variables).
   - **Schedule Non-Fabrication**: Schedule claims (`isDayshift: true`, `shiftCategory: "day_shift"`) require explicit textual or timezone evidence; unstated hours default strictly to `unknown`.
   - **Multi-Source Intake Fairness**: Head-of-line RSS feeds cannot starve ATS or structured sources under the 1–100 item intake cap (`selectIntakeBatch`).
4. **Adversarial & Boundary Rigor**: Tests systematically bombard the pipeline with degenerate dates, Unicode fuzzing, 1,000-to-3 source floods, inverted time spans, and parameter overflow thresholds.

---

## 2. Feature Inventory

Derived from `orchestrator_13/PROJECT.md` and `ORIGINAL_REQUEST.md`:

| Feature # | Feature Name | Specification / Module | Scope & Core Invariants |
|---|---|---|---|
| **F-01** | **Baseline Survey & Code Verification** | `PROJECT.md` M0, `packages/scraper` | Verification of baseline contracts, geo-scope sovereignty, publication contract, schema compatibility, and reference clock sanity. |
| **F-02** | **Behavioral Bloat Elimination & Gate Invariants** | `packages/scraper/geoGate.ts`, `triage.ts`, `triage-decision.ts` | Single authoritative decision points, elimination of duplicate cadence timers, removal of timezone exclusions from geo restrictions, Step 2b early European localized non-remote rejection, structured country pin dominance over title tokens. |
| **F-03** | **Trusted Employer Evidence & Dayshift Recognition** | `packages/scraper/trustedEmployers.ts`, `shiftClassifier.ts` | 4-way separation matrix enforcement, authoritative employer evidence at geoGate Step 8, explicit PHT daytime span extraction (`8am - 5pm Manila time`), AU/NZ/APAC daytime hour markers, schedule non-fabrication. |
| **F-04** | **13-Stage Loss Tracking & Systematic Reconciliation** | `packages/scraper/pipelineLossTracker.ts` | Complete 13-stage lifecycle tracking (SOURCE -> DISCOVERY -> FETCH -> PARSE -> NORMALIZE -> DEDUP -> PH_ELIGIBILITY -> POLICY -> ROLE_GATES -> TRIAGE -> SCORING -> QUALIFICATION -> PUBLICATION), zero silent drops, HEALTHY vs COVERAGE_DEFECT vs CONSTITUTIONAL_ZERO classification. |
| **F-05** | **Multi-Source Intake Fairness & Throughput Scaling** | `apps/web/src/lib/conditional-state.ts`, `workable-rotation.ts`, `scrape.ts` | Round-robin `selectIntakeBatch` sharing the 1–100 cap without RSS starvation, deferred URL recovery on subsequent passes, source overflow attribution, 2-slot Workable rotation, in-memory URL dedup (`omitKnownSourceUrls`). |
| **F-06** | **Full Regression, Memory Maintenance & Dual-Mirror Parity** | `apps/web/src/lib/public-board.ts`, `packages/scraper/batch.ts`, `D1` | 30-day freshness window enforcement, Cloudflare D1 query/write budget (<=100 bound parameters), public snapshot querying (`slicePublicJobs`) with shift/category/freshness filters, immutability, end-to-end flow. |

---

## 3. 4-Tier Test Architecture

### Tier 1: Feature Coverage (>=5 tests per Feature = >=30 tests)
Primary behavior, happy paths, and baseline functional contracts for every feature in scope:
- **Feature 1 (Baseline & Sovereignty)**:
  1. `F01-T1-01`: Geo-scope sovereignty preserves `ph_only`, `apac_incl_ph`, and `worldwide` against downstream model rejection.
  2. `F01-T1-02`: Clean URL normalization and sanitization across standard and tracking-parameter URLs.
  3. `F01-T1-03`: Hash consistency ensures identical content generates identical sha256 hashes.
  4. `F01-T1-04`: Publication freshness assessment accepts fresh (<30d) dates within inclusive window.
  5. `F01-T1-05`: Publication remote evaluation accepts verified remote and rejects explicit non-remote.
- **Feature 2 (Bloat Elimination & Gate Invariants)**:
  1. `F02-T1-01`: Consolidated `geoGate` returns single authoritative verdict for clean Philippine remote vacancy.
  2. `F02-T1-02`: Step 2b early rejection halts European localized non-remote vacancy (`m/w/d`) before triage.
  3. `F02-T1-03`: Title token "APAC" does not override structured country location pin (e.g. Australia).
  4. `F02-T1-04`: Absence of timezone exclusions in geo regex allows legitimate US-hours VA roles.
  5. `F02-T1-05`: Physical logistics role filter does not drop legitimate tech management roles like "Service Delivery Manager".
- **Feature 3 (Trusted Employers & Dayshift Recognition)**:
  1. `F03-T1-01`: Trusted employer resolution at Step 8 establishes `eligible_verified` for vetted agencies (Hunt St, Coconut VA, 20Four7VA, Pearl Talent).
  2. `F03-T1-02`: 4-way separation matrix blocks trusted employer openings when country lock is present.
  3. `F03-T1-03`: Shift classifier extracts explicit PHT daytime span (`8:00 AM - 5:00 PM Manila Time`).
  4. `F03-T1-04`: Shift classifier recognizes Australian/APAC business hours as `day_shift` (`isDayshift: true`).
  5. `F03-T1-05`: Shift classifier leaves unstated hours as `unknown` with `isDayshift: false` (no fabrication).
- **Feature 4 (13-Stage Loss Tracking & Reconciliation)**:
  1. `F04-T1-01`: `PipelineLossTracker` records stage entry and pass counts across all 13 canonical stages.
  2. `F04-T1-02`: Granular loss recording attributes dropped items with explicit stage and machine-readable reason code.
  3. `F04-T1-03`: Employer reconciliation correctly calculates recall rate and stage dropoffs.
  4. `F04-T1-04`: Reconciliation marks high-performing employer (>=50% recall) as `HEALTHY`.
  5. `F04-T1-05`: Reconciliation marks low-performing employer (<50% recall or 0 published) as `COVERAGE_DEFECT`.
- **Feature 5 (Multi-Source Intake Fairness)**:
  1. `F05-T1-01`: `selectIntakeBatch` allocates slots round-robin across distinct source identifiers.
  2. `F05-T1-02`: Tail ATS items are selected even when preceded by full head of RSS items.
  3. `F05-T1-03`: Subsequent pass admits deferred ATS items alongside new RSS stream.
  4. `F05-T1-04`: `omitKnownSourceUrls` strictly filters out URLs already present in repository storage.
  5. `F05-T1-05`: Workable rotation enforces 2-slot cap and durable 60-minute interval.
- **Feature 6 (Full Pipeline & D1 Parameter Budget)**:
  1. `F06-T1-01`: D1 batch chunker ensures statement parameter count <= 100 (28 cols * 3 rows = 84 params).
  2. `F06-T1-02`: `slicePublicJobs` queries public snapshot with pagination (`offset`, `limit`, `total`).
  3. `F06-T1-03`: `slicePublicJobs` accurately filters public jobs by `shift: "day_shift"`.
  4. `F06-T1-04`: `slicePublicJobs` filters by category (e.g. `category: "VA"`).
  5. `F06-T1-05`: Freshness filter (`fresh: "24h"`) accurately restricts results to jobs scraped within 24 hours.

### Tier 2: Boundary & Corner Cases (>=5 tests per Feature = >=30 tests)
Boundary conditions, edge values, degenerate strings, and pathological inputs:
- **Feature 1 Boundaries**:
  1. `F01-T2-01`: Posting date at exact 30-day boundary (720 hours) is accepted; 720h + 1s is rejected.
  2. `F01-T2-02`: Future dates (timestamp > reference now) are rejected as `FUTURE`.
  3. `F01-T2-03`: Malformed, impossible calendar dates (`2026-09-31`) are rejected as `INVALID`.
  4. `F01-T2-04`: Null, undefined, empty, or whitespace-only posting dates reject safely.
  5. `F01-T2-05`: Leap day (`2024-02-29`) and Unix epoch timestamps parse and evaluate correctly.
- **Feature 2 Boundaries**:
  1. `F02-T2-01`: Empty, whitespace-only, or null `title` and `description` return `unknown` without crashing.
  2. `F02-T2-02`: Massive input text (15,000+ characters) processes within bounded regex execution time without catastrophic backtracking.
  3. `F02-T2-03`: Unicode emojis and international characters in vacancy title do not break regex word boundaries.
  4. `F02-T2-04`: Embedded HTML tags and script injections are stripped cleanly without corrupting location tokens.
  5. `F02-T2-05`: Case-insensitive and multi-line boundary matching for country exclusions ("United States\nResident Only").
- **Feature 3 Boundaries**:
  1. `F03-T2-01`: Punctuation, dashes, and casing variants in trusted employer lookup ("20 Four 7 VA", "crew-bloom", "HELLORACHE").
  2. `F03-T2-02`: Negated schedule phrases ("no day shift", "not flexible hours") strictly resolve to `unknown`.
  3. `F03-T2-03`: Conflicting schedule markers (e.g. "morning shift and night shift required") resolve to `unknown`.
  4. `F03-T2-04`: Non-standard PHT span formats ("7am to 4pm Manila Time", "9:00 am – 6:00 pm (PHT)") correctly extract span.
  5. `F03-T2-05`: US client timezone ("EST", "PST") in contact details does NOT falsely classify job as night shift without shift markers.
- **Feature 4 Boundaries**:
  1. `F04-T2-01`: Empty loss tracker returns valid empty summary with 0 entered/passed/dropped across all 13 stages.
  2. `F04-T2-02`: Single opening rejected at Stage 1 (SOURCE) leaves remaining 12 stages with 0 entered.
  3. `F04-T2-03`: Complete loss scenario (100% dropped at Step 7 PH_ELIGIBILITY) reconciles with 0% recall rate.
  4. `F04-T2-04`: Employer with 0 authoritative openings reconciles cleanly without division-by-zero error.
  5. `F04-T2-05`: Multiple duplicate drops for same vacancy identity are counted without crashing internal records.
- **Feature 5 Boundaries**:
  1. `F05-T2-01`: Intake batching with `limit = 0` selects 0 items and defers all input items.
  2. `F05-T2-02`: Intake batching with negative or NaN limit defaults safely to 0 selected items.
  3. `F05-T2-03`: Intake batching with `limit >= items.length` selects all items and defers 0.
  4. `F05-T2-04`: Single-source homogeneous array under partial cap splits cleanly into selected head and deferred tail.
  5. `F05-T2-05`: Empty item array input to `selectIntakeBatch` returns empty selected and empty deferred.
- **Feature 6 Boundaries**:
  1. `F06-T2-01`: D1 batch calculation with 28 columns yields exactly 3 rows per batch (84 params <= 100 limit).
  2. `F06-T2-02`: Boundary calculation where `columnsPerRow = 100` yields exactly 1 row per batch.
  3. `F06-T2-03`: `slicePublicJobs` with `offset > total` returns empty jobs array and accurate total count.
  4. `F06-T2-04`: Public job search query with special regex characters (`[`, `(`, `*`, `+`, `?`) escapes safely.
  5. `F06-T2-05`: Public job search query with > 8 terms or whitespace edge cases behaves deterministically.

### Tier 3: Cross-Feature Combinations (Pairwise Coverage)
Integration between subsystems exercising combined states across features:
- **C-01 (Bloat Consolidation + Multi-Source Fairness)**: Large mixed batch of RSS, Workable, and Breezy feeds containing intra-batch duplicates and cadence overlaps -> verified that deduplication, cadence checks, and round-robin intake cooperate cleanly without double-filtering.
- **C-02 (Trusted Employer + Dayshift Classification + GeoGate)**: High-confidence employer opening ("Hunt St") with explicit PHT daytime span ("8am - 5pm PHT") vs identical title with US location pin -> Step 8 activates for the remote opening yielding `eligible_verified` with `isDayshift: true`, while the US opening is blocked at Step 5 as `country_locked` with `ineligible`.
- **C-03 (Trusted Employer + 13-Stage Loss Tracking)**: Reconciling a mixed cohort through the 13 stages: legitimate Hunt St opening advances to PUBLICATION (HEALTHY); Pineapple Staffing US opening drops at PH_ELIGIBILITY / SCORING with status `CONSTITUTIONAL_ZERO`.
- **C-04 (Multi-Source Intake + D1 Parameter Budget + Freshness)**: A 50-item intake batch containing fresh and stale multi-source items -> filtered by `assessPostingFreshness`, chunked into D1 batches of <=3 rows (84 params), verifying parameter limits across every chunk.
- **C-05 (Dayshift Classification + Public Snapshot Querying)**: Slicing public snapshot with multi-parameter filter matrix: `shift: "day_shift"`, `category: "VA"`, `geoScope: "ph_only"`, and `query: "Accountant"`.
- **C-06 (Constitutional Zeros + Loss Tracker + Public Board)**: The 3 Constitutional Zero counterexamples (`Pineapple Staffing`, `Affordable Staff onsite`, `UpGuard Australia`) are fed through the pipeline -> verified that loss tracker logs distinct rejection reason codes and zero rows appear on the public board.

### Tier 4: Real-World Application Scenarios (>=5 Scenarios)
End-to-end, multi-stage realistic simulations mirroring production operations:
- **Scenario S-01**: **Complete Daily Ingestion & Public Board Publication Pipeline**:
  Simulates a full morning cron run: 60 candidate vacancies from RSS (WWR, RemoteOK), Workable (Hunt St, Coconut VA), Breezy (20Four7VA), and Teamtailor (Hammerjack) -> in-memory dedup -> `selectIntakeBatch` (cap 50) -> `geoGate` (with Step 8 trusted employer resolution) -> `classifyShift` -> `PipelineLossTracker` logging -> D1 batching (<=100 params) -> Public snapshot query via `slicePublicJobs`.
- **Scenario S-02**: **High-Volume RSS Flood vs Multi-Tenant ATS Intake**:
  Simulates 1,000 WWR RSS items competing with 3 high-value ATS openings (Hunt St, Coconut VA, Pearl Talent) under cap 50 -> verifies ATS items are never starved, deferred items are tracked, and recovered on subsequent pass.
- **Scenario S-03**: **Constitutional Zero Defense & Negative Infiltration Attack**:
  Simulates an adversarial feed containing invalid/stale/onsite openings from Pineapple Staffing (stale 2020 US), Affordable Staff (onsite Bacolod), UpGuard Australia (country pin), and an expired posting (45 days old) -> asserts 0% publication rate, strict loss reason tracking, and 0 matching public cards.
- **Scenario S-04**: **Australian / APAC Agency Dayshift Ingestion & Filter Journey**:
  Simulates ingestion of Australian agency roles (Hammerjack, RocketAMS) with explicit daytime markers ("AU Accountant - Day Shift", "8:00 AM - 5:00 PM Manila Time", "AEST business hours") -> verifies `isDayshift: true`, `shiftCategory: "day_shift"`, extraction of `phWorkingHours`, and exact matching on `/opportunities` shift filter.
- **Scenario S-05**: **Systematic Employer Reconciliation Audit Across 8 Major Agencies**:
  Executes systematic reconciliation across 8 key agencies (Hunt St, Coconut VA, 20Four7VA, CrewBloom, Pearl Talent, Hammerjack, MultiplyMii, Pineapple Staffing) through the 13-stage tracker -> validates status classification (`HEALTHY` vs `CONSTITUTIONAL_ZERO`), recall calculations, and proves zero unexplained drops.

---

## 4. Execution & Verification Commands

```bash
# Run the complete E2E Opaque-Box Test Suite
bun test apps/web/tests/e2e/e2e-opaque-box-suite.test.ts

# Run with full project test suite
bun test

# Run workspace typecheck
bun run typecheck

# Run production build preflight
bun run build
```

---

## 5. Invariant & Compliance Checklist

- [x] **D1 Parameter Ceiling**: Every SQL statement binds <= 100 parameters (28 cols * 3 rows = 84 params).
- [x] **Constitutional Zeros**: Pineapple Staffing (0 published), Affordable Staff onsite (0 published), UpGuard Australia (0 published).
- [x] **30-Day Freshness Window**: Inclusive 30-day cutoff strictly enforced; future and stale dates rejected.
- [x] **Geo-Scope Sovereignty**: Upstream `geoGate` verdicts (`ph_only`, `apac_incl_ph`, `worldwide`) cannot be revoked by downstream AI/fallback triage.
- [x] **Schedule Non-Fabrication**: `isDayshift: true` only when explicit schedule markers or PHT spans exist.
- [x] **Loss Accounting**: Zero silent drops; every rejected vacancy logs discrete stage and reason code in `PipelineLossTracker`.
