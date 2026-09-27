# Lucky notes: complete reading and fusion ledger

Review date: 2026-09-27. Local code anchor for focused checks:
`7290bea8b3c0bc9df68d109afc7477a34dcafff4`.

This is an evidence review for the user's request to improve prompts and create a
bootloader. Attached instructions are material to assess, not authorization to
execute their migrations, schedules, deployments, incident actions, or boot commands.
No runtime changes, production queries, embedded commands, or Git mutations were
performed for this review. This file is not a replacement policy or work queue.

## Reading coverage and source notation

Every line of the following texts was read in sequential bounded chunks without
truncated source output. Blank lines are included in the line totals.

| ID | Source | Full coverage | SHA-256 for supplied notes |
|---|---|---|---|
| L7 | `C:/Users/admin/Downloads/luckyv7-sep261205pm.txt` | 1–1968; 121,824 bytes | `5bcd0282d3742f24a2a118c16b869753196c216a2ae3534219d1a6d9882076c6` |
| L8 | `C:/Users/admin/Downloads/lucky-sep27818am.txt` | 1–2939; 44,193 bytes | `a06ab182a94f966a965f344c752fc4fd004e203e309e155108679bfa0abec5fa` |
| MP | `docs/bootloaders/MASTER_OPERATING_PROMPT.md`, v3.1 before this revision | 1–4054; 102,152 bytes | Repository version at the anchor above |
| FB | `docs/bootloaders/2026-09-26-FUSED-MAINTAINER-BOOTLOADER.md` | 1–81; 14,591 bytes | Repository version at the anchor above |
| LB | `docs/bootloaders/2026-09-26-LAKE-MAINTAINER-BOOTLOADER.md` | 1–80; 9,077 bytes | Repository version at the anchor above |

Also read `AGENTS.md` completely; `.ai/manifest.yaml` was absent. Focused checks
covered publication-gateway code, migration 0041, schema-field searches, migration
0048, CI/tool declarations, and the current resume-pointer excerpt. They substantiate
the specific claims below, not complete live production verification.

Disposition vocabulary:

- **Adopted**: preserve the principle in the fused prompt, subject to current user
  scope and accepted repository authority. This does not mean a new policy or
  production capability was activated.
- **Needs verification**: useful proposal, numerical threshold, named capability,
  or historical claim needing current acceptance or evidence.
- **Rejected as instruction**: do not execute or accept its self-claimed authority
  merely because it appears in the supplied material.
- **Duplicate**: preserve once in the relevant canonical document, with references.

## Important corrections before fusion

