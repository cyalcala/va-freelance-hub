### v5.2 addition: optional human research through the lake

The owner authorizes planning for human-supplied companies, sources, links,
pasted sheets and research as an optional input alongside autonomous discovery.
Every submission goes through Turso batch capture, classification, deduplication,
permitted link checks, enrichment, potential evaluation, prospecting and the same
source admission, job qualification and controlled publication gates. Humans
supply leads; automation performs the follow-through. Routine operation must
continue without human submissions. Submission is not collection/publication
approval. No runtime capability is certified by this planning addition.

The [human research intake plan](HUMAN_RESEARCH_INTAKE_PLAN.md) defines HRI-01 through HRI-05,
input limits, automated processing, receipts, dependencies and acceptance.
These slices belong to the existing Source Perpetuity execution queue. Local
intake work may begin independently; public dispatch depends on publication
control closure. Track origin and marginal contribution without double-counting
fresh jobs toward the shared 100 to 150/day publication target. Maintain dated
past/current/next evidence. Trigger.dev is not currently used or required.

 Mathematical improvement plan and working register

Version 5.2 · 2026-09-27 · All thirteen challenges from `math777.txt`

**Strategy:** [Mathematical improvement strategy](../MATHEMATICAL_IMPROVEMENT_STRATEGY.md).
**Session contract:** [master prompt](../bootloaders/MASTER_OPERATING_PROMPT.md).
**Current work:** newest [savepoint](../SYSTEM_SAVEPOINT.md) through
[CURRENT](../bootloaders/CURRENT.md).

This is the owner-requested program decomposition and working register. It links
source-changing units into the existing [Source Perpetuity plan](SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md);
it does not replace that executable queue or reactivate completed units.
Ordinary authorized maintenance should advance the highest-value ready challenge.
Do not seek repeated approval for work already in scope. Before consequential
execution, establish the bounded unit, affected controls and existing authority.

## 1. Current position and evidence rules

Baseline: September 27 review of source SHA
`7290bea8b3c0bc9df68d109afc7477a34dcafff4`; runtime findings and test limitations
are in the [repository report](../audits/2026-09-27-REPOSITORY-CHECK.md).
Current production measurements are not supplied by this planning task.

**Program position:** strategy and thirteen work cards specified; no new runtime
solution delivered by version 5.2. **Accepted resolutions: 0/13.** Existing helper
code is partial implementation, not automatically an accepted program solution.
Do not substitute this count for whole-project progress.

| ID | Challenge | Initial state | Production-rollout prerequisites |
| --- | --- | --- | --- |
| MATH-01 | Dynamic source allocation | OPEN — reward/decision data not validated | MATH-00, 03, 04, 06, 08, 12; 02 capacity envelope |
| MATH-02 | Queueing and backpressure | OPEN — pure helpers; live telemetry unverified | MATH-00, 06, 12 |
| MATH-03 | Marginal source portfolio coverage | OPEN — overlap/cost baseline required | MATH-00, 05, 06, 09; 08 limits characterized |
| MATH-04 | Arrival modeling and adaptive polling | DELIVERED (cooldown) — persistent host backoff migration 0051 deployed; live streak accumulation active | MATH-00, 02, 06, 12 |
| MATH-05 | Qualification and calibration | OPEN — denominator defect identified | MATH-00; controlled evaluation before publication |
| MATH-06 | Publication states and guarded transitions | OPEN — concrete control defects identified | MATH-00 contract/evidence mapping; incident containment can precede complete telemetry |
| MATH-07 | Reservoir value and freshness decay | OPEN — empirical survival/cost data missing | MATH-00, 02, 05, 06, 09 |
| MATH-08 | Diversity and correlated failure risk | OPEN — concentration caller unwired | MATH-00, 06, 09; source/family attribution |
| MATH-09 | Canonical identity and record linkage | OPEN — labeled linkage evaluation needed | MATH-00; bounded fixtures and provenance |
| MATH-10 | Change detection and work avoidance | OPEN — invalidation coverage unverified | MATH-00; 05/06/09 invalidation contracts |
| MATH-11 | Cost-aware AI cascade | OPEN — causal benefit/cost evidence missing | MATH-00, 05, 06; independent matured labels |
| MATH-12 | Statistical source health monitoring | OPEN — live 503 incident requires refresh | MATH-00; low-risk incident evidence can start immediately |
| MATH-13 | End-to-end latency and Amdahl analysis | OPEN — comparable profile required | MATH-00; read-only profiling can start immediately |

