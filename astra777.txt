# Independent systems audit — 2026-10-10

**AUDIT ONLY. No implementation or production changes.** Prepared for Sol 6.1 or another maintainer under the existing governance. This document does not authorize a release, source transition, new queue, or mathematical acceptance.

Audited source: **3ae421645e088f6e08ded9429a5790c8ecbcabfc**, branch **codex/verified-flow-directory-checkpoint**, GitLab **cyrus-group4793641/va-freelance-hub**. Local and authenticated remote source SHAs agreed. During packaging, the owner committed and backed up documentation checkpoint **19c2031c6d41fd3ca8b7eb6b6eacf72904cc1da6**; this became the current HEAD. Its implementation is identical to audited 3ae42164. Dates in this report use Asia/Manila (+08:00).

**Principal finding:** fresh scrape can physically publish before checking original posting freshness. Eight controlled raw-response cases left active publicly selectable jobs despite UNKNOWN responses and no success ledger. Two impossible-calendar cases silently changed September 31 into October 1 and obtained successful receipts. The existing posting-date NEXT is justified; no repair was made.

Read the [continuation packet](INDEPENDENT_SYSTEMS_AUDIT_CONTINUATION_2026-10-10.md) and [portable evidence instructions](evidence/2026-10-10-independent/README.md).

## Evidence and coverage

VERIFIED denotes inspected code, authenticated repository metadata, or identified offline execution; scope is stated. STRONG INFERENCE denotes supported conclusions lacking direct operational proof. HYPOTHESIS denotes an untested explanation. UNKNOWN denotes insufficient evidence, never success or failure.

Whole-repository inventory and targeted semantic review covered opportunity INSERT/UPDATE and PH-only visibility changes; gateway/retry helpers; four held activations; fresh RSS/RemoteOK parsing; lake intents/authority/inspection/raw-sync fence; public query/snapshots/Apply; withdrawal; manual scripts/migrations/legacy app; Worker/GCP/workflow callers; source constitution; mathematical registers and diagnostics. This was not a line-by-line review of every historical/generated file, binary or dependency. Arbitrary external SQL and unknown deployed images remain outside static coverage.

No production DB/source requests, jobs, deployments, admissions, parameter changes, provider changes, or schedules were performed. Offline checks used in-memory SQLite, actual migrations/Drizzle/routes, and substituted raw transport with unexpected requests rejected. Ordinary public GETs were skipped because serving can schedule D1 snapshot writes. Unchanged failed production-access probes were not repeated. Existing full-suite receipts were fingerprint-verified; the entire suite was not rerun.

## A. Governance recovery

| Authority | Canonical current copy | Scope |
|---|---|---|
| Current mission | Independent audit, clarified mainly read-only | Audit and portable handoff; no inherited execution permission |
| Master Prompt | docs/bootloaders/MASTER_OPERATING_PROMPT.md v6.5 | Sections 2–5 separate authority/facts/maturity; 7 and 10A–10D govern publication/math/priority |
| Bootloader | docs/bootloaders/MAINTAINER_BOOTLOADER.md v6.5 | Bounded recovery/execution; template does not start production |
| Execution wrapper | docs/bootloaders/EXECUTION_PROMPT.md v6.5 | Supporting task wrapper |
| CURRENT/savepoint | docs/bootloaders/CURRENT.md → docs/SYSTEM_SAVEPOINT.md | CURRENT navigates; savepoint owns mutable baton |
| Constitutions | docs/MASTER_OPERATING_CONSTITUTION.md v3.0; CONSTITUTION.md v5.2 | Full fifteen qualifying conditions and D1–D9 acceptance dimensions |
| Source constitution | docs/SOURCE_REPLENISHMENT_MASTERPLAN.md:80–109; complete Autonomy Cutover Predicate | Source-domain authority, not another execution queue |
| ADRs | ADR-007/006 and scoped ADR-008 | Constitutional target, controlled bootstrap, risk tiers; no inferred cutover |
| Architecture | docs/architecture/CURRENT_STATE.md; October 4 reconciliation; ADR-010 | GCP background, Turso acquisition, D1 serving, Cloudflare edge; accepted snapshot availability behavior |
| Parameters/metrics | docs/ACCEPTED_PARAMETERS.yaml v2, owner 72709b1; docs/METRICS.md October 8 correction | Fixed values; stock/receipts/first exposure are different populations |
| Sole queue | docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md + current task/savepoint | MATH and SSAE support this queue |
| Continuity | docs/operations/SOURCE_CONTROL_FALLBACK_2026-10-09.md | Authorized GitLab fallback, no automatic merge/history rewrite/clock |

The master's domain-specific precedence applies: source restrictions/opt-outs constrain the masterplan, then ADR-007/006, bootstrap strategy and sole executable plan. Savepoint owns state; code/tests/observations settle factual claims. Runtime violating policy does not become policy. September prompt variants, October 1 topology, June audits, terminal Gauntlet units and the August exact-six inventory are historical where later scoped evidence exists. The exact-six fallback identities remain executable but are not a complete current source inventory.

AGENTS is present; `.ai/manifest.yaml` and `scripts/skill-router.py` are absent. Code-review skill guidance and the Jev skill were consulted. Current checkpoint records unchanged Jev 401; no repeated probe/provider substitution was made. Deterministic evidence settles these findings.

### Acceptance of 3ae42164 and current NEXT

**VERIFIED local correction:** scrape.ts:2689 now forwards item.locationType before geoGate/AI/public staging. Synthetic onsite/hybrid consumer cases remain hidden. NULL/unsupported are noncontradiction controls, not independent remote proof. Current admitted-provider enum-only escape was not demonstrated.

Final source/test hashes and native RED/corrected diagnostic/GREEN/final GREEN/full/type/build/four-audit log hashes match the evidence. Full behavioral freeze records **3954 pass / 0 fail / 326182 assertions / 247 files**; final focused run **13/0/76**. Removing the final fixture-only `as const` reproduces the earlier full-suite hash. The **3941** count belongs to the prior held-row unit.

**Scoped local behavior and source/checkpoint durability are established.** At audit entry, SYSTEM_SAVEPOINT, CURRENT, MATH and SSAE plans were dirty; three operations files were untracked and the final external restore receipt was absent. The implementation owner then committed those seven documentation files at **19c2031c6d41fd3ca8b7eb6b6eacf72904cc1da6** and pushed them. Independent remote readback matched. The subsequently created full bundle verified without prerequisites; its SHA256 matched; the restored checkout was clean at 19c2031c and all ten recorded source/test/document Git blobs matched. This audit did not alter or adopt the owner's files. The earlier documentation gap is resolved for this checkpoint.

Current local and backed-up CURRENT/savepoint name **PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE**. Do not redo the accepted enum forwarding or checkpoint closure. This audit supplies the date unit's missing raw-parser/native failure evidence, not repair acceptance. Production/CI/runtime/all-writer/QUPD acceptance remains unestablished.

### Immutable constraints

| Constraint | Accepted value |
|---|---:|
| False PH / false remote | ≤1% / ≤0.5% |
| Broken apply URL / public duplicates | ≤1% / ≤0.5% |
| Unsafe jobs | 0% |
| Original posting freshness | Inclusive 30 days; unknown retained but unpublished |
| Source/provider family share | ≤25% / ≤40%, within accepted measurement scope |
| Cost/net-new publication | ≤5 cents |
| Requests/source/day; AI/day; writes/day | 200;500;50000 |
| Sync backlog maximum age | 2 hours |
| Autonomy | L1 advisory; no inferred graduation |