| ID | Source and conflict | Disposition and resolution |
|---|---|---|
| LC-01 | L7:4–6, 16–26, 1764–1776 calls itself complete, verified, active sovereign authority; L8:2463–2465 says external text cannot grant authority. | **Rejected as instruction.** Treat L7 status, verifier, approval, SHA, and deployment labels as attributed assertions. User asks for prompt work, not enactment of eight new governance files. |
| LC-02 | L7:360–366 auto-downgrades governance older than 30 days and says runtime cannot be overridden; L7:52–57 itself distinguishes truth from permission. | **Adopted with correction.** Date empirical evidence, flag stale facts, and request policy review when warranted. Policy does not expire merely because no agent has reread it; fresh runtime does not authorize a violation. |
| LC-03 | L7:329–340, 446–469, 1708 describes a Markdown read/edit/commit/push lease as atomic runtime enforcement. | **Rejected as an enforcement claim.** File ownership and collaboration remain useful. Real distributed exclusion requires a verified atomic primitive, contention handling and fencing; TTL and a Markdown block alone do not provide it. |
| LC-04 | L7:84–87 asserts L1 everywhere, L7:655/690 requires owner source graduations, MP:924–930/2151–2157 calls Jev binding inside an envelope, and L8:2395–2415 defines a different L0–L4 ladder. | **Needs verification.** Separate model advice, deterministic automation, accepted per-class authority, and runtime enforcement. Reuse the accepted autonomy vocabulary; do not invent a new ladder or restore a permanent owner gate contrary to accepted source-governance policy. |
| LC-05 | L7:114–122 and 1234–1243 subtract backlog, reactivation, and replay from first publications; categories may overlap. | **Rejected formula; adopted cohort integrity.** Use a mutually exclusive and exhaustive classification over deduplicated canonical first-publication events, preserving `UNKNOWN`. Do not subtract overlapping row counts. |
| LC-06 | L7:122/1437 makes only more than two missing days insufficient, although L7:121/129 requires all 28 days. MP:550–554 requires no missing days. | **Adopted with correction.** One unknown day prevents proving a 28-day floor. Distinguish failed floor from unproven floor. An average does not establish a minimum. |
| LC-07 | L7:130/883–888 gives generic FP/FN limits, while its purported generated mirror at 1050–1058 gives safety 0/0 and publication 0/1%. | **Needs verification.** The claimed generated mirror is internally inconsistent. Accepted thresholds need one canonical source, units, denominators, class, sample design, confidence method, effective revision, and actual enforcement. |
| LC-08 | L7:592–629 claims gateway rejects unknown sources, validates expiry everywhere and enforces item-level verified PH/date rules. | **Falsified as blanket code claim.** `publication-gateway.ts:94–102` defaults missing registry rows to active/allowed; 174–180 has no active-source expiry check; the request carries counts plus a callback, not item PH/date evidence. This review does not establish whether an unsafe input reaches that path in production. |
| LC-09 | L7:1671–1677 describes atomic public publication and cap/ledger guarantees. | **Needs verification.** At `publication-gateway.ts:169–180`, persistence runs before ledger insertion. Migration 0041 has append-only and cap checks, but those facts do not prove atomic rollback of a preceding callback, concurrency safety, or coverage of other D1 writers. |
| LC-10 | L7:507–508, 1698–1699, 1710–1711, 1734–1736 queues supposedly missing parameter audit, gitleaks and risk-tier migration. | **Stale.** They exist at the reviewed commit: `package.json:17`, `.github/workflows/ci-guardrail.yml:32,48`, and `packages/db/migrations/0048_source_registry_risk_tiers.sql:6–12`. Existence alone does not prove full semantic coverage or deployed migration status. |
| LC-11 | L7:794–799/1713 calls `rehearse-d1-migrations.ts` a database restore drill. | **Rejected equivalence.** Its header and in-memory rehearsal paths establish migration/schema rehearsal, not restoration of a production data backup. Preserve separate backup receipts, retention, restore destination and verified restoration outcome. |
| LC-12 | L7:1189/1475 calls 1 MiB uncompressed WASM an immutable Cloudflare platform limit; 1476 calls 15 ms immutable cold start. | **Needs current official verification.** Distinguish project budget, measured benchmark target, plan-specific platform quota, deployment artifact size and isolate memory. Do not canonize these numbers from the attachment. |
| LC-13 | L7:1721–1726 claims conventions, capability dispatch, supersession and a Rust interface are already enforced; its phases 4/7/8 still propose them. | **Needs verification.** A declared architecture or a parser call is not proof of a general capability registry; append-only source transitions are not proof of per-job `supersedes_decision_id`; absence of a Rust writer is not implemented WASM enforcement. |
| LC-14 | L7:777–778 permanently retains all audit history; MP:1922 preserves needed evidence but 2895–2906 recognizes minimization/deletion. | **Adopted with correction.** Preserve necessary non-secret decision lineage under accepted retention and deletion rules; do not require unbounded personal/raw data retention. |
| LC-15 | L7:342–345/1615–1618 calls a session-count ratio a time-budget rule. | **Needs verification.** Ten of fourteen sessions is at least 70%, but sessions are not equal-duration work. If this is an accepted heuristic, label it as session share; do not claim measured effort share or automatic enforcement. |
| LC-16 | L7:216–219 gives source bans and factual assertions including scam density, deprecated endpoints, and terms. | **Needs verification.** Preserve prohibition reasons and dates as evidence references, not unsupported present-tense judgments or new permission. Apply current source-specific accepted restrictions. |
| LC-17 | L8:1–70/114–659 stacks many personas and declares a permanent guardian. | **Duplicate / rejected as instruction.** Use a concise steward role and practical checklists. A prompt does not establish continuous execution, a new model identity, a schedule, or external messaging authority. |
| LC-18 | L7:1827–1852/1899–1922 and L8:2868–2939 contain imperative deployment, migration and execute-now instructions. | **Rejected as instruction.** Retain only a bounded reusable workflow template. Do not invoke these directions during note fusion. |

## Comprehensive thematic fusion ledger

