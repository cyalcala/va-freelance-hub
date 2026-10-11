# Astra777 requirement reconciliation — 2026-10-11 Manila

## Recovery boundary

This read-only source reconciliation began after the root executor verified the
initial preservation checkpoint on both Secure Source Manager and GitLab at
`d8e28bc853c458e2f54de31cb9a2a318a051849e`. It then read `astra777.txt` in full,
including A–J, the continuation packet and portable evidence instructions. Astra
is the independent October 10 audit of behavior
`3ae421645e088f6e08ded9429a5790c8ecbcabfc`, with documentation-only checkpoint
`19c2031c6d41fd3ca8b7eb6b6eacf72904cc1da6`; its defect observations and NEXT are
dated. They must be reconciled with later source, not restarted wholesale.

Recovery also read the Global Miner overlay, the Source Replenishment
Masterplan's precedence/invariants and complete ten-condition Autonomy Cutover
Predicate, Source Perpetuity strategy/plan, ADR-007/006, all thirteen canonical
MATH cards, all SSAE-00..15 supporting cards, relevant sparse-attention strategy,
accepted parameters and metric correction. Source restrictions/opt-outs constrain
the constitution; the Source Perpetuity plan remains the sole source queue.
Savepoint owns the mutable baton; code/tests/observations settle factual claims.
This document adds proof/gap navigation, not another queue or acceptance decision.

No production DB/source request, runtime write, deployment, source admission,
parameter, provider, schedule or budget change occurred here. Current D1 binding
repair/tests belong to the root executor and separate test workstream; this
reconciliation does not duplicate them. Its only source mutation is this report.

## Historical findings against current source

| Astra finding | Current source/evidence | Remaining scope |
| --- | --- | --- |
| Fresh scrape exposed invalid originals; permissive calendar normalization could get successful receipts | Repaired locally at `f6753582a11ca7ffff70943ee69c3fdddbdc60b0`; [date evidence](PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE_2026-10-10.md), `apps/web/tests/native-fresh-scrape-posting-date.test.ts`. Raw dates are validated before normalization/public staging. | Preserve valid-format/boundary/mixed/zero/retry controls. Local native repair is not evidence that the executing image is this version, every legacy writer is covered or daily fresh flow is certified. |
| Active/unclear sweep performed an ID-only PH upgrade outside gateway | Repaired locally at `a14816e8ceeceb947f52f5693b005002ef7da91e`; [sweep evidence](PUBLICATION_UNCLEAR_BACKLOG_VISIBILITY_BOUNDARY_2026-10-10.md), `apps/web/tests/native-unclear-sweep.test.ts` and fixture. Current `sweepUnclearBacklog` projects source/date/type/URLs, requires explicit remote/original freshness/outbound resolution, calls gateway, and fences the same active/unclear row/source/date/URLs/type in its RETURNING UPDATE. Post-write UNKNOWN escapes catches. | Do not reopen the old missing-gateway defect. Native evidence has two qualified controls and eleven withheld rows; one ledger clock is explicitly projected. Negative/cursor paths remain separate; current source-policy races, full item origin, application liveness, stale boards and production behavior are not accepted by this repair. |
| Lost ledger acknowledgement had no durable repair marker | Local marker/reconciliation prerequisite at `e56ea9bbe5b25885d4559e1216d313ab771a59bd`; [lost-ACK evidence](PUBLICATION_LOST_ACKNOWLEDGEMENT_RECORD_2026-10-10.md), `packages/scraper/publication-uncertainty.ts`, gateway integration tests. | Only a valid acknowledged-ID ledger failure attempts a marker. Persistence exceptions, invalid acknowledgements and current-ownership failures return UNKNOWN without these known-ID markers. Marker-write failure is swallowed and remains UNKNOWN. Universal durable uncertainty and safe exposure bounds remain open. |
| No current-policy recheck immediately before persistence | Sequential re-read at `c59a65575c7fe77d059bc8b724df3e5855b5d6e6`; [policy evidence](PUBLICATION_SOURCE_POLICY_EPOCH_SEQUENTIAL_2026-10-10.md). | It is explicitly not a lock/transaction. Opt-out, lease or authority can change after this read and before physical mutation. Current row-source CAS does not fence registry authority. |
| Competing canary proposals could spend the same cap | Source/tick reservation at `7732842eb032e88d8f6b2c8ed1d8b4ceb29ebc6b`; [reservation evidence](PUBLICATION_SHARED_RESERVATION_2026-10-10.md), migration 0057 and gateway integration tests. | Single-database statement interleaving proves only its represented source/tick cap. Provider/global domains, competing caller ticks/channels, reservation identity/concurrent retry and mutation-time policy fencing remain open. Migration is recorded as unapplied. Unlimited exact-six writers are intentionally outside this reservation. |
| Public remote/date drift lacked withdrawal | Local repair at `a302004ab53b3767b504d2d2657beea7a0334f48`; `apps/web/src/lib/publication-drift-withdrawal.ts`, `apps/web/tests/native-publication-drift.test.ts`, invoked by authenticated verifier. | It withdraws explicit onsite/hybrid or known invalid original dates with current fact predicates. Unknown dates/null workplace remain. It does not withdraw source revocation/opt-out/other invalidity or rewrite the saved board; mass/LKG withdrawal remains unresolved. |
| Snapshot/readers could misstate stock as completed flow | Long local reader sequence, including `ee78258983d3621ab156cd8105c12a76bca5ad3b` and adversarial `96003df0d404e41b6ebf19c1eab8a6d38713788f`; [preservation reconciliation](ANTIGRAVITY_SWARM_PROGRESS_RECONCILIATION_2026-10-11.md). | A flow function always returning null prevents an unearned claim; it does not measure completed days. Membership inputs do not independently prove current PH/remote/date/Apply facts. Do not equate these tests with full uncertainty/withdrawal or MATH-08 acceptance. |
| Economics zero-denominator and low-CV diagnostics | Both remain reproducibly defective in current pure modules; details below. | These independent, unblocked repairs can proceed without admission, fetch, publication or a new controller. They unblock trustworthy measurement, not optimized allocation acceptance. |