Priority 10/5/15-minute SLOs are proposals, not accepted/current measurements. No PARAMETER_REVIEW_CANDIDATE is needed to address the demonstrated failures.

### Holds, owners, protected work

Preserve source-specific observations, canaries, leases, opt-outs, experiment controls and the full cutover predicate. Directory/discovery/fetch success grants no publication authority. Historical Crawl4AI/Kitesurf/exact-six/shadow controls are not today's inventory or permission.

Directory 234/237 have reviewed factual proposals; 236 remains identity/rebrand-held. Latest packet is 3 HELD / 0 READY / 0 SQL / 0 applied after CF7403. Account owner restores normal access; maintainer obtains fresh exact-row baseline/review. GCP billing/image access and Janes 9046/9047 incident remain unresolved. Changed access/configuration/new execution is the re-observation trigger; no speculative IAM/deployment/compensation here. GitHub suspension/release/backup stays pending separately. Lucky777 ACTIVE/older APEX PAUSED are saved local coordination states, not newly inspected live state; neither changed.

### GOVERNANCE_DRIFT

| ID | Expectation | Reality / consequence | Smallest reconciliation |
|---|---|---|---|
| GD1 | Invalid/unknown/stale/future originals do not publish | Native fresh route writes first; invalid calendar can become successful freshness receipt | Existing date unit: validate raw evidence and gate before public write |
| GD2 | Every public writer uses gateway | Active/unclear PH sweep directly upgrades visibility | Native sweep proof, then scoped current-authority/item/receipt repair |
| GD3 — RESOLVED during audit | Portable checkpoint carries completed unit and NEXT | Owner checkpoint 19c2031c now has exact remote readback and verified clean restore | No further closure work for this unit; preserve source/runtime distinction |
| GD4 | Low interarrival CV does not prove queue stability | queue-metrics.ts:73–108 sets applicability from low CV | Treat as provisional heuristic; require boundary/conservation/equilibrium evidence |


## B. Executive system verdict

**Maturity:** governed and partially instrumented, with substantial local boundary hardening and incomplete deployed acceptance.

**Strongest invariant:** scoped gateway receipts use actual distinct IDs/counts; ambiguous post-write failures stay UNKNOWN and stop later sequential writers, preserving confirmed prefix. Four inspected held activations reject explicit onsite/hybrid. Neither proves every writer/current public stock.

**Largest correctness problem:** public visibility can precede or bypass complete qualification. Receipt truth is stronger than public-row truth.

**Dominant throughput bottleneck: UNKNOWN empirically.** Checked-out code fences raw lake publication; its replacement currently stages/inspects privately without publishing. This is a concrete code-level capacity constraint. Current image, supply and stage losses are insufficiently observed to rank today's live bottleneck.

**Dominant operational risk:** reviewed code cannot yet be tied to functioning governed production publication and confirmed incident containment/recovery. Dated billing/container failures and unavailable baseline remain material.

**100–150/day:** accepted objective; certified complete-Manila-day QUPD and numerical gap UNKNOWN. Accepted MATH remains 0/13.

## C. Problem ledger

| Problem | State | Evidence | Remaining gap | Severity |
|---|---|---|---|---|
| Source authority | PARTIALLY SOLVED | Registry/opt-out/lease gateway; raw fence | Sweep/manual paths; policy-to-write race; runtime | High |
| Item provenance | PARTIALLY SOLVED | Hashes/private Greenhouse correspondence | All-item origin/permission/remote/safety | High |
| PH eligibility | PARTIALLY SOLVED | Shared tuple/gate/ACK | Independent calibration; sweep; all writers | High |
| Remote status | PARTIALLY SOLVED | Explicit enum repairs | Default/NULL origin; later drift; sweep | High |
| Freshness | OPEN | Twelve raw-parser native scenarios | Raw validity and pre-write gates/recovery parity | High |
| URL validity | PARTIALLY SOLVED | Safe attributed ACK URL; verifier | Current application liveness/withdrawal | High |
| Dedup | PARTIALLY SOLVED | Keys/conflicts/prune | Canonical cross-source identity/labels | Medium |
| Publication receipt truth | STRONGLY MITIGATED | Actual IDs/counts, UNKNOWN/prefix | Item-write origin, durable uncertainty, bypasses | High |
| Retry identity | STRONGLY MITIGATED | Detached material/source/action/tick/count/IDs+hash | Universal integration; replay not fresh/current proof | High |
| Concurrency ownership | PARTIALLY SOLVED | Held source/state/type SQL fences | Registry epoch/shared caps/later drift/siblings | High |
| Recovery parity | PARTIALLY SOLVED | Four guarded activations | Sweep/post-write freshness/legacy images | High |
| Withdrawal | OPEN | Verifier/prune/live Apply check | Universal invalidation/bounded stale exposure | High |
| Row/ledger/serving consistency | OPEN | Sequential effects and snapshot telemetry | Durable reconciliation and visibility contract | High |
| Source supply | UNKNOWN | Dated lake/storage evidence | Current authorized marginal fresh yield | High |
| Queue latency | UNKNOWN | Pure stage/clock contracts | Populated coherent timestamps/censoring | High |
| Source economics | PARTIALLY SOLVED | Reports/advisory ranker | Actual QUPD/cost; false-zero denominator | Medium |
| Observability | PARTIALLY SOLVED | Receipts/logs/snapshot metadata | Durable why-public/why-held end-to-end trace | High |
| GitLab continuity | PARTIALLY SOLVED | Fresh clone/fsck/clean checkout | Review/CI/default/data backups; current packet restored | High |
| MATH01/02/04/05/06/08/09/10/12/13 | PARTIALLY SOLVED | SectionG local mechanisms | Individual empirical/operational acceptance | High |
| MATH03/07/11 | OPEN | Accepted cards | Coverage/survival/AI-value evidence | Medium |
| SSAE00–09 | PARTIALLY SOLVED | Pure modules/contracts | Real integration/data/benefit | Medium |
| SSAE10–15 | OPEN | Proposed dependency cards | Preconditions/authorized experiments | Medium |

## D. All-writer map

Publication includes **any transition into the public predicate**, not only setting is_active. URL means syntax/attribution unless live checks are named. Current code reachability does not prove current deployment.

