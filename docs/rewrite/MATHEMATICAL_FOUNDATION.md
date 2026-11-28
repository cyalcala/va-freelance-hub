# Foundation v2 — practical mathematical engineering and verification

Date: 2026-11-28. Preserve existing MATH-01..13 identifiers and historical evidence. Additional items 14–24 are proposed cross-cutting obligations, not artificial completion targets. MATH-00 is the shared measurement/contract baseline. Do not claim a resolution because a paper, proof, local helper or test exists. Proof, implementation correspondence, native I/O semantics, statistical validation and deployed evidence are different kinds of acceptance.

## Core model
Maximize expected marginal distinct verified useful PH-eligible opportunities and useful directory evidence, minus latency/expiry loss and resource costs, under hard permission, source policy, publication, capacity and cost constraints. Given candidate work i, resource r, upper cost c_ir, feasible budget B_r, and marginal expected value v_i(S), choose a feasible set S with sum c_ir <= B_r for every r. Model overlap and uncertain yield; start with transparent greedy priority plus quotas and evaluate against a simple baseline. Never optimize raw scraped count, AI calls or a mandatory daily floor. No probabilistic score can confer permission. Unknown may be a HOLD; no inferred evidence presented as truth.

## Obligation register
| ID | Mathematical area | Practical outcome / acceptance |
| --- | --- | --- |
| 00 | Measurement, units, evidence | actual resource and flow counters, explicit UNKNOWN, deduplicated first-exposure IDs; baseline before optimization |
| 01 | Constrained allocation | measured marginal useful yield per cost; budget-feasible work selection; compare simple policy with adaptive model |
| 02 | Queueing/backpressure | finite queues, durable checkpoints, admission/deferral, bounded per-host concurrency; sustained overload test |
| 03 | Set/portfolio coverage | unique canonical job coverage, overlap-aware source value; don't double count |
| 04 | Arrival/adaptive polling | empirical change/arrival rates, source pacing, expiry-sensitive cadence; compare to fixed polling |
| 05 | Calibration/selective prediction | independently labeled PH/remote/freshness samples, precision/recall/coverage with intervals; abstain on ambiguity |
| 06 | State transitions/publication | typed evidence and authorization, fenced transactional commit, verify exact exposed IDs and lawful removal |
| 07 | Survival/reservoir | measure expiry and closure; prioritize useful live inventory, not stale stock |
| 08 | Diversity/risk | correlated provider/source failures, concentration metrics, avoid needless replicas |
| 09 | Identity/record linkage | deterministic canonical IDs and versioned equivalence, labeled uncertain linkage; don't merge incompatible jobs/location evidence |
| 10 | Incremental processing | canonical hash + dependency vector; reuse only when policy, authority, time, parser/model and evidence valid; delta vs full oracle |
| 11 | Decision/value of information | use AI only when marginal calibrated benefit exceeds resource cost, cap all fallback; compare deterministic baseline |
| 12 | Health/anomaly | observed source errors, drift, budget risk, freshness and false alerts; no missing denominator fabrication |
| 13 | Complexity/Amdahl | profile actual hot paths, memory and network; measure before/after; optimize only justified work |
| 14 | Resource conservation/isolation | durable reservations, shared budget/fences, all windows and cost caps, static serving independent of ingestion |
| 15 | Graph/dependencies | provenance/source relationship graph, invalidation and traversal bounds; no uncontrolled discovery |
| 16 | Information value | content novelty and meaningful change, no repeated AI on unchanged valid evidence |
| 17 | Temporal logic | retry, crash, lease expiration, concurrency, monotonic publish and reconciliation safety/liveness under stated assumptions |
| 18 | Deadline scheduling | source freshness, expiry and priority with fair service; avoid starvation; SLO hypotheses measured |
| 19 | Feedback/control | adaptive load, hysteresis, conservative pause thresholds, stable behavior under rate-limit shocks |
| 20 | Algebra/idempotence | deterministic normalization, replay/merge law where appropriate, commutativity only where valid, no duplicate publication |
| 21 | Consistency | transactional outbox/reconciliation across independent stores; don't claim distributed exactly-once transaction |
| 22 | Integrity | hash/version/manifests and provenance; independent verification and rollback, hash is not proof of source truth |
| 23 | Reliability | fault isolation, last-known-good and expiry/removal, restoration, measured availability |
| 24 | Amortized work | incremental cost per distinct useful job over a window; bounds on repeated scanning, retention and storage |

## Tooling selection
Rust is production runtime, Lean 4/Mathlib build-time specification/proofs for pure arithmetic, identity/time, budget and publication transitions. Charon + Aeneas for supported Rust subset: pin compatible versions, extract actual implementation and check drift; no unsupported I/O proof claims or unchecked custom axioms. Lean axiom audit, proof builds, theorem-to-Rust traceability and negative controls. Kani for bounded machine integer overflow and edge cases, proptest for native adversarial properties, TLA+/TLC for scheduler, concurrency/lease, outbox and recovery models with deliberately buggy negative controls and explicitly bounded state space. Native SQLite/libSQL/D1 contract tests for SQL semantics, failure injection for transport/cost meters; benchmarks and independent labeled evaluations for empirical domains. Use simplest adequate tool, no formal runtime dependency, no proof of external provider truth. Verify external API limits operationally.

## Required invariants (formalize early)
- Nonnegative checked-unit budget: consumed + outstanding reservations <= conservative admitted envelope; settlement and rollback preserve it, unknown consumption not silently refunded.
- Permission/source lease and item proof current at commitment; ineligible/unknown/revoked inputs cannot publish. AI output alone never grants authority.
- Unique operation IDs, version-bound canonical identity, stale token cannot write; retries do not create duplicate visible records or daily flow receipts.
- Canonical time semantics preserve original source date, explicit unknown dates, monotonic snapshot versions; no fabricated freshness on replay.
- Full vs incremental output observationally equivalent under declared dependency versions and valid current evidence; invalidate on expiry, removal and authority changes.
- Verified snapshot promotion only after durable complete validation, old generation stays if candidate fails; visitor path has no required ingestion/DB dependency. Stale exposure does not waive expiry or withdrawal handling.
- Queue and payload bounds, finite retry and cancellation, crash reconciliation; liveness conditional on provider availability, valid authority, time and available quota.
- Report actual first visible distinct job IDs, not raw writes or proxy storage counts; missing measurement is UNKNOWN.

## Acceptance protocol
Every work item: contract and assumptions -> fixture/negative control -> minimal Rust implementation -> proof or bounded test where justified -> independent native verification -> measured runtime/benefit/cost for applicable claims -> evidence ledger (commit, versions, exact proof scope, actual source and deployment IDs, observed metrics and limitations, next decision). Source-level and deployment acceptance distinct. No requirement to force every discipline into every module; proofs do not establish empirical accuracy or free-tier guarantees. Use MATH-14, 06, 10, 02 and 00 first; optimize 01/04 only after valid telemetry. Remaining 13 and additional obligations close with practical acceptance or documented justified non-applicability, not arbitrary theorem counts. Keep scope finite, release after verified utility, no endless math expansion.
