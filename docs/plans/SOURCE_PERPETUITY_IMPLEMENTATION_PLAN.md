# Implementation Plan: Source Perpetuity Program

**Status:** Approved for dependency-ordered execution; no implementation unit
is implicitly approved to skip its own evidence gates.  
**Date:** 2026-08-29  
**Strategy:** `docs/SOURCE_PERPETUITY_STRATEGY.md`  
**Decision:** `docs/decisions/ADR-006-controlled-source-replenishment.md`  
**Resume prompt:** `docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md`

## Objective

Turn the existing source collectors, ATS adapters, Prospector, Source Doctor,
health history, and recovery workflow into a self-replenishing source
portfolio that remains compliant, measurable, diversified, reversible, and
easy for a fresh AI agent to continue.

This is a planning-only program overlay. It does not unpause a source, change
robots enforcement, mutate D1, contact a provider, or deploy runtime behavior.

## Product boundary

In scope:

- supported public RSS/API/XML job distribution;
- employer/customer opt-in and ATS partner feeds;
- minimal factual indexing with canonical linkback;
- source discovery, evidence, shadow, canary, activation, quarantine,
  replacement, and renewal;
- exact source economics and portfolio SLOs; and
- repository-first recovery evidence.

Out of scope:

- auto-apply, application submission, candidate data, accounts, payments, or
  subscriptions;
- CAPTCHA/login/paywall bypass;
- private, internal, unlisted, or draft postings;
- unrestricted HTML scraping or full-description mirroring;
- paid provider commitments without explicit owner approval; and
- a global source enablement flip.

## Architecture decisions

- One durable registry will describe provider mechanisms, source accounts,
  evidence leases, states, and content scope. Hard-coded policy becomes a
  compatibility input during migration, not the permanent authority.
- Compliance state and operational state remain independent.
- Exact source identity is persisted on opportunities before source economics
  drives automation.
- Candidate discovery is non-publishing by default.
- Every new provider mechanism starts with shadow evidence and one canary.
- Public-index sources store minimal factual metadata unless stronger
  syndication/permission evidence allows more.
- Current exact-six production behavior stays unchanged until a source-specific
  unit passes its guard, rollback, CI/deploy, and production window.
- Large global feeds are feasibility-tested outside the ten-minute hot path
  before a runtime is chosen.

## Dependency graph

```text
SP-00 durable plan
  -> SP-01 exact source identity
      -> SP-02 truthful yield/funnel baseline
          -> SP-03 provider/source registry schema
              -> SP-04 behavior-preserving policy resolver
                  -> SP-05 candidate lifecycle + evidence leases
                      -> SP-06 Prospector candidate queue
                      -> SP-07 runtime Source Doctor shadow
                          -> SP-08 evidence/review-debt automation
                              -> SP-09 Workable feasibility
                                  -> SP-10 Workable shadow/canary
                              -> SP-11 Lever shadow/canary
                              -> SP-12 Greenhouse minimal-index canary
                              -> SP-13 SmartRecruiters adapter/canary
                              -> SP-14 Teamtailor RSS adapter/canary
                              -> SP-15 Recruitee XML adapter/canary
                      -> SP-16 employer feed intake
                      -> SP-17 partner/permission pipeline

Two accepted canaries among SP-10..SP-15
  -> SP-18 adaptive cadence/quarantine/renewal
      -> SP-19 portfolio SLO and replacement automation
          -> SP-20 30-day perpetuity acceptance
```

SP-06 and SP-07 may be developed in parallel after SP-05 if their shared
candidate/observation contracts are frozen first. Provider adapters may be
implemented in parallel branches after SP-08, but production canaries are
sequential: one provider mechanism at a time.

## Universal unit contract

Every executor must:

1. read the authority chain and the unit contract;
2. fetch `origin`, preserve unrelated work, restate full start SHA, branch, and
   record whether automation advanced `main`;
3. reproduce the relevant baseline with read-only evidence;
4. implement only one unit, normally in no more than five files;
5. add focused tests and run the smallest meaningful gate;
6. run the full repository gate before a behavior commit:
   `bun run test`, `bun run typecheck`, `bun run audit:guardrails`, and
   `bun run build`;
7. inspect the staged diff and scan it for credentials;
8. commit and push an atomic slice;
9. require exact-SHA CI and, for runtime behavior, exact-SHA deploy evidence;
10. use scheduled production events and read-only D1 queries for acceptance;
11. make exactly one shared G9 terminal decision (`KEEP`, `REVISE`, `REVERT`,
    `BLOCKED`, `ESCALATE`, or `PAUSED`); and
12. update this plan, `docs/IMPLEMENTATION_STATUS.md`, and the sole mutable
    current-session baton `docs/SYSTEM_SAVEPOINT.md` with the SHA, run,
    evidence, rollback, and next exact unit. Update the strategy/ADR only when
    the decision changes; update handoff/recovery-trail prose only at a
    milestone or interruption.

Documentation-only units require `git diff --check`, path/link checks, and the
CI gate appropriate to the repository. They do not trigger production deploys
unless the existing workflow does so automatically.

## Unit board

| Unit | Outcome | Depends on | State |
| --- | --- | --- | --- |
| SP-00 | Durable strategy, plan, ADR, bootloader, and authority baton | Gauntlet terminal | TERMINAL — KEEP |
| SP-01 | Exact source identity on every new opportunity | SP-00 | TERMINAL — KEEP |
| SP-02 | Truthful source funnel and supply baseline | SP-01 | TERMINAL — KEEP |
| SP-03 | Provider/source registry foundation | SP-02 | TERMINAL — KEEP |
| SP-04 | Registry-backed behavior-preserving policy resolver | SP-03 | TERMINAL — KEEP |
| SP-05 | Candidate lifecycle, evidence lease, opt-out states | SP-04 | TERMINAL — KEEP |
| SP-06 | Prospector writes durable non-publishing candidates | SP-05 | TERMINAL — KEEP |
| SP-07 | Source Doctor evaluates runtime candidates in shadow | SP-05 | TERMINAL — KEEP |
| SP-08 | Evidence packets, deadlines, and review-debt reports | SP-06, SP-07 | TERMINAL — KEEP |
| SP-09 | Workable global XML feasibility decision | SP-08 | TERMINAL — KEEP |
| SP-10 | Workable shadow and one canary | SP-09 KEEP | PLANNED |
| SP-11 | Lever public Postings API shadow and one canary | SP-08 | VERIFYING |
| SP-12 | Greenhouse minimal-index shadow and one canary | SP-08 | VERIFYING |
| SP-13 | SmartRecruiters adapter, shadow, and canary | SP-08 | PLANNED |
| SP-14 | Teamtailor RSS adapter, shadow, and canary | SP-08 | PLANNED |
| SP-15 | Recruitee XML adapter, shadow, and canary | SP-08 | PLANNED |
| SP-16 | Employer “bring your feed” intake | SP-05 | TERMINAL — KEEP |
| SP-17 | Partner/permission evidence pipeline | SP-05 | TERMINAL — KEEP |
| SP-18 | Adaptive operations and evidence renewal | Two source canaries KEEP | PLANNED |
| SP-19 | Portfolio SLO and automatic replacement triggers | SP-18 | PLANNED |
| SP-20 | 30-day perpetuity acceptance and independent resume drill | SP-19 | PLANNED |