Prerequisites describe required capabilities/evidence, not a demand that every
related research topic be terminal before a safe local experiment. Record the
precise dependency being used. MATH-00 is shared enabling work, not a fourteenth
challenge or a pretext to build a large observability platform.

## 2. Shared foundation — MATH-00

Reuse current schema, logs, fixtures and reports to define a minimal consistent
event/measurement contract: exact source/family and canonical job identity,
source posted/updated/observed times, queue admission/exit, decision and policy
version, publication receipt, legal acquisition scope, rejection/hold reason,
resource use, sampling coverage and missingness.

Map each required field to an actual table/event or an explicit gap. Retain a
reproducible query and fixture for the measured outcome. Never invent a database
column to fit a formula. New telemetry must be bounded and necessary for a named
decision. Foundation acceptance is per-unit usable evidence, not a perfect
system-wide dataset before any repair can begin.

## 3. Resolution cards — all thirteen must be advanced

### MATH-01 — Dynamic source allocation

- **Question:** Which permitted source should receive the next bounded unit of
  fetch/processing budget to improve marginal qualified fresh public supply?
- **Baseline/data:** current scheduler; per-source action availability, cost,
  canonical overlap, delayed qualified/publication outcomes and failure reasons.
- **Model correction:** yield divided by arbitrary cost is not necessarily in
  [0,1]. Define compatible units and either a bounded reward with a suitable
  bandit or a justified cost-aware model. Beta-Bernoulli updates require a
  defensible binary observation model; continuous economic reward is not a
  Bernoulli observation. Record cold-start handling and nonstationarity. Static
  cadence does not universally imply linear regret; the comparator matters.
- **Smallest experiment:** replay an explicit deterministic allocation baseline;
  then compare a bounded adaptive candidate in nonpublishing shadow with legal
  action sets, mature rewards and reproducible decision logs.
- **Acceptance:** demonstrated benefit or evidence that the simpler baseline is
  adequate; cadence, budget, concentration and queue bounds hold. Specify sample,
  effect, uncertainty and observation window before testing. Do not claim regret
  guarantees from rewards for unobserved actions.
- **Rollback/reopen:** restore baseline allocation on missing logs, stale authority,
  drift or harm; reopen on persistent marginal-yield or cost deterioration.

### MATH-02 — Queueing and backpressure

- **Question:** Where does admitted work wait, and how can intake/processing be
  bounded without losing permitted useful work or violating freshness?
- **Baseline/data:** per-stage arrivals, departures including rejection/expiry,
  in-flight work, capacity, oldest age and residence distribution on one boundary.
- **Model correction:** a Jackson network requires assumptions not established
  by the note. Little's law does not require Poisson arrivals. A low-CV heuristic
  is not proof of stability; service capacity is not observed completions.
- **Smallest experiment:** measure queue conservation and compare simple bounded
  admission/concurrency controls. Test a PI controller only if justified, with
  explicit sampling interval, output limits, anti-windup, feedback delay and
  stability checks. Do not transplant the note's incremental-plus-integral rule
  without analyzing its dynamics.
- **Acceptance:** bounded backlog/age within accepted objectives under bursts,
  slow downstream service, retry and restart; preserve accounting and throughput.
- **Rollback/reopen:** known bounded controller on telemetry failure/oscillation;
  reopen when queue growth or freshness loss breaches the accepted envelope.

### MATH-03 — Marginal portfolio coverage

- **Question:** Which permissible sources add the most distinct useful coverage
  under real cost and risk constraints?
- **Baseline/data:** canonical job sets, exact source sightings, comparable
  windows, category coverage, cost and shared origins.
- **Model correction:** simple ratio-greedy selection under arbitrary costs does
  not automatically have the stated 1−1/e guarantee. State the exact optimization
  problem and algorithm. Bloom filters/HLL can support approximate scouting;
  their error must not silently suppress real unique jobs or certify exact overlap.
- **Smallest experiment:** compute exact marginal coverage for a bounded cohort;
  compare current selection and a cost-aware candidate against exhaustive search
  on small fixtures. Model uncertainty and time-varying coverage.
