# EX-08 — Greenhouse Multi-Board Admission & Registry Expansion

**Unit ID:** EX-08  
**Workstream:** Expansion / Registry Scale (APEX Wave 3)  
**Phase:** ADMIT / SHADOW  
**Status:** COMPLETE — ADMITTED TO SHADOW  
**Risk Tier:** Tier A (Direct ATS REST API, zero auth, documented GET, public schema)  
**As-of:** 2026-09-07T13:45:00Z  

---

## 1. Context and Motivation

Following the successful qualification of the Greenhouse Job Board REST mechanism in EX-02 (`greenhouse:grafanalabs`, PR #116, #118, #119) and the codification of risk-proportional governance in ADR-008 (APEX Wave 2, PR #128), EX-08 executes the multi-board admission of proven, remote-first technology employers operating official Greenhouse job boards.

Under ADR-008, Greenhouse is formally classified as **Tier A**:
- Direct ATS REST API at `boards-api.greenhouse.io`
- Documented public GET endpoint (`/v1/boards/{board_token}/jobs`)
- Clean structured JSON payload with title, absolute `hosted_url`, and remote location descriptors
- Zero authentication or session tokens required
- Fast-track shadow observation window: **3 days** (vs. 7 days for Tier B, 14 days for Tier C)
- Maximum active canary ceiling: **10** (vs. 5 for Tier B, 2 for Tier C)

---

## 2. Admitted Greenhouse Employer Boards

The following remote-first employers have been admitted to the `SOURCE_ADMIT_ALLOWLIST` in `apps/web/src/pages/api/cron/source-admit.ts`:

| Source ID | Employer Name | Company Token | Endpoint URL | Compliance Ref |
| :--- | :--- | :--- | :--- | :--- |
| `greenhouse:grafanalabs` | Grafana Labs | `grafanalabs` | `https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs` | `ex-02-owner-approved-approach-b-sp12-review-ready` |
| `greenhouse:gitlab` | GitLab | `gitlab` | `https://boards-api.greenhouse.io/v1/boards/gitlab/jobs` | `ex-08-greenhouse-gitlab-tier-a-fast-track` |
| `greenhouse:remotecom` | Remote.com | `remotecom` | `https://boards-api.greenhouse.io/v1/boards/remotecom/jobs` | `ex-08-greenhouse-remotecom-tier-a-fast-track` |
| `greenhouse:nearform` | Nearform | `nearform` | `https://boards-api.greenhouse.io/v1/boards/nearform/jobs` | `ex-08-greenhouse-nearform-tier-a-fast-track` |
| `greenhouse:ghost` | Ghost Foundation | `ghost` | `https://boards-api.greenhouse.io/v1/boards/ghost/jobs` | `ex-08-greenhouse-ghost-tier-a-fast-track` |

---

## 3. Production Invariant Preservation

1. **Exact-Six Ingestion Preserved:** Admitted boards enter `operational_state = 'shadow'` (via `source-admit` route). Shadow sources do NOT publish opportunities to the public job board (`isPublishable` is false in `shadowMode`).
2. **Deterministic Canary Gating:** Promotion from `shadow` to `canary` requires:
   - Completion of the 3-day Tier A observation window with $\ge 72$ hourly ticks recorded.
   - Zero fatal schema drift or unhandled exceptions.
   - Non-zero eligible Philippines yield without LLM hallucination.
   - Strict canary item cap ($\le 10$ new items per tick) enforced on initial promotion.
3. **FinOps Envelope Preserved:** Polling occurs during hourly shadow dispatch (`cron/shadow-dispatch`), consuming $\le 4$ additional subrequests per hour well within the 100k daily subrequest ceiling.

---

## 4. Verification & Testing Evidence

- **Unit Tests:** `apps/web/tests/source-admit-route.test.ts` updated and passing (7/7 tests pass).
- **Monorepo Tests:** 1,192 tests pass across 117 files.
- **Typecheck:** Clean (`bunx tsc --noEmit -p apps/web/tsconfig.json`).
- **Production Guardrails:** Clean (`bun scripts/ci/check-production-guardrails.ts`).
- **Build:** Cloudflare Pages Astro build validated.
