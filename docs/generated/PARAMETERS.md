# VA FREELANCE HUB — ACCEPTED PARAMETERS REGISTRY (MIRROR)
## Human-Readable Operational Thresholds, Budgets, and SLAs

```yaml
document_metadata:
  document_type: GENERATED_MIRROR
  document_status: ACTIVE_OPERATIONAL
  canonical_source: "docs/ACCEPTED_PARAMETERS.yaml"
  version: "2.0.0"
  effective_at: "2026-09-26T11:49:00+08:00"
  last_verified_at: "2026-09-26T11:49:00+08:00"
  verified_by: "agent-antigravity"
  applies_to_commit: "72709b153b3ada5916a7e6fefd40c3a8ec0f6bbd"
```

> [!IMPORTANT]
> **Single Source of Truth Directive (C2):**
> This file is a **generated human-readable projection** of [`docs/ACCEPTED_PARAMETERS.yaml`](../ACCEPTED_PARAMETERS.yaml).
> Any manual edit to this markdown file will be rejected by CI. To modify any parameter, submit an Amendment to `docs/ACCEPTED_PARAMETERS.yaml` and regenerate this document.

---

## 1. PARITY VERIFICATION & DRIFT AUTOMATION

An automated parity audit asserts exact parity between `docs/ACCEPTED_PARAMETERS.yaml`, live TypeScript constants, and this mirror:
```bash
# Automated parity check command (CI Gate)
bun run audit:parameters
```

### Code Fallback Anchors
| Subsystem | Canonical Code Anchor | Verified Anchored Parameters |
|---|---|---|
| Policy Resolver | `packages/scraper/policy-resolver.ts` | `RISK_TIER_POLICIES`, `RegistryComplianceState`, `RegistryOperationalState` |
| Geo Gate | `packages/scraper/geoGate.ts` | `GeoScope`, `PhEligibility`, regex tokens |
| Shadow Dispatcher | `packages/scraper/shadow-dispatcher.ts` | `DISPATCHER_VERSION`, `DEFAULT_MIN_REDISPATCH_MINUTES` (1440), `MAX_DISPATCHES_PER_RUN` (12) |
| Candidate Shadow | `packages/scraper/candidate-shadow.ts` | `SHADOW_MAX_BYTES` (512 KiB), `SHADOW_MAX_REQUESTS` (2), `SHADOW_FETCH_TIMEOUT_MS` (8000) |
| Publication Gateway | `packages/scraper/publication-gateway.ts` | `publishPublicExposure`, `canary_max_new_items_per_tick` clamp |
| Jev Client | `packages/scraper/jev-client.ts` | `JEV_MODEL` (`typesafe/jev-1.13`), `JEV_SYSTEMONE_URL` |

---

## 2. AUTONOMY STATE & PROMOTION CRITERIA

### 2.1 Job Evaluation (Micro Domain)
*Current Production Reality: **L1 (ADVISE)** across all classes.*

| Decision Class | Current Level | Target Level | 30-Day Sustained Req | Max FP Rate | Max FN Rate | Min Audit Coverage | Demotion Trigger (7-day window) |
|---|---|---|---|---|---|---|---|
| `remote_classification` | **L1** | L2 | 30 days | 1.0% | 5.0% | 100% | FP > 2.0% or FN > 8.0% |
| `ph_eligibility` | **L1** | L2 | 30 days | 1.0% | 5.0% | 100% | FP > 2.0% or FN > 8.0% |
| `role_taxonomy` | **L1** | L2 | 30 days | 1.0% | 5.0% | 100% | FP > 2.0% or FN > 8.0% |
| `safety` | **L1** | L2 | 30 days | 0.0% | 0.0% | 100% | Any single false positive/negative |
| `freshness` | **L1** | L2 | 30 days | 1.0% | 5.0% | 100% | FP > 2.0% or FN > 8.0% |
| `duplicate_detection` | **L1** | L2 | 30 days | 1.0% | 5.0% | 100% | FP > 2.0% or FN > 8.0% |
| `publication_eligibility` | **L1** | L2 | 30 days | 0.0% | 1.0% | 100% | Any publication gateway breach |

### 2.2 Job Flow (Macro Domain)
*Current Production Reality: **L1 (ADVISE)** across all classes.*

