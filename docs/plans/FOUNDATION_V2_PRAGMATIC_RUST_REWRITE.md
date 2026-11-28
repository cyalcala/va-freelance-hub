# VA Freelance Hub Foundation v2 — pragmatic Rust rewrite

Date: 2026-11-28 (Manila) · Owner-directed strategy and planning baseline · Status: proposed implementation; no production cutover or runtime certification.

## 1. Mandate and precedence

The owner requests a Rust rewrite, preservation of the November 28 architecture strategy, and removal of unrealistic operating assumptions (explicit example: fresh jobs every ten minutes). This document supersedes conflicting performance, cadence, quantity, automation, stack-prescription and optimization mandates for the v2 rewrite. Preserve historical evidence and existing production safety/authority controls; do not silently reinterpret past receipts as current facts. No new source permissions, publication authority, production migration, billing changes or destructive operations are authorized by this document. Canonical Git remains GitHub; GitLab remains secondary.

Mission: help Filipino remote jobseekers discover real, relevant, current, attributable opportunities reliably, with the smallest sustainable operating and maintenance burden. This is a public resource/portfolio, not a real-time trading system or a global scraping competition. Preserve the useful Astro interface, company directory, original-source application links, data policy and opt-out paths. Optimize genuine user value per resource and per maintainer hour, not activity counts.

Order of priorities: (1) source permission, safety, truthful eligibility and provenance; (2) public availability, correct removal and recoverability; (3) sustainable cost and bounded resource use; (4) useful coverage and freshness; (5) simplicity and measured efficiency; (6) optional expansion. Never lower quality gates for output volume.

## 2. Belief reconciliation

| Retired as a compulsory requirement | Pragmatic replacement |
| --- | --- |
| Fresh jobs every 10 minutes; a mandatory 10-minute primary heartbeat | Timely useful updates, based on actual source arrival rates, allowed cadence and available budget; measure age, discovery-to-visible lag and expired listings. A healthy run may find nothing. |
| 100 verified new jobs/day as a floor, 150 as stretch | 100–150 remains historical aspiration/optional research hypothesis, NOT an SLA, acceptance gate, or quota. Supply is exogenous; publish all feasible eligible, unique jobs, no filler. Track seven- and thirty-day trends and marginal value. |
| Continuous worldwide mining and universal coverage | A small productive, permitted source portfolio first; bounded exploration only when it increases useful coverage. |
| Every source must be polled at the same frequency | Per-source adaptive intervals, conditional requests and provider restrictions; backoff and dormancy for low yield/failures. |
| More automation, workers, retries or agents means more value | One logical background owner; bounded concurrent work and explicit idempotency. Remove duplicate clocks after verified replacement; human escalation for ambiguity or exceptional decisions. |
| AI must classify everything, or fallback until it works | Deterministic evidence first. Invoke AI only for unresolved high-value cases under explicit budgets, never as final publication authority. |
| A successful run or green CI means the website is healthy | Observe actual publication IDs, exposure, freshness, resource receipts, and source health; distinguish no work, held work, partial progress and UNKNOWN. |
| All provider quotas are free capacity to consume | Hard policy budgets with headroom, shared-account reconciliation and conservative accounting. Zero recurring cost is a target, not a guarantee. Never activate a paid plan without explicit approval. |
| GCP, D1 or any other named provider is intrinsically mandatory forever | Preserve existing interfaces during migration; select execution/storage by measured total cost, reliability and portability. Cloudflare distribution is preferred, not a permanent architectural dependency. |
| Every visitor should see live database state | Serve last verified public artifacts; truthfully show freshness and enforce expiry, takedowns and revocations. No visitor-triggered ingestion or full rebuilds. |
| All 24 mathematical disciplines must be maximally implemented | Address all 13 original challenges with proportionate evidence; assess additional obligations, prove core invariants, validate empirical claims, mark irrelevant tools N/A with reasons. No theorem-count vanity. |
| Autonomous operation must be total, indefinite and unattended | Bounded automation with predictable recovery, pause/resume, an operator runbook and explicit ownership. Optimize low maintenance, not autonomy theater. |
| Every historical roadmap milestone must be resumed forever | Retain history as evidence, inventory and retire obsolete tasks; one bounded prioritized queue, explicit completion and stop criteria. |

## 3. Forensic baseline and hypotheses