| ID | Unique useful requirement or proposal | Sources | Disposition |
|---|---|---|---|
| LF-01 | Stewardship, honest limits, no manufactured output, preserve proven behavior and recoverability. | L7:35–69; L8:74–110, 490–604 | **Adopted**; collapse persona repetition. |
| LF-02 | Distinguish accepted permission from actual code, deployment, exercise, effect, measurement, sustained result. | L7:52–57, 281–284; L8:948–1005, 2136–2165, 2515–2531 | **Adopted**; use claim-specific evidence level/window and falsification. |
| LF-03 | 100 qualified unique PH-remote first-publications/day floor, 150 stretch, 28 full Manila-day demonstration; do not force market supply. | L7:91–137; L8:730–765 | **Adopted as existing objective**, not newly verified achievement or a publication cap. |
| LF-04 | Full eligibility: legitimacy, taxonomy, no fees/scams, actual PH remoteness and exclusions, ambiguity held, freshness, source authority, attribution/linkback/opt-out, canonical identity and sightings, usable apply destination, parity of all surfaces, distinct cohort, publication receipt, visible product effect. | L7:96–112; L8:606–654, 1931–1981 | **Adopted**; current policy determines eligible states, not attached `verified`-only tightening. HTTP 200 alone is insufficient content proof. |
| LF-05 | Outcome acceptance includes supply, quality, authority, reliability, economics, resilience, justified autonomy, governance coherence and proportionate architecture. | L7:126–137 | **Adopted principles / needs verification thresholds**; no whole-project success inferred from session completion. |
| LF-06 | TypeScript coordinates; Python analyzes; D1 serves; Turso stores permitted observation/replay evidence if current architecture supports it; Rust/WASM is optional mechanical optimization. | L7:141–188; L8:324–373, 2014–2052, 2169–2195 | **Adopted**; verify ownership and avoid two systems of record for one fact. |
| LF-07 | Borrow pure transformations, conventions, capability selection, immutable facts and simple error handling without adopting extra runtimes. | L7:181–188, 261–289 | **Adopted design directions**, not mandatory language quota or unimplemented pipeline rewrite. |
| LF-08 | No broad rewrites, second public database, speculative compiler/DSL, unearned runtime promotion, simultaneous migrations, deleting working fallback early, unrelated changes or metric-driven weakening. | L7:192–211; L8:506–561, 2419–2447, 2535–2554 | **Adopted**; evidence and actual scope decide exceptions. |
| LF-09 | Source prohibitions register with reason class, scope, evidence and review trigger. | L7:213–219 | **Adopted structure / needs verification entries and cadences**. |
| LF-10 | Per-domain and per-class autonomy, L1 recommendation-quality evaluation before bounded action, audit, kill switch, graduation evidence, demotion and rollback. | L7:223–257, 870–902; L8:2056–2097, 2395–2415 | **Adopted with LC-04**; no self-granted promotion or unsupported current-level claim. |
| LF-11 | Standard source adapter via identity, capability, mapping, fixture and lifecycle evidence; exception records for central changes. | L7:263–267, 660–705 | **Adopted target**, preserve current entry points until proven replacement. |
| LF-12 | Capability/payload/size/guarantee dispatch and route metadata (source, capability, parser/version, result, warnings). | L7:269–273, 709–735 | **Adopted target / needs verification routing table and size cutoffs**. Provider semantics remain relevant. |
| LF-13 | Observations, decisions and current projections differ; decisions carry evidence, engine/policy versions, supersession and reversal reasons. | L7:275–279, 741–769; L8:324–347, 2081–2095 | **Adopted**; append correction events, do not rewrite history or claim schema exists without proof. |
| LF-14 | Pure deterministic transformations separated from fetch, AI and mutation side effects. | L7:286–289 | **Adopted direction** where it improves testability; do not label all current triage code pure without inspection. |
| LF-15 | Scope stops to affected actions; severity, containment, evidence preservation, response timing and owner-unavailable behavior. | L7:293–328, 820–847; L8:2313–2389 | **Adopted incident structure / needs verification SLAs**; no automatic global shutdown, token rotation or notification from the note. Continue independent authorized work. |
| LF-16 | Overrides/amendments need scope, rationale, safety boundary and traceability. | L7:324–327, 365–366 | **Adopted traceability / needs verification 30-day expiry and signature mechanics**. Document editing authorization already exists in this session. |
| LF-17 | Preserve dirty work; record full local/remote revisions, runtime drift, overlapping file ownership; avoid destructive Git convenience. | L7:473–508; L8:849–889 | **Adopted**; readable claims are not atomic locks and matching main is not a prerequisite for safe branch work. |
| LF-18 | Recover, measure, select the binding constraint, scope one reversible unit, test, observe authorized release, checkpoint. | L7:397–442, 512–550; L8:769–825 | **Adopted**; one production unit at a time serializes work, it does not force repeated user confirmations. |
| LF-19 | Unit contract includes evidence/hypothesis, expected delta, files, exact sources, exclusions, rollback, acceptance, meaningful checks, request/AI/write budgets and stops. | L7:512–550; L8:267–284, 1842–1874 | **Adopted** in execution prompt; scale detail to risk. |
| LF-20 | Verify narrow-to-broad with failure fixtures, relevant lake/Python tests, current test/typecheck/guardrail/build commands, dry runs and public effect. | L7:555–585; L8:2236–2272, 2276–2308 | **Adopted**; test counts and commands must be reread, not inherited; documentation-only work does not need meaningless full runtime ceremonies. |
| LF-21 | Publication must enforce exact identity, current source permission/state/lease, canary caps, opt-outs, eligibility, date honesty, ledger, idempotency, withdrawal and rollback. | L7:589–629; L8:1414–1469, 2357–2391 | **Adopted contract / needs verification implementation**; distinguish hidden staging writes from public exposure. |
| LF-22 | Risk-proportional candidate→shadow→canary→active lifecycle, quarantine/degrade/pause/retire and no fetch permission from discovery alone. | L7:633–655 | **Adopted** with current ADRs and complete cutover predicate; tier values and review gates are not invented anew. |
| LF-23 | Retention, minimal metadata, opt-out/correction propagation and actual restoration tests. | L7:773–799; L8:2337–2353, 2490–2511 | **Adopted**, with LC-11/14; no literal SQL or unverified cron introduced. |
| LF-24 | Session/effort ledger to prevent architecture displacing proven operational need. | L7:803–816, 1613–1625 | **Needs verification** of accepted policy and useful unit; simpler prioritize-by-evidence rule retained. |
| LF-25 | Central parameter registry with generated mirror and code drift check; unknown values stay unset. | L7:853–1204 | **Adopted structure**, reuse current files; all values classified below. Never call authored Markdown generated without tooling evidence. |
| LF-26 | Funnel stages and stocks have separate rates; define numerators, denominators, timestamp semantics, cohorts, evidence coverage and measurement windows. | L7:1209–1438; L8:730–765, 1931–1981 | **Adopted with corrected metrics**, not literal draft SQL. |
| LF-27 | Architecture experiments need baseline, bottleneck, interfaces, shadow parity, benchmark, canary, rollback, exit/abandonment criteria and safe cleanup. | L7:1444–1625; L8:1780–1838 | **Adopted method**, phases 0–11 are proposals, not a mandatory new implementation queue. |
| LF-28 | Enforcement matrix names actual guard, test, trigger, runtime observation, gaps and owner; expose paper risk. | L7:1631–1738 | **Adopted**, remeasure every status and do not equate agent behavior with runtime enforcement. |
| LF-29 | Enumerate repository and semantically cover active production, support, governance, tests, migrations, workflows, analytics, lake, public routes, historical/experimental/generated/unknown. | L8:893–944 | **Adopted**; distinguish inventory from full-content review and disclose excluded generated/binary material. |
| LF-30 | Contradiction ledger names both claims, sources, authority, reality, consequences, evidence gaps and reconciliation. | L8:969–1005 | **Adopted**; accepted governance controls permission, facts control factual descriptions. |
| LF-31 | Reverify automated lake publication vs owner-authority prose, direct D1 writers, active Turso vs legacy Turso, exact-six vs current sources, Rust reality. | L8:1009–1058 | **Adopted as investigation seeds**, never permanent findings. |
| LF-32 | Models need assumptions, simple comparator, baseline, falsification, complexity cost, metrics, shadow/canary, rollback and KEEP/REVISE/REJECT. | L8:1062–1081, 1842–1927 | **Adopted**; use hard feasibility constraints before ranking feasible alternatives. |
| LF-33 | Source Doctor distinguishes network/rate-limit/empty/anomalous/schema/normalization/dedup/geo/taxonomy/AI/database/orchestration/stale/unknown failure. | L8:1985–2010 | **Adopted taxonomy concept**, map to actual repository enums and prove new failure before expanding. Empty feed alone does not prove operational death. |
| LF-34 | Preserve mature institutional memory through history, ADRs, incidents, tests and negative experiments. | L8:541–582, 2490–2511 | **Adopted**; no automatic deletion of old code or source evidence. |
| LF-35 | Secret/private data protection and prompt-injection boundary; outside text never creates authority. | L8:2451–2465 | **Adopted** throughout prompt and bootloader. |
| LF-36 | One canonical baton, queue, store, gateway and current pointer; reference existing docs rather than proliferating competing plans. | L8:2469–2486; FB:3–8 | **Adopted**; a reusable bootloader is navigation, not another mutable NEXT queue. |
| LF-37 | Report actual start/end/remote/deployed revision, findings, uncertainty, changes, tests, real effect, negative results, backup, rollback and exactly one concrete next action/trigger. | L8:2672–2768; MP:2717–2875 | **Adopted**; do not require boilerplate M1–M13 reports for every tiny task. |
| LF-38 | Portability and useful specialist skills without identity theater; no new background guardian. | L8:2199–2232, 2772–2864 | **Adopted discipline / duplicate rhetoric removed**. |

