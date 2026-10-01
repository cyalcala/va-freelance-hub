# ADR-009: Constitution-Governed GitHub Actions to Google Cloud Runtime Migration for Sub-6-Hour Batch Schedules

## Status
Accepted (Governed under Master Operating Constitution v3.0, Unit GCP-01)

## Context
VA Freelance Hub relies on scheduled batch workloads for:
1. Primary Ingestion: Edge-hosted Cloudflare Freshness Worker (`workers/freshness-cron`) triggering `/api/cron/scrape` every 10 minutes.
2. Candidate Shadow Observations: `gha-shadow-dispatch.yml` scheduled hourly to observe candidate and shadow sources, accumulating the 8 consecutive clean calendar days required for ADR-007 canary graduation.
3. Reservoir Publication: `gha-lake-publish.yml` scheduled hourly to synchronize qualified opportunities from Turso lake reservoir into Cloudflare D1 public mart.
4. Failover Ingestion: `gha-hunter-pulse.yml` scheduled every 15 minutes as an automatic failover clock.
5. Maintenance Pulses: Directory link health (every 6h), Prospector auto-discovery (every 6h), Enrichment (every 12h), Verifier (every 12h), and Database Pruning (daily).

### Empirical Constraint Identification
On 2026-10-01, live empirical telemetry was queried from the GitHub Actions REST API across 12 scheduled workflows (44–50 runs each, 1.5–49.0 day observation spans):
- **Sub-6-Hour Workloads Severely Starved:**
  - 15-minute Hunter Pulse: 5.6 runs/day delivered (**5.9%** delivery rate; median gap 4.27h, max gap 8.22h).
  - Hourly Candidate Shadow Dispatch: 5.1 runs/day delivered (**21.1%** delivery rate; median gap 4.91h, max gap 8.57h).
  - Hourly Lake Publish: 6.0 runs/day delivered (**25.0%** delivery rate; median gap 4.06h, max gap 6.98h).
- **$\ge$ 6-Hour Workloads Healthy:**
  - 6-hour pulses (Directory, Prospector): **93.5% – 93.6%** delivery rate.
  - 12-hour pulses (Enrichment, Verifier): **101.2% – 101.8%** delivery rate.
  - 24-hour pulses (Prune, Sentinel, Economics): **101.7% – 104.2%** delivery rate.

### Impact on Prime Outcome
The 78.9% schedule drop on hourly shadow dispatch starves candidate sources of observation records. Multi-hour silence windows cause candidate sources to record zero or incomplete observations across days, delaying the 8-day qualification streak required for canary promotion and starving fresh opportunity flow toward the 100/day floor.

## Decision

1. **Target Operational Separation:**
   ```text
   GitHub remembers:       Code, history, documentation, ADRs, PR CI/CD release gate.
   Google Cloud executes:  Cloud Scheduler + Cloud Run Jobs for sub-6-hour batch/shadow clocks.
   Turso stores:           Data lake memory, raw observations, qualified candidate reservoir.
   D1 serves:              Governed public opportunity mart and publication ledger.
   Cloudflare delivers:    Edge SSR pages, API routes, and primary 10-minute freshness Worker.
   ```

2. **No Publication Bypass:**
   - Cloud Run Jobs must NEVER bypass the constitutional transformation chain or write directly to D1 public serving tables.
   - All publication to D1 must pass through the governed `publication-gateway.ts` with immutable append-only ledger entries in `source_publication_ledger`.

3. **Incremental Migration with Unit GCP-01:**
   - Migrate ONE representative workload first: `gha-shadow-dispatch.yml` (Unit GCP-01).
   - Justification: Directly attacks the 78.9% scheduler drop, has zero public publication authority (operates exclusively against `source_shadow_observations`), produces objective deterministic diagnostic output (`extractShadowDispatchEvidence`), and has instant reversibility.
   - Run in parallel **SHADOW** mode (Cloud Scheduler at `:53` UTC offset from GHA's `:23` UTC) for at least 7 days before evaluating canary promotion.

4. **Preservation of Existing TypeScript Logic:**
   - Cloud Run Job packages a lightweight Bun container (`oven/bun:1.3.14-slim`) that invokes `/api/cron/shadow-dispatch` and reuses `extractShadowDispatchEvidence`.
   - Application business logic is NOT rewritten.

5. **Free-Tier Economic Enforcement:**
   - All Google Cloud resources must remain strictly within Google Cloud Free Tier allowances:
     - Cloud Run compute: ~10,800 vCPU-seconds/mo (Free tier: 360,000 vCPU-seconds).
     - Cloud Run memory: ~10,800 GiB-seconds/mo (Free tier: 180,000 GiB-seconds).
     - Cloud Scheduler: 1 job (Free tier: 3 jobs).
     - Projected GCP cost: **$0.00 / month**.
   - Pub/Sub is excluded as unearned complexity.

6. **Instant Rollback & Kill Switch:**
   - Rollback: `gcloud scheduler jobs pause shadow-dispatch-hourly` halts GCP execution in <60 seconds without database cleanup.
   - Kill switch: Rotating `PROXY_SECRET` in Cloudflare Pages immediately rejects unauthorized requests with HTTP 401.

## Consequences

### Positive
- Hourly execution delivery rate projected to increase from 21.1% to $\ge 95.0%$.
- Candidate sources accumulate clean observation days monotonically without multi-hour schedule dropouts, unblocking the admission path to the 100/day floor.
- Latency of Turso-to-D1 publication will be reduced from 4–7 hours to <1 hour once `gha-lake-publish.yml` is subsequently migrated.
- Zero financial cost under Google Cloud Free Tier.

### Negative / Trade-offs
- Introduces Google Cloud project management and IAM credentials alongside Cloudflare and GitHub.
- Requires container image builds and Artifact Registry storage.
- Local Windows development environment requires GCP credentials or Cloud Build automation.
