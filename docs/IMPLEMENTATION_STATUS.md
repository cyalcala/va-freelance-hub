# Implementation Status

## Current Source Perpetuity Checkpoint — 2026-08-29 (SP-09, TERMINAL — KEEP)

Status: **SP-09 TERMINAL — KEEP**. Workable global XML feed feasibility: one bounded live probe of `https://www.workable.com/boards/workable.xml` (official, public, no-auth, hourly cadence) measured **44.41 MiB, 11,603 raw `<job>` entries (10,000 distinct by `<url>`, 645 duplicated within the fetch), 2,421 remote, 337 PH**, schema exactly matching Workable's documentation. `scripts/diagnostics/workable-feasibility.ts` formalizes `analyzeFeed`/`classifyRuntime`/`renderReport` (18/0 fixture tests). **Decision: `GITHUB_ACTION_PREPROCESSING`** — both size and item count exceed a single source's share of the shared 10-minute scrape-tick budget; a dedicated hourly GHA job matches the feed's cadence and this repo's existing Prospector/directory-maintenance pattern. Zero D1 writes, no adapter enabled, no runtime change; the raw feed was measured then deleted, never persisted — only `docs/workable-feasibility-latest.md`'s computed measurements are retained.

- **CI/deploy:** PR `33256108988` (head `618dba9`, PR #89) validate 860/0 + build ok; main `33256179738` (head `806b2d7`) validate + deploy success (no schema/runtime delta — diagnostics/docs only). Local gate `860/0/2829` (+18 from SP-08), typecheck 0, guardrails 0, build ok.
- **Process note:** the behavior commit was briefly made directly on `main` by mistake, caught before any push, and moved onto `codex/sp-09-workable-feasibility` before the normal PR/CI/merge flow.
- **Environment note:** the machine's C: drive hit 0 bytes free mid-session (pre-existing, unrelated to this project's own ~5 MB footprint). Owner freed space; work resumed. Future sessions should check `df -h` before large fetches/builds.

