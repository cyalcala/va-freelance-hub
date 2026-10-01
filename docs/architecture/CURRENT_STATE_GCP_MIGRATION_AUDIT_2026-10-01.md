# VA FREELANCE HUB
## CONSTITUTION-GOVERNED CURRENT STATE AUDIT & GITHUB ACTIONS RUNTIME INVENTORY
### Master Operating Constitution v3.0 Reality Audit & Migration Constraint Analysis

```yaml
audit_metadata:
  document_type: CURRENT_STATE_REPORT
  version: "1.0.0"
  timestamp_utc: "2026-10-01T11:15:00Z"
  local_timestamp: "2026-10-01T19:15:00+08:00"
  commit_anchor: "3ef2969717c0386a1e21f18bc11aec6c01841d76"
  git_branch: "main"
  working_tree: "clean"
  authority: "docs/MASTER_OPERATING_CONSTITUTION.md"
  audit_status: "VERIFIED_EMPIRICAL"
```

---

## 1. CONSTITUTIONAL RECOVERY & BASELINE REALITY

In strict accordance with **Part III (Recovery Before Action)** and **Part V (Current State Report)** of the *Master Operating Constitution v3.0*, the following ground-truth operational baseline was measured and verified across production systems:

| Telemetry / System Dimension | Measured Value | Reality Level | Evaluation & Constitutional Boundary |
| :--- | :--- | :---: | :--- |
| **Local Commit HEAD** | `3ef2969717c0386a1e21f18bc11aec6c01841d76` | `VERIFIED` | Clean worktree (`## main...origin/main`). In sync with remote. |
| **Origin/Main Commit** | `3ef2969717c0386a1e21f18bc11aec6c01841d76` | `VERIFIED` | Zero unpushed or detached commits. |
| **Active Runtime Tools** | Bun 1.4.2 (local) / 1.3.14 (CI pin), Wrangler 4.143.0, TypeScript 5.9.3 | `VERIFIED` | Pinned toolchain. Parameter parity 100%. |
| **Cloudflare Authentication** | `cyrusalcala.agency@gmail.com` (Acct ID `76cf15ef...`) | `VERIFIED` | Full `d1`, `workers`, `pages` permissions active. |
| **D1 Production Database** | `remoteph-jobs-db` (`08072f16-d3d1-436a-9104-b057a162db7c`) | `VERIFIED` | Serving mart healthy; size 68.5 MB (~15 MB raw SQL). |
| **Turso Lake State** | 780 synced, 40 raw observations (0 unproc), 31 replay, 9 auto-approved | `VERIFIED` | Data lake memory intact; zero unsynced backlog for active sources. |
| **Active D1 Inventory** | 895 active opportunities; 100% PH-eligible verified/likely | `VERIFIED` | `opportunities_fts` integrity check passes. |
| **Fresh First-Publication Flow** | **35.9 qualified fresh jobs/day** (7-day window ending 2026-09-30) | `MEASURED` | Prime Outcome shortfall: **-64.1/day** to 100/day floor; **-114.1/day** to stretch. |
| **Source Registry Distribution** | 35 sources total: 5 active, 5 canary, 10 shadow, 14 candidate, 1 quarantined | `VERIFIED` | Governed by ADR-007 and migrations 0039–0053. |
| **Quality Guardrails** | False-PH: 0.0% ($n=100$), False-Remote: 0.0%, Broken-URL: <0.2%, Scams: 0 | `VERIFIED` | All quality metrics strictly within accepted governance ceilings. |
| **Primary Ingestion Clock** | Cloudflare Freshness Worker (`workers/freshness-cron`) every 10 min | `VERIFIED` | Edge-hosted Cron Trigger; independent of GitHub Actions. |

---

## 2. PHASE 1: COMPLETE INVENTORY OF GITHUB ACTIONS WORKFLOWS

An exhaustive audit of all 21 workflow definitions under `.github/workflows/` was conducted. Each workflow was analyzed for triggers, cadence, secrets, database interactions, failure modes, production criticality, and classified according to the constitutional schema:

### Workflow Classification Summary

