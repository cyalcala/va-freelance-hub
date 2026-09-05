# Master Execution Plan — Karpathy-First Competence Gauntlet

**Planning checkpoint:** 2026-08-22

**Repository:** `cyalcala/va-freelance-hub`

**Planning baseline:** `bd84cc1` (`main` = `origin/main` when the audit closed)

**Latest accepted behavior:** `137a3ff`, CI/deploy run `32556741237`
**DATA-05A execution start SHA:** `451b76e`; terminal decision `KEEP`
**Authority:** this section is the current strategic plan. The accepted P0–P7
recovery roadmap is retained below as historical evidence, not as the current
queue.

This is a planner-first artifact. It authorizes bounded execution units only;
it does not claim that any production fix described below has been implemented.
Model assignments are capability recommendations, not claims that a provider
or integration is available.

## 2026-08-31 Source Replenishment constitutional overlay

`docs/SOURCE_REPLENISHMENT_MASTERPLAN.md` is the durable authority for
decades-scale source governance. ADR-007 amends ADR-006 by removing mandatory
founder/reviewer approval from the **target steady state** for ordinary source
identities. It does not implement autonomous promotion or change production.

The recovery read order for source work is now: `AGENTS.md`, current savepoint,
Source Replenishment Masterplan, Source Perpetuity Strategy, SP implementation
plan, ADR-007, ADR-006, then this wider plan and historical ledgers. The SP plan
remains the only executable unit queue.

During bootstrap, exact-six production behavior and source-specific units stay
in force. Before routine admissions can become replayable decision events, the
complete named **Autonomy Cutover Predicate** in the Source Replenishment
Masterplan must pass; shorter summaries are non-exhaustive. A registry label,
one-shot probe, adapter, HTTP success, or raw posting count is not proof of
those capabilities.

The replenishment loop is permanent. SP-20 may accept an initial 30-day
capability epoch; it cannot declare source renewal, failover, replacement,
restore, model portability, or succession permanently terminal.

## 2026-09-05 SP-23 implementation note

Current release facts are in `docs/SYSTEM_SAVEPOINT.md` Run 43: the inactive
foundation is deployed and read-only verified at `436441d`, run `33968921265`.
SP-23 remains VERIFYING, with current-evidence admission (slice B), cumulative
publication/rollback (slice C), and real source observation still outstanding.
The earlier implementation checkpoint below is historical.

The current executable source queue records SP-23 as **VERIFYING** at the
control-plane level, not `KEEP` or production acceptance. Branch
`codex/sp-23-transition-plane` adds deterministic typed transitions, a
resolver-level capped-canary envelope, and migration 0039's guarded,
append-only transition-event mechanism. That work is intentionally held behind
the existing live scraper: a registry `canary` remains disabled there until a
separately scoped unified publisher can enforce its cap over final canonical
candidates across every insertion path.

At this checkpoint migration 0039 is not deployed, no source is activated or
promoted, no new dispatcher schedule is enabled, and exact-six fallback
behavior is unchanged. PR CI, deployment/read-only D1 evidence, and recurrent
real-source observations remain required before SP-23 can be reconsidered;
the full Autonomy Cutover Predicate remains unsatisfied.

## 2026-08-29 Source Perpetuity authority overlay

The 24-unit Gauntlet is terminal historical evidence. The next approved
program is Source Perpetuity. The canonical read order is:

1. `AGENTS.md`;
2. `docs/SYSTEM_SAVEPOINT.md` — sole mutable session baton;
3. `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md`;
4. `docs/SOURCE_PERPETUITY_STRATEGY.md`;
5. `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`;
6. `docs/decisions/ADR-007-autonomous-constitutional-source-governance.md`;
7. `docs/decisions/ADR-006-controlled-source-replenishment.md`;
8. this master plan for wider architecture, safety, GitHub, and recovery
   constraints;
9. `docs/gauntlet/IMPLEMENTATION_UNITS.md` for shared G1-G9 rules and terminal
   history;
10. `docs/IMPLEMENTATION_STATUS.md`, `docs/HANDOFF.md`, and
   `docs/AI_RECOVERY_TRAIL.md`; and
11. current unit evidence, generated reports, code/tests, Git history, GitHub
   runs, and fresh read-only production evidence.

The new program refines only the dated blanket source-expansion posture in
Section T, milestones M10/M11, related items in the do-not-touch/deferred lists,
and the ambiguity stop rule. It preserves all other system invariants and the
terminal evidence of the old unit ledger. Bounded non-publishing research is
now allowed for a named source candidate; ambiguity still blocks promotion and
production fetching. Current exact-six behavior remains frozen until a
source-specific SP unit passes its own evidence, tests, canary, rollback,
exact-SHA CI/deploy, and production gates.

## A. Executive assessment

VA Freelance Hub is a working Cloudflare/Astro/D1 public job index with a
configured ten-minute ingestion clock, broad automated maintenance, and a
strong accepted test/deployment baseline. Later evidence found material clock
continuity gaps; use the current savepoint rather than inferring health from
configuration. The old June emergency—missing
`/opportunities`, oversized category pages, and a frozen board—is no longer the
current system.

The highest current risk is data trust, not basic availability. Unattributable
application links from one external hostname crossed source and company
boundaries, and directory enrichment then promoted that hostname to unrelated
companies' canonical websites. A second cluster of verified structural risks can silently distort
health: the link verifier can exceed the Worker subrequest budget; trusted-host
checks admit lookalike suffixes; and fresh-D1 recovery has no full-chain proof.
Source compliance evidence, category decisions, and quality metrics still have
multiple or incomplete sources of truth.

The plan therefore follows this order:

1. preserve and classify existing work;
2. contain live data contamination and close safety defects;
3. re-measure data quality and source behavior;
4. add a native, compliance-first Source Doctor and durable health memory;
5. converge taxonomy and evaluation contracts;
6. expand sources or automation only after the safety gates pass;
7. prove another model can resume from repository evidence alone.

No Agent Reach runtime should be installed or vendored. Its useful contribution
is conceptual: ordered approved access paths, isolated side-effect-free probes,
explicit active-path reporting, and exact hostname matching.

## B. Verified system model

Legend: **V** is verified in current code, committed evidence, workflow output,
or a live public route. **I** is an operational inference that requires a unit
to reproduce or measure it.

- **V — production spine:** Bun workspaces; Astro 5; Cloudflare Pages; D1;
  TypeScript scraper packages; GitHub Actions maintenance; a Cloudflare Worker
  as the primary ten-minute clock.
- **V — ingestion:** `workers/freshness-cron` posts to
  `apps/web/src/pages/api/cron/scrape.ts`; the route loads static and directory
  ATS sources, observes cadence/validators/robots, normalizes, deduplicates,
  geo-gates, triages, and writes D1 plus source diagnostics.
- **V — AI:** Gemini, then Groq, then Cloudflare reserve when configured. Inline
  durable deferral is the production default; Inngest only owns triage when both
  its signing key and `TRIAGE_VIA_INNGEST=1` are present.
- **V — public surfaces:** `/`, `/opportunities`, `/categories/[slug]`,
  `/jobs/[id]`, `/directory`, `/data-policy`, `/privacy`, and `/sitemap.xml`.
- **V — maintenance:** verifier, prune, Sentinel, directory audit, Prospector,
  enrichment, heartbeat watchdog, Medic digest, CI/deploy, and cron-worker
  deployment workflows. Hunter and Chef are manual-only.