| Operational Class | Current Level | Target Level | Promotion Requirement | Demotion Trigger |
|---|---|---|---|---|
| `polling_cadence` | **L1** | L2 | 30 days, 0 incidents | 1 incident in 14-day window |
| `budget_allocation` | **L1** | L2 | 30 days, 0 incidents | 1 incident in 14-day window |
| `queue_prioritization` | **L1** | L2 | 30 days, 0 incidents | 1 incident in 14-day window |
| `retention` | **L1** | L2 | 30 days, 0 incidents | 1 incident in 14-day window |
| `source_demotion` | **L1** | L2 | 30 days, 0 incidents | 1 incident in 14-day window |

---

## 3. QUALITY & COMPLIANCE SLAS

| Metric / Parameter | Accepted Bound | Concrete Enforcement Mechanism |
|---|---|---|
| False PH-Eligibility Rate Ceiling | $\le 1.0\%$ | Replay evaluation + offline shadow audit |
| False Remote Classification Rate Ceiling | $\le 0.5\%$ | Replay evaluation + offline shadow audit |
| Broken Apply URL Rate Ceiling | $\le 1.0\%$ | `verify-links` workflow + verifier rotation |
| Duplicate Public Listing Rate Ceiling | $\le 0.5\%$ | D1 `UNIQUE(fingerprint_hash)` + `toContentHash` |
| Unsafe / Fraudulent Opportunity Rate | Strictly **0.0%** | Zero-tolerance instant quarantine + kill switch |
| Employer / Platform Corrections SLA | $< 24\text{ hours}$ | `source_opt_outs` 24h purge pipeline |

---

## 4. RELIABILITY & PIPELINE CAPACITY

| Parameter | Accepted Bound | Concrete Code Anchor / Policy |
|---|---|---|
| Max Sync Backlog Age | $\le 2\text{ hours}$ | Ingestion cron watchdog |
| DB Restore Verification Drill Window | Every 30 days | `scripts/ci/rehearse-d1-migrations.ts` |
| Max Consecutive Failed Ingestion Ticks | 3 ticks | Cloudflare Worker alert + circuit breaker |
| Max Shadow Redispatch Interval | 1,440 minutes (24 hours) | `shadow-dispatcher.ts: DEFAULT_MIN_REDISPATCH_MINUTES` |
| Max Dispatches Per Run | 12 candidates | `shadow-dispatcher.ts: MAX_DISPATCHES_PER_RUN` |
| Shadow Fetch Timeout | 8,000 ms | `candidate-shadow.ts: SHADOW_FETCH_TIMEOUT_MS` |
| Shadow Payload Size Ceiling | 524,288 bytes (512 KiB) | `candidate-shadow.ts: SHADOW_MAX_BYTES` |
| Shadow Max External Requests | 2 requests (robots + candidate) | `candidate-shadow.ts: SHADOW_MAX_REQUESTS` |

---

## 5. SOURCE DIVERSITY & ECONOMICS

| Parameter | Accepted Bound | Rationale / ADR Reference |
|---|---|---|
| Marginal Cost Per Net-New Publication | $\le \$0.05\text{ (5 cents)}$ | D5 economic sustainability |
| D1 Storage Growth Projection Ceiling | $\le 500\text{ MB / quarter}$ | Cloudflare D1 free tier headroom |
| Top Source Concentration Ceiling | $\le 25\%$ | Portfolio resilience against single-source failure |
| Top Provider Family Share Ceiling | $\le 40\%$ | Blast radius bounding (ADR-006 §7) |

---

## 6. FRESHNESS & DEDUPLICATION

| Parameter | Accepted Bound | Behavioral Contract |
|---|---|---|
| Max Days Since Post | 30 days | Excludes stale postings (> 30d) |
| Unknown Post Date Policy | `retain-unknown-do-not-publish` | Unknown source date MUST remain NULL in D1 |
| Exact Merge Confidence | $\ge 0.95$ | Merge into canonical vacancy as sighting |
| Likely Merge Confidence | $\ge 0.80$ | Merge with provenance note |
| Possible Merge Action | `retain-both-flag-ambiguous` | Retain both entities; suppress automated merge |

---

## 7. DECISION THRESHOLDS

| Parameter | Accepted Bound | Operational Scope |
|---|---|---|
| Taxonomy Minimum Confidence | $\ge 0.75$ | Role categorization gate |
| Jev Minimum Confidence Pass | $\ge 0.70$ | Bounded choice acceptance |

---

## 8. ADR-008 RISK TIERS & CANARY CAPS