| Writer/input | Authority | PH | Remote | Fresh | URL | Dedup | Receipt | Recovery/classification |
|---|---|---|---|---|---|---|---|---|
| Fresh scrape; scrape.ts:2684,2873,2920; adapter rows | Gateway policy pre-read | Gate+AI | Forwarded enum contradiction | **Post-write**; parser rollover gap | Sanitize+ACK | Precheck+conflict-ignore | Actual IDs/UNKNOWN | Current route; sequential stop |
| api/ingest.ts:45,62,233; authenticated payload | Gateway for supplied source ID | Gate | Enum; missing/unsupported defaults remote | Raw strict precheck | Sanitize+ACK | DB conflict-ignore | Actual IDs/UNKNOWN | Current; supplied identity not full item origin |
| Inline drain; scrape.ts:415,430,529; hidden pending | Gateway+selected source | Re-gate+triage | Early reject+SQL exclusion | Post-write ACK | Sanitize+ACK | Existing row | RETURNING | Conditional/default-off; source/state/type fences |
| Inngest triage-drain.ts:119,132,224 | Gateway+detached source | Re-gate+triage | Early reject+SQL exclusion | Post-write ACK | Sanitize+ACK | Existing row | RETURNING | Registered pilot; UNKNOWN NonRetriableError; siblings not group-cancelled |
| Gate recovery; scrape.ts:615,640 | Grouped gateway | Current scope CASE/fence | Selection+UPDATE | Post-write ACK | ACK | Existing IDs | RETURNING | Source/pending/scope fenced |
| Feed reactivation; scrape.ts:698,716,733 | Grouped gateway | Current pair in UPDATE | Selection+UPDATE | Post-write ACK; reappearance not original age | Current selected URL set+ACK | Existing row | RETURNING | Recoverable reasons; actual overhead controls 100-bind sizing |
| **Unclear sweep; scrape.ts:1281,1300,1449** | **No gateway/source check** | AI+skeptic; single vote if skeptic unavailable | **Field omitted** | **None** | **None** | Existing row | **None** | Current calls2469/2568/3022; ID-only PH upgrade publishes |
| scripts/graduation/ingest-graduated-sources.ts:51,75,92,95,140 | Historical hard-coded list | Gate | Enum omitted | Missing→now | Adapter fallback | URL upsert | Console counts | Manual remote executable; no active caller found; use UNKNOWN |
| scripts/backfill-geo.ts:65,70,73 | Operator-applied generated SQL | PH upgrades/deactivation | Supplied gate input | None | None | Existing IDs | None | Historical/manual; PH upgrade can publish |
| Migration0046 steps2–4:47,59,71 | Dated one-shot scope | Stored text/scope upgrade | Partial text | None | None | Existing row | None | Historical, never reusable shortcut |
| Migration0047 step3:67 | Dated named-source scope | Yokly location upgrade | No current independent proof | None | None | Existing row | None | Also deactivates cohorts; historical |
| scripts/lake/sync-to-d1.ts:26,367,481 | **Real execution fenced** | Legacy tuple below fence | Legacy remote literal | Legacy stored date | Legacy candidate URL | Legacy upsert | Legacy empty-ID builder | Non-dry run throws; planning grants no authority |
| GCP lake publisher/GHA fallback | Delegates to fenced sync | Inherited | Inherited | Inherited | Inherited | Inherited | Blocked reviewed source | Current image equivalence UNKNOWN |
| Hunter/freshness Worker | Authenticated scrape callers | Inherited | Inherited | Inherited | Inherited | Inherited | Response count/UNKNOWN assessment | No independent safe publication guarantee |
| scripts/gha/harvest.ts:4 | **Top-level quarantine throw** | Unreachable legacy body | — | — | — | — | — | Not a current executable bypass |
| apps/web-nextjs-backup/app/api/cron/scrape/route.ts:55,130 | Legacy separate app | AI inserts; reactivation skips | Defaults | No current gate | Legacy values | Hash/conflict | Proposed counts | Historical; deployment UNKNOWN |
| Public snapshot rebuild/LKG; public-serving-snapshot.ts:46,270,575,697,738,822 | Serving authority, no per-item registry/receipt gate | Active+PH at rebuild | No current gate | No original-age gate | Render sanitation | Snapshot unique IDs | Snapshot telemetry | Current serving writer; retains old board |

References beginning scrape.ts mean `apps/web/src/pages/api/cron/scrape.ts`; triage-drain is under `apps/web/src/lib/inngest/functions/`. Migration paths are in `packages/db/migrations/`.

**Other candidates classified:** adapter constructors and schema isActive=true defaults are inputs, not independent writers; source promotion/intake/directory changes grant no item publication; attribution/category/click-count changes alone do not change visibility; FTS triggers index rows without authority; rehearsal scripts write synthetic DBs. Lake-stage/inspect in ingest.ts:130 onward explicitly returns zero publication/qualification authority and does not fall through to ordinary inserts.

Missing-binding fallback branches remain in helpers. `packages/db/client.ts:15–19` requires D1; a normal valid binding also supplies the gateway. The old libsql fallback is gone. These are latent helper/test surfaces, **not a demonstrated normal-production missing-binding bypass**. October3's writer inventory contains superseded behaviors and is historical.

### Verified fresh-scrape failure

The offline fixture retains real RSS/RemoteOK parsing, actual createScrapeHandler, Drizzle, every production migration, native SQLite, FTS, gateway and canonical publicOpportunityFilters. Only transport/AI are synthetic. The recorded public result is a query result, not a live browser observation.

| Raw date | Cases | Response | Physical/public-query outcome |
|---|---:|---|---|
| Missing/unparseable/stale31days/future1day | 8 across two adapters |500/UNKNOWN|Active eligible row; query selects ID1; FTS1; no success ledger |
| Fresh1day |2|200|Active/query ID1; successful ledger ID1 |
| Impossible2026-09-31T12:00:00.000Z |2|200|Becomes October1; active/query ID1 **and successful ledger ID1** |

Failure anchors: `packages/scraper/rss.ts:50,156`; `json.ts:36,154`; fresh staging `scrape.ts:2873,2895`; actual insert `:2920`; `publication-gateway.ts:356,365` persists then checks; freshness assessment `:333`; `public-opportunities.ts:11` requires only active+PH.

**A late assessPostingFreshness on an already-normalized ISO value is insufficient.** It cannot distinguish an original valid October1 from repaired September 31. Repair must preserve/validate original supported parser evidence without inventing dates or indiscriminately rejecting legitimate RSS formats.

### Unclear sweep: VERIFIED code, native/live occurrence UNKNOWN

`sweepCols` at scrape.ts:1281 omits source/date/workplace/URL. Selection1300/1313 chooses active+unclear. Positive AI/skeptic path1449 changes PH to eligible_likely with only ID in WHERE1456. Shared public predicate then selects the row. This is a reachable visibility writer outside gateway regardless of whether isActive changes.

The attempted separate sweep fixture did not produce its expected result marker: alias resolution failed, and a later invocation emitted usage instead of executing. **Neither is behavioral evidence; exit0 is not a pass.** The failure is code-established; controlled native reproduction remains the next bounded follow-up after date acceptance. No speculative source-state change is authorized.

## E. Invariant matrix