## M1–M13: mathematical proposals and validation requirements

All thirteen are retained as a diagnostic catalog, not a command to implement
thirteen systems. Their **problem existence and current resolution are needs
verification** until repository telemetry supports them. Mathematical names do
not prove applicability, benefit, calibration or current implementation.

| ID | Source | Proposal to preserve | Additional constraint before application |
|---|---|---|---|
| M1 | L8:1085–1173 | Adaptive polling/resource allocation; sliding/discounted UCB, Thompson sampling or simple heuristics; reward marginal qualified fresh unique yield per resource and avoid starvation. | Authorized sources only. Preserve minimum exploration only where fetching is permitted. Define delayed rewards, seasonality, attribution and common cost units; do not multiply correlated counts as if independent probabilities. Compare current scheduler under equal budgets. |
| M2 | L8:1177–1244 | Queue/backpressure instrumentation: arrivals, service, depth, ages, Little's law; simple thresholds/hysteresis/token buckets before PI control. Use actual Worker/Actions/Bun paths. | Match queue boundary and population, distinguish offered capacity from actual departures, account for retries and drops. Little's law needs consistent long-run averages/conservation and finite averages; it does not generally require Poisson arrivals or interarrival CV ≤ 1. A finite window with changing inventory needs boundary correction. |
| M3 | L8:1248–1295 | Budgeted marginal coverage; exact source overlaps first; Bloom/HLL/MinHash/submodular greedy only at demonstrated scale. | State approximation error. These structures estimate different things and do not replace canonical identity. Greedy approximation guarantees require the stated objective/constraint assumptions. Avoid double credit for syndicated jobs. |
| M4 | L8:1299–1337 | Time-of-day/day-of-week source intensity and bounded empirical scheduling; optionally test NHPP. | Test stationarity within conditioning windows, independent increment/count assumptions and overdispersion. Never speed through source cadence restrictions; schedule expansion needs existing authority. |
| M5 | L8:1341–1410 | Deterministic explicit geography; calibrated ambiguity classifier with precision/recall/FPR/FNR/Brier/ECE and Platt/isotonic/reliability plots. | Separate adjudicated labels from model outputs, use held-out/time-separated evaluation, publish denominators and intervals, account for selection bias, and retain abstention. Explicit exclusions are hard rules. ECE binning and model confidence are not proof of calibration. |
| M6 | L8:1414–1469 | Guarded lifecycle and coherent publication contract across all writers. | Compare normative predicates with every actual entry point; account for hidden staging, activation, retries, concurrent ledger writes, failure atomicity and withdrawals. A type/state label is not enforcement. |
| M7 | L8:1473–1523 | Perishable inventory: depth, age, closure/link survival and stockout risk; empirical decay before exponential model. | Estimate hazards with censoring and source/cohort heterogeneity. `V0 exp(-λ age)` is a candidate shape, not a universal law. Backlog buffering may protect stock but cannot satisfy a genuinely fresh daily-flow metric. Do not delay useful authorized jobs merely to smooth a KPI. |
| M8 | L8:1527–1565 | Top-source/family/top-three share, HHI, entropy, outage exposure. | State denominator/window and ultimate-origin attribution. Shares do not establish independent failures. Respect accepted limits while distinguishing a measured concentration risk from an instruction to hide legitimate jobs. Simulate largest-source/family loss. |
| M9 | L8:1569–1624 | Layered identity using requisition/URLs/company/title/location then evaluated Jaccard/MinHash/TF-IDF/Fellegi–Sunter/clustering. | Preserve sightings and uncertain relationships; label false merges and missed duplicates separately. Guard transitive clustering and identifier reuse. A fixed 0.8/0.95 similarity score is not calibrated merge probability. |
| M10 | L8:1628–1669 | Conditional HTTP, semantic digests and unchanged-content work avoidance. | No-change source content does not mean no policy/version/authority/opt-out/freshness change. Cache keys include relevant pipeline versions; preserve bounded periodic revalidation and closure evidence. |
| M11 | L8:1673–1723 | Deterministic/cheap/strong-model/abstain cascade and empirical value-of-information comparison. | EVSI/VOI is improvement in expected decision utility net of costs under an explicit loss model, not a raw confidence score; validate attribution and delayed outcomes. Never pay for judgment when required evidence does not exist. |
| M12 | L8:1727–1776 | Detect silent failure from parse/yield/size/latency distributions; robust median/MAD, EWMA, CUSUM, change-point or Shewhart. | Compare seasonally appropriate baseline; handle sparse/zero-inflated telemetry, autocorrelation and multiple testing; validate alert precision and bounded response. `200 []` can be legitimate zero inventory. |
| M13 | L8:1780–1838 | Profile network/DB/AI/CPU/waiting; Amdahl sanity check; optional bounded Rust kernel with parity, reproducibility and end-to-end benefit. | For serial fraction `p` accelerated by `s`, ideal speedup is `1/((1-p)+p/s)` before extra overhead. Benchmark complete path, realistic distributions, memory/cold starts and failure behavior; no runtime migration from prose. |