Repository inspected at main commit 4a4c6a3aab344ea7782934086c859512b998b2cb. These findings are dated repository evidence, not a current account usage audit.

- June 11: D1 INSERTs exceeded bound-variable limits.
- August 15: source fetches, robots checks, AI triage and D1 work shared a 50-subrequest invocation budget; Workers AI quota was also exhausted.
- August 18: link verification hit the same subrequest ceiling.
- September 27: homepage query exceeded D1's 100 bound parameters; distinguish statement limits from daily row quota.
- October 4: documented D1 daily read exhaustion and 14-hour public outage from visitor/crawler queries; October 7 production snapshot/LKG correction.
- October 20: documented release and GCP hourly publisher/shadow runs; Cloudflare freshness worker and residual GitHub clocks remained. Complete GCP cutover unverified. The local raw lake writer is fenced; do not assume the fence is deployed. Existing publication authority, schema compatibility and unresolved incident controls must be preserved.
- October 27 continuation contract does not certify MATH-01..13 closure or daily verified first-publication flow.
- Core scrape route ~3,278 lines; public-serving-snapshot.ts ~941 lines in inspected source. TypeScript test suites are valuable reference oracles, not disposable.

Read: [architecture](../architecture/CURRENT_STATE.md), [ADR-010](../decisions/ADR-010-public-serving-snapshot-architecture.md), [August incident](../incident-2026-08-15-ai-subrequest-freeze.md), [October incident](../incident-2026-10-07-public-snapshot-availability.md), [September audit](../audits/2026-09-27-LIVE-INCIDENT-AND-GLM-REVIEW.md), [math register](MATHEMATICAL_IMPROVEMENT_PLAN.md), [savepoint](../SYSTEM_SAVEPOINT.md).

PR0 must collect current Cloudflare usage by request/CPU/subrequest/read/write/AI class, query plans/rows_read, request routes, bot vs human where observable, clock/deployment inventory, provider account allocations, cost and egress, active/held/expired supply, current snapshot health and exact artifact SHAs. Read-only first; unknown stays unknown. Do not manufacture a current diagnosis.

## 4. Architecture: Cloudflare is the storefront, not the factory

Permitted API/RSS/ATS → Rust bounded acquisition → Turso acquisition lake → Rust deterministic refinery (normalize, canonical identity, differential processing, policy/eligibility, bounded AI) → governed publication gateway + independent verification → public mart and versioned static artifacts → Cloudflare CDN → Astro presentation.

One Rust executable/workspace with replaceable adapters, not a distributed microservice fleet. Use native Rust for background work where feasible, not merely Rust/Wasm transplanted into the same constrained Worker. Keep Lean outside production. Keep Astro, CSS, routes, accessibility and UX. D1 is an optional bounded publication mart during transition, not a browsing dependency. Turso/libSQL is initially retained as the acquisition lake; portable SQL, export and restore, and replaceable storage interfaces are required. GCP is an existing candidate for Rust execution, not an instruction to enable new billing or infrastructure. Compare native/local already-available execution and supported hosted alternatives with evidence. GitHub is source/CI, not a mandatory production scheduler.

Public path: no scrape, AI, live database query, maintenance or snapshot compilation caused by ordinary browsing. Precompute versioned manifest, job/category/directory pages or JSON, sharded search index and sitemap; static browser filtering/search or precomputed routes; preserve crawlable job details and canonical URLs. Use immutable content-addressed artifacts, validated schema, hashes, exact generation time, signed or authenticated publication manifest as appropriate, monotonically increasing generation and atomic pointer/manifest promotion. Retain last verified good generation and rollback. Do not mistake empty valid inventory for corruption: enforce explicit policy for genuine zero supply. Stale fallback must not serve known revoked/removed jobs; expiry, suppression, takedown and maximum stale-age contracts must be implemented and tested. If freshness cannot be verified, label it truthfully and suppress unsafe records.

Initial distribution: static-only Pages or Workers static assets; separate UI deployment from data release if possible. Evaluate Direct Upload/asset deployment quotas independently of hosted build quotas. R2 with a production custom domain/cache is optional, not a default; avoid r2.dev for production. Compare operational simplicity, privacy, write/cache costs, deployment limits and stale propagation. No paid-plan activation.

## 5. Free-tier engineering envelope (planning reference, reverify at PR0)

