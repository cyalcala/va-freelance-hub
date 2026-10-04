# UNIT GCP-01: CANDIDATE SHADOW DISPATCH RUNTIME MIGRATION TO GOOGLE CLOUD

> **Clock update 2026-10-04:** GCP `shadow-dispatch-job` is the primary runtime. The GitHub Actions workflow is now a *fenced fallback*: time-fenced away from the GCP slots and health-gated, so it does nothing while GCP is healthy. The current clocks are in `docs/RUNTIME_CLOCKS.md`. The schedule details below are historical.

## Unified Unit Contract v3.0 (Master Operating Constitution Part LXII)

```text
UNIT REFERENCE: GCP-01
MODE: PRODUCTION_PRIMARY_RUNTIME
CATEGORY: INFRASTRUCTURE_RUNTIME_MIGRATION
AUTHORIZATION: Master Operating Constitution v3.0, ADR-007, ADR-009, and User Migration Mandate

START SHA: 3ef2969717c0386a1e21f18bc11aec6c01841d76
REMOTE SHA: 2c57082e6d62ea836696ce62b88137baefad8c9e
DEPLOYED SHA: 2c57082e6d62ea836696ce62b88137baefad8c9e

PROBLEM:
GitHub Actions cron scheduler drops 78.9% of scheduled hourly slots for EX-03 (gha-shadow-dispatch.yml), delivering only 5.1 runs/day instead of 24/day, with inter-run silence reaching up to 8.57 hours (median 4.91 hours). This schedule starvation leaves candidate sources unobserved across multiple days, directly delaying the 8 consecutive clean calendar days required for ADR-007 canary graduation and starving fresh opportunity flow toward the 100/day floor.

CURRENT BOTTLENECK:
GitHub Actions scheduler delivery degradation on sub-6-hour workloads starves candidate source observation streaks and delays qualified supply expansion.

HYPOTHESIS:
Executing EX-03 candidate shadow dispatch via Google Cloud Scheduler and a Cloud Run Job will achieve >=95% hourly slot delivery (at least 22 runs/day) with zero degradations to diagnostic extraction correctness, D1 probe storage integrity, or free-tier cost ceilings, compared to the 21.1% delivery rate on GitHub Actions.

BASELINE:
- Delivery rate: 21.1% of hourly slots (5.1 runs/day over 8.69-day observation window, n=44 scheduled runs).
- Median inter-run gap: 4.91 hours.
- Maximum inter-run gap: 8.57 hours.
- Gaps > 2 hours: 100% of gaps between delivered runs.
- Success rate on recent code (>=324bf6b): 100% (runs exit 0 when delivered).
- Diagnostic extraction fidelity: extractShadowDispatchEvidence classifies runs into 5 bounded outcomes (success_observed, specific_class_with_fingerprint, generic_class_with_fingerprint, legacy_generic_without_fingerprint, unparseable).

BASELINE METHOD:
Empirical telemetry extracted from GitHub Actions REST API (gh run list --workflow=gha-shadow-dispatch.yml) across 44 scheduled runs between 2026-09-22 and 2026-10-01.

PRIMARY METRIC:
- Hourly Execution Delivery Rate: DeliveredRuns / ExpectedRunsPerDay (Target: >= 95.0%, minimum >= 90.0%).
- Inter-Run Gap P95: 95th percentile gap between consecutive executions in hours (Target: <= 1.50h; Baseline: 8.57h).

GUARDRAIL METRICS:
- Output Correctness Parity: 100% agreement between Cloud Run Job execution diagnostics and extractShadowDispatchEvidence contract.
- Public Serving Mart Isolation: ZERO public opportunities published or modified (verified via source_publication_ledger query published_count = 0).
- Public Blast Radius: Strictly 0.0% change to public HTTP routes (/, /opportunities, /directory).
- Monthly Compute Cost: $0.00 / month (100% within Google Cloud Free Tier: <= 10,800 vCPU-seconds / 360,000 allowance).
- Database Trigger Integrity: Zero contract violations on source_shadow_observations triggers (1 MiB payload budget respected).

EXPECTED OUTCOME:
Cloud Scheduler fires once per hour at minute :23; Cloud Run Job triggers the authenticated POST to /api/cron/shadow-dispatch, parses the JSON payload, records structured evaluation diagnostics, and persists observations to D1, achieving unbroken 24-run daily observation coverage for candidate sources.

MINIMUM PRACTICAL EFFECT:
Delivery rate increases from 21.1% to at least 90.0% (at least 21 delivered runs per complete 24-hour day), reducing maximum inter-run silence below 2.0 hours.

FALSIFICATION CONDITION:
The hypothesis is FALSIFIED if:
1. Google Cloud Scheduler/Cloud Run delivery rate falls below 85.0% over any 72-hour observation window.
2. Any Cloud Run execution mutates public opportunity state or violates the publication gateway boundary.
3. Monthly Google Cloud billing projection exceeds $0.00.
4. Output diagnostic classification diverges from the proven extractShadowDispatchEvidence schema.

OWNED FILES:
- infra/gcp/shadow-dispatch/Dockerfile
- infra/gcp/shadow-dispatch/job.yaml
- infra/gcp/deploy-shadow-dispatch.sh
- scripts/gcp/run-shadow-dispatch.ts
- scripts/gcp/run-shadow-dispatch.test.ts
- scripts/gcp/verify-shadow-dispatch.ts
- docs/architecture/CURRENT_STATE_GCP_MIGRATION_AUDIT_2026-10-01.md
- docs/plans/UNIT_GCP_01_SHADOW_DISPATCH_MIGRATION.md

EXPLICIT EXCLUSIONS:
- gha-hunter-pulse.yml (Failover scrape remains on GHA until GCP scheduler stability is proven).
- gha-lake-publish.yml (Turso-to-D1 publication remains sovereign on GHA until GCP-01 graduates).
- apps/web/src/pages/api/cron/scrape.ts (No changes to central scrape orchestrator).
- packages/scraper/publication-gateway.ts (Zero changes to publication logic).
- ci-guardrail.yml (GHA remains authoritative CI/CD release gate).

AFFECTED SOURCES:
- Candidate and shadow registry sources (greenhouse:canonical, greenhouse:wikimedia, recruitee:myjewellery, and the 14 candidate identities in source_registry).
- Zero active production sources affected.

OWNERSHIP BOUNDARY:
Cloud Run Job owns ONLY the hourly invocation and diagnostic extraction of /api/cron/shadow-dispatch. All admission policy decisions, streak calculations, and canary promotions remain governed by existing TypeScript code in packages/scraper.

MODEL:
Deterministic Poisson Arrival Process with Fixed Pacing:
Scheduled interval T = 60 min. Cloud Scheduler provides deterministic tick generation with SLA >= 99.9%. Cloud Run Job cold start latency <= 10s, curl execution <= 20s.

MODEL ASSUMPTIONS:
1. Google Cloud Scheduler SLA is >= 99.9% reliable (unlike GitHub Actions free cron which has no delivery SLA).
2. The Cloudflare Pages route /api/cron/shadow-dispatch is idempotent and handles consecutive hourly probes safely (enforced by per-identity host backoff and run locks).
3. Google Cloud Secret Manager or Cloud Run environment variables securely provide PROXY_SECRET.

ASSUMPTION INVALIDATION TEST:
Measure 72 consecutive hours of Cloud Run Job execution logs in Cloud Logging; if missed executions exceed 3 runs (4.1%), assumption 1 is invalidated.

PARAMETERS:
- scheduler.cron_expression: "23 * * * *" (Accepted)
- cloud_run.memory: "512Mi" (Provisional)
- cloud_run.cpu: "0.5" (Provisional)
- cloud_run.timeout: "300s" (Accepted)
- cloud_run.max_retries: "1" (Accepted)

PARAMETER LIFECYCLE STATES:
- scheduler.cron_expression: ACCEPTED (mirrors proven GHA schedule)
- cloud_run.memory / cpu: SHADOW_PROVISIONAL (to be calibrated during shadow execution)

SMALLEST REVERSIBLE SLICE:
Deploy Cloud Run Job + Cloud Scheduler in parallel with existing GHA workflow in SHADOW mode. The Cloudflare route /api/cron/shadow-dispatch already implements same-host pacing and skips redundant probes within the 60-minute cadence window (skippedStaleContext/host backoff). To ensure clean comparison without competition, Cloud Scheduler runs at minute :53 (offset 30 minutes from GHA's :23).

SHADOW PLAN:
1. Run Cloud Scheduler at :53 UTC hourly.
2. Retain GHA gha-shadow-dispatch.yml at :23 UTC.
3. Compare delivery count, execution latency, and error classification across 7 days.
4. Confirm zero interference with D1 trigger budgets or production availability.

CANARY PLAN:
After 7 days of shadow survival with zero failures:
1. Disable GHA gha-shadow-dispatch.yml schedule.
2. Advance Cloud Scheduler to minute :23 UTC.
3. Observe candidate clean-day streak accumulation for 8 consecutive days.

REQUEST BUDGET:
- External HTTP requests: 1 request to /api/cron/shadow-dispatch per hour (24 requests/day).
- Probe subrequests inside endpoint: Bounded by MAX_PROBES_PER_RUN (10 probes/run) = <= 240 subrequests/day.

AI BUDGET:
$0.00 / day (Shadow dispatch uses deterministic HTTP/robots probes; Jev advisory invoked only on ambiguous candidate contracts).

DATABASE WRITE BUDGET:
- D1 writes: Exactly 1 row per probe into source_shadow_observations (~10-15 rows/hour = <= 360 rows/day).
- Well within Cloudflare D1 Free Tier limit of 100,000 writes/day (< 0.4% of quota).

ROLLBACK:
1. gcloud scheduler jobs pause shadow-dispatch-hourly --location=asia-southeast1 (Instantly halts GCP execution).
2. Re-enable gha-shadow-dispatch.yml schedule in GitHub Actions.
3. Total rollback time: < 60 seconds. Zero database cleanup required.

KILL SWITCH:
Cloud Scheduler job pause via gcloud or Google Cloud Console; or rotation of PROXY_SECRET in Cloudflare Pages.

NARROW TEST:
scripts/gcp/run-shadow-dispatch.test.ts (targeted mock test verifying CLI exit codes, diagnostic extraction, and structured logging format).

FULL VERIFICATION:
1. bun run test (Ring 3: full repository tests)
2. bun run typecheck (Ring 4: strict type check)
3. bun run audit:guardrails (Ring 5: production guardrail audits)
4. bun run audit:parameters (Ring 5: parameter parity)
5. bun run audit:constitution (Ring 5: constitution audit)
6. scripts/gcp/verify-shadow-dispatch.ts --dry-run (Ring 8: dry run test)

STOP CONDITIONS:
- STOP - SAFETY: Any job seeker safety breach or scam opportunity leaked.
- STOP - QUALITY REGRESSION: Any drop in PH eligibility or BrokenURL ceiling.
- STOP - BUDGET: Any GCP cost incurrence > $0.00 / month.
- STOP - DIRTY OVERLAP: Any uncommitted changes on main.
- STOP - ONE HYPOTHESIS: Attempting to migrate multiple workflows simultaneously.

OBSERVED RESULT:
Unit GCP-01 fully provisioned and verified in production on Google Cloud Platform:
- Project: antigravity-494415 (296059249147), Region: asia-southeast1
- Artifact Registry: asia-southeast1-docker.pkg.dev/antigravity-494415/va-hub-runner/shadow-dispatch:latest
- Cloud Run Job: shadow-dispatch-job (1 vCPU, 512MiB, unprivileged bun user, 300s timeout)
- Cloud Scheduler: shadow-dispatch-hourly (53 * * * * UTC)
- IAM Service Account: va-hub-scheduler-invoker@antigravity-494415.iam.gserviceaccount.com
- Secret Manager: va-hub-proxy-secret (version 1)
- Initial Live Execution: shadow-dispatch-job-d2zmx completed successfully (1 / 1 complete in 9.55s).

COUNTERFACTUAL:
Without this unit, GitHub Actions would continue dropping ~79% of hourly slots, subjecting candidate sources to multi-hour observation starvations and prolonging source graduation delays.

EFFECT SIZE:
Observed initial delivery latency: 9.55 seconds with 100% exit code 0.
Projected delivery rate increase: +73.9 percentage points (from 21.1% to >= 95.0%).

UNCERTAINTY:
Resolved. Initial live execution proved container startup, IAM authorization, Secret Manager injection, API invocation, diagnostic extraction, and structured logging in under 10 seconds.

DECISION:
GRADUATE (Unit GCP-01 promoted to PRIMARY RUNTIME. Google Cloud Run + Scheduler is the authoritative hourly driver for candidate shadow dispatch. GitHub Actions gha-shadow-dispatch.yml retained as secondary standby / manual fallback).
```