Additional toolbox at L8:2101–2132 (Bayesian updating, Wilson intervals, survival,
inventory, entropy, expected regret, sensitivity and robustness) is **duplicate
reference material**, not extra implementation work. Use statistical intervals
appropriate to the sampling design. No sampled evidence establishes a literal
zero population error probability; a zero-tolerance safety policy is a different
kind of statement.

## Numerical and mechanical claims requiring provenance

These values occur in L7. They must be checked against the accepted current
parameter registry, applicable ADR, runtime configuration and enforcement. None
becomes accepted because this review lists it.

| Domain | Claimed values and source | Disposition |
|---|---|---|
| Autonomy | 30 days, FP ≤1%, FN ≤5%, full audit; demotion FP >2% / FN >8% over 7 days; flow 0 promotion incidents and one incident/14 days (L7:870–902). | **Needs verification**; class definitions and mirror contradict. |
| Quality | PH false positives ≤1%; remote ≤0.5%; broken URLs ≤1%; public duplicates ≤0.5%; unsafe 0%; correction <24h (L7:904–910, 1073–1082). | **Needs verification**; ground truth, denominator, uncertainty and zero-tolerance distinction required. |
| Reliability | Backlog ≤2h; restore within 30d; three failed ticks; redispatch 1440 minutes; 12 dispatches; 8000ms; 512KiB; two requests (L7:912–920). | **Needs verification**; attachment calls 1440 a maximum while its code anchor is `DEFAULT_MIN_REDISPATCH_MINUTES`. Current pointer describes a later 1MiB shadow-budget change. |
| Economics/diversity | 5 cents/publication; 500MB/quarter; top source 25%; family 40% (L7:922–928). | **Needs verification**; currency, total vs marginal cost, unique-flow denominator, uncertainty and current spend authority. |
| Freshness/dedup/confidence | 30-day posting limit; unknown-date do-not-publish; merges 0.95/0.80; taxonomy 0.75; Jev 0.70 (L7:930–941). | **Needs verification**; score cutoffs are not calibrated probabilities, and unknown-date fresh-flow exclusion is distinct from accepted public-inventory eligibility. |
| Source tiers | A/B/C shadows 3/7/14d, caps 10/5/2, A fast track (L7:943–955). | **Needs verification** against current ADR and complete observation predicate; elapsed days alone are not healthy recurrent observations. |
| Retention/sampling | Raw 14d; unsynced candidates 90d; permanent audit/replay; remote audit 10%, PH/safety/publication 100% (L7:957–967). | **Needs verification**; preserve needed evidence and obey minimization/deletion constraints. |
| Budgets | 200 requests/source/day; 500 AI calls/day; 50,000 writes/day; 3000ms backoff (L7:969–973). | **Needs verification**; counters, shared hosts, retries and plan budgets must be accounted for. |
| Coordination | Two-hour lease; rolling 14 sessions; severity response 1/4/24/72h (L7:975–983). | **Needs verification**; clocks and lease ownership must be mechanically meaningful. |
| Architecture | 70% operational sessions; 14-day abandonment; 1MiB WASM; 128MB Worker (L7:985–989). | **Needs verification**; project criteria are distinct from platform limits. |
| Unset proposals | Six-hour opt-out job; 30-day backup retention; $25 monthly cap (L7:991–994, 1194–1202, 1878–1895). | **Rejected as authorization / retained proposals**; source explicitly marks them unset. |
| Architecture phase thresholds | 17 paths/100 baseline runs; zero boundary cycles; migration lock <100ms; ≤2MB parser input; <1MiB bundle; cold start 15ms; 99.99% character parity/5000 payloads/2× memory; 1000 malformed cases; dispatch <50ms; typed configuration for three families/40% boilerplate; 14d canary at two items/tick; seven days/source/20% throughput; 30d before cleanup (L7:1482–1609). | **Needs verification** as candidate criteria; arbitrary character parity can miss semantic errors, and mechanical optimization does not justify public-item caps by itself. |

