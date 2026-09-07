# EX-11 — Canonical and Wikimedia Tier A Greenhouse Shadow Admission

**Unit ID:** EX-11 (APEX-W6)  
**Phase:** ADMIT / SHADOW  
**Status:** TERMINAL — KEEP  
**G9 Decision:** KEEP  
**Identities:** `greenhouse:canonical`, `greenhouse:wikimedia`  
**As-of:** 2026-09-07T14:40:00Z  

---

## 1. Objective and Scope

EX-11 scales the verified direct employer ATS registry under APEX-10X Wave 6 by admitting two world-class remote employers using Greenhouse:
1. **Canonical (`greenhouse:canonical`)**: The creator of Ubuntu, operating 100% remote across 70+ countries with 302 active postings (95 explicitly designated *Home based - Worldwide* or *Home based - Asia*).
2. **Wikimedia Foundation (`greenhouse:wikimedia`)**: The non-profit host of Wikipedia, with 18 open positions (15+ remote-friendly technical and knowledge roles).

Mode is **SHADOW ADMISSION ONLY**:
- Exact-six public publication invariant is strictly preserved.
- Zero live opportunities published from shadow sources.
- Admitted to `source_registry` in non-publishing `operational_state = 'shadow'`.
- Governed under ADR-008 Tier A fast track (3-day shadow observation window, 10 items/tick canary ceiling).

---

## 2. Platform Compliance & Verification

| Dimension | Canonical Specification | Wikimedia Specification | Verification Result |
| :--- | :--- | :--- | :--- |
| **API Provider** | Greenhouse Boards API | Greenhouse Boards API | Verified official JSON endpoint |
| **Endpoint URL** | `https://boards-api.greenhouse.io/v1/boards/canonical/jobs` | `https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs` | Both HTTP 200 OK |
| **Authentication** | None (public GET) | None (public GET) | Verified unauthenticated GET |
| **Robots Directives** | `boards-api.greenhouse.io/robots.txt` | `boards-api.greenhouse.io/robots.txt` | Allowed (`User-agent: *`, `Allow: /`) |
| **Total Postings** | 302 postings | 18 postings | Both active and hiring |
| **PH / Global Yield** | 95 Worldwide / Asia roles | 15+ Remote roles | Substantial legitimate yield |
| **Content Scope** | `minimal` | `minimal` | Title, URL, location, company |
| **Risk Tier** | Tier A (ADR-008) | Tier A (ADR-008) | Fast-track 3d shadow, 10-cap canary |

---

## 3. Implementation Summary

1. **Allowlist Scaled (`apps/web/src/pages/api/cron/source-admit.ts`)**:
   - Added `greenhouse:canonical` and `greenhouse:wikimedia` to `SOURCE_ADMIT_ALLOWLIST`.
   - Mapped display names: Canonical and Wikimedia Foundation.
   - Adjudication references: `ex-08-greenhouse-canonical-tier-a-fast-track` and `ex-08-greenhouse-wikimedia-tier-a-fast-track`.
2. **Unit Test Coverage (`apps/web/tests/source-admit-route.test.ts`)**:
   - Asserted presence of both boards in allowlist.
   - Added explicit test verifying Canonical shadow admission with proper display name and adjudication reference (8/8 tests pass).
3. **Safety & Zero-Leakage Guarantee**:
   - `admitTarget` generates candidate rows with `operationalState: 'shadow'`.
   - `isPublishable` in `packages/scraper/policy-resolver.ts` strictly returns `false` for `shadow`.
   - Live public board remains 100% bound to exact-six feeds.

---

## 4. Verification Evidence

- `apps/web/tests/source-admit-route.test.ts`: 8/8 tests pass.
- Monorepo test suite: 1,211/1,211 tests pass across 119 files.
- Production guardrails: 0 violations.
- Typecheck: 0 errors.
- Astro build: Server and client bundles compile cleanly in 32s.