- **Acceptance:** measurable marginal qualified supply/coverage improvement or
  justified retention of the baseline, within current authority/budgets/diversity.
- **Rollback/reopen:** previous portfolio policy on degraded quality or cost;
  reopen when overlap, category gaps or source-loss exposure materially changes.

### MATH-04 — Arrival modeling and adaptive polling

- **Question:** Which permitted polling intervals meet freshness needs efficiently?
- **Baseline/data:** posting/observation intervals, censored arrivals between
  polls, weekday/hour effects, empty/unchanged results and request costs.
- **Model correction:** expected unread count 1 is a heuristic, not a proved
  optimum or SLA guarantee. Under a Poisson model it means probability of at
  least one arrival is 1−exp(−1), about 63.2%. Test overdispersion/bursts and
  model alternatives; distinguish posted time from detected time.
- **Smallest experiment:** compare bounded fixed cadence with a simple seasonal
  schedule before an NHPP/renewal controller. Simulate missed/late observations.
- **Acceptance:** an independently measured latency/cost tradeoff meeting current
  cadence and freshness bounds, with no source starvation or retry storms.
- **Rollback/reopen:** permitted fixed schedule on drift or missing telemetry;
  reopen after sustained arrival-pattern change. Allocation and polling share
  one budget envelope rather than competing independent controllers.
- **Evidence (2026-09-27, read-only D1):** the shadow clock's shared-host polling
  is the live failure mode. 6 admitted Workable shadow sources each hold 63-66
  RATE_LIMITED observations (Sept 11-19 storm era: up to 76/77 probes/day
  fleet-wide rate-limited; Sept 20+: 0-14/day, never zero). The transition
  gateway's zero-tolerance 8-day window (`ADMISSION_POLICY.minimumDays=8`,
  span >=7d, lookback 14d, latest <=48h) means residual 429s perpetually reset
  qualification, stranding ~300 qualified lake jobs (hunt-st alone 146 at
  lambda ~= 20.9 raw/day). Shadow dispatcher has no per-host backoff; the bulk
  discovery path's `rateLimitedHosts` shielding is the in-repo precedent.
- **Delivery (2026-09-27, commit `9295e8c`):** Implemented persistent host cooldown
  across hourly shadow ticks. Added migration `0051_shadow_host_backoff.sql` and
  applied to remote production D1 (`wrangler d1 migrations apply DB --remote`).
  Added `packages/scraper/shadow-host-backoff.ts` and `apps/web/src/lib/shadow-host-backoff-store.ts`
  implementing RFC 9110 Retry-After parsing and 24h default cooldown. Integrated into
  `apps/web/src/pages/api/cron/shadow-dispatch.ts`; skipped probes write no adverse
  observation rows, preventing self-inflicted 429 storms from resetting qualifying windows.
  Verified by 1,605 monorepo tests and CI run `36311670715`.

### MATH-05 — Qualification, selective prediction and calibration

- **Question:** How reliably do actual PH/remote qualification decisions match
  independent evidence, including difficult and abstained cases?
- **Baseline/data:** repair dimension-specific denominators; collect representative
  positive, negative and ambiguous adjudication cohorts with evidence provenance.
- **Model correction:** logistic regression is not automatically a calibrated
  Bayesian posterior. Keep hard exclusions and categorical states; probabilities
  augment uncertainty handling. Utility thresholds require the full declared loss
  model, including harmful accepts, missed opportunities and abstention. A score
  cannot grant source/publication authority.
- **Smallest experiment:** frozen temporal holdout against current deterministic
  rules; evaluate confusion measures, risk/coverage and calibration separately.
- **Acceptance:** correctly defined independent error estimates and appropriate
  bounds support the chosen decision rule under accepted limits; insufficient
  data remains insufficient. Include rule/model changes and subgroup failures.
- **Rollback/reopen:** accepted conservative baseline on drift, label loss or
  ceiling breach; renew adjudication after material source/model changes.

### MATH-06 — Controlled transitions and publication integrity

- **Question:** Can every public insert/reactivation be justified and bounded by
  the same current authority, item-quality and exposure controls?
- **Baseline/data:** review findings F1/F4; trace lake/cron/replay writers, registry
  fallback, opt-outs, leases, ledger, caps and public visibility.