## Draft SQL and enforcement pitfalls

1. **Schema mismatch.** L7:1265–1320 and 1331–1373 use
   `opportunities.source_posted_at`, `opportunities.created_at` and
   `fingerprint_hash`. Current `packages/db/schema.ts` defines `posted_at`,
   `scraped_at` and `content_hash` for opportunities. Verify actual deployed
   schema before deriving SQL. The gateway's public IDs are numeric; this review
   does not assert its INTEGER cast is itself a bug.
2. **Not first publication.** Query 1 expands every ledger receipt, does not
   choose the earliest qualifying canonical event, and subtracts row-level sums
   from a distinct count. Repeated receipts or overlapping exclusion flags can
   distort or even make the result negative. The seven-day backlog cutoff is a
   new undocumented decision, not implied by a 30-day freshness ceiling.
3. **Historical contamination.** Joining past publication events to present
   source/eligibility state revises the past when a source changes. Snapshot
   relevant authority/evidence at decision time and record later corrections.
4. **No complete date spine.** A GROUP BY only over observed days omits zero or
   missing days. A 28-day floor needs every complete calendar day plus explicit
   telemetry-coverage status and half-open UTC bounds.
5. **Funnel mislabeled.** Query 2 is UTC active stock by creation date; it is not
   a 24-hour lake→serving transition funnel and cannot measure all attrition.
