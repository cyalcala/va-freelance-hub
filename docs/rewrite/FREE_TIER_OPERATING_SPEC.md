# Foundation v2 — free-tier reality and FinOps controls

Baseline checked against provider documentation on 2026-11-28. These are published ceilings, not account entitlements or remaining allowance. PR0 must obtain current plan, usage, reset timezone, shared-account consumption, rate limits and regional SKU pricing. UNKNOWN means deny optional work, not assume free. Record source URL/date and observed account evidence separately; revalidate before every rollout and on provider change.

## Allowance and conservative provisional project caps
| Resource | Published free envelope | Initial maximum project allocation |
| --- | --- | --- |
| Cloudflare static assets | Unmetered matching static requests; script execution separately metered | Ordinary browse/search zero dynamic requests; 12,000 files and 10 MiB/file design cap vs 20,000 and 25 MiB provider ceilings |
| Pages hosted builds | 500/month; one concurrent | 120/month total including preview/release/recovery builds; baseline 2/day or material changes, not mandatory |
| Workers | 100k requests/day; 10 ms CPU; 50 external subrequests/request | 20k/day, 5 ms measured p95 design target (hard runtime limit still applies), 25 external subrequests reserved incl redirects/retries |
| D1 | 5M rows read/day, 100k written/day, 5 GB account total | 1M reads, 20k writes/day, 1.5 GB storage; zero per ordinary visitor; count index writes and scan rows |
| D1 per query | 100 bound parameters, 2 MB row, 50 MB result | <=80 binds, <=0.9 MB row, <=5 MB result; explicit bounded queries, indexes and keyset pagination |
| Workers AI | 10k neurons/day; selected models paid-only | disabled by default, <=2k/day if verified free model/plan; hard no paid fallback |
| Queues / Workflows | Free plans exist, metered operations/steps/storage; queue free retention 24h | 0 initially; use durable existing lake queue; only enable with measured advantage and revalidated all resource limits |
| R2 Standard | 10 GB-month, 1M class A, 10M class B/month, free egress | 0 initially; metered overages and billing activation risk; no R2 without owner approval |
| Turso Free | 5 GB storage, 500M reads/month, 10M writes/month; sync allowance separate | 1.5 GB storage, 100M reads and 2M writes/month, no paid overages, sync/export budget TBD |
| GCP Cloud Run Jobs | Reference us-central1 discount: 240k vCPU-sec and 450k GiB-sec/month aggregated per billing account; actual price region-dependent, minimum 60s per task | 0 until preflight; then provisional <=60k vCPU-sec, <=100k GiB-sec/month AND verified remaining regional dollar credits after other use; lower of both |
| Cloud Scheduler | Three job equivalents/account free; frequency not cost dimension | At most one existing authoritative job; no new provisioning until approval |
| GitHub / CI | Account/repo-specific eligibility, job minutes, storage and policies | Use existing GitHub canonical Git; CI-only checks by default; evaluate one scheduled portable runner only if permitted/observed free; do not assume public repo means unlimited resources or guaranteed scheduling |

Official sources (checked 2026-11-28):
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/changelog/product/d1/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
- https://developers.cloudflare.com/queues/platform/pricing/
- https://developers.cloudflare.com/queues/platform/limits/
- https://developers.cloudflare.com/workflows/reference/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://turso.tech/pricing
- https://cloud.google.com/run/pricing
- https://cloud.google.com/scheduler/pricing
- https://docs.cloud.google.com/billing/docs/how-to/budgets
- https://cloud.google.com/products/secure-source-manager/pricing
- https://developers.cloudflare.com/changelog/post/2026-11-13-spend-management/

D1 free daily row ceilings are enforced as errors; November 4 query result cap is 50 MB. Static assets must match directly, not route through SSR, functions or Worker-first configuration. Pages retains recent deployments plus current production; never rely on provider history as backup. Direct Upload supports prebuilt assets; validate existing project compatibility, deploy limits and actual behavior; never assume unlimited uploads or change hosting mode without migration plan. Cache and CDN are not durable databases. Do not use public r2.dev as production distribution.

## Hard spending doctrine — learn from SSM
Secure Source Manager currently lists USD 1,000/month per instance; prohibited. No managed Git migration, provisioned instance, always-on VM/service, premium plan, billing activation, paid-only AI, reserved capacity/commitments, paid marketplace, VPC connector, new NAT/load balancer, hosted observability, secrets product, extra registry or duplicated infrastructure without written owner decision and verified worst-case recurring/one-off costs. No credit card trial as a substitute for a free plan. Zero incremental budget means no knowingly billable action. Never enable usage-based overage/auto-top-up or subscription through CLI, dashboard, MCP or agent. Agent credentials least privilege; no billing admin, subscription, resource-create rights by default. Separate runtime identities and billing blast radius; do not create a new billing account to evade quotas.