## Canonical MATH requirement-to-proof map

Every row below is an assessed local proof/gap map. It does not amend the register's
accepted total **0/13**. All [canonical cards](../plans/MATHEMATICAL_IMPROVEMENT_PLAN.md)
retain their experiment, acceptance, rollback and reopen requirements.

| Card | Existing useful proof/mechanism | Smallest missing acceptance evidence and ready work |
| --- | --- | --- |
| 01 — Allocation | Pure advisory `scripts/lake/source-ranker.ts`; deterministic controls and feasibility exclusions. | Compatible mature marginal canonical first-exposure rewards and actual total costs. Repair unknown economics first, freeze an as-of-selection cohort, then compare deterministic baseline read-only. Do not infer unseen-action yield or Bernoulli guarantees from continuous reward. |
| 02 — Queue/backpressure | `scripts/ci/queue-metrics.ts`; stage latency contracts. | Same-boundary arrivals, all departures including rejection/expiry, in-flight conservation and time-weighted observations. Remove unsupported low-CV applicability; test bursts/retry/restart only after the represented queue contract is explicit. No new PI controller is required. |
| 03 — Marginal coverage | Source economics and pure canonical/delta mechanisms. | Exact bounded canonical source sets and comparable costs/windows; overlap and uncertainty. A small offline exhaustive fixture can compare candidate coverage against simple selection before deployment. Approximate membership must not suppress unique jobs. |
| 04 — Adaptive polling | Dated host-backoff delivery, migration 0051, `packages/scraper/shadow-host-backoff.ts`; historical run evidence in card and `docs/gauntlet/evidence/MATH-04-host-backoff-implementation-2026-09-27.md`. | Current censored arrivals, admitted action/cadence and latency/request tradeoff. Reconcile executing version/host domain and current observations before scheduling changes; preserve cooldown and avoid starvation/retry storms. |
| 05 — Qualification/calibration | Real parser/route freshness, PH partition, explicit remote and stored-row ACK checks; `publication-freshness.ts`, `geoGate.ts`, native tests. | Independent temporal/subgroup labels and correctly dimensioned error bounds, including abstentions/false negatives. Stored flags/model agreement are not independent truth. Use existing lawful evidence for an adjudication manifest; unknown denominator stays unknown. |
| 06 — Publication integrity | Gateway, held-row CAS, repaired sweep, known-ID uncertainty, per-source/tick reservation and drift withdrawal. | Mutation-time source authority, exact shared reservation identity, all-writer exceptions, complete unknown-effects/withdrawal contract and exact-version runtime. Highest ready safety work is the authority/reservation native counterexample unit below. |
| 07 — Reservoir/freshness decay | Ready/unsynced diagnostics and retained candidate history. | Empirical age/survival/censoring and expiry-loss/cost evidence. Derive an offline age-band cohort without using presumed half-life/optimal stock; never hold qualified jobs back to game a daily floor. |
| 08 — Diversity/risk domains | `packages/scraper/portfolio-concentration.ts`; ledger/serving/book divergence measurements and source-family identity readers. | Accepted limits across their applicable writer scope, shared failure-domain headroom and useful marginal coverage. Measured 25%/40% breaches are not currently a universal write gate. Preserve exact-six compatibility; reconcile scope before enforcement changes. |
| 09 — Identity/linkage | Exact source/URL/ID matching, retry material identity, `scripts/lake/job-delta-replay.ts`, directory identity fixtures. | Independently labeled false merges/splits, stable canonical IDs, preserved sightings and reversible lineage. A bounded exact-key/URL cohort is ready; fuzzy clustering has no acceptance from key tests alone. |
| 10 — Differential work | `scripts/lake/processing-modes.ts`, material delta/replay and dependency contracts. | Caller integration and policy/lease/opt-out/remote/date/URL/schema/model invalidation including already-public records; complete-snapshot proof and total avoided cost. Existing pure fixtures can expose missing restrictive dependencies without changing selector. |
| 11 — AI value | Existing deterministic/AI/skeptic routing and budgets. | Matched independently labeled no-call/cheap/judge decisions, including adverse changes, HOLD, delay and real inference cost. Build an offline cohort; a second agreeing model cannot invent permission. |
| 12 — Health/SPC | Stage-aware response/UNKNOWN receipts, diagnostic reporting and incident evidence. | Independent incidents, cause-specific detection delay/false alarms and runtime recovery. Repair false healthy/zero diagnostics; distinguish no dispatch, skip, unchanged, zero-yield, parse, persist and publication failure. |
| 13 — Latency/Amdahl | `scripts/lake/stage-latency.ts`, measurement and replay-latency contracts. | Populated comparable same-cohort wait/network/AI/DB/CPU/retry/cold-start profile and total-cost benefit. Profile known evidence and identify telemetry gaps; the current D1 bind counterexample is a concrete local prerequisite, not an empirically ranked live bottleneck. |