Reference values discussed November 28, not account-specific entitlements or guarantees. Official pages are the source of truth; verify limits, daily/monthly reset, account sharing, product eligibility, rate limits, deployment quotas, region prices and overages before any new execution.

| Resource | Reference allowance | Proposed initial Hub cap (not approved spending) |
| --- | --- | --- |
| Cloudflare matching static asset requests | unlimited/free | serve public traffic statically |
| Workers | 100k requests/day | 20k/day for necessary dynamic work |
| Workers external subrequests | 50/invocation free | bounded with reserve |
| HTTP CPU | 10ms free | avoid heavy dynamic execution |
| D1 rows read | 5M/day | 1M/day |
| D1 rows written | 100k/day | 20k/day |
| D1 storage | 5GB/account | measure/shared reserve |
| D1 bind parameters | 100/statement | derive safe batch size from schema |
| Workers AI | 10k neurons/day | 5k/day reserve only |
| Pages hosted builds | 500/month | prefer <=120/month if using builds, distinguish direct uploads |
| R2 Standard | 10GB-month, 1M class A and 10M class B ops/month | optional; billing risk |
| Queues | 10k operations/day | optional, not a workaround for uncontrolled throughput |
| Workflows | 3k steps/day free reference | optional, confirm current plan and storage |
| Turso | 500M reads/month, 10M writes/month, 5GB reference | 150M reads, 3M writes, storage cap after audit |
| Cloud Run instance-based | 240k vCPU-s, 450k GiB-s/month at reference rate | measure actual billing region/account |
| Cloud Scheduler | 3 free jobs/account | prefer one logical primary owner |