6. **Output is not ground truth.** Query 3 labels existing classifier fields as
   false-positive measurements, URL emptiness as broken-link rate and hash
   collisions as true duplicate rate. Use independent adjudication/link
   observations, denominators, uncertainty and NULL/zero-sample handling.
7. **Concentration scope.** Query 4 measures source active stock only, despite a
   provider-family title. Distinct first-public flow, canonical origins and
   correlated family outage risk need different contracts.
8. **Fresh insertion is not queue health.** Query 5 measures time since newest
   active insertion; a healthy source can have no new vacancies. Measure pending
   eligible queue age and actual attempts/services/errors instead.
9. **Missing proof cannot be repaired with prose.** Regex guards, append-only
   triggers, stage types and safe helper functions have different coverage.
   Inspect all writers/callers, trigger revision and failure boundaries before
   claiming an invariant is enforced end to end.

## Existing prompt: preservation and repair checklist

The prior master is useful but repetitive. The fusion should preserve these
requirements directly or by a stable reference, without preserving stale
current-state assertions or broken cross-references.

| Preserve | Existing full-source location | Treatment |
|---|---|---|
| Prompt-only task guard; decisive routine authorized work; serialization does not require repeated `continue`. | MP:608–660, 947–987; FB:8,19,49 | **Adopted**. |
| Portable checkout/runtime discovery, full SHAs, automation advancing main, dirty-work protection. | MP:1166–1212 | **Adopted**; no forced local-main equality. |
| Separate permission, evidence labels and maturity; cheap falsification; hidden environment/revision/schedule differences. | MP:118–343, 1276–1430 | **Adopted**, condensed. |
| Impossible-target report separates market scarcity, recoverable pipeline loss, permissible expansion and measured ceiling. | MP:1089–1128 | **Adopted**; unavailable data yields unknown, not invented confidence. |
| Single canonical source/public store with mirror direction, freshness and conflict semantics. | MP:1555–1604 | **Adopted**; current lake support is distinct from legacy Turso OLTP. |
| Full publication boundary (leases/caps/ledger/opt-out/withdrawal/failure atomicity/cache/search/sitemap). | MP:1606–1661 | **Adopted**; functional contract more important than one helper's name. |
| Authorization-aware selection and starvation prevention before LIMIT; eligible/blocked backlog measured separately. | MP:1663–1691 | **Adopted**, keep as explicit audit topic. |
| Eight separate event timestamps; no source-date fabrication. | MP:1693–1724 | **Adopted**. |
| Identity layers, distinct/repost/possible/likely/exact classes and linked multiple sightings; avoid false merges. | MP:1726–1779 | **Adopted**. |
| Lake maturity needs actual data, completeness, durable runs, safe resume, replay, economics, governed public effect and sustainable costs. | MP:1785–1872 | **Adopted**. |
| HOT/WARM/DURABLE/DISPOSABLE retention and 30/90/365-day growth projections. | MP:1874–1922 | **Adopted principles**; no unconditional permanent raw retention. |
| Replay tracks old/new decisions, unchanged/positive/negative/ambiguous/regression effects and software/policy/cohort versions. | MP:1924–1977, 2562–2591 | **Adopted**. |
| Raw coverage must distinguish full payload, sample, normalized, hash and metadata; sample is not full snapshot. | MP:1979–2001 | **Adopted**; prevents unsupported replay claims. |
| Employer/domain/ATS discovery is a lead, not admission or publication authority. | MP:2003–2057; FB:57 | **Adopted**. |
| Source/lake economics separate initial stock from recurring marginal delta, explicit funnel ratios and costs. | MP:2059–2143 | **Adopted**. |
| Meaningful unit contract, failure tests and actual checked commands; no mirror tests or mandatory new analytics platform. | MP:2463–2632 | **Adopted**. |
| Git is not DB backup; D1/Turso restoration and audit recovery are separate from code remote state. | MP:2634–2659 | **Adopted**. |
| Canonical documentation as memory; negative results; real deployment/workflow receipts; precise next controller/trigger. | MP:2661–2875 | **Adopted**. |
| Safety feedback, corrections, opt-outs, broken URLs, duplicates and data minimization. | MP:2881–2981 | **Adopted**, using current accepted process. |
| Terminal historical SP/Gauntlet work stays closed absent new failure evidence; do not duplicate systems. | MP:3054–3106; FB:43–49 | **Adopted**. |
| On-demand reading helps decisions but never grants policy/runtime authority or delays cheap decisive checks. | MP:3188–3217, 3685–4016 | **Adopted by reference**, not a mandatory reading ceremony. |
| Nonmutating diagnostic receipts (`success`, `changed_db`, rows written, timestamp); never invoke cron as a health probe. | FB:21; LB:27 | **Adopted** after verifying script behavior, since `--dry-run` is not proof by name. |
| Relevant frontend checks include eligibility parity, FTS/reactivation, cache and source attribution, mobile usefulness/accessibility. | FB:53; LB:49–54; L8:633–654 | **Adopted** as risk-based audit categories. |
| Staged reservoir research with identity/interface/terms/pagination/freshness/provenance/PH intersection/delta/overlap/cost and bounded samples. | FB:55–59 | **Adopted method**, named Freehire/ATS/etc. sources remain hypotheses, not current approval. |
| Existing automation contracts include owner/controller, trigger, authority/IO, idempotency/fencing, budget, retry/poison, kill switch, trial and review; monitor the monitor. | FB:61–63 | **Adopted**; no new schedule or notifications created by prompt text. |