SP-01 is TERMINAL — KEEP (behavior `1a5d188`, CI/deploy `33240866482`,
migration `0034` applied, read-only D1 acceptance confirmed 10/10 post-deploy
rows stamped; evidence `docs/gauntlet/evidence/SP-01-exact-source-identity.md`).
SP-02 is TERMINAL — KEEP (behavior `ed0040a`, CI/deploy `33243425545`, migration
`0035` applied, read-only acceptance confirmed unchanged polls separated;
artifact `docs/source-economics-latest.md`).
SP-03 is TERMINAL — KEEP (behavior `0331fa1`, CI/deploy `33247081804`, migration
`0036` applied, read-only registry dump confirms 26-source coverage; artifact
`scripts/diagnostics/source-registry.ts`).
SP-04 is TERMINAL — KEEP (behavior `6abe887`, CI/deploy `33248170437`, PR
`33248125990` 724/0 guardrails/build ok; no new migration, empty-registry
fallback proves byte-equivalence for all 26 ids, adversarial unknowns remain
non-publishable, exact-six robots unchanged; artifact
`packages/scraper/policy-resolver.ts` + `policy-resolver.test.ts`).
SP-05 is TERMINAL — KEEP (behavior `63139e3`, CI/deploy `33249370177`, PR
`33249332214` 781/0 guardrails/build ok; migration `0037` applied, durable
opt-out/history + lifecycle graph + lease expiry → paused without delete proves
compliance holds never auto-promote, expired → dormant, opt-out blocks
shadow/canary; artifacts `packages/scraper/source-lifecycle.ts` +
`source-lifecycle.test.ts` + `source-lifecycle.test.ts (db)`).
SP-06 is TERMINAL — KEEP (behavior `407bfd3` squash from `4f38381`, CI/deploy `33250262171`, PR `33250226738` 793/0 guardrails/build ok; no migration, durable ATS candidate queue proves exact-host `needs_review`/`candidate` with FK/provider ensure, opt-out + duplicate suppression, 14d deadline, backlog/overdue visible; artifacts `packages/scraper/prospect-candidate.ts` + `prospect-candidate.test.ts` + `apps/web/src/pages/api/cron/prospect.ts`). SP-07 is TERMINAL — KEEP (behavior `fb9b6d7` squash from `4306407`, CI/deploy `33251582842`, PR `33251523995` 809/0 guardrails/build ok; no migration, bounded shadow probe proves endpoint/auth/visibility/robots/schema/cadence/funnel reporting, 2-req/512KiB budget, zero D1 writes, stop dispositions with no alternate path; artifacts `packages/scraper/candidate-shadow.ts` + `candidate-shadow.test.ts` 16/0). SP-08 is TERMINAL — KEEP (behavior `075be3b`+`fc4e5ab` squash-merged as `a03631b` on `main`, PR #88, PR CI `33254178348` 842/0 + main CI/deploy `33254391095` "No migrations to apply!" ✅ FTS ✅ Pages ✅; no `apps/web` runtime change; live read-only production D1 confirms zero mutations both pre- and post-deploy, zero current candidate rows; artifacts `packages/scraper/evidence-packet.ts` + `evidence-packet.test.ts` 22/0 + `scripts/diagnostics/evidence-packets.ts` + `evidence-packets.test.ts` 11/0 + `docs/evidence-packets-latest.md`). SP-09 is TERMINAL — KEEP (behavior `618dba9` squash-merged as `806b2d7` on `main`, PR #89, PR CI `33256108988` 860/0 + main CI/deploy `33256179738` ✅; one bounded live probe of Workable's official global feed measured 44.41 MiB/11,603 entries — decision `GITHUB_ACTION_PREPROCESSING`; zero D1 writes, no adapter enabled; artifacts `scripts/diagnostics/workable-feasibility.ts` + `.test.ts` 18/0 + `docs/workable-feasibility-latest.md`). SP-11..SP-15 (Lever/Greenhouse/SmartRecruiters/Teamtailor/Recruitee) are all now SP-08-dependency-ready and may proceed in parallel branches (canaries stay sequential — one provider live at a time); SP-10 (Workable adapter) is also dependency-ready on SP-09 KEEP but needs a real multi-day shadow/canary window. SP-16/SP-17 remain ready after SP-05.

## Phase 0 — Durable planning and truthful measurement

### SP-00: Durable planning and recovery package

**Description:** Record the accepted controlled-replenishment strategy,
executable unit graph, ADR, repeatable bootloader, and top-authority baton.

**Acceptance criteria:**

- [x] Strategy, implementation plan, ADR, and bootloader agree on terminology,
      state machines, provider order, stop conditions, and non-goals.
- [x] System savepoint, master plan, status, unit ledger, and docs index route a
      fresh AI to this program without rewriting the terminal Gauntlet.
- [x] Atomic docs commit is pushed; exact-SHA CI is green; no production source
      behavior or D1 state changed.

**Verification:**

- [x] `git diff --check`
- [x] internal referenced paths exist and bootloader anchor checks pass
- [x] exact-SHA Sovereign CI Guardrail is green (run `33236797132`)

**Dependencies:** Terminal Gauntlet and owner approval.  
**Likely files:** documentation only.  
**Estimated scope:** M (several docs, one logical planning package).  
**Rollback:** revert the docs commit; production behavior is unchanged.

### SP-01: Persist exact source identity

**Description:** Add an immutable configured `source_id`/`source_key` to every
new opportunity so source economics do not infer identity from display labels.
Backfill is a separate read-only-first decision; do not guess ambiguous legacy
rows.

**Acceptance criteria:**

- [x] New static and ATS records persist the exact configured identity through
      normalization, pending/retry, insert, and reactivation paths.
- [x] Migration is additive and nullable for legacy data; no ambiguous bulk
      backfill occurs.
- [x] Tests prove two source IDs sharing one display platform remain distinct.

**Verification:** focused schema/ingestion tests, full gate, fresh-D1 migration
chain, exact-SHA deploy, and read-only count of new rows with missing identity.  
**Dependencies:** SP-00.  
**Likely files:** `packages/db/schema.ts`, one migration,
`apps/web/src/pages/api/cron/scrape.ts`, focused tests.  
**Estimated scope:** M.  
**Rollback:** stop writing the new nullable column; retain additive schema.

**Status:** TERMINAL — KEEP (2026-08-29). Behavior `1a5d188` (PR #80), CI/deploy
`33240866482` applied migration `0034` and deployed Pages; the first post-deploy
scrape tick (`07:30:09Z`) stamped 10/10 new rows with exact `source_id`
(`real-work-from-anywhere` ×7, `remote-ok` ×3), 5,075 legacy rows remained
`NULL`, and both acceptance queries were read-only (`changed_db=false`).
Evidence: `docs/gauntlet/evidence/SP-01-exact-source-identity.md`. Follow-ups
recorded: digest ingest path (`apps/web/src/pages/api/ingest.ts`) and any
read-only-first legacy backfill. **Next:** SP-02.

### SP-02: Build truthful source yield and funnel metrics

**Description:** Replace repeated `items seen` as a supply proxy with exact
per-source raw, normalized, deduplicated, geo-passed, triage-passed, inserted,
and reactivated counts plus 7/14/30-day net-new accepted jobs.

**Acceptance criteria:**

- [x] Intentional cadence/policy skips, unchanged feed inventory, zero-yield
      fetches, and failures are reported separately.
- [x] A read-only baseline reports exact source/provider concentration and
      identifies legacy rows whose source ID is unknown.
- [x] Weekly reports compare against a trailing baseline without double-counting
      one source before/after a policy-state transition.

**Verification:** deterministic rollup fixtures, D1 read-only reconciliation,
full gate, and generated report review.  
**Dependencies:** SP-01.  
**Likely files:** source event schema/migration if required, scrape event writer,
report script/workflow, tests.  
**Estimated scope:** split into SP-02A event semantics and SP-02B report if more
than five files are required.  
**Rollback:** keep existing report and disable the new rollup; do not delete
events.

**Status:** TERMINAL — KEEP (2026-08-29). Delivered as one unit in two parts.
**Part 1 — read-only source-economics baseline:** pure module
`scripts/diagnostics/source-economics.ts` (query emitter + reconciler +
renderer) + fixture test + generated `docs/source-economics-latest.md`. Reports
identity coverage (exact source_id fill vs legacy NULL gap), net-new accepted
supply at 7/14/30-day freshness (global + per exact source_id), provider-family
concentration (ADR-006 §7 fold of the two Jobicy feeds and ATS `platform:token`
ids, with SLO flags and a low-coverage provisional caveat), and per-source
real/unchanged/skip/failure/zero-yield outcomes. **Part 2 — 304 truthfulness
fix:** unchanged conditional fetches carry the prior count forward
(`scrape.ts`), inflating economics; additive nullable
`source_fetch_events.not_modified` (migration `0035`) + writer + report
separation make `items`/`real_fetches` exclude unchanged polls. Behavior
`ed0040a` (PR #82); exact-SHA CI/deploy `33243425545` applied `0035` and deployed
Pages. Post-deploy read-only D1 acceptance (all queries `changed_db=false`,
`rows_written=0`): reconciliation OK, unchanged separated from real fetches
(remotive 489+3, we-work-remotely 488+4, remote-ok 82+1, two Jobicy feeds 72+1 /
69+1), 5,090 rows / 15 with `source_id` / 1,267 active `NULL`, net-new
7d/14d/30d = 150/430/579. **Beyond criteria (optional, non-blocking):** the
exhaustive per-stage downstream funnel (raw→…→inserted attribution) and a
recurring report workflow.

### Checkpoint A — measurement foundation

- [ ] Every new job and source event has exact source identity.
- [ ] Net-new accepted supply and concentration reconcile to D1.
- [ ] No production source was enabled or disabled.
- [ ] SP-00..SP-02 each have atomic GitHub/CI/evidence checkpoints.

## Phase 1 — Registry and lifecycle foundation

### SP-03: Add provider profiles and source registry

**Description:** Add additive D1 tables/types for provider profiles and source
accounts, including mechanism, exact hosts, auth class, evidence URLs,
visibility/content scope, cadence envelope, policy lease, and independent
compliance/operational states.

**Acceptance criteria:**

- [x] Schema represents every current static and ATS source without changing
      runtime behavior.
- [x] Constraints reject invalid state combinations and duplicate durable
      source identities.
- [x] A read-only registry dump maps all known sources and flags unmapped
      entries; it does not activate them.

**Verification:** schema/constraint tests, fresh migration chain, mapping audit,
full gate.  
**Dependencies:** SP-02.  
**Likely files:** schema, one migration, registry types/repository, tests.  
**Estimated scope:** M.  
**Rollback:** ignore additive registry tables; existing config remains authority.

**Status:** TERMINAL — KEEP (2026-08-29). Additive, nullable registry foundation:
**Tables** `provider_profiles` (provider mechanism/family, auth_class, endpoint
pattern, allowed_hosts, evidence lease, cadence envelope, default states) and
`source_registry` (durable `source_id` = `opportunities.source_id`, provider
FK, display_name, endpoint_url, independent compliance/operational states,
review_deadline/policy_expiry/owner, opt_out). **Constraints:** CHECKs for
mechanism/auth/lease/cadence/evidence, PK duplicate rejection, FK to provider,
`CHECK (shadow/canary/active ⇒ allowed/conditional)` proven by 6 negative + 3
positive fixtures, `opt_out IN (0,1)`, `cadence_max ≥ cadence_min`. **Coverage:**
fixture inserts 12 static `sources.ts` + 14 ATS `ATS_TOKEN_POLICIES` token ids =
26 distinct `source_id` with jobicy 2-feed → 1 family fold; read-only
`scripts/diagnostics/source-registry.ts` (`sql`/`meta`/`audit`) maps 26 known vs
0 registry rows → 26 unmapped (no activation). Behavior `0331fa1` (PR #83);
exact-SHA CI/deploy `33247081804` applied `0036` and deployed Pages;
local gate `690 pass / 0 fail / 1764 assertions`, typecheck 0, guardrails 0,
build ok, `rehearse 94/94` fresh+legacy. **Beyond criteria (non-blocking):**
resolver (SP-04) must validate `https://` + `allowed_hosts` before fetch;
shared ATS list drift guard. **Next:** SP-04.

### SP-04: Introduce a behavior-preserving policy resolver

**Description:** Resolve source policy through one typed interface backed by
the registry while preserving every current allow/pause decision and exact-six
robots configuration.

**Acceptance criteria:**

- [x] Golden tests prove all current source identities produce byte-equivalent
      policy decisions before and after the resolver.
- [x] Unknown providers/tokens remain non-publishing candidates, not active
      sources.
- [x] Hard-coded configuration remains an explicit rollback adapter until the
      registry rollout is accepted.

**Verification:** policy parity matrix, adversarial unknown/dynamic tests, full
gate, exact-SHA deploy, one full scheduled cycle with zero decision drift.  
**Dependencies:** SP-03.  
**Likely files:** new policy module, scrape route integration, tests.  
**Estimated scope:** M.  
**Rollback:** feature flag or single resolver switch returns to static policy.

**Status:** TERMINAL — KEEP (2026-08-29). Behavior-preserving resolver
`packages/scraper/policy-resolver.ts` (`resolvePolicy`/`fallbackPolicy`/`loadRegistryPolicies`, `isPublishable` CHECK mirror, `ROBOTS_ENFORCE_SOURCE_IDS` mirror + 6-id literal, 26-id parity, ATS notes byte-identical) + `policy-resolver.test.ts` 34/0 (golden parity for all 26, adversarial 12 unknowns, registry overlay authoritative, publishability matrix, robots mirror, reversible fallback) + `apps/web/src/pages/api/cron/scrape.ts` registry overlay (`activeRegistryPolicies` per-tick, `fetchConfiguredSourceWithStatus` + `atsPlatformPolicy` consult `resolvePolicy` before hard-coded fallback). Full gate `724/0/2387`, typecheck 0, guardrails 0, build ok. PR `33248125990` 724/0, main `33248170437` no-migration ✅ FTS ✅ Pages `25744ab7` ✅ — empty-registry fallback proves zero drift; exact-six unchanged. **Next:** SP-05.

### SP-05: Add candidate lifecycle, evidence leases, and opt-out memory

**Description:** Add durable non-publishing candidate/evidence records with
review deadlines, policy expiry, permission state, opt-out/do-not-reingest,
and reviewer decision history.

**Acceptance criteria:**

- [x] State transitions follow the ADR and never promote a compliance hold
      automatically.
- [x] Expired or denied evidence makes a source dormant/blocked without deleting
      history or stored opportunities.
- [x] Opt-out identity is checked before a candidate can enter shadow/canary.

**Verification:** state-machine tests, lease boundary tests, migration chain,
full gate.  
**Dependencies:** SP-04.  
**Likely files:** schema/migration, lifecycle module, tests.  
**Estimated scope:** M; split opt-out into SP-05B if file count grows.  
**Rollback:** stop candidate processing; retain evidence history.

**Status:** TERMINAL — KEEP (2026-08-29). `source_opt_outs` (durable PK, no cascade-delete, survives registry delete) + `source_decisions` (append-only, survives delete) + 3 lease indices (review_deadline/policy_expiry/opt_out) on `source_registry` (migration `0037` additive; rehearse `94/94` fresh+legacy). Lifecycle `packages/scraper/source-lifecycle.ts` proves 7-group topology (`candidate→shadow→canary→active→review_due→paused`, `degraded→quarantined`, `retired` terminal), compliance `allowed|conditional`-only shadow, opt-out blocks all promotion, lease `policyExpiry past → review_due (grace) → paused` dormancy without delete, and `validateTransition` CHECK. Behavior `63139e3` (PR #85) exact-SHA CI `33249332214` PR 781/0 + `33249370177` main applied `0037` ✅ FTS ✅ Pages ✅; full gate `781/0/2489` + `source-lifecycle` 41 + db 12 + `registry` 16 + `policy-resolver` 34; exact-six unchanged.

### Checkpoint B — behavior-preserving governance

- [x] Current production decisions are unchanged for a complete scheduled cycle.
- [x] Unknown discoveries cannot publish.
- [x] Every policy decision has durable evidence and an expiry/deadline.
- [x] Registry rollback has been exercised in tests or a staging drill.

## Phase 2 — Non-publishing discovery and evidence

### SP-06: Make Prospector write durable candidates

**Description:** Replace issue-only ATS discovery as the primary state with an
idempotent D1 candidate queue. Issues become summaries/alerts of durable state,
not the state itself.

**Acceptance criteria:**

- [x] Exact-host ATS/career discoveries create or refresh one candidate without
      publishing or changing source policy.
- [x] Candidate provenance links to accepted job/directory evidence and rejects
      lookalike hosts and opt-outs.
- [x] Backlog, deadlines, and duplicate suppression are visible in a generated
      report.

**Verification:** Prospector fixtures, idempotency/mass-add guards, dry-run on
production candidates, full gate.  
**Dependencies:** SP-05.  
**Likely files:** prospect route, Prospector package, workflow/report, tests.  
**Estimated scope:** split route and workflow/report if required.  
**Rollback:** disable candidate writes; current directory behavior remains.

**Status:** TERMINAL — KEEP (2026-08-29). `packages/scraper/prospect-candidate.ts` (`ATS_PROVIDER_CONFIG` 5, `buildCandidateRow` needs_review/candidate 14d, `distinctAtsCandidates` dedupe, `countBacklog`/`countReviewOverdue`) + `prospect-candidate.test.ts` 12/0 + `apps/web/src/pages/api/cron/prospect.ts` durable queue (FK provider ensure, opt-out, duplicate/refresh, 50 anomaly/15 drain, backlog/overdue) + `gha-prospector-pulse.yml` candidate digest. Behavior `407bfd3` (PR #86 squash `4f38381`); CI `33250226738` PR 793/0 + `33250262171` main Pages ✅ (no migration). Proof: exact-host ATS only, lookalikes rejected, opt-out blocks, duplicate suppressed, backlog visible.

### SP-07: Extend Source Doctor to runtime candidate shadow probes

**Description:** Let Source Doctor evaluate a registry candidate’s declared
mechanism without adding it to the production scrape set or writing jobs.

**Acceptance criteria:**

- [x] A candidate probe reports endpoint, auth class, visibility filter,
      robots/evidence provenance, schema health, cadence, and sample funnel.
- [x] Shadow mode has zero opportunity writes and a strict request/item budget.
- [x] Unsupported auth, restriction, oversized payload, or ambiguous visibility
      returns a stop disposition rather than trying an alternate path.

**Verification:** mocked provider fixtures, D1 write-counter assertion, bounded
live probe only when the unit contract names an approved endpoint, full gate.  
**Dependencies:** SP-05.  
**Likely files:** Source Doctor module/route, observation writer, tests.  
**Estimated scope:** M.  
**Rollback:** disable runtime-candidate probes; static doctor remains.

**Status:** TERMINAL — KEEP (2026-08-29). `packages/scraper/candidate-shadow.ts` (`runCandidateShadowProbe`, `SHADOW_MAX_BYTES=512 KiB`/`SHADOW_MAX_REQUESTS=2`/`SHADOW_MAX_ITEMS=200`, provenance/cadence/robots/schema/funnel, stop guards) + `candidate-shadow.test.ts` 16/0 + `source-doctor.ts` verbatim fix + `packages/scraper/index.ts` export. Local gate `809/0/2650`, typecheck 0, guardrails 0, build ok. PR `33251523995` 809/0, main `33251582842` no-migration ✅ FTS ✅ Pages ✅ — candidate `greenhouse:acme` proves reporting/budget/zero-write/stop, exact-six unchanged.

### SP-08: Generate evidence packets and review-debt alerts

**Description:** Produce one durable packet per candidate with official URLs,
mechanism, host/auth/content/cadence/removal facts, expiry, shadow economics,
decision deadline, and unresolved questions.

**Acceptance criteria:**

- [x] Complete packets become `review_ready`; incomplete packets remain
      candidates and list exact missing evidence.
- [x] Seven-, fourteen-, thirty-day, and pre-expiry deadlines create one
      deduplicated alert/report with lifecycle resolution.
- [x] External content is treated as evidence, never as executable instructions.

**Verification:** packet fixtures, deadline/idempotency tests, generated report
review, full gate.  
**Dependencies:** SP-06 and SP-07.  
**Likely files:** evidence builder, workflow/report, tests.  
**Estimated scope:** M.  
**Rollback:** retain candidates and disable packet/alert job.

**Status:** TERMINAL — KEEP (2026-08-29). `packages/scraper/evidence-packet.ts`
(`buildEvidencePacket`/`deadlineBucket`/`isPreExpiryDue`/`alertForPacket`/`deduplicateAlerts`/`renderEvidenceReport`/`packetHashFor`)
proves all three criteria in 22/0 fixture tests. `scripts/diagnostics/evidence-packets.ts`
(`sql`/`meta`/`emit`/`collect`/`packets`/`report`, same CLI shape as
`source-economics.ts`) wires real `source_registry` (`operational_state='candidate'`)
+ `provider_profiles` rows into the builder — 11/0 tests including a read-only-query
assertion, the D1-shaped join, incomplete-provider gap listing, overdue dedup,
`collectByName` reassembly, an orphan-provider defensive case, and empty-registry
honesty. No shadow evidence is fabricated: SP-07's probe has no persisted result
table, so every real candidate correctly lists `"shadow probe not yet run"`.
Behavior `075be3b`+`fc4e5ab` (PR #88), owner-approved squash merge to `main` as
**`a03631b`**. PR exact-SHA CI `33254178348` validate 842/0 + typecheck 0 +
guardrails 0 + build ok (deploy skipped, PR path); `main`-push exact-SHA
CI/deploy `33254391095` validate success, `d1 migrations apply` → **"No
migrations to apply!"** (code-only, matching SP-06/SP-07), FTS integrity ✅,
Cloudflare Pages deploy ✅. Live read-only production D1
(`wrangler d1 execute DB --remote`) both pre- and post-deploy confirms
`changed_db=false`, `rows_written=0`, and zero current `candidate` rows —
SP-06's Prospector queue has not yet inserted one; `docs/evidence-packets-latest.md`
reports this truthfully rather than fabricating a reserve. No schema or
`apps/web` runtime change. **Next:** **SP-09** (Workable global XML
feasibility) is the next dependency-ready unit.

### Checkpoint C — replenishment reserve

- [ ] Discovery, evidence, and shadow operate without public job writes.
- [ ] At least two review-ready reserve candidates exist or the report explains
      why none meet the evidence contract.
- [ ] Review debt cannot remain invisible or indefinitely open.
- [ ] No provider activation has occurred.

## Phase 3 — Supported distribution canaries

### SP-09: Decide Workable global XML feasibility

**Description:** Measure the official hourly global XML feed’s size, transfer
cost, parse memory, schema stability, remote/PH candidate yield, duplicates,
and appropriate runtime before building an adapter.

**Acceptance criteria:**

- [x] Probe is bounded, read-only, no faster than provider guidance, and archives
      only measurements/schema samples permitted by the evidence policy.
- [x] Decision selects Worker streaming, GitHub Action preprocessing, or
      `PAUSED` with quantified Cloudflare/free-tier constraints.
- [x] No per-token Workable workaround is enabled.

**Verification:** reproducible probe script/test, payload/checksum/timing report,
zero D1 writes, independent review.  
**Dependencies:** SP-08.  
**Likely files:** diagnostic script, fixtures/tests, evidence report.  
**Estimated scope:** S/M.  
**Rollback:** delete local artifacts not intended for Git; no runtime change.

**Status:** TERMINAL — KEEP (2026-08-29). One bounded live probe (single HTTP
GET) of `https://www.workable.com/boards/workable.xml` measured 44.41 MiB,
11,603 raw `<job>` entries (10,000 distinct by `<url>`, 645 duplicated within
the fetch), 2,421 `remote=true`, 337 `country=PH`, schema exactly matching
Workable's own documentation (16/16 fields present). `scripts/diagnostics/
workable-feasibility.ts` (`probe`/`analyze`/`report` CLI; pure `analyzeFeed`/
`classifyRuntime`/`renderReport`) formalizes the decision rule, tested 18/0
against a small synthetic fixture — never a stored copy of the live feed.
**Decision: `GITHUB_ACTION_PREPROCESSING`** — both byte size and item count
exceed a single source's reasonable share of the shared 10-minute scrape-tick
budget (~6 other sources + AI triage in one invocation); a dedicated hourly
GHA job matches the feed's own update cadence and this repo's existing
Prospector/directory-maintenance pattern. Zero D1 writes, no per-token
Workable adapter enabled, no runtime change. Behavior `618dba9` (PR #89);
main CI/deploy `33256179738` success. Full gate `860/0/2829`, typecheck 0,
guardrails 0, build ok. **Next:** SP-11..SP-15 (Lever/Greenhouse/
SmartRecruiters/Teamtailor/Recruitee) are all now dependency-ready and may
proceed in parallel branches; SP-10 (the actual Workable adapter) is also
dependency-ready but needs a real multi-day shadow/canary window, not
completable in one sitting.

### SP-10: Workable adapter, shadow, and one canary

**Description:** If SP-09 is `KEEP`, implement the chosen official XML path,
filter before expensive triage, and canary one bounded source cohort.

**Acceptance criteria:**

- [ ] Adapter retains canonical Workable URLs, respects hourly cadence, and
      publishes only approved/listed jobs within minimal content scope.
- [ ] Seven-day shadow shows bounded resources and positive unique eligible
      yield; canary never exceeds 10% of new additions.
- [ ] Source-scoped rollback stops Workable without affecting the exact six or
      deleting stored jobs.

**Verification:** XML fixtures, truncation/error/full-feed tests, shadow report,
exact-SHA CI/deploy, seven-day canary, read-only D1 acceptance.  
**Dependencies:** SP-09 `KEEP`.  
**Likely files:** adapter module, registry profile, scrape/scheduled integration,
tests, evidence. Split implementation/deploy evidence into separate commits.  
**Estimated scope:** M per slice.  
**Rollback:** disable the Workable registry source/profile.

### SP-11: Lever public Postings API canary

**Description:** Use the official public Postings API for one curated employer,
minimal metadata, canonical linkback, and published jobs only.

**Acceptance criteria:**

- [ ] Public site/token provenance is exact and EU/global origin is explicit.
- [ ] Shadow validates published-only visibility, removals, rate behavior, and
      unique eligible yield before publication.
- [ ] Seven-day canary and rollback are source-scoped.

**Verification:** provider fixtures, visibility/removal tests, shadow/canary
reports, exact-SHA CI/deploy and D1 evidence.  
**Dependencies:** SP-08.  
**Likely files:** existing ATS adapter/profile, tests, evidence.  
**Estimated scope:** S/M.  
**Rollback:** return the one Lever source to candidate/dormant.

**Status:** VERIFYING (2026-08-30). The existing `fetchLever` adapter already
covers the fetch/parse (canonical `hostedUrl`, location/workplaceType, a
500-char-truncated description). `packages/scraper/lever-canary.ts` (6/6
tests) + the newly-extracted, provider-agnostic
`packages/scraper/source-promotion.ts` (11/11 tests — SP-12's Greenhouse-only
copy left untouched) encode the profile and evidence-gated promotion.
Curated target: Lever's own careers board (`lever:lever`) after a dozen
well-known-company guesses all 404'd against the live API. Real live probe:
`HEALTHY_EMPTY` (robots allowed, valid empty JSON — honest zero-yield
evidence). Evidence packet `review_ready`; decision `ok=true`. Full evidence:
`docs/gauntlet/evidence/SP-11-lever-lever-day1-evidence.md`. Behavior
`e03d167` (PR #93) merged as `070694e`; full gate `922/0/2979`, typecheck 0,
guardrails 0, build ok. **Same as SP-12: the actual registry write was not
attempted — classifier-blocked class of action, held for explicit owner
confirmation.** **Next:** owner authorizes the write (or picks a different/
currently-hiring Lever employer for canary-yield purposes) before this unit
can proceed to its real 7-day shadow/canary windows.

### SP-12: Greenhouse minimal-index canary

**Description:** Reconcile the official public/no-auth Job Board GET evidence
with project policy by testing one curated board in minimal-metadata mode.

**Acceptance criteria:**

- [ ] Adapter excludes application submission, internal/private data, and full
      description storage under the public-index profile.
- [ ] One board passes seven-day shadow and seven-day canary with canonical
      attribution and source-scoped rollback.
- [ ] The existing five-token blanket pause is not globally removed; each later
      board enters through the registry lifecycle.

**Verification:** minimal-content contract tests, exact-token guard update,
shadow/canary reports, exact-SHA CI/deploy and D1 evidence.  
**Dependencies:** SP-08.  
**Likely files:** Greenhouse adapter/profile, policy resolver, tests, evidence.  
**Estimated scope:** M.  
**Rollback:** revert the canary board to candidate/dormant; preserve other
Greenhouse pauses.

**Status:** VERIFYING (2026-08-29). The existing `fetchGreenhouse` adapter
already satisfies the minimal-content contract (title/canonical linkback/
location summary only, never the full description) — no new adapter
needed. `packages/scraper/greenhouse-canary.ts` (11/0 tests) encodes the
compliance decision + evidence-gated promotion. Real live SP-07 probe
against `greenhouse:grafanalabs` (one of the five already-known,
COMP-01D-paused boards): `HEALTHY_WITH_RESULTS`, 134 jobs, robots allowed.
SP-08 evidence packet `review_ready`; `decidePromotionToShadow` `ok=true`.
Full evidence: `docs/gauntlet/evidence/SP-12-greenhouse-grafanalabs-day1-evidence.md`.
Behavior `7769d69` (PR #92) merged as `23e74dd`; full gate `905/0/2940`,
typecheck 0, guardrails 0, build ok. **The actual registry write (compliance
decision + candidate→shadow promotion) was blocked by the harness's own
safety classifier and is held for explicit owner confirmation — not routed
around.** No D1 mutation occurred; the five-token `ATS_TOKEN_POLICIES`
pause and the exact-six enforcement are both completely unchanged. **Next:**
owner authorizes the write (or names a different board) before this unit
can proceed to its real 7-day shadow/7-day canary observation windows.

### SP-13: SmartRecruiters public Posting API adapter

**Description:** Add the official no-auth Posting API using one curated company
identifier and API endpoints only.

**Acceptance criteria:**

- [ ] Pagination, active/public visibility, canonical apply URL, and minimal
      content are deterministic and tested.
- [ ] Seven-day shadow proves bounded requests and positive or explicitly
      accepted zero-yield economics before canary.
- [ ] One-company canary has a source-scoped rollback.

**Verification:** fixtures, pagination/removal tests, shadow/canary reports,
exact-SHA CI/deploy and D1 evidence.  
**Dependencies:** SP-08.  
**Likely files:** new adapter/profile, registry wiring, tests, evidence.  
**Estimated scope:** M.  
**Rollback:** disable the SmartRecruiters source profile.

### SP-14: Teamtailor public RSS adapter

**Description:** Add a per-career-domain `/jobs.rss` adapter with exact-domain
provenance and provider-documented pagination.

**Acceptance criteria:**

- [ ] Offset/per-page behavior, public metadata, canonical URLs, and feed
      disappearance semantics are tested.
- [ ] One domain completes shadow and canary without HTML scraping.
- [ ] Custom career domains require durable provider/provenance association,
      not suffix guessing.

**Verification:** RSS fixtures, exact-host/pagination tests, shadow/canary
reports, exact-SHA CI/deploy and D1 evidence.  
**Dependencies:** SP-08.  
**Likely files:** RSS adapter/profile, provenance mapping, tests, evidence.  
**Estimated scope:** M.  
**Rollback:** disable the Teamtailor source profile.

### SP-15: Recruitee XML adapter

**Description:** Add company XML feeds, not the soon-tokened JSON Careers API,
with explicit public/indexable status and durable opt-out handling.

**Acceptance criteria:**

- [ ] Only published public offers from exact company feeds are indexed; JSON
      auth behavior is not bypassed.
- [ ] Opt-out/do-not-reingest is verified before shadow, canary, and each
      reconciliation.
- [ ] One-company shadow/canary proves removal semantics and rollback.

**Verification:** XML/indexability/opt-out fixtures, shadow/canary reports,
exact-SHA CI/deploy and D1 evidence.  
**Dependencies:** SP-08.  
**Likely files:** XML adapter/profile, opt-out check, tests, evidence.  
**Estimated scope:** M.  
**Rollback:** disable the Recruitee source and retain opt-out history.

### Checkpoint D — source portfolio expansion

- [ ] At least two new provider mechanisms have terminal `KEEP` canaries.
- [ ] Each mechanism has separate evidence, policy lease, rollback, and source
      economics.
- [ ] Current exact-six controls remain healthy.
- [ ] No blocked or permission-only endpoint was substituted.

## Phase 4 — Permission flywheel and adaptive operations

### SP-16: Add no-account employer “bring your feed” intake

**Description:** Create a GitHub issue template and/or public email-linked form
that lets an employer provide a canonical feed/careers URL, authority statement,
contact, content scope, and removal preference without adding user accounts.

**Acceptance criteria:**

- [x] Submission is a candidate only and cannot publish automatically.
- [x] Required consent/provenance fields and privacy/minimal-data language are
      clear; secrets and candidate data are rejected.
- [x] Intake deduplicates against source registry and opt-outs.

**Verification:** template/form validation, abuse/privacy review, candidate
creation dry run, build if a public page changes.  
**Dependencies:** SP-05.  
**Likely files:** issue template or Astro page, candidate intake route only if
necessary, tests/docs. Prefer the smallest no-account path.  
**Estimated scope:** S/M.  
**Rollback:** remove/disable intake; candidates remain non-publishing.

**Status:** TERMINAL — KEEP (2026-08-29). `.github/ISSUE_TEMPLATE/
employer-feed-intake.yml` + `.github/workflows/gha-employer-intake.yml` +
`packages/scraper/employer-intake.ts` (pure `parseIssueForm`/
`buildEmployerCandidateRow`/`checkDuplicate`, 23/0 tests) +
`apps/web/src/pages/api/cron/employer-intake.ts` (`PROXY_SECRET`-gated,
re-validates server-side, idempotent insert). The whole submission is
rejected if secret-like or candidate-personal-data-like content appears
anywhere in the body; accepted submissions are always `needs_review`/
`candidate` — never auto-promoted. Behavior `8d1a05a` (PR #90); main
CI/deploy `33258746613` success; post-deploy unauthenticated-POST check
returns 401 (route live, zero D1 writes from the check). Full gate
`883/0/2878`, typecheck 0, guardrails 0, build ok. **Next:** SP-17.

### SP-17: Create partner and customer-permission pipeline

**Description:** Record outreach-ready evidence packs and a durable permission
state for Ashby dedicated feeds, employer-authorized Breezy, Jobvite feeds, and
other partner/customer paths. This unit prepares artifacts; it does not send
messages or accept paid terms without owner authority.

**Acceptance criteria:**

- [x] Each target has provider route, contact path, requested scope, data
      minimization, attribution, cadence, removal, and no-candidate-data terms.
- [x] Permission evidence can be attached to a source account with a 365-day
      lease and revocation handling.
- [x] No generic Ashby/Breezy/Jobvite source is activated by this unit.

**Verification:** evidence-template tests/path review, ADR consistency check,
owner review before any external communication.  
**Dependencies:** SP-05.  
**Likely files:** partner evidence templates/docs, registry permission types,
tests if behavior changes.  
**Estimated scope:** S/M.  
**Rollback:** archive draft artifacts; runtime is unchanged.

**Status:** TERMINAL — KEEP (2026-08-29). `packages/scraper/partner-permission.ts`
(pure `buildPermissionEvidencePack`/`attachPermissionToSourceAccount`/
`renderPermissionPackReport`, 11/0 tests) + three real evidence packs under
`docs/gauntlet/evidence/`, each built from officially revalidated
documentation fetched this session (not carried over unchecked). Ashby
(`integrations@ashbyhq.com`, hourly feed, Ashby-Admin customer opt-in) and
Jobvite (`/marketplace/partner-request/` + demo request + phone) are
`outreach_ready`. **Breezy has no documented partner-request path at all** —
API access is exclusively a Personal Access Token the customer/employer
generates in their own account — correctly captured as `draft` with
`providerRoute`/`contactPath` honestly `null`, redirecting future work to
employer opt-in rather than partner outreach. 365-day lease reuses SP-05's
`computePolicyExpiry`; revocation reuses SP-05's `source_opt_outs` — no new
mechanism. Behavior `cede086` (PR #91); main CI/deploy `33259776422` success.
Full gate `894/0/2911`, typecheck 0, guardrails 0, build ok. No message sent,
no source activated. **Next:** SP-12 (Greenhouse canary).

### SP-18: Add bounded adaptive cadence, quarantine, recovery, and renewal

**Description:** Automate technical operations for already-allowed sources
within provider minimum/maximum cadence and evidence leases. Never auto-recover
a compliance hold.

**Acceptance criteria:**

- [ ] Cadence reacts only within the reviewed envelope and honors cache headers,
      feed TTL, 429/backoff, and shared-origin budgets.
- [ ] Three healthy probes across at least 72 hours may recover a technical
      quarantine; compliance blocks require a new human-reviewed decision.
- [ ] Evidence expiry quarantines future collection and starts renewal 30 days
      early without deleting stored jobs.

**Verification:** time/rate/state-machine simulations, adversarial compliance
hold tests, shadow rollout, exact-SHA deploy and observation.  
**Dependencies:** at least two new source canaries `KEEP`.  
**Likely files:** scheduler/policy modules, registry state writer, tests. Split
cadence and evidence renewal if more than five files.  
**Estimated scope:** M per slice.  
**Rollback:** static cadence and manual quarantine switch.

### SP-19: Enforce portfolio SLO and automatic replacement triggers

**Description:** Turn supply decline, concentration, empty reserve, and review
debt into actionable, deduplicated alerts and candidate replenishment work.

**Acceptance criteria:**

- [ ] Reports use exact net-new accepted jobs and 7/14/30-day freshness, not
      repeated item sightings.
- [ ] Warning/incident/concentration/reserve thresholds match the strategy and
      never auto-disable a productive source solely for concentration.
- [ ] A retired/quarantined source creates a bounded replacement objective from
      the reserve without auto-publishing it.

**Verification:** historical replay fixtures, alert idempotency/lifecycle tests,
read-only D1 reconciliation, synthetic source-loss drill.  
**Dependencies:** SP-18.  
**Likely files:** rollup script, workflow/alert lifecycle, tests, latest report.  
**Estimated scope:** M.  
**Rollback:** advisory-only reporting; disable automatic candidate promotion to
review (never to publish).

## Phase 5 — Perpetuity acceptance

### SP-20: Run 30-day acceptance and independent resume drill

**Description:** Observe a representative portfolio window, prove rollback and
replacement, and verify a fresh AI can continue solely from GitHub docs and the
bootloader.

**Acceptance criteria:**

- [ ] Thirty-day evidence meets the accepted supply, freshness, diversity,
      reserve, reliability, evidence-lease, and opt-out contracts or records a
      precise non-terminal disposition.
- [ ] One synthetic/real technical quarantine and one source replacement are
      completed without bypassing compliance or degrading control sources.
- [ ] An independent fresh agent identifies the correct state, next unit,
      stop conditions, and commands without private chat context.

**Verification:** read-only D1 portfolio report, workflow/run evidence,
rollback/replacement drill, independent critic/resume report, full gate.  
**Dependencies:** SP-19 plus a mature 30-day window.  
**Likely files:** evidence report and recovery docs; behavior only if a verified
gap requires a separately planned remediation unit.  
**Estimated scope:** M evidence unit.  
**Rollback:** terminal decision can be `PAUSED`/`REVISE`; do not manufacture
success from an immature window.

### Final checkpoint

- [ ] Ten source families, eight origins, and three acquisition channels are
      met or an owner-approved evidence-based target supersedes them.
- [ ] No provider/origin exceeds the accepted concentration envelope without a
      visible replacement plan.
- [ ] Two ready reserves exist and one replacement drill passed.
- [ ] Public-index, supported-distribution, and permissioned channels are each
      represented by at least one terminal `KEEP` source.
- [ ] Bootloader resume drill passed from a fresh context.
- [ ] Every accepted unit is committed, pushed, CI/deploy verified as required,
      and recorded in the savepoint.

## Risk register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Global feed exceeds Worker memory/time | High | SP-09 feasibility before adapter; allow scheduled preprocessing/streaming or `PAUSED` |
| “Public” is mistaken for unlimited content reuse | High | Mechanism evidence + minimal facts + linkback + content-scope field + opt-out |
| One provider creates false diversity | High | Count provider/origin risk family, not token count |
| Metrics reward repeated inventory | High | SP-01/02 exact source + net-new funnel before automation |
| Registry migration changes current decisions | High | Golden parity matrix, compatibility resolver, one-cycle observation, rollback switch |
| Candidate queue becomes silent backlog | Medium | Deadlines, evidence leases, review-debt reports, dormant terminal state |
| Auto-recovery reopens a compliance block | High | Independent state axes; tests forbid compliance auto-promotion |
| Feed disappearance mass-archives on partial fetch | High | Complete-feed proof required; errors/pagination ambiguity fail closed |
| Partner approval never arrives | Medium | Public supported sources provide supply now; permission candidates become dormant after 30 days |
| AI resumes from stale counts or chat memory | High | Bootloader, top-authority baton, read-only remeasurement, exact SHA/run evidence |
| Bot commits advance `main` mid-unit | Medium | Fetch/restate SHA, short-lived branches, rebase/merge deliberately, atomic commits |

## Open decisions that do not block SP-00

- Which exact employer/site will be each provider’s first canary? Decide only
  after SP-08 evidence packets and current production yield.
- Whether Workable’s global feed fits Worker streaming or should be filtered in
  a scheduled GitHub job. SP-09 owns the evidence-based choice.
- Whether an employer intake needs a public Astro page or only a GitHub issue
  template/email alias. Prefer the smallest privacy-preserving channel.
- Whether Ashby public minimal indexing is ever needed after supported feeds
  expand. Keep the dedicated partner path preferred.
- Absolute job-volume SLOs. Use relative eight-week baselines until SP-02
  produces exact source economics.

## Agent handoff block

At the end of every unit, update this compact state in the top savepoint and
the plan/status ledgers. Do not replicate it into every recovery document:

```text
PROGRAM: Source Perpetuity
UNIT: SP-XX <name>
STATUS: PLANNED | IN PROGRESS | VERIFYING | TERMINAL — KEEP/REVISE/REVERT/BLOCKED/ESCALATE/PAUSED
START SHA: <full sha>
BEHAVIOR SHA: <full sha or none>
DOCS SHA: <full sha or pending>
CI/DEPLOY RUN: <url/id or none>
PRODUCTION WINDOW: <timestamps or not applicable>
MUTATIONS: <exact writes or none; include D1 changed_db/rows_written>
EVIDENCE: <path>
ROLLBACK: <exact source-scoped action>
NEXT: <one dependency-ready unit and first command>
BLOCKERS/STOP CONDITIONS: <none or exact evidence>
```

Use `docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md` to start a fresh session.
