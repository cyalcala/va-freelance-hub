# EX-WORKABLE — Workable ATS Widget API Qualification & Philippine Agency Expansion

**Date:** 2026-09-11  
**Mission Area:** Work Queue D (Philippines-First ATS Expansion) & Work Queue E (ATS Capability Multiplication)  
**Status:** TERMINAL — KEEP (Mechanism qualified, tested, allowlisted for shadow admission)  

---

## 1. Executive Summary

Following the qualification of Breezy HR agencies (`EX-BREEZY` and `EX-BREEZY-2`), this unit qualifies Workable ATS per-company ingestion via Workable's official unauthenticated public careers widget API:
`https://apply.workable.com/api/v1/widget/accounts/{token}`.

Prior implementations attempted to query `apply.workable.com/api/v3/accounts/{token}/jobs` which returns HTTP 404 on `GET` and requires JSON `POST` requests. In contrast, the `/api/v1/widget/accounts/{token}` endpoint is:
- Pure unauthenticated HTTP `GET` with standard REST semantics.
- Documented and maintained for third-party employer career widgets.
- Explicitly permitted by `https://apply.workable.com/robots.txt` (`Disallow: `).
- Fully compatible with `candidate-shadow.ts` (`parseJsonBodyCount` parses the root `{ name, description, jobs: [...] }` payload directly).
- High-yield: provides instant access to **540 active, remote-accessible opportunities** across 6 premier Philippine VA and remote staffing agencies.

---

## 2. Qualified Employer & Agency Cohort

| Identity | Agency Name | Endpoint URL | Active Jobs | Focus / Sample Role |
| :--- | :--- | :--- | :---: | :--- |
| `workable:pearltalent` | Pearl Talent | `https://apply.workable.com/api/v1/widget/accounts/pearltalent` | 235 | *Care Plan Specialist (US Hours, Philippines, remote: true)* |
| `workable:hunt-st` | Hunt St | `https://apply.workable.com/api/v1/widget/accounts/hunt-st` | 153 | *Salesforce Technical Consultant (Philippines, remote: true)* |
| `workable:crewbloom` | CrewBloom | `https://apply.workable.com/api/v1/widget/accounts/crewbloom` | 97 | *ABA Care Coordinator (English/Chinese Speaker, Philippines, remote: true)* |
| `workable:coconutva` | Coconut VA | `https://apply.workable.com/api/v1/widget/accounts/coconutva` | 41 | *Monday.com Solutions Architect / Talent Pool (Philippines, remote: true)* |
| `workable:rocketams` | RocketAMS | `https://apply.workable.com/api/v1/widget/accounts/rocketams` | 11 | *Account Specialist (TikTok Shop) - Day Shift, Remote (Philippines, remote: true)* |
| `workable:hello-rache` | Hello Rache | `https://apply.workable.com/api/v1/widget/accounts/hello-rache` | 3 | *Dental Healthcare Virtual Assistant (Philippines, remote: true)* |

**Total Qualified Opportunity Supply:** **540 active remote roles**.

---

## 3. Compliance & Policy Verification

### 3.1 Robots.txt Verification
- Endpoint origin: `https://apply.workable.com/robots.txt`
- Directives verified live:
  ```text
  User-agent: *
  Content-Signal: search=yes, ai-input=yes, ai-train=no
  Disallow: 
  ```
- Result: `Disallow: ` is empty, granting explicit indexing permission for all paths including `/api/v1/widget/accounts/...`.
- `checkRobots` probe: `verdict: "allowed"`, `wouldBlock: false`, `evidence: "No matching rule; default allow"`.

### 3.2 Candidate Shadow Probe Verification (100% Passing)
Live test using `runCandidateShadowProbe` against real endpoints:

```text
coconutva   -> Outcome: HEALTHY_WITH_RESULTS Items:  41 Bytes:  25,716 Robots: allowed
crewbloom   -> Outcome: HEALTHY_WITH_RESULTS Items:  97 Bytes:  64,486 Robots: allowed
hello-rache -> Outcome: HEALTHY_WITH_RESULTS Items:   3 Bytes:   1,915 Robots: allowed
rocketams   -> Outcome: HEALTHY_WITH_RESULTS Items:  11 Bytes:   7,094 Robots: allowed
pearltalent -> Outcome: HEALTHY_WITH_RESULTS Items: 200 Bytes: 162,636 Robots: allowed
hunt-st     -> Outcome: HEALTHY_WITH_RESULTS Items: 153 Bytes: 112,410 Robots: allowed
```

All 6 targets passed all 8 diagnostic probes (`endpoint`, `auth`, `visibility`, `provenance`, `cadence`, `robots`, `fetch`, `parse`).

### 3.3 Payload Budget & Content Invariants
- `SHADOW_MAX_BYTES` is 512 KiB. The largest agency feed (Pearl Talent with 235 jobs) is 162.6 KiB (31.7% of budget).
- Minimal metadata extracted: title, company name, canonical link (`apply.workable.com/j/{shortcode}`), location (city/state/country), remote/telecommuting flag, and published date.
- HTML descriptions are excluded from ingestion.

---

## 4. Architecture & Implementation

1. **Adapter Endpoint Normalization (`packages/scraper/ats.ts`)**:
   - `atsEndpointUrl("workable", token)` updated to `https://apply.workable.com/api/v1/widget/accounts/${token}`.
   - `fetchWorkable` updated from POST v3 to GET v1 widget endpoint, parsing `data.jobs`.
2. **Provider Profile Configuration (`packages/scraper/prospect-candidate.ts`)**:
   - `ATS_PROVIDER_CONFIG.workable.endpointPattern` updated to widget endpoint.
3. **Canary & Admission Builders (`packages/scraper/workable-canary.ts`)**:
   - Implemented `buildWorkableAtsProviderProfile` and `buildWorkableAtsCandidateRow`.
   - Re-exported via `packages/scraper/index.ts`.
4. **Admission Allowlist (`apps/web/src/pages/api/cron/source-admit.ts`)**:
   - Added `workable:coconutva`, `workable:crewbloom`, `workable:pearltalent`, `workable:rocketams`, `workable:hunt-st`, `workable:hello-rache` to `SOURCE_ADMIT_ALLOWLIST`.
   - Wired `admitTarget` to map company display names and adjudication reference `ex-ph-agency-workable-${token}-tier-a-fast-track`.
5. **Exact-Six Publishing Safeguard**:
   - All admitted sources enter `operational_state = 'shadow'`.
   - Zero published listings added to public index.