## DeepSeek-inspired operational obligations

The [sparse strategy](../strategies/SPARSE_SOURCE_ATTENTION_STRATEGY.md) translates
inspiration into application contracts, not a requirement to install neural sparse
attention, a model/runtime vendor or claim a speedup. The
[SSAE supporting plan](../plans/SPARSE_SOURCE_ATTENTION_IMPLEMENTATION_PLAN.md)
explicitly permits implementation while label windows mature and LIMITED findings
to dispatch a separately permitted measurement slice. LIMITED is not rollout
acceptance. These are supporting cards within the existing source unit.

| Cards | Evidence/requirement | Ready work and remaining gate |
| --- | --- | --- |
| 00/01/02 — Reality, attention data, memory | Profile, as-of-selection dataset and compact dependency contracts; October 4 audit cards under `docs/audits/`. | Populate exact field-owner/clock/cost/missingness mapping from existing lawful receipts. Mature outcomes and independent labels are missing; avoid a second registry and favorable defaults. |
| 03/04/05/06 — Ranker, temporal evaluation, shadow, measurement | `source-ranker.ts`, `temporal-holdout-eval.ts`, `shadow-decisions.ts`, `measurement-contracts.ts`. | Freeze existing input and expose coverage/label gaps; repair economics. Shadow grants no extra probes. An eligible audit needs separately declared population, seed, propensities, horizon and budgets before live work; deterministic stride is not randomized causal evidence. |
| 07/08/09 — Exclusive modes, incremental pool, exact replay | `processing-modes.ts`, `candidate-pool.ts`, `job-delta-replay.ts`; FULL/REINDEX/REUSE/BOUNDED_REPLAY are mutually exclusive per entity/action/epoch. | Add bounded integration/counterexamples for stale or missing dependency sets, partial snapshots, 304, restrictive invalidation and public withdrawal. Charge request/hash/receipt/rebuild work honestly. Pure modules do not prove production reuse, sparse total cost or benefit. |
| 10/11/12 — Allocator, optional exploration/sharding | Require 03–09 evidence, queue capacity and publication/shared-resource controls. | Remain advisory/gated. First prove authority/reservation and measurement; do not add shards, clocks or model complexity to outrun unresolved policy/capacity. Optional work can be rejected in favor of a validated simpler baseline. |
| 13 — AI value | Same MATH-05/06/11 matched-label and total-cost obligations. | Offline comparison can proceed on lawful retained evidence; availability and actual provider capability must be verified before using a new route. |
| 14/15 — Canary/graduation/recovery | Precontracted effect/noninferiority/power/stopping, exact-version deployment, representative mature outcomes and rollback/resume. | No card advances to accepted rollout from local tests or elapsed time. Preserve complete cutover predicate and source-specific admissions. |