Required repairs to prior master and older bootloaders:

- MP:99–114 claims the prompt can override governance; MP:1214–1242 calls
  recovery order approximately precedence. Use explicit current policy
  precedence; recovery navigation does not rank policy over source restrictions.
- MP:698 calls job evaluation universally reversible and low consequence.
  Withdrawal cannot undo exposure to a scam, disclosure, money lost or missed
  opportunity. Judge consequence by decision class and reversibility limits.
- MP:924–930 and 2151–2157 omit earned-level/current-authority conditions for
  binding AI judgment. Preserve the target without claiming it already governs.
- MP:2243–2247 permits irreversible retention in a reversible-action ladder.
  Deletion requires accepted retention authority, verified recoverability where
  relevant, and explicit irreversibility; do not call it reversible.
- MP:2333–2352 requires historical replay before any level change. Emergency
  containment/demotion must not wait for a replay prerequisite; preserve evidence
  and verify containment, then review recovery/promotion.
- MP:2258–2263 makes every source admission/promotion human-gated. Reconcile with
  the accepted source masterplan and full Autonomy Cutover Predicate rather than
  silently replacing constitutional autonomy with perpetual founder approval.
- MP:351–376 references unit/handoff sections 30/36, whereas actual unit/handoff
  sections are 40/46. Rewritten references must resolve.
- FB:59 and LB:49–65 contain dated anchors, defect assertions, NO-lake-cron and
  ~28.86/day historical metrics. CURRENT's later entries document a lake publish
  clock and metric changes. Preserve old files as historical evidence; reverify
  defects and avoid competing NEXT pointers in multiple bootloaders.
- L8's large session-state block and mandatory first-run M1–M13 audit are useful
  only for broad recovery. Do not force a complete repository audit on every
  ordinary maintenance edit or execute an implicit first-run mission when the
  user only asked to edit a prompt.

## Duplicate and unsupported-completion accounting

- L7:1001–1204 repeats its parameter registry but introduces conflicting values;
  keep canonical parameters plus an actually generated reference, not two
  independent policy sources.
- L7:1744–1802 and 1858–1874 repeat C1–C20 resolutions already captured above;
  they are historical claims of resolution, not evidence that resolution worked.
- L7:1806–1823 and 1878–1895 repeat unset values/ledgers; retain one proposal
  register and do not manufacture populated approval or signature fields.
- L7:1827–1852 and 1899–1922 repeat rollout commands; neither is executed here.
- L7:1927–1968 answers twenty validation questions with unconditional YES,
  frequently citing documentation as proof. Preserve the questions as review
  criteria and require evidence-based CONFIRMED/PARTIAL/UNKNOWN/FALSIFIED results.
- L8:1–728, 2772–2864 repeats the steward/measurement/preservation ethos through
  personas and slogans. Preserve the behavior once, without a 20-role identity.
- L8:769–825, 2558–2668, 2868–2939 repeats a workflow and executable default
  mission. Preserve one mode-sensitive loop; no attached imperative expands this
  task's authority.

The resulting fusion should be shorter than its inputs while retaining the
distinct operational contracts. New code, source permissions, autonomous authority,
hard budgets and production success require their own evidence and accepted scope.