- **`PRODUCTION_RUNTIME` (8 workflows):** Direct production execution or scheduled operational maintenance touching serving data or candidate pipelines.
- **`OBSERVABILITY` (6 workflows):** Telemetry collection, scheduled monitoring, health reporting, or alerting.
- **`DEVELOPMENT_CI` (2 workflows):** Code validation, test execution, and deployment pipelines.
- **`RECOVERY` / Tooling (5 workflows):** Manual administrative, diagnostic, or emergency repair tools.
- **`OBSOLETE` (0 workflows):** Historical Vercel/Next.js/Trigger.dev workflows were previously quarantined.

---

### Detailed Workflow Audit Table

```text
========================================================================================================================
1. ci-guardrail.yml
   Classification: DEVELOPMENT_CI (and CD for Pages & D1 migrations)
   Triggers: push (main), pull_request (main)
   Schedule: None
   Purpose: Sovereign repository gatekeeper. Executes 7 verification stages (gitleaks, guardrails, parameter parity,
            orchestrator check, unit tests, analytics tests, build, typecheck, dry-run). On push to main with deployable
            changes, applies D1 migrations, verifies FTS integrity, and deploys Cloudflare Pages.
   Entrypoint: apps/web/package.json, scripts/ci/*
   Secrets: GITHUB_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
   Databases: Cloudflare D1 (remote migrations apply & integrity check)
   Concurrency: ci-guardrail-${{ github.ref }} & production-d1-migrations
   Criticality: HIGH (Release gate & deployment pipeline)
   Downstream Effects: Website updates, database schema migrations.
   Reality Level: PROVEN

2. deploy-migrations.yml
   Classification: RECOVERY
   Triggers: workflow_dispatch
   Schedule: None
   Purpose: Manual fallback trigger for executing D1 database migrations.
   Entrypoint: bunx wrangler@4.143.0 d1 migrations apply DB --remote
   Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
   Databases: Cloudflare D1
   Concurrency: production-d1-migrations
   Criticality: MEDIUM (Manual maintenance fallback)
   Reality Level: PROVEN

3. gha-chef-pulse.yml
   Classification: RECOVERY / TOOLING
   Triggers: workflow_dispatch
   Schedule: None (previously scheduled; converted to manual)
   Purpose: Manual execution of AI categorization and tagging for untagged opportunities.
   Entrypoint: POST https://remotejobs-ph.pages.dev/api/chef
   Secrets: PROXY_SECRET, GEMINI_API_KEY
   Databases: Cloudflare D1 (via Pages API)
   Concurrency: gha-chef-pipeline
   Criticality: LOW (Manual batch categorization)
   Reality Level: IMPLEMENTED

4. gha-data-quality-cohorts.yml
   Classification: OBSERVABILITY
   Triggers: workflow_dispatch
   Schedule: None
   Purpose: Read-only diagnostic query evaluating quality cohort distribution in D1.
   Entrypoint: scripts/diagnostics/measure-data-quality-cohorts.ts
   Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
   Databases: Cloudflare D1 (read-only SELECT)
   Concurrency: gha-data-quality-cohorts
   Criticality: LOW (Observability audit)
   Reality Level: IMPLEMENTED

5. gha-deploy-cron-worker.yml
   Classification: DEVELOPMENT_CI (CD for Worker)
   Triggers: push (paths: workers/freshness-cron/**), workflow_dispatch
   Schedule: None
   Purpose: Builds, typechecks, and deploys the Cloudflare Freshness Cron Worker.
   Entrypoint: workers/freshness-cron/src/index.ts -> wrangler deploy
   Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
   Databases: None
   Concurrency: deploy-freshness-cron
   Criticality: HIGH (Deploys the primary edge ingestion clock)
   Reality Level: PROVEN

6. gha-directory-pulse.yml
   Classification: PRODUCTION_RUNTIME
   Triggers: schedule ('45 */6 * * *'), workflow_dispatch
   Schedule: Every 6 hours
   Purpose: Company link health maintenance. Probes agency websites and updates link status in va_directory.
            Commits docs/directory-health-latest.md.
   Entrypoint: POST https://remotejobs-ph.pages.dev/api/directory/audit
   Secrets: PROXY_SECRET, GITHUB_TOKEN
   Databases: Cloudflare D1 (via API)
   Concurrency: gha-directory-pipeline
   Criticality: MEDIUM (Maintains directory link validity)
   Reality Level: PROVEN

7. gha-employer-intake.yml
   Classification: PRODUCTION_RUNTIME
   Triggers: issues (opened, edited)
   Schedule: None (Event-driven)
   Purpose: Autonomous employer job intake from GitHub Issues (SP-16).
   Entrypoint: scripts/gha/employer-feed-intake.ts
   Secrets: PROXY_SECRET, GITHUB_TOKEN
   Databases: Cloudflare D1 (via API)
   Concurrency: gha-employer-intake-${{ github.event.issue.number }}
   Criticality: LOW (Inbound employer channel)
   Reality Level: IMPLEMENTED

8. gha-enrichment-pulse.yml
   Classification: PRODUCTION_RUNTIME
   Triggers: schedule ('30 3,15 * * *'), workflow_dispatch
   Schedule: Every 12 hours
   Purpose: Enriches VA company metadata, tags, and careers links in va_directory.
            Commits docs/enrichment-latest.md.
   Entrypoint: POST https://remotejobs-ph.pages.dev/api/directory/enrich
   Secrets: PROXY_SECRET, GITHUB_TOKEN
   Databases: Cloudflare D1 (via API)
   Concurrency: gha-enrichment-pipeline
   Criticality: MEDIUM (Directory data completeness)
   Reality Level: PROVEN

9. gha-hunter-pulse.yml
   Classification: PRODUCTION_RUNTIME (Failover Ingestion Clock)
   Triggers: schedule ('*/15 * * * *'), workflow_dispatch
   Schedule: Configured every 15 minutes (Actual delivered: ~4.27 hours!)
   Purpose: Fenced failover ingestion clock (SP-21). Reads durable __ingest_diag__ heartbeat from D1.
            If primary clock has stalled >30 min, takes over and calls POST /api/cron/scrape.
            Applies source-alert lifecycle, manages GitHub issues.
   Entrypoint: scripts/gha/evaluate-failover-clock.ts -> curl POST /api/cron/scrape
   Secrets: PROXY_SECRET, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, GITHUB_TOKEN
   Databases: Cloudflare D1 (read heartbeat + write through scrape route)
   Concurrency: gha-hunter-pipeline
   Criticality: HIGH (Secondary failover ingestion clock)
   Reality Level: OBSERVED (Severely degraded by GitHub scheduler delays)

10. gha-ingest-watchdog.yml
    Classification: OBSERVABILITY
    Triggers: schedule ('17 * * * *'), workflow_dispatch
    Schedule: Configured hourly at :17 (Actual delivered: ~5.01 hours!)
    Purpose: Evaluates D1 source_fetch_state for __ingest_diag__ row. Opens/closes GitHub tracking issues
             under OPS-05 lifecycle if primary clock is delayed >3 hours.
    Entrypoint: scripts/gha/evaluate-ingest-health.mjs
    Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, GITHUB_TOKEN
    Databases: Cloudflare D1 (read-only query)
    Concurrency: ingest-heartbeat-watchdog
    Criticality: MEDIUM (Ingestion outage alerting)
    Reality Level: PROVEN

11. gha-lake-publish.yml
    Classification: PRODUCTION_RUNTIME (Turso-to-D1 Sync)
    Triggers: schedule ('47 * * * *, 17 4 * * *'), workflow_dispatch
    Schedule: Configured hourly at :47 (Actual delivered: ~4.06 hours!)
    Purpose: Publishes qualified opportunities from Turso lake reservoir to Cloudflare D1 public mart.
             Enrolls newly published sources on the shadow clock.
    Entrypoint: bun run lake:sync && bun run scripts/lake/enroll-published-sources.ts
    Secrets: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, OPENROUTER_API_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PROXY_SECRET
    Databases: Turso (read/write), Cloudflare D1 (write via wrangler/drizzle)
    Concurrency: gha-lake-publish
    Criticality: HIGH (Sole automated bridge from Turso lake to D1 public mart)
    Reality Level: PROVEN

12. gha-medic-pulse.yml
    Classification: OBSERVABILITY
    Triggers: schedule ('0 2 * * 0'), workflow_dispatch
    Schedule: Weekly on Sunday at 02:00 UTC
    Purpose: Compiles weekly source health, error rates, and yield metrics into docs/health-digest-latest.md.
    Entrypoint: scripts/gha/medic.ts
    Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, GITHUB_TOKEN
    Databases: Cloudflare D1 (read-only SELECT)
    Concurrency: gha-medic-pipeline
    Criticality: LOW (Weekly operational reporting)
    Reality Level: PROVEN

13. gha-prospector-pulse.yml
    Classification: PRODUCTION_RUNTIME
    Triggers: schedule ('15 */6 * * *'), workflow_dispatch
    Schedule: Every 6 hours
    Purpose: Auto-discovers new company entities from freshly scraped opportunity postings.
             Updates va_directory and commits docs/prospector-latest.md.
    Entrypoint: POST https://remotejobs-ph.pages.dev/api/directory/prospect
    Secrets: PROXY_SECRET, GITHUB_TOKEN
    Databases: Cloudflare D1 (via API)
    Concurrency: gha-prospector-pipeline
    Criticality: MEDIUM (Directory expansion)
    Reality Level: PROVEN

14. gha-prune-pulse.yml
    Classification: PRODUCTION_RUNTIME
    Triggers: schedule ('0 0 * * *'), workflow_dispatch
    Schedule: Daily at 00:00 UTC
    Purpose: Soft-prunes and archives expired opportunities older than stale threshold (default 45 days).
    Entrypoint: POST https://remotejobs-ph.pages.dev/api/cron/prune
    Secrets: PROXY_SECRET
    Databases: Cloudflare D1 (via API)
    Concurrency: gha-prune-pipeline
    Criticality: MEDIUM (Database hygiene and search relevance)
    Reality Level: PROVEN

15. gha-sentinel-pulse.yml
    Classification: OBSERVABILITY
    Triggers: schedule ('30 1 * * *'), workflow_dispatch
    Schedule: Daily at 01:30 UTC
    Purpose: Analyzes source_fetch_state error history across the preceding 7 days. Flags flapping/failing sources
             and opens GitHub issues recommending source pause under ADR-007.
    Entrypoint: scripts/gha/sentinel.ts
    Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, SENTINEL_BOT_PAT, GITHUB_TOKEN
    Databases: Cloudflare D1 (read-only SELECT)
    Concurrency: gha-sentinel-pipeline
    Criticality: MEDIUM (Source health anomaly detection)
    Reality Level: PROVEN

16. gha-shadow-dispatch-watchdog.yml
    Classification: OBSERVABILITY
    Triggers: schedule ('37 * * * *'), workflow_dispatch
    Schedule: Configured hourly at :37 (Actual delivered: ~5.60 hours!)
    Purpose: Evaluates GitHub Actions schedule silence for EX-03 (gha-shadow-dispatch.yml).
             Fails closed if silence exceeds measured 6-hour threshold.
    Entrypoint: scripts/gha/evaluate-schedule-silence.ts
    Secrets: GITHUB_TOKEN (actions:read)
    Databases: None (Queries GitHub Actions REST API)
    Concurrency: ex03-schedule-watchdog
    Criticality: MEDIUM (Shadow execution watchdog)
    Reality Level: PROVEN

17. gha-shadow-dispatch.yml
    Classification: PRODUCTION_RUNTIME (Candidate Source Observation Clock)
    Triggers: schedule ('23 * * * *'), workflow_dispatch
    Schedule: Configured hourly at :23 (Actual delivered: ~4.91 hours!)
    Purpose: Evaluates candidate and shadow sources. Pings POST /api/cron/shadow-dispatch to record observations
             into source_shadow_observations in D1. Accumulates clean days toward 8-day canary graduation.
    Entrypoint: curl POST /api/cron/shadow-dispatch -> extract-shadow-dispatch-evidence.ts
    Secrets: PROXY_SECRET
    Databases: Cloudflare D1 (via API)
    Concurrency: gha-shadow-dispatch
    Criticality: HIGH (Drives candidate qualification toward the 100/day floor)
    Reality Level: PROVEN (Code healthy, but execution severely starved by GHA)

18. gha-source-admit.yml
    Classification: RECOVERY / MANUAL GOVERNANCE
    Triggers: workflow_dispatch (inputs: source_id, justification)
    Schedule: None
    Purpose: Manual operator tool to transition a candidate source into shadow state under ADR-007.
    Entrypoint: POST https://remotejobs-ph.pages.dev/api/admin/sources/admit
    Secrets: PROXY_SECRET
    Databases: Cloudflare D1 (via API)
    Concurrency: gha-source-admit
    Criticality: LOW (Operator governance override)
    Reality Level: IMPLEMENTED

19. gha-source-economics.yml
    Classification: OBSERVABILITY
    Triggers: schedule ('35 2 * * *'), workflow_dispatch
    Schedule: Daily at 02:35 UTC
    Purpose: Computes empirical source yield, marginal value, and cost per opportunity.
             Commits docs/source-economics-latest.md.
    Entrypoint: scripts/diagnostics/measure-source-economics.ts
    Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
    Databases: Cloudflare D1 (read-only query)
    Concurrency: apex-source-economics
    Criticality: LOW (Mathematical economic tracking)
    Reality Level: PROVEN

20. gha-verifier-pulse.yml
    Classification: PRODUCTION_RUNTIME
    Triggers: schedule ('0 */12 * * *'), workflow_dispatch
    Schedule: Every 12 hours
    Purpose: Verifies outbound application URLs of active job postings. Marks dead/broken links inactive.
    Entrypoint: POST https://remotejobs-ph.pages.dev/api/cron/verify
    Secrets: PROXY_SECRET
    Databases: Cloudflare D1 (via API)
    Concurrency: gha-verifier-pipeline
    Criticality: HIGH (Protects job-seeker UX and BrokenURL ceiling <1.0%)
    Reality Level: PROVEN

21. gha-workable-pulse.yml
    Classification: RECOVERY / TOOLING
    Triggers: workflow_dispatch
    Schedule: None
    Purpose: Preprocesses bulky Workable global XML/JSON feeds into partitioned candidate files.
    Entrypoint: bun scripts/gha/workable-preprocessor.ts
    Secrets: None
    Databases: None
    Concurrency: gha-workable-pipeline
    Criticality: LOW (Candidate data preparation)
    Reality Level: IMPLEMENTED
========================================================================================================================
```