## Fresh diagnostic counterexamples

At the frozen source, a read-only Bun invocation imported the pure economics
renderer with two synthetic sources. It performed no SQL, fetch or file write:

```text
fetch_outcomes_7d:
  fixture-zero-denominator: real_fetches=0, items=0
  fixture-missing-numerator: real_fetches=2, items=20
triage_outcomes_7d:
  fixture-zero-denominator: eligible=27, total_stored=27
```

Observed yield rows:

```text
| fixture-zero-denominator | 0 | 0 | 27 | 0.00 | 0.00 |
| fixture-missing-numerator | 2 | 20 | 0 | 0.00 | 0.00 |
```

`scripts/diagnostics/source-economics.ts` uses `num` to replace missing/invalid
numbers with zero, defaults a missing source numerator to zero, and emits `0.00`
for absent/zero fetch/item denominators. These can manufacture zero productivity
from missing cross-path attribution. The numerator is stored eligibility, not
marginal verified first-publication yield. Repair ratio validity/missingness
without changing scheduling; report known zero only with a known positive
denominator and known same-scope numerator. Separately expose cohort/attribution
limits instead of treating any available ratio as QUPD.

The pure queue helper was invoked with the following inputs and outcomes:

| Input | Observed result |
| --- | --- |
| arrivalRatePerHour=2, meanResidenceHours=4, interarrivalCv=0; no queue evidence exists in API | applicable=true, L=8 |
| arrivalRatePerHour=Infinity, meanResidenceHours=4, interarrivalCv=0 | applicable=true, L=Infinity |
| arrivalRatePerHour=2, meanResidenceHours=4, interarrivalCv=-1 | applicable=true, L=8 |