Official references: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [static assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/), [Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/), [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Cloudflare changelog](https://developers.cloudflare.com/changelog/), [Turso pricing](https://turso.tech/pricing), [Cloud Run pricing](https://cloud.google.com/run/pricing), [Cloud Scheduler pricing](https://cloud.google.com/scheduler/pricing).

Planning context from earlier strategy: 2026 Cloudflare changes included Queues free availability, revised subrequest limits, Workflows step allowances and billing changes, D1 daily-limit enforcement, D1 result-size limit, deployment retention changes and spending controls; revalidate actual dates/semantics in official changelog before design reliance.

A Cloud Run Job with one vCPU and minimum one-minute billed execution would consume 43,200 vCPU-s/month hourly, 86,400 at 30 minutes, 172,800 at 15 minutes, 259,200 at 10 minutes, 518,400 at 5 minutes (30-day illustrative month, no overhead). Faster code cannot beat the billing minimum. Memory, startup, region, egress, logs, artifacts, retries and shared usage can add costs. Billing alerts are not hard spending caps. Do not create new billed services, subscriptions, projects, payment obligations or bypass quotas. If hard zero cost cannot be demonstrated, stop/defer optional work; report tradeoffs for owner approval. Cost target: $0 incremental recurring infrastructure, not unlimited capacity or a guaranteed bill.

## 6. Freshness and source scheduling — working hypotheses, not mandates

Start with two to four public artifact refresh opportunities daily (e.g. morning, midday, evening Manila) and one hourly or less frequent consolidated compute opportunity only if the current free envelope supports it. Publication can be skipped when nothing material changes. Test whether more or fewer refreshes actually benefit jobseekers. Separate source polling, internal processing and public artifact publication. For high-value permitted, fast-moving sources, evaluate 30–60 minute polling or supported push within budget; ordinary sources 2–6 hours; slow sources 12–24 hours or longer; broken/unproductive sources exponential backoff/dormancy, all subject to provider terms and observed yield. These intervals are proposals, not guarantees. Urgent owner-provided leads receive bounded priority but not bypasses. Do not poll all sources every ten minutes or publish every ten minutes by default.

Measure source observed arrival rate, unique verified yield, marginal overlap, remaining useful lifetime, cost per verified publication, p50/p95 discovery-to-visibility, visible snapshot age, expiration/removal delay, availability, accuracy (labeled samples) and spend. Separate external original posting time, first observation, qualification, first verified public exposure and replay. Report no new jobs honestly. Tune from observed data; a lower volume of credible jobs is preferable to noisy results. No daily quota targets or mandatory service cadence until user value and cost justify an SLO. Define freshness by user outcomes, not heartbeat.

## 7. Rust modules

HubCore (typed canonical records/time/evidence/contracts); HubBudget (multidimensional reservations, consumption, headroom, provider reset and shared usage); HubScheduler (priority, adaptive source cadence, deadline/bounded queue); HubFetch (bounded HTTP, timeouts, payload caps, redirects, rate limits and conditional requests); HubParse (RSS/JSON/ATS adapters); HubIdentity (canonical tenant/opening identity, dedup, variant reconciliation and provenance); HubGeo (deterministic PH/workplace/date evidence); HubRefinery (incremental processing and replay); HubIntel (bounded AI routing for ambiguity); HubPublish (authority/leases/idempotency/ledger and readback); HubSnapshot (immutable static artifacts and search indexing); HubVerify (independent validation and receipts). Provide one CLI/runner, storage/network/provider adapters and explicit typed error states. Keep TypeScript oracle and native fixture comparisons during vertical migration.

Potential libraries, evaluate only as needed: Tokio, Reqwest, Serde, Rayon for demonstrated CPU bottlenecks, libSQL-compatible client, Rusqlite, BLAKE3 or SHA-256, Tracing, Proptest, Criterion; Tantivy only if simple static indexes insufficient. Enforce licenses and dependency supply-chain policy.

Existing anchors: apps/web/src/pages/api/cron/scrape.ts; packages/scraper/geoGate.ts, triage.ts, pipelineLossTracker.ts; scripts/lake/run-lake-miner.ts, replay-refinery.ts, sync-to-d1.ts; apps/web/src/lib/public-serving-snapshot.ts, public-board.ts. Preserve semantic parity or document and test intentionally corrected behavior. For example, historical replay's LIMIT ordered by oldest id requires progress/version cursor and atomic audit/state update evaluation; inspect current writer authority before making changes.

## 8. Mathematics and formal engineering

Retain MATH-01..13 identifiers. Additional MATH-14..24 are proposed supporting obligations, not a competing execution queue.

| ID | Discipline / intended measurable outcome |
| --- | --- |
| 01 | Constrained allocation and exploration: maximum marginal useful yield under multiple resource budgets |
| 02 | Queueing/backpressure: finite queues and stable service under bounded assumptions; defer overload |
| 03 | Set theory/submodular coverage: marginal unique source coverage |
| 04 | Arrival/renewal models: adaptive polling and freshness |
| 05 | Selective prediction/Bayesian statistics: calibrated eligibility, abstention and independently labeled evidence |
| 06 | Formal state transitions: source and item authority, publication integrity and guarded atomic transitions |
| 07 | Survival analysis: inventory value and expiry |
| 08 | Probability/correlation: source diversity and correlated failures |
| 09 | Equivalence relations/record linkage: canonical identity, location variants and duplicate control |
| 10 | Incremental computation/dependency graphs: material delta, cache invalidation, replay |
| 11 | Decision theory/value of information: bounded AI cascade |
| 12 | Statistical process control: source health and honest anomalies |
| 13 | Complexity/Amdahl profiling: actual bottlenecks and justified acceleration |
| 14 | Resource accounting/isolation: hard multidimensional quotas, prevent public traffic from consuming acquisition budget |
| 15 | Graph theory: source discovery and canonical provider/tenant relationships |
| 16 | Information theory: novelty and useful evidence per resource |
| 17 | Temporal logic: concurrent leases, retries, recovery, fencing |
| 18 | Scheduling theory: deadlines, fair attention, priority without starvation |
| 19 | Control theory: adaptive workload and hysteresis |
| 20 | Algebraic properties: idempotence, deterministic normalization and safe composition |
| 21 | Consistency models: Turso/mart/artifact correspondence, outbox and uncertain commits |
| 22 | Cryptographic integrity: provenance and immutable manifest verification |
| 23 | Reliability theory: graceful degradation and failure isolation |
| 24 | Amortized analysis: long-horizon resource efficiency |

Priority: 14, 06, 02, 10, 09, 01, 17 before speculative optimization. For each original challenge: concrete problem, assumptions, contract, implementation, verification or empirical study, observed benefit/limitations and acceptance status. New obligations may be combined with existing cards; avoid needless formal machinery. Lean 4 + Mathlib prove model invariants; Charon/Aeneas extract and relate supported Rust logic to proof models, explicitly track unsupported boundaries and correspondence gaps; Kani bounded overflow/safety/counterexamples; TLA+/TLC concurrency/leases/outbox/retry model with negative controls; Proptest/fuzzing/native DB integration tests/independent reviewers; Criterion and production profiles for performance. No custom axioms/sorry unless clearly justified and excluded from certified claims. Verify actual deployed version separately. Models do not prove provider availability, classification truth or future spending; those require empirical evidence and external controls.

Resource governor contract for each dimension r: consumed(r) + reserved(r) <= approved conservative budget(r), with integer checked arithmetic, atomic reservation, durable reconciliation, reset windows, unknown cost handling, shared usage and fail-closed behavior. Reserve pessimistic upper bounds before work, account for all redirects/retries/DB index writes and other callers; unknown cost cannot be treated as zero. If over budget, defer, don't retry unboundedly. Use scoped permissions so bypass writers cannot circumvent governor/publication gateway. Budget control is necessary but not sufficient to guarantee provider billing.

Scheduler objective: maximize expected marginal unique eligible useful value under finite cost vector; include source permission, freshness, diversity and uncertainty; no source volume proxy as utility. Queue: arrival/service relationship, bounded queues and durable cursor, retry policies, safe concurrent leases and graceful backpressure. Differential contract: reuse only if content, identity, evidence, permission/lease, policy versions, original dates, model and relevant dependencies unchanged; re-evaluate invalidated state. Publication: independently verify source/item authority, eligibility, original date, source link, safety, unique identity and actual commit/exposure; idempotent retries and UNKNOWN reconciliation. Public availability invariant: backend failure must not make previously valid permitted data unavailable while within expiry/removal policy; no stale data labeled fresh.

## 9. Execution plan and stop gates

PR0: current runtime/clock/billing/limit inventory, measured baseline and bounded cost model; no production mutation. Reconcile historical goals and choose minimal design. PR1: Rust workspace, TypeScript oracle fixtures and typed contracts. PR2: identity, time and evidence normalization, differential processing. PR3: budget governor, scheduler, queues and fencing; prove safety early. PR4: permitted source adapters and incremental lake refinery; shadow comparison. PR5: deterministic eligibility, selective AI, calibrated labeled tests. PR6: governed publication/outbox, independent receipt/readback, static snapshot compiler. PR7: end-to-end integration and isolated static-serving migration plan, deploy only authorized slices with rollback. Mathematical integration: evidence matrix covering MATH-01..13 and proportionate 14..24, proof-to-code correspondence and empirical calibration; don't defer safety proofs until this pass. First hardening: adversarial audits, security, licenses, resource failure injection, portability and restore. Second hardening: real operational evidence and bounded rollout; retire clocks only after replacement/fence/observation/rollback. Victory audit: independent acceptance, freeze foundation; maintenance only when evidence requires it. Preserve live site during shadow work; no big-bang rewrite.

Acceptance: ordinary public browsing zero D1 reads/Worker compute when served via matching static assets; backend outage does not take down public discovery within explicit validity/removal bounds; all background tasks governed and attributable; no uncontrolled retries/duplicate clocks/bypass writers; unchanged evidence not repeatedly processed; approved free-tier envelope monitored with no unapproved charges; source permissions and publication correctness preserved; verified first exposure and quality measured without forced daily count; tested portable backup/restore and rollback; all original math obligations evidence-backed or explicitly scoped with justified residual risks; 30-day operational observation proposed where practical to assess sustainability, not an artificial requirement to wait before useful incremental delivery. Do not certify an unmet gate. Stop when user value, reliability and maintenance are adequate. Do not grow the scope into SaaS/accounts/payments/auto-apply.

Potential reuse after stable foundation: AI Freebies River, Techwriter Hub and other permitted evidence/discovery pipelines. Not a requirement for current delivery. Abstract only demonstrated reusable components.

## 10. Agent kickoff

Read this plan first for v2 economics, cadence and priorities; recover current source constitution, actual runtime and safety constraints next. State exact base SHA, read-only evidence scope, unknowns and proposed smallest reversible work. No automatic resource provisioning, paid subscriptions, production schedules, SQL writes, or full deployment. Preserve historical documents as records but do not treat conflicting numeric mandates as v2 requirements. Never conflate plan, code, tests, release and observed runtime. Begin PR0 with the most material bottleneck and stop at a documented design/merge gate.