- **Model correction:** model job state separately from source authority and
  operational state. Include HELD if emitted; validate transitions against actual
  schema. HHI is not a substitute for individual concentration limits. Revalidate
  time-sensitive guards at mutation; a passed earlier decision is insufficient.
- **Smallest experiment:** failing fixtures for the bypass, unknown identity,
  expired lease, opt-out, duplicate execution, receipt failure and concurrent cap
  consumption; design the smallest shared enforcement repair.
- **Acceptance:** every writer is covered; explicit legacy exceptions are bounded;
  exposure and receipts have tested atomic/reservation or compensating semantics;
  rollback and public withdrawal work. Local tests precede exact-version runtime
  observations under the authorized release process.
- **Rollback/reopen:** use accepted narrow containment; preserve incident evidence;
  reopen for any new writer, schema/control change or unexplained public exposure.

### MATH-07 — Reservoir depth and freshness decay

- **Question:** Which retained eligible evidence remains useful, and what bounded
  storage/replay policy avoids staleness and loss?
- **Baseline/data:** age origins, qualification/publication waits, live-link survival,
  removals, censored observations, storage costs and permissible retention.
- **Model correction:** a three-day half-life and 360–400 optimum are unmeasured
  assumptions. Publication is not consumer demand fixed at 120/day. Do not hold
  valid jobs back to ration daily supply. Inventory size alone does not prove
  closures; estimate the age distribution and survival process.
- **Smallest experiment:** compare current retention/revalidation with empirical
  age bands and a simple survival estimate before a parametric decay optimizer.
- **Acceptance:** useful replay/coverage retained within accepted cost/freshness
  bounds, honest non-fresh cohorts, and no publication delay introduced to game
  the floor. Quantify censoring and irreversible deletion effects.
- **Rollback/reopen:** retain allowed recoverable evidence before deletion;
  reopen after observed survival or storage-budget change.

### MATH-08 — Diversity, concentration and failure domains

- **Question:** How much useful supply is exposed to one source, family, origin,
  scheduler or other shared dependency, and where can it be diversified?
- **Baseline/data:** F2 null-inventory behavior; timestamped source/family shares,
  canonical attribution, aggregate reservations and dependency graph.
- **Model correction:** sum of squared fractional shares is ordinary HHI, not
  normalized HHI. HHI≤0.25 does not imply every share≤0.25. Entropy measures share
  distribution, not independence. Respect accepted per-source and family bounds
  separately, with declared denominators and handling of unknown attribution.
- **Smallest experiment:** wire validated inventory into the actual caller and
  test cumulative batch headroom/unknown inputs; simulate loss of the largest
  correlated risk domain using real marginal coverage.
- **Acceptance:** integrated limits hold across all applicable writers; diversity
  improvement is useful and does not silently redefine the accepted ceilings or
  discard sound existing supply merely to improve a chart.
- **Rollback/reopen:** accepted baseline plus narrow guard on invalid data;
  reopen for concentration, dependency or attribution drift.

### MATH-09 — Identity resolution and probabilistic linkage

- **Question:** Which sightings are the same vacancy while distinct roles remain
  distinct and provenance remains recoverable?
- **Baseline/data:** requisition IDs, employer/source identities, canonical URLs,
  permitted factual features and independently labeled match/non-match pairs.
- **Model correction:** Fellegi–Sunter likelihood ratios need priors and modeling
  assumptions to become posterior probabilities. Similarity is not equivalence;
  thresholded connected components can merge A with C through B despite a poor
  A–C match. Test bridge errors, employer/requisition conflicts and false splits.
- **Smallest experiment:** exact keys and normalized URLs first; compare any
  fuzzy method on held-out pairs and clusters before affecting public identity.
- **Acceptance:** measured false-merge/false-split tradeoff, stable canonical IDs,
  preserved sightings and reversible merge/split lineage. Ambiguous clusters
  remain reviewable. Do not store restricted descriptions for embeddings.
- **Rollback/reopen:** restore canonical mapping from retained provenance;
  reopen after provider identifiers or normalization rules change.

### MATH-10 — Change detection and differential work

- **Question:** Which repeated work can safely be skipped when source content is
  unchanged, and which policy/quality checks must still run?
- **Baseline/data:** response validators, permitted digests, actual parse/model/write
  costs, source completeness and rule/evidence/version invalidation inputs.