GCP alerts alone are not spend caps. New provider spend-cap controls may exist; verify actual account eligibility, scope, lag and exclusions; fixed commitments and already-incurred charges may persist. Cloudflare November spend controls cover Workers/DO, not all services. Provider caps supplement—not replace—local fail-closed budget. Audit billing exports/invoices, credits and pending charges, project services, instances, registries/images, storage/snapshots/backups, build/logging/secret/scheduler/egress usage, subscriptions and dependencies; confirm SSM removed and billing stopped with actual readback, not documentation. Do not delete anything without owner-approved dependency/backup/restore and rollback review.

## Budget arithmetic and reservations
For each resource r and reset window w, remaining project allowance A = max(0,min(project cap, provider allowance - verified other usage - external outstanding reservations - safety reserve)). Default safety reserve at least 40% of provider ceiling; project allocations above are additional caps, not claims that all can be consumed. For regional spend, apply documented SKU rates to CPU, RAM, egress, registry, build, logs and every other billable dependency, then verified remaining credits; use upper bounds, not averages. Unknown/shared usage, delayed analytics or uncertain billable operation => zero discretionary allocation. Account-wide limits cannot be guaranteed by one project alone; reconcile other callers or isolate safely.
Atomic durable ledger: reserve upper-bound cost before side effect, fence leases with monotonic token, settle actual usage, preserve uncertain reservations until reconciled, refund only confirmed unused amounts. Idempotency per operation/window; checked integer arithmetic with explicit units. Enforce consumed + outstanding <= allowance at every admission; do not reset in-flight reservations away. Provider reset windows may be UTC/day, month, rolling interval or different; use provider rules, not Manila reporting days. Limit concurrency, maximum bytes/rows/pages/time/attempts, include redirect and retry costs and DB index writes. Use bounded retries with jitter, Retry-After, cancellation and circuit breakers. At 50% project-cap use slow optional mining, at 75% pause exploration/AI and defer nonessential work, at 90% reserve remaining capacity for already-authorized essential recovery/removal only; at 100% stop any further work. Actual thresholds can become stricter based on forecast; no quota exhaustion tests in production. If reconciliation or provider visibility is unavailable, stop optional work, serve static data with honest freshness.

## Cadence is a decision, not a promise
Example initial pilot: one run every 2 hours with max 2 minutes billable, 1 vCPU, 512 MiB, no retry or parallel task unless pre-reserved. 31-day ceiling = 372 invocations x 120s = 44,640 vCPU-sec and 22,320 GiB-sec, before ancillary/region costs; no GCP pilot until remaining credits and all dependencies proven. Hourly at 60s minimum = 44,640 vCPU-sec; 10-min at minimum = 267,840 vCPU-sec (already over reference free CPU allowance). Static publication starts at most twice daily, only changed verified material, 62 normal deployments/31 days plus reserve within 120 total. Adapt using per-source arrival/expiry estimates, conditional requests, permitted hooks, source pace and observed yield; high-yield feeds can get shorter intervals within the same global envelope, low-yield dormant sources longer. Owner-submitted leads can receive reserved priority if permitted, not bypass gates. Tighten latency only if observed cost and user value justify it. A job board that is useful a few times a day is better than one unavailable for hours.

## PR0 evidence and ongoing controls
Inventory all actual schedulers and routes, classification CURRENT/FALLBACK/LEGACY/UNKNOWN, shared budgets, authority and fencing. Reconcile Cloudflare, Turso, GCP and GitHub account limits, actual plan, other-project use, billed and pending costs, free credits and expiration, documented current revision, logs and rollback. Capture bounded representative row scans/query plans, request counts, data size and source yields; no expensive full audit that itself exhausts quotas. Select cheapest measured execution venue using existing local/manual batch for development and a single permitted free runner if suitable. Compare region-specific Cloud Run against permitted GitHub scheduled runners (minutes/storage/artifacts/policy and unreliable schedules), and any genuinely free existing alternative. No permanent GCP mandate. One 30-day observation with daily usage/cost receipts, monthly reset and delayed billing verification; stop or redesign if budget cannot be demonstrated. No cloud action authorized by this document alone.