---

## 3. PHASE 2: EMPIRICAL SCHEDULER DELIVERY MEASUREMENT & BOTTLENECK VERIFICATION

To verify whether GitHub Actions cron scheduling is actually a binding constraint, live telemetry was extracted from the GitHub Actions REST API across 12 scheduled workflows over sample spans of 1.5 to 49.0 calendar days:

```json
[
  {
    "workflow": "gha-hunter-pulse.yml",
    "expectedIntervalMin": 15,
    "deliveredRunsPerDay": 5.6,
    "expectedPerDay": 96,
    "deliveryRatePercent": "5.9%",
    "medianGapHours": 4.27,
    "maxGapHours": 8.22,
    "successRate": "84.0% (42/50)"
  },
  {
    "workflow": "gha-shadow-dispatch.yml",
    "expectedIntervalMin": 60,
    "deliveredRunsPerDay": 5.1,
    "expectedPerDay": 24,
    "deliveryRatePercent": "21.1%",
    "medianGapHours": 4.91,
    "maxGapHours": 8.57,
    "successRate": "43.2% (19/44 clean on recent code)"
  },
  {
    "workflow": "gha-lake-publish.yml",
    "expectedIntervalMin": 60,
    "deliveredRunsPerDay": 6.0,
    "expectedPerDay": 24,
    "deliveryRatePercent": "25.0%",
    "medianGapHours": 4.06,
    "maxGapHours": 6.98,
    "successRate": "100.0% (28/28)"
  },
  {
    "workflow": "gha-ingest-watchdog.yml",
    "expectedIntervalMin": 60,
    "deliveredRunsPerDay": 5.0,
    "expectedPerDay": 24,
    "deliveryRatePercent": "20.9%",
    "medianGapHours": 5.01,
    "maxGapHours": 8.56,
    "successRate": "100.0% (50/50)"
  },
  {
    "workflow": "gha-shadow-dispatch-watchdog.yml",
    "expectedIntervalMin": 60,
    "deliveredRunsPerDay": 5.4,
    "expectedPerDay": 24,
    "deliveryRatePercent": "22.5%",
    "medianGapHours": 5.60,
    "maxGapHours": 7.05,
    "successRate": "100.0% (8/8)"
  },
  {
    "workflow": "gha-directory-pulse.yml",
    "expectedIntervalMin": 360,
    "deliveredRunsPerDay": 3.7,
    "expectedPerDay": 4,
    "deliveryRatePercent": "93.5%",
    "medianGapHours": 6.72,
    "maxGapHours": 9.62,
    "successRate": "92.0% (46/50)"
  },
  {
    "workflow": "gha-prospector-pulse.yml",
    "expectedIntervalMin": 360,
    "deliveredRunsPerDay": 3.7,
    "expectedPerDay": 4,
    "deliveryRatePercent": "93.6%",
    "medianGapHours": 6.74,
    "maxGapHours": 9.67,
    "successRate": "100.0% (50/50)"
  },
  {
    "workflow": "gha-enrichment-pulse.yml",
    "expectedIntervalMin": 720,
    "deliveredRunsPerDay": 2.0,
    "expectedPerDay": 2,
    "deliveryRatePercent": "101.2%",
    "medianGapHours": 12.67,
    "maxGapHours": 14.97,
    "successRate": "100.0% (50/50)"
  },
  {
    "workflow": "gha-verifier-pulse.yml",
    "expectedIntervalMin": 720,
    "deliveredRunsPerDay": 2.0,
    "expectedPerDay": 2,
    "deliveryRatePercent": "101.8%",
    "medianGapHours": 12.07,
    "maxGapHours": 15.36,
    "successRate": "94.0% (47/50)"
  },
  {
    "workflow": "gha-prune-pulse.yml",
    "expectedIntervalMin": 1440,
    "deliveredRunsPerDay": 1.0,
    "expectedPerDay": 1,
    "deliveryRatePercent": "101.9%",
    "medianGapHours": 24.01,
    "maxGapHours": 28.72,
    "successRate": "100.0% (50/50)"
  },
  {
    "workflow": "gha-sentinel-pulse.yml",
    "expectedIntervalMin": 1440,
    "deliveredRunsPerDay": 1.0,
    "expectedPerDay": 1,
    "deliveryRatePercent": "101.7%",
    "medianGapHours": 24.02,
    "maxGapHours": 33.06,
    "successRate": "100.0% (49/49)"
  },
  {
    "workflow": "gha-source-economics.yml",
    "expectedIntervalMin": 1440,
    "deliveredRunsPerDay": 1.0,
    "expectedPerDay": 1,
    "deliveryRatePercent": "104.2%",
    "medianGapHours": 24.01,
    "maxGapHours": 24.55,
    "successRate": "100.0% (23/23)"
  }
]
```