| Risk Tier | Scope | Min Shadow Days | Canary Max New Items / Tick | Fast-Track Eligible |
|---|---|---|---|---|
| **Tier A** | Direct Structured ATS APIs (`greenhouse`, `lever`, `ashby`, `breezy`, `workable:global`) | 3 days | **10** | **YES** |
| **Tier B** | Variable & Partner APIs (`jobicy`, syndication feeds) | 7 days | **5** | **NO** |
| **Tier C** | DOM / HTML Scraping Surfaces | 14 days | **2** | **NO** |

---

## 9. DATA RETENTION POLICIES

| Storage Tier / Table | Retention TTL | Enforcement Mechanism |
|---|---|---|
| Raw Observation Payloads (`lake_raw_observations`) | 14 days | Scheduled lake pruning script |
| Normalized Staged Candidates (`lake_candidate_jobs`) | 90 days | Scheduled lake pruning script |
| Reviewer Decision History (`source_decisions`) | **Durable (Permanent)** | Append-only SQLite table |
| Autonomy Decision Audit Trails | **Durable (Permanent)** | Append-only lake audit records |
| Lifecycle Transition Events (`source_transition_events`) | **Durable (Permanent)** | Append-only migration 0039 table |
| Audit Sampling Rate: Remote Classification | 10% stratified | High volume steady state sampling |
| Audit Sampling Rate: PH Eligibility | 100% full retention | High consequence safety gate |
| Audit Sampling Rate: Safety & Scam Screening | 100% full retention | Zero-tolerance safety gate |
| Audit Sampling Rate: Publication Eligibility | 100% full retention | Publication gateway ledger |

---

## 10. DAILY OPERATIONAL BUDGETS

| Budget Item | Accepted Ceiling | Enforcement Mechanism |
|---|---|---|
| External Requests Per Source Per Day | $\le 200\text{ requests}$ | Scraper loop counter |
| AI / Jev Calls Per Day | $\le 500\text{ calls}$ | Inline triage counter & daily budget |
| Storage Writes Per Day | $\le 50,000\text{ writes}$ | D1 daily write monitoring |
| Rate-Limit Backoff Minimum | 3,000 ms with exponential jitter | `packages/scraper/shadow-dispatcher.ts` |

---

## 11. MULTI-AGENT CONCURRENCY & ESCALATION SLAS

| Parameter | Accepted Value | Operational Effect |
|---|---|---|
| Max Concurrency Lease Duration | 120 minutes (2 hours) | Auto-expires in `docs/SYSTEM_SAVEPOINT.md` |
| Rolling Session Window for Audit | 14 sessions | Governs 70/30 time budget compliance |
| SEV-1 (Critical Safety / Legal) Response SLA | $\le 1\text{ hour}$ | Immediate halt; fail closed |
| SEV-2 (Authority Breach / Data Corruption) SLA | $\le 4\text{ hours}$ | Halt pipeline; isolated work continues |
| SEV-3 (Supply Bottleneck / Quality Drift) SLA | $\le 24\text{ hours}$ | Source quarantined; ingestion continues |
| SEV-4 (Architecture Over-Budget) SLA | $\le 72\text{ hours}$ | Architecture paused; operational continues |

---

## 12. ARCHITECTURAL & RUNTIME BOUNDS

| Parameter | Accepted Bound | Operational Constraint |
|---|---|---|
| Operational Session Share (70/30 Rule) | $\ge 70\%$ of sessions | Rollback/pause architecture if $< 70\%$ |
| Phase Abandonment Trigger | 14 consecutive days | Terminate stalled architecture experiments |
| Cloudflare WASM Max Uncompressed Size | 1,048,576 bytes (1 MiB) | Hard V8 isolate deployment bound |
| Cloudflare Worker Memory Limit | 128 MB | Memory limit for stream/HTML parsing |

---

## 13. OPEN QUESTIONS REGISTER (`<UNSET>` PARAMETERS)

The following parameters have no authoritative baseline in live code or accepted ADRs and are marked `<UNSET>` awaiting owner determination:

| Parameter Key | Current Status | Proposed Value | Owner Action Needed |
|---|---|---|---|
| `automated_opt_out_cron_interval_hours` | `<UNSET>` | 6 hours | Confirm automated purge cron frequency |
| `database_backup_retention_days` | `<UNSET>` | 30 days | Verify Cloudflare D1 automated backup tier |
| `monthly_hard_cost_cap_usd` | `<UNSET>` | $25.00 / month | Set hard budget ceiling for all infra APIs |