| Invariant | Established at | Revalidated at | Write fence | Withdrawal | Recovery parity/known gaps |
|---|---|---|---|---|---|
| PH | geoGate/triage | Exact current IDs+shared PH tuple | Some held scope/state predicates | Some verifier/sweep deactivation | Sweep upgrade bypass; independent truth not certified |
| REMOTE | Explicit enum contradictions | ACK rejects onsite/hybrid | Four held UPDATE exclusions | No universal later-drift withdrawal | Default/NULL origin unproved; sweep omits type |
| FRESHNESS | Ingest strict raw check; adapters elsewhere | Gateway after persistence | Ingest precheck; fresh absent | Verifier ages lastSeen/scraped | Native fresh failures/calendar repair; held ACK too late |
| URL | Sanitizers/attribution | Exact stored URLs at ACK/Apply target binding | Selected URL set on feed reactivation | Async source-link verifier | Safe syntax is not reachable current application URL |
| DEDUP | URL/hash and DB uniqueness | Conflict/prune | Exact key | Selected duplicate archive | Cross-source canonical identity unvalidated |
| SOURCE AUTHORITY | Resolver/gateway registry/opt-out/lease | Lake inspect reads twice | Future lake batch guard; ordinary epoch fence incomplete | No universal registry-change fanout | Sweep/manual paths; shared caps/revocation races |
| ITEM PROVENANCE | Identity attachment/private manifest/raw correspondence | Bounded Greenhouse inspection | Immutable intent/hash/revision | No universal invalid-origin withdrawal | Correspondence is not collection origin/permission/remote proof |
| PUBLICATION RECEIPT | Detached request+actual IDs | Dense IDs/current ownership/fields | Append-only/unique controls after row write | History retained | No durable universal uncertain-effects queue; replay not new flow |
| PUBLIC VISIBILITY | Active+eligible PH | Snapshot rebuild/Apply live lookup | No full qualification/receipt predicate | Async rebuild and live Apply refusal | Stale boards; remote/source/date drift alone may not hide |

### Actual consistency and withdrawal contract

The code uses **row mutation → row observation → ledger append**, then asynchronous snapshot/cache/UI propagation. It is not distributed ACID; this audit does not demand a replacement architecture. Missing work is an explicit safe, observable, idempotent reconciliation and withdrawal model.

Gateway policy is read at publication-gateway.ts:195 before persistence. Post-write row ownership is not a transactionally fenced registry epoch. Canary cumulative ledger triggers execute after physical writes. **STRONG INFERENCE:** revocation or competing-cap decisions can leave physical effects despite later receipt refusal. Native concurrency reproduction and actual runtime overlap remain unproved. Held row-source CAS does not solve source-policy CAS.

FTS follows row writes through SQLite triggers. In the inspected native Bun SQLite/FTS fixture, the meta.changes proxy includes trigger effects; prior hidden-row values 7/14 are not 7/14 jobs. Equivalent live D1 behavior was not established. Actual opportunity IDs are the evidence. UNKNOWN truthfully preserves ambiguity but does not itself compensate or withdraw.

| Later invalidity | Existing control | Remaining gap |
|---|---|---|
| Onsite/hybrid | New held activations block explicit contradiction | Public/later-drift cohort has no universal withdrawal |
| Non-PH | Some verifier deep checks and sweep rejects | Full-cohort reevaluation and stale-decision fences |
| Expired/deleted | verify-links.ts:90 ages lastSeen/scraped | Original-date expiration/deletion proof; rediscovery can keep old row alive |
| Unreachable | Invalid URL and hard-dead strikes, verifier:141,189 | Application liveness and current sweep coverage |
| Duplicate/superseded | api/cron/prune.ts:57 | Canonical lineage and saved-board withdrawal |
| Source revoked/lease expired/opted out | Gateway blocks some future writes | Existing-row and snapshot/search withdrawal |
| D1 deactivated | api/click/[id].ts:57 live active+PH lookup;503 on unavailable DB | Stale cards/detail/sitemap; Apply does not independently check remote/date/source |

This is an unresolved withdrawal/consistency contract, not a finding that accepted ADR-010 behavior alone violates governance. ADR-010 intentionally retains stale/LKG availability. Snapshot validation can reject empty or suspiciously collapsed boards, including legitimate mass withdrawal. No universal maximum stale-board age exists. Refresh thresholds/cache TTLs are not a proven withdrawal deadline. Preserve ADR-010 and reconcile revocation explicitly.

### Provenance and lake→D1 authority

Private stage manifest hashes include source and exact candidate membership/material. Migration0055 preserves operation/source/manifest/descriptors and controls revision/REPLACE/delete behavior. Staging returns STAGED, publishedCount0, syncedCount0, publicationAuthorizedfalse. Lake inspect rereads immutable intent and current source authority around evidence reads. Issued frozen authority objects and a throwing same-batch SQL guard are local prerequisites, not publication clearance.

The bounded Greenhouse item inspection explicitly retains holds for collection/origin/robots/cadence/shared budgets/remote/PH exclusions/safety/application liveness/canonical identity/taxonomy. See `apps/web/src/lib/lake-item-binding.ts:45–49`; `lake-publication-intent.ts:91,127`; `lake-publication-authority.ts`; `ingest.ts:139–180`. It proves selected correspondence, not universal verified provenance. Ordinary public rows cannot yet universally reconstruct source→item→original post→URL→PH→remote→freshness→qualification→first publication→current visibility.

Raw sync's real-execution fence remains intact. QUALIFIED_READY, auto-approved tenant or stored raw payload is not source/item/publication authority. Current deployed raw-writer containment remains UNKNOWN; local fence is not a runtime receipt.

## F. Current funnel and economics

**All current production stage counts remain UNKNOWN.** Historical rows below have different cohorts and cannot be combined into a conversion funnel.

| Stage | Current | Dated evidence/limit |
|---|---|---|
| DISCOVERED | UNKNOWN | October8:49 auto-approved discovery tenants; neither all discovery nor authority |
| FETCHED | UNKNOWN |389 raw observations/1 unprocessed; records not unique jobs |
| NORMALIZED | UNKNOWN |567 D1 rows in October1–7 storage cohort, not normalization events |
| UNIQUE | UNKNOWN |No certified canonical cross-source count |
| PH-ELIGIBLE | UNKNOWN |306 currently eligible stored rows in dated cohort; no independent certificate |
| REMOTE | UNKNOWN |No certified remote denominator |
| FRESH | UNKNOWN |198 eligible recent-posting stored rows/28.3/day storage proxy; not first exposure |
| URL-VALID | UNKNOWN |No matched current liveness denominator |
| QUALIFIED_READY | UNKNOWN |Two Janes ready/unsynced October8~10:48UTC; no clearance |
| SYNCED | UNKNOWN |1067 cumulative lake-status rows |
| PUBLIC | UNKNOWN |Current physically-public/authorized intersection unmeasured |
| VISIBLE | UNKNOWN |October8 snapshot1539 jobs/735 companies; later1556 jobs; stock only |

Sources: docs/operations/publication-funnel-baseline-2026-10-08.md and VERIFIED_FLOW_DIRECTORY_2026-10-08_EVIDENCE.md:14–62. Daily storage proxies43,21,27,17,7,41,42 are not daily QUPD or a certified gap to100/150.

**VERIFIED diagnostic defect:** source-economics.ts:545–549 emits0.00 for zero fetch/item denominators. Latest dated report has foundry-for-good27 eligible/0 observed fetches and truezerotech17/0. These are undefined/missing cross-path attribution, not demonstrated zero productivity. Preserve UNKNOWN before allocating against them.

The advisory ranker uses qualifiedReady×recentPHRate and assumed costs (scripts/lake/source-ranker.ts:388–410), not measured marginal QUPD/total cost. The October8 report's high item/low yield and concentration warnings are investigation leads only. Current cost, marginal source value, queue age and expiry loss are unvalidated. No source should be retired from those proxies alone.

## G. Mathematical state

Audit classifications do not modify accepted statuses. No whole MATH unit is PROVEN; accepted total 0/13. MATH00 is shared mapping, not a fourteenth challenge. Canonical cards: docs/plans/MATHEMATICAL_IMPROVEMENT_PLAN.md:297–600.

