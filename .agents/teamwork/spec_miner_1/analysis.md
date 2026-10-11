# Detailed Specification Mining Analysis: Mathematical Requirements (MATH-1 to MATH-13), DeepSeek Operational Architecture (SSAE-CED), and Fresh Posting Date Prefence Evidence

**Author**: `spec_miner_1` (Teamwork Preview Specification Miner)  
**Date**: 2026-10-10  
**Working Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\spec_miner_1`  
**Authoritative Sources**:  
- `c:\Users\admin\Desktop\va-freelance-hub\astra777.txt` (Independent systems audit — 2026-10-10)  
- `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md`  
- `docs/plans/MATHEMATICAL_IMPROVEMENT_PLAN.md` (v5.2)  
- `docs/plans/SPARSE_SOURCE_ATTENTION_IMPLEMENTATION_PLAN.md`  
- `docs/directives/2026-10-04-PH-VA-FRESHNESS-GCP-CANONICAL-UPGRADE.md`  
- `docs/operations/PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE_2026-10-10.md`  
- Scraper and Web Codebase (`packages/scraper/*`, `apps/web/*`, `packages/db/*`)

---

## 1. Executive Summary & Problem Context

The core mission of the VA Freelance Hub is to scale toward **100–150 newly first-published, unique, verified, Philippines-accessible remote opportunities per complete Manila day** (with 150 as a stretch target), while enriching the 735-entry company directory and operating a self-maintaining, agentic ingestion engine.

### Current System Baseline
- **Accepted Mathematical Resolutions**: **0 / 13**. No whole MATH card is certified as PROVEN in production.
- **Certified Daily Fresh Flow**: **UNKNOWN**.
- **Governance Precedence**: Source restrictions / opt-outs > Source Constitution (`SOURCE_REPLENISHMENT_MASTERPLAN.md`:80–109) > ADR-007 / ADR-006 > Source Perpetuity Queue (`SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`).
- **Principal Correctness Vulnerability Identified in `astra777.txt`**:
  Public visibility can physically precede or bypass complete qualification. Specifically, in fresh scraping:
  1. Eight controlled raw-response cases (missing, invalid, stale >30d, future dates) returned HTTP 500 / `UNKNOWN` from the publication gateway but left active, publicly selectable rows in SQLite/D1 and indexed in FTS.
  2. Two impossible calendar cases (`2026-09-31T12:00:00.000Z`) were silently repaired by permissive JavaScript Date normalization into `2026-10-01T12:00:00.000Z`, receiving HTTP 200 and successful publication ledger IDs.

To achieve trustworthy throughput, the system requires rigorous enforcement of mathematical principles (MATH-1 through MATH-13), sparse processing and causal decision routing (DeepSeek-inspired SSAE-CED), and strict pre-persistence gating of original posting dates (`PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE`).

---

## 2. Canonical Mathematical Requirements (MATH-1 through MATH-13)

The 13 mathematical challenges originated in `math777.txt` and are codified in `docs/plans/MATHEMATICAL_IMPROVEMENT_PLAN.md`. They are governed by a shared foundation (`MATH-00`).

### MATH-00: Shared Measurement Foundation (Prerequisite Enabler)
- **Objective**: Establish a consistent event and measurement contract across schema, logs, fixtures, and reports without inventing artificial database columns or deploying unneeded monitoring platforms.
- **Contract Fields**: Exact source/family ID, canonical job ID, source posted/updated/observed timestamps, queue admission/exit timestamps, decision and policy versions, publication receipt, legal acquisition scope, rejection/hold reason, resource utilization, sampling coverage, and missingness indicators.
- **Rules**: Every field must map to an actual database column/event or be recorded as an explicit gap. Foundation acceptance is per-unit usable evidence.

---

### Detailed Analysis of MATH-01 through MATH-13

#### MATH-01: Dynamic Source Allocation & Multi-Armed Bandit Scheduling
- **Core Question**: Which permitted source should receive the next bounded unit of fetch/processing budget to improve marginal qualified fresh public supply?
- **Current State**: PARTIAL (advisory heuristic ranker exists in `scripts/lake/source-ranker.ts`, but mature canonical marginal rewards and costs are unvalidated).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Treating yield divided by arbitrary cost as a probability in $[0, 1]$ and applying standard Beta-Bernoulli conjugate updates.
  - Model correction: Economic reward per fetch is continuous and unbounded $[0, \infty)$, not a binary Bernoulli event. Beta-Bernoulli updates are mathematically invalid for continuous economic returns.
  - Proper formulation: Bounded reward formulation with a justified cost-aware contextual or non-contextual bandit (e.g., upper confidence bound for bounded continuous variables or Bayesian linear regression with known priors), handling nonstationarity and cold-starts. Static cadence does not imply linear regret unless compared against the optimal static policy.
- **Baseline Data**: Per-source action availability, actual fetch cost (HTTP requests, CPU, egress), canonical cross-source overlap, delayed qualification/publication outcomes, failure reasons.
- **Smallest Experiment**: Replay an explicit deterministic allocation baseline (e.g., round-robin or family-stride); compare against a bounded adaptive candidate in non-publishing shadow mode with reproducible decision logs.
- **Acceptance Criteria**: Demonstrated improvement in marginal qualified supply per unit cost, or proof that the deterministic baseline is adequate; strict adherence to cadence, budget, and concentration bounds. Unobserved actions cannot claim regret bounds.
- **Rollback / Reopen Triggers**: Restore deterministic baseline on missing logs, stale authority, drift, or harm; reopen upon persistent yield or cost deterioration.

#### MATH-02: Queueing Theory and Backpressure Regulation
- **Core Question**: Where does admitted work wait, and how can intake/processing be bounded without losing permitted useful work or violating freshness?
- **Current State**: PARTIAL (pure helper functions exist; low coefficient of variation [CV] caveat in `queue-metrics.ts`).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Assuming arrival and service processes follow an open Jackson queueing network with Poisson arrivals and exponential service times; inferring queue stability from low interarrival CV.
  - Model correction: Service capacity is not observed completions. Real-world scraping has bursty arrivals, batch insertions, rate-limit stalls, and network timeouts. Little's Law ($L = \lambda W$) holds under general stationary arrival distributions without requiring Poisson assumptions, but queue stability requires conservation of flow ($\lambda < \mu$) across every boundary.
  - Controller correction: A Proportional-Integral (PI) feedback controller must include explicit sampling intervals, saturation limits, anti-windup clamping, and feedback delay stability analysis.
- **Baseline Data**: Per-stage arrivals, departures (completions, rejections, expiries), in-flight work, processing capacity, oldest residence age distribution across boundaries.
- **Smallest Experiment**: Measure queue conservation and evaluate simple bounded admission/concurrency controls against an unconstrained pipeline under simulated burst and downstream stall conditions.
- **Acceptance Criteria**: Bounded backlog and residence age within accepted SLOs under traffic bursts, downstream rate limits, retries, and restarts, while preserving strict flow accounting.
- **Rollback / Reopen Triggers**: Fall back to static bounded admission on telemetry loss or controller oscillation; reopen when backlog growth breaches the 2-hour maximum sync age.

#### MATH-03: Marginal Portfolio Coverage Optimization
- **Core Question**: Which permissible sources add the most distinct useful coverage under real cost and risk constraints?
- **Current State**: OPEN (source reports lack an overlap baseline; accepted card unproven).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Simple greedy ratio selection ($\Delta \text{Coverage} / \text{Cost}$) automatically achieves the $(1 - 1/e)$ approximation factor.
  - Model correction: The $(1 - 1/e) \approx 0.632$ guarantee for submodular maximization applies under uniform matroid (cardinality) constraints. Under arbitrary, non-uniform knapsack cost constraints, simple greedy heuristic has an unbounded approximation ratio unless modified (e.g., combining greedy value-to-cost ratio with max-single-item heuristic). Approximate data structures (Bloom filters, HyperLogLog) used for scouting must not silently suppress real unique opportunities or certify exact overlap.
- **Baseline Data**: Canonical job sets, exact source sightings, comparable observation windows, job categories, source collection costs, shared upstream origins (e.g., ATS platforms).
- **Smallest Experiment**: Compute exact marginal unique coverage for a bounded cohort; compare current portfolio selection and a cost-aware candidate against exhaustive search on small fixtures.
- **Acceptance Criteria**: Measurable increase in marginal qualified supply within current authority, budgets, and diversity constraints ($HHI \le 0.25$, family share $\le 40\%$).
- **Rollback / Reopen Triggers**: Revert to previous portfolio policy upon quality degradation or cost increase; reopen when provider overlap or category gaps materially shift.

#### MATH-04: Arrival Modeling and Adaptive Polling Cadence
- **Core Question**: Which permitted polling intervals meet freshness needs efficiently?
- **Current State**: PARTIAL (Delivered persistent host backoff in migration 0051 / commit `9295e8c`; arrival modeling remains partial).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Targeting an expected unread count of 1 guarantees optimal freshness or an SLA.
  - Model correction: Under a homogeneous Poisson process with mean $\lambda$, targeting $E[\text{unread}] = 1$ implies the probability of at least one arrival before polling is $1 - e^{-1} \approx 63.2\%$. Real job postings exhibit strong time-of-day, day-of-week, and overdispersed batch behaviors. Distinguish true posting time $t_{\text{post}}$ from detection time $t_{\text{detect}}$.
  - Polling optimization: Non-Homogeneous Poisson Process (NHPP) or renewal process modeling where polling intervals $\tau(t)$ scale inversely with expected posting intensity $\lambda(t)$, bounded by host rate-limit guidance and shared host cooldowns.
- **Baseline Data**: Posting and observation timestamps, censored intervals between polls, day-of-week/hour-of-day distributions, empty/unchanged HTTP responses, request costs.
- **Smallest Experiment**: Compare bounded fixed cadence against a seasonal schedule before deploying an NHPP renewal controller.
- **Acceptance Criteria**: Independently measured latency/cost trade-off satisfying freshness bounds without causing source starvation or self-inflicted 429 rate-limit storms.
- **Rollback / Reopen Triggers**: Fall back to permitted fixed schedule upon drift or telemetry failure; reopen upon sustained structural changes in source posting patterns.

#### MATH-05: Qualification, Selective Prediction, and Calibration
- **Core Question**: How reliably do actual PH/remote qualification decisions match independent evidence, including difficult and abstained cases?
- **Current State**: PARTIAL (local accounting support in commit `e3897609`; independent calibration and error denominators remain open).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Logistic regression model scores directly represent calibrated Bayesian posterior probabilities of eligibility.
  - Model correction: Logistic outputs are uncalibrated under class imbalance or distribution shifts. Probability outputs require calibration curves (Platt scaling, isotonic regression, Brier score verification). Utility thresholds must incorporate an asymmetric loss matrix:
    $$L(\text{False PH Accept}) \gg L(\text{False Reject}) > L(\text{Abstain / Hold})$$
    A classification score cannot grant source authority or override hard policy exclusions.
- **Baseline Data**: Independent adjudicated ground-truth cohorts (positive, negative, ambiguous), complete error denominators (not just stored positives), evidence provenance.
- **Smallest Experiment**: Evaluate frozen temporal holdouts against current deterministic rules; assess confusion matrices, risk-coverage trade-offs, and calibration curves separately across subgroups.
- **Acceptance Criteria**: Independent error estimates prove False PH $\le 1\%$, False Remote $\le 0.5\%$; insufficient data remains explicit UNKNOWN rather than inferred compliance.
- **Rollback / Reopen Triggers**: Revert to conservative deterministic baseline upon calibration drift or ceiling breach; reopen after material rule or upstream model changes.

#### MATH-06: Controlled Transitions and Publication Integrity
- **Core Question**: Can every public insert/reactivation be justified and bounded by the same current authority, item-quality, and exposure controls?
- **Current State**: PARTIAL (local receipt repairs in commits `8b7f1009`, `f6753582`; unclear sweep, lake sync, and full-writer consistency remain open).
- **Mathematical / Theoretical Model**:
  - Naive assumption: A job that passes verification at selection time or persistence time is permanently valid; gateway checks after persistence are sufficient.
  - Model correction: Job state (is_active, eligibility) must be decoupled from source authority and operational lease state. Transitions must form a strictly guarded state machine:
    $$\text{State}(t+1) = f(\text{State}(t), \text{Authority}(t+1), \text{Evidence}(t+1))$$
    Any transition into the public predicate constitutes a publication event. Time-sensitive guards (lease expiry, opt-outs, freshness age) must be revalidated atomically at mutation time.
- **Baseline Data**: All-writer inventory (fresh scrape, unclear sweep, feed reactivation, inline drain, Inngest drain, lake sync), registry fallback states, publication ledgers, exposure caps.
- **Smallest Experiment**: Construct failing native fixtures for every writer path under revoked authority, expired lease, invalid date, and non-remote metadata; enforce shared gateway checks.
- **Acceptance Criteria**: Every public writer uses the gateway; bad inputs yield 0 active rows and 0 ledger IDs; atomic or compensating exposure semantics; verified public withdrawal.
- **Rollback / Reopen Triggers**: Apply narrow containment upon unexplained public exposure; preserve all incident evidence; reopen for any new writer or schema modification.

#### MATH-07: Reservoir Depth and Freshness Decay
- **Core Question**: Which retained eligible evidence remains useful, and what bounded storage/replay policy avoids staleness and loss?
- **Current State**: OPEN (empirical survival and cost data missing; 3-day half-life assumption unverified).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Job vacancy half-life is exactly 3 days; reservoir optimum is 360–400 jobs; daily publication should be rationed to smooth supply.
  - Model correction: Rationing valid jobs artificially delays publication and reduces utility to job seekers. Vacancy survival $S(t) = P(T > t)$ is a right-censored survival process. Non-parametric Kaplan-Meier estimators or Cox proportional hazards models must evaluate actual link liveness and application closing dates across job categories.
- **Baseline Data**: Original posting dates, wait times in reservoir, live-link survival checks, explicit removals, storage costs, permissible retention windows.
- **Smallest Experiment**: Compare current retention/revalidation against empirical age bands and non-parametric survival curves before introducing parametric decay models.
- **Acceptance Criteria**: Retained evidence yields measurable replay utility within cost bounds; zero artificial publication delays introduced to game daily targets.
- **Rollback / Reopen Triggers**: Retain raw recoverable evidence before irreversible deletion; reopen upon observed shifts in vacancy survival rates.

#### MATH-08: Diversity, Concentration, and Failure Domains
- **Core Question**: How much useful supply is exposed to one source, family, origin, scheduler, or shared dependency, and where can it be diversified?
- **Current State**: PARTIAL (metrics helpers exist in `concentration.ts`, but callers are unwired and live enforcement is incomplete).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Herfindahl-Hirschman Index $HHI = \sum s_i^2 \le 0.25$ guarantees that no individual source exceeds $25\%$.
  - Model correction: $HHI \le 0.25$ permits extreme skew if the tail is fragmented (e.g., one source at $40\%$ with 30 tiny sources yields $HHI \approx 0.16 + 30 \times (0.02)^2 \approx 0.172$). Concentration requires dual enforcement:
    1. Individual source share: $s_i \le 25\%$ across accepted windows.
    2. Provider family share: $\sum_{j \in \text{Family}_k} s_j \le 40\%$.
    3. Structural diversity via entropy $H(S) = -\sum s_i \ln s_i$.
- **Baseline Data**: Timestamped source and provider family shares, canonical attribution, batch reservations, shared infrastructure dependency graphs.
- **Smallest Experiment**: Wire concentration checks into the publication gateway; simulate loss of the largest provider family and verify portfolio resilience.
- **Acceptance Criteria**: Limits enforced across all active writers; concentration improvements do not artificially discard valid supply merely to optimize metrics.
- **Rollback / Reopen Triggers**: Fall back to accepted baseline plus hard per-source ceilings; reopen upon concentration breaches or dependency drift.

#### MATH-09: Canonical Identity Resolution and Probabilistic Record Linkage
- **Core Question**: Which sightings represent the same vacancy while distinct roles remain distinct and provenance remains recoverable?
- **Current State**: PARTIAL (exact content hashes and URL deduplication implemented; cross-source entity linkage unvalidated).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Jaro-Winkler or embedding similarity thresholding with transitive closure (connected components) reliably resolves duplicate listings.
  - Model correction: Transitive closure over pairwise similarity creates catastrophic bridge errors (A matches B, B matches C, but A and C are entirely different jobs). Fellegi-Sunter record linkage requires estimation of agreement probabilities:
    $$m = P(\gamma \mid M), \quad u = P(\gamma \mid U)$$
    Log-likelihood ratios must be calibrated with explicit prior match probabilities. Canonical clusters must maintain stable identities, preserve all raw sightings, and support reversible splits.
- **Baseline Data**: Employer requisition IDs, normalized employer identities, canonical job URLs, structured job attributes, labeled match/non-match pairs.
- **Smallest Experiment**: Benchmark exact keys and URL normalizers against fuzzy matchers on held-out duplicate/non-duplicate pairs before modifying public entity resolution.
- **Acceptance Criteria**: Quantified false-merge ($\le 0.5\%$) and false-split rates; stable canonical IDs; reversible merge/split lineage without storing restricted text.
- **Rollback / Reopen Triggers**: Restore canonical mapping from raw provenance records; reopen after provider identifier format shifts.

#### MATH-10: Change Detection and Work Avoidance
- **Core Question**: Which repeated work can safely be skipped when source content is unchanged, and which policy/quality checks must still run?
- **Current State**: PARTIAL (HTTP ETag, Last-Modified, conditional fetch, and SHA-256 body hashes exist in `conditional.ts`; invalidation coverage unverified).
- **Mathematical / Theoretical Model**:
  - Naive assumption: An identical HTTP response hash implies zero logical changes and zero required processing.
  - Model correction: Cryptographic payload hash equivalence does not equal semantic static state. Time-dependent policies (posting freshness expiry, license lease expiration, source opt-outs, and model/prompt version bumps) require state updates even when the upstream payload is unchanged. Conditional 304 responses consume an HTTP request and must be accounted for in rate budgets.
- **Baseline Data**: HTTP headers (ETag, Last-Modified), response SHA-256 digests, parse and model execution costs, rule and policy invalidation events.
- **Smallest Experiment**: Evaluate hash-based short-circuiting with forced invalidation tests (e.g., expired policy lease with unchanged payload).
- **Acceptance Criteria**: Verifiable reduction in processing cost without missing material changes, suppressing policy expiries, or corrupting liveness heartbeats.
- **Rollback / Reopen Triggers**: Bypass short-circuiting on indeterminate cache state; reopen following upstream source schema or policy revisions.

#### MATH-11: Cost-Aware AI Cascade and Value of Information (VoI)
- **Core Question**: When does another model call improve a permissible decision enough to justify its total cost, latency, and risk?
- **Current State**: OPEN (AI triage and consensus skeptic paths exist; causal decision value and net cost-benefit unmeasured).
- **Mathematical / Theoretical Model**:
  - Naive assumption: High model uncertainty (probabilities near 0.5) automatically justifies calling an expensive secondary model.
  - Model correction: Value of Information (VoI) is defined by expected utility improvement minus evaluation cost:
    $$\text{VoI}(X) = E_{x}[\max_{a} U(a, x)] - \max_{a} E_{x}[U(a, x)] - C(\text{Inference})$$
    If the optimal action does not change across outcomes, $\text{VoI} = 0$ regardless of uncertainty. In addition, confident model errors carry negative utility. AI decisions must support explicit ABSTAIN / HOLD outcomes and cannot grant source authority.
- **Baseline Data**: Deterministic gate outcomes, matured ground-truth labels, token and provider costs, invocation latencies, model disagreement rates.
- **Smallest Experiment**: Offline comparison of a zero-model heuristic, a low-cost model, and a multi-model consensus judge on an identical temporal holdout cohort.
- **Acceptance Criteria**: Demonstrated positive net decision value exceeding inference costs; enforcement of the $\$0.05$ per-job publication cost ceiling and 500 AI calls/day budget.
- **Rollback / Reopen Triggers**: Revert to deterministic rule-based triage on model failure, latency spikes, or negative VoI; reopen after model repricing or quality shifts.

#### MATH-12: Source Health and Statistical Process Control (SPC)
- **Core Question**: How do we detect meaningful loss or corruption without treating normal emptiness, cadence skips, or missing telemetry as source failure?
- **Current State**: PARTIAL (local diagnostic failure receipts exist; live 503 incident monitoring unverified).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Standard Shewhart 3-sigma control charts or fixed-threshold alarms reliably detect source breakage.
  - Model correction: Scraping metrics (item counts, error rates) are non-Gaussian, discrete, zero-inflated, and subject to strong diurnal/weekly seasonality. Standard Shewhart charts generate severe false-alarm floods during weekend volume drops.
  - Statistical formulation: Cumulative Sum (CUSUM) or Exponentially Weighted Moving Average (EWMA) charts designed for Poisson/negative-binomial count data, adjusting for expected diurnal intensity $\lambda(t)$ and allocating a bounded false-alarm budget $\alpha$.
- **Baseline Data**: Pipeline stage metrics (HTTP attempts, parse successes, persistence counts, publication counts), historical seasonal baselines, past failure logs.
- **Smallest Experiment**: Replay historical failure scenarios (schema changes, HTTP 429 rate limits, empty weekends, database connection drops) against SPC detectors.
- **Acceptance Criteria**: Quantified mean time to detection (MTTD) and low false-alarm rate ($< 1$ false alarm/month); cause-specific automated quarantine without penalizing healthy empty sources.
- **Rollback / Reopen Triggers**: Fall back to documented static rule thresholds on telemetry failure; reopen following alert storms or unflagged pipeline outages.

#### MATH-13: End-to-End Latency Profiling and Amdahl's Law
- **Core Question**: Which measured stage limits end-to-end performance, and what improvement is actually worth maintaining?
- **Current State**: PARTIAL (stage latency measurement contracts exist in `stage-latency.ts`; production profile unverified).
- **Mathematical / Theoretical Model**:
  - Naive assumption: Accelerating CPU processing or adding parallel workers yields proportional pipeline speedup.
  - Model correction: By Amdahl's Law:
    $$S_{\text{overall}} = \frac{1}{(1 - P) + \frac{P}{S_{\text{stage}}}}$$
    where $P$ is the fraction of total execution time spent in the optimized stage. In web scraping, network I/O, external rate limits, and database writes dominate ($P_{\text{CPU}} \ll 0.10$). Accelerating CPU tasks yields negligible overall speedup while introducing serialization overhead and complexity.
- **Baseline Data**: Wall-clock latency profiles partitioned into: DNS/network fetch, HTML/XML parsing, AI inference, SQLite/D1 database transactions, queue wait time.
- **Smallest Experiment**: Instrument a representative end-to-end run; calculate exact $P$ and theoretical maximum speedups before optimizing any component.
- **Acceptance Criteria**: Verified end-to-end latency reduction or evidence that current performance is I/O-bound; no premature optimization of non-bottleneck components.
- **Rollback / Reopen Triggers**: Revert complex optimizations that fail to achieve measured latency reductions; reopen when workload profile shifts.

---

## 3. DeepSeek-Inspired Operational Requirements and Architecture (SSAE-CED)

The **Sparse Source Attention Engine & Causal Enrichment-Decision (SSAE-CED)** architecture adapts structural efficiency ideas from modern sparse foundation models (e.g., DeepSeek V4.1-Flash) into a high-throughput, low-cost ingestion system.

### Core Architectural Principles
1. **Sparsity Over Brute-Force**: Do not poll every source or evaluate every job listing with full computation. Direct processing attention only where fresh, high-utility vacancies are concentrated.
2. **Cheap Recognition Before Expensive Reasoning**: Pass candidates through layered, low-cost deterministic filters (regex, URL syntax, location string matching, wall-calendar checks) before invoking LLM triage or deep enrichment.
3. **Compact Source Memory (SSAE-02)**: Maintain lightweight state footprints per source (ETags, hashes, rate limits, observed cadence, yield history) to enable stateless workers to make coordinated, state-aware decisions.
4. **Exclusive Processing Modes (SSAE-07)**:
   - `FULL`: Complete crawl, validation, and re-scoring (used on cold start or schema invalidation).
   - `REINDEX`: Re-evaluate search indexing and metadata without re-fetching raw payloads.
   - `REUSE`: Skip fetch and processing if upstream ETag/hash proves zero payload modification.
   - `BOUNDED_REPLAY`: Replay verified historical events within a strict temporal window to audit or restore state without triggering external requests.
5. **Field-Sensitive Job Delta & Exact Bounded Replay (SSAE-09)**: Compute granular field digests (title, URL, location, description). When an existing vacancy updates, re-evaluate only the modified fields (e.g., re-run geoGate if location changes; skip AI triage if only formatting changed).
6. **Top-K / Budgeted Attention Allocation (SSAE-03, SSAE-08, SSAE-10)**: Hierarchically rank candidate sources based on expected marginal Philippines-eligible yield divided by cost, executing only the top-$K$ actions within each scheduling epoch.
7. **Global Host Pacing & Shared Reservations (SSAE-12)**: Enforce domain-level concurrency and rate limits across distributed workers (e.g., Cloudflare Workers, Cloud Run, Inngest) to prevent correlated 429 rate-limit storms.
8. **Bounded AI Value of Information Routing (SSAE-13 / MATH-11)**: Route listings to AI triage only when deterministic rules yield genuine ambiguity (`gate.phEligibility === "unclear"`). Skip AI for deterministic passes or hard rejections.
9. **Controlled Scheduling Canaries (SSAE-14) & Graduation (SSAE-15)**: Changes to source allocations must run in shadow or bounded canaries ($< 10\%$ traffic) before full adoption, backed by automated rollback.
10. **Five Standardized Maturity States**:
    $$\text{PROPOSED} \longrightarrow \text{IMPLEMENTED} \longrightarrow \text{DEPLOYED} \longrightarrow \text{OBSERVED} \longrightarrow \text{ACCEPTED}$$
    Progress between states requires verifiable operational evidence, never documentation claims alone.

---

## 4. Deep Dive: `PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE`

This unit represents the highest-leverage prerequisite identified in the 2026-10-10 systems audit (`astra777.txt`).

### 4.1 The Demonstrable Vulnerability
Prior to this specification, the fresh scrape ingestion flow (`apps/web/src/pages/api/cron/scrape.ts`) exhibited two severe flaws:
1. **Public Exposure on Gateway Failure (Late Gating)**:
   - Fresh items were inserted into `opportunities` via `publishGroupedInserts`:
     ```ts
     db.insert(opportunities).values(batch).onConflictDoNothing().returning({ id: opportunities.id });
     ```
     This set `is_active = 1` and `ph_eligibility = 'eligible'` / `'eligible_likely'`.
   - The publication gateway's `hasCurrentOwnership` check then evaluated freshness:
     ```ts
     if (assessPostingFreshness(postedAt, now).state !== "WITHIN_WINDOW") return false;
     ```
   - When `hasCurrentOwnership` returned `false`, the gateway returned `postPersistenceFailure` (HTTP 500, `exposure: "UNKNOWN"`) and wrote no success ledger.
   - **However, the rows were ALREADY physically in the database!** Because public queries rely on `publicOpportunityFilters()`:
     ```ts
     and(eq(opportunities.isActive, true), inArray(opportunities.phEligibility, PUBLIC_PH_ELIGIBILITIES))
     ```
     The invalid, stale, future, or undated rows were **immediately visible to public users** and indexed in `opportunities_fts`!
2. **Silent Rollover of Impossible Calendar Dates**:
   - Standard JavaScript Date parsing rolls over invalid days:
     ```ts
     Date.parse("2026-09-31T12:00:00.000Z") === Date.parse("2026-10-01T12:00:00.000Z")
     ```
   - Feed items with impossible dates (e.g., September 31) were normalized to October 1.
   - The downstream gateway and public filters saw a valid October 1 date and granted HTTP 200 with a successful publication ledger ID!

### 4.2 Core Invariant
> **Original posting evidence must be valid, known, nonfuture, and within unchanged inclusive 30 days before physical public exposure. Normalization cannot fabricate validity.**

### 4.3 Why Normalization Cannot Fabricate Validity
1. **Downstream Indistinguishability**: If `Date.parse()` or `new Date()` normalizes an impossible calendar string (`2026-09-31`) into an ISO string (`2026-10-01T12:00:00.000Z`), all subsequent validation steps lose the original evidence. A late check cannot distinguish an authentic October 1 posting from a repaired September 31 posting.
2. **Missing Dates Cannot Default to Present Time**: If an RSS item lacks `<pubDate>`, or a JSON job lacks `date`, the parser or ingest pipeline must not substitute `scraped_at`, `observedAt`, or `new Date()`. Defaulting to fetch time conceals stale vacancies and fabricates freshness.
3. **Sub-Millisecond Precision**: Date objects truncate timestamps to 3 decimal places (milliseconds). A posting with a fractional timestamp in the future (e.g., `2026-10-10T12:00:00.000000001Z`) would be truncated to `12:00:00.000Z`, falsely appearing current. Raw precision must be preserved until freshness evaluation.
4. **Pre-Persistence Gating**: Gating must happen **before** database persistence. Once an opportunity row is inserted with `isActive = true`, downstream failures cannot undo the immediate exposure under optimistic read architectures.

### 4.4 Architecture of the Solution
The complete defense involves three coordinated layers:

#### Layer 1: Parser Calendar Validation (`packages/scraper/source-posting-date.ts`)
- `normalizeSourcePostingDate(value: unknown): string | null`
  - Validates ISO 8601 strings and RFC 5322 RSS dates **before** `Date` conversion.
  - Verifies the unshifted wall clock via `isAdmissionInstant(wallClock)`.
  - For RFC 5322 RSS formats (`pubDate`): extracts day, month, year, time, and timezone/offset; constructs the UTC wall string; validates calendar correctness; and asserts:
    $$\text{millis} + \text{offset} \times 60000 \equiv \text{Date.parse}(\text{wall})$$
  - Preserves fractional precision beyond milliseconds if present.
  - Returns `null` for missing, unparseable, impossible calendar, or invalid hour inputs.

#### Layer 2: Pre-Triage Ingestion Prefence (`apps/web/src/pages/api/cron/scrape.ts`)
- Before items enter AI triage or public staging:
  ```ts
  const freshness = assessPostingFreshness(item.postedAt, observedAt);
  if (freshness.state !== "WITHIN_WINDOW") {
    postingFreshnessWithheld += 1;
    rejectedItems.push({
      ...item,
      isActive: false,
      inactiveReason: `posting-freshness-${freshness.state.toLowerCase()}`,
      postedAt: freshness.postedAt,
      // ...
    });
    continue;
  }
  gatePassedItems.push({ item, gate });
  ```
- **Crucial Rule**: Items with invalid, missing, future, or stale dates are set `isActive: false` and routed to `rejectedItems`. They are never queued for `pending_triage` or feed recovery, preventing backdoor publication.

#### Layer 3: Gateway Defense-in-Depth (`packages/scraper/publication-gateway.ts`)
- In `hasCurrentOwnership`, every inserted ID is read back from the database and evaluated:
  ```ts
  if (assessPostingFreshness(postedAt, now).state !== "WITHIN_WINDOW") return false;
  ```
- If an item somehow evaded pre-persistence gating, the gateway refuses to write a publication ledger, halts sequential batch writes, and logs `POST_PERSISTENCE_FAILURE`.

---

## 5. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Freshness | `assessPostingFreshness` | Evaluates posting instant against reference clock across 30-day inclusive window | `originalPostedAt: unknown`, `observedAt: string` | `PostingFreshnessAssessment` (`state`, `postedAt`) | Returns `UNKNOWN` for null/empty; `INVALID` for malformed/impossible calendar; `FUTURE` if age < 0; `STALE` if age > 30d | `packages/scraper/publication-freshness.ts` |
| 2 | Parser | `normalizeSourcePostingDate` | Validates raw ISO/RFC 5322 strings before Date rollover; preserves sub-ms precision | `value: unknown` | Normalized ISO string or `null` | Returns `null` on invalid calendar (e.g. Sep 31), non-leap year Feb 29, invalid hour 24:01, or bad offset | `packages/scraper/source-posting-date.ts` |
| 3 | Scraper Pipeline | Pre-Triage Freshness Prefence | Filters scraped items before AI triage and before public DB staging; withholds non-fresh items | `item.postedAt`, `observedAt` | Routes to `gatePassedItems` or `rejectedItems` | Inactive row persisted with `inactiveReason: "posting-freshness-${state}"`; withheld counter incremented | `apps/web/src/pages/api/cron/scrape.ts:2795` |
| 4 | Publication Gateway | `hasCurrentOwnership` | Post-persistence verification of source ownership, outbound URL, remote type, and freshness | `db`, `sourceId`, `ids: number[]`, `now: string` | `boolean` (true if all owned and fresh) | Returns `false` on any non-fresh row, invalid URL, or non-remote locationType | `packages/scraper/publication-gateway.ts:371` |
| 5 | Publication Gateway | `publishPublicExposure` | Atomically verifies policy lease, persists rows, checks ownership, and records ledger | `db`, `request: PublishPublicExposureRequest` | `PublishPublicExposureResult` | Returns `postPersistenceFailure` (`exposure: "UNKNOWN"`) if ownership or ledger fails | `packages/scraper/publication-gateway.ts:297` |
| 6 | Publication Gateway | Lost Acknowledgement Logging | Records written IDs when ledger insertion fails after row persistence to preserve prefix | `db`, `request`, `ids: number[]` | Records in `source_publication_lost_acknowledgements` | Retains IDs for reconciliation; stops later sequential writers | `packages/scraper/publication-gateway.ts:526` |
| 7 | Host Pacing | Shadow Host Backoff | Persistent domain-level cooldown across hourly shadow runs to prevent 429 storms | Host, HTTP response status, `Retry-After` header | Database record in `shadow_host_backoff` | Skips host probes during cooldown; prevents resetting qualification window | `packages/scraper/shadow-host-backoff.ts`, migration 0051 |
| 8 | Entity Deduplication | `toContentHash` / URL Dedup | Generates deterministic SHA-256 hash from normalized title and canonical source URL | `title: string`, `sourceUrl: string` | 16-character hex hash string | Ignores duplicates on DB conflict (`onConflictDoNothing()`) | `packages/scraper/contentHash.ts` |
| 9 | Public Serving | `publicOpportunityFilters` | Canonical SQL filter selecting active, PH-eligible opportunities for public queries | None | SQL binary expression `(is_active = 1 AND ph_eligibility IN (...))` | Inactive or ineligible rows are excluded from public index and detail | `apps/web/src/lib/public-opportunities.ts:11` |
| 10 | Unclear Sweep | `sweepUnclearBacklog` | Secondary AI re-triage of stored unclear opportunities; requires gateway before visibility upgrade | Unclear rows in DB, AI binding | Upgrades row to `eligible_likely` via gateway | Without gateway fence, upgrades visibility without source/date/URL checks | `apps/web/src/pages/api/cron/scrape.ts:1281` |
| 11 | SSAE Processing | `ProcessingModes` | Governs execution depth per source: FULL, REINDEX, REUSE, BOUNDED_REPLAY | `sourceId`, `mode`, `cacheState` | Execution plan | Reverts to FULL on cache miss, TTL expiry, or schema invalidation | `scripts/lake/processing-modes.ts` |
| 12 | Candidate Hierarchy | Two-Tier Candidate Pool | Maintains bounded candidate pools with event-driven updates and cold revisit triggers | Lake observations, yield history | Top-$K$ candidate list | Fences stale pools; prevents full $O(N)$ rescore every epoch | `scripts/lake/candidate-pool.ts` |
| 13 | Delta Processing | Job Delta Replay | Computes field-sensitive digests and executes selective replay for modified attributes | Existing opportunity, new sighting | Field diff, selective updates | Withholds updates that violate current policy; propagates withdrawals | `scripts/lake/job-delta-replay.ts` |
| 14 | Cost-Aware AI | Consensus Skeptic (L2) | Multi-model consensus where a skeptic model refutes borderline AI triage approvals | Listing metadata, initial AI verdict | `consensus-split` or `eligible` | Splits are quarantined inactive with evidence | `apps/web/src/pages/api/cron/scrape.ts:2943` |
| 15 | Calendar Validation | `isAdmissionInstant` | Validates strict ISO string format and verifies round-trip equality through JavaScript Date | `value: unknown` | `boolean` | Returns `false` for any impossible date (e.g. Sep 31) because Date round-trip changes value | `packages/scraper/admission-evidence.ts:140` |

---

## 6. Edge Cases & Boundary Conditions

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `normalizeSourcePostingDate` | `null` or `undefined` | Returns `null`. Downstream `assessPostingFreshness` marks `state: "UNKNOWN"`. Pipeline withholds item as inactive (`posting-freshness-unknown`). |
| 2 | `normalizeSourcePostingDate` | `"not-a-date"` | Regex match fails; returns `null`. Pipeline marks `state: "UNKNOWN"` or `INVALID`; item withheld. |
| 3 | `normalizeSourcePostingDate` | `"2026-09-31T12:00:00.000Z"` (Impossible calendar: Sep has 30 days) | `isAdmissionInstant("2026-09-31T12:00:00.000Z")` fails because `new Date()` rolls over to Oct 1. Returns `null`. Item withheld inactive. |
| 4 | `normalizeSourcePostingDate` | `"2026-02-29T12:00:00.000Z"` (Non-leap year 2026) | `isAdmissionInstant` fails (rolls to Mar 1). Returns `null`. Item withheld inactive. |
| 5 | `normalizeSourcePostingDate` | `"2024-02-29T12:00:00.000Z"` (Valid leap year 2024) | `isAdmissionInstant` passes. Parsed date is in 2024 (>30 days old). `assessPostingFreshness` marks `state: "STALE"`. Item withheld. |
| 6 | `normalizeSourcePostingDate` | `"2026-10-09T24:01:00.000Z"` (Invalid hour 24) | Fails ISO regex or `isAdmissionInstant`. Returns `null`. Item withheld inactive. |
| 7 | `normalizeSourcePostingDate` | `"2026-10-09"` (Date-only string) | Fails ISO datetime regex `ISO_POSTING_DATE`. Returns `null`. Item withheld inactive. |
| 8 | `normalizeSourcePostingDate` | `"Fri, 09 Oct 2026 12:00:00 GMT"` (RFC 5322 RSS format) | Matches `RSS_POSTING_DATE`. Wall clock validates. Converted to `"2026-10-09T12:00:00.000Z"`. Passes freshness; approved. |
| 9 | `normalizeSourcePostingDate` | `"Fri, 09 Oct 2026 14:00:00 +0200"` (RSS with numeric offset) | Matches `RSS_POSTING_DATE`. Offset computed ($+120$ min). Normalized to `"2026-10-09T12:00:00.000Z"`. Passes freshness; approved. |
| 10 | `assessPostingFreshness` | Exactly 30 days old ($T_{\text{now}} - 30 \times 86400000$) | Evaluates age $\equiv 30 \times 86400000 \times 10^6$ ns. Marked `state: "WITHIN_WINDOW"`. Preserved and approved. |
| 11 | `assessPostingFreshness` | 30 days plus 1 millisecond old | Evaluates age $> 30$ days. Marked `state: "STALE"`. Item withheld inactive (`posting-freshness-stale`). |
| 12 | `assessPostingFreshness` | 30 days plus 1 nanosecond old (`.999999999Z`) | BigInt sub-millisecond calculation detects boundary breach. Marked `state: "STALE"`. Item withheld inactive. |
| 13 | `assessPostingFreshness` | Future by 1 millisecond ($T_{\text{now}} + 1\text{ms}$) | Evaluates age $< 0$ ns. Marked `state: "FUTURE"`. Item withheld inactive (`posting-freshness-future`). |
| 14 | `assessPostingFreshness` | Future by 1 nanosecond (`.000000001Z`) | BigInt sub-millisecond calculation detects future instant. Marked `state: "FUTURE"`. Item withheld inactive. |
| 15 | Scrape Pipeline | Mixed batch: 1 missing, 1 fresh, 1 impossible Sep 31 | Fresh item passes to AI triage and public insert; missing and Sep 31 items persisted inactive (`isActive: false`). Visible count = 1. Ledger IDs = `[fresh_id]`. |
| 16 | Scrape Pipeline | Empty raw feed (`items = []`) | Pipeline completes with 0 inserts, 0 visibility changes, 0 gateway reads, 0 ledger rows. Status 200. |
| 17 | Scrape Pipeline | Duplicate posting (same title and URL already active) | Content hash conflicts in DB (`onConflictDoNothing()`). Returning array is empty. 0 new ledger rows written. |
| 18 | Publication Gateway | Post-write date drift (row modified between insert and check) | `hasCurrentOwnership` detects non-fresh row. Returns `postPersistenceFailure`. Route returns 500 / `UNKNOWN`. Stored row remains; no ledger written. |
| 19 | Publication Gateway | Multi-source batch with second source drift | First source completes and writes ledger (confirmed prefix); second source fails in `hasCurrentOwnership`. Process stops; later sequential writers blocked. |

---

## 7. Conclusions and Recommendations for Orchestration

1. **Prerequisite Dependency Chain**:
   - `PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE` is verified as the mandatory first foundation. Without it, physical public exposure corrupts downstream metrics, making daily publication counts uncertified.
   - Next critical writer to secure: `PUBLICATION_UNCLEAR_BACKLOG_VISIBILITY_BOUNDARY` (the unclear sweep in `scrape.ts:1281` which upgrades rows to public visibility without gateway checks).
   - Third critical foundation: `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL` (safely withdrawing physical rows when post-persistence failures or later drift occur).
2. **Mathematical Execution**:
   - Maintain strict separation between prerequisite completion and whole MATH card resolution.
   - Progress cards through rigorous empirical testing rather than premature status upgrades.
3. **SSAE-CED Operational Integration**:
   - Integrate freshness hazard and priority scores directly into the Top-$K$ budgeted attention allocator (`SSAE-10`), ensuring limited crawl budgets focus exclusively on high-probability fresh Philippine-eligible opportunities.