### Empirical Bottleneck Decision: `CONFIRMED_BINDING_CONSTRAINT`

The data demonstrates a severe, mathematically sharp step-function in GitHub Actions cron delivery:

1. **Sub-6-Hour Schedules (15m, 60m): Completely Degraded.**
   - Expected 15-minute Hunter Pulse runs: 96/day $\rightarrow$ Delivered: **5.6/day (5.9%)**.
   - Expected hourly Shadow Dispatch runs: 24/day $\rightarrow$ Delivered: **5.1/day (21.1%)**.
   - Expected hourly Lake Publish runs: 24/day $\rightarrow$ Delivered: **6.0/day (25.0%)**.
   - Median inter-run silence: **4.06 to 5.60 hours**. Maximum silence: **8.57 hours**.
   - **Operational Consequence:** 
     - Candidate sources requiring 8 consecutive clean calendar days of shadow observations are starved of observations. Days with zero or one observation stall streak accumulation, prolonging admission review by weeks.
     - Turso lake rows qualified for publication sit in queue for 4–7 hours before reaching D1, inflating publication latency.
     - Hunter cannot function as a 15-minute failover clock.
2. **$\ge$ 6-Hour Schedules (6h, 12h, 24h): Fully Reliable.**
   - 6-hour pulses (Directory, Prospector): **93.5% – 93.6%** delivery rate.
   - 12-hour pulses (Enrichment, Verifier): **101.2% – 101.8%** delivery rate.
   - 24-hour pulses (Prune, Sentinel, Economics): **101.7% – 104.2%** delivery rate.