| Unit/purpose | State | Evidence/production impact | Remaining acceptance |
|---|---|---|---|
| MATH01 allocation/exploration | PARTIAL | Advisory heuristic ranker | Mature canonical marginal rewards/costs and controlled benefit/baseline adequacy |
| MATH02 queue/backpressure | PARTIAL | Pure helpers; low-CV caveat | Coherent arrivals/exits/in-flight conservation, capacity/burst/retry/restart evidence |
| MATH03 marginal coverage | OPEN | Source reports without overlap baseline | Matched-budget marginal coverage and uncertainty |
| MATH04 arrivals/polling | PARTIAL | Dated deployed host cooldown/migration0051 | Censored arrivals; latency/cost benefit; no starvation/storms |
| MATH05 qualification/calibration | PARTIAL | Local PH/remote controls | Independent temporal/subgroup labels and correct error denominators |
| MATH06 publication authority | PARTIAL | Gateway/intent/receipt/ownership improvements | All writers, shared controls, safe partial failure, withdrawal, runtime |
| MATH07 reservoir survival | OPEN | Ready/unsynced diagnostics | Observed age/censoring/actionable survival and expiry-loss benefit |
| MATH08 concentration/failure domains | PARTIAL | Metrics/helpers | Exact contribution/shared headroom/correlated-loss enforcement |
| MATH09 entity resolution | PARTIAL | Exact identities/keys | Labeled false merges/splits, stable canonical reversible lineage |
| MATH10 change/replay | PARTIAL | Pure modes/delta/replay | Wired invalidation including public withdrawal; total savings |
| MATH11 AI value | OPEN | AI paths exist; value/cost unknown | Matched no-model/model outcomes, harm/cost/abstention/drift |
| MATH12 health/SPC | PARTIAL | Local truth/diagnostic/failure receipts | Independent incidents, detection/false alarms, cause-specific recovery |
| MATH13 latency/acceleration | PARTIAL | Stage/clock contracts | Populated comparable workload, queue/CPU/network/AI/DB split and benefit |

Immediate constraints are MATH06/05 publication trust, MATH12 runtime knowledge and MATH02/13 valid measurement. Allocation cannot optimize uncertified reward as though it were QUPD.

| SSAE unit/purpose | State | Evidence/impact | Remaining acceptance |
|---|---|---|---|
|00 reality/profile | PARTIAL |October4 profile contract |Populated current boundary/runtime/clock profile |
|01 attention dataset | PARTIAL |Schema/query manifest |Selection-time features, mature labels, censoring/leakage |
|02 compact memory | PARTIAL |Memory/replay contract |Real ownership/dependency versions/retention/replay coverage |
|03 read-only ranker | IMPLEMENTED BUT UNVALIDATED |Pure source-ranker.ts |Frozen parity/exclusions and calibrated reward/cost |
|04 temporal holdouts | PARTIAL |Evaluator LIMITED without mature labels |Actual leakage-free matched cohorts/horizons/uncertainty |
|05 shadow decisions | PARTIAL |Advisory UNKNOWN/LIMITED |Representative cycles and outcome coverage |
|06 measurement/audit | PARTIAL |Pure latency/replay/measurement contracts |Populated instrumentation and valid sampling/cost/join receipts |
|07 modes/invalidation | PARTIAL |FULL/REINDEX/REUSE/BOUNDED_REPLAY contracts |Runtime fetch integration, authority/TTL/version invalidation/withdrawal |
|08 incremental pool | IMPLEMENTED BUT UNVALIDATED |Pure two-tier bounded pool |Real events, cold-tail/skew/staleness and actual maintenance cost |
|09 exact delta/replay | PARTIAL |Pure cursor/dependency/withdrawal derivation |Governed public/cache execution and concurrency parity |
|10 constrained allocator | BLOCKED |Proposed dependencies |03–09 evidence, MATH02/06/shared reservations/control benefit |
|11 optional exploration | BLOCKED |Proposed |Mature06/10, demonstrated cold-tail need/inclusion probabilities |
|12 optional GCP sharding | BLOCKED |Proposed |Measured wait bottleneck and shared pacing/fencing/runtime |
|13 AI value routing | OPEN |Proposed |Mature ambiguity cohorts and total outcome/cost comparison |
|14 scheduling canary | BLOCKED |No accepted live canary established |Core evidence/scoped authority/exact runtime/rollback |
|15 graduation/recovery | BLOCKED |Proposed |Mature14 plus full quality/cost/uncertainty/recovery drill |

Anchors: SPARSE_SOURCE_ATTENTION_IMPLEMENTATION_PLAN.md:113–122,215–356; October4 SSAE audit cards; scripts/lake/{source-ranker,shadow-decisions,measurement-contracts,processing-modes,candidate-pool,job-delta-replay,stage-latency}.ts. Import review found supporting pure modules/diagnostics, not demonstrated production publisher integration. BLOCKED means missing card prerequisites, not stop all independent work. Optional exploration/sharding must earn adoption; DeepSeek inspiration proves no neural migration or speedup.

## H. Ten nastiest remaining problems

Ranked by expected trust-constrained QUPD impact, not a measured causal throughput ranking.

| Rank/problem | Failure/evidence | Impact | Smallest next attack | Acceptance |
|---:|---|---|---|---|
|1 Original-date publication | VERIFIED local 12 scenarios |Unsafe stock; false freshness receipt possible |Existing raw-parser/date unit |Bad originals never enter public predicate/positive IDs; valid controls retain original meaning |
|2 PH-only unclear sweep | VERIFIED code, native/live UNKNOWN |Public exposure without current source/item/receipt gates |Native active/unclear matrix and concurrent changes |Every upgrade governed and fenced; actual IDs only |
|3 Uncertain effects/later drift | VERIFIED mechanism; extent UNKNOWN |Rows outlive failed receipts/changed validity |ACK/ledger failure and drift across row/snapshot/Apply |Durable uncertainty; explicit safe, idempotent reconciliation |
|4 Registry/shared-cap race | STRONG INFERENCE |Permission/physical exposure may exceed decision |Interleave revoke/expire/cap reads/writes |Current authority and physical caps enforced or accepted bounded compensation |
|5 Runtime provenance/containment | Dated failures, current UNKNOWN |Local repairs may not govern executing publisher |Changed-access image/config/execution/Janes readback |Exact artifact and incident containment observed |
|6 Withdrawal versus stale/LKG | VERIFIED code/ADR tradeoff |Invalid inventory remains discoverable |Single and mass revocation under D1 failure |Accepted cross-surface withdrawal/stale exposure contract |
|7 Default remote/item origin | VERIFIED missing proofs |PH/source reputation substitutes for item fact |Raw missing/contradictory metadata/origin mismatch |Verified provenance and independent remote evidence |
|8 First exposure/funnel missing | VERIFIED evidence gap |Cannot measure QUPD or losses |One same-cohort end-to-end exposure trace |Complete-day cohort/visibility/quality denominators or UNKNOWN |
|9 Utility/queue measurement | VERIFIED false-zero and heuristic gaps |Allocation may starve valuable source |Zero-denominator economics plus coherent queue accounting |UNKNOWN retained; mature marginal outcome/cost/conservation |
|10 Default-branch/review/data recovery gap | VERIFIED |Default clone lacks project; Git recovery does not recover runtime data |Governance-compatible default/review decision and separately scoped data restore evidence |Explicit source recovery retained; reviewed continuity and runtime-data recovery receipts |

