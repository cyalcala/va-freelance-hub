# Candidate Queue Backlog Audit (14 Candidates)

**Audit Date**: 2026-09-19  
**Reference Commit**: `b33b51d`  
**Database**: Cloudflare Production D1 (`DB` / `08072f16-d3d1-436a-9104-b057a162db7c`)  
**Status**: ACTIVE BACKLOG AUDIT COMPLETE  

---

## 1. Executive Summary

As of 2026-09-19, production `source_registry` holds **14 durable candidates** in `operational_state = 'candidate'` with `compliance_state = 'needs_review'`.

These candidates represent a high-value prospective expansion reserve of Philippine-focused employers and technical remote employers:
- **Ashby (5 candidates)**: Quarantined under `COMP-01C`.
- **Breezy (1 candidate)**: VAA Philippines (`breezy:vaaphilippines-recruitment`), ready for shadow admission.
- **Lever (1 candidate)**: Vault Outsourcing (`lever:vaultoutsourcing`), ready for shadow admission.
- **Workable (7 candidates)**: Major Philippine VA and BPO employers (`connectos`, `global-strategic`, `myoutdesk`, `outsource-access`, `staff-domain-inc`, `superstaff`, `virtualstaff365`), ready for shadow admission following Run 78 pacing hardening.

---

## 2. Detailed Candidate Inventory & Classification

| Source ID | Provider | Employer Name | Review Deadline | Risk Tier | Actionable Status |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `ashby:amplify` | Ashby | Amplify | 2026-09-25 | Tier B | 🛑 **QUARANTINED** (`COMP-01C`). Awaiting partner feed. |
| `ashby:ashby` | Ashby | Ashby HQ | 2026-09-25 | Tier B | 🛑 **QUARANTINED** (`COMP-01C`). Awaiting partner feed. |
| `ashby:camunda` | Ashby | Camunda | 2026-09-25 | Tier B | 🛑 **QUARANTINED** (`COMP-01C`). Awaiting partner feed. |
| `ashby:supabase` | Ashby | Supabase | 2026-09-25 | Tier B | 🛑 **QUARANTINED** (`COMP-01C`). Awaiting partner feed. |
| `ashby:tremendous` | Ashby | Tremendous | 2026-09-26 | Tier B | 🛑 **QUARANTINED** (`COMP-01C`). Awaiting partner feed. |
| `breezy:vaaphilippines-recruitment` | Breezy | VAA Philippines | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. Verified PH Amazon VA agency. |
| `lever:vaultoutsourcing` | Lever | Vault Outsourcing | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. Lever public postings API. |
| `workable:connectos` | Workable | ConnectOS | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. Major PH offshore employer. |
| `workable:global-strategic` | Workable | Global Strategic | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. Major PH BPO/VA agency. |
| `workable:myoutdesk` | Workable | MyOutDesk | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. Premier real estate VA agency. |
| `workable:outsource-access` | Workable | Outsource Access | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. Major PH VA employer. |
| `workable:staff-domain-inc` | Workable | Staff Domain | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. AU/PH outsourcing agency. |
| `workable:superstaff` | Workable | SuperStaff | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. Clark/Manila BPO provider. |
| `workable:virtualstaff365` | Workable | Virtual Staff 365 | 2026-09-26 | Tier A | 🟢 **ADMISSION READY**. Melbourne/Manila VA agency. |

---

## 3. Policy & Governance Assessment by Provider

### A. Ashby Cohort (`COMP-01C` Quarantine)
- **Constraint**: Ashby's public API terms explicitly restrict automated scraping of job boards without a registered partner API key or explicit employer authorization.
- **Decision**: In strict alignment with [`AGENTS.md`](../../AGENTS.md) Compliance Policy (*"Do not bypass logins, paywalls, CAPTCHAs, robots.txt, rate limits, or explicit anti-automation terms"*), the 5 Ashby candidates remain quarantined in `compliance_state = 'needs_review'` and will not be admitted to shadow observation until a formal partner access path is documented.

### B. Breezy Cohort (`breezy:vaaphilippines-recruitment`)
- **Profile**: VAA Philippines is a specialized agency placing Filipino virtual assistants for Amazon and eCommerce sellers.
- **Technical Fit**: Breezy's unauthenticated JSON API (`https://{token}.breezy.hr/json`) has demonstrated 100% reliability across all 6 existing Breezy shadow sources.
- **Next Action**: Ready for admission via `gha-source-admit.yml`.

### C. Lever Cohort (`lever:vaultoutsourcing`)
- **Profile**: Vault Outsourcing provides dedicated remote staff from the Philippines to Australian and US businesses.
- **Technical Fit**: Lever's public postings API GET (`https://api.lever.co/v0/postings/{token}`) is documented and rate-safe.
- **Next Action**: Ready for admission via `gha-source-admit.yml`.

### D. Workable Cohort (7 Philippine Employers)
- **Profile**: These 7 companies (ConnectOS, Global Strategic, MyOutDesk, Outsource Access, Staff Domain, SuperStaff, Virtual Staff 365) are established Philippine employers representing an estimated 350+ active remote roles.
- **Technical Prerequisite**: With the provider-interleaving and host-aware pacing deployed in Run 78, these 7 sources can be admitted to shadow observation without triggering HTTP 429 rate limit spikes.
- **Next Action**: Batch admission can be staged in rotating windows.
