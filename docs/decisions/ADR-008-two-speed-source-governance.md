> **2026-09-08 audit correction:** Historical branch narrative below is not current production evidence. See `docs/gauntlet/evidence/APEX-AUDIT-2026-09-08/AUDIT.md` and `docs/benchmarks/APEX_10X_BASELINE_2026-09-08.md`. Only three sources are in live shadow; additional allowlist entries are not admissions. Risk tiers are advisory; seven-day server policy remains enforced. Numeric estimates and exact-zero billing claims are unverified.

# ADR-008: Two-Speed Risk-Proportional Source Governance

## Status

Accepted

This is a planning and architecture decision implementing APEX Wave 2 (Workstream B).
It authorizes risk-proportional governance parameters without weakening safety boundaries, bypassing robots.txt, or altering the exact-six production ingestion invariant.

**Governing masterplans:**
- [`docs/APEX_10X.md`](../APEX_10X.md)
- [`docs/decisions/ADR-007-autonomous-constitutional-source-governance.md`](./ADR-007-autonomous-constitutional-source-governance.md)
- [`docs/decisions/ADR-006-controlled-source-replenishment.md`](./ADR-006-controlled-source-replenishment.md)

---

## Date

2026-09-07

---

## Context

Under ADR-006 and ADR-007, every prospective source identity must satisfy rigorous compliance verification, lease tracking, and observation before publication. In the initial bootstrap implementation, all non-exact-six candidates were subjected to identical, uniform multi-week verification gates regardless of access mechanism.

In production reality, access mechanisms possess fundamentally different risk profiles:
1. **Direct public ATS APIs** (e.g., Greenhouse Boards API, Lever Postings API, Ashby Posting API, Breezy JSON, Workable global feed) have stable schemas, official unauthenticated endpoints, low parser fragility, explicit attribution, and clear rate guidance.
2. **Variable/partner APIs** feature fluctuating schemas and higher risk of silent structural drift.
3. **HTML / DOM scraping surfaces** are fragile, break on UI redesigns, and risk bot-wall blocks or terms contradictions.

Treating a direct, unauthenticated JSON ATS endpoint with the same high governance friction as brittle HTML scraping creates an artificial bottleneck that suppresses qualified opportunity yield without adding meaningful safety.

---

## Decision

VA Freelance Hub adopts **two-speed, risk-proportional source governance** across three explicit tiers:

### Tier A — Direct Structured Public Sources
- **Scope**: Official public ATS endpoints (`greenhouse`, `lever`, `ashby`, `breezy`, `workable:global-feed`) and documented syndication RSS/JSON feeds (`remotive`, `weworkremotely`, `jobicy`).
- **Characteristics**: Unauthenticated GET or official partner token, stable JSON/XML schema, robots allowed, clear employer attribution.
- **Fast-Track Lifecycle**:
  $$\text{probe} \longrightarrow \text{schema validation} \longrightarrow \text{policy verification} \longrightarrow \text{3-day shadow} \longrightarrow \text{capped canary} \longrightarrow \text{active}$$
- **Minimum Shadow Window**: 3 days of stored healthy observations (`sp23-shadow-7d-v1` reduced to 3 days for Tier A when 0 schema errors occur).
- **Canary Ceiling**: Up to 10 new opportunities per scheduled tick.

### Tier B — Variable & Partner Interfaces
- **Scope**: Public syndication APIs with variable schemas or partner endpoints.
- **Characteristics**: Moderate parser fragility, unstandardized location/salary fields.
- **Standard Lifecycle**:
  $$\text{probe} \longrightarrow \text{policy review} \longrightarrow \text{7-day shadow} \longrightarrow \text{canary} \longrightarrow \text{health observation} \longrightarrow \text{active}$$
- **Minimum Shadow Window**: 7 days of verified observations.
- **Canary Ceiling**: Up to 5 new opportunities per scheduled tick.

### Tier C — HTML & High-Fragility Surfaces
- **Scope**: Public career pages requiring DOM scraping or heuristic text extraction.
- **Characteristics**: High parser fragility, rate-limit sensitivity, risk of layout breakages.
- **Strict Governance Lifecycle**:
  $$\text{policy clearance} \longrightarrow \text{probe} \longrightarrow \text{parser verification} \longrightarrow \text{14-day shadow} \longrightarrow \text{anomaly check} \longrightarrow \text{constrained canary} \longrightarrow \text{active}$$
- **Minimum Shadow Window**: 14 days of shadow observations.
- **Canary Ceiling**: Strictly clamped to 2 opportunities per tick.

---

## Non-Negotiable Safety Invariants

1. **Band 4 Block Remains Absolute**: SmartRecruiters, OnlineJobs.ph HTML, Dribbble, and Authentic Jobs remain strictly paused/blocked.
2. **Robots & Terms Compliance**: No tier may bypass robots.txt disallow directives or ignore explicit rate/crawl-delay headers.
3. **Durable Opt-Out Memory**: Opt-out records in `source_opt_outs` permanently block admission across all tiers.
4. **Independent Blast-Radius Caps**: Provider-family concentration limits (ADR-006 §7: maximum 40% per single family) apply across all tiers.
5. **Reversibility**: Any Tier A or B source exhibiting consecutive schema errors or anomaly flags automatically rolls back to `shadow` or `quarantined`.

---

## Verification & Implementation

- Implemented in `@va-hub/scraper` via `classifySourceRiskTier` and `RISK_TIER_POLICIES` in `packages/scraper/policy-resolver.ts`.
- Validated with unit tests in `packages/scraper/policy-resolver.test.ts`.