- **Model correction:** equal digests do not imply zero fetch/hash cost or zero
  logical change. Cryptographic equality, conditional entropy and KL divergence
  answer different questions. Freshness, opt-outs, leases and policy changes can
  require work without a payload change.
- **Smallest experiment:** measured validator/digest shortcut with forced invalidation
  cases, periodic audit and unchanged/partial/empty-response fixtures.
- **Acceptance:** reduced measured cost without missed material updates, hidden
  expiry or suppressed observability; retained heartbeat reflects actual work.
- **Rollback/reopen:** bypass shortcut on uncertain validator/invalidation state;
  reopen after source schema or rule/model/policy revisions.

### MATH-11 — Cost-aware AI cascade and value of information

- **Question:** When does another model call improve a permissible decision enough
  to justify its total cost and risk?
- **Baseline/data:** deterministic outcomes, independent matured labels, costs,
  latency, abstentions, model-induced corrections and harmful changes.
- **Model correction:** uncertainty near 0.5 does not prove positive net value;
  confident errors can also have information value. Estimate expected loss
  reduction against the actual baseline, including adverse changes, delay and
  cost. Include HOLD/ABSTAIN where appropriate. An AI accept is not final source
  or publication authorization.
- **Smallest experiment:** logged offline comparison of no-model, cheaper model
  and bounded judge routes on the same independent cohort with temporal holdout.
- **Acceptance:** justified positive decision value or a validated no-call policy;
  applicable class authority, error bounds and budgets hold. Verify provider
  availability rather than prescribing the attachment's model names.
- **Rollback/reopen:** conservative deterministic/hold path on outage, malformed
  output or drift; reopen after pricing, model, evidence or loss assumptions change.

### MATH-12 — Source health and statistical process control

- **Question:** How do we detect meaningful loss or corruption without treating
  normal emptiness, cadence skips or missing telemetry as source failure?
- **Baseline/data:** actual attempt/fetch/parse/persist/publication stages, seasonal
  yield, coverage, gaps and labeled past incidents; refresh the EX-03 503 evidence.
- **Model correction:** Shewhart/CUSUM defaults need a suitable baseline, variance
  model, seasonality treatment and false-alarm budget. Handle sparse counts,
  zero variance and correlated samples. An alarm is a diagnostic signal, not
  proof of a broken parser or permission to broadly quarantine sources.
- **Smallest experiment:** conservative stage-aware rules plus offline replay of
  empty-normal, schema drift, persistence outage, rate limit and no-dispatch cases;
  compare statistical detection if simpler rules miss actionable incidents.
- **Acceptance:** detection delay and false alarms measured against independent
  incidents; correct cause-specific containment and recovery; no healthy-empty
  supply claim. Keep unknown storage/limit root causes explicit until diagnosed.
- **Rollback/reopen:** documented rule baseline when model inputs fail;
  reopen after a missed incident, alert flood or source-process shift.

### MATH-13 — Latency profiling and Amdahl's law

- **Question:** Which measured stage limits end-to-end performance, and what
  improvement is actually worth maintaining?
- **Baseline/data:** comparable workload profiles covering network, database,
  model, CPU, retries, cold start and serialization costs with queue wait separate.
- **Model correction:** Amdahl's P is the measured fraction affected, not all CPU
  by assumption. The note's P=0.06, speedup=10 gives about 1.057× only for that
  assumed workload; it does not measure this repository. Added boundaries can
  reduce gains. More concurrency still needs source and platform budgets.
- **Smallest experiment:** profile first, remove redundant work or improve bounded
  I/O before adding a runtime. Benchmark any specialist kernel including handoff
  cost, parity and fallback under allowed architectural controls.
- **Acceptance:** reproducible end-to-end benefit or demonstrated adequacy of the
  baseline; no regression in correctness, memory, cost or maintainability.
- **Rollback/reopen:** retain working implementation and restore it on regression;
  reopen after a materially different workload or runtime profile.

## 4. Working plan: next unit and session loop

**Current delivered unit:** PROMPT-MATH-PROGRAM-V5.2 — documentation/program design.
Runtime repair and mathematical outcome acceptance are not claimed.

