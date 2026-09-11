# EX-BREEZY-2 — Additional Philippines VA Agencies Qualification (Yokly, Remote Craft, VALUE VA)

**Date:** 2026-09-11  
**Mission Area:** Work Queue D (Philippines-First ATS Expansion) & Work Queue E (ATS Capability Multiplication)  
**Status:** TERMINAL — KEEP (Mechanism qualified, tested, allowlisted for shadow admission)  

---

## 1. Executive Summary

Following the operational qualification of the Breezy HR capability (`EX-BREEZY`), this unit qualifies three additional high-yield Philippine Virtual Assistant and remote staffing agencies operating public Breezy HR career portals:

1. **Yokly (`breezy:yokly`)**: 11 active remote roles dedicated to Filipino talent across Cebu, Bohol, Batangas, General Santos, Davao, Bacolod, and nationwide (Operations VAs, Marketing Automation, Client Experience, Full Stack Dev).
2. **Remote Craft (`breezy:remote-craft`)**: 15 active remote roles for Filipino talent (Executive Assistant, General VA, Cold Caller, Customer Service Representative, Operations Manager, Creative Designer, Software Engineer).
3. **VALUE Virtual Assistants (`breezy:value-virtual-assistants`)**: 6 active remote roles for Filipino talent (Operations & Bookkeeping Assistant, Video Editor, Freelance Social Media Manager, Bookkeeper).

Together with the previously admitted `breezy:20four7va` (98 jobs) and `breezy:sourcefit` (78 jobs), the qualified Breezy HR agency cohort now represents **208 active, verified remote opportunities** specifically curated for Filipino freelancers and remote workers.

---

## 2. Endpoint & Protocol Verification

Live probes conducted on 2026-09-11 with standard unauthenticated HTTP GET requests:

| Target Identity | Endpoint URL | HTTP Status | Content-Type | Active Postings | Sample Role Verified |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `breezy:yokly` | `https://yokly.breezy.hr/json` | 200 OK | `application/json; charset=utf-8` | 11 | *Operations Virtual Assistant (bohol, PH, remote: true)* |
| `breezy:remote-craft` | `https://remote-craft.breezy.hr/json` | 200 OK | `application/json; charset=utf-8` | 15 | *Burns - Executive Assistant (EA) (Philippines, remote: true)* |
| `breezy:value-virtual-assistants` | `https://value-virtual-assistants.breezy.hr/json` | 200 OK | `application/json; charset=utf-8` | 6 | *Operations & Bookkeeping Assistant (Philippines, remote: true)* |

---

## 3. Compliance & Policy Verification

### 3.1 Robots.txt Verification
- `https://yokly.breezy.hr/robots.txt`: Standard Breezy robots rules; `/json` is explicitly allowed.
- `https://remote-craft.breezy.hr/robots.txt`: Standard Breezy robots rules; `/json` is explicitly allowed.
- `https://value-virtual-assistants.breezy.hr/robots.txt`: Standard Breezy robots rules; `/json` is explicitly allowed.
- `candidate-shadow.ts` probe verification: `Robots verdict: allowed`, `Robots wouldBlock: false`.

### 3.2 Shadow Probe Results (100% Passing)
```text
yokly Outcome: HEALTHY_WITH_RESULTS Items: 11 Plausible: 11 Bytes: 9690 Robots: allowed
remote-craft Outcome: HEALTHY_WITH_RESULTS Items: 15 Plausible: 15 Bytes: 13340 Robots: allowed
value-virtual-assistants Outcome: HEALTHY_WITH_RESULTS Items: 6 Plausible: 6 Bytes: 5120 Robots: allowed
```

### 3.3 Content Scope & Minimal Extraction
- **Title**: Extracted from `job.name`.
- **Source URL**: Direct canonical link to the agency's Breezy application page (`job.url`).
- **Location**: Extracted from `job.location.name` and `is_remote` indicators.
- **Description**: Concise location/remote summary only; no full HTML body ingested.

---

## 4. Implementation Summary

1. **Allowlist Scaled (`apps/web/src/pages/api/cron/source-admit.ts`)**:
   - Added `breezy:yokly`, `breezy:remote-craft`, and `breezy:value-virtual-assistants` to `SOURCE_ADMIT_ALLOWLIST`.
   - Mapped display names in `admitTarget` (`Yokly`, `Remote Craft`, `VALUE Virtual Assistants`).
   - Adjudication reference: `ex-ph-agency-breezy-${token}-tier-a-fast-track`.
2. **Shared Provider Invariant Preserved**:
   - Uses shared provider `breezy` (`allowedHosts = "20four7va.breezy.hr,breezy.hr"`).
   - Snapshot equality preserved: zero mutation of `provider_profiles`.
3. **Unit Test Coverage (`apps/web/tests/source-admit-route.test.ts`)**:
   - Updated allowlist test (11/11 tests pass).
   - Added explicit test verifying `breezy:yokly` admission.
4. **Safety & Zero-Leakage**:
   - Mode is non-publishing shadow (`operational_state = 'shadow'`).
   - `isPublishable` returns `false` for `shadow`.
   - Exact-six publishing invariant strictly maintained.
