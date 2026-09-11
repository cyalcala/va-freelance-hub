# EX-BREEZY — Breezy HR Provider Capability & Philippines Agency Qualification

**Date:** 2026-09-11  
**Mission Area:** Work Queue D (Philippines-First ATS Expansion) & Work Queue E (ATS Capability Multiplication)  
**Status:** TERMINAL — KEEP (Mechanism qualified, tested, allowlisted for shadow admission)  

---

## 1. Executive Summary

This unit establishes the **Breezy HR Reusable Source Capability** (`packages/scraper/breezy-canary.ts`) and qualifies two of the highest-volume, Philippines-headquartered/staffing virtual assistant and remote knowledge work agencies:
1. **20Four7VA (`breezy:20four7va`)**: 98 active remote opportunities on official Breezy portal, specializing in virtual assistance, executive support, customer service, and digital marketing.
2. **Sourcefit (`breezy:sourcefit`)**: 78 active remote/hybrid opportunities on official Breezy portal (Eastwood Quezon City / PH / Worldwide), specializing in AI automation, tech support, accounting, and creative services.

Together, these two employer identities alone represent **176 active, verified opportunities** tailored for Filipino freelancers and remote workers, directly advancing the Prime Directive (100–150 qualified net-new PH-accessible jobs/day).

---

## 2. Endpoint & Protocol Verification

Live probes conducted on 2026-09-11 with standard HTTP GET requests:

| Target Identity | Endpoint URL | HTTP Status | Content-Type | Active Postings | Sample Role Verified |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `breezy:20four7va` | `https://20four7va.breezy.hr/json` | 200 OK | `application/json; charset=utf-8` | 98 | *B-CPT-11236 Bilingual Patient Care Coordination VA* |
| `breezy:sourcefit` | `https://sourcefit.breezy.hr/json` | 200 OK | `application/json; charset=utf-8` | 78 | *AI Automation and Workflow Specialist* (Eastwood Quezon City, PH) |
| `breezy:time-etc` | `https://time-etc.breezy.hr/json` | 200 OK | `application/json; charset=utf-8` | 1 | *Role at Time etc - New Pipeline* |
| `breezy:vaaphilippines-recruitment` | `https://vaaphilippines-recruitment.breezy.hr/json` | 200 OK | `application/json; charset=utf-8` | 0 | `HEALTHY_EMPTY` |

---

## 3. Compliance & Policy Verification

### 3.1 Robots.txt Verification
- `https://20four7va.breezy.hr/robots.txt`:
  ```text
  User-Agent: *
  Disallow: /css
  Disallow: /fonts
  Disallow: /stylesheets
  Disallow: /javascripts
  ```
  The `/json` path is explicitly and unambiguously permitted.
- `https://sourcefit.breezy.hr/robots.txt`: Identical standard rules; `/json` is permitted.
- `https://breezy.hr/robots.txt`: `Allow: /` and `Allow: /resources`. No blocking of job endpoints.

### 3.2 Content Scope & Minimal Extraction
Following the established minimal-metadata precedent:
- **Title**: Extracted from `job.name` with tag stripping.
- **Source URL**: Canonical `job.url` linkback directly to the Breezy-hosted application page.
- **Location**: Extracted from `job.locations` / `job.location.name` and `is_remote` signals.
- **Description**: Stored strictly as a concise location/remote summary (e.g. `Location: Eastwood Quezon City, PH. Remote: yes.`). Full HTML job description is actively discarded.
- **Pay Range**: Preserved from `job.salary` if stated; otherwise `null`.

### 3.3 Two-Speed Governance Tiering (ADR-008)
Breezy HR is classified as **Tier A** (Direct structured public ATS API with clean JSON and explicit robots allow).
- Fast-track shadow observation: 3-day minimum (standard server predicate requires 7 full days / 8 distinct UTC dates before live promotion).
- Canary ceiling: $\le 10$ items/tick.

---

## 4. Architecture & Implementation

### 4.1 Capability Module (`packages/scraper/breezy-canary.ts`)
- Implements `buildBreezyProviderProfile`:
  - `mechanism: "ats_api"`
  - `authClass: "none"`
  - `visibilityFilter: "published"`
  - `contentScope: "minimal"`
  - `allowedHosts: "breezy.hr"`
  - `evidenceLeaseDays: 180`
- Implements `buildBreezyCandidateRow`:
  - Constructs candidate row starting in `operationalState: "candidate"`, `complianceState: "conditional"`.

### 4.2 Admission Allowlist (`apps/web/src/pages/api/cron/source-admit.ts`)
- Expanded `SOURCE_ADMIT_ALLOWLIST` with:
  - `breezy:20four7va`
  - `breezy:sourcefit`
  - `breezy:time-etc`
  - `breezy:vaaphilippines-recruitment`
- Integrated into `admitTarget` with Tier A fast-track adjudication references (`ex-ph-agency-breezy-${token}-tier-a-fast-track`).

---

## 5. Verification Evidence

- **Unit Tests**:
  - `packages/scraper/breezy-canary.test.ts`: 6/6 tests pass.
  - `apps/web/tests/source-admit-route.test.ts`: 9/9 tests pass.
- **Monorepo Suite**:
  - **1,277/1,277 Bun tests pass across 129 files** (26.1s).
  - 15/15 Python tests pass cleanly (`py -m unittest`).
- **Typecheck & Guardrails**:
  - `bun run typecheck`: Clean (0 errors).
  - `bun run audit:guardrails`: Clean (0 violations).
- **Production Invariant**:
  - Shadow admission only (`operationalState: "shadow"`).
  - Evaluated safely via hourly shadow dispatch without mutating public listings.
  - Zero leakage: `isPublishable` strictly returns `false` for `shadow`.