## I. What NOT to work on

- Do not replace architecture, source constitution or thresholds to obtain larger counts.
- Do not reopen completed enum/receipt work just to repeat full suites; attack only new demonstrated coverage gaps.
- Do not remove the raw-lake fence. Private intents/inspection are not a completed publisher.
- Do not expand source count, cadence, AI volume or shards before prerequisite trust/measurement evidence.
- Do not infer starvation from a small ready queue or permission from auto_approved/directory/fetch success.
- Do not force bandits, neural sparse attention, specialist runtimes, a dashboard or another scheduler to complete card counts.
- Do not repeat unchanged GitHub/CF/GCP/Jev failure probes; retain owners and changed-evidence triggers.
- Do not merge README main, rewrite history, replay migrations0046/0047/0052 or equate Git backup with DB/GCP recovery.

## J. NEXT PROBLEM QUEUE

Only the recovered savepoint's posting-date unit is current engineering NEXT. Later entries are dependency-ordered recommendations; the normal checkpoint must select them. This audit dispatches no second queue.

### Completed prerequisite: existing acceptance packet durability

Owner checkpoint **19c2031c** is committed, remotely backed up and independently restore-verified. It carries the completed scoped metadata unit and posting-date NEXT. This prerequisite is **complete**; do not reopen it. The audit source remains 3ae42164 because the newer checkpoint changed only documentation. Runtime/data acceptance remains separate.

### PROBLEM UNIT: PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE

**Invariant/objective:** original posting evidence must be valid, known, nonfuture and within unchanged inclusive30days before physical public exposure; normalization cannot fabricate validity.

**Why this is next:** current backed-up sole NEXT; audit now proves both active exposure on UNKNOWN and impossible-calendar exposure with a successful receipt.

**Evidence required:** supplied raw RSS/JSON/native results; freeze current source and raw/normalized representations; extend exact-boundary cases before repair.

**Minimal implementation boundary:** existing RSS/RemoteOK date mapping and fresh route staging, reusing accepted freshness logic. Preserve legitimate supported provider formats, raw meaning, source/PH/remote/URL/dedup/batching. A check only after permissive normalization is insufficient. No new threshold/source permission/provider or unneeded architecture.

**Adversarial tests:** missing/unparseable/impossible calendar; future/submillisecond edge; exactly30days/just older; timezone/RSS formats; mixed valid-invalid; conflict/dedup zero; retry; source/workplace drift; UNKNOWN/confirmed prefix.

**Native verification:** real parsers→actual route→isolated native SQLite/Drizzle/production migrations→exact physical rows/public and snapshot query/FTS/ledger IDs. After implementation, required targeted/full tests, types, build and guardrails. Live D1/runtime is separate.

**Acceptance:** bad original dates yield zero active public-selectable rows and zero successful publication IDs; valid inclusive-window controls preserve original meaning/actual IDs; mixed batches expose only qualified rows; existing contracts remain green; reviewed evidence/source/checkpoint remotely backed up and actual recovery proved. No production acceptance without authorized exact-version observations.

**Unblocks:** native proof and repair of active/unclear PH-upgrade publication.

### PROBLEM UNIT: unclear-backlog public-visibility transition

**Invariant/objective:** PH upgrades on active rows are publications with the same current authority/item/receipt requirements.
**Why next:** reachable ID-only upgrade contradicts all-writer coverage; follow date acceptance unless canonical safety triage explicitly reorders.
**Evidence required:** native reproduction; this audit's failed fixture setup proves no behavior.
**Minimal boundary:** sweepUnclearBacklog and current caller/fixture surface.
**Adversarial tests:** onsite/hybrid, absent/stale/future date, blocked/opted-out/unregistered source, bad URL, source/state/type changes, AI failure/reject, valid remote/fresh, mixed rows.
**Native verification:** actual sweep, public/snapshot queries, exact IDs and ledger; no network.
**Acceptance:** no visibility upgrade bypasses current gates or overwrites stale decisions; actual qualified IDs only.
**Unblocks:** defensible current-writer coverage and consistency design.

### PROBLEM UNIT: uncertain effects and withdrawal contract

**Invariant/objective:** partial failure and later invalidation are observable and safely repairable across serving.
**Why next:** guarded activation leaves already-written rows and stale boards unresolved.
**Evidence required:** row/ACK/ledger/snapshot fault matrix, later drift and mass withdrawal.
**Minimal boundary:** gateway plus smallest compatible durable reconciliation/serving mechanism under ADR-010; no blanket distributed-ACID demand.
**Adversarial tests:** lost ACK, duplicate retry, ledger conflict, policy change, stale/LKG, legitimate empty withdrawal, concurrent Inngest siblings.
**Native verification:** transaction/constraint effects and actual public/Apply selectors; later authorized runtime observation.
**Acceptance:** explicit safe exposure bounds, durable uncertainty, idempotent reconciliation/withdrawal receipts.
**Unblocks:** trustworthy visibility and governed lake-commit prerequisites.

### PROBLEM UNIT: source-policy epoch and shared reservation

**Invariant/objective:** stale authority cannot publish or oversubscribe physical exposure.
**Why next:** depends on complete writer map and selected consistency contract.
**Evidence required:** native interleavings and actual cap/authority scope.
**Minimal boundary:** existing policy/gateway/reservation enforcement.
**Adversarial tests:** revoke/expire/opt-out between read and write, competing channels/ticks, ledger failure, retries and exhaustion.
**Native verification:** concurrent native constraints/transactions and source-scoped receipts.
**Acceptance:** current authority and accepted source/provider/global exposure limits enforced, not merely a post-write ledger refusal.
**Unblocks:** governed lake publication and constrained-allocation prerequisites.

### PROBLEM UNIT: runtime provenance and incident re-observation

**Invariant/objective:** actual artifact and incident state match accepted controls.
**Why gated:** normal access/image/new-execution evidence must change; unchanged probes add no knowledge.
**Evidence required:** owner trigger, immutable image→Git/config mapping, current executions and bounded Janes/control readback.
**Minimal boundary:** supported read-only inspection first; later remediation only with current authority.
**Adversarial tests:** stale tag/old image, successful zero-output tick, unreadable control, duplicate fallback clock.
**Native verification:** GCP/Cloudflare/Turso/D1 native receipts.
**Acceptance:** current containment known; exact authorized artifact mapped and observed separately from CI.
**Unblocks:** credible production acceptance/measurement, not automatic admission.

### PROBLEM UNIT: certified flow, latency and marginal utility

**Invariant/objective:** optimize canonical qualified first-publication flow with truthful denominators.
**Why gated:** present receipts/runtime coverage cannot certify QUPD.
**Evidence required:** one full lineage to observed visibility, censored outcomes, independent labels and real cost.
**Minimal boundary:** existing diagnostics/contracts; first fix false-zero display without changing selectors.
**Adversarial tests:** missing days, duplicate/replay/reactivation, absent denominators, delayed outcomes, source overlap and unseen queue.
**Native verification:** reconciled same-cohort store/ledger/exposure queries and sampling receipts.
**Acceptance:** complete-Manila-day certified flow or explicit UNKNOWN, stage losses/latency and empirical marginal costs; optimization meets matched benefit/noninferiority criteria.
**Unblocks:** dependency-ready MATH/SSAE allocation/scheduling experiments.