- **V — durable data:** `opportunities`, `va_directory`, `content_digests`,
  `source_fetch_state`, `source_fetch_events`, and `robots_cache`; migrations
  run through `0030`.
- **V — quality controls:** source-URL uniqueness, title+URL content hashes,
  pruning duplicate checks, URL sanitation, deterministic PH geo gate,
  fail-closed AI outcomes, FTS5 search, link health, and soft hiding.
- **V — current operating scope:** public-source indexing only. No accounts,
  payments, resumes, subscriptions, or auto-apply.

## C. Architecture graph

```text
Cloudflare Worker (*/10 minutes)
  -> authenticated /api/cron/scrape
       -> typed static sources + D1 ATS directory rows
       -> cadence / validators / robots observation
       -> adapters -> normalization -> URL sanitation
       -> source URL + content hash dedupe
       -> deterministic PH eligibility gate
       -> Gemini -> Groq -> Cloudflare reserve
            -> accepted rows OR durable pending/fail-closed evidence
       -> D1 opportunities + fetch state/events + diagnostics
            -> Astro SSR pages / search / directory / job detail

GitHub Actions
  -> verifier / prune / Sentinel / directory audit
  -> Prospector / enrichment / watchdog / Medic
  -> CI guardrails -> tests -> typecheck -> build
  -> D1 migrations -> FTS check -> Pages deploy
  -> generated docs and GitHub commits as recovery evidence

Manual extensions
  -> Hunter recovery pulse
  -> Chef content digest
  -> protected direct ingest (no active caller found)
  -> optional Inngest transport (disabled by default)
```

## D. Critical paths

| Path | Success contract | Present exposure |
| --- | --- | --- |
| Clock -> scrape -> D1 | a tick either writes/advances state or emits an explicit reason | run lock and provider budgets can make retries appear active without progress |
| Source -> normalized job | approved access, valid public URL, provenance, stable identity | compliance data split between registries; ATS entries remain `needs_review` |
| Job -> board/detail | active and correct PH/category semantics render consistently | homepage projection omits `phEligibility`; active-unclear behavior needs a written product contract |
| Job -> apply destination | use the attributable source listing unless a source-specific host relationship validates a direct apply URL | protocol-only validation allowed cross-source hostname poisoning; legacy rows also require click-time containment |
| Directory job -> company website | company-domain evidence must be attributable and reversible | a job URL was incorrectly promoted to a canonical company website |
| Maintenance -> link state | platform limits must not be recorded as target failure | verifier limit 120 conflicts with a documented <50 subrequest envelope |
| Migration -> recoverable D1 | empty database reaches current schema from migration zero | sync premark script may skip foundations; no complete fresh-chain rehearsal |
| Incident -> durable learning | alert, diagnosis, repair, acceptance, closure | old recovered issues and contradictory handoff sections remain open/stale |
| Commit -> deploy -> baton | SHA, run, checks, and next action are recorded | automation can advance `main` during a unit; stale worktrees retain unique commits |

## E. Evidence ledger

| ID | Evidence | Status | Planning consequence |
| --- | --- | --- | --- |
| E-01 | `bd84cc1` was clean and synchronized at audit close | V | every executor must fetch/rebase and restate start SHA because bots may advance `main` |
| E-02 | accepted run `32475868471`: 454 tests, 0 failures, 1,209 assertions, typecheck, guardrails, build, deploy/live checks | V | do not reopen accepted recovery work without new failure evidence |
| E-03 | live home 1,355 roles/428 companies; opportunities 1,283; directory 430; tech 491 | V | counts are different cache/query windows, not a coherent D1 snapshot |
| E-04 | source rollup: 41 identities; only two failures, both Jobicy 429s | V | source clock is healthy; investigate same-origin cadence rather than retrying harder |
| E-05 | directory audit: 40 checked, 17 OK, 6 bot wall, 17 unreachable, no newly hidden | V | diagnose network/egress conditions before changing strike logic |
| E-06 | weekly digest: 1,413 active, 4,489 total, 447 companies, 797 older than 30d, 509 unseen 14+d, 45 missing company, 51 duplicate groups | V, dated 2026-08-16 | refresh a read-only cohort before mutation |
| E-07 | owner confirms `remotephjobs.com` is external and `remotejobs-ph.pages.dev` is this project's production site; read-only evidence found cross-source `remotephjobs.com` apply URLs and the hostname assigned to eight unrelated directory companies | V owner statement / V read-only inventory | DATA-05A must contain ingestion, click-time use, and directory inference; the hostname must not be treated as owned or globally banned |
| E-08 | verifier limit is 120; directory audit deliberately caps at 40 for a 50-subrequest environment | V structure / I runtime effect | reproduce and make budget exhaustion distinct from dead links |
| E-09 | prospector and ATS hostname checks use permissive bare suffix matching | V | exact-or-dot-subdomain regression unit before expanding discovery |
| E-10 | migration sync premarks foundations; no empty-chain test | V structure / I failure effect | rehearse locally/ephemerally before changing release behavior |
| E-11 | `ROBOTS_MODE` is observe; per-source robots decisions are not durable in fetch-event schema | V | capture and review evidence before enforcement |
| E-12 | live opportunities show repeated same title/company; tech page shows category leakage | V observation | build labelled quality/eval evidence, not an ad hoc keyword patch |
| E-13 | six registered and four orphan worktree directories remain; several branches have unique commits | V | inventory/classify before any cleanup |
| E-14 | latest scheduled enrichment, watchdog, Sentinel, and directory runs were green | V at audit close | green workflow is necessary but source-level evidence remains acceptance-critical |
| E-15 | GitHub holds six open issues and twenty-one old PRs; most are recovered source alerts or legacy architecture work | V at audit close | OPS-05 must classify/close/roll up with evidence; this planning unit does not mutate them |

## F. Current baselines

| Domain | Baseline | Confidence |
| --- | --- | --- |
| Git | `main`/`origin/main` at `bd84cc1` at audit close | high, time-sensitive |
| Accepted behavior | `07f582b`; CI/deploy `32475868471` | high |
| Test suite | 454 tests, 1,209 assertions, zero failures | high, accepted CI evidence |
| Ingestion | ten-minute Worker clock; latest accepted pending queue empty | high |
| Sources | 41 identities; 2 failing with Jobicy HTTP 429 | high, generated rollup |
| Directory checks | 17 OK, 6 bot wall, 17 unreachable of 40; no new de-verifications | high, generated rollup |
| Public counts | 1,355 home, 1,283 opportunities, 430 directory, 491 tech | medium; independently cached views |
| Broader D1 quality | 1,413 active, 4,489 total, 447 companies, 51 duplicate groups | high but dated 2026-08-16 |
| Compliance | six enabled static allowed sources; fourteen enabled ATS tokens marked `needs_review`; robots observe mode | high |
| Recovery | old worktrees not classified; historical docs contain stale “current” sections | high |

## G. Invariants

1. The active production path remains Cloudflare/Astro/D1/TypeScript.
2. Only public, permitted access paths are eligible; a successful network probe
   never changes compliance status.
3. No login, cookie export, CAPTCHA bypass, residential proxy, paywall bypass,
   or anti-automation evasion.
4. Store minimal factual metadata and send users to the attributable source or
   a direct apply URL validated against that source. An indexed hostname does
   not imply project ownership.