**First selected implementation-planning unit:** `MATH-06A / PUBLICATION-AUTHORITY-CLOSURE`.
This instantiates the preceding audit's recommended next action; it does not
reopen a terminal SP unit. Source-domain dispatch is recorded in the existing
plan's September 27 overlay. Owner: the maintainer executing the next authorized
mathematical-program/maintenance session.

- **Start condition:** recover latest Git/production evidence and existing user
  authority. A new proven safety/outage incident can supersede this selection
  with its reason recorded in the savepoint.
- **Concrete action:** trace every publication/reactivation writer and turn F1/F4
  into a failing local fixture set plus one bounded repair contract.
- **Likely anchors:** `scripts/lake/sync-to-d1.ts`,
  `packages/scraper/publication-gateway.ts`,
  `apps/web/src/lib/publish-opportunities.ts`, related tests and migration 0041.
  Confirm actual files and ownership before edits.
- **Hypothesis:** one enforced writer contract can close the bypass/fallback
  without weakening item, source, lease, opt-out or cap rules.
- **Acceptance for 06A:** writer inventory with authority decisions, reproducible
  failure cases, selected design, scope, test plan and rollback; exact evidence
  for any legacy exception. No production SQL, sync or source promotion is needed
  to complete this first slice.
- **Follow-through:** when implementation is already authorized, proceed into the
  smallest repair slice after 06A; do not stop merely to seek redundant approval.
  Otherwise leave the concrete contract and exact missing authority boundary.
- **Incident prerequisite:** diagnose current EX-03 storage failures read-only if
  they block acceptance evidence; do not retry mutating routes to check health.

At each meaningful checkpoint:

1. Refresh the affected challenge's state, evidence window and prerequisites.
2. Choose one highest-value ready unit and explain its expected decision benefit.
3. Solve through baseline, method, test and measured effect; preserve failures.
4. If missing data blocks resolution, execute a bounded instrumentation/collection
   task within authority. Assign an owner and next trigger; advance independent
   ready work instead of permanently parking the program.
5. Record current unit/NEXT only in the savepoint; update this register's challenge
   status and evidence links. Do not maintain contradictory live copies.

## 5. State and resolution receipt

Use `OPEN -> MEASURING -> EXPERIMENTING -> IMPLEMENTING -> OBSERVING -> ACCEPTED`
as program tracking labels only, not database lifecycle enums. `BLOCKED` requires
a specific missing input, owner and next trigger. `REOPENED` names new failure
evidence. Model rejection is an experiment outcome; it does not automatically
close the operational challenge.

Every accepted challenge has this receipt:

```text
Challenge / unit / scope / responsible maintainer:
Baseline and evidence window / software-policy-data versions:
Question / estimand / units / feasible actions / constraints:
Assumptions and tests / data coverage and independent labels:
Simple baseline / alternatives / selected method and reason:
Experiment design / effect and uncertainty / negative results:
Actual implementation and all affected call paths:
Local checks / exact-version deployment / observed operational outcome:
Acceptance predicate and verdict / limits and remaining risks:
Rollback or compensation / reopen trigger / evidence links:
```

Report challenges by state, accepted count, blocked reasons and next dependency;
do not average unlike tests into a completion percentage. Define numerical effect,
sample/window and resource criteria in each unit before its experiment, using
accepted policy and baseline-derived practical significance. Do not tune success
criteria after seeing results. Hypothesis rejection is useful evidence.

## 6. Program exit and continued direction

Before claiming operational resolution of all thirteen challenges, verify their
receipts and cross-control behavior: allocation plus polling cannot overrun queue
or source budgets; concentration reservations cannot be bypassed by another writer;
identity changes cannot inflate flow; cache shortcuts cannot bypass renewed policy;
AI routing cannot grant publication authority; health alarms and rollback must
preserve recoverable evidence.

Then operate the renewal loop in the strategy: monitor measured service, retire
uneconomic complexity, exercise recovery and reserves, re-evaluate drift and work
on the next demonstrated supply constraint. Report three outcomes independently:
mathematical capability acceptance, sustained 100/day outcome, and autonomous
cutover acceptance. None implies the other two.

## Scheduling boundary

Trigger.dev is not currently used. Treat its repository assets as historical or future work. The current scheduling system uses the Cloudflare freshness Worker and GitHub Actions; adding Trigger.dev requires a separate architecture decision.