## GitLab continuity and runtime appendix

Authenticated GitLab reads returned two branches: substantive source initially at audited SHA, then owner documentation checkpoint 19c2031c; protected default main at independent initial commit `fbeff64a2b47f32550ba426af92a2795a1507181`. The substantive branch is unprotected. Project pipeline listing returned 0 records; merge-request search for this source project returned 0. These are visible project results, not proof about external/group CI. No repository GitLab CI configuration/equivalent release is established.

A fresh non-shallow single-branch network clone, without original local object sharing, recovered exact source, **1877 reachable commits**, clean detached checkout and successful `git fsck --full --no-reflogs`. This establishes committed selected-branch source recovery from GitLab. That initial clone does not cover later changes, other local branch-only commits, ignored files, dependencies, credentials, artifacts or databases. The later owner checkpoint and full local bundle/clean restore independently close the metadata acceptance packet at 19c2031c; the audit verified the bundle hash, ten content blobs, clean status and exact remote SHA. The local ancestry comparison found no merge base with independent README main. No merge, force push, default change or CI activation occurred.

Appropriate transition: explicitly select the substantive branch now; later review default-branch/review/CI handling without erasing independent history. GitHub backup/release remains separately pending under fallback governance. Git recovery is not D1/Turso/GCP restoration.

| Automation | Classification from evidence | Current limitation |
|---|---|---|
|GCP publisher:47/shadow:53 |CURRENT/MIGRATED intended primary; October8 metadata verified |Later recorded container/billing failures; present image parity/state UNKNOWN |
|Cloudflare shadow API/freshness Worker*/10 |Retained dependency/residual clock definition |GCP-only cutover unproved |
|GHA publisher/shadow/Hunter |Fenced FALLBACK definitions |Execution after suspension UNKNOWN |
|GHA miner/directory/enrichment/prospector/verifier/prune |Residual background runtime definitions |Not automatically legacy because GCP intended primary |
|Economics/watchdogs/medic |Diagnostic/monitoring |Report success not publication health |
|CI guardrail |CI validation plus release/deploy steps |Not production clock; no release invocation |
|Migration/deploy/secret-sync/manual admission |Administrative/release |Not routine background authority |
|Trigger/Vercel/Next backup |LEGACY absent new evidence |Preserve, do not revive |
|Lucky777/older APEX |Saved ACTIVE/PAUSED coordination |Not production; no live state claim or change here |

Anchors: architecture/CURRENT_STATE.md:30–49; VERIFIED_FLOW_DIRECTORY_2026-10-08_EVIDENCE.md:49–62; SEV2_LAKE_AUTHORITY_2026-10-08.md:64–83,162–178. Dated six container-start failures do not prove scheduler stopped, root cause or required IAM change. Janes 9046/9047 were physically active with unregistered source/empty-ID receipt; two detail404 observations did not prove public exposure. No primary pause/compensation success was established. Retain uncertainty and owner triggers.

### CURRENT HIGHEST-LEVERAGE PROBLEM

Fresh scrape publishes invalid original posting dates before qualification; parser calendar repair can also obtain a successful freshness receipt.

### WHY THIS PROBLEM

It is the saved engineering NEXT. Eight real-parser/native-route cases leave active public-selectable rows on UNKNOWN; two impossible-calendar cases receive success after September 31 becomes October 1. Existing policy forbids these outcomes.

### ACCEPTANCE CONDITION

Real raw responses through actual parsers/native route keep missing, malformed, impossible-calendar, future and older than 30-day originals out of the public predicate and successful receipt IDs; valid inclusive-window/mixed/zero/retry/drift controls retain truthful actual-ID behavior, followed by durable reviewed local acceptance. Production needs separate authorized exact-version evidence.

### THEN

Reproduce and close the unclear-backlog sweep's PH-only public-visibility transition under the canonical queue and existing source/item/receipt/recovery rules.



# Continuation packet — independent audit, 2026-10-10

Read [the complete A–J audit](INDEPENDENT_SYSTEMS_AUDIT_2026-10-10.md) first. This packet is navigation and evidence, not a new execution queue or authorization.

## Reentry

1. Read AGENTS → canonical v6.5 Master Prompt/Bootloader → current local/remote SYSTEM_SAVEPOINT and CURRENT → source constitution/ADRs/accepted parameters → current task/sole queue. Read the source-domain precedence in SOURCE_REPLENISHMENT_MASTERPLAN:80–109.
2. Inspect branch, full HEAD, dirty work and GitLab branch before any edit. Audit implementation source was `3ae421645e088f6e08ded9429a5790c8ecbcabfc`; subsequent owner documentation checkpoint `19c2031c6d41fd3ca8b7eb6b6eacf72904cc1da6` preserved that implementation on `codex/verified-flow-directory-checkpoint`. GitLab main is an independent README history. Follow the accepted GitLab fallback contract; do not reset, force-push, merge main or reprobe unchanged GitHub suspension.
3. Audit-entry foreign work: modified SYSTEM_SAVEPOINT, CURRENT, MATHEMATICAL_IMPROVEMENT_PLAN and SPARSE_SOURCE_ATTENTION_IMPLEMENTATION_PLAN; untracked fresh-metadata operations report, local-checks JSON and source-backup JSON; untracked .agents/skills and lucky777.md. These were preserved. During packaging the original owner committed the seven acceptance documents at 19c2031c. The skills/lucky777 files remain foreign and untracked. Do not stage or discard unrelated files.
4. The fresh-unit acceptance and durability closure are complete at 19c2031c. The audit verified exact GitLab readback, the actual full-history bundle hash/verification, clean restored HEAD and ten content blobs. Recover its existing receipt; do not repeat or reopen closure. This proves source/checkpoint recovery, not production/data recovery.
5. Current audit itself is mainly read-only. A later implementation must derive authority from the next user's actual task and canonical contracts, not from this packet.

## Do not repeat completed work

`3ae42164` correctly forwards original item.locationType to fresh geoGate. Scoped synthetic consumer evidence, source/test fingerprints and prior log hashes checked out. Frozen full suite 3954/0/326182/247; final focused 13/0/76. Type-only fixture correction exactly matches prior behavioral freeze when inverted. This proves neither current production nor independent remote origin. Do not rerun the whole suite solely to repeat this acceptance.

Four held paths have explicit onsite/hybrid checks and current SQL fences with RETURNING-based receipts. NULL/unsupported remains opaque. Post-write drift/uncertainty can still leave active physical rows; no global withdrawal/atomicity acceptance exists.

## Current engineering NEXT

**PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE** remains the current backed-up sole NEXT. Its evidence prerequisite is now satisfied locally, with a stronger raw-date finding:

- Real Remotive RSS and RemoteOK JSON parsers, actual route/Drizzle/native SQLite/migrations/FTS/gateway.
- Missing, invalid, 31-day-stale and 1-day-future input: eight cases returned 500/UNKNOWN while leaving one active PH-eligible row selected by canonical public query and no success ledger.
- Fresh controls: two cases returned 200 with actual ID1 and ledger.
- Impossible September 31: two cases normalized to October 1 and returned 200 with actual public ID1 and successful ledger.
- No live provider occurrence, production DB effect or browser visibility was observed. Fetch and AI were synthetic and all transport local.