5. Fail closed on unclear eligibility, source policy, credentials, or schema.
6. Never mark a target dead because the platform exhausted its own budget.
7. Data repair is evidence-based, soft/reversible, counted, and dry-run first.
8. Production remains deployable after every accepted unit.
9. One finding, one bounded unit, one commit boundary, one critic, one recorded
   acceptance packet.
10. GitHub evidence is the continuity system; local worktrees are not truth.
11. Generated `*-latest.md` files are operational snapshots, not hand-edited
   strategic documents.
12. Automation may diagnose before it recovers; recovery gains authority only
   through observed, bounded, reversible stages.

## H. Contradiction report

| ID | Contradiction | Resolution |
| --- | --- | --- |
| C-01 | `AGENTS.md` says GitHub Actions own ingestion and `/opportunities` is absent | current code/live routes win; update guidance in a bounded documentation unit |
| C-02 | old master/recovery sections call the 2026-08-10 paused branch current | accepted August behavior and current `main` win; old text is historical |
| C-03 | documents variously call Inngest active while current default is inline durable deferral | runtime flags and August incident evidence win |
| C-04 | old roadmap describes 15-minute/Hunter clock | Worker `*/10` configuration wins |
| C-05 | `source_fetch_events` lacks the robots fields claimed by older completion prose | schema wins; COMP-01 remains incomplete |
| C-06 | generated enrichment reports “website set” as success despite cross-company contamination | semantic correctness outranks mutation count |
| C-07 | homepage/category/detail paths apply different category/eligibility logic | establish one explicit product and decision contract in DATA-06/REL-10 |
| C-08 | migration schema default and TypeScript directory niche default differ | DB-01 must reconcile or explicitly preserve with an assertion |

## I. P0–P3 problem register

| Priority | ID | Finding | State |
| --- | --- | --- | --- |
| P0 | DATA-05 | cross-source application-link poisoning amplified into cross-company directory-domain contamination | verified live; immediate containment plus exact incident repair, followed by general provenance hardening |
| P0 owner | SEC-LEGACY-01 | legacy provider credentials were previously exposed and rotation remains unconfirmed | owner-gated; never print values |
| P1 | REL-09 | verifier request budget can exceed the hosting envelope | structure verified; reproduce effect |
| P1 | SEC-03 | permissive hostname suffix matching admits lookalikes | accepted and deployed at `6c48810` |
| P1 | DB-01 | fresh-D1 migration/recovery chain is unproven | verified gap; effect inferred |
| P1 | OPS-04 | directory unreachable ratio rose to 43% | verified current signal |
| P1 | SRC-4D | two Jobicy feeds receive 429 on one origin | verified current signal |
| P1 | DATA-03 | quality cohort is dated and mutation decisions lack a fresh baseline | verified evidence gap |
| P1 | COMP-01 | 543/543 mature review; WWR canary and live empty-set rollback proven; exact six-source rollout produced 18/18 clean enforced fetches over 60 minutes | TERMINAL — KEEP |
| P2 | REL-08 | source health lacks a single compliance-first semantic Doctor contract | verified fragmentation |
| P2 | DATA-06 | taxonomy and triage paths can disagree | verified architecture and live symptoms |
| P2 | REL-10 | homepage projection omits eligibility used by card routing | verified in code |
| P2 | OPS-06 | manual Hunter retry cadence conflicts with the eight-minute run lock | verified structure; reproduce effect |
| P2 | PERF-03 | source-event volume and unbounded Sentinel ranking may become hot | inferred scale risk; measure first |
| P2 | OPS-05 | recovered alerts and generated reports lack a complete lifecycle | verified repository/GitHub hygiene gap |
| P3 | AI-03 | HTTP providers cannot run without an `env.AI` binding due to early return | verified portability defect; production unaffected |
| P3 | ARCH-04 | direct ingest, Chef/content digests, and optional Inngest need retain/retire decisions | verified dormant/optional surfaces |
| P3 | LAB-01 | ranking, source economics, and labor intelligence lack stable evaluation foundations | deferred research |

## J. Bottleneck map

- **Request budget:** outbound checks share platform limits; verifier and source
  probes need explicit per-run budgets.
- **D1 writes:** inserts are already chunked to three rows because of parameter
  limits; bulk repair must preserve this constraint.
- **AI calls:** 15-call request budget and provider availability bound triage;
  pending/fail-closed behavior is a safety feature.
- **Run lock:** eight-minute lease serializes ingestion and defeats rapid manual
  retries.
- **Source origin:** two Jobicy feeds compete on one rate-limited origin.
- **Event history:** cadence skips can generate roughly 5,900 rows/day at the
  current source/tick envelope; query/index cost must be measured.
- **Governance:** ordinary bounded source admission may become constitutional
  and autonomous under ADR-007. External permission, contracts, payments,
  credentials, genuine legal ambiguity, contested appeals, and constitutional
  changes cannot be fabricated or automated away.
- **Continuity:** auto-commits advance `main`; stale worktrees and duplicated
  “current” docs increase resume cost.

## K. Silent failure map

Use one failure taxonomy across Doctor, incidents, health, recovery,
diagnostics, and alerts:

```text
NETWORK_FAILURE | RATE_LIMIT | SOURCE_UNAVAILABLE | SOURCE_EMPTY
SOURCE_ANOMALOUS | SCHEMA_INVALID | NORMALIZATION_FAILURE | DEDUP_FAILURE
GEO_FAILURE | TAXONOMY_FAILURE | AI_PROVIDER_FAILURE | AI_OUTPUT_INVALID
DATABASE_FAILURE | ORCHESTRATION_FAILURE | PUBLICATION_FAILURE
STALE_PIPELINE | UNKNOWN_FAILURE
```

The Gauntlet must exercise hard failure, soft failure, silent failure, silent
success, unexpected empty output, schema drift, retry duplication, stuck
queues, stale state, provider fallback failure, scheduler success with a failed
downstream stage, and accepted jobs that never publish. HTTP 200 alone is not
acceptance.

| Failure | How it can look green | Required detector |
| --- | --- | --- |
| poisoned apply/company hostname | URL is syntactically valid and enrichment reports rows changed | source-attributable apply-host validation, click-time fallback, no job-to-company promotion, repeated-domain anomaly |
| verifier budget exhaustion | workflow threshold tolerates partial failures | explicit budget-exhausted outcome and bounded attempted count |
| lookalike trusted host | suffix check returns true | adversarial hostname table tests |
| source returns HTTP 200 but wrong schema/no jobs | availability probe passes | semantic schema and plausible-item probe |
| source compliance unclear | endpoint technically succeeds | separate immutable compliance verdict |
| AI unavailable | request completes with deferral | provider/outcome/pending-queue metrics |
| lock-held retry loop | HTTP requests succeed | progress delta and lock-state evidence |
| cached page count drift | every page renders | same-run D1 snapshot and query-contract comparison |
| migration bootstrap gap | existing production migration succeeds | empty database full-chain rehearsal |
| category leakage | job is active and page is green | labelled taxonomy evaluation and per-class confusion report |

## L. Historical source health map (refined by Source Perpetuity)

At the 2026-08-22 planning baseline, the portfolio had 41 reported identities:
six enabled static sources,
fourteen enabled ATS tokens still marked `needs_review`, and twenty-one
paused/skipped identities. Current failures are limited to two Jobicy feeds
returning 429. “Items seen” in the rollup is an event sum, not a unique-job
count.