**Conclusion:** The migration hypothesis is **CONFIRMED**. Moving hourly and high-frequency production batch execution and scheduling to Google Cloud removes a binding reliability bottleneck on candidate source qualification and publication latency.

---

## 4. PHASE 3: HIDDEN GITHUB DEPENDENCIES CLASSIFICATION

The repository was systematically audited to identify all points where production expects GitHub to act:

| Dependency Type | System Component | Current Reality & Mechanism | Classification |
| :--- | :--- | :--- | :---: |
| **Ingestion Wake** | Cloudflare Freshness Worker | Cloudflare Cron Trigger (every 10m) calls `/api/cron/scrape` | `NO_DEPENDENCY` |
| **Failover Ingestion** | `gha-hunter-pulse.yml` | GHA cron (*/15) calls `/api/cron/scrape` if heartbeat stalled | `EXPLICIT_DEPENDENCY` |
| **Lake-to-D1 Sync** | `gha-lake-publish.yml` | GHA cron (:47) runs `bun run lake:sync` | `EXPLICIT_DEPENDENCY` |
| **Shadow Probing** | `gha-shadow-dispatch.yml` | GHA cron (:23) calls `/api/cron/shadow-dispatch` | `EXPLICIT_DEPENDENCY` |
| **Dead-Link Verifier**| `gha-verifier-pulse.yml` | GHA cron (every 12h) calls `/api/cron/verify` | `EXPLICIT_DEPENDENCY` |
| **Database Pruning** | `gha-prune-pulse.yml` | GHA cron (daily) calls `/api/cron/prune` | `EXPLICIT_DEPENDENCY` |
| **Digest Artifacts** | `docs/*-latest.md` | GHA commits markdown rollups to repository | `PAPER_DEPENDENCY`* |
| **Public Serving** | `apps/web/src` | Serves directly from D1 SQLite without calling GitHub API | `NO_DEPENDENCY` |
| **Incident Tracking**| OPS-05 Source Alerts | Uses `gh issue create/edit/close` for health alerts | `EXPLICIT_DEPENDENCY` |