**Minimal correction must preserve/validate raw date evidence and reject before public staging.** A strict helper applied only after the parser's Date normalization cannot detect a calendar already repaired. Preserve legitimate provider date formats and the unchanged inclusive 30-day rule.

Anchors: packages/scraper/rss.ts:50,156; json.ts:36,154; apps/web/src/pages/api/cron/scrape.ts:2873,2895,2920; packages/scraper/publication-gateway.ts:333,356,365; apps/web/src/lib/public-opportunities.ts:11.

See [portable reproduction instructions](evidence/2026-10-10-independent/README.md). Add exact 30-day/just-older/submillisecond future/timezone/RSS format/mixed/dedup/retry/ownership/UNKNOWN/prefix controls before accepting a repair. Observe physical rows/public predicate/snapshot query/FTS/actual receipt IDs together. Perform required implementation checks, review, remote backup and actual recovery; keep deployment/runtime acceptance separate.

## Next legitimate incident candidate after date acceptance

**Unclear-backlog PH upgrade is an ungoverned visibility writer.** scrape.ts:1281 omits source/date/type/URL;1300 selects active+unclear;1449 changes PH to eligible_likely with only ID in WHERE1456. Current calls are2469,2568,3022. The public predicate selects active+eligible PH, so this can publish without changing isActive.

Evidence is VERIFIED code, not an accepted native reproduction. The attempted tmp sweep fixture failed setup/usage and emitted no result marker; exit0 was not a pass. Start with a correct isolated native fixture, not claims based on that attempt. Test explicit nonremote, bad date, blocked/opted-out/unregistered source, URL, concurrent state/source/type, AI reject/unavailable and valid controls. Do not leapfrog the existing date unit absent a recorded canonical safety-priority decision.

## Facts that remain UNKNOWN or unaccepted

- Current production stock, qualified fresh first publications per complete Manila day, actual source/queue bottleneck, measured supply improvement.
- Exact source→running image/config mapping, current billing/image access, Janes incident containment, GCP/data restore.
- Universal item origin/remote proof, all-writer/current-policy fencing, shared physical caps, durable uncertain-effects reconciliation, withdrawal across saved boards.
- MATH accepted 0/13; SSAE contracts/pure modules do not prove production integration/benefit.

Do not call private lake staging/inspection a publisher; keep the raw-sync fence. Do not lower thresholds or change source states to obtain counts. Preserve normal-access owner triggers for CF7403, GCP billing/container failures, GitHub suspension and directory identity holds.

## Final local acceptance required for the next repair

Bad original dates yield no active public-selectable rows and no success IDs; valid inclusive-window and mixed controls preserve original meaning and exact actual IDs; prior zero/retry/source/remote/URL/UNKNOWN/prefix behavior remains intact; required checks and independent review pass; owned source/evidence/checkpoint receive exact remote backup and actual clean recovery evidence. This does not certify production until separately authorized native runtime observations establish it.



# Offline audit evidence — 2026-10-10

Audited source: `3ae421645e088f6e08ded9429a5790c8ecbcabfc`.

These fixtures are diagnostic evidence, not production code or a repair. They execute the real configured Remotive RSS/RemoteOK JSON parsers, actual createScrapeHandler, Drizzle, production migrations in a fresh in-memory SQLite database, FTS and the gateway. `fetch` is replaced before route execution with allowlisted synthetic responses; unexpected transport throws. AI is synthetic. No external source/provider/database request is intended or authorized.

The fixtures clear tables only inside `new Database(":memory:")`. Do not replace this binding with any production or persistent database. Use the repository's installed pinned Bun/dependencies and test environment preload. Review fixtures and preload before executing. No package install/deployment is part of reproduction.

## Files

- `audit-fresh-posting-date-native.ts`: original ten-case runner; dates are relative to invocation clock.
- `raw-date-results.json`: exact captured results for two sources × five date scenarios.
- `audit-fresh-posting-date-calendar-native.ts`: separate calendar-rollover runner preserving original evidence.
- `calendar-repair-results.json`: two captured impossible-calendar results.
- `audit-observation.json`: scope, source recovery and independent result checks.
- `SHA256SUMS.json`: local-byte and LF-normalized SHA256 fingerprints plus Git blob IDs. Git may normalize CRLF on another platform; compare the LF-normalized UTF-8 hash or filtered Git blob identity in that case. Fingerprints verify content, not truth or runtime acceptance.

## Reproduce from repository root

The archived fixtures retain their original trailing blank line as part of captured evidence; a whitespace check reports this known archive-only condition. The archived fixtures use imports relative to root `tmp/`. Copy them there exactly; this preserves their original bytes and expected import context. The earlier analysis-only sweep fixture is deliberately excluded because it never produced accepted native evidence.

```powershell
New-Item -ItemType Directory -Force tmp | Out-Null
Copy-Item docs/audits/evidence/2026-10-10-independent/audit-fresh-posting-date-native.ts tmp/audit-fresh-posting-date-native.ts
Copy-Item docs/audits/evidence/2026-10-10-independent/audit-fresh-posting-date-calendar-native.ts tmp/audit-fresh-posting-date-calendar-native.ts
bun run --no-env-file --preload ./scripts/ci/test-environment.ts ./tmp/audit-fresh-posting-date-native.ts '{"source":"remotive","date":"missing"}'
```

Sources: `remotive`, `remote-ok`. Dates: `missing`, `invalid`, `stale`, `future`, `fresh`. Run each source/date combination in its own process. Demand exactly one `AUDIT_RESULT` marker and inspect its JSON; process exit0 alone is not a test pass. In the captured failing behavior, the route returns500/UNKNOWN while the process succeeds in recording that outcome.

At the audit revision, the eight nonfresh cases have one active eligible row, canonical public query ID1, FTS1 and zero ledger rows. Two fresh controls have HTTP200 and one actual-ID ledger. These are observations of the defect, not desired repaired behavior. A regression test for the repair must invert the invalid-input public-exposure expectation.

```powershell
bun run --no-env-file --preload ./scripts/ci/test-environment.ts ./tmp/audit-fresh-posting-date-calendar-native.ts '{"source":"remotive","date":"calendar-repaired"}'
```

The calendar fixture uses fixed raw `2026-09-31T12:00:00.000Z`; during October10 audit it became October1 and got a success ledger. After the freshness window moves, this exact fixture may instead become stale. To reestablish the same defect later, use an explicitly controlled reference clock or an equivalent invalid recent calendar date in a separately identified fixture; preserve these archived original bytes/results. Do not silently claim identical conditions after changing time/input.

The `visible` field records `publicOpportunityFilters()` query output, not a browser or production observation. Parser fixture source IDs are configured legacy sources with in-memory registry cleared; this tests their existing exact-six fallback path. It does not certify live admission, raw-provider occurrence, provider permission or all configured source paths. Freshness drift in caches and runtime still requires separate acceptance.

## Observed verification limits

Initial tmp-only import setup failure was corrected before date evidence collection and is not counted as behavior RED. No production implementation/test/governance file changed for these reproductions. The audit separately inspected existing metadata-forwarding log fingerprints; full-suite results in the report belong to that prior implementation receipt, not to a new full run here.
