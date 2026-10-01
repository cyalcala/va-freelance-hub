# Unit GCP-03: Autonomous Worldwide Source Universe & ATS Miner Engine

**Version:** 1.0.0 · 2026-10-02  
**Authority:** [Global Miner Master Prompt](../SOURCE_UNIVERSE_GLOBAL_MINER_MASTER_PROMPT.md) & [Master Operating Constitution v3.0 (Part LXII)](../MASTER_OPERATING_CONSTITUTION.md)  
**Status:** DELIVERED & DEPLOYED (Production Commit `8faea5a`)

---

## 1. Context & Objective

The primary objective of VA Freelance Hub is to sustain at least **100 fresh, unique, legitimate, verified remote opportunities accessible to people in the Philippines per day** (stretch goal: 150/day).

To achieve this without compromising strict Philippines eligibility precision or violating source compliance policies, we established an autonomous, dual-tier architecture:
1. **Turso Data Lake:** The infinite evidence, research, and candidate staging reservoir.
2. **Cloudflare D1:** The governed, high-performance public serving mart.

Unit GCP-03 delivers the **Autonomous Worldwide Source Universe & ATS Miner Engine**, automating continuous tenant discovery and reconciliation in the background so that new opportunities are surfaced and vetted without requiring repetitive manual prompts.

---

## 2. Architecture & Data Flow

```text
                                 [ DISCOVERY CORPUS ]
                          (9,439 Unvalidated ATS Tenant Claims)
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │ Phase 1: Stratified Reconciliation   │
                     │ (Evenly sampled across ATS families)  │
                     └───────────────────┬───────────────────┘
                                         │
    [ LAKE / D1 INVENTORY ]              │
    (Proven Employer Domains)            │
               │                         │
               ▼                         ▼
┌─────────────────────────────┐ ┌────────────────────────────────────┐
│ Phase 2: Domain Discovery   │ │ Polite HTTP Probing                │
│ (First-party ATS detection) │ │ (1500ms delay, public JSON only)   │
└──────────────┬──────────────┘ └─────────────────┬──────────────────┘
               │                                  │
               └─────────────────┬────────────────┘
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │ geoGate Deterministic Filter   │
                 │ (Evaluates PH accessibility)   │
                 └───────────────┬────────────────┘
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │ Jev 1.13 Structured Adjudicator│
                 │ (ADMIT / SHADOW / REJECT)      │
                 └───────────────┬────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   [ AUTO-REJECT ]        [ SHADOW MONITOR ]      [ AUTO-ADMIT ]
 (review_status='auto_rejected' (review_status='shadow_monitor' (review_status='auto_approved'
  Permanently avoided)   Held for further data)  Jobs ingested to Lake)
                                                         │
                                                         ▼
                                              [ LAKE RESERVOIR ]
                                              (lake_candidate_jobs)
                                                         │
                                                         ▼
                                              [ DUAL-GATE PUBLISH ]
                                              Wilson bound >= 20%
                                              (Zero unverified leaks)
```

---

## 3. Implemented Components

### 3.1 Unified Background Miner Runner
- **Location:** [`scripts/lake/run-lake-miner.ts`](file:///c:/Users/admin/Desktop/va-freelance-hub/scripts/lake/run-lake-miner.ts)
- **CLI Commands:**
  - `bun run lake:mine` — runs the complete miner cycle with defaults.
  - `bun run lake:reconcile` — executes a targeted corpus reconciliation slice.
- **Configurable Parameters:**
  - `--reconcile-per-family=N` (default: 20 boards/family).
  - `--domain-limit=N` (default: 25 employer domains).
  - `--delay-ms=N` (default: 1500ms polite inter-probe delay).
  - `--dry-run` (simulates probing without mutating database rows).
  - `--skip-reconcile` / `--skip-domain-discovery`.
- **Fail-Safe Invariant:** Missing credentials exit cleanly with code 0 and warning logs, preventing build pipeline breakage.
- **Unit Tests:** [`scripts/lake/run-lake-miner.test.ts`](file:///c:/Users/admin/Desktop/va-freelance-hub/scripts/lake/run-lake-miner.test.ts) (7/7 pass).

### 3.2 Scheduled Background GitHub Actions Workflow
- **Location:** [`.github/workflows/gha-lake-miner.yml`](file:///c:/Users/admin/Desktop/va-freelance-hub/.github/workflows/gha-lake-miner.yml)
- **Cadence:** `cron: '23 */3 * * *'` (runs every 3 hours at minute 23).
- **Manual Overrides:** Configurable via `workflow_dispatch`.

### 3.3 GCP Cloud Run Job Integration
- **Runner:** [`scripts/gcp/run-lake-miner.ts`](file:///c:/Users/admin/Desktop/va-freelance-hub/scripts/gcp/run-lake-miner.ts)
- **Container Descriptors:** [`infra/gcp/lake-miner/Dockerfile`](file:///c:/Users/admin/Desktop/va-freelance-hub/infra/gcp/lake-miner/Dockerfile) and [`infra/gcp/lake-miner/package.json`](file:///c:/Users/admin/Desktop/va-freelance-hub/infra/gcp/lake-miner/package.json).
- **Logging Contract:** Emits structured JSON matching `GcpMinerLogPayload` to Google Cloud Logging.
- **Unit Tests:** [`scripts/gcp/run-lake-miner.test.ts`](file:///c:/Users/admin/Desktop/va-freelance-hub/scripts/gcp/run-lake-miner.test.ts) (4/4 pass).

### 3.4 Bootloader & Autonomous Marathon Mode Integration
- Upgraded [`MAINTAINER_BOOTLOADER.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/bootloaders/MAINTAINER_BOOTLOADER.md) to Version 5.3.
- Linked [`CURRENT.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/bootloaders/CURRENT.md), [`MASTER_OPERATING_PROMPT.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/bootloaders/MASTER_OPERATING_PROMPT.md), [`EXECUTION_PROMPT.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/bootloaders/EXECUTION_PROMPT.md), and [`AGENTS.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/AGENTS.md).
- Sets `AUTONOMOUS_MARATHON_MODE = ACTIVE` automatically upon pasting the maintainer bootloader.

---

## 4. Verification & Operational Evidence

1. **Unit & Integration Tests:**
   - `bun test` passes 1,698/1,698 tests across 177 files in ~39s.
2. **Typecheck & Guardrails:**
   - `bun run typecheck` exits 0 with zero errors.
   - `bun scripts/ci/check-production-guardrails.ts` and `bun scripts/ci/audit-constitution.ts` pass cleanly.
3. **Live Dry-Run Validation:**
   - Executed `bun run lake:mine --reconcile-per-family=5 --domain-limit=5 --dry-run` against live Turso database.
   - 20 boards probed with 0 errors and 0 rate limits.
   - Accurately evaluated Hunt St (98.5% PH rate) and CrewBloom (26.7% PH rate) as `ADMIT`, and zero-PH boards as `REJECT`.
4. **Production Deployment:**
   - GitHub Actions run `36923231906` passed all stages: secret scan, guardrails, parameter parity, orchestrator guard, unit tests, Python analytics, Astro build, strict typecheck, cron worker validation, D1 migration apply, D1 integrity verification, and Cloudflare Pages deployment.