The command was `bun --no-env-file -e` importing `littlesLaw` from
`./scripts/ci/queue-metrics.ts` and calling exactly those object arguments.
`L_as_text=String(result.L)` preserved Infinity because JSON alone serializes it
to null. These are reproducible pure-module counterexamples, not live queue
observations. A constant-arrival overloaded queue can have CV=0 while backlog
grows: CV cannot certify stability or Little's-law boundary applicability.
Require finite nonnegative inputs and distinguish a heuristic/product from a
validated same-boundary measurement. Conservation/window/equilibrium evidence
must be explicit; no caller may invent applicability from a small CV. Update
the matching `docs/METRICS.md` section 5 alongside a bounded diagnostic repair,
without promoting provisional CV to an accepted parameter.

`docs/METRICS.md` already warns that older SQL/specs are partially reconciled.
Its current first-exposure definition follows master sections 9/10D; a later
legacy seven-day text cannot silently override accepted original-post freshness
of inclusive 30 days or replace first exposure with storage/ledger clocks.
Certified flow needs publication-time authority/qualification, canonical identity,
first product exposure and complete Manila-day coverage. Missing, censored,
replayed/reactivated/imported observations cannot become net-new daily supply.

## Highest-value NEXT after the D1 binding slice

**Main safety unit: mutation-time source authority and reservation identity.**
This is a concrete remainder of the saved
`PUBLICATION_SOURCE_POLICY_EPOCH_AND_SHARED_RESERVATION` obligation. Start with
real gateway plus isolated native SQLite statement interleavings; source tests
alone cannot establish runtime safety. Do not conflate this with redoing the
accepted first-to-second-read opt-out test.

1. Insert opt-out, expire a lease or change registry authority after the final
   policy read but before `persist`; observe physical/public rows and receipt IDs
   together. Current source lacks a transactionally fenced policy epoch.
2. `reserveCanaryCapacity` currently returns true when any row with the same
   retry key exists, without checking its source/tick/reserved-count tuple.
   Reuse a hold under mismatched material and overlap two same-key retries before
   either ledger acknowledgement. Preserve valid exact replay; test that physical
   exposure cannot exceed its actually owned reservation.
3. Distinguish source/tick protection from channel/tick identity and shared
   provider/global domains. The existing tick includes channel and timestamp;
   caller-local ticks do not themselves prove shared pacing/exposure budgets.
   Preserve accepted exact-six exceptions and scope before any new limit gate.
4. Observe lost ACK, ledger conflict, exhaustion and retry holds. A post-write
   ledger refusal is not zero exposure. Reconciliation must not deactivate
   legitimate ledger-less historical stock or erase source provenance.

Minimal acceptance: demonstrably stale authority cannot mutate public exposure;
every reused reservation is bound to the authorized request and concurrent writers
cannot spend one hold twice. Where an external effect cannot be atomic, declare
and prove safe exposure bounds, durable uncertainty and idempotent compensation.
Provider/global enforcement, production rollout and wider cutover remain explicit
subsequent gaps until actually proven. Do not deploy ahead of required schema.

**Independent ready slices while safety evidence develops:** repair economics
UNKNOWN/zero-denominator and missing-numerator rendering with adversarial fixtures;
repair queue applicability/input loopholes with overloaded constant-arrival,
infinite/negative/NaN and mismatched-boundary cases. Both are reversible diagnostic
workstreams with no source admission, runtime mutation or scheduling change. Next
derive a small lawful same-cohort publication/first-exposure trace or label manifest
through SSAE-01/06; missing live telemetry yields an owned gap, not a blocked entire
program. Existing private lake staging/inspection remains private and raw sync
stays fenced.

Each completed bounded slice must record exact behavior/checkpoint SHAs, targeted
adversarial plus appropriate broader checks, independent proof scope, exact SSM
and GitLab read-back, unresolved counters and the next dependency-ready action.
GCP artifact/config mapping, current incident containment, billing/access, deployed
image equivalence and D1/Turso restoration require separate actual receipts. The
new source backups resolve source preservation, not those runtime facts. Continue
independent work; no MATH/SSAE card or 100–150/day objective is completed here.