Behavior `618dba9` (PR #89, squash) merged to `main` as `806b2d7`. **Next:** SP-11 (Lever), SP-12 (Greenhouse), SP-13 (SmartRecruiters), SP-14 (Teamtailor), SP-15 (Recruitee) are all SP-08-dependency-ready and may proceed in parallel branches (canaries stay sequential — one provider live at a time). SP-10 (Workable adapter) is also dependency-ready but its acceptance needs a real 7-day shadow/canary window that can't be compressed into one session. SP-16/SP-17 remain ready after SP-05.

## Prior Source Perpetuity Checkpoint — 2026-08-29 (SP-08, TERMINAL — KEEP)

Status: **SP-08 TERMINAL — KEEP**. Evidence packets and review-debt alerts: `packages/scraper/evidence-packet.ts` (`buildEvidencePacket`, `deadlineBucket`, `isPreExpiryDue`, `alertForPacket`, `deduplicateAlerts`, `renderEvidenceReport`, `packetHashFor`) builds one durable packet per `source_registry` candidate joined to its `provider_profiles` row — complete evidence (https endpoint + `allowedHosts` match, `authClass=none`, explicit public `visibilityFilter`, cadence envelope, `evidenceUrl`, `reviewDeadline`, a run shadow probe) → `review_ready`; anything short → `candidate` with the exact missing-evidence list. 7/14/30-day + 30-day pre-expiry deadlines produce one deduplicated alert per `sourceId`. External fetched content is stored only as a byte/outcome hash, never executed.

- **Modules:** `scripts/diagnostics/evidence-packets.ts` (`sql`/`meta`/`emit`/`collect`/`packets`/`report` CLI, same shape as `source-economics.ts`) queries `source_registry WHERE operational_state='candidate'` + `provider_profiles`, joins by `provider_id`, and never fabricates a shadow result — SP-07's probe has no persisted result table (`diagnostic.mutations=0` by design), so every real candidate honestly lists `"shadow probe not yet run"` until a probe result is separately supplied.
- **Verification:** `evidence-packet.test.ts` 22/0 (complete→review_ready, incomplete→candidate + exact missing list, deadline buckets, pre-expiry, dedup alerts, idempotent packetHash, external content as hash-only evidence, report generation) + `evidence-packets.test.ts` 11/0 (read-only query assertion, D1-shaped join, incomplete-provider gap listing, overdue dedup, `collectByName` reassembly, orphan-provider defensive handling, empty-registry honesty) = 33/0/133 assertions. Full gate `842 pass / 0 fail / 2783 assertions / 84 files` (+33 from SP-07), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok.
- **Live read-only D1:** `wrangler d1 execute DB --remote --env production` on both queries returned `changed_db=false`/`rows_written=0` and zero rows — production `source_registry` has no `candidate` row yet (Prospector queue hasn't inserted one). `docs/evidence-packets-latest.md` reports this truthfully.
- **CI:** PR `33254178348` (head `075be3b`, pull_request) validate success (guardrails + tests + build + typecheck + freshness-cron-worker); deploy skipped (PR path, expected).

Owner merged PR **[#88](https://github.com/cyalcala/va-freelance-hub/pull/88)** (squash) → `main` at **`a03631b`**. `main`-push exact-SHA CI/deploy run `33254391095`: validate success, `d1 migrations apply` reported **"No migrations to apply!"** (code-only, matching SP-06/SP-07), FTS integrity ✅, Cloudflare Pages deploy ✅. Post-deploy read-only D1 re-check confirms `changed_db=false`/`rows_written=0` and the candidate registry is still (truthfully) empty — production unaffected. **Next:** **SP-09** (Workable global XML feasibility) is the next dependency-ready unit (SP-11..SP-15 also SP-08-dependent and may parallel if contracts frozen; SP-16/SP-17 remain independently ready after SP-05).

## Prior Source Perpetuity Checkpoint — 2026-08-29 (SP-07, TERMINAL — KEEP)

Status: **SP-07 TERMINAL — KEEP**. Source Doctor runtime shadow: `packages/scraper/candidate-shadow.ts` (`runCandidateShadowProbe`, `SHADOW_MAX_BYTES=512 KiB`, `SHADOW_MAX_REQUESTS=2`, `SHADOW_MAX_ITEMS=200`) evaluates any `source_registry` candidate against its `provider_profiles` declared mechanism (ats_api/rss_feed/public_api) without publishing, without D1 writes, without AI. Reports endpoint/https/hostValid (`exactOrSubdomain` vs `allowedHosts`), authClass support (`none` only), visibility filter public/ambiguous, provenance (`discoveryProvenance` + `evidenceUrl`), mechanism/family, cadence min/max/rate, robots verdict/wouldBlock/evidence, fetch status/latency/bytes, schemaHealth (`ok`/`broken`/`empty`/`not_attempted`), and sample funnel (bytes/parsed/plausible/truncated/budget). Stop guards: `!https`/`!hostValid`/`auth≠none`/`ambiguous visibility`/`!public`/`robots wouldBlock`/`payload>512KiB`/`401`/`403`/`429` → `POLICY_BLOCKED`/`DEGRADED_ANOMALOUS`/`RATE_LIMITED` with `fetchAttempted=false`/`parseAttempted=false` and zero alternate endpoint.

- **Modules:** `candidate-shadow.ts` 494 lines (pure, injectable `fetchImpl`/`robotsStore`, `XMLParser`/`JSON` parsers bounded, external bodies as evidence only, never exec). Fix `source-doctor.ts` verbatimModuleSyntax (11 errors → 0): `type Source`, `RobotsCacheEntry`, `isAtsSource` id-only, single `export { DOCTOR_VERSION }`.
- **Verification:** `candidate-shadow.test.ts` 16/0 (reporting 2, zero-write/budget 3, stop 9, provenance 2) + `source-doctor.test.ts` 14/0 (still 9 outcomes, large-CDATA 256 KiB regression) + `prospector.test.ts` 19/0 + `registry.test.ts` 16/0 + `policy-resolver.test.ts` 34/0; full gate `809 pass / 0 fail / 2650 assertions / 80 files`, `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (Vite ~31.9s + 13.7s). Candidates tested: `greenhouse:acme` ATS JSON 2 items, `jobicy` RSS 2 items, 350-job cap at 200, empty→HEALTHY_EMPTY, auth/`oauth` stop, 401 stop, robots disallow stop, oversize (>512 KiB) stop, null/private visibility stop, lookalike `evilgreenhouse.io` vs exact subdomain, 429 rate-limit, script-injection inert.
- **CI/deploy:** PR `33251523995` (head `4306407`, pull_request) validate 809/0 + build ok (deploy skipped); main `33251582842` (head `fb9b6d7`, push) validate 809/0, `Apply D1 migrations` — *No migrations to apply* (code only) ✅, `Verify D1 FTS integrity` ✅, `Deploy to Cloudflare Pages` ✅ (`main`). Exact-six `ROBOTS_ENFORCE_SOURCE_IDS` unchanged at `apps/web/src/pages/api/cron/scrape.ts:52`; no candidate promoted; candidate rows remain `needs_review`/`candidate` (`publishable=false`).

Behavior `fb9b6d7` (PR #87, squash from `4306407`) merged to `main`; next dependency-ready unit is **SP-08** (evidence packets + review-debt alerts, needs SP-06+SP-07) — SP-16/SP-17 also ready after SP-05 and may parallel if contracts frozen.

## Prior Source Perpetuity Checkpoint — 2026-08-29 (SP-06, TERMINAL — KEEP)

Status: **SP-06 TERMINAL — KEEP**. Prospector candidate queue: `apps/web/src/pages/api/cron/prospect.ts` now creates/refreshes one idempotent `source_registry` row per exact-host ATS discovery as `needs_review`/`candidate` (14-day `review_deadline`, provenance JSON, no publish). Helpers in `packages/scraper/prospect-candidate.ts` (`providerConfigForPlatform`, `buildCandidateRow`, `distinctAtsCandidates`, `countBacklog`/`countReviewOverdue`) enforce FK provider ensure (`ats_api`/`none`), `source_opt_outs` guard, duplicate suppression (refresh provenance only), 50-distinct anomaly ceiling and 15/run drain, and backlog/overdue reporting in both JSON and `gha-prospector-pulse.yml` digest.

- **Modules:** `ATS_PROVIDER_CONFIG` 5 ATS families, `CANDIDATE_MAX_PER_RUN=15`/`CANDIDATE_ANOMALY_CEILING=50`, endpoint via `atsEndpointUrl`, provenance `eligible-opportunity-sample`, chunked 6 rows/batch (100-bound).
- **Verification:** `prospect-candidate.test.ts` 12/0 (provider 3, dedupe 3, opt-out/backlog 3, build 3) + `prospector.test.ts` 19/0 + `registry.test.ts` 16/0 + `source-lifecycle.test.ts (db)` 12/0 + `policy-resolver.test.ts` 34/0 + ATS 5/0; full gate `793 pass / 0 fail / 2551 assertions / 79 files`, `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (Vite ~35s + 19s).
- **CI/deploy:** PR `33250226738` (head `4f38381`, pull_request) validate 793/0 + build ok (deploy skipped); main `33250262171` (head `407bfd3`, push) validate 793/0, `Apply D1 migrations` — *No migrations to apply* (code only) ✅, `Verify D1 FTS integrity` ✅, `Deploy to Cloudflare Pages` ✅ (`main`). Exact-six `ROBOTS_ENFORCE_SOURCE_IDS` unchanged at `apps/web/src/pages/api/cron/scrape.ts:52`; no candidate promoted to shadow/canary/active.

Behavior `407bfd3` (PR #86, squash from `4f38381`) merged to `main`; next dependency-ready unit is **SP-07** (Source Doctor runtime candidate shadow) — SP-08 needs SP-06+SP-07; SP-16/SP-17 also ready after SP-05 and may parallel if contracts frozen.

## Prior Source Perpetuity Checkpoint — 2026-08-29 (SP-05, TERMINAL — KEEP)

Status: **SP-05 TERMINAL — KEEP**. Additive lifecycle + durable memory: `source_opt_outs` (PK `source_id`, durable do-not-reingest, survives registry delete) and `source_decisions` (append-only `source_id → to_compliance/to_operational` with actor/reason/evidence_hash, survives delete) plus 3 lease indices on `source_registry` enforce bounded deadlines and opt-out gating without mutating existing rows. Lifecycle module `packages/scraper/source-lifecycle.ts` implements `isValidOperationalTransition`, `validateTransition`, `canEnterShadow/Canary/Active` (opt-out + `allowed|conditional` guard), lease helpers (`isPolicyExpired`, `computeReviewDeadline/PolicyExpiry`, `isRenewalDue`, `applyLeaseExpiry → review_due→paused` dormancy without delete), and `isOptedOut`.

- **Tables:** `source_opt_outs` (`source_id` PK, `provider_id`, `reason`, `requested_by`, `evidence_url`, `created_at` + `provider_idx`), `source_decisions` (`id` PK, `source_id`, `from/to_compliance` CHECK 6, `from/to_operational` CHECK 9, `actor`, `reason`, `decided_at` + two indices). No `source_registry` column change; rollback is ignore tables.
- **Module:** 7 operational topology groups, compliance-hold guard (`needs_review/blocked/awaiting_permission/deprecated` never shadow), opt-out set check before any promotion, lease boundary at exact ISO and 14-day grace, dormant `paused` without deleting history/opportunities.
- **Verification:** `source-lifecycle.test.ts` ~41 state/lease/opt-out tests + `source-lifecycle.test.ts (db)` 12/0 dormancy/history/index tests + `registry.test.ts` 16/0 + `policy-resolver.test.ts` 34/0 + ATS 5/0; full gate `781 pass / 0 fail / 2489 assertions / 78 files`, `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok, rehearsal `94/94` fresh+legacy (migrations 0000-0037).
- **CI/deploy:** PR `33249332214` (head `ef6a0b1`, pull_request) validate 781/0 + build ok (deploy skipped); main `33249370177` (head `63139e3`, push) validate 781/0, `Apply D1 migrations` applied `0037` ✅, `Verify D1 FTS integrity` ✅, `Deploy to Cloudflare Pages` ✅ (`main`). Exact-six `ROBOTS_ENFORCE_SOURCE_IDS` unchanged at `apps/web/src/pages/api/cron/scrape.ts:52`.

Behavior `63139e3` (PR #85, squash from `ef6a0b1`) merged to `main`; prior next was SP-06/SP-07.

## Prior Source Perpetuity Checkpoint — 2026-08-29 (SP-04, TERMINAL — KEEP)

Status: **SP-04 TERMINAL — KEEP**. One typed resolver `packages/scraper/policy-resolver.ts` (plus `loadRegistryPolicies` D1 loader) is backed by the additive `provider_profiles`/`source_registry` rows with nullable fallback to the hard-coded 26-source adapter. When the registry is empty (current production: 0 rows), every `resolvePolicy(id, row?)` equals `fallbackPolicy(id)` byte-for-byte, so static allow/paused, ATS token pauses, exact-six robots enforcement, and unknown/candidate fail-closed are unchanged.

- **Resolver:** `RegistryComplianceState`/`RegistryOperationalState` (ADR-006 vocab), `ROBOTS_ENFORCE_SOURCE_IDS` mirror, `ATS_PLATFORM_POLICIES`/`ATS_TOKEN_POLICIES` byte-identical copies, `fallbackPolicy`/`resolvePolicy` with CHECK (`shadow/canary/active ⇒ allowed|conditional`) and durable `optOut` handling, `isPublishable`/`isShadowCanaryActive` mirrors, `KNOWN_SOURCE_IDS` = 26 (12 static + 14 ATS), `loadRegistryPolicies` returns empty Map on missing/table/empty without throwing. `scrape.ts` now imports `resolvePolicy`/`loadRegistryPolicies`, loads `activeRegistryPolicies` per-tick at `apps/web/src/pages/api/cron/scrape.ts:1809`, and consults it in `fetchConfiguredSourceWithStatus` and `atsPlatformPolicy` before the hard-coded fallback — rollback is to keep Map empty or revert the import.
- **Verification:** focused `policy-resolver.test.ts` 34/0 (golden parity for all 26 ids, adversarial unknowns remain non-publishable, registry overlay authoritative, publishability matrix, robots mirror, reversible fallback) + `registry.test.ts` 16/0 + ATS containment 5/0; full gate `724 pass / 0 fail / 2387 assertions / 76 files`, `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (Vite ~40s), rehearsal still `94/94`.
- **CI/deploy:** PR run `33248125990` (head `c2ec9d9`, pull_request) validate 724/0 + guardrails + build ok (deploy skipped); main run `33248170437` (head `6abe887`, push) validate 724/0, `Apply D1 migrations` — *No migrations to apply* (registry still `0036`, additive) ✅, `Verify D1 FTS integrity` ✅, `Deploy to Cloudflare Pages` ✅ (`25744ab7` / `main`). No `source_registry` rows promoted; exact-six `ROBOTS_ENFORCE_SOURCE_IDS` unchanged at `apps/web/src/pages/api/cron/scrape.ts:52`.

Behavior `6abe887` (PR #84, squash from `c2ec9d9`) merged to `main`; next dependency-ready unit is **SP-05**.

## Source Perpetuity Checkpoint — 2026-08-29 (SP-03, TERMINAL — KEEP)

Status: **SP-03 TERMINAL — KEEP**. Additive, nullable registry foundation with
no runtime behavior change (rollback = ignore tables).

- **Tables:** `provider_profiles` (mechanism, auth_class, endpoint_pattern,
  allowed_hosts, evidence_url/hash/captured_at, visibility/content scope,
  cadence_min/max, rate_guidance, robots_handling, removal_semantics,
  evidence_lease_days, default_compliance/operational states) and
  `source_registry` (durable `source_id` PK = `opportunities.source_id`,
  provider FK, display_name, endpoint_url, company_token,
  discovery_provenance, independent compliance_state + operational_state,
  review_deadline/policy_expiry/owner, last_decision, opt_out, health_rollup).
  CHECKs enforce ADR-006 vocab (6 compliance, 9 operational), `shadow`/`canary`/
  `active ⇒ allowed|conditional`, `opt_out IN (0,1)`, `cadence_max ≥ cadence_min`,
  `lease>0`; PK rejects duplicate `source_id`; FK to provider is enforced.
- **Coverage:** fixture inserts 12 static `sources.ts` ids + 14 ATS token ids
  (`ashby:5`, `greenhouse:5`, `breezy:4`) = 26 distinct `source_id` (jobicy
  2-feed → 1 family); `scripts/diagnostics/source-registry.ts` read-only dump
  (`provider_profiles`, `source_registry`, group counts) + audit maps 26 known vs
  registry rows and flags 26 unmapped on empty registry without activation.
- **Migration:** `0036_registry_foundation.sql` `CREATE TABLE IF NOT EXISTS` +
  indices (`provider_family`, `provider_id`, `compliance_state`,
  `operational_state`); rehearsal `94/94` fresh+legacy pass.
- **Verification:** focused `registry.test.ts` 16/0, full gate `690/0` (was
  `674/0` +16), typecheck 0, guardrails 0, build ok, rehearsal 94/94, critic
  SHIP (no blocking; SP-04 must validate `https://` + `allowed_hosts` before
  fetch).

Behavior `0331fa1` (PR #83) merged to `main`; exact-SHA Sovereign CI Guardrail
run `33247081804` succeeded — validate (690 pass), `0036` applied (Migrations to
be applied: `0036_registry_foundation.sql` ✅), FTS integrity, Pages deployed.
No `apps/web` runtime reads new tables; exact-six `ROBOTS_ENFORCE_SOURCE_IDS`
unchanged; next dependency-ready unit is **SP-04**.

## Source Perpetuity Checkpoint — 2026-08-29 (SP-02, TERMINAL — KEEP)

Status: **SP-02 TERMINAL — KEEP**. Delivered in two parts. **Part 1** — a
read-only source-economics baseline keyed on the exact `source_id` SP-01
persists (pure module `scripts/diagnostics/source-economics.ts` + fixture test +
generated `docs/source-economics-latest.md`): identity coverage (exact-id fill
vs the legacy NULL gap), net-new accepted supply at 7/14/30-day freshness
(global + per exact source_id), provider-family concentration (ADR-006 §7 fold
of the two Jobicy feeds and ATS `platform:token` ids, SLO flags, low-coverage
provisional caveat), and per-source real/unchanged/skip/failure/zero-yield
outcomes. **Part 2** (runtime) — a 304 truthfulness fix: unchanged conditional
fetches carry the prior count forward (`scrape.ts`), so an additive nullable
`source_fetch_events.not_modified` (migration `0035`) + writer + report
separation stop unchanged polls from inflating `real_fetches`/`items`.

Behavior `ed0040a` (PR #82) merged to `main`; exact-SHA Sovereign CI Guardrail
run `33243425545` succeeded — validate (real suite/typecheck/guardrails/build),
migration `0035` applied, FTS integrity verified, Pages deployed (~08:34:27Z).

Post-deploy read-only D1 acceptance (all four queries `changed_db=false`,
`rows_written=0`, reconciliation OK): unchanged 304 polls separated from real
fetches (remotive 489 real + 3 unchanged, we-work-remotely 488+4, remote-ok
82+1, jobicy-supporting-apac 72+1, jobicy-admin-support-apac 69+1); 5,090 rows,
15 with `source_id` (11 active), 1,267 active `NULL` (no backfill); active 1,278,
net-new 7d/14d/30d = 150/430/579.

Acceptance: all three criteria met (skips/unchanged/zero-yield/failures
separated; read-only concentration + legacy-NULL baseline; immutable `source_id`
keying without double-counting). Beyond the criteria (optional, non-blocking):
the exhaustive per-stage downstream funnel (raw→…→inserted attribution) and a
recurring report workflow.

Next exact action at that checkpoint was SP-03; it is now TERMINAL — KEEP (see
current checkpoint above).

## Source Perpetuity Checkpoint — 2026-08-29 (SP-01)

Status: **SP-01 TERMINAL — KEEP**. Every newly ingested opportunity now
persists the exact configured source identity in an additive, nullable
`opportunities.source_id` column, so source economics no longer infer identity
from the display-oriented `source_platform`. Static sources record `source.id`
(e.g. `we-work-remotely`); ATS sources record `platform:token` (e.g.
`workable:acme`), keeping two sources that share one display platform distinct.

Change: schema + migration `0034_opportunity_source_id.sql`; a pure
`attachSourceIdentity` helper (`apps/web/src/lib/conditional-state.ts`) that
stamps each fetch result's id onto its raw items; and four stamp sites in
`apps/web/src/pages/api/cron/scrape.ts` (RSS/HTML/JSON/ATS) so identity rides
the item through normalization, dedup, triage, and all three insert paths.
Legacy rows stay `NULL` — no ambiguous backfill. The exact-six robots literal,
source policy, robots mode, and workflows are unchanged.

Local gate at `ec57ba5`: 661 pass / 0 fail / 1677 assertions, typecheck 0,
guardrails 0, build complete. Merged to `main` as PR #80 → `1a5d188`. Exact-SHA
`main` CI/deploy `33240866482` succeeded: validate (real suite), migration
`0034` applied `07:28:00Z`, FTS integrity verified, Pages deployed `~07:28:12Z`.
Read-only D1 acceptance (both queries `changed_db=false`, `rows_written=0`): the
first post-deploy tick (`07:30:09Z`) stamped 10/10 new rows with exact
`source_id` (`real-work-from-anywhere` ×7, `remote-ok` ×3), 0 missing, while
5,075 legacy rows remained `NULL`. Evidence:
`docs/gauntlet/evidence/SP-01-exact-source-identity.md`.

Follow-ups recorded (out of SP-01 scope): the separate digest ingest path
(`apps/web/src/pages/api/ingest.ts`) and any read-only-first legacy backfill.

SP-02 followed and is IN PROGRESS (first slice KEEP — see the current checkpoint
above).

## Source Perpetuity Checkpoint — 2026-08-29 (SP-00, historical)

Status: **SP-00 TERMINAL — KEEP**. The owner approved a sustainable,
adaptable source-replenishment planning program and a reusable AI bootloader.
No runtime source, ATS policy, robots mode, workflow, secret, deployment, or D1
row changed in SP-00.

The durable planning package is:

- `docs/SOURCE_PERPETUITY_STRATEGY.md` — balanced policy, portfolio design,
  supply SLOs, evidence leases, and renewal loop;
- `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md` — SP-00 through SP-20,
  dependencies, acceptance gates, rollback, and one-unit execution contract;
- `docs/decisions/ADR-006-controlled-source-replenishment.md` — accepted
  planning decision and canonical state vocabulary; and
- `docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md` — repository-first prompt
  that a new AI can paste and reuse.

The prior 24-unit Gauntlet is terminal history. Its G1-G9 rules remain the
shared execution contract, while current exact-six production behavior remains
unchanged. SP-00 merged to `main` as PR #79, commit
`bdc2aa95795b6c348f1d9db2a19cc15c4245d7a7`; exact-SHA Sovereign CI Guardrail
`33236797132` succeeded with the production-deploy job correctly skipped
(docs-only). SP-00 is terminal `KEEP`; SP-01 followed and is also terminal
`KEEP` (see the current checkpoint above).

## Accepted Gauntlet Checkpoint — 2026-08-28 (historical)

Status: **COMP-01B/COMP-01D/COMP-01C/REL-12
TERMINAL — KEEP**. The mature
post-TTL production window proves the Workers fetch-binding fix: 848/1,023
real fetches are `allowed`, the prior Illegal-invocation signature is absent,
and all 11 cache origins have explicit HTTP results. The historical 175
unknowns were isolated to five Ashby identities and resolved conservatively by
COMP-01C containment; exactly those five token policies remain disabled/paused,
with a regression guard and no effect on other ATS policies or stored jobs.
Local verification at that slice passed
646/0 tests with 1,576 assertions, typecheck, guardrails, and build. Exact-SHA
CI/deploy `33138055473` succeeded for behavior `79b17d6`; the first eligible
production cycle recorded five Ashby paused skips, zero Ashby real fetches, and
14 non-Ashby real-fetch controls. Evidence:
`docs/gauntlet/evidence/COMP-01C-ashby-access-review.md` and
`docs/gauntlet/evidence/COMP-01B-observation-window-20260824.md`.

COMP-01D then contained five Greenhouse and four
Breezy token policies are paused pending explicit aggregation terms/permission
or an approved integration. Focused containment guards pass 5/0/56; full verification passes
649/0/1,613 plus typecheck, guardrails, and build. Fresh critic verdict is SHIP.
Exact-SHA CI/deploy `33139365159` succeeded for `a826661`; the first eligible
cycle showed every target paused/skipped, zero target real fetches, and two
unaffected real-fetch controls. Evidence:
`docs/gauntlet/evidence/COMP-01D-residual-ats-access-review.md`.

After those containments, exactly six `allowed` sources remain able to fetch.
Their mature ~58h30m window contains 543/543 allowed real fetches and zero
disallowed, unknown/null, or would-block results. Canary CI/deploy `33141353808`
produced a healthy WWR enforce event at `04:20:09Z`; rollback CI/deploy
`33141565761` produced a healthy WWR observe event at `04:30:09Z`. The separate
full rollout `4f5e8dd` enforces exactly the six reviewed identities, preserves
observe for unknown/future/ATS identities, and accepts only exact-six or empty
configuration. Focused 20/0/73 and full 657/0/1,667 plus typecheck, guardrails,
build pass. Exact-SHA CI/deploy `33142177229` succeeded. Its 60-minute live
window records 18/18 clean enforced real fetches across all six identities,
zero stop events, and zero contained ATS real fetches. Fresh independent critic
reproduced the evidence and returned TERMINAL — KEEP. Evidence:
`docs/gauntlet/evidence/COMP-01B-observation-window-20260824.md`.

## TAX-02 — Owner-directed category expansion — 2026-08-23

Status: **TERMINAL — KEEP**. AI & AUTOMATION and WRITING & CONTENT (incl.
technical writing, content production, knowledge management) are first-class
categories end-to-end: triage vocabulary, validation whitelist + writing-family
alias normalization, shared mapper, UI maps, eval corpus v2, and a counted
reversible backfill (28 ai + 8 writing active rows; CAS-guarded; undo artifact
committed). Live: `/categories/ai` and `/categories/writing` populated;
homepage renders both cards. Freshness question resolved read-only: the Aug 22
dip is weekend seasonality plus intentional SRC-4D Jobicy cadence skips — clock
healthy through 2026-08-23T03:00Z. Behavior commits `011b673` + `0d77acf`;
CI/deploy runs `32615195950`, `32616479700`; fresh critic REVISE(fix-forward)
with all five findings applied. Evidence:
`docs/gauntlet/evidence/TAX-02-ai-writing-categories.md`.

## Gauntlet Planning Checkpoint — 2026-08-22 (historical)

Status: **OPS-04 TERMINAL — KEEP**. Bounded egress diagnostics for the directory `unreachable` cohort are deployed and verified live: two Cloudflare cohorts plus a same-host non-Cloudflare probe localize the cause to a Cloudflare egress-side transport failure (`EGRESS_BLOCKED` against alive origins), not origin death. Strikes/visibility/threshold/budget/gate are byte-for-byte unchanged. DATA-03 remains KEEP (read-only quality baseline); OPS-06 remains KEEP as the last production-behavior baseline before OPS-04.

- Repository planning baseline: `bd84cc1` on synchronized `main`/`origin/main`.
- DATA-05A execution started from synchronized `main`/`origin/main` at
  `451b76e`.
- REL-10 execution started from synchronized `main`/`origin/main` at
  `97b8dbc`.
- Correct ownership statement: `remotephjobs.com` is external;
  `remotejobs-ph.pages.dev` is the project production site. The fix validates
  attribution and does not blacklist or claim ownership of the external host.
- Planning package: `d21cd9e` on `main`; CI run `32552942171` passed all
  validation and correctly skipped production migration/deploy as docs-only.
- Last accepted production behavior: `62acf5a` (OPS-06), verified by CI run
  `32563188313`. DATA-03 adds read-only diagnostics/docs only; no deploy.
- DATA-03 execution started from synchronized `main`/`origin/main` at `539b65b`.
- Current scheduled evidence: watchdog `32563229451`, Hunter `32563299530`, and
  CI `32563188313` completed successfully. Green workflow conclusions do not
  waive payload-level degradation or data-quality findings.
- Last Gauntlet decision: `OPS-04` directory unreachable-spike diagnosis — `KEEP`.
- Current implementation unit: `OPS-04` (terminal).
- OPS-04 execution started from synchronized `main`/`origin/main` at `6146290`.
- OPS-04 behavior commit `83f94d0`; CI/deploy run `32568634636` success (513
  tests, 1,191 assertions, typecheck, build, guardrails, D1 migrations, FTS
  verify, Pages deploy). Two live directory-pulse runs produced reason
  distributions: `32568721809` (5 unreachable, all `EGRESS_BLOCKED`) and
  `32568795476` (0 unreachable). A bounded cross-runtime probe of the same five
  hosts returned 2 bot_wall (403) + 3 ok (200) + 0 dead. Evidence:
  `docs/gauntlet/evidence/OPS-04-unreachable-diagnosis.md`. Next dependency-ready
  unit: `COMP-01A` (durable robots evidence; only prereq `DB-01` accepted).
  `REL-08` and `SRC-4D` are children of COMP-01A and remain BLOCKED until it is
  accepted; `DATA-06` is independently ready off `DATA-03`. The Section-AI queue
  entry that lists COMP-01A as depending on REL-08 is stale/inverted — the
  dependency tree and unit contracts are authoritative (COMP-01A precedes
  REL-08).
- REC-01 execution verification: `bun test` passed 454 tests with 1,209
  assertions and zero failures; `bun run typecheck` and `bun run build` passed
  locally on 2026-08-22; evidence file
  `docs/gauntlet/evidence/REC-01-worktree-inventory.md` created.
- REC-01 inventory summary: 1 main + 6 registered auxiliary worktrees + 4
  orphan-looking directories classified; zero mutations; 4 worktrees classified
  as `unknown` (apex-clock, apex-directory, apex-prospector, apex-verifier)
  requiring owner review before disposition; 6 entries classified as
  `candidate for archive` (apex-ai-revert, apex-gauntlet, apex-sec01,
  major-quality-audit, production-apex-audit-2026-08-09, production-release).
- First queued preflight: `REC-01` completed.
- Accepted production unit `DATA-05A` contains cross-source apply URLs,
  protects legacy clicks, retires job-to-company website inference, and
  repairs only the reviewed incident cohort.
- Fresh read-only D1 pre-migration inventory: 169 cross-source application
  rows and 8 reviewed directory assignments; 0 same-source rows currently
  exist, and the preservation case is regression-tested. Query metadata
  reported `changed_db=false` and 0 rows written.
- Post-deploy read-only D1: exact-host cross-source rows `0`; reviewed
  assignments remaining `0`; all eight reviewed directory rows repaired;
  migration `0031` recorded; query metadata remained read-only.
- Acceptance runs: CI/deploy `32555307405`; enrichment `32555452346` returned
  `websiteSet=0`; Hunter `32556180387` exposed
  `quarantinedApplicationUrls=0`, no anomalous hosts, 42/42 fetch events, and
  no failed sources or insert batches.
- Fresh local acceptance at `d269755`: 457 tests, 0 failures, 1,210 assertions;
  typecheck, build, and guardrails passed.
- REL-09 reproduction: run `32542676422` returned 49 successes and 71 network
  failures from 120 attempts. The first 40-row canary passed; the second,
  `32556609049`, exposed five redirect-driven platform-budget failures and
  correctly failed its workflow gate.
- Accepted correction `137a3ff`: at most one redirect hop and 20 items per run,
  bounding worst-case external fetches to 40 below Cloudflare Free's 50 limit.
- Final rotations `32556799462` and `32556821369` each passed 20/20 with zero
  platform-budget failures. The active backlog is 1,267, never-verified is 0,
  and the estimated full sweep is 32 days at two runs/day.
- Fresh REL-09 G3: 461 tests, 0 failures, 1,026 assertions; typecheck, build,
  and guardrails passed.
- SEC-03 behavior commit `6c48810` replaced the source-trust suffix bypass and
  all five ATS suffix branches with one exact-host-or-dot-subdomain predicate.
  All configured known-good hosts retained parity; concatenated malicious
  suffixes and invalid URLs fail closed without allowlist expansion.
- Fresh SEC-03 G3: 464 tests, 0 failures, 1,053 assertions; typecheck, build,
  and guardrails passed. CI/deploy run `32557360004` succeeded.
- Live Prospector run `32557448855` returned HTTP 200 on `6c48810`: 4
  candidates considered, 0 eligible, 0 added, 3 review-only, 1 rejected for
  quality, 0 ATS proposals, and no mass-add guard trip.
- DB-01 acceptance: rehearsal script `scripts/ci/rehearse-d1-migrations.ts`
  passes fresh and legacy database rehearsals locally (85/85 schema assertions);
  CI/deploy run `32560891840` passed full suite (464 tests, 1,053 assertions,
  typecheck, build, guardrails, D1 migrations applied, FTS verified, Pages
  deployed). Production smoke: `/`, `/directory`, `/opportunities` all return
  HTTP 200.
- Supplemental `bun audit` reported 2 high, 4 moderate, and 4 low existing
  Astro-toolchain advisories; dependency remediation is separate from DB-01.
- REL-10 acceptance: behavior commit `5690d54` adds `phEligibility` to the
  homepage slim projection, types the card projection as `OpportunityCardData`,
  and adds 7 focused contract tests. Local verification: 471 tests, 0 failures,
  1,077 assertions; typecheck, build, and guardrails passed. CI/deploy run
  `32561624073` passed full suite (471 tests, 1,077 assertions, typecheck,
  build, guardrails, Pages deployed). Production smoke: `/`, `/directory`,
  `/opportunities` all return HTTP 200.
- OPS-06 acceptance: behavior commit `62acf5a` replaces the Hunter workflow's
  rapid 10×2s retry loop with a single scrape invocation and truthful terminal
  states, and adds `apps/web/tests/hunter-recovery.test.ts` (10 focused cases
  for success, lock-held, backlog, malformed, and non-2xx responses). Local
  verification: 481 tests, 0 failures, 1,113 assertions; typecheck, build, and
  guardrails passed; focused `hunter-recovery.test.ts` 10/10. CI run
  `32563188313` passed the full suite. Controlled manual Hunter dispatch
  `32563299530` completed a single scrape invocation with terminal state
  `needs-rerun` (zero new jobs after dedup), lock state `free`, backlog `0`,
  zero failed sources, zero insert errors; artifact `hunter-health-32563299530`
  uploaded. Docs-only change, so production Pages deploy was correctly skipped.
- DATA-03 acceptance: generator `scripts/diagnostics/data-quality-cohorts.ts`
  (single-source read-only cohort SQL) with a 14-case `bun:sqlite` fixture test,
  a manual-dispatch read-only workflow `gha-data-quality-cohorts.yml`, and
  evidence report `docs/gauntlet/evidence/DATA-03-quality-baseline.md`. Code
  commits `1cca4b3` + `feb5f0b` (the second runs cohorts per-`--command` after a
  dispatched run proved multi-statement `--file` returns only a summary). Local
  G3: 495 tests, 0 failures, 1,155 assertions; typecheck, build, guardrails
  passed; focused cohort test 14/14. D1 read run `32565032655` (head `feb5f0b`)
  succeeded read-only (`rows_written: 0`, `changed_db: false`). Baseline at asOf
  `2026-08-22T00:00:00Z`: 4,828 total / 1,283 active / 3,545 inactive; active
  stale-30d `623`, unseen-14d `399`, never-verified `16`, missing-company `48`,
  undated `0`; all 10 reconciliation deltas `0`; active `1,283` matches the E-03
  public opportunities count. Stratified: 45/48 missing-company rows are Jobicy;
  staleness/`unclear` concentrate in ATS engineering feeds; 49 duplicate groups
  / 74 excess rows dominated by same-company Remote.com APAC reposts. Query
  plans show the active-row cohorts use `active_ph_eligibility_idx` with only a
  sub-millisecond per-source temp B-tree. No mutation authorized.
- Next implementation unit: `OPS-04` directory unreachable-spike diagnosis
  (read-only; `SRC-4D` Jobicy cadence may parallel); `DATA-06` taxonomy/eval
  convergence is now unblocked by the DATA-03 baseline. Source expansion remains
  frozen.
- Planning source: [Master Execution Plan](./MASTER_EXECUTION_PLAN.md).
- Work orders: [Portable Implementation Units](./gauntlet/IMPLEMENTATION_UNITS.md).
- Reference study: [Agent-Reach Study](./research/agent-reach-study-2026-08-22.md).

The next accepted status update must name the OPS-04 directory-diagnosis
results, terminal decision, commit, push, workflow evidence, and bounded
cross-runtime comparison.

## Accepted Implementation History — historical below this checkpoint

The dated checkpoints below remain valid evidence for their time. Any embedded
"latest," "current," or "next task" wording is superseded as routing guidance
by the 2026-08-22 planning checkpoint and portable-unit ledger above.

## Latest Checkpoint — 2026-08-21 agency logos restored

Commit `07f582b` is deployed by successful run `32475868471`. Agency cards once
again show real company favicons when available, through a validated and
cacheable same-origin endpoint; unavailable favicons get a clean SVG initial
instead of a broken image. Local acceptance: 454 tests, 0 failures, 1,209
assertions; typecheck, guardrails, and build passed. Live desktop/mobile checks
rendered 21 viewport-loaded logos with zero broken images, zero horizontal
overflow, and zero console errors/warnings.

## Previous Checkpoint — 2026-08-21 organized Agencies directory restored

Full report: `docs/directory-organization-restoration-2026-08-21.md`.

Commit `df76adf` is deployed. It restores the six category lanes removed by the
August pagination hardening, adds Dayshift and Marketplace focused views, groups
the paginated results, and preserves category state through search/pagination.
Production run `32474522646` passed. Live proof: six group headings and 48 cards
on page one; Dayshift returns 14/14 badged entries; zero horizontal overflow and
zero console errors. Filipino-hiring is verified by the standing visibility
filter; Filipino ownership remains an explicit data-model gap and is not guessed.

## Latest Checkpoint — 2026-08-21 10-minute freshness hardening and mobile navigation

Full report: `docs/karpathy-freshness-mobile-gauntlet-2026-08-21.md`.

Shipped `123aed2`, `a631c2f`, and `a44972e` to `main`. The production clock is now `*/10`,
AI-deferred ATS candidates are durable `pending-triage` rows, the Worker treats
all deferred/write/source failure signals as degradation, and Gemini/Groq/
Cloudflare failure history reaches the durable diagnostic row. Agencies no
longer renders desktop and bottom navigation together at 640–767 px. Local
acceptance: 446 core tests plus the focused follow-up passed; final CI reports
447 tests, 0 failures, and 1,169 assertions. Typecheck, guardrails, build, and
Worker dry-run all pass.
GitHub runs `32471235256` (Worker), `32471235312` (CI/Pages), and `32472691564`
(console-clean directory follow-up) succeeded. The first post-deploy D1 cycle
completed cleanly at `2026-08-21T10:20:39.440Z`; deployed browser verification
reported no horizontal overflow and zero console errors.

## Latest Checkpoint — 2026-08-20 Free-first AI triage cascade (Gemini→Groq→Cloudflare)

Full writeup: `docs/ai-fallback-cascade-2026-08-20.md`. Handoff:
`docs/HANDOFF.md` (top).

The neuron ceiling that froze the board is now bypassed for free by a multi-provider
triage cascade in `packages/scraper/triage.ts`:

- **bulk triage:** Gemini Flash-Lite → Groq 70B → Cloudflare ladder (reserve)
- **critical vote (skeptic):** Gemini 2.5 Flash → Groq 70B → Cloudflare 70B

`triageJob` + `skepticEligibilityCheck` refactored into provider closures + an ordered
cascade; `AI_PRIMARY=cloudflare` inverts to the old CF-first order. Every provider call
is charged against the shared per-invocation subrequest budget (50-cap holds); all paths
fail closed → `aiUnavailable` (defer). Groq (`groqGenerateContent`, OpenAI-compatible)
absorbs Gemini's rate-limit/quota overflow before the neuron reserve is touched. Fan-out
concurrency 3→2 to smooth bursts vs free RPM limits. New config: `GROQ_API_KEY`,
`GROQ_MODEL`, `GEMINI_CRITICAL_MODEL`, `AI_PRIMARY` (env.d.ts). Chosen over OpenRouter
(50/day free, too small) and NVIDIA NIM (production-prohibited on its free tier).

Verified: 439 tests pass (10 new cascade tests), typecheck 0, guardrails 0, build clean.
**Both `GEMINI_API_KEY` and `GROQ_API_KEY` are set AND bound** (each followed by the
redeploy Pages requires to bind a secret — `dfec65f`, `cb88665`). Live production
evidence: board advanced from frozen-at-Aug-18 past `2026-08-20T14:00Z`
(`geminiConfigured:true`) while Cloudflare neurons were still exhausted. No owner action
required; 7 static `pending-triage` leftovers remain (optional `DRAIN_PENDING_TRIAGE=1`
to clear).

## Latest Checkpoint — 2026-08-20 Board-freeze incident (Inngest divert + neuron ceiling)

Full report: `docs/incident-2026-08-20-inngest-divert-freeze.md`. Handoff:
`docs/HANDOFF.md` (top).

The public board froze at jobs scraped 2026-08-18 14:00Z (~30h, green heartbeat).
Root cause: `INNGEST_SIGNING_KEY` was still set on the Pages project while the
Inngest `triage-drain` cron was dead, so `triageViaInngest = Boolean(key)` parked
every new job as hidden `pending-triage` and never published it. Compounded by the
chronic Workers-AI 10k-neuron/day ceiling — the only AI consumers are scrape's
new-item triage + the unclear sweep, and the sweep (~200 neurons/row) at 50/day
drained the whole budget alone.

Fixes (all on `main`, deployed, tested — 426/0 pass, typecheck 0, guardrails 0, build 0):
- **`4c7c934` (P1)** — `shouldTriageViaInngest` now requires BOTH `INNGEST_SIGNING_KEY`
  and `TRIAGE_VIA_INNGEST="1"`; default is inline triage, so a stray key can't
  silently re-freeze the board. Regression test.
- **`3d6cd74`/`1d825f7`/`3c6a3cb`** — `drainPendingTriageInline` recovers orphaned
  pending-triage rows (cheap ladder, budget-bounded); OPT-IN OFF via
  `DRAIN_PENDING_TRIAGE=1` (free-tier neurons too scarce). 8 tests.
- **`a349bb6`** — `DAILY_SWEEP_CAP` 50→15 to reserve neurons for fresh jobs; watchdog
  now alerts on board-freshness stall (>36h) not just heartbeat. 5 tests.

Finding: Inngest CANNOT reduce the neuron cost (same AI binding + account quota) —
it only solves per-invocation subrequest isolation. Recovery is gated by the
00:00Z neuron reset; the divert fix is verified holding (0 new parked jobs since
deploy). Owner levers: Workers Paid (raise cap, then enable the drain) or accept
the daily-batch cadence. `INNGEST_SIGNING_KEY` is now inert and safe to delete.

## Latest Checkpoint — 2026-08-18 Apex Debugging & Hardening Audit

Full report: `docs/apex-audit-2026-08-18.md`. Handoff: `docs/HANDOFF.md` (top).

Adversarial audit of the live production system. The codebase is already heavily
hardened, so the audit concentrated on the newest code (Directory Growth Engine)
and the Workers-Free 50-subrequest cap. Two real bugs found, proven, fixed,
tested, committed to `main`:

- **U1 (P1, `d6114b2`)** — directory-enrich starvation: `ORDER BY id ASC LIMIT`
  re-selected the same un-enrichable low-id rows every run (silent zero-progress
  success). Fixed to `ORDER BY RANDOM()` + ATS-scoped hiring-page clause + budget
  clamp, extracted as `buildEnrichmentTargetSql` with `bun:sqlite` regression tests.
- **F2 (P2, `6e07bcf`)** — directory-audit ran 60 link-check fetches per
  invocation against the 50-subrequest cap (same class as the Aug-7 freeze);
  overflow was caught as `unreachable` (no strike, bounded) but silently reported
  as checked. Lowered `DEFAULT_BUDGET` to 40 + regression test + workflow comment.

Verification: `bun run test` 408/0 (was 407); `typecheck` 0; `build` 0;
`audit:guardrails` 0. Deferred P3/monitor items are listed in the report.

## Latest Checkpoint — 2026-08-16 Directory Growth Engine Hardening

Full plan: `docs/masterplan-2026-08-16-directory-engine-hardening.md`.
Handoff: `docs/HANDOFF.md` (top checkpoint).

The prior session shipped the Directory Growth Engine (`41c0336`) — an
enrichment cron, a curated seed import, and `gha-enrichment-pulse.yml`
(2x/day). It built clean but had never been code-reviewed or tested. This
session ran a code-reviewer agent against it and found 6 P1 issues (no P0).
All are fixed, tested, and pushed to `origin/codex/apex-flash-continuation`.

### Fixes shipped (commits `a17d00b` → `4372c9b`)

- **P1-1** (`a17d00b`): silent `hiringPageUrl` overwrite — deleted the redundant
  ATS block in the `needsWebsite` branch.
- **P1-2** (`a17d00b`): poison-row wedge hazard — per-target try/catch;
  `result.errors` surfaced.
- **P1-6** (`a17d00b`): LinkedIn/Indeed/Glassdoor/ZipRecruiter/SmartRecruiters
  added to the `knownAtsHosts` blocklist.
- **P1-3** (`0926afd`): seed insert failures now surfaced as `failed`,
  `failedNames`, `insertErrors` in the response.
- **P1-5** (`0dca892`): curated names canonicalized — "Shepherd" and "Foundever"
  (former names already in notes).
- **P1-4** (`8a44a74`): new `apps/web/tests/directory-enrich.test.ts` (15 tests)
  covering ATS URL builders, domain extraction, and `enrichDirectory` against a
  mock db, including the P1-1 and P1-2 regression cases.
- **P2-1** (`4372c9b`): `__enrich_diag__` durable heartbeat — run-diagnostics.ts
  builders + Sentinel pulse query/alert step (36h stale threshold).
- **P2-6** (`4372c9b`): dropped `niche: entry.niche as any`.
- **P2-7** (`4372c9b`): `updates` typed as `Partial<typeof vaDirectory.$inferInsert>`.

### Verification

| Check | Result |
| --- | --- |
| `bun run test` | 399 pass, 0 fail, 1047 expectations, 48 files (was 379/976/47) |
| `bun run typecheck` | exit 0 |
| `bun run build` | exit 0 |
| `bun run audit:guardrails` | exit 0 |

### Next steps

- Merge `codex/apex-flash-continuation` to `main` via the migration-first
  release path (no D1 migration required — `__enrich_diag__` reuses
  `source_fetch_state`).
- After deploy, watch the first Sentinel run for "Enrichment healthy".
- Owner actions unchanged: confirm Inngest drain; rotate leaked secrets.

## Previous Checkpoint — 2026-08-15/16 (AI-subrequest freeze fixed + Inngest durable triage)

Full session summary: `docs/checkpoint-2026-08-16-documentation-backup.md`.
Incident detail: `docs/incident-2026-08-15-ai-subrequest-freeze.md`.
Inngest architecture + activation: `docs/inngest-durable-triage-2026-08-15.md`.

**The board was frozen at jobs posted 2026-08-07 for ~8 days while the heartbeat
stayed green.** Root cause: the scrape route runs the whole pipeline inside ONE
Cloudflare Pages Function request, and the Workers Free plan caps subrequests at
**50 per invocation** (D1 + every `env.AI.run` count). Busy ticks blew past 50,
triage failed closed (`Too many subrequests` / `triageAiUnavailable=50`), and
nothing inserted. Confirmed from live production D1 via the Sentinel workflow.

Three-layer fix, all merged to `main` (`5986311`, `77101b5`):

1. **`21cbbeb`** — emergency `AI_SUBREQUEST_BUDGET_PER_RUN = 15` budget
   tourniquet (defers overflow to the next tick; `triageBudgetDeferred` signal).
2. **`c897560`** — **Inngest durable triage**: moves triage out of the scrape
   invocation and fans it out one-listing-per-step (own invocation/budget) under
   `concurrency:5` + `throttle:30/min` (respects the 10k-neuron/day quota).
   The signing key IS the feature flag; `decideTriage()` is the shared verdict.
3. **`1d60282`** — `FinalizationRegistry`/`WeakRef` polyfill so `/api/inngest`
   stops 500ing on Workers (Inngest v4 OTel span processor needs the global,
   absent on the Workers runtime).

Also in `b6877e2`: completed Apex gauntlet units REL-04, REL-06, OPS-02, REL-07,
DATA-02, DEP-01, and the AI-02 safe-slice metrics (`skepticUnavailable`).

Verification: **379 tests pass, 0 fail, 976 expectations**; typecheck clean;
build clean (ran 2026-08-16).

Status: merged to `main` and **Inngest ACTIVATED in production** (2026-08-16).
Valid `INNGEST_SIGNING_KEY` set on Pages, app registered with Inngest cloud,
`triage-drain` cron live every 10 min. Baseline @ 22:02Z: `pending_triage: 155`,
`active: 1362`, freshest active `Aug 14`. **Pending acceptance: confirm the
155-row backlog drains** (pending drops, active climbs, freshest date advances
past `Aug 14`). Owner steps are in the session summary.

## Previous Checkpoint — 2026-08-11 (alerting regression + Sovereign Crawler 4A/4B)

Audit: `docs/major-audit-2026-08-11.md`. Branch
`codex/audit-worktree-bootstrap`, pushed, not yet merged or deployed.

**P0 found and fixed — ingestion alerting had been silently dead for 11 days.**
Commit `b3347f3` (finding P-5, 2026-07-31) removed the Hunter GHA schedule so
the Cloudflare cron Worker became the sole clock. That also orphaned Hunter's
`alerts` job, the only consumer of per-run degradation signals (insert
failures, triage failures, fetch-event logging failures, cadence-guard state).
Those were being reported into an HTTP response nobody reads — regressing the
whole 2026-07-04 silent-error audit. Ingestion itself stayed healthy, which is
why nothing surfaced it.

Fixed by parking run diagnostics on a reserved `__ingest_diag__` row in
`source_fetch_state` (same pattern as `__sweep_diag__`, no schema change) and
alerting from the daily Sentinel pulse. The row also carries an ingestion
**heartbeat**, so a stopped clock is now detectable — it was not, in any form,
before.

**Also fixed:**
- `docs/source-health-latest.md` had frozen on 2026-07-31; rebuilt as a D1-derived
  daily rollup on the Sentinel pulse.
- Masterplan **Phase 4A**: runtime robots.txt engine (RFC 9309 subset + Content
  Signals + D1 cache, migration 0030), shipped in **observe mode** with a
  documented flip checklist.
- Masterplan **Phase 4B**: one declared crawler identity replacing five drifted
  User-Agent strings and four ATS endpoints that sent none.
- Stale worktree holding `main` removed; MessageChannel polyfill removal committed.

Verification: 327 tests pass (was 234), typecheck clean, build clean, migration
0030 idempotent locally.

OWNER ACTION unchanged: rotate the leaked `tr_dev_` / Turso / ISR secrets at
their providers.

## Previous Checkpoint — 2026-08-10 (verified)

The five-track production hardening audit (Codex/Nemotron, branch
`codex/production-apex-audit-2026-08-09`) was merged to `main` via PR #55
(commit `2497620`). All 16 ranked findings are implemented and live.

Post-merge verification (2026-08-10 Claude Opus):
- 234 tests passing, 0 failures, 448 expectations.
- TypeScript strict-mode typecheck clean.
- Astro production build clean.
- All 29 D1 migrations deployed (including 0028, 0029).
- Security headers verified live on production (CSP, HSTS, X-Frame-Options).
- Job detail pages + JSON-LD + sitemap live and correct.
- Unnecessary MessageChannel polyfill removed (6 Nemotron commits reverted;
  Workers runtime has native MessageChannel since compatibility date 2023-03-01).

ADR-005 records why the Cloudflare Pages adapter stays pinned rather than
upgrading to a Pages-incompatible Workers-only adapter.

## Start Here

When starting a new chat or work session, read these in order:

1. `AGENTS.md`
2. `docs/MASTER_EXECUTION_PLAN.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/AI_RECOVERY_TRAIL.md`
5. `docs/SYSTEM_SAVEPOINT.md`
6. `docs/gemini-masterplan-handoff-2026-06-13.md`
7. `docs/goldilocks-source-expansion-handoff-2026-06-12.md`
8. `docs/major-audit-2026-06-11.md`
9. `docs/major-audit-2026-06-10.md`
10. `docs/major-audit-2026-06-06.md`

### Previous Focus

Post-audit health repairs complete. The system is healthy after the 2026-06-11
major audit fixed Hunter D1 insert batching, reduced category page payloads, and
removed tracked local Wrangler state. The 2026-06-12 follow-up also restored
local direct D1 audit capability and upgraded active Wrangler tooling for the
current Cloudflare Pages config. The latest ATS follow-up pauses unreviewed or
noisy ATS platforms by default, requires token-specific review for Breezy, and
refreshed the source-health rollup.

The latest user-requested stop-point is
`docs/gemini-masterplan-handoff-2026-06-13.md`. It records the verified
post-Gemini/post-Codex-QA baseline at `e719a2c`, confirms CI now runs unit
tests, and gives Gemini an ordered masterplan for source-health history, Breezy
review, data-quality refresh, query/index audit, bounded source expansion, and
portfolio polish.

The previous source-specific stop-point is
`docs/remote-ok-json-source-handoff-2026-06-13.md`. It records the accepted
Remote OK JSON ingestion slice, direct-link compliance posture, physical-role
quality filter, cleanup migration, workflow evidence, and production D1
snapshot.

## Overall Completion

Current accepted completion: 100% of Lens 2.

## Phase Status (Lens 2)

| Phase | Weight | Current accepted % | Status | Next acceptance evidence |
| --- | ---: | ---: | --- | --- |
| L1 Category Alignment & AI Triage | 35% | 35% | Accepted | Complete |
| L2 Staggered Workable Polling | 35% | 35% | Accepted | Complete |
| L3 CI/CD Auto-Deployments | 30% | 30% | Accepted | Complete |

## Latest Accepted Checkpoint

### Post-Handoff F-32 - Major Quality Guardrails (Production Accepted)

- Date: 2026-08-09
- Branch: `main`
- Production merge commit: `5bc6d09` (`Merge branch 'codex/major-quality-audit-2026-08-09'`)
- Status: production accepted. The isolated implementation was merged after a
  second clean merged-tree verification, then released through the
  migration-first CI path.
- Delivered:
  - root `test`, `typecheck`, and `verify` commands target project-owned test
    paths and turn strict compilation into a reproducible local/CI gate;
  - migration `0027_fts5_trigger_scope.sql` rebuilds the external-content FTS5
    index over all opportunity rows and narrows FTS updates to indexed text;
  - `packages/db/fts5-search.test.ts` proves original index drift is detected,
    repaired integrity passes, historic inactive rows are indexed, and indexed
    text updates remain searchable;
  - normal release flow is validate -> D1 migration -> remote FTS integrity
    check -> Pages deploy under a shared D1 lock; standalone migration is
    manual recovery only;
  - prune and verifier pulses fail malformed/non-2xx responses and report real
    workflow plus HTTP status rather than unconditional success;
  - ADR-004 and `docs/major-code-audit-2026-08-09.md` record the rationale,
    ranked findings, residual risks, and follow-up order.
- Local verification:
  - `bun run verify` passed in 55.8 seconds on the merged `main` tree: 190 tests, 0 failures, 354
    assertions; strict TypeScript; Astro production build.
  - PyYAML parsed all four modified workflows; `git diff --check` passed.
- Production evidence:
  - GitHub Actions run `31317525008` passed on `5bc6d09`.
  - Validation job passed unit tests, production build, and strict typecheck.
  - Release job applied D1 migrations, passed the remote FTS5 integrity check,
    and deployed Cloudflare Pages in that order.
  - Public smoke checks returned 200 for `/`, `/opportunities`,
    `/opportunities?q=assistant`, and `/directory`.

### Post-Handoff F-31 - SEO Growth Engine (Detail Pages + FTS5 + Sitemap)

- Date: 2026-08-02
- Status: implemented, 189/189 tests, build passed. Transitions the project from infrastructure to growth — adds the first user-facing pages beyond the board, structured data for Google for Jobs, and replaces LIKE search with BM25-ranked FTS5.
- Implemented:
  - ADR-003 compliance decision (`docs/decisions/ADR-003-job-detail-page-compliance.md`): source-aware excerpt policy (not flat 1500 chars), mandatory outbound attribution via `source_url`, per-source terms review confirming all 6 enabled sources allow redistribution with attribution. Display-time policy: <300 chars = full text, >=300 chars = 500-char excerpt + "Read full listing on [source]" link. `needs_review` sources get metadata-only pages.
  - Job detail pages (`apps/web/src/pages/jobs/[id].astro`): SSR route scoped to `is_active = 1 AND ph_eligibility IN ('eligible_verified', 'eligible_likely')`. Shows title, company, badges, meta grid (posted date, location, pay, timezone, tags), source-aware description excerpt, and "Apply on [platform]" CTA with follow link. Non-eligible IDs return 404.
  - JobPosting JSON-LD: structured data in `<head>` for Google for Jobs indexing — title, description, datePosted, hiringOrganization, jobLocationType (TELECOMMUTE), employmentType mapping, applicantLocationRequirements (Philippines for eligible_verified). Layout updated with `<slot name="head" />` for page-specific head content.
  - Opportunity card internal linking: cards for eligible jobs now link to `/jobs/[id]` (internal, with ChevronRight icon) instead of external source. Non-eligible cards retain external link behavior.
  - Dynamic XML sitemap (`apps/web/src/pages/sitemap.xml.ts`): lists static pages + all eligible job detail pages with lastmod dates. Cached 1 hour.
  - `public/robots.txt`: allows all crawlers, points to sitemap.
  - FTS5 full-text search: migration `0026_fts5_search.sql` creates external-content FTS5 virtual table on title/company/tags with sync triggers (INSERT/UPDATE/DELETE). Opportunities page search swapped from `LIKE '%term%'` scan to `MATCH` with BM25 ranking. FTS5 query input sanitized (double-quote wrapping prevents operator injection). Non-search browsing unchanged.
- Deferred from F-30 resolved: "D1 FTS5 full-text search (next headline feature)" — now implemented.
- Verification: `bun test` 189/189; `astro build` passed; no regressions.
- OWNER ACTION: run migration `0026_fts5_search.sql` against production D1 to activate FTS5 search.

### Post-Handoff F-30 - Freshness Masterplan (Conditional Fetch + Cron Worker + Run-Lock)

- Date: 2026-07 (later)
- Status: implemented, 120/120 tests, build passed. Selective adoption of a DeepSeek freshness masterplan — full disposition (adopt/adapt/reject/defer) in `docs/freshness-masterplan-2026-07.md`.
- Rejected (with reasons): Cloudflare Queues (requires PAID Workers plan — violates $0); 5-min sitemap polling (violates source cadence terms); Zod-everywhere + admin recovery UI (marginal value, new attack surface); much of it already existed (Sentinel=dead-letter, source_fetch_events=audit log, stateless Prospector).
- Implemented:
  - Conditional requests: `packages/scraper/conditional.ts` (If-None-Match/If-Modified-Since + body-hash diff, 7 tests); RSS/JSON/HTML fetchers return SourceFetchOutput and skip parse+triage on unchanged feeds; migration `0020_conditional_fetch_state.sql` adds etag/last_modified/last_body_hash; scrape response reports `sourcesUnchanged`. Compute + third-party-load reduction (compliance-positive).
  - Freshness fix — the real bottleneck was GitHub free-cron lag (1.5–3h). Added `workers/freshness-cron/` (free-plan Cloudflare Cron Trigger Worker, every 15 min, pings the scrape endpoint) + `gha-deploy-cron-worker.yml`. One manual step: `wrangler secret put PROXY_SECRET` (worker README). GitHub Hunter stays as fallback.
  - Run-level lock (`acquireRunLock`, TTL 8 min, atomic conditional UPDATE) — dedupes overlapping Worker+Hunter triggers and closes the audit's cadence TOCTOU.
- Deferred (scoped): ~~D1 FTS5 full-text search~~ (delivered in F-31); ATS conditional fetch; source_fetch_events retention.
- Verification: `bun test` 120/120 (7 new conditional tests); build passed; YAML valid. Post-deploy acceptance in the masterplan doc.

### Post-Handoff F-29 - Autonomous Prospector (Company Auto-Discovery)

- Date: 2026-07-14
- Status: Phase 1-2 implemented, 113/113 tests, build passed. Strategy doc updated to IMPLEMENTED. Report: `docs/company-hunter-strategy.md`.
- Delivers the Hunter upgrade the owner asked for: automatically discover and add new Filipino-hiring companies from already-ingested eligible jobs, removing the manual spreadsheet-import loop.
- Design (surgical, no new table/state):
  - `packages/scraper/prospector.ts` (+16 tests): two quality gates grounded in a live production probe — name-quality (blocklist "Unknown"/"Digital"/spam) + source-trust (auto-add only from curated feeds; RemoteOK-sourced → review-only, since that feed carries recruiter-repost spam). Plus ATS-token extraction from job URLs, niche inference, `classifyCandidates`.
  - `apps/web/src/pages/api/cron/prospect.ts`: cron route (auth + rate-limit like prune/verify-links). Mines active jobs for companies missing from va_directory (correlated NOT IN subquery — no param-limit risk), classifies, idempotently auto-adds trusted quality candidates via chunked Drizzle inserts. Mass-add guard (>15/run → add nothing, alert). Fail-closed ATS: discovered tokens are stored but stay PAUSED until promoted in code.
  - `.github/workflows/gha-prospector-pulse.yml`: 4x/day (fed by the 48x/day Hunter ingestion), non-2xx fail guard, backs up `docs/prospector-latest.md` digest to git, files human-gated per-token `ats-proposal` issues, mass-add anomaly issue.
- Compliance: only companies from already-eligible ingested jobs; enabling ATS scraping stays human/PR-gated per the standing rule; additive/idempotent/reversible.
- Verification: `bun test` 113/113 (16 new); build passed; YAML valid.
- LIVE PROVEN (3 manual dispatches against production): run 1 correctly guarded on a 68-company backlog (led to the cap-and-drain refinement, commit 620d513); run 2 drained 4 (surfaced a batch-insert param overflow → per-row-fallback + safer batch size, commit 396ea9f); run 3 drained the full 15 real companies (LawnStarter, Airalo, Proxify AB, Lemon.io, LiveKit, CloudLinux, Sourcegraph, SafetyWing, Metabase, Fingerprint, ...). Production va_directory 309 → 328 (19 auto-added), garbage (3) rejected and RemoteOK spam (59) held for review every run. Runs 4x/day on schedule; backlog (~48) drains over the next few runs, then steady trickle. Stale run-1 guard issue #50 closed.

### Post-Handoff F-28 - Homepage Category Bug Fix + Company-Hunter Strategy

- Date: 2026-07-14
- Status: homepage fix implemented + build; strategy doc written for the next AI. Report of the fix below; strategy in `docs/company-hunter-strategy.md`.
- Bug fixed ("customer-service island is lost"): the homepage "Fresh opportunities by category" section fetched a flat latest-60-overall pool and grouped it client-side, so when ingestion skewed tech-heavy (recent Ashby/Greenhouse additions) whole categories with 100+ active jobs (customer-service 177, design 98) vanished because none appeared in the newest 60. Confirmed live via the browser (homepage showed only admin/marketing/tech/finance/other = 60; customer-service + design absent; /categories/customer-service itself worked with 177 jobs).
- Root-cause fix: `apps/web/src/pages/index.astro` now sources the preview PER CATEGORY (window function `ROW_NUMBER() OVER (PARTITION BY category ...)` for the freshest N per category, then a typed fetch), guaranteeing every category with jobs gets a card; and passes true per-category active totals so `OpportunitySearch`/`JobCategoryCard` show accurate "N JOBS"/"See all N" (gated to non-search state).
- Strategy delivered: `docs/company-hunter-strategy.md` — autonomous "Prospector" to discover + auto-add new Filipino-hiring companies from already-ingested eligible jobs, keeping scraping-enable human/PR-gated. Phased rollout, cadence, schema, guardrails specified. Not yet built (recommended next major workstream).
- Verification: build passed; live browser confirmation of the fix pending the deploy after push.

### Post-Handoff F-27 - RemoteWork3.8 Import & Ashby ATS Expansion

- Date: 2026-07-12
- Status: implemented, 97/97 tests, build passed; directory delivered as migration 0019 (CI applies via deploy-migrations). Report: `docs/remotework38-import-2026-07-12.md`.
- Scope:
  - Cross-referenced the 40-row RemoteWork3.8 sheet vs the live 297-company directory; ~25 already present, 1 skipped (Remote Philippines Jobs, Status=Caution), 14 genuinely new.
  - NEW ATS PLATFORM: added an Ashby adapter (`fetchAshby` in ats.ts, `ashby` in the platform enum/type, fail-closed platform policy + 5 enabled `needs_review` token policies). Ashby's public posting API was probed live: supabase(51), ashby(64), camunda(36), amplify(35), tremendous(20).
  - Also wired 2 verified Greenhouse tokens (grafanalabs, nearform:34).
  - Directory import via idempotent migration `0019_remotework38_directory.sql` (WHERE NOT EXISTS guard; 7 rows carry ATS tokens, 7 directory-only BPO/enterprise).
- Verification: `bun test` 97/97 (6 new Ashby tests); build passed; local D1 applied 14 rows then re-applied 0 (idempotency proven); all ATS tokens probed live before wiring.
- Note: local Wrangler OAuth was expired (error 7403) so delivery is migration-based (CI applies with the repo Cloudflare token) — no local D1 auth needed.

### Post-Handoff F-26 - Comprehensive Audit Part 3: Perf/Frontend/Workflows/Data/Quality

- Date: 2026-07-11
- Status: implemented, 91/91 tests, build passed; report extended in `docs/comprehensive-audit-report-2026-07.md`. The final 5 dimensions were audited by direct static analysis + live EXPLAIN plans (agent fleet was capacity-blocked).
- Confirmed + fixed:
  - C-1 (MEDIUM): `schema.ts` did not declare `active_effective_posted_idx` (migration 0018), so a future `drizzle-kit generate` could emit a migration dropping it and regress the board-sort perf fix. Declared it as an expression index in schema.ts (build-verified).
  - C-2 (LOW): Hunter + Verifier failed only on `HTTP_CODE -ge 400`, letting a curl connection failure (`000` on a total outage) pass as an all-zero warning. Both now fail on any non-2xx.
- Verified-CLEAN (suspected, disproved): no user-facing query can surface the new inactive `triage-rejected` rows (all filter is_active=1); category pages are index-served (live EXPLAIN shows active_effective_posted_idx, no temp B-tree); pagination clamps 0/negative/NaN to page 1; all insert paths write ISO scrapedAt (no datetime('now') drift).
- Advisory (not changed): Workers AI model list duplicated across triage.ts + 2 workflow bash helpers.
- With this, all 8 audit dimensions have been swept (Part 1: ingestion; Part 2: concurrency + security; Part 3: the remaining five).

### Post-Handoff F-25 - Comprehensive Audit Part 2: Concurrency & Security

- Date: 2026-07-10
- Status: implemented, 91/91 tests, build gate pending push; report extended in `docs/comprehensive-audit-report-2026-07.md`
- CRITICAL (B-0): 63 tracked apps/web-nextjs-backup/.wrangler build artifacts hardcoded live LEGACY secrets (Turso rw JWT, Trigger.dev key, ISR_SECRET). Untracked in commit `f85eed9`. OWNER MUST ROTATE the three secrets at their providers — values persist in git history until a consented history purge. Legacy stack (not the D1 production path), which bounds the exposure.
- HIGH fixes: verify-links stale-archive chunked under the D1 100-param limit (B-1, would wedge the whole verifier); /api/ingest hardened from `...item` mass-assignment to an explicit server-owned allow-list with sanitizeApplyUrl + server-computed hashes + enum validation (B-2); ci-guardrail given a concurrency group to stop out-of-order deploys (B-3).
- MEDIUM fixes: ingest-digest insert chunked (B-4); deploy-migrations concurrency group (B-5); Hunter-rollup + Medic pushes given bounded rebase-retry (B-6); Sentinel branch push made re-entrant via --force-with-lease (B-7); /api/click DB write rate-limited after redirect-target validation (B-8).
- LOW fixes: atomic SQL increment for failedVerificationCount; shared constant-time `src/lib/auth.ts` applied to prune + verify-links (which also gained rate limiting) (B-9).
- Deferred (documented, latent): Workable rotation liveness (fix before re-enabling Workable); cadence-guard TOCTOU atomic claim; isAuthorized adoption in scrape/ingest/ingest-digest; 5 queued dimension sweeps.
- Verification: `bun test` 91/91; all 5 edited workflow YAMLs parse; build gate + CI on push.

### Post-Handoff F-24 - Comprehensive Audit Part 1: Pipeline Correctness Fixes

- Date: 2026-07-08
- Status: implemented, 91/91 tests, build passed; production index applied via deploy-migrations pipeline on push
- Report: `docs/comprehensive-audit-report-2026-07.md`
- Confirmed findings fixed (each verified against code before action):
  - Triage fail-open during AI outages -> fail-closed with `triageAiUnavailable` counter + Hunter warning (A-1).
  - Unvalidated LLM applicationUrl overriding verified URLs -> shared `sanitizeApplyUrl()` with sanitized precedence (A-2).
  - Hostile numeric HTML entity zeroing a whole feed per run -> shared guarded `text.ts` decode + per-item try/catch (A-3).
  - Rejected items re-triaged forever / head-of-line starvation -> persisted as inactive `triage-rejected` rows joining dedup (A-4).
  - Production-confirmed temp-B-tree board sort -> expression index migration `0018_effective_posted_idx.sql` (A-5, plan verified locally).
  - "[object Object]" category tags, leaky funnel accounting, silently-unmatched auto-pause entries -> fixed with counters + annotations (A-6..A-8).
  - content_hash: four private copies + false sha256 schema comment -> single shared `contentHash.ts`, honest docs; harvest.ts confirmed dead (A-9).
- Cross-dimension manual checks: zero HTML-injection sinks (grep), applicationUrl unrendered, chef.ts live / harvest.ts dead, 1 duplicate company group in production.
- Verification: `bun test` 91/91 (12 new); local D1 plan uses `active_effective_posted_idx` with no temp B-tree; YAMLs parse.

### Post-Handoff F-23 - Tier-3 Autonomous Auto-Pause (Sentinel)

- Date: 2026-07-08
- Status: implemented and pushed; autonomy activates when the user adds the `SENTINEL_BOT_PAT` secret (setup steps in `docs/maintenance-bot-2026-07-04.md`); until then Sentinel falls back to recommendation issues
- Scope:
  - New `packages/scraper/paused-sources.json` — machine-managed pause list the bot only ever appends to; config-over-code per AGENTS.md engineering preferences.
  - New `packages/scraper/pause.ts` — defensive validation (malformed entries dropped, never thrown) + pure `applyAutoPauses` overlay; 9 unit tests in `pause.test.ts`.
  - `sources.ts` overlays auto-pauses so paused feeds flow through existing skip reporting unchanged; `atsPlatformPolicy()` in scrape.ts checks `isAutoPaused()` for ATS tokens.
  - Sentinel workflow upgraded to three modes: infrastructure guard (>3 sources flapping = outage signature -> one alert issue, zero pauses), autonomous PR mode (date-keyed branch, jq append, in-runner `bun test` + `bun run build` guardrail parity before merge, PR with evidence + AI diagnosis, squash-merge via PAT -> CI deploys the pause), and the prior recommendation-issue fallback when no PAT.
  - Un-pause, source enabling, and code edits remain human-gated permanently.
- Verification:
  - `bun test` 79/79 (9 new pause tests).
  - `bun run --cwd apps/web build` passed with the JSON import bundled.
  - Workflow YAML parses; CI guardrail green on push.

### Post-Handoff F-22 - Tier-2 AI Diagnosis On Bot Issues

- Date: 2026-07-04
- Status: implemented and pushed; exercises on the next real degradation event
- Design doc: `docs/maintenance-bot-2026-07-04.md` (Tier 2 section)
- Scope:
  - Hunter `alerts` job now appends a Workers AI root-cause diagnosis as a comment on each daily degradation issue.
  - Sentinel pulse now appends a per-source transient-vs-persistent assessment to each pause-recommendation issue.
  - Safety design: AI output is advisory comment text only (never executed, never written to code, never fed back into automation), evidence is framed as untrusted data in the system prompt, AI steps degrade gracefully if Workers AI is unavailable, and no new credentials were added (reuses the `ai`-scoped `CLOUDFLARE_API_TOKEN` and built-in `GITHUB_TOKEN`).
  - Models: the production-proven `@cf/meta/llama-3.1-8b-instruct` chain already used by triage, within the Workers AI free allocation.
- Verification:
  - All workflow YAMLs parse (local PyYAML check).
  - CI guardrail green on the push.
  - Live exercise occurs on the next degradation event; the deterministic Tier-1 issue is unaffected if the AI call fails.

### Post-Handoff F-21 - Tier-1 Maintenance Bot (Free 24/7 Detection)

- Date: 2026-07-04
- Status: implemented and pushed; first live runs occur on their schedules (alerts: next Hunter tick; Sentinel: daily 01:30 UTC; Medic: Sunday 02:00 UTC)
- Design doc: `docs/maintenance-bot-2026-07-04.md`
- Scope:
  - Added an `alerts` job to `gha-hunter-pulse.yml`: parses `harvest.log` after every Hunter run and files a deduped, labeled GitHub issue (max one per UTC day) when any internal degradation signal is present (failed sources, fetch-event log failures, triage failures, insert failures, cadence-guard unavailability).
  - Added `gha-sentinel-pulse.yml` (daily): window-function query over `source_fetch_events` detects sources whose last 4 non-skipped attempts all failed and files a per-source pause-recommendation issue with evidence and exact file pointers. The bot never edits code — pausing remains a human/agent decision per AGENTS.md compliance rules.
  - Added `gha-medic-pulse.yml` (weekly): automates the major-audit data-quality snapshot (staleness, backlogs, duplicates, missing fields, 7-day per-source reliability) into `docs/health-digest-latest.md` via the same guarded bot-commit pattern as the daily rollup.
  - Cost posture: $0 — public-repo Actions minutes, read-only D1 within free tier, built-in GITHUB_TOKEN, no new secrets or services.
- Verification:
  - All five workflow YAMLs parse (local PyYAML check).
  - Sentinel SQL validated against production D1 (window functions OK; 0 flapping sources today).
  - Medic reliability SQL validated against production D1: 34 sources in the last 7 days, including gold777 ATS additions (greenhouse:gitlab 143 items, greenhouse:ghost 4, breezy:time-etc 1) — end-to-end proof of the F-20 fetch-event fix.

### Post-Handoff F-20 - Major Audit: Silent-Error Elimination & Durability Hardening

- Date: 2026-07-04
- Status: implemented, deployed (`9762994`, CI run `28701640187`), and S-1 accepted live in production — Hunter run `28702090635` recorded 35 real fetch events, taking `source_fetch_events` from its single stuck test row to 36 rows. Prune (midnight UTC) and verifier (12h) acceptance criteria remain listed in the audit doc for their next scheduled runs.
- Audit report: `docs/major-audit-2026-07-04.md`
- Silent errors found and fixed:
  - S-1 (critical): `source_fetch_events` history was never recorded in production — the batch insert exceeded D1's 100-bound-parameter limit on every run since 2026-06-13 and the failure only reached `console.warn`. Proof: the table's only row was a 2026-06-15 local test insertion. Fixed by chunked inserts via new `packages/scraper/batch.ts` (`chunkArray`, `maxRowsPerD1Batch`), surfaced as `fetchEventLog` in the scrape response, annotated by the Hunter workflow.
  - S-2 (critical): the daily prune endpoint hard-DELETEd rows — cross-company `description_hash` collisions could delete legitimate jobs, archived history was purged, and deleted-but-still-listed URLs re-inserted as "new" (churn). Rewritten to soft-archive active rows only, scoped to `(description_hash, company)`, keeping the oldest row; response reports `mode: "soft-archive"`, `deleted: 0`; the prune workflow warns if the mode ever regresses.
  - S-3 (high): jobs dropped by triage exceptions were invisible; the scrape response now reports `triageFailures` and Hunter annotates it.
  - S-4 (medium): the never-verified backlog (456 rows) could not drain at 50 links/run twice daily; the limit is now 120, the response reports `neverVerifiedRemaining`, and the verifier summary warns above 300.
  - S-5/S-6 (low): cadence-guard state availability is now reported (`cadenceGuards`) and annotated instead of silently degrading.
- Durability rules adopted (recorded in the audit doc): no silent catches in write paths; all D1 batch inserts go through `maxRowsPerD1Batch`; no destructive SQL in cron paths; workflows assert on response fields, not just HTTP 200; backlog metrics are reported in run summaries.
- Verification:
  - `bun test` passed (70/70; 9 new tests in `packages/scraper/batch.test.ts`).
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - Production acceptance checklist (post-deploy) is in `docs/major-audit-2026-07-04.md`: fetch events must accumulate, prune must report soft-archive with no row-count decrease, verifier backlog must shrink.

### Post-Handoff F-19 - Gold777 Directory Import & Verified ATS Expansion

- Date: 2026-07-04
- Status: completed cross-referenced directory import and confirmed-only ATS token verification
- Scope:
  - Cross-referenced `gold777.xlsx` (79 rows) against the production `va_directory` table (265 rows); found 44 exact/normalized duplicates and 3 near-duplicates already present under slightly different names (Pepper Virtual Assistant, Belay, GetMagic).
  - Imported 32 genuinely new companies into `va_directory` via `apps/web/gold777_imports.sql`, bringing the total from 265 to 297.
  - Classified each new entry's `niche` (`job-boards`, `bpo`, `tech`, `ecommerce`, `global-va`) following existing directory precedent, researching real websites via WebSearch for lesser-known regional platforms (VA Workers PH, Kerja-Remote, HireBasis, Prosple, GigaBPO, Remote Philippines, Amentum).
  - Probed public Greenhouse/Lever/Workable/Breezy Job Board APIs for every remote-first tech company candidate rather than guessing tokens; confirmed 4 live endpoints (`greenhouse:gitlab` 143 jobs, `greenhouse:ghost` 4 jobs, `greenhouse:remotecom` 287 jobs, `breezy:time-etc`) and left all unconfirmed guesses (Zapier, Buffer, Doist, Automattic, ClickUp, Wise, Canva, Shopify, Help Scout, Wishup, Atlassian) as directory-only entries with no ATS wiring.
  - Completed in-progress, previously uncommitted work already present in `packages/scraper/ats.ts` and `apps/web/src/pages/api/cron/scrape.ts` (referencing "Gold777 review 2026-07-03") by adding matching `va_directory` rows with `ats_platform`/`ats_token` for the 4 confirmed companies.
  - Documented full method, dedupe logic, and ATS probe evidence in `docs/gold777-directory-import-2026-07-04.md`.
- Verification:
  - Dry-run applied cleanly against local D1 (`wrangler d1 execute remoteph-jobs-db --local`), 32/32 statements succeeded.
  - Production import applied via `wrangler d1 execute remoteph-jobs-db --remote`; `SELECT COUNT(*) FROM va_directory` confirmed 265 -> 297.
  - Spot-checked all 32 new rows' `niche`/`ats_platform`/`ats_token` values against the intended import.
  - `bun test` passed (61/61 tests).
  - `bun run --cwd apps/web build` passed.
  - No new credentials were introduced; used the existing `gh` CLI GitHub login and the existing local Wrangler/Cloudflare OAuth login already configured on this machine.

### Post-Handoff F-18 - Dayshift Directory Imports & ATS Expansion

- Date: 2026-06-15
- Status: completed dayshift directory updates, new inserts, and mapped ATS expansion opportunities
- Scope:
  - Imported and updated 8 Australian Dayshift companies in `va_directory` (Cloudstaff, Flat Planet, Virtual Staff 365, RocketAMS, Vault Outsourcing, OneWorld Business Solutions, Stantaro, and Hunt St), bringing total dayshift count from 16 to 24.
  - Configured Workable ATS tokens (`rocketams`, `virtualstaff365`, `hunt-st`) and Lever ATS token (`vaultoutsourcing`) in the database entries.
  - Documented expansion opportunities: (1) token-specific Workable slow rotation allowances to circumvent global 429 locks for RocketAMS, Virtual Staff 365, and Hunt St, and (2) enabling Lever platform scraper specifically for the new Vault Outsourcing token under Goldilocks guidelines.
- Verification:
  - Remote D1 database verification complete. Count of `niche = 'australian-dayshift'` is 24.
  - ATS platform/token mappings for the inserted companies verified.

### Post-Handoff F-17 - Major Debugging and Audit

- Date: 2026-06-15
- Status: completed major debugging, sort order fix, limit and cadence tuning, and work777.xlsx directory imports
- Scope:
  - Fixed the "silent freshness bug" where new jobs were hidden by sorting by `posted_at DESC`. SQLite sorted NULLs first, and past posting dates made same-day scrapes look stale. Changed sort order to `desc(sql`coalesce(${opportunities.postedAt}, ${opportunities.scrapedAt})`)` in [index.astro](file:///c:/Users/admin/Desktop/va-freelance-hub/apps/web/src/pages/index.astro), [opportunities.astro](file:///c:/Users/admin/Desktop/va-freelance-hub/apps/web/src/pages/opportunities.astro), and [\[category\].astro](file:///c:/Users/admin/Desktop/va-freelance-hub/apps/web/src/pages/categories/%5Bcategory%5D.astro).
  - Reduced Remote OK min fetch interval from 120 minutes to 60 minutes in [sources.ts](file:///c:/Users/admin/Desktop/va-freelance-hub/packages/scraper/sources.ts) to capture same-day jobs faster.
  - Increased scraper default processing limit from 25 to 50 jobs per run in [scrape.ts](file:///c:/Users/admin/Desktop/va-freelance-hub/apps/web/src/pages/api/cron/scrape.ts) to process backlogs faster.
  - Audited and verified `source_fetch_events` Drizzle schema, TypeScript types, and database schema using local test insertions.
  - Cross-referenced `work777.xlsx` against the existing directory and successfully imported 22 new companies into the production `va_directory` table, bringing the total from 238 to 260.
  - Updated existing `Support Shepherd` directory entry website from `somewhere.com` to `https://supportshepherd.com`.
- Verification:
  - `bun run build` passed.
  - Remote D1 import of 22 new companies verified by `SELECT count(*) FROM va_directory;` returning `260`.
  - `Support Shepherd` website update verified by querying `va_directory`.
  - Local test script for Drizzle insertion succeeded.

### Post-Handoff F-16 - Non-English and Local European Pre-Filter

- Date: 2026-06-13
- Status: accepted after adding regex pre-filters for non-English languages and localized student/apprentice schemes, and adding unit tests
- Scope:
  - Addressed the issue where German job listings (like "Werkstudent (m/w/d) SAP-Consulting im Kundenservice") were incorrectly ingested.
  - Implemented `LOCAL_OR_NON_ENGLISH_REGEX` pre-filter matching localized gender classifications (e.g., m/w/d, w/m/d) and local university/national programs (e.g., German Werkstudent, French Alternance/Apprentissage).
  - Updated LLM triage prompt to explicitly instruct the AI model to mark non-English listings and regional student/apprentice programs as ineligible.
  - Added comprehensive unit tests in `packages/scraper/triage.test.ts`.
  - Manually deactivated/archived the active German job listing (ID 2281) in the remote D1 database to immediately remove it from the website.
- Verification:
  - `bun test` passed (61/61 tests);
  - `bun run --cwd apps/web build` passed;
  - Verified remote D1 database opportunity ID 2281 is successfully set to `is_active = 0`.

### Post-Handoff F-15 - Bounded Source Expansion

- Date: 2026-06-13
- Status: accepted after evaluating, compliance-auditing, and local probing of the new Jobicy Customer Support APAC RSS feed
- Scope:
  - Added `jobicy-supporting-apac` source feed targeting the `supporting` (customer support) category for the `apac` region.
  - Implemented Goldilocks compliance limits (`maxItems: 40`, `minFetchIntervalMinutes: 60`) in `packages/scraper/sources.ts`.
  - Audited robots.txt and `<legalNotice>` feed parameters to ensure compliance.
  - Probed feed locally and verified successful retrieval of 26 relevant jobs (e.g. Technical Customer Support Specialist, Customer Care Specialist).
  - Documented findings in `docs/source-expansion-2026-06-13.md`.
- Verification:
  - `bun test` passed (54/54 tests);
  - `bun run --cwd apps/web build` passed;
  - Local script successfully executed feed parsing.

### Post-Handoff F-14 - Query and Indexing Audit

- Date: 2026-06-13
- Status: accepted after running query plans, adding database migration, and verifying index utilization
- Scope:
  - Audited hot queries on homepage, opportunities filters, and directory pages.
  - Added `company_name_idx` on `va_directory(company_name)` to eliminate a `SCAN va_directory` + `USE TEMP B-TREE FOR ORDER BY` sorting overhead on the directory page.
  - Verified that query plan for `va_directory` now successfully uses the index: `SCAN va_directory USING INDEX company_name_idx`.
  - Documented findings and plans in `docs/query-indexing-audit-2026-06-13.md`.
- Verification:
  - `bun test` passed (54/54 tests);
  - `bun run --cwd apps/web build` passed;
  - Local and remote D1 migrations applied cleanly;
  - Query plan verified using `EXPLAIN QUERY PLAN`.

### Post-Handoff F-13 - Data Quality and Stale Policy Refresh

- Date: 2026-06-13
- Status: accepted after running SQL audit queries, deactivating stale rows from paused sources, deduplicating description hashes, and documentation updates
- Scope:
  - Ran a fresh read-only D1 snapshot of active opportunities, duplicate url/content/description hashes, and missing fields.
  - Found that the `other` category has been significantly reduced to 14.48% (down from 77.3% on June 9), showing excellent triage improvement.
  - Deactivated 10 stale active opportunities from paused sources (Dribbble, Pearl Talent, Coconut VA, CrewBloom) that had no `last_seen_in_feed_at` timestamp and were scraped more than 14 days ago.
  - Deduplicated 2 pairs (4 rows) of active opportunities from Passion.io via RealWorkFromAnywhere with identical title/company/description hashes by deactivating the older scraped row.
  - Documented findings, SQL queries, and before/after counts in `docs/data-quality-snapshot-2026-06-13.md` and `docs/stale-policy-report-2026-06-13.md`.
- Verification:
  - `bun test` passed (54/54 tests);
  - Remote D1 count queries confirmed active job count decreased from 884 to 871 (after deactivating stale/duplicate listings and the German job);
  - `git diff --check` passed.

### Post-Handoff F-12 - Breezy Source Review

- Date: 2026-06-13
- Status: accepted after fresh endpoint probing, robots.txt compliance analysis, and documentation updates
- Product commit:
  - `020ba7d` - `docs: add breezy source review findings`
- Scope:
  - Re-probed all configured Breezy ATS endpoints (`20Four7VA` returning 60 jobs, `Sourcefit` returning 65 jobs, and `VAA Philippines` returning 0 jobs).
  - Audited standard `robots.txt` rules for Breezy subdomains and confirmed automated access to the `/json` feed path is allowed.
  - Formulated the compliance decision to maintain these subdomains in `needs_review` status to enforce Goldilocks safety constraints (minimal metadata, direct apply links, immediate pause on objection).
  - Documented findings, probe counts, duplicate skip rules, and the policy decision in `docs/breezy-source-review-2026-06-13.md`.
- Verification:
  - `bun test` passed (54/54 tests);
  - `bun run --cwd apps/web build` completed successfully;
  - `git diff --check` passed.

### Post-Handoff F-11 - Source-Health History

- Date: 2026-06-13
- Status: accepted after local build, Bun test runner verification, git commit/push, and Wrangler D1 local/remote migrations
- Product commit:
  - `2b91c68` - `feat: add compact source-health history logs, database schema and migration`
- Scope:
  - Added the `source_fetch_events` table in the database to record historical logs for each scraper cron attempt (timestamp, ok/skipped, counts, duration, error, skip reason).
  - Wrote SQL migration `0016_source_fetch_events.sql` and applied it to local and remote D1 databases.
  - Implemented the `recordSourceFetchEvents` helper in `scrape.ts` that maps and inserts scraper run metrics in a single database batch transaction.
  - Created `docs/source-health-audit.md` documenting key database queries for auditing scraper trends, latencies, success rates, and errors.
- Verification:
  - `bun test` passed (54/54 tests);
  - `bun run --cwd apps/web build` passed;
  - `bunx wrangler d1 migrations apply remoteph-jobs-db --local` & `--remote` executed successfully;
  - `git diff --check` passed.

### Post-QA F-10 - Gemini Masterplan And CI Test Guardrail

- Date: 2026-06-13
- Status: accepted after Codex QA, local build/test verification, CI guardrail,
  production deploy, production smoke, read-only D1 checks, and docs handoff
- Handoff:
  - `docs/gemini-masterplan-handoff-2026-06-13.md`
- Product/CI commits:
  - `8d499df` - `feat: reduce payload size by slimming DB projections, add Remote OK unit tests`
  - `3036a53` - `docs: update implementation status and system savepoint with F-09 post-handoff details`
  - `e719a2c` - `ci: run unit tests in guardrail`
- Scope:
  - QA reviewed Gemini's projection slimming and Remote OK tests.
  - Added `bun test` to the CI guardrail so unit tests are enforced on every
    push and PR.
  - Created a Gemini-ready masterplan that prioritizes compact source-health
    history before more source expansion, then Breezy policy review, data
    quality, query/index audit, bounded source expansion, and portfolio polish.
- Verification:
  - `bun test packages/scraper/json.test.ts` passed with 54/54 tests.
  - `bun test` passed.
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI guardrail `27461079903` passed for `e719a2c`.
  - Production deployment
    `2bbecd9c-1247-4805-b017-70574afa6e37` completed for `e719a2c`.
  - Production smoke returned 200 for `/`, `/directory`, `/opportunities`, and
    `/categories/tech`.
  - Read-only D1 snapshot reported 878 active opportunities, 38 active RemoteOK
    rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

### Post-Handoff F-09 - Payload Reduction & Remote OK Tests

- Date: 2026-06-13
- Status: accepted after local build, Bun test runner verification, git commit/push, and manual D1 database query plan checks
- Product commit:
  - `8d499df` - `feat: reduce payload size by slimming DB projections, add Remote OK unit tests`
- Scope:
  - Slimmed DB projections for homepage `/` (from 22 columns to 10 fields used by `OpportunityCard`/`OpportunitySearch`). This reduces payload size by omitting heavy columns like `description`, `contentHash`, etc.
  - Slimmed DB projections for directory page `/directory` (from all columns to 8 fields used by `DirectorySearch`/`CategoryCard`), reducing payload size by dropping `notes`, `hiringPageUrl`, `verifiedAt`, `createdAt`, `rating`, `atsToken`, `atsPlatform`.
  - Added comprehensive unit tests for the Remote OK JSON scraper in `packages/scraper/json.test.ts` verifying placeholder title detection, role regex filters, hub-relevance rules, URL normalization, HTML entity decoding, and pay range normalization.
  - Investigated the zero-count successful source signal (`breezy:vaaphilippines-recruitment` returning 0 jobs successfully) and confirmed no references to `echojobs` or `dynamite-jobs` exist in the codebase except for the "Dynamite Jobs" directory entry.
- Verification:
  - `bun test packages/scraper/json.test.ts` passed (54/54 tests passing);
  - `bun run --cwd apps/web build` completed successfully;
  - `git diff --check` passed.

### Post-Audit F-08 - Remote OK JSON Source

- Date: 2026-06-13
- Status: accepted and stopped after local build/probe, CI, production deploy,
  D1 migration, Hunter evidence, source-health rollup, and read-only D1 checks
- Evidence report: `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Product commits:
  - `92ca443` - `feat: add remote ok json source`
  - `4c2374b` - `fix: filter remote ok physical roles`
- Generated rollup commit:
  - `562355e` - `docs: update daily source health`
- Scope:
  - added JSON source support;
  - enabled Remote OK through `https://remoteok.com/api`;
  - enforced caps and 120-minute cadence;
  - linked Remote OK cards directly to Remote OK job URLs;
  - added source-specific relevance and physical/logistics filters;
  - archived four already-inserted RemoteOK physical/logistics outliers.
- Verification:
  - `bun run --cwd apps/web build` passed;
  - `git diff --check` passed;
  - CI guardrail `27435140046` passed for `92ca443`;
  - production deployment `b8b04c38-2b56-42e6-89df-2b980c6a6266` deployed
    `92ca443`;
  - manual Hunter `27435248150` passed with Remote OK JSON count 33 in the first
    loop, 25 accepted/attempted inserts total, 0 failed sources, 0 failed insert
    batches, and 0 insert errors;
  - CI guardrail `27435636180` passed for `4c2374b`;
  - D1 migration workflow `27435636177` passed;
  - source-health rollup `27450540244` passed with 0 failed sources and 0 insert
    errors;
  - later scheduled Hunter `27457196402` passed on `562355e`;
  - read-only D1 snapshot reported 878 active opportunities, 38 active RemoteOK
    rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

### Post-Audit F-07 - Cadence-Guarded RSS Source Expansion

- Date: 2026-06-12
- Status: accepted after local build, D1 migration, CI, production deploy
  recovery, manual Hunter evidence, read-only D1 checks, and source-health
  rollup refresh
- Evidence report: `docs/source-expansion-2026-06-12.md`
- Product commits:
  - `686e312` - `feat: add cadence guarded rss sources`
  - `b948828` - `fix: preserve paused source skip reasons`
- Generated rollup commit:
  - `79e46f8` - `docs: update daily source health`
- Scope:
  - added source-level `maxItems`;
  - added durable `source_fetch_state` cadence tracking;
  - enabled Real Work From Anywhere RSS and Jobicy Admin Support APAC RSS with
    caps and 60-minute minimum fetch intervals;
  - preserved paused-source visibility with readable skip reasons;
  - kept Remote OK deferred until a JSON adapter exists.
- Verification:
  - `bun run --cwd apps/web build` passed;
  - `git diff --check` passed;
  - CI/deploy run `27422527473` passed;
  - D1 migration workflow `27422527574` passed;
  - CI run `27422888691` passed for the skip-reason fix;
  - manual production deployment
    `8863383f-2f01-4c64-8110-51b8e8d5f222` recovered production after an async
    Cloudflare Pages deployment failure for `b948828`;
  - Hunter run `27422685577` passed with 25 accepted/attempted inserts, 0 failed
    source records, 0 failed insert batches, and 0 insert errors;
  - Hunter run `27423455086` passed with cadence skips for the new hourly
    sources and readable paused-source skip reasons;
  - rollup-writing Hunter run `27423574670` passed and updated
    `docs/source-health-latest.md`;
  - read-only D1 checks reported 797 active opportunities, four healthy
    `source_fetch_state` rows, and use of
    `source_fetch_state_last_attempt_idx`.

### Post-Audit F-06 - Breezy ATS Token Allowlist

- Date: 2026-06-12
- Status: accepted after local build, CI/deploy, direct endpoint probes, manual
  Hunter retry, and source-health rollup refresh
- Evidence report: `docs/ats-policy-follow-up-2026-06-12.md`
- Product commit:
  - `6304ea4` - `fix: require token review for breezy ats`
- Generated rollup commit:
  - `14db966` - `docs: update daily source health`
- Scope:
  - changed Breezy from platform-wide enabled to token-specific policy;
  - kept current tokens `breezy:20four7va`, `breezy:sourcefit`, and
    `breezy:vaaphilippines-recruitment` enabled as `needs_review`;
  - paused unknown future Breezy tokens by default until source-specific review.
- Verification:
  - `bun run --cwd apps/web build` passed;
  - CI/deploy run `27372929451` passed;
  - direct probes for the three current Breezy JSON endpoints returned 200;
  - Hunter run `27372988265` showed one transient `20Four7VA` timeout, followed
    by healthy direct probes;
  - retry Hunter run `27373090226` passed with 0 failed sources, 0 failed insert
    batches, and 0 insert errors;
  - rollup-writing Hunter run `27373196600` passed and updated
    `docs/source-health-latest.md`.

### Post-Audit F-05 - ATS Policy Fail-Closed Hardening

- Date: 2026-06-12
- Status: accepted after local build, CI/deploy, manual Hunter evidence, and
  source-health rollup refresh
- Evidence report: `docs/ats-policy-follow-up-2026-06-12.md`
- Product commit:
  - `aa670ee` - `fix: pause unreviewed ats platforms`
- Generated rollup commit:
  - `f635f3f` - `docs: update daily source health`
- Scope:
  - paused Workable ATS collection after repeated HTTP 429 history and no
    reviewed source-supported access path;
  - paused Lever and Greenhouse by default because no current production
    directory rows use them and future rows need source-specific review first;
  - kept Breezy enabled as `needs_review` while preserving linkback to original
    ATS-hosted URLs.
- Verification:
  - `bun run --cwd apps/web build` passed;
  - `git diff --check` passed with only expected CRLF warnings;
  - CI/deploy run `27372355271` passed;
  - manual Hunter run `27372436554` passed with 0 failed sources, 0 failed
    insert batches, and 0 insert errors;
  - rollup-writing Hunter run `27372521005` passed and updated
    `docs/source-health-latest.md`;
  - latest source-health rollup reports 18 skipped sources, including Workable
    ATS rows as `paused`.

### Post-Audit F-04 - Wrangler v4 And Local D1 Audit Recovery

- Date: 2026-06-12
- Status: accepted after local frozen install, active app build, read-only D1
  audit, CI/deploy, and production route smoke
- Evidence report: `docs/wrangler-d1-audit-2026-06-12.md`
- Commit:
  - `ad03990` - `chore: upgrade wrangler for current cloudflare config`
- Scope:
  - upgraded active root and `apps/web` Wrangler dev dependencies to
    `^4.100.0`;
  - refreshed `bun.lock` so it matches the active Astro workspace dependency
    graph;
  - confirmed Wrangler v4 accepts the current `ratelimits` Pages Functions
    config without the Wrangler v3 warning;
  - restored local direct read-only D1 audits from this machine.
- Verification:
  - `bun install --frozen-lockfile` passed;
  - `bun run --cwd apps/web build` passed;
  - `bunx wrangler --version` returned `4.100.0`;
  - `bunx wrangler d1 info remoteph-jobs-db` passed with no `ratelimits`
    warning;
  - D1 read-only audit reported 748 active opportunities and `changed_db:
    false`;
  - query plans use `active_posted_idx` and `category_active_posted_idx`;
  - CI/deploy run `27371741236` passed;
  - production route smoke passed for `/`, `/opportunities`,
    `/opportunities?page=2`, `/directory`, `/data-policy`, `/privacy`,
    `/categories/tech`, and `/categories/tech?page=2`;
  - unauthenticated `POST /api/cron/scrape` returned 401.

### Major Health Audit - Hunter Recovery, Category Payload, Repo Hygiene

- Date: 2026-06-11
- Status: accepted after local build, production route smoke, CI/deploy runs,
  manual Hunter recovery, and source-health rollup refresh
- Evidence report: `docs/major-audit-2026-06-11.md`
- Product commits:
  - `e861071` - `fix: reduce D1 scrape insert batch size (F-01)`
  - `45e2f2d` - `fix: paginate category pages server-side (F-02)`
  - `ae72998` - `chore: stop tracking local wrangler state (F-03)`
- Generated rollup commit:
  - `6e76c67` - `docs: update daily source health`
- Scope:
  - fixed repeated scheduled Hunter failures caused by D1
    `too many SQL variables` insert errors;
  - reduced category pages from a hydrated all-category payload to
    server-side pagination;
  - removed committed local `.wrangler` D1 runtime state and ignored it going
    forward;
  - refreshed `docs/source-health-latest.md` with post-fix Hunter evidence.
- Verification:
  - `bun run --cwd apps/web build` passed after F-01 and after F-02;
  - `git diff --check` passed with only normal CRLF warnings;
  - CI/deploy runs `27353756293`, `27353939869`, and `27354017177` passed;
  - production route smoke passed for `/`, `/opportunities`,
    `/opportunities?page=2`, `/directory`, `/data-policy`, `/privacy`,
    `/categories/tech`, and `/categories/tech?page=2`;
  - `/categories/tech` dropped from about 980 KB to about 94 KB;
  - unauthenticated `POST /api/cron/scrape` returned 401;
  - manual Hunter run `27354089629` passed with 35 accepted/attempted inserts,
    0 failed insert batches, 0 insert errors, and 0 failed sources;
  - rollup-writing Hunter run `27354219672` passed and wrote
    `docs/source-health-latest.md` with 0 failed sources and 0 insert errors.
- Verification limit at the time, resolved by F-04 above:
  - local direct Wrangler D1 reads failed with Cloudflare API error `7403`;
    production write health was verified through GitHub Hunter workflow
    evidence instead.

### P5 Debt - Historical Datetime Backfill & Major Health Audit

- Date: 2026-06-10
- Status: accepted after read-only D1 audit, D1 migration, and GitHub documentation push
- Commit: `4336de4`
- Message: `docs: add 2026-06-10 major audit report`
- Supporting commit: `6a9fd40` (`fix: backfill historical datetimes to ISO UTC`)
- Scope:
  - Validated that Lens 1 and Lens 2 successfully cleared prior technical debt (indexing, `/opportunities` route, noisy GitHub action scraper alerts).
  - Executed a major D1 health audit which revealed 704 total jobs with drastically improved category signal (`other` reduced to 48).
  - Executed remaining P5 technical debt: backfilled and normalized thousands of legacy `YYYY-MM-DD HH:MM:SS` timestamps across the database into canonical UTC ISO strings using `0013_historical_datetime_backfill.sql`.
  - Exported the complete audit report into `docs/major-audit-2026-06-10.md` for the next AI agent.
- Key evidence:
  - D1 migration `0013` successfully applied remotely.
  - `docs/major-audit-2026-06-10.md` pushed to `main`.

### Lens 2 - Sourcing Expansion & Data Quality

- Date: 2026-06-09
- Status: accepted after local build, D1 SQL backfill, staggered Workable setup, and CI validation success
- Commit: `f5b9827`
- Message: `feat: implement Lens 2 roadmap (category alignment, SQL backfill, staggered Workable rotation, and auto-deploy)`
- Scope:
  - Added `finance` category and updated triage prompts/regex mappings.
  - Increased description extraction slice to 1500 characters.
  - Implemented staggered Workable ATS rotation polling (fetching 2 agencies per run) and tracking via `verifiedAt`.
  - Added auto-deploy to Cloudflare Pages on `main` push to CI workflow.
- Key evidence:
  - Local build passed.
  - GitHub Actions run `27207069121` passed, deploying the app to Cloudflare Pages.
  - D1 category counts updated, reducing `other` from 532 to 47.
  - Live page loading correctly with the new categories.

### P7 - Final Acceptance Audit

- Date: 2026-06-09
- Status: accepted after local build, production smoke, D1 checks, query-plan
  checks, README update, docs checkpoint, and CI
- Evidence report: `docs/final-acceptance-audit-2026-06-09.md`
- Scope:
  - re-ran active app build;
  - smoked production routes;
  - checked protected scrape endpoint;
  - captured D1 active-row, missing-field, source-state, category, and query
    plan evidence;
  - verified latest workflow and source-health rollup state;
  - replaced stale README language with the current production architecture,
    public-source policy, and recovery docs.
- Key evidence:
  - `npm.cmd run build --workspace apps/web` passed;
  - `/`, `/opportunities`, `/directory`, `/data-policy`, `/privacy`, and
    `/categories/tech` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401;
  - D1 reported 688 active opportunities and 0 missing `application_url`;
  - query plans use `active_posted_idx` and `category_active_posted_idx`;
  - `docs/source-health-latest.md` reports 0 failed sources.
- Accepted completion after this checkpoint: 100%.

### P6 Slice 2 - Source Health Rollup

- Date: 2026-06-09
- Status: accepted after CI, manual Hunter, generated rollup commit, and
  repo-readable rollup verification
- Workflow commit: `0ba92d2`
- Message: `ci: add source health rollup`
- Generated rollup commit: `d4b33a7`
- Message: `docs: update daily source health`
- Evidence report: `docs/source-health-rollup-2026-06-09.md`
- Scope:
  - added manual `write_rollup` workflow input for acceptance testing;
  - added `daily-rollup` job that downloads the Hunter artifact and writes
    `docs/source-health-latest.md`;
  - guarded scheduled rollups to at most one commit per UTC date;
  - kept the main Hunter job read-only and isolated write permission to the
    rollup job.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - GitHub Actions run `27204381138` passed for the workflow change;
  - manual Hunter workflow run `27204417574` passed with
    `write_rollup=true`;
  - Hunter artifact `hunter-health-27204417574` uploaded with artifact ID
    `7506838648`;
  - `Update Source Health Rollup` job created commit `d4b33a7`;
  - local repo fast-forwarded to include `docs/source-health-latest.md`.
- Hunter evidence:
  - response reported HTTP 200;
  - response reported `failedSources: []`;
  - response reported `inserted: 0`, `actualChanges: 0`,
    `acceptedForInsert: 0`, `attemptedInsert: 0`,
    `insertFailedBatches: 0`, and `insertErrors: []`;
  - rollup reports 0 failed sources, 1 zero-count successful source, and 18
    skipped sources.
- Accepted completion after this checkpoint: 95%.

### P6 Slice 1 - Hunter Health Artifacts

- Date: 2026-06-09
- Status: accepted after CI, manual Hunter, artifact download, and no-bot-commit
  verification
- Commit: `f8fadfb`
- Message: `ci: stop hunter alert commit spam`
- Evidence report: `docs/hunter-health-artifacts-2026-06-09.md`
- Scope:
  - changed Hunter workflow permissions from `contents: write` to
    `contents: read`;
  - removed the per-run `docs/scraper-alerts.md` append/commit/push path;
  - kept warning/error annotations for source failures and insert errors;
  - added `source-health-summary.md`;
  - uploaded `harvest.log` and `source-health-summary.md` as run artifacts.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - `rg` confirmed no `contents: write`, `git commit`, `git push`, or
    `scraper-alerts` references remain in Hunter;
  - GitHub Actions run `27204009191` passed;
  - manual Hunter workflow run `27204051068` passed;
  - artifact `hunter-health-27204051068` uploaded with artifact ID
    `7506687492`;
  - downloaded artifact contained `harvest.log` and
    `source-health-summary.md`;
  - `git status --short --branch` after fetching `origin/main` reported
    `## main...origin/main`, confirming Hunter did not create a bot commit.
- Hunter evidence:
  - response reported HTTP 200;
  - response reported `failedSources: []`;
  - response reported `inserted: 0`, `actualChanges: 0`,
    `acceptedForInsert: 0`, `attemptedInsert: 0`,
    `insertFailedBatches: 0`, and `insertErrors: []`;
  - artifact summary reported 0 failed sources, 1 zero-count successful source,
    and 18 skipped sources.
- Accepted completion after this checkpoint: 90%.

### P5 Slice 3 - Application URL Backfill

- Date: 2026-06-09
- Status: accepted after product CI, D1 migration, deploy, production smoke,
  and Hunter evidence
- Product commit: `2754740`
- Message: `fix: derive application urls from source urls`
- Evidence report: `docs/application-url-backfill-2026-06-09.md`
- Scope:
  - normalized manual ingest writes so `applicationUrl` falls back to
    `sourceUrl`;
  - normalized cron scrape writes so triage-discovered `applicationUrl` wins,
    then scraper-provided `applicationUrl`, then `sourceUrl`;
  - added D1 migration `0012_application_url_backfill.sql`;
  - did not change the visible job-card routing, which still links through
    `sourceUrl`.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - `npm.cmd run build --workspace apps/web` passed;
  - GitHub Actions run `27203416725` passed;
  - D1 migration workflow run `27203416643` passed;
  - migration applied `0012_application_url_backfill.sql`;
  - deployed `apps/web/dist` with Wrangler to
    `https://936f10a7.remotejobs-ph.pages.dev`;
  - production `/`, `/opportunities`, and `/directory` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401;
  - sample click redirect for job `2135` returned 302 to the validated source
    URL.
- D1 evidence:
  - after migration and before Hunter: 687 active rows, 0 missing
    `application_url`, 687 rows where `application_url = source_url`;
  - after Hunter: 688 active rows, 0 missing `application_url`, 687 rows where
    `application_url = source_url`, and 1 row with a distinct application URL.
- Live workflow evidence:
  - manual Hunter workflow run `27203556963` passed;
  - response reported `failedSources: []`;
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
- Accepted completion after this checkpoint: 85%.

### P5 Slice 2 - Stale Policy Dry Run

- Date: 2026-06-09
- Status: accepted after docs CI
- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- Scope:
  - defined source states: `enabled`, `paused`, and `unclassified`;
  - defined no-mutation dry-run actions for keep, hold, review, and classify;
  - ran read-only D1 candidate queries against production;
  - made no production row mutations.
- Dry-run action counts:
  - `keep_enabled_source`: 497 rows;
  - `hold_paused_recently_seen`: 175 rows;
  - `review_paused_missing_last_seen`: 10 rows;
  - `classify_source_before_action`: 5 rows.
- Review buckets:
  - paused-source rows missing `last_seen_in_feed_at`: 10;
  - unclassified `RemoteOK` rows: 5.
- Verification:
  - all D1 checks were read-only and reported `changed_db: false`;
  - `git diff --check` passed with only normal CRLF warnings.
- Accepted completion after this checkpoint: 80%.

### P5 Slice 1 - Data Quality Snapshot

- Date: 2026-06-09
- Status: accepted after docs CI
- Snapshot: `docs/data-quality-snapshot-2026-06-09.md`
- Scope:
  - captured read-only production D1 data quality metrics;
  - separated currently enabled source rows, now-paused source rows, and
    unclassified source rows;
  - recorded category, source, stale-risk, missing-field, duplicate-key, and
    last-seen gap metrics;
  - made no production row mutations.
- Key findings:
  - active opportunities: 687;
  - duplicate `source_url`, `content_hash`, and non-empty `description_hash`
    groups: 0 each;
  - missing `application_url` and `client_timezone`: 687 rows each;
  - missing `pay_range`: 524 rows;
  - missing `experience_level`: 522 rows;
  - category `other`: 531 rows;
  - posted older than 30 days: 247 rows;
  - rows from currently enabled sources: 497;
  - historical rows from now-paused sources: 185;
  - unclassified source rows: 5 (`RemoteOK`).
- Verification:
  - all D1 checks were read-only and reported `changed_db: false`;
  - `git diff --check` passed with only normal CRLF warnings.
- Accepted completion after this checkpoint: 75%.

### P4 Slice 3 - ATS Source Policy And Duplicate Control

- Date: 2026-06-09
- Status: accepted
- Final commit: `95e6665`
- Message: `fix: pause rate limited workable ats sources`
- Supporting commits:
  - `e3714d8` - `fix: dedupe duplicate ats source fetches`
  - `3256127` - `fix: throttle ats source polling`
- ATS source review evidence: `docs/ats-source-review-2026-06-09.md`
- Scope:
  - added ATS platform policy notes to scrape `sourceResults`;
  - de-duplicated directory rows that share the same ATS platform/token;
  - reported duplicate ATS rows as `skipped: true` with reasons;
  - paused Workable ATS polling after repeated HTTP 429s, including after
    sequential polling;
  - kept Breezy ATS JSON enabled as `needs_review`.
- Verification:
  - production D1 read-only query found 15 ATS-enabled rows and one duplicate
    token: `breezy:20four7va` for `20Four7VA` and
    `24/7 Virtual Assistant`.
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - GitHub Actions run `27202145473` passed for the final Workable pause
    commit.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - final Cloudflare preview URL: `https://6b3bc9b2.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 187 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/directory` returned 200 at about 272 KB;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live workflow evidence:
  - final manual Hunter workflow run `27202221523` passed;
  - response reported `failedSources: []`;
  - Breezy ATS results included `20Four7VA` with 61 items, `Sourcefit` with 67
    items, and `VAA Philippines` with 0 items;
  - 11 Workable-backed directory rows were reported as `skipped: true` with
    `complianceStatus: "paused"`;
  - `24/7 Virtual Assistant` was reported as `skipped: true` because the
    `20four7va` Breezy token was already fetched for `20Four7VA`;
  - response reported `inserted: 0`, `actualChanges: 0`,
    `acceptedForInsert: 0`, `attemptedInsert: 0`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after the latest Hunter run: 687;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 70%.

### P4 Slice 2 - Source Review And Pause Enforcement

- Date: 2026-06-09
- Status: accepted
- Commit: `1143798`
- Message: `feat: enforce source compliance pauses`
- Source review evidence: `docs/source-review-2026-06-09.md`
- Scope:
  - marked We Work Remotely and Remotive as enabled `allowed` RSS sources with
    attribution/linkback notes;
  - paused ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs,
    OnlineJobs.ph, and Jobspresso with source-specific reasons;
  - changed `rssSources` and `htmlSources` to include only enabled sources;
  - kept disabled sources visible in scrape `sourceResults` as `skipped: true`
    with `skipReason`;
  - updated the Hunter workflow summary to count skipped sources separately from
    failed and zero-count successful sources.
- Verification:
  - current source evidence was reviewed via source pages, robots files, terms
    pages, and live feed probes.
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - GitHub Actions run `27200812470` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - Cloudflare preview URL: `https://1a74a454.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 187 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/directory` returned 200 at about 272 KB;
  - `/data-policy` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live workflow evidence:
  - manual Hunter workflow run `27200899849` passed;
  - final response reported `failedSources: []`;
  - We Work Remotely fetched as `allowed` with 100 RSS items;
  - Remotive fetched as `allowed` with 29 RSS items;
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso were reported as `skipped: true` with pause reasons;
  - response reported `inserted: 0`, `actualChanges: 0`,
    `acceptedForInsert: 0`, `attemptedInsert: 0`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after the latest Hunter run: 687;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 65%.

### P4 Slice 1 - Conservative Source Metadata

- Date: 2026-06-09
- Status: accepted
- Commit: `fa2d6eb`
- Message: `feat: add source compliance metadata`
- Scope:
  - added `collectionMethod`, `complianceStatus`, and `complianceNotes` to
    configured RSS/HTML scraper sources;
  - exported `CollectionMethod` and `ComplianceStatus` types from
    `@va-hub/scraper`;
  - exposed `collectionMethod` and `complianceStatus` in scrape
    `sourceResults`;
  - defaulted ATS-derived source results to `public_ats_json` and
    `needs_review` until directory-level source policy exists;
  - updated `/data-policy` to use public-indexing language and explicitly state
    that public visibility is not blanket permission.
- Verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - GitHub Actions run `27199810692` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - Cloudflare preview URL: `https://1896b637.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 187 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/data-policy` returned 200 and included the June 2026 update plus the
    public-visibility caution;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live workflow evidence:
  - manual Hunter workflow run `27199890298` passed;
  - response included `collectionMethod` and `complianceStatus` on RSS, HTML,
    and ATS source results;
  - configured sources and ATS results were conservatively marked
    `needs_review`;
  - workflow produced scraper-alert commit `3174068` for the Remote.co failure.
- D1 evidence:
  - active opportunity count after the latest Hunter run: 687;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 60%.

### P3 Slice 3 - Hunter Workflow Annotations

- Date: 2026-06-09
- Status: accepted
- Commit: `e0a32fb`
- Message: `ci: surface hunter scrape health`
- Scope:
  - added Hunter workflow totals for accepted rows, attempted inserts, failed
    insert batches, and insert errors;
  - added warning annotations for partial source failures;
  - added insert-error warning annotations and threshold behavior;
  - expanded the GitHub step summary with source failure, zero-count source, and
    insert accounting metrics;
  - preserved existing scraper-alert commit behavior until P6 rollups replace it.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings.
  - GitHub Actions run `27198767290` passed.
- Live workflow evidence:
  - manual Hunter workflow run `27198807621` passed;
  - run emitted a warning annotation:
    `1 source(s) failed. See sourceResults in harvest.log.`;
  - final response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`;
  - summary step wrote failed-source, zero-count source, and insert accounting
    metrics;
  - workflow produced scraper-alert commit `baf2bd8` for the Remote.co failure.
- D1 evidence:
  - active opportunity count after the latest Hunter run: 687;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 55%.

### P3 Slice 2 - Honest Insert Accounting

- Date: 2026-06-09
- Status: accepted
- Commit: `e86b854`
- Message: `fix: report actual scrape inserts`
- Scope:
  - changed `/api/cron/scrape` so `inserted` equals D1 `meta.changes`;
  - added `acceptedForInsert` for rows that passed triage;
  - added `attemptedInsert` for rows submitted to D1;
  - added `insertFailedBatches` and `insertErrors` response fields;
  - preserved backward compatibility for `.github/workflows/gha-hunter-pulse.yml`
    because it still reads `.inserted`.
- Local verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - Static check confirmed the new response fields are present in no-data,
    no-new-job, no-triage-pass, and successful-insert branches.
- GitHub:
  - pushed to `origin/main`;
  - GitHub Actions run `27167396371` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - Cloudflare preview URL: `https://cde106a3.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 186 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/directory` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live ingestion evidence:
  - manual Hunter workflow run `27198077806` passed;
  - authenticated production scrape response returned HTTP 200;
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`;
  - Remote.co remained visible in `failedSources` and `sourceResults`;
  - workflow produced scraper-alert commit `bc255c8` for the Remote.co failure.
- D1 evidence:
  - active opportunity count after later scheduled/manual ingestion: 686;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 45%.

### P3 Slice 1 - Structured Source Status

- Date: 2026-06-09
- Status: accepted
- Commit: `27794d8`
- Message: `feat: report source scrape status`
- Scope:
  - added structured `sourceResults` to `/api/cron/scrape` responses;
  - preserved the existing `failedSources` array used by
    `.github/workflows/gha-hunter-pulse.yml`;
  - each source result includes `sourceName`, `sourceType`, `ok`, `count`,
    `durationMs`, and `error` when failed;
  - changed ATS fetch errors to throw so broken ATS sources become failed source
    records instead of silent zero-item successes.
- Local verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - Static check confirmed `sourceResults` is returned by all successful scrape
    response branches.
- GitHub:
  - pushed to `origin/main`;
  - GitHub Actions run `27166648567` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - Cloudflare preview URL: `https://44501583.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 181 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/directory` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live ingestion evidence:
  - manual Hunter workflow run `27166770708` passed;
  - authenticated production scrape response returned HTTP 200;
  - response inserted 11 jobs, reported `actualChanges: 11`, and left
    `backlogRemaining: 0`;
  - response included `sourceResults` for RSS, HTML, and ATS sources;
  - Remote.co was explicitly reported as
    `ok: false`, `count: 0`, `error: "[rss] Failed to fetch Remote.co: HTTP 520"`;
  - zero-count successful sources such as ProBlogger, Jobspresso,
    OnlineJobs.ph, MyOutDesk, and others were distinguishable from failures via
    `ok: true`;
  - the workflow produced scraper-alert commit `ca1f06d` for the Remote.co
    failure.
- D1 evidence:
  - active opportunity count after the manual Hunter run: 683;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 40%.

### P2 Slice 2 - Canonical Timestamp Writes

- Date: 2026-06-09
- Status: accepted
- Commit: `e32e580`
- Message: `feat: normalize app timestamp writes`
- Scope:
  - added `apps/web/src/lib/time.ts` for app-owned UTC ISO timestamp helpers;
  - normalized opportunity timestamps in `/api/cron/scrape`;
  - normalized opportunity timestamps in `/api/ingest`;
  - normalized digest timestamps in `/api/ingest-digest`;
  - changed `/api/cron/verify-links` to write ISO `lastVerifiedAt` and
    `updatedAt` values;
  - changed stale comparisons to parse both historical SQLite timestamps and
    new ISO timestamps through SQLite `unixepoch`;
  - documented the decision in
    `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`.
- Local verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - `rg` found no remaining `datetime('now')` writes under `apps/web/src`.
- GitHub:
  - pushed to `origin/main`;
  - GitHub Actions run `27165936753` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler because CI currently builds
    but does not deploy;
  - Cloudflare preview URL: `https://4bb0cf93.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 181 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/opportunities?page=2` returned 200 at about 97 KB;
  - `/directory` returned 200;
  - unauthenticated POST requests to `/api/cron/scrape`,
    `/api/cron/verify-links`, `/api/ingest`, and `/api/ingest-digest` all
    returned 401.
- D1 evidence:
  - active opportunity count at verification time: 672;
  - `unixepoch(scraped_at)`, `unixepoch(last_seen_in_feed_at)`, and
    `unixepoch(last_verified_at)` had 0 unparseable active rows;
  - read-only D1 query changed 0 rows.
- Remaining debt:
  - production table defaults still use SQLite `datetime('now')` as fallback;
  - historical timestamp backfill and any table-default rebuild remain P5 work.
- Accepted completion after this checkpoint: 35%.

### P2 Slice 1 - Query-Aligned Indexes

- Date: 2026-06-08
- Status: accepted
- Commit: `be3d646`
- Rebased local commit: `c255f17`
- Message: `feat: add query aligned opportunity indexes`
- Scope:
  - added migration `packages/db/migrations/0011_query_aligned_indexes.sql`;
  - added `active_posted_idx` on `(is_active, posted_at DESC)`;
  - added `category_active_posted_idx` on `(category, is_active, posted_at DESC)`;
  - added `active_last_verified_idx` on `(is_active, last_verified_at ASC)`;
  - aligned `packages/db/schema.ts`.
- Pre-migration evidence:
  - `PRAGMA index_list('opportunities')` showed only older indexes such as
    `active_scraped_idx`, `category_idx`, and `last_verified_idx`;
  - homepage query used `active_scraped_idx` plus `USE TEMP B-TREE FOR ORDER BY`;
  - category query used `category_idx` plus `USE TEMP B-TREE FOR ORDER BY`;
  - verifier query used `active_scraped_idx` plus `USE TEMP B-TREE FOR ORDER BY`.
- Verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - Migration workflow `27155847940` passed.
  - CI guardrail `27155847992` passed.
- Post-migration evidence:
  - `PRAGMA index_list('opportunities')` shows `active_posted_idx`,
    `category_active_posted_idx`, and `active_last_verified_idx`.
  - Homepage query uses `active_posted_idx` with no temp B-tree.
  - Category query uses `category_active_posted_idx` with no temp B-tree.
  - Verifier query uses `active_last_verified_idx` with no temp B-tree.
- Accepted completion after this checkpoint: 27.5%.

### P1 Product Surface And Homepage Payload

- Date: 2026-06-08
- Status: accepted
- Commit: `2475103`
- Message: `feat: add paginated opportunities board`
- Scope:
  - added `apps/web/src/pages/opportunities.astro`;
  - reduced homepage job payload from 500 rows to a 60-row preview;
  - made the homepage preview use `OpportunitySearch` without the search bar;
  - moved the global "Find a Job Now" CTA to `/opportunities`.
- Local verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - Local Astro dev server route smoke passed:
    - `/` returned 200;
    - `/opportunities` returned 200;
    - `/opportunities?page=2` returned 200;
    - `/opportunities?category=tech` returned 200;
    - `/directory` returned 200.
- GitHub:
  - pushed to `origin/main`;
  - GitHub Actions run `27141658140` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler because CI currently builds
    but does not deploy;
  - Cloudflare preview URL: `https://68b1259d.remotejobs-ph.pages.dev`;
  - public alias updated: `https://remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 183 KB;
  - `/opportunities` returned 200 at about 97 KB;
  - `/opportunities?page=2` returned 200 on preview;
  - `/directory` returned 200.
- Accepted completion after this checkpoint: 20%.

### Pause And Recovery Handoff

- Date: 2026-06-06
- Status: accepted
- Reason: user asked to stop everything for now and back up all progress/plans.
- Scope: docs-only handoff; no P1 implementation files changed.
- Commit: `431ab60`
- Message: `docs: add paused ai recovery handoff`
- Local verification: `git diff --check` passed with only normal Windows
  LF/CRLF warnings.
- GitHub Actions run: `27041163556`
- Result: success
- Evidence:
  - `docs/DOCS_INDEX.md`
  - `docs/HANDOFF.md`
  - `CLAUDE.md`
  - `docs/AI_RECOVERY_TRAIL.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/SYSTEM_SAVEPOINT.md`

### P0 Recovery Methodology

- Date: 2026-06-06
- Commit: `9657c4a`
- Message: `docs: adopt recovery-driven execution plan`
- Local verification: `git diff --check` passed with only normal Windows
  LF/CRLF warnings.
- GitHub Actions run: `27040684807`
- Result: success
- Evidence:
  - `AGENTS.md`
  - `docs/MASTER_EXECUTION_PLAN.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/AI_RECOVERY_TRAIL.md`
  - `docs/SYSTEM_SAVEPOINT.md`
  - `docs/decisions/ADR-001-recovery-driven-public-job-index.md`
- Accepted completion after this checkpoint: 5%.

### Major Audit Baseline

- Date: 2026-06-06
- Commit: `74c0416`
- Message: `docs: add major audit and agent instructions`
- GitHub Actions run: `27039365056`
- Result: success
- Evidence: `docs/major-audit-2026-06-06.md`

## Historical Next Task (superseded)

This older instruction is retained as history. It is superseded by the current
Source Perpetuity checkpoint at the top of this file. The prior text said to start from
`docs/gemini-masterplan-handoff-2026-06-13.md`, run
`git status --short --branch`, and implement one small vertical slice from the
masterplan. Prefer compact source-health history first unless fresh evidence
shows a higher-priority issue.

## Open Risks To Keep Visible

- Some sources may be public but not automation-friendly under their terms.
- Local direct D1 audit commands now work with Wrangler v4; keep using the
  command shapes documented in `docs/wrangler-d1-audit-2026-06-12.md`.
- ATS sources marked `needs_review` still need source-specific policy review
  before being considered fully compliant.