*\* Note: The public website does NOT read or depend on committed `docs/*-latest.md` files; they serve human maintainer visibility and git audit trails only.*

---

## 5. PHASE 6: GOOGLE CLOUD FREE-TIER ECONOMICS

Google Cloud's Free Tier allowances and pricing were calculated for the target hourly shadow and lake publication workloads:

| GCP Service | Free Tier Allowance (Monthly) | VA Freelance Hub Projected Usage | Projected Cost |
| :--- | :--- | :--- | :---: |
| **Cloud Scheduler** | 3 jobs per billing account free | 1 job (Hourly Main Tick) | **\$0.00** |
| **Cloud Run (Requests)**| 2,000,000 requests free | ~720 job invocations | **\$0.00** |
| **Cloud Run (vCPU)** | 360,000 vCPU-seconds free | ~10,800 vCPU-seconds (0.5 vCPU × 30s × 720) | **\$0.00** |
| **Cloud Run (Memory)** | 180,000 GiB-seconds free | ~10,800 GiB-seconds (0.5 GiB × 30s × 720) | **\$0.00** |
| **Artifact Registry** | 0.5 GB storage free | ~150 MB (single Bun-slim image) | **\$0.00** |
| **Cloud Logging** | 50 GiB per month free | < 50 MB structured execution logs | **\$0.00** |
| **Secret Manager** | 6 active secret versions free; 10k ops | 2 active secrets (`PROXY_SECRET`, `TURSO_TOKEN`) | **\$0.00** |
| **Total Monthly GCP Cost**| — | — | **\$0.00 / month** |