Source Doctor V1 must report two independent axes:

```text
compliance: allowed | needs_review | paused | deprecated
outcome:    HEALTHY_WITH_RESULTS | HEALTHY_EMPTY | DEGRADED_ANOMALOUS
            SCHEMA_BROKEN | RATE_LIMITED | UNREACHABLE | POLICY_BLOCKED
            INTERNAL_PIPELINE_FAILURE | UNKNOWN
activePath: approved access path actually probed
evidence:   HTTP/probe code, latency, schema verdict, plausible item count,
            failure taxonomy, checked_at
```

A technical `ok` cannot promote compliance. Discovery can only create
`needs_review` candidates. The old blanket freeze and named Gauntlet gates are
terminal history; the Source Perpetuity overlay now permits bounded research
and separately gated SP promotions while preserving fail-closed production
behavior.

## M. Automation opportunity register

| Opportunity | Stage now | Next safe ratchet |
| --- | --- | --- |
| bad directory domains | recurring mutation, weak semantic guard | observe repeated-domain anomaly -> block unverified writes -> evidence-only repair |
| source health / robots evidence | fetch events + generated health rollup + accepted native Doctor; robots observation remains manually queried | generate a bounded robots observation rollup; keep per-source enforcement and ambiguous HTTP outcomes approval-gated |
| rate limiting | HTTP status history | same-origin cadence recommendation, then guarded scheduler adjustment |
| stale alerts | issues/reports accumulate | deterministic recovered-state close/rollup with audit trail |
| data quality | weekly aggregate | reproducible read-only cohort and diffable benchmark |
| category quality | production heuristics | labelled corpus, offline scoring, thresholded release gate |
| migration safety | production legacy chain | ephemeral empty-D1 rehearsal in CI |
| continuity | append-only recovery docs | compact baton schema plus minimal-context resume drill |
| recovery | mostly human/manual | observation -> diagnosis -> dry-run -> bounded repair -> rollback -> wider authority |

## N. Addy skill routing map

“Addy” here means the selected repository skill workflow, not an external
service. Availability must be checked in each executor environment. Exactly one
primary router owns a unit.

| Work type | Primary installed workflow | Supporting mechanism, if needed |
| --- | --- | --- |
| plan and decompose | `planning-and-task-breakdown` | none; used for this plan |
| reproduce failure | `debugging-and-error-recovery` | isolated worktree only if overlap risk exists |
| data cohort/eval | `data-analytics` | `source-driven-development` for evidence attribution |
| security/compliance | `security-and-hardening` | code review after tests |
| workflow/operations | `ci-cd-and-automation` | Git workflow for checkpointing |
| bounded implementation | `incremental-implementation` | verification/review at the end |
| finish/checkpoint | `git-workflow-and-versioning` | `finishing-a-development-branch` only on a branch |

Do not stack a second general planner, executor, or TDD router on top of the
primary workflow.

## O. Superpowers compatibility matrix

| Capability | Overlap with primary workflow | Distinct value | Conflict/cost | Use / do not use | Verdict |
| --- | --- | --- | --- | --- | --- |
| systematic debugging | diagnosis workflow | hypothesis ledger and reproduction discipline | low | use for inferred runtime effects; skip for known text-only edits | ADOPT |
| verification before completion | every unit contract | prevents “tests planned” becoming “tests passed” | low | use on every behavior unit | ADOPT |
| fresh critic/code review | quality workflow | independent disconfirmation | moderate tokens | use for P0/P1 and schema/security changes | ADOPT |
| isolated worktrees | git workflow | conflict isolation and easy abandon | stale-worktree overhead | use only after REC-01 and for overlapping risky units | ADAPT |
| parallel subagents | planner/executor can delegate | independent evidence gathering | context/merge cost | use only for separable files/questions | ADAPT |
| brainstorming | overlaps planning | divergent options | duplicates settled strategy | use only when a unit hits a genuine decision fork | DEFER |
| separate general planning/TDD/execution router | duplicates primary workflow | no unique value here | conflicting states and extra tokens | never within a routed unit | REJECT |

## P. Competence-stack non-duplication rules

1. One primary workflow owns the state machine.
2. Supporting mechanisms may add evidence, isolation, critique, or verification;
   they may not create a parallel plan.
3. One builder cannot self-certify P0/P1 acceptance; use fresh critique.
4. A model name is not a capability guarantee. Probe tools and dependencies.
5. If a task exceeds its contract, stop and write the newly discovered finding
   rather than silently expanding scope.
6. Parallel work requires disjoint file ownership and an explicit merge point.

## Q. Agent Reach matrix