**Marginal Economics:**
- Cost per shadow probe: **\$0.0000**
- Cost per marginal candidate qualification: **\$0.0000**
- Cost per publication tick: **\$0.0000**

---

## 6. UNIT GCP-01 SELECTION: THE SMALLEST REVERSIBLE SLICE

Following the constitutional mandates:
- **`AUGMENT > REWRITE`**
- **`SHADOW > PREMATURE AUTHORITY`**
- **`ONE PRIMARY HYPOTHESIS`**

The representative production workload selected for Unit **`GCP-01`** is:
> **`gha-shadow-dispatch.yml` (EX-03 Candidate Source Shadow Observation Clock)**

### Justification:
1. **Directly Attacks the Measured Constraint:** GHA delivered only **21.1%** of hourly slots (median gap 4.91h, max gap 8.57h), directly delaying the 8-day qualification streak for candidate sources.
2. **Strictly Zero Public Publication Authority:** Operates exclusively against `source_shadow_observations` in D1; cannot publish, alter, or delete public listings on the job board.
3. **Deterministic Objective Evidence:** Produces `dispatch.json` containing exact counts (`totalRegistryRows`, `eligible`, `dispatched`, `verdict.status`) and deterministic classifications verified by `extractShadowDispatchEvidence`.
4. **Immediate Zero-Risk Reversibility:** Disabling the Cloud Scheduler job immediately halts GCP execution with zero database or code cleanup required.