The bounded study audited Agent Reach at commit
[`93ae1d18`](https://github.com/Panniantong/Agent-Reach/commit/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d).
It is a Python capability selector/installer/doctor, not a job-ingestion system.
The full study is in `docs/research/agent-reach-study-2026-08-22.md`.

| Decision | Concept | Reuse boundary | VA Hub action |
| --- | --- | --- | --- |
| ADOPT | ordered candidate backends and explicit active backend | architectural inspiration | represent only preapproved API/RSS/public JSON paths |
| ADOPT | isolated side-effect-free probes and machine JSON | independent TypeScript implementation | REL-08 Source Doctor |
| ADAPT | exact host or dot-subdomain matching | reimplement small predicate, no vendoring | SEC-03 across trust/ATS checks |
| ADAPT | channel registry | compliance-first source/access registry | compliance is evaluated before network health |
| DEFER | Exa/MCP discovery/status | no code reuse | reconsider only after measured recall/operational gap |
| REJECT | Agent Reach runtime/connectors | no install/vendor | wrong runtime and large supply-chain surface |
| REJECT | cookies, browser sessions, login-gated scraping, CAPTCHA/proxy tactics | prohibited | conflicts with public-source policy |
| REJECT | Jina as universal ingestion fallback | prohibited | readability does not establish permission/provenance |

## R. Python plan

TypeScript remains the production spine. Python may be introduced only as an
offline, reproducible analytics tool after a stable, redacted export contract
exists.

1. Define a versioned NDJSON/CSV fixture with no secrets and minimal metadata.
2. Pin Python >=3.10 tooling in an isolated directory only if the analysis is
   materially clearer than Bun/TypeScript.
3. Use it for taxonomy evaluation, duplicate clustering, anomaly analysis, or
   source economics—not scheduling, collection, D1 writes, or Pages runtime.
4. Store input hash, script version, parameters, and output artifact.
5. Require TypeScript/runtime policy to remain authoritative.

Do not revive `apps/web/resolve_next_30.py`; it remains quarantined history.

## S. Job taxonomy plan

1. Write the product contract for PH eligibility, VA relevance, and the seven
   public category labels.
2. Build a small labelled corpus containing accepted, rejected, unclear,
   cross-category, duplicate-looking, and adversarial examples from redacted
   production cohorts.
3. Route inline, pending, direct-ingest, homepage, totals, and category pages
   through one decision/category contract or document deliberate exceptions.
4. Score precision/recall plus a confusion matrix; emphasize harmful false
   positives such as healthcare/teaching/sales leakage into tech.
5. Compare deterministic and provider outputs offline. Provider changes do not
   ship without threshold evidence.
6. Backfill only through a dry-run, counted, reversible unit.

## T. Source expansion plan

**Historical precursor, refined by the 2026-08-29 Source Perpetuity overlay.**
The sequence below remains conceptually valid, but the active unit graph,
deadlines, state vocabulary, provider order, and acceptance gates now live in
the source-perpetuity strategy and implementation plan.

```text
Prospector candidate
  -> exact hostname/provenance validation
  -> needs_review compliance record
  -> terms/robots/manual evidence
  -> bounded Doctor technical + semantic probe
  -> small shadow run with zero publishing
  -> quality/source-economics review
  -> explicit allow decision
  -> bounded publish canary
  -> routine cadence only after acceptance
```

Prefer official APIs, official RSS, and source-supported public JSON. Never use
Agent Reach connectors or search results as collection authorization.

Source promotion also requires an economics record: requests per run, unique
eligible opportunities, duplicate/rejection ratio, failure and review burden,
freshness contribution, compliance certainty, and maintenance cost. A source
with high raw volume but low unique trusted yield is not an expansion win.

## U. GitHub durability plan

- Start each unit by recording fetched `origin/main`, local SHA, branch/worktree,
  and dirty-state evidence.
- Use `codex/<unit-id>-<slug>` by default for behavior work; rebase before merge.
- One bounded behavior or documentation slice per commit.
- Push partial work only as an explicit `PARTIAL` checkpoint with failing/absent
  evidence and the next exact action; never label it accepted.
- Record commit SHA, workflow run ID, tests, live checks, data deltas, rollback,
  and next unit in `SYSTEM_SAVEPOINT.md`/`IMPLEMENTATION_STATUS.md`.
- Automation commits may race the executor; fetch/rebase and rerun affected
  verification instead of force-pushing.
- REC-01 must classify every old unique worktree commit before a separately
  approved cleanup. No blind deletion.

## V. Manual-to-automated roadmap

| Stage | Authority | Evidence gate |
| --- | --- | --- |
| Observe | collect immutable health/anomaly evidence | bounded, no mutations |
| Diagnose | assign failure taxonomy and likely cause | reproducible query/probe |
| Recommend | emit exact bounded action | false-positive and blast-radius review |
| Dry-run | calculate rows/sources/actions | counts and sample review |
| Guarded recover | mutate a tiny reversible cohort | limits, idempotency, rollback, alert |
| Routine recover | expand only a proven action | repeated clean runs and incident history |
| Adaptive | tune cadence/path within approved bounds | explicit min/max and kill switch |

No unit may jump from raw observation to autonomous broad mutation.

## W. Model routing matrix

These are recommendations only; capability and tool availability must be
confirmed before dispatch.

| Unit class | Primary executor | Primary workflow | Optional mechanism | Critic | Escalation | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| migrations/data repair/security | Claude-capable model | incremental implementation or security | isolated worktree | fresh Claude/Sol-class critic | Sol-class planner | cross-module caution and rollback reasoning |
| bounded TypeScript/tests/docs | Nemotron-capable model | incremental implementation | verification-before-completion | DeepSeek/Claude critic | Sol-class planner | economical, narrow execution |
| cohorts/evals/query analysis | DeepSeek-capable model | data analytics | offline Python only after contract | Claude critic | Sol-class planner | analytic comparison and adversarial cases |
| architecture/contradictions/replanning | Sol-class model | planning-and-task-breakdown | targeted subagents | independent critic | owner | whole-system reasoning |
| owner/provider action | owner | documented checklist | no agent secrets access | agent verifies only nonsecret evidence | owner | authority cannot be inferred |

## X. Dependency-ordered milestones

The numeric labels below preserve the mandate. They are not permission to run
strictly in numeric order. The immediate dependency path is
`M0/M1/M2/M9 -> M4 containment -> M3/M6 evidence -> M5/M8 decisions ->
M10/M11 expansion`, with M23 proving continuity after at least one safe unit.

| Milestone | Current state | Units / exit gate |
| --- | --- | --- |
| M0 Repository Truth | IN PROGRESS | plan and baton written; REC-01 must classify old work without cleanup |
| M1 Contradiction Report | PLANNED COMPLETE | Section H is current; new contradictions use the escalation contract |
| M2 Competence Stack Audit | PLANNED COMPLETE | Sections N–P define one router and nonduplication rules |
| M3 Baseline + Eval Corpus | QUEUED | DATA-03 produces a fresh cohort; labelled corpus begins only from bounded evidence |
| M4 Verified P0/P1 Failures | FIRST DELIVERY WAVE | DATA-05A, REL-09, SEC-03, DB-01, REL-10, OPS-06; SEC-LEGACY-01 is owner-parallel |
| M5 Source Doctor V1 | PLANNED | REL-08 emits the exact nine outcomes with zero mutation authority |
| M6 Health Memory | PLANNED | COMP-01A, bounded event history/query work, and durable diagnostic fields |
| M7 Thin Capability Extraction | CONDITIONAL | extract only small tested helpers needed by Doctor/decisions; no scrape-route rewrite |
| M8 Job Taxonomy + Evals | PLANNED | DATA-06 unifies decision/category behavior and adds a labelled gate |
| M9 Agent Reach Study | PLANNED COMPLETE | pinned study and matrix committed; inspiration only, no runtime adoption |
| M10 Prospector -> Probe | SUPERSEDED AS ACTIVE QUEUE | SP-05 through SP-08 add the durable candidate, evidence, and shadow lifecycle; this row remains historical context |
| M11 Controlled Source Expansion | ACTIVE IN SP PROGRAM | SP-09 through SP-17 permit one provider/mechanism canary at a time after the shared foundations; exact-six production behavior remains unchanged until each canary is accepted |
| M12 Python Foundation | DEFERRED | offline versioned export/analysis only; no production dependency or writes |
| M13 Source Anomaly Detection | PLANNED | DATA-05B repeated-domain guard plus evidence-derived anomaly thresholds |
| M14 Agent Diagnostic Surface | DEFERRED | consider a thin report only after Doctor output proves a consumer need |
| M15 Automation Sweep | PLANNED | OPS-05 and guarded manual-to-automated decisions; no new scheduler by default |
| M16 Multi-Model Execution Hardening | PLANNED | unit contract lint, fresh critic policy, and evidence packet discipline |
| M17 Opportunity Ranking | DEFERRED | classification/evals and stable quality baseline must pass first |
| M18 Source Economics | DEFERRED | measure unique trusted yield, request/review burden, freshness, and failures |
| M19 Controlled Failover | DEFERRED | current provider/pending path remains; changes need incident evidence |
| M20 Labor-Market Intelligence | DEFERRED | only after trustworthy taxonomy, provenance, and export contracts |
| M21 Adaptive Scheduling Research | DEFERRED | SRC-4D is the only bounded cadence experiment presently authorized |
| M22 Maintainability + Scale Hardening | CONTINUOUS GATE | close proven route size, event-query, request-budget, and migration risks incrementally |
| M23 Interruption-Recovery Drill | PLANNED | REC-02: a fresh executor resumes from repository evidence with no hidden context |

## Y. Portable Gauntlet units

The executable contracts are maintained in
`docs/gauntlet/IMPLEMENTATION_UNITS.md`. Every unit contains objective, evidence,
scope, forbidden scope, dependencies, exact likely files, steps, tests,
acceptance packet, rollback, stop conditions, model routing, handoff fields, and
commit boundary. A unit begins `PLANNED`; implementation activity alone cannot
earn a terminal `KEEP` verdict.

Every completed or interrupted unit ends in exactly one terminal state:

- `KEEP`: all acceptance evidence supports retaining the change;
- `REVISE`: bounded revision is required before a new verdict;
- `REVERT`: the revert condition fired and rollback is verified;
- `BLOCKED`: external authority or evidence is required;
- `ESCALATE`: a contradiction or architecture decision requires replanning;
- `PAUSED`: interruption-safe checkpoint with an exact continuation path.

`PLANNED` and `IN_PROGRESS` are nonterminal execution states. There is no
ambiguous “mostly done.”

## Z. Do-not-touch list

- Do not replace the Cloudflare/Astro/D1/TypeScript production spine.
- Do not add auth, payments, subscriptions, resumes, profiles, or auto-apply.
- Do not install/vendor Agent Reach or use cookies, sessions, CAPTCHAs, proxies,
  login-gated collection, or a universal readability fallback.
- Do not hard-delete opportunity/directory data during quality work.
- Do not make Inngest the default without a new incident-backed decision.
- Do not flip robots enforcement before durable evidence and the reviewed
  observe window pass.
- Do not add a production source outside its dependency-ready SP unit. Preserve
  exact-six behavior until the source-specific canary/rollback contract passes.
- Do not perform a giant `scrape.ts` rewrite as part of a narrow fix.
- Do not delete old worktrees before REC-01 classification and separate approval.
- Do not expose or test legacy secret values.
- Do not hand-edit generated `*-latest.md` evidence.

## AA. Deferred opportunities

- opportunity ranking/personalization without accounts;
- labor-market intelligence and public trend reports;
- adaptive source cadence outside the SP-18 reviewed envelopes;
- Python-based offline clustering/economics;
- Exa-assisted discovery or an MCP status surface;
- source portfolio expansion outside the dependency-ordered SP program;
- retention/retirement of Chef/content digests, direct ingest, and Inngest;
- HTTP-provider-only AI portability;
- large dashboard or operator UI.

Each needs fresh evidence and its own decision; none belongs in M1 containment.

## AB. Stop conditions

Stop a unit and checkpoint `PARTIAL` or `BLOCKED` when:

- the starting SHA/working tree differs materially from the contract;
- a required secret, provider action, compliance decision, or production access
  is unavailable;
- dry-run counts exceed the declared blast radius;
- a migration cannot be proven on an empty ephemeral database;
- a test fails outside the unit and causality is unclear;
- material source authority/robots evidence is unresolved for promotion or
  production collection; bounded non-publishing evidence research may continue
  only inside an approved SP unit;
- an automated action would hard-delete data or affect an unbounded cohort;
- live metrics worsen beyond the unit’s revert threshold;
- another process changed an overlapping file or production state;
- the task requires an anti-goal or forbidden access tactic.

## AC. EXECUTION_STATE

```text
CURRENT VERIFIED SYSTEM STATE: all 24 Gauntlet units are terminal history; exact-six remains production; the durable target is the Source Replenishment Masterplan while the SP plan remains the executable bootstrap queue
CURRENT BASELINES: re-measure from production; dated adoption evidence and current caveats are at the top of the savepoint
LAST ACCEPTED GAUNTLET UNIT: COMP-01B reviewed enforcement rollout — TERMINAL KEEP
CURRENT UNIT: Run 35 documentation-only Source Replenishment constitution
CURRENT UNIT STATUS: IN PROGRESS until GitHub exact-SHA CI and docs-only integration evidence are recorded
CURRENT EXECUTOR: repository planner
CURRENT WORKTREE / BRANCH: see the top of docs/SYSTEM_SAVEPOINT.md; it is the sole mutable baton
NEXT UNIT: one bounded SP implementation-plan reconciliation after Run 35 is accepted
BLOCKERS: autonomous cutover capabilities are not implemented; historical registry SQL is not ready or the next action
CONTRADICTIONS: historical owner-review and probe-as-shadow prose is superseded only as stated in the 2026-08-31 overlay and newer batons
SOURCE HEALTH: use current docs/*-latest.md and fresh read-only queries; old counts are historical
NEXT EXACT ACTION: complete, push, CI-verify, and checkpoint Run 35; then reconcile the SP plan without mutating production
```

The top of `docs/SYSTEM_SAVEPOINT.md` is the authoritative mutable baton after
this planning commit; this embedded state is the planning snapshot.

## AD. Maintainability risk map

| Risk | Evidence | Treatment |
| --- | --- | --- |
| 2,400+ line scrape route | policy, orchestration, and decisions are co-located | extract only behind passing characterization tests; no big rewrite |
| duplicated triage/category logic | inline, pending, and display paths differ | DATA-06 single contract and eval fixture |
| private ATS policy registry | compliance is fragmented | REL-08/COMP-01 typed registry incrementally |
| untyped homepage projection | `any[]` hides missing field | REL-10 explicit projection type/test |
| stale canonical prose | contradictory “current” sections | top-authority baton; archive/history labels |
| generated evidence semantics | mutation counts can imply correctness | semantic result codes/anomaly guard |
| orphan/old worktrees | unique commits and resume ambiguity | REC-01 classification before cleanup |

## AE. Scalability risk map

| Risk | Present envelope | Gate |
| --- | --- | --- |
| Worker external subrequests | free-tier ceiling documented as 50 | REL-09 and every Doctor unit declare budget |
| D1 variable count | opportunity inserts chunked to 3 | repair/migration tests preserve chunking |
| event volume | ~5,900 rows/day possible; ~530k/90d | PERF-03 measurement, bounded queries, aligned index if proven |
| AI triage | 15 calls/request plus provider cascade | pending-queue and fail-closed metrics |
| ATS directory scan | up to 200 companies | active-path/cadence economics before increase |
| public payload/search | pagination and FTS accepted | add route/payload smoke budgets before ranking expansion |
| issue/report accumulation | stale source issues and append-only docs | OPS-05 lifecycle/rollup |

## AF. Hardening register

| ID | Hardening control | Required evidence |
| --- | --- | --- |
| H-01 | exact hostname trust boundary | positive, subdomain, sibling, prefix/suffix lookalike tests |
| H-02 | verifier/Doctor request budget | maximum attempts below platform limit; distinct exhaustion code |
| H-03 | domain provenance and anomaly guard | no cross-company inferred reuse without reviewed evidence |
| H-04 | reversible data repair | dry-run manifest, before/after values, transaction/chunking, rollback |
| H-05 | fresh migration rehearsal | empty DB through 0030 plus schema/default/FTS assertions |
| H-06 | compliance evidence | static and ATS decisions durable; no technical auto-promotion |
| H-07 | eval release gate | labelled fixture, thresholds, regression artifact |
| H-08 | automation kill switch | limits, idempotency, rollback, and explicit disable path |
| H-09 | recovery continuity | minimal-context executor reproduces state and next action |
| H-10 | secret boundary | provider-side rotation confirmation only; no values in logs/docs |

## AG. Interruption/resume protocol

Before interruption or credit exhaustion:

1. stop at a coherent file/commit boundary;
2. run the narrowest available verification and record failures honestly;
3. commit/push recoverable work with `PARTIAL` if acceptance is incomplete;
4. update the top baton with start/current SHA, branch/worktree, dirty files,
   completed steps, failing command, blocker, next exact command/action, rollback,
   and recommended executor capability;
5. link any workflow run and generated evidence without claiming success early.

The resuming executor must read, in order: `AGENTS.md`, the top of
`SYSTEM_SAVEPOINT.md`, `docs/SOURCE_PERPETUITY_STRATEGY.md`, the SP
implementation plan, ADR-006, this master plan, then the shared G1-G9 contract
and evidence named by the active unit. It must verify the current SHA and state
before continuing. SP-20 will repeat the minimal-context resume drill.

## AH. Automation maturity map

Use this fixed scale:

```text
A0 — MANUAL
A1 — AUTOMATED DETECTION
A2 — AUTOMATED EVIDENCE COLLECTION
A3 — AUTOMATED DIAGNOSIS / FAULT NARROWING
A4 — GUARDED AUTOMATED RECOVERY
A5 — AUTOMATED VERIFICATION
A6 — SELF-DOCUMENTING / SELF-REPORTING
```

| Domain | Current level | Target after current roadmap |
| --- | --- | --- |
| ingestion clock | A6 for scheduling/reporting; recovery is bounded | retain; improve A3 diagnosis only |
| AI failure | A4/A5 fail-closed pending recovery | retain with clearer A2 provider/outcome evidence |
| source health | A2 rollup | A3 semantic diagnosis and bounded recommendation |
| directory enrichment | A4-like mutation with weak guard | genuine A4 plus A5 provenance/revert verification |
| link verification | A2/A5 with budget ambiguity | budget-safe A3 diagnosis and A6 reporting |
| compliance | A1/A2 fragmented observe evidence | reviewed A2 -> A5 enforcement verification |
| data quality | A2 periodic aggregate | reproducible A2 -> dry-run -> bounded A4/A5 repair |
| alerts/issues | A1 creation, weak recovered lifecycle | A3/A6 deterministic rollup/closure evidence |
| continuity | A2 commits plus long append-only docs | A6 compact baton plus proven cross-model resume |

Program autonomy is not agent count. It is the fraction of recurrent failures
that the system can observe, classify, explain, and recover from within explicit
bounds while leaving auditable evidence.

Competence is measured by outcomes: regression/escape and revert rates, steps
and files needed to reach root cause, time to restore trustworthy state,
repeated manual steps removed, false-positive recovery rate, percentage of
units resumed from repository context alone, and evidence completeness per
`KEEP` verdict. Token counts may be recorded when available but never substitute
for correctness or safety.

## AI. Historical first execution queue (terminal; superseded as resume path)

| Order | Unit | Executor recommendation | Dependency | Immediate result |
| ---: | --- | --- | --- | --- |
| 1 | REC-01 continuity/worktree inventory | Nemotron-capable | planning commit | classify all registered/orphan work without deleting anything |
| 2 | DATA-05A enrichment containment | Claude-capable | planning commit; current data sample | stop new unverified company-website writes, retain safe hiring-page behavior |
| 3 | REL-09 verifier budget safety | Nemotron or Claude-capable | none; can parallel DATA-05A in disjoint files | reproduce/cap budget and distinguish platform exhaustion |
| 4 | SEC-03 hostname trust hardening | Claude-capable | none; can parallel in disjoint scraper files | exact-or-dot-subdomain helper plus adversarial tests |
| 5 | DB-01 fresh-D1 rehearsal | Claude-capable | coordinate migration number with DATA-05 units | prove empty migration chain/defaults before release changes |
| 6 | DATA-05B repair/anomaly guard | Claude-capable + fresh critic | DATA-05A and verified manifest | reversible repair of evidence-confirmed rows only |
| 7 | DATA-03 read-only quality cohort | DeepSeek-capable | stable containment | current duplicate/stale/missing/unclear evidence |
| 8 | OPS-04 and SRC-4D diagnosis | Nemotron/DeepSeek-capable | read-only; may parallel | explain directory egress spike and Jobicy same-origin 429 behavior |
| 9 | REL-08 Source Doctor V1 | Claude-capable | SEC-03, DATA-03, source findings | compliance-first bounded machine-readable probes |
| 10 | COMP-01A observe evidence | Claude-capable | REL-08 | durable static+ATS robots decisions; no enforcement yet |
| 11 | DATA-06 taxonomy/eval convergence | DeepSeek builder, Claude critic | DATA-03 | one decision contract and labelled gate |
| 12 | REC-02 interruption drill | fresh Nemotron/DeepSeek-capable executor | at least one accepted behavior unit | prove portable resume and checkpoint discipline |

This queue was the 2026-08-22 execution path and is now terminal history. New
sessions resume from the Source Perpetuity authority overlay and SP unit board,
not from these rows.

> **Ordering correction (2026-08-22, post-OPS-04).** This queue's rows 8–11
> predate the finalized dependency tree in `docs/gauntlet/IMPLEMENTATION_UNITS.md`
> and are inconsistent with it. The authoritative order is
> `DB-01 → COMP-01A → {REL-08 → SRC-4D, OPS-05, COMP-01B, DATA-05B}`, with
> `DATA-06` branching off `DATA-03`. Specifically, row 10 lists COMP-01A as
> depending on REL-08, but the tree and the unit contracts make COMP-01A a
> prerequisite *of* REL-08 (and REL-08 a prerequisite of SRC-4D). With REC-01,
> the containment units, DATA-03, OPS-04, and DB-01 all accepted, the next
> dependency-ready unit is **COMP-01A**; DATA-06 is independently ready. Trust
> the dependency tree and unit contracts over these queue rows.

---

# Historical recovery roadmap (accepted P0–P7; superseded as current strategy)

## Objective

Turn VA Freelance Hub into a fast, trustworthy, legally cautious public job
index for Filipino freelancers, while keeping it a strong portfolio artifact for
agentic engineering and technical writing.

The plan fixes the current audit findings without overengineering the product.
The apex version is not a complex SaaS platform; it is a lean public index with
excellent data freshness, clear source policy, observable ingestion, and a
recoverable engineering trail.

## Product Boundary

VA Freelance Hub should do these things well:

- help Filipino freelancers discover relevant remote and VA-friendly work;
- show clear factual metadata, source attribution, freshness, and apply links;
- maintain a practical company directory;
- document how the autonomous ingestion system works;
- make operational health visible enough that silent failures do not linger.

It should not become a general applicant tracking system, paid marketplace,
resume database, or full browser-scraping platform.

## 2026-08-10 Production-Hardening Pause Checkpoint

The implementation branch codex/production-apex-audit-2026-08-09 is paused by
owner request for a documented GitHub backup. It is not merged or deployed.
The historical roadmap below remains valuable, but it must not be read as
production acceptance for this checkpoint.

The completed hardening scope is organized into five tracks:

| Track | Pause state | Required next evidence |
| --- | --- | --- |
| Runtime/security/performance | Implemented and targetedly verified | Full suite plus live Pages smoke checks |
| Ingestion/data integrity | Implemented; local migration validation passed | Remote D1 migration evidence and pulse contract checks |
| Scheduled automation/CI | Failure propagation and guardrails implemented | GitHub Actions result for the backup commit |
| Supply chain/configuration | Exact pins, isolated Bun linking, Pages compatibility decision recorded | Review residual advisories; do not change hosting implicitly |
| Legacy/recovery | Historical runtime quarantined and documentation written | Preserve branch until an explicit integration decision |

No action after this checkpoint may assume a release occurred. The next agent
must read docs/major-production-audit-2026-08-10.md and ADR-005 before changing
the Astro/Cloudflare adapter, deployment model, D1 schema, or workflow logic.

## Current Baseline

Accepted audit checkpoint:

- Commit: `74c0416` (`docs: add major audit and agent instructions`)
- GitHub Actions run: `27039365056`
- Local build at audit time: `bun run build` passed
- Production data snapshot: 635 active opportunities, 238 companies, 0 content
  digests
- Known product gap: `/opportunities` returns 404
- Known performance gap: homepage HTML roughly 1.75 MB
- Known data gaps: pay, timezone, application URL, experience, company, posted
  date, and description hash coverage
- Known operations gap: green workflows can still hide source failures

## Execution Rules

1. Ship vertical slices that leave production deployable.
2. Prefer simple fixes before new infrastructure.
3. Document percentage progress after every accepted slice.
4. Keep behavior commits and acceptance-doc commits separate when practical.
5. Treat source-level failures as first-class signals, not console noise.
6. Pause unclear or hostile sources instead of forcing brittle collection.
7. Do not add paid services, auth, payments, accounts, resumes, or auto-apply.
8. Keep all meaningful work backed up in GitHub.

## Compliance And Ethics Strategy

The compliant posture is public job indexing, not unrestricted scraping.

Source rules:

- Use official APIs, RSS feeds, documented feeds, and source-supported public
  endpoints first.
- Respect robots.txt, rate limits, terms of service, and explicit anti-scraping
  language.
- Do not bypass login gates, paywalls, CAPTCHAs, or access controls.
- Do not copy full job descriptions when factual metadata plus a source link is
  enough.
- Attribute every listing and route applications back to the original source.
- Keep opt-out/correction contact paths visible in the data policy.
- Add a source status model: `allowed`, `needs_review`, `paused`,
  `permission_required`, or `deprecated`.

Important principle: public visibility is not the same thing as permission to
automate collection, store records, and republish them. That does not make the
project unethical; it means source policy must be explicit and conservative.

## Roadmap

| Phase | Weight | Status | Goal |
| --- | ---: | --- | --- |
| P0 Recovery docs and methodology | 5% | Accepted | Adopt recovery docs, percent roadmap, ADR, and agent context |
| P1 Product surface and payload | 15% | Accepted | Add `/opportunities` and reduce homepage payload |
| P2 Indexing and datetime foundation | 15% | Accepted | Add hot-query indexes and normalize dates |
| P3 Ingestion observability | 20% | Accepted | Remove silent ATS/write/source failures |
| P4 Source compliance and portfolio | 15% | Accepted | Classify sources and pause risky/unproductive ones |
| P5 Data quality and triage | 15% | Accepted | Improve missing fields, categories, freshness, and stale policy |
| P6 Reporting and backup hygiene | 10% | Accepted | Replace noisy alert commits with rollups and status reports |
| P7 Final acceptance and polish | 5% | Accepted | Re-audit, verify production, and align portfolio docs |

## Phase Details

### P0 - Recovery Docs And Methodology (5%)

Acceptance:

- `AGENTS.md` reflects the active Cloudflare/Astro/D1 architecture.
- Recovery docs exist and explain the backup loop.
- Progress percentage rules exist.
- ADR records the methodology and public-job-index compliance decision.
- Documentation is committed, pushed, and accepted by GitHub Actions.

### P1 - Product Surface And Payload (15%)

Recommended slices:

1. Add `/opportunities` as the canonical paginated board.
2. Reduce homepage to a compact latest-opportunities preview.
3. Move full search/filtering behind a paginated API or route-level query.
4. Add smoke checks for `/`, `/opportunities`, `/directory`, and one category.

Acceptance targets:

- `/opportunities` returns 200 in production.
- Homepage no longer serializes hundreds of jobs into initial HTML.
- Initial homepage HTML target: below 750 KB, stretch target below 500 KB.

### P2 - Indexing And Datetime Foundation (15%)

Recommended slices:

1. Add query-aligned D1 indexes:
   - `(is_active, posted_at DESC)`
   - `(category, is_active, posted_at DESC)`
   - `(is_active, last_verified_at ASC)`
2. Normalize datetime writes and comparisons.
3. Add query-plan evidence before and after migration.

Acceptance targets:

- Hot queries avoid temp B-trees where feasible.
- Stale/freshness predicates compare normalized fields.
- Migration is backed up and CI/deploy evidence is recorded.

### P3 - Ingestion Observability (20%)

Recommended slices:

1. Return structured per-source results: `{ ok, count, durationMs, error }`.
2. Stop treating ATS exceptions as successful zero-item fetches.
3. Report actual D1 changes as the primary inserted count.
4. Track failed insert batches and expose them in workflow output.
5. Add thresholds for warning/failure annotations.

Acceptance targets:

- A green workflow cannot hide failed source status.
- Zero items is distinguishable from source failure.
- Insert accounting cannot over-report success.

### P4 - Source Compliance And Portfolio Cleanup (15%)

Recommended slices:

1. Add source config fields for compliance status and collection method.
2. Mark high-risk or unclear sources `needs_review` or `paused`.
3. Prefer RSS/API sources and ATS company pages with clear public access.
4. Document source policy in `data-policy`.
5. Time-box broken source fixes and stop repeated noisy commits.

Acceptance targets:

- Every enabled source has a documented access method and compliance state.
- Sources with explicit anti-automation terms are paused unless permission or an
  allowed API exists.
- Data policy accurately describes collection and opt-out behavior.

### P5 - Data Quality And Triage (15%)

Recommended slices:

1. Backfill or intentionally mark unknown company, pay, experience, timezone,
   application URL, and description hash fields.
2. Improve category triage so `other` is no longer the dominant bucket.
3. Separate "seen recently" from "posted recently".
4. Add source-specific old-job demotion or archive rules.

Acceptance targets:

- Missing-field counts are tracked after each ingestion run.
- Category distribution becomes useful for browsing.
- Old-but-still-seen jobs are labeled or demoted honestly.

### P6 - Reporting And Backup Hygiene (10%)

Recommended slices:

1. Replace per-run alert commits with daily source-health rollups.
2. Add a compact status report with counts, failures, and stale-data metrics.
3. Keep docs checkpoints small and evidence-rich.
4. Ensure local branch and `origin/main` stay synchronized after automation.

Acceptance targets:

- Repeated source failures do not spam Git history.
- Daily operational state can be read without opening every workflow log.

### P7 - Final Acceptance And Polish (5%)

Recommended slices:

1. Re-run the major audit.
2. Verify production routes, payload size, D1 metrics, and source status.
3. Update README and portfolio narrative to match real behavior.
4. Record final acceptance percentage and next optional phase.

Acceptance targets:

- Final audit has no high-priority preventable problems outstanding.
- Public docs, live product, and source policy tell the same story.

## Overengineering Guardrail

The plan is intentionally not "build a platform." It is a sequence of small,
observable repairs:

- first fix user-visible broken routes and payload size;
- then fix database foundations;
- then remove silent ingestion failures;
- then clean source policy and data quality.

Avoid abstractions that do not directly reduce silent errors, stale data,
latency, compliance risk, or recovery cost.
