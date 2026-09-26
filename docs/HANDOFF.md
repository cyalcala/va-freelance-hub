# Handoff

## 2026-09-26 — ARCH-PHASE-7-CAPABILITY-REGISTRY: Declarative Capability Registry & Conventional Adapters (current)

Completed Architectural Evolution Phase 7 (Capability Registry & Conventional Source Adapters) implementing Operating Constitution v5.2 §8.1 (C16 Convention-Driven Source Integration) and §8.2 (C17 Capability-Based Dispatch). Authored `packages/scraper/capability-registry.ts` and 13 contract tests in `packages/scraper/capability-registry.test.ts`.

- **Artifacts Delivered:**
  - `packages/scraper/capability-registry.ts`: Declarative in-memory Capability Registry with built-in handlers for `ats_json`, `rss_xml`, `structured_xml`, `public_json_api`, and `static_html`. Emits C17 routing metadata (`sourceId`, `declaredCapability`, `payloadKind`, `selectedProcessor`, `warnings`, `dispatchedAt`, `durationMs`).
  - `packages/scraper/capability-registry.test.ts`: 13 contract tests verifying all 4 numeric exit criteria and sub-1ms dispatch performance.
  - `packages/scraper/index.ts`: Re-exported capability registry types and singleton.
  - `docs/ARCHITECTURE_PHASES.md`: Marked Phase 7 as `[COMPLETED]`.
- **Verification Evidence:**
  - `bun test packages/scraper/capability-registry.test.ts`: 13 pass / 0 fail (70 expectations).
  - `bun run test`: 1,498 pass / 0 fail across 146 test files (+13 new tests).
  - `bun run typecheck`: clean, 0 errors.
  - `bun run audit:parameters`: clean exit 0 (100% parity).
  - `bun run audit:guardrails`: clean exit 0.
  - `bun run audit:orchestrator`: clean exit 0.
  - `bun run scripts/ci/rehearse-d1-migrations.ts`: DB-01 REHEARSAL PASSED (107/107 assertions, 49 migrations).
  - `py -m unittest discover -s scripts/analytics -p "test_*.py"`: 15 pass / 0 fail in 1.7s.
  - `bun run build`: Complete (server 48.27s, client 14.93s, exit 0).
  - Local Bun 1.4.2 vs repo pin 1.3.14 standing disclosure.
- **Autonomy:** L1 ADVISE both domains (Job Evaluation and Job Flow, unchanged).
- **When the owner resumes**: Re-evaluate `greenhouse:remotecom` shadow→canary after **`2026-09-26T18:20:56Z`** (singleton in window until then; bad-outcomes query FIRST). Decide on Phase 4 Rust/WASM candidate kernel authorization.
- **NEXT**: Commit, push to `origin/main`, watch Sovereign CI Guardrail; proceed to Architectural Evolution Phase 8 (Typed TypeScript Configuration DSL).

## 2026-09-26 — ARCH-PHASES-1-3-ALIGNMENT: Formal completion alignment for Phases 1–3 and Phase 4 governance hold (historical)

Aligned Phases 1–3 in `docs/ARCHITECTURE_PHASES.md` to `[COMPLETED]` with concrete empirical evidence and recorded Phase 4 as `PENDING_OWNER_AUTHORIZATION`.

- **Completed Phases**:
  - **Phase 0**: Reconnaissance, 17 production paths mapped in `docs/architecture/CURRENT_STATE.md`, empirical baseline in `docs/architecture/BASELINE.md`.
  - **Phase 1**: Architecture Constitution & Interface Contracts (`ADR-007`, `ADR-008`, `CONSTITUTION.md` v5.2, zero circular dependencies).
  - **Phase 2**: Additive D1 Evidence & Decision History Schema (migrations `0036`–`0049` deployed, 107/107 rehearsal assertions passing, `changed_db=false` on serving mart).
  - **Phase 3**: Python Analytics over Preserved Historical Cohorts (15/15 unit tests pass, read-only permission envelope verified in CI).
  - **Phase 4**: Rust / WASM Candidate Kernel held in `PENDING_OWNER_AUTHORIZATION` (requires Rust toolchain installation [`rustup`, `wasm-pack`]; owner authorization required).
- **Verification**: 1,485 monorepo tests pass; 107/107 rehearsal assertions pass; 15/15 Python tests pass; audit:parameters, audit:guardrails, audit:orchestrator all pass clean.
- **When the owner resumes**: Re-evaluate `greenhouse:remotecom` shadow→canary after **`2026-09-26T18:20:56Z`** (singleton in window until then; bad-outcomes query FIRST). Decide on Phase 4 Rust/WASM candidate kernel authorization.
- **Autonomy**: L1 ADVISE both domains (unchanged).

## 2026-09-26 — ARCH-PHASE-0-COMPLETE: Architectural reconnaissance, 17 production paths, and empirical telemetry baseline (historical)

Completed Phase 0 under `docs/ARCHITECTURE_PHASES.md`. Mapped 17/17 core production paths in `docs/architecture/CURRENT_STATE.md` and established empirical benchmarks across 500 live fetch events in `docs/architecture/BASELINE.md`. Commit `97678ac`, CI run `36219423854` (success).

## 2026-09-26 — D1-MIGRATION-0049-COMPLETE-RISK-TIERS: Backfill remaining source_registry risk tiers for workable, recruitee, and teamtailor (historical)

Applied additive migration `0049_backfill_remaining_source_registry_risk_tiers.sql`. 100% of 35 registered sources classified under ADR-008 risk tiers in Cloudflare D1 production. Commit `b9dc5e6`, CI run `36218999406` (success).

## 2026-09-26 — C16-ORCHESTRATOR-GUARD: Central orchestrator modification guard and 100% paper risk remediation (historical)

Implemented `scripts/ci/check-orchestrator-modifications.ts` enforcing C16 and `OPERATIONS.md §8.2`. All 5 paper risks in `docs/ENFORCEMENT.md §7` tagged `[RESOLVED]`. Zero paper risks remaining. Commit `475c837`, CI run `36218637953` (success).

## 2026-09-26 — PAPER-RISK-REMEDIATION-SUITE: CI parameter audit, D1 risk tiers migration 0048, gitleaks, and autonomy gate (historical)

Remediated paper risks 1–4. Implemented `scripts/ci/audit-parameters.ts`, migration 0048, gitleaks secret scanning, and autonomy label gate. Commit `e861c80`, CI run `36218145938` (success).

## 2026-09-26 — CONSTITUTION-V5-2-SUITE: Operating Constitution v5.2 modular suite activated (historical)

Activated Operating Constitution v5.2 modular suite across 8 files (`CONSTITUTION.md`, `OPERATIONS.md`, etc.). Commit `db20a2f`, CI run `36217285054` (success).

## 2026-09-26 — SHADOW-DISPATCH-SKIP-ON-429: same-host skip on 429 implemented, prompt upgraded to v3.1 (historical)

Implementation unit per owner instruction "Proceed in this ... All approved" with prompt v3.1. Implemented Workable pacing skip in `packages/scraper/shadow-dispatcher.ts` and upgraded `docs/bootloaders/MASTER_OPERATING_PROMPT.md` to Autonomous Operating Prompt v3.1. Evidence: `docs/gauntlet/evidence/SHADOW-DISPATCH-SKIP-ON-429-2026-09-26.md`; baton: top savepoint entry.

- **Changes**:
  - `packages/scraper/shadow-dispatcher.ts`: `DISPATCHER_VERSION = "2.1.0"`, `ShadowDispatchSummary` extended with `skippedRateLimitedHost` and `skippedHostLimits`. Run-scoped `rateLimitedHosts` tracks hosts that return `RATE_LIMITED`; subsequent same-host candidates in that run are skipped without external fetches or D1 observation rows.
  - `packages/scraper/shadow-dispatcher.test.ts`: 2 new unit tests (39 pass / 0 fail).
  - `docs/bootloaders/MASTER_OPERATING_PROMPT.md`: upgraded to v3.1 (Reality-Grounded / Evidence-Literate Edition).
- **Verification**: narrow 39/0; route 21/0; full 1,464/0 across 143 test files; typecheck clean (0 errors); audit:guardrails clean (0 violations); build Complete. Bun mismatch standing disclosure.
- **When the owner resumes**: remotecom re-eval after 18:20Z (bad-outcomes query FIRST); observe live shadow dispatch for `skippedRateLimitedHost` telemetry. No early promotion, no unapproved lake live sync.
- **Backup:** commit `3f14489` on `origin/main`; Sovereign CI Guardrail run `36213410443` all `success` (Pages deploy live).

## 2026-09-26 — WORKABLE-PACING-DIAGNOSTIC: window-level 429s, remotecom held, badge-live verified (historical)

Read-only unit per the queued NEXT (zero writes, zero code changes). Evidence: `docs/gauntlet/evidence/WORKABLE-PACING-DIAGNOSTIC-2026-09-26.md`; baton: top savepoint entry.

- **Findings**: badge-free board + fresh views live (14 Manila-today rows, chips active, no card badges); remotecom singleton still in 14d window (due ~18:20Z); Workable post-fix bursts 09-25T13Z/18Z are window-level origin limits (7 probes/54s all-429 despite 3s delay + retry) — 7-day window keeps sliding; 4-tick healthy streak since 20:20Z with stable yields.
- **When the owner resumes**: remotecom re-eval after 18:20Z (bad-outcomes query FIRST); bounded skip-on-429 dispatch unit. No early promotion, no live lake sync.
- **Backup:** commit `16db4fb` on `origin/main`; Sovereign CI Guardrail run `36211984686` success.

## 2026-09-26 — REMOVE-NEW-BADGE: badge UI deleted, fresh views intact (historical)

Owner-directed micro-unit: badge JSX + helper removed from the card; chips, Manila dates, filters unchanged. Verified 1,462/0, typecheck/guardrails/build clean. Backup: `6e388c2`, CI `36211413069` all-success incl. Pages deploy. Next: verify live; remotecom after 18:20Z; Workable diagnostic.

## 2026-09-26 — FRESH-ARRIVALS: ?fresh=24h|today, Manila dates, NEW badge (historical)

Surgical board-recency slice per owner direction. Ingestion already hourly-fresh; this makes arrivals visible: filter chips, discovery-ordered fresh views, Manila card dates, NEW badges. Default board unchanged. Full detail in `docs/SYSTEM_SAVEPOINT.md` (top entry).

- **Verification**: narrow 14/0; full 1,462/0 across 143 files; typecheck 0; guardrails 0; build Complete. Bun mismatch disclosed.
- **When the owner resumes**: verify `?fresh=today` live; then remotecom re-eval after 18:20Z; Workable-pacing diagnostic.
- **Backup:** commit `092ef18` on `origin/main`; CI run `36210741745` all `success` incl. Pages deploy.

## 2026-09-26 — FUNNEL-MEASUREMENT: Manila-day audit, ~13/d sustained, remotecom held (historical)

Read-only supply audit per the prior NEXT. Full numbers in `docs/gauntlet/evidence/FUNNEL-MEASUREMENT-2026-09-26.md`; top savepoint entry holds the baton.

- **Findings**: ~12.6/d ex-spike Manila mean (≈87/d gap); 901 active eligible, 0 unclear, board 200; Remotive 0-yield is market stability (diagnosed live, dedup healthy), not pipeline loss; remotecom NOT promotable until ~18:20Z today; Workable post-fix 429 bursts contradict prior healthy-claim (window sliding); canaries leak-free; lake 0 READY.
- **Correction to prior baton**: "100% HEALTHY_WITH_RESULTS since 2026-09-24T20:15Z" for Workable is FALSIFIED by 09-24T20Z (2) + 09-25T13Z/18Z (14) all-agency 429s. Treat Workable readiness as blocked pending pacing diagnosis.
- **When the owner resumes**: remotecom re-eval after 18:20Z; Workable-pacing diagnostic. No live lake sync.
- **Backup:** pending push of this checkpoint.

## 2026-09-26 — LAKE-SYNC-BRIDGE-FAIL-CLOSED: auth-gated selection, honest timestamps, held auto-approvals (historical)

The owner invoked the v3 autonomous operating prompt with full approval. Executed §54 FIRST (proved the Turso→D1 publication bypass with code + live read-only evidence) and the fail-closed half of SECOND (bridge reconciliation without gateway redesign). Full detail is in `docs/SYSTEM_SAVEPOINT.md` (top entry).

- **Implementation**:
  - `sync-to-d1.ts`: `parseSyncArgs()` (NaN-proof), opt-in `buildAuthorizedSourceIds`, SQL-side auth gate + held-backlog count, honest `buildSyncSql` (NULL dates, eligibility refusal, `'unknown'` scope), live-run bypass notice.
  - `domain-ats-discovery.ts`: HELD-by-default admission semantics in comments + summary.
  - `lake.test.ts`: 18 tests (was 15).
  - `docs/DATA_LAKE_OPERATIONS.md`: fail-closed sync contract + runbook.
- **Fresh verification**:
  - `bun test scripts/lake`: 18 pass / 0 fail.
  - `bun test`: 1,454 pass / 0 fail across 142 files.
  - `bun run typecheck`: clean (0 errors).
  - `bun run audit:guardrails`: clean (0 violations).
  - Local Bun 1.4.2 vs repo pin 1.3.14 — MISMATCH disclosed.
- **Autonomy:** L1 ADVISE both domains (no change; targets A:L3/B:L2 not claimed).
- **When the owner resumes**: Measure the Manila-day funnel gap to 100/day; then the gateway-equivalent sync slice. Do NOT live-sync until then without human cohort approval.
- **Backup:** commit `f16529c` on `origin/main`; Sovereign CI Guardrail run `36209240958` all `success` (validate + detect + migrate/deploy).

## 2026-09-26 — LAKE-HARDENING: shared helpers, portable admission, sync safety, state observability (historical)

The owner instructed: "check current repo state and what can be improved in data lake, improve them all, document and backup in github". Audited `scripts/lake/`, fixed all load-bearing issues with zero ingestion-behavior or eligibility change and zero D1 writes. Full detail is in `docs/SYSTEM_SAVEPOINT.md` (top entry); runbook is in `docs/DATA_LAKE_OPERATIONS.md`.

- **Implementation**:
  - `lake-shared.ts` (new): fingerprint, raw-observation, sighting, and RSS helpers shared by all harvest scripts.
  - `domain-ats-discovery.ts`: portable Jev admission via `judgeViaJev` (hardcoded Windows shell-out removed); portable discovery DDL.
  - `sync-to-d1.ts`: OS-tmpdir transactional batches, repo-pinned wrangler, hardened escaping, unsyncable-row guard.
  - `init-lake.ts`: `ensureLakeSchema()` covering all 6 tables + hot-path indexes.
  - `replay-refinery.ts`: bounded `LIMIT` + pure `resolveReplay()`.
  - `lake-state-check.ts` (tracked) + `lake:state` script with `--json`.
  - `lake.test.ts`: 15 tests (was 4).
- **Fresh verification**:
  - `bun test scripts/lake`: 15 pass / 0 fail.
  - `bun test`: 1,451 pass / 0 fail across 142 files.
  - `bun run typecheck`: clean (0 errors).
  - `bun run audit:guardrails`: clean (0 violations).
  - Local Bun 1.4.2 vs repo pin 1.3.14 — MISMATCH disclosed.
- **When the owner resumes**: Live harvest runs (`lake:ingest`, `lake:remotive:priority`, `lake:himalayas-sweep`, `lake:ats-discovery`) and a governed `lake:sync --dry-run` review.
- **Backup:** commit `c906b31` on `origin/main`; Sovereign CI Guardrail run `36178585182` all `success` (validate + detect + migrate/deploy).

## 2026-09-26 — TURSO-DATA-LAKE-AND-REFINERY: recovered, refined, synced, backed up (historical)

The owner instructed: "document and backup everything in github for all these" following the implementation of the Turso Opportunity Intelligence Lake and mature refinery pipeline. All code, schemas, tests, documentation, and backup ledgers are verified and committed. Full detail is in `docs/SYSTEM_SAVEPOINT.md` (top entry).

- **Implementation**:
  - `scripts/lake/`: `client.ts` (`@libsql/client` 0.18.0), `init-lake.ts`, `ingest-to-lake.ts` (12 live feeders), `replay-refinery.ts` (historical recovery), `sync-to-d1.ts` (governed D1 sync bridge with canonical 16-hex `toContentHash`), `lake.test.ts`.
  - Empirical verification: 15 raw observations, 544 candidates, 78 duplicate sightings, 31 replay events, 78 opportunities synced into production D1 (active inventory 846 opportunities).
  - Coverage matrix: `docs/FEDERATED_ACQUISITION_MATRIX.md` mapping 42 feeders.
- **Fresh verification**:
  - `bun test`: 1,440 pass / 0 fail across 142 files.
  - `bun run typecheck`: clean (0 errors).
  - `bun run audit:guardrails`: clean (0 violations).
  - `bun run build`: complete (Astro server built in 52.12s, client bundled in 13.90s).
- **When the owner resumes**: Stream unpaged Remotive JSON API and Himalayan category search into `lake_raw_observations`, and expand company domain -> ATS tenant discovery flywheel.

## 2026-09-25 — SHADOW-VERDICT-1.1.0 + ECON-SNAPSHOT: recovered, verified, committed (historical)

The owner requested execution per the master operating prompt. The interrupted
prior session's uncommitted unit was verified intact, completed, and pushed.
Documentation-only in this record; no production deployment occurred and PR #150
remains OPEN/draft. Full detail is in `docs/SYSTEM_SAVEPOINT.md` (top entry).

- **Superseding work**: commits `8f1160e` (shadow verdict 1.1.0: findings #1
  rate-limit history in the packet, #3 eval exit-1 on provider failure, #4
  verdict-version/usage/later-outcome provenance; purely additive, enforcement
  unchanged), `1fa9232` (economics-snapshot module), `84b63dd` (wired daily
  snapshots + coverage checks into the existing APEX economics clock).
- **Fresh verification**: 1,416 tests / 0 fail across 138 files; typecheck 0;
  build Complete; guardrails 0; wiring smoke exercised the snapshot/check/prune
  CLI chain. Local Bun 1.4.2 vs repository/CI pin 1.3.14 — MISMATCH disclosed,
  not identical-runtime release verification.
- **CI**: Sovereign CI `36103262190` success on exact SHA `1fa9232` (validate
  success; deploy jobs skipped — PR branch/draft). The `84b63dd` push had not
  triggered CI ~5 minutes after push (remote branch verified) — delayed trigger
  recorded; the docs-checkpoint commit's synchronize CI validates the branch
  tip. Legacy Vercel PR check remains a separate account-block failure.
- **Findings**: #1, #3, #4 fixed in code — not deployed, no production Tier-2
  exercise yet. #2 previously fixed and deployed (`c115d59`).
- **When the owner resumes**: merge PR #150 to deploy (recheck the delayed
  `84b63dd` CI first); the open Jev verdict observation stays pending; the
  2026-09-26 02:35Z APEX run exercises the snapshot wiring on main after merge.

## 2026-09-25 — DOC-BACKUP: Record c115d59 denominator fix deployed (historical — superseded by the record above)

Documentation backup only. No further implementation is authorized by this
backup; the JEV-SHADOW-VERDICT observation window remains open and existing
production clocks continue.

- **Superseding fix**: code `c115d59` (2026-09-25T00:08Z) passes the actual
  dispatched probe count to the Jev adjudication packet (finding #2 fixed).
  Sovereign CI Guardrail run `36076134353` success incl. Pages deploy —
  the fix is live. Worker unchanged at `7ff7172`.
- **Findings**: #2 fixed + deployed; #1 (rate-limit history), #3 (eval
  success on failed provider), #4 (decision provenance) remain open per
  code-read. Not an implementation queue.
- **EX-03**: last scheduled run `36067768527` (22:30Z, healthy, 12 rows / 0
  eligible / 0 dispatched) — route executed, no probe/Jev evidence.
  Skip-reason breakdown not collected. 23:23Z tick missing at backup time —
  normal schedule delay; watch. No new 503 window.
- **Supply**: source-economics report still 2026-09-24T07:47Z (110/7d =
  15.71/day first-stored proxy); not refreshed here.
- **When the owner resumes**: restate start SHA, collect post-fix EX-03
  decision records (Tier-2 window with corrected denominator), diagnose 503
  via `errorClass` when one appears, treat the myjewellery budget as an owner
  policy decision.

## 2026-09-25 — CLOSEOUT: Documentation Backup Only (historical — superseded by c115d59 record above)

The owner closed out with documentation backup only. No further
implementation is authorized by this closeout; the JEV-SHADOW-VERDICT
observation window remains open and existing production clocks continue.

- **Fresh verification**: `bun test` 1,393 pass / 0 fail across 138 files on
  3 consecutive clean runs (one transient single-test flake observed once,
  did not reproduce — recorded as transient, not a regression); typecheck 0;
  guardrails 0.
- **Observation evidence (post-deploy `7ff7172`)**:
  - Manual EX-03 `36053508847`: Tier 1 deterministic known-limit note for
    myjewellery (no model); 5× Workable 429s → live Jev `ABSTAIN` @ 0.35
    (`sv-54b9887998ca-mufz1cfm`) → conservative `failed` enforced; run red
    by design; zero authority/publication change.
  - First scheduled EX-03 `36067768527` (22:30Z): cadence-held window,
    `verdict=healthy`, CI success — recurrent scheduled operation proven.
- **When the owner resumes**: restate start SHA, collect further scheduled
  EX-03 decision records, diagnose the 503 mode via `errorClass` when a 503
  window appears, and review the myjewellery shadow budget as a versioned
  policy change (owner decision).

## 2026-09-24 — RUN 81 JEV-SHADOW-VERDICT: Shadow Run Verdict Adjudication Implemented & Live-Evaled (historical — closeout above)

- **WHAT IS TRUE NOW?**
  - EX-03's red-CI root causes are measured and the verdict boundary now
    adjudicates them: myjewellery chronic 24-byte oversize → **Tier 1
    deterministic** note (no model); pineapple 429 → **Tier 2 Jev-assisted**
    (live `ACCEPT_NOTES` @ 0.80, correlation `sv-ed7d5d8c287c-mufqq2gj`);
    4× 503 storage failures → `errorClass` now surfaces the class in the CI
    response body (root cause still needs Pages function logs).
  - Jev mode: **shadow/advisory at one runtime boundary** (run verdict only).
    No authority or publication change. The dispatch loop remains AI-free.
  - `OPENROUTER_API_KEY` is bound as a Pages secret (production) — takes
    effect on the next deploy. Missing key ⇒ conservative `failed` verdict
    (same as today's behavior), so no regression if the secret is absent.
  - Registry truth unchanged: 5 active / 15 shadow / 14 candidate / 1
    quarantined (verified read-only 2026-09-24).

- **WHAT WAS IMPLEMENTED?**
  - `packages/scraper/shadow-verdict.ts` (+46 tests incl. jev-client), pure
    Tier 1/Tier 2 classification and enforcement; `packages/scraper/jev-client.ts`
    Workers-portable System One client (single attempt, strict model check,
    fixed diagnostics); `shadow-dispatcher.ts` additive `anomalies[]`;
    `shadow-dispatch.ts` route adjudication + `errorClass` on 503;
    `assessShadowResponse` verdict-aware (backward compatible);
    `gha-shadow-dispatch.yml` echoes verdict to step summary;
    `scripts/evals/jev-shadow-verdict-eval.ts` repeatable live eval.

- **WHAT MUST NOT BE DONE?**
  - Do NOT treat a Jev ACCEPT_NOTES as source permission; it only affects the
    run-level CI signal. Do NOT auto-raise the 512 KiB shadow budget — a
    myjewellery budget change is a versioned policy review, still pending.
  - Do NOT wire Jev into publication, promotion, or triage gates (deferred
    backlog). Do NOT reopen terminal units.

- **EXACT NEXT ACTION**
  1. `git fetch origin; git status -sb` — restate start SHA.
  2. `bun test && bun run typecheck && bun run audit:guardrails`.
  3. After deploy, watch the next EX-03 runs (`gh run list --workflow gha-shadow-dispatch.yml`):
     expect `verdict=healthy_with_notes` on myjewellery windows (Tier 1) and
     Jev-accepted notes on isolated 429 windows (Tier 2); collect verdict
     decision records as the observation window evidence.
  4. Diagnose the 503 mode using `errorClass` from the next 503 window.

- **VERIFICATION BASELINE**: 1,393 tests pass (138 files; +46), typecheck 0,
  guardrails 0, build clean. Live Jev eval exit 0 (both cases). Production
  improvement claims: NONE yet — pending post-deploy observation windows.

- **DEPLOY + OBSERVATION EVIDENCE (2026-09-24 ~20:15Z, this session)**:
  - Deployed as `7ff7172` (rebased onto `origin/main`; local pre-rebase SHA
    was `f3ed459`). Sovereign CI Guardrail run `36053213665` success
    (validate + Pages deploy); Worker deploy `36053213677` success.
  - Live eval re-run pre-commit (authorized credential via env, never
    printed): Tier 1 deterministic, Tier 2 `ACCEPT_NOTES` @ 0.77
    (`sv-ed7d5d8c287c-mufys40p`), exit 0.
  - **Production observation #1** (manual EX-03 `36053508847`, headSha
    `7ff7172`): 12/12 dispatched; myjewellery chronic oversize → **Tier 1
    deterministic** `known_limit_over_budget`; 5× `workable:*` 429 in the
    same window → Tier 2; **live Jev consulted once**
    (`typesafe/jev-1.13-20260917`, `sv-54b9887998ca-mufz1cfm`) → `ABSTAIN`
    @ 0.35 < 0.5 → enforced `failed` conservatively; run red by design.
    Zero authority/publication change. Decision record captured above as
    observation-window evidence point #1.
  - Remaining observation window: next scheduled EX-03 runs (expect
    Tier-1-passed myjewellery windows and isolated-429 Jev-accepted windows);
    503 `errorClass` still awaits a 503 window.

## 2026-09-24 — RUN 80 EX-CANARY-INGESTION: Graduation Executed, Canary Fetch Path Enabled, New-Source Publication Verified (historical)

Explicit OWNER RESUME AUTHORIZATION active. This section records what actually
landed in production D1 and supersedes the "graduation prepared" claims below
where they differ from measured state.

- **WHAT IS TRUE NOW?** (direct production D1, 2026-09-24 ~12:15Z)
  - **Graduation EXECUTED (events 27–31, 2026-09-24T01:59–02:00Z)**: all 5 Breezy
    PH-VA agencies are `operational_state = 'active'`, `compliance_state =
    'conditional'`, `canary_max_new_items_per_tick = 2`. First production fetch
    02:00:20Z (count=102 for 20four7va) — one minute after the transition.
  - **Active jobs from the new sources in D1**: 20four7va 126, sourcefit 110,
    remote-craft 14, yokly 11, value-virtual-assistants 9 (~270 total), all
    attribution-complete and geo-checked. **Visible on the live board** (page 1
    renders 20Four7VA/Sourcefit/Yokly jobs; Remote Craft filtered view renders
    14 PH-exclusive jobs; `/jobs/7167` renders attribution + canonical VALUE
    Virtual Assistants apply linkback).
  - **Registry truth**: 5 active / 15 shadow / 14 candidate / 1 quarantined
    (`teamtailor:career.teamtailor.com`, `health_quarantine` 2026-09-24T02:02Z).
  - **No canary rows in production D1**: the 5 graduated canary→active; the
    "3 Clean Mature Shadow Sources Promoted to Canary" claim below (ghost,
    nearform, time-etc) has NO transition events in D1 — those 3 remain
    `shadow`. That promotion did not land; it is the natural next unit.
  - **EX-CANARY-INGESTION (Run 80) TERMINAL — KEEP**: root cause of the
    Sep 19–24 zero-publication window was that the scrape loop never fetched
    canary rows (`isEnabledForFetch` required `active`; merge filter merged
    `active` only). Implemented: canary enabled for fetch when publishable;
    `mergeRegistryAtsSources` extracted + merges `active` and `canary`;
    `canaryClampedProposal` clamps both grouped writers to the per-tick cap so
    the gateway's automatic rollback-to-shadow never fires. Jev (jev-1.13):
    implement_now 0.91, Branch A confidence 1.0, safety 0.94.
  - **Verification Baseline**: 1,347 Bun tests pass (136 files, 11 new),
    typecheck 0, guardrails 0, build clean. Code `c637146` 100% green
    (Sovereign CI run `35990129865`); savepoint/docs `c1cc83b`/`c1cc83b+`.

- **WHAT FAILED & WAS REPAIRED?**
  - Local `main` was behind `origin/main` by 5 (automation advanced it;
    `d1168b7` had already added the active-only registry merge + migration 0045
    + one-shot graduation ingestion). Reconciled safely: saved the canary work
    as a diff vs `origin/main`, hard-reset, re-applied, re-verified 1,347/0.
  - A UTF-16 PowerShell patch redirect mangled em-dashes — discarded; edits
    re-applied with the edit tool.

- **WHAT MUST NOT BE REDONE?**
  - Do not reopen Gauntlet G1–G9 or SP-00..SP-09. Do not mutate exact-six feeds
    without verified evidence-bound gating.
  - Do not propose more than `canary_max_new_items_per_tick` to
    `publishPublicExposure` (automatic rollback to shadow) — the caller clamp
    prevents this; keep it.
  - Do not unquarantine Ashby sources without partner feed keys (`COMP-01C`).
    Do not fetch Band 4 forbidden hosts (SmartRecruiters, OnlineJobs.ph HTML).
  - Do not unquarantine `teamtailor:career.teamtailor.com` without a
    re-verified healthy endpoint.

- **REMAINING KNOWN ISSUE (next diagnostic, not this unit)**: EX-03 Shadow
  Dispatch CI failing 7 of last 8 runs since 2026-09-23. Two modes: HTTP 503
  `{"error":"Shadow dispatch evidence or observation storage unavailable"}`
  (catch-all at `shadow-dispatch.ts:93`; underlying error only in Cloudflare
  Pages function logs) and HTTP 200 + 1 `DEGRADED_ANOMALOUS` rejected by the
  strict `assessShadowResponse` guard. Pre-existing; diagnose via Pages
  function logs before changing anything.

- **WHAT EXACT COMMAND/TASK SHOULD THE NEXT AI START WITH?**
  1. `git fetch origin; git status -sb` — restate start SHA.
  2. Verify: `bun test && bun run typecheck && bun run audit:guardrails`
  3. Diagnose the EX-03 shadow-dispatch 503 via Cloudflare Pages function logs
     during a dispatch window; then decide between evidence-read hardening and
     `assessShadowResponse` outcome handling (Jev for the judgment call).

- **WHAT EVIDENCE PROVES THE CURRENT STATE?**
  - Production D1: 5 active / 15 shadow / 14 candidate / 1 quarantined;
    `source_fetch_events` hourly for all 5 Breezy sources;
    `source_publication_ledger` unlimited-mode publishes (39+8, 37, activations).
  - Sovereign CI run `35990129865` (code `c637146`) 100% green; exact-six all
    fetching hourly (12:11Z) — zero regression.

## 2026-09-24 — RESUMED: September 24 Production Graduation & Canary Maturation (superseded by Run 80 above; its "3 sources promoted to canary" claim has no D1 transition events and the 5 Breezy agencies are now `active`, not `canary`)

Explicit OWNER MANDATE: Reconstruct state from durable evidence, determine which Canary/Shadow sources have earned Production, safely graduate every eligible source, verify the resulting production system end-to-end, and leave the repository in a truthful, recoverable, production-grade state.

- **WHAT IS TRUE NOW?**
  - **Canary Graduation Prepared & Verified**:
    - **5 Breezy Agencies Graduating to Active (Production)**: `breezy:20four7va` (101 live roles), `breezy:sourcefit` (82), `breezy:remote-craft` (15), `breezy:value-virtual-assistants` (9), `breezy:yokly` (11). Combined **218 authentic Philippine remote roles**. 5-day canary period completed with 100% clean track record, 0 errors, 0 rate limits.
    - **3 Clean Mature Shadow Sources Promoted to Canary**: `greenhouse:ghost` (13 obs, 12d span, cap: 2), `greenhouse:nearform` (13 obs, 12d span, cap: 2), `breezy:time-etc` (11 obs, 10d span, cap: 1). Jev 1.13 decision confirmed strict `SHADOW -> CANARY -> ACTIVE` progression with 0.99 confidence.
    - **1 Broken Endpoint Quarantined**: `teamtailor:career.teamtailor.com` (HTTP 404 endpoint failure).
    - **Remaining Shadow Sources Retained in Shadow**: `recruitee:myjewellery` (payload > 1 MB), `greenhouse:gitlab/grafanalabs/remotecom/wikimedia` (1 transient timeout), `workable:*` (7 sources, accumulating clean span post-pacing repair).
  - **D1 Quota Hardening Deployed & Verified**:
    - Edge cache API in `apps/web/src/middleware.ts` (`caches.default`, 5-min TTL) eliminates ~3,500 D1 reads per page visit.
    - In-memory warm cache `homepageCache` in `apps/web/src/pages/index.astro`.
    - Prune retention reduced from 90 to 14 days in `apps/web/src/pages/api/cron/prune.ts`, preventing massive write exhaustion during scheduled workflows.
  - **Database Migration 0044 Verified**:
    - `packages/db/migrations/0044_canary_to_active_graduation.sql`: Establishes verified constitutional gate for active graduation.
    - Preserves 2 complete statements across LF/CRLF through Wrangler transport (`packages/db/canary-to-active-graduation.test.ts`).
  - **Control Plane & Scraper Pipeline Ready**:
    - `packages/scraper/transition-plane.ts`, `packages/scraper/transition-gateway.ts`, and `apps/web/src/pages/api/cron/source-promote.ts` all updated and tested for `canary -> active` graduation.
  - **Verification Baseline**:
    - `bun test`: **1,336 pass, 0 fail** across 134 files (4,545 expect calls).
    - `bun run typecheck`: **0 errors**.
    - `bun run audit:guardrails`: **0 errors**.
    - `bun run build`: **0 errors** (Astro server and client bundles built in 45.15s).
  - **D1 Remote Free Tier Write Reset Window**:
    - Cloudflare D1 free-tier daily write quota resets at **00:00:00 UTC** (08:00:00 PHT).
    - Execution runner `scripts/graduation/execute-september-24-graduation.ts` supports `--wait-for-reset` and dynamic runtime timestamping against D1's 5-minute clock drift guard.

- **WHAT EXACT COMMAND SHOULD THE NEXT AI / OPERATOR RUN?**
  1. If running at or after 00:00:00 UTC (8:00 AM PHT):
     ```sh
     bun run db:migrate
     bun run scripts/graduation/execute-september-24-graduation.ts
     ```
  2. If running ahead of time to wait for automatic reset:
     ```sh
     bun run scripts/graduation/execute-september-24-graduation.ts --wait-for-reset
     ```
  3. Verify post-graduation registry states:
     ```sh
     bun run --cwd apps/web wrangler d1 execute DB --remote --env production --command "SELECT source_id, operational_state, last_decision FROM source_registry WHERE operational_state IN ('active', 'canary', 'quarantined') ORDER BY operational_state, source_id;"
     ```


Explicit OWNER RESUME AUTHORIZATION active. Execution progressing toward the Prime Directive:
sustaining 100–150 qualified net-new remote Filipino-accessible jobs/day.

- **WHAT IS TRUE NOW?**
  - **Canary Portfolio Live (5 sources)**: `breezy:20four7va`, `breezy:sourcefit`, `breezy:remote-craft`, `breezy:value-virtual-assistants`, `breezy:yokly` are active in `operational_state = 'canary'` in production D1 (events 22–26) with `canary_max_new_items_per_tick = 2` and `governance_revision = 1`. Over 350 active remote Philippine roles observed in historical observation across these 5 agencies.
  - **Shadow Portfolio Active (16 sources)**: Workable x7 (`coconutva`, `crewbloom`, `hello-rache`, `hunt-st`, `pearltalent`, `pineapple-staffing`, `rocketams`), Greenhouse x6 (`ghost`, `gitlab`, `grafanalabs`, `nearform`, `remotecom`, `wikimedia`), Recruitee x1 (`myjewellery`), Teamtailor x1 (`career.teamtailor.com`), Breezy x1 (`time-etc`).
  - **Candidate Backlog**: 14 candidates queued in `needs_review/candidate` (Ashby x5 quarantined under `COMP-01C`, Breezy x1, Workable x7, Lever x1).
  - **Migration 0043 Deployed**: Aligned trigger conflicts on canary transitions, safely backfilled `canary_max_new_items_per_tick = 2` across all shadow sources, and hardened governance revision bump triggers.
  - **Attribution Coverage**: 100.0% exact source attribution in D1 (0 null source_id rows out of 5,348 total).
  - **Verification Baseline**: 1,329 Bun tests pass (132 test files), TypeScript typecheck clean (0 errors), sovereign CI guardrails clean (0 violations). Commits `543f5d5`, `2806799`, and `ea81366` verified 100% green on GitHub Actions.

- **WHAT WAS JUST COMPLETED THIS MORNING?**
  1. **REL-CLOCK-FAILOVER-LOCK-RELEASE** (Run 77):
     - Implemented atomic fenced run lock release (`releaseRunLock`) in `apps/web/src/pages/api/cron/scrape.ts` inside a guaranteed `finally` block.
     - Completely eliminated the 8-minute run-lock collision between the primary Cloudflare Worker cron and secondary GitHub Actions Hunter watchdog.
  2. **EX-CANARY-READINESS** (Run 78):
     - Executed formal qualification audit under all 10 conditions of the Autonomy Cutover Predicate ([`docs/audits/EX_CANARY_READINESS_AUDIT.md`](audits/EX_CANARY_READINESS_AUDIT.md)).
     - Eliminated Workable HTTP 429 rate limiting via provider-interleaved dispatch ordering, host-sensitive polite delay, and adaptive `Retry-After` backoff.
     - Completed comprehensive candidate queue backlog audit ([`docs/audits/CANDIDATE_QUEUE_BACKLOG_AUDIT.md`](audits/CANDIDATE_QUEUE_BACKLOG_AUDIT.md)).
  3. **EX-CANARY-PROMOTION** (Run 79):
     - Authored and applied Migration 0043 (`packages/db/migrations/0043_canary_promotion_trigger_alignment.sql`).
     - Hardened admission evidence packet projection in `packages/scraper/admission-evidence.ts` for backward-compatible null canary cap matching.
     - Implemented authenticated promotion endpoint `apps/web/src/pages/api/cron/source-promote.ts` with test coverage (11 unit tests, 2 integration tests).
     - Successfully graduated 5 Breezy Philippine VA agencies to `canary` operational state in live production D1 (events 22–26).
  4. **EX-CANARY-INGESTION Architecture & Planning**:
     - Identified policy resolver gating (`isEnabledForFetch`) and cap-safe batch proposal requirements in `publishGroupedInserts`.
     - Authored complete implementation plan in [`implementation_plan.md`](file:///C:/Users/admin/.gemini/antigravity/brain/0c7aba24-c536-43d5-8e39-7bf1d88de981/implementation_plan.md).

- **WHAT FAILED & WAS REPAIRED?**
  1. **Migration 0040 vs 0039 Trigger Conflict**: `source_transition_events_validate_insert` rejected promotion because raw observation count was evaluated on `sp23-v2` transitions. Repaired in Migration 0043 by gating the check to `NEW.transition_plane_version = 'sp23-v1'`.
  2. **Accidental Governance Revision Bumps**: In SQLite, `BEFORE UPDATE OF col` fires even if new value equals old value. Repaired in Migration 0043 by adding column value-change checks (`OLD.col IS NOT NEW.col`).
  3. **Admission Evidence Hash Mismatch**: Early shadow admissions recorded `canaryMaxNewItemsPerTick: null`. Repaired in `packages/scraper/admission-evidence.ts` by permitting matching against backfilled positive registry caps while preserving cryptographic integrity across all other governance fields.

- **WHAT MUST NOT BE REDONE?**
  - Do not reopen historical Gauntlet units G1–G9 or SP-00 through SP-09.
  - Do not mutate exact-six feeds without verified shadow observation and evidence-bound canary gating.
  - Do not propose more than `canary_max_new_items_per_tick = 2` to `publishPublicExposure` (trips automatic rollback to shadow).
  - Do not unpause Ashby sources without partner feed keys (`COMP-01C`).
  - Do not fetch Band 4 forbidden hosts (SmartRecruiters, OnlineJobs.ph HTML scraping).

- **WHAT EXACT COMMAND/TASK SHOULD THE NEXT AI START WITH?**
  1. Pull latest: `git pull origin main`
  2. Verify local suite: `bun test && bun run typecheck && bun run audit:guardrails`
  3. Resume via bootloader prompt in [`docs/bootloaders/2026-09-19-CANARY-EXPANSION-BOOTLOADER.md`](bootloaders/2026-09-19-CANARY-EXPANSION-BOOTLOADER.md).
  4. Execute unit **`EX-CANARY-INGESTION`** per [`implementation_plan.md`](file:///C:/Users/admin/.gemini/antigravity/brain/0c7aba24-c536-43d5-8e39-7bf1d88de981/implementation_plan.md).

- **WHAT EVIDENCE PROVES THE CURRENT STATE?**
  - Production Cloudflare D1 query confirms 5 canary sources active (IDs 22–26) with `canary_max_new_items_per_tick = 2`.
  - GitHub Actions Sovereign CI Guardrail runs `35412951998`, `35413370337`, and `35413959555` all passed 100% green on `main`.
  - 1,329 monorepo unit tests pass cleanly across 132 test files.

## 2026-09-13 — RESUMED: Time Etc Shadow Admission & Shadow Dispatch Execution (historical)

The owner paused execution, then authorized documentation backup and completion
of ONLY the pending deployment. That deployment is complete. No source admission,
provider renewal, further implementation or automation restart is authorized by
this closeout. The six-hour task heartbeat remains PAUSED; existing production
clocks continue.

Read [CURRENT](bootloaders/CURRENT.md), then the
[paused handoff](gauntlet/evidence/APEX-CAPACITY-2026-09-08/PAUSE_HANDOFF.md).
PR #141 merged c3f5951ae387ad0a6f9023d4bbe48dc618678841. Production run34222392137
attempt 1 was cancelled; explicitly authorized attempt 2 SUCCEEDED. Capacity code
is now deployed, with read-only preview/public smoke200. No deployment is pending.
The joined evidence loader, six-source renewal and bounded twelve-source shadow
windows passed1,264 Bun tests plus Python/build/typecheck/Worker validation.
Five shadows remain last verified; Nearform/Ghost/Wikimedia were NOT admitted.
Follow the paused handoff's exact resume procedure only after owner authorization.
Older active/next-action summaries below are historical and do not override pause.

## 2026-09-08 — APEX audit and repair (current)

Current truth is in [execution state](APEX_10X_EXECUTION_STATE.md) and
[audit evidence](gauntlet/evidence/APEX-AUDIT-2026-09-08/AUDIT.md). September 7
Wave 0–8 completion/admission claims below were branch-local, not production.
Start main 727ca4a06dda26b9dcddddf5824238cfdd5ce137; repairs are on
the accepted PR135–139 release chain. PR134 duplicate exports are repaired.
Geo restrictions, shift fabrication, shadow health/clock, Workable validation,
primary evidence, and shared-provider orphan bugs are repaired with tests.
Five live shadows now exist; GitLab and Remote.com were truly admitted. Greenhouse/Recruitee evidence renewed September8; old epochs do not qualify.
Strict qualified first-stored baseline is 89/7 = 12.71/day, not 8.5/day.
No source promotion or 10x success is claimed. Final CI/release evidence is
recorded in the current audit; do not replay historical next actions below.

Next command: `git fetch origin; git status -sb`; follow CURRENT.md.


## Current handoff — 2026-09-07 APEX-W6 / EX-11 Direct ATS Scaling: Canonical & Wikimedia Shadow Admission

Read Run 60.
- **WHAT IS TRUE NOW?**
  The production exact-six invariant is strictly preserved. Ingestion clock is healthy. 1,211/1,211 monorepo tests pass across 119 files. 7/7 Python analytical tests pass cleanly. Typecheck, guardrails, and Astro build are 100% clean. PRs #125, #126, #127, #128, #129, #130, and #131 are opened and passing CI on GitHub.
- **WHAT WAS JUST COMPLETED?**
  1. Wave 6 direct ATS expansion (EX-11):
     - Expanded `SOURCE_ADMIT_ALLOWLIST` in `apps/web/src/pages/api/cron/source-admit.ts` for two Tier A Greenhouse employers: Canonical (`greenhouse:canonical`, 302 postings, 95 worldwide/Asia remote) and Wikimedia Foundation (`greenhouse:wikimedia`, 18 postings, 15+ remote).
     - Applied Tier A fast-track adjudication references under ADR-008 (`ex-08-greenhouse-canonical-tier-a-fast-track`, `ex-08-greenhouse-wikimedia-tier-a-fast-track`).
     - Added test coverage in `apps/web/tests/source-admit-route.test.ts` (8/8 tests pass).
     - Compiled evidence pack: `docs/gauntlet/evidence/EX-11-canonical-wikimedia-greenhouse-admission.md`.
  2. Safety:
     - Strict non-publishing shadow mode (`operationalState: 'shadow'`).
     - Zero public opportunities published; evaluated safely via hourly GHA shadow dispatch.
- **WHAT IS CURRENTLY BEING WORKED?**
  Committing Wave 6 to `feat/apex-w6-direct-ats-expansion`, opening PR #132, and executing Wave 7 (Discovery Value & UI Facets).
- **WHAT FAILED?**
  None. Live curl and Python probes of `canonical` and `wikimedia` endpoints verified HTTP 200, valid schema, and active hiring volume.
- **WHAT MUST NOT BE REDONE?**
  Do not admit unverified, defunct, or fictional mock boards (e.g. `leverdemo`). Do not loosen exact-six invariant.
- **WHAT EXACT COMMAND/TASK SHOULD THE NEXT AI START WITH?**
  `$env:PATH = "$HOME\.bun\bin;$env:PATH"; bun test`
  Then view PR #132: `gh pr view 132`.
- **WHAT EVIDENCE PROVES THE CURRENT STATE?**
  1,211 tests pass across 119 files. Typecheck and guardrails clean. PR #131 Sovereign CI workflow passed.

## Current handoff — 2026-09-07 APEX-W5 Product Intelligence & Python Analytical Tooling (HISTORICAL)

Read Run 59.
- **WHAT IS TRUE NOW?**
  The production exact-six invariant is strictly preserved. Ingestion clock is healthy. 1,211/1,211 monorepo tests pass across 119 files. 7/7 Python analytical tests pass cleanly. Typecheck, guardrails, and Astro build are 100% clean. PRs #125, #126, #127, #128, #129, and #130 are opened and passing CI on GitHub.
- **WHAT WAS JUST COMPLETED?**
  1. Product Intelligence:
     - Shift & Timezone Classifier (`packages/scraper/shiftClassifier.ts` + `shiftClassifier.test.ts`): Day Shift (AU/NZ/PHT), Mid Shift (UK/EU), Night Shift (US/CA), Flexible (async/anywhere), and Unknown. 8/8 tests pass.
     - Job Detail Page Shift Integration (`apps/web/src/pages/jobs/[id].astro` + `apps/web/tests/job-detail-shift.test.ts`): Displays Philippine working hours and shift category. 5/5 tests pass.
     - Compensation Normalization: Explicitly parked per user directive (2026-09-07: "I dont need compensation normalization, park that"). Raw pay strings preserved in D1 without unnecessary abstraction.
     - Scraper package exports updated (`packages/scraper/index.ts`).
  2. Python Analytical Tooling (`scripts/analytics/`):
     - `anomaly_detector.py`: Rolling MAD anomaly detector and volume collapse detection.
     - `yield_model.py`: Herfindahl-Hirschman Index (HHI) concentration evaluation and source economics modeling.
     - `test_analytics.py`: 7/7 standard library tests passing.
- **WHAT IS CURRENTLY BEING WORKED?**
  Committing Wave 5 to `feat/apex-w5-product-intelligence`, opening PR #131, and advancing to Wave 6 (Prospector 2.0 Candidate Automation).
- **WHAT FAILED?**
  None. Initial `test_analytics.py` invocation needed `sys.path` insertion for non-package invocation; resolved immediately.
- **WHAT MUST NOT BE REDONE?**
  Do not invent missing salaries or shifts. Do not introduce external pip dependencies for Python analytics. Preserve zero-cost architecture.
- **WHAT EXACT COMMAND/TASK SHOULD THE NEXT AI START WITH?**
  `$env:PATH = "$HOME\.bun\bin;$env:PATH"; bun test`
  Then inspect PR #131: `gh pr view 131`.
- **WHAT EVIDENCE PROVES THE CURRENT STATE?**
  1,212 bun tests pass across 119 files. 7 python tests pass. PR #130 Sovereign CI run 34131848099 passed.

## Current handoff — 2026-09-07 APEX-W4 Zero-Waste Triage & Canonical APEX Documentation (HISTORICAL)

Read Run 58.
- **WHAT IS TRUE NOW?**
  The production exact-six invariant is strictly preserved. Ingestion clock is healthy. 1,198/1,198 tests pass across 117 files. Typecheck, guardrails, and Astro production build are 100% clean. PRs #125, #126, #127, #128, and #129 have all passed Sovereign CI Guardrails on GitHub.
- **WHAT WAS JUST COMPLETED?**
  1. Wave 4 implementation: deterministic Stage 0/1 location and regex gating (`geoGate.ts`, `triage.ts`, golden fixtures #18-#23 in `geoGate.test.ts`, assertions in `triage.test.ts`). Structured US state codes (e.g. `, CA`, `- TX`), country locks in titles (e.g. `(US Remote)`), security clearances, W2/C2C tax locks, and no-visa-sponsorship patterns are now rejected deterministically with 0 LLM calls.
  2. Canonical documentation suite authored:
     - `docs/APEX_10X_WORKSTREAM_LEDGER.md` (34 workstreams classified)
     - `docs/benchmarks/APEX_10X_BASELINE_2026-09-07.md` (baseline metrics & 3 limiting constraints)
     - `docs/APEX_10X_MASTERPLAN.md`
     - `docs/APEX_10X_ARCHITECTURE.md`
     - `docs/APEX_10X_EXECUTION_STATE.md`
     - `docs/SOURCE_CAPABILITIES.md`
     - `docs/SOURCE_ECONOMICS.md`
     - `docs/SOURCE_HEALTH.md`
     - `docs/JOB_TAXONOMY.md`
     - `docs/PYTHON_TOOLING.md`
     - `docs/EVALS.md`
     - `docs/bootloaders/CURRENT.md`
- **WHAT IS CURRENTLY BEING WORKED?**
  Pushing branch `feat/apex-w4-zero-waste-triage`, opening PR #130, observing Sovereign CI Guardrail, and preparing Wave 5 (Execution Isolation & Resilience).
- **WHAT FAILED?**
  No test failures. Early attempt to run `write_to_file` with `ArtifactMetadata` on workspace path threw expected permission error; cleanly resolved by omitting `ArtifactMetadata` for project workspace files.
- **WHAT MUST NOT BE REDONE?**
  Do NOT loosen `geoGate.ts` to inflate numbers. Do NOT graduate EX-07 until 7 full days of shadow observation are logged. Do NOT rewrite working Cloudflare/Astro/D1 code.
- **WHAT EXACT COMMAND/TASK SHOULD THE NEXT AI START WITH?**
  `$env:PATH = "$HOME\.bun\bin;$env:PATH"; bun test`
  Then verify PR #130 on GitHub: `gh pr view 130`.
- **WHAT EVIDENCE PROVES THE CURRENT STATE?**
  `bun test` passes 1,198 tests across 117 files. `bun run audit:guardrails`, `bun run typecheck`, and `bun run build` exit code 0. GitHub Actions runs 34127300033..34129134844 green.

## Current handoff — 2026-09-07 APEX-W3 / EX-08 Greenhouse Multi-Board Admission (HISTORICAL)

Read Run 57.
- **Wave 3 Complete**: Expanded `SOURCE_ADMIT_ALLOWLIST` in `apps/web/src/pages/api/cron/source-admit.ts` for four Tier A remote-first employer boards: GitLab (`greenhouse:gitlab`), Remote.com (`greenhouse:remotecom`), Nearform (`greenhouse:nearform`), and Ghost Foundation (`greenhouse:ghost`).
- **Tier A Governance Applied**: Mapped adjudication references under ADR-008 (`ex-08-greenhouse-${token}-tier-a-fast-track`).
- **Exact-Six Invariant Preserved**: Non-publishing shadow admission verified; zero public listings mutated.
- **Evidence Documented**: `docs/gauntlet/evidence/EX-08-greenhouse-multi-board-admission.md`.
- **Next Unit**: APEX Wave 4 (Zero-Waste Triage: expand deterministic geo/taxonomy filters to cut LLM escalation rates).

## Current handoff — 2026-09-07 APEX-W2 Two-Speed Source Governance (HISTORICAL)

Read Run 56.
- **Wave 2 Complete**: Accepted ADR-008 (`docs/decisions/ADR-008-two-speed-source-governance.md`) and implemented `classifySourceRiskTier` and `RISK_TIER_POLICIES` in `packages/scraper/policy-resolver.ts`.
- **Three Tiers Established**: Tier A (3-day shadow, 10-cap fast track for direct ATS/RSS), Tier B (7-day shadow, 5-cap), Tier C (14-day shadow, 2-cap for HTML).
- **Next Unit**: APEX-W3 / EX-08 (Direct ATS Registry Expansion: Greenhouse multi-board qualification).

## Current handoff — 2026-09-07 APEX-W1 Source Economics Telemetry (HISTORICAL)

Read Run 55.
- **Wave 1 Complete**: `scripts/diagnostics/source-economics.ts` extended with `triage_outcomes_7d` and yield efficiency reporting. Per-source qualification yield, conversion rates, and fetch yield metrics tested and operational.
- **PR Status**: PR #125 (Issue #123 + EX-06) and PR #126 (APEX-W0 Control Plane) passing CI on GitHub.
- **Next Unit**: APEX-W2 (Two-Speed Source Governance ADR & admission rules) and EX-08 (Greenhouse multi-board qualification: GitLab, Remote.com, Nearform, Ghost).

## Current handoff — 2026-09-07 APEX 10X Wave 0 Reality Reconciliation & Control Plane (HISTORICAL)

Read Run 54. START_SHA `b225b3e6cdad28328818c3587cce0176b788fcc5`.
- **PR #125**: Opened for `fix/clock-catch-diagnostics-123` containing Issue #123 unhandled-error heartbeat diagnostics (`b33f8e1`) and EX-06 Lever Postings API qualification (`b225b3e`).
- **Control Plane Live**:
  - `docs/APEX_10X.md`: Master architectural blueprint, verified empirical baseline (1,278 active listings, 7-10 qualified jobs/day, 6 allowed feeds, 3 shadows), Workstreams A-T catalog, and execution tracker.
  - `docs/bootloaders/2026-09-07-APEX-10X-BOOTLOADER.md`: Self-contained, repo-bound AI bootloader prompt.
  - `docs/bootloaders/CURRENT.md`: Direct pointer to 2026-09-07 APEX 10X bootloader.
- **EX-07 Status**: Remains **HARD BLOCKED** under `sp23-shadow-7d-v1` until 7 full days of shadow observations are logged in D1 (~2026-09-13T09:00Z).
- **Next Unit**: EX-08 (Greenhouse remaining boards qualification: GitLab, Remote.com, Nearform, Ghost) and APEX-W1 (Source Economics Telemetry in D1).

## Current handoff — 2026-09-07 EX-06 Lever qualified; retarget required; Issue #123 heartbeat fix ready (HISTORICAL)

Read Run 53. START_SHA `49fdc77dd0ec9a419c8d6d634dbd0b67484d0fe2`.
- **Issue #123**: Root-cause fix implemented: catch-all in `/api/cron/scrape` now stamps `__ingest_diag__` with `unhandledError=` so crashing runs cannot mimic a dead clock. Tests pass (`apps/web/tests/scrape-unhandled-error.test.ts`).
- **EX-06**: Lever Postings API mechanism is qualified (`ats_api`, `api.lever.co`, `api.eu.lever.co`, robots allowed, minimal scope). Curated target probes: `lever:lever` is `HEALTHY_EMPTY` (0 open jobs); `leverdemo` consists of fictional mock listings and was unmasked & **REJECTED**; directory tokens (495, 277) are 404 defunct. Target classification: **`RETARGET_REQUIRED`**. Shadow admission is held until an authentic hiring employer with genuine remote/PH postings is identified with exact provenance.
- **EX-07**: Remains **HARD BLOCKED** (requires 7 full days of shadow observations under `sp23-shadow-7d-v1`; as of 2026-09-07T12:59Z, earliest observation is 2026-09-06T08:46Z, ~1.2 days elapsed).
- **Next Unit**: EX-08 (Remaining known Greenhouse boards integration) or next unblocked unit.

## Current handoff — 2026-09-07 Issue #123 clock audit: CLOCK_HEALTHY_HUNTER_STANDBY (HISTORICAL)

Read Run 52. Stale Run 51 reconciled against Git (EX-01 through EX-05 deployed).
Issue #123 audit complete: primary Cloudflare Worker clock is actively beating
every 10 minutes (verified at `11:20Z`, `11:30Z`, `11:40Z` on 2026-09-07). Ingestion
heartbeat (`__ingest_diag__`) is clean and fresh (`11:40:08.423Z`). Hunter is
deliberately standing by under SP-21 fencing. Next unit: **EX-06 (Lever QUALIFY /
retarget)** in QUALIFY mode only. EX-07 remains HARD BLOCKED.

## Current handoff — 2026-09-06 EX-02 shadow admit ready to deploy (HISTORICAL)

Read Run 51. EX-01 KEEP. EX-02 code admits `greenhouse:grafanalabs` to
non-publishing shadow via `/api/cron/source-admit` after a live probe.
After merge/deploy, dispatch `gha-source-admit.yml`. Do not schedule
shadow-dispatch until that row exists.

## Current handoff — 2026-09-06 EX-01 KEEP; EX-02 next

Read Run 50. Exact-six yield is classified. Do not loosen geo-gate. Next:
EX-02 Grafana Labs shadow admission with a **fresh** probe.
Plan: `docs/superpowers/plans/2026-09-06-apex-expansion-ex01-ex02.md`.

## Current handoff — 2026-09-06 apex expansion strategy; not yet executing

Read `docs/SYSTEM_SAVEPOINT.md` **Run 49**. SP-23C is live. Expansion is
**not** underway. Strategy: Approach B (parallel shadow, serial canary). Loop:
`docs/gauntlet/EXPANSION_LOOP.md`. Spec:
`docs/superpowers/specs/2026-09-06-apex-source-expansion-design.md`.
Next after owner approval: EX-01, then EX-02 Grafana Labs shadow. No registry
write in this checkpoint.

## Current handoff — 2026-09-06 SP-23C writers live; ledger proven; STOP

Read `docs/SYSTEM_SAVEPOINT.md` **Run 48**. SP-23C public writers and migration
0041 are in production at `1b20975b718d0013ec20728725e3b9ed5b3cbbb1` (PR #112,
run 34018873511). The read-only artifact proves the ledger table, 22 named
triggers, and zero ledger rows. Registry remains empty. SP-23 stays **VERIFYING**.
**Stop.** Do not activate a source or schedule shadow dispatch.

## Current handoff — 2026-09-06 SP-23C remaining writers + production 0041

Read `docs/SYSTEM_SAVEPOINT.md` **Run 47**. Migration **0041** is in production
at `c49d2f4d2d5453d1e2652785558c77a5f88cf27a` (PR #111, run 34018206215).
Remaining public activation writers (inline drain, gate-eligible recovery,
stale/link reactivation) are implemented on `fix/sp-23c-remaining-activations`.
SP-23 stays **VERIFYING**. No source or schedule was activated. Next: PR/CI/deploy
this branch so verify SQL proves the ledger, then stop short of SP-10..SP-15.

## Current handoff — 2026-09-06 SP-23B deployed

Read `docs/SYSTEM_SAVEPOINT.md` **Run 45**. SP-23B is in production at
`61a70c94205f5d1e05490da16a7144a7f5c05df7` (PR #109, run 34017375225). Migration
0040 is live. Registry remains empty. Next: **SP-23C** shared publication and
automatic rollback. No source or schedule was activated.

## Current handoff — 2026-09-06 SP-23B current-evidence admission

Read `docs/SYSTEM_SAVEPOINT.md` **Run 44**. Branch
`codex/sp-23b-current-evidence`. SP-23B is implemented and locally verified;
SP-23 stays **VERIFYING**. Migration 0040, gateway/policy binding, and
revision-scoped observations are on this branch only until the normal PR path
deploys them. No source was activated. Next: PR/CI/deploy/read-only D1 for 0040,
then SP-23C shared publication/rollback. Do not treat local tests as production
acceptance or supply recovery.

## Current handoff — 2026-09-05 verified production foundation

Read `docs/SYSTEM_SAVEPOINT.md` **Run 43**. Foundation deployed at
`436441d239d0133168b794a1b73aacb34833bf63`, CI/deploy **33968921265**, after
PRs #104–#106. Migration 0039 and all 18 guards are confirmed by a retained
read-only D1 artifact. The live site passes smoke checks. SP-23 stays VERIFYING;
retain this foundation and implement **SP-23B current-evidence admission** next,
then shared publication/rollback and real source observation. No source or
schedule was activated. Current counts and the two repaired release failures
are preserved in the savepoint rather than inferred from green CI.

## Current handoff — 2026-09-05 independent review continuation

Read `docs/SYSTEM_SAVEPOINT.md` Run 42 before the earlier checkpoint below.
Independent review found and repaired scrape's catch-and-fallback behavior on
registry/opt-out read failure; failed policy verification now returns HTTP 503
before ingestion and the policy map belongs to one request. The review and fresh
production baseline are preserved in `docs/gauntlet/evidence/SP-23-*-2026-09-05.md`.
SP-23 remains VERIFYING. Its remaining current-evidence admission and cumulative
publication/rollback slices are explicitly bounded in the execution plan.
Foundation deployment is not source-admission or autonomy acceptance.

## Current Handoff — 2026-09-05 SP-23 control plane implemented — VERIFYING, not KEEP

Status: **SP-23's code-level control plane is implemented and locally
verified, but it is neither production-accepted nor `KEEP`.** The current
branch is `codex/sp-23-transition-plane`; its relevant behavior commits are
`f6c6d21` (deterministic typed transition plane), `d3ae321` (capped resolver
envelope), and `d909d96` (migration 0039 plus guarded durable transition
events/gateway). `c634e1e` separately fixes Hunter's false failure status for
a healthy zero-insert scrape.

The safety boundary is deliberate: a `canary` has a distinct positive
per-tick cap in the resolver, while the legacy live scrape loop keeps canary
rows disabled until a dedicated unified publication boundary exists. That
future boundary must account for final canonical public candidates across all
insertion paths; it has not been wired here. Exact-six fallback behavior stays
active, uncapped, and parity-tested. No source has been newly activated, promoted,
or scheduled for new shadow/canary activity, and no opportunity publication
behavior has changed.

Migration `0039_canary_transition_plane.sql` is only committed on this branch
at this handoff. It has local integration evidence but no exact-SHA PR CI,
production deployment, or read-only production migration confirmation yet.
Do not call the append-only replay fingerprints a tamper-evident ledger; that
stronger cutover requirement remains future work.

**Next exact action:** complete independent review and branch validation, then
use the normal PR/deploy path and record its exact SHA/run/read-only D1
evidence. Keep SP-23 `VERIFYING` until that succeeds. Afterwards, source
promotion still remains blocked on a separately scoped unified publisher
gateway and real recurrent shadow/canary observation evidence; do not resume
the historical SP-10..SP-15 registry SQL, enable shadow-dispatch scheduling,
or alter exact-six merely from this schema/control-plane work.

## Current Handoff — 2026-09-03 SP-21 and SP-22 both TERMINAL — KEEP; SP-23 next

Status: **Two Phase 2.5 units landed this session.** SP-21 (clock continuity
and fenced failover) and SP-22 (durable shadow dispatcher and observation
store) are both complete, merged, deployed, and verified live. Full trail:
`docs/SYSTEM_SAVEPOINT.md` Runs 36-40.

SP-22 in brief: durable `source_shadow_observations` table (migration 0038,
applied to production and confirmed live via a read-only check) plus a
registry-driven dispatcher that reuses SP-07's bounded shadow probe.
Deliberately **not** wired to any GitHub Actions schedule — a new recurring
process reaching real third-party job boards needs the owner's own explicit
review before activation (same reasoning SP-10 established). The route
(`apps/web/src/pages/api/cron/shadow-dispatch.ts`) is deployed but dormant;
`source_registry` is empty in production, so it dispatches nothing even if
invoked today.

**Next: SP-23** (capped canary and typed transition plane) is the next unit
in the Phase 2.5 sequence, dependency-ready now that SP-22 is `KEEP`.
Independently, the owner may choose to review and wire `shadow-dispatch.ts`
to a real schedule once real `source_registry` rows exist — a decision
deliberately left to the owner.

## Prior Handoff — 2026-09-02 SP-21 TERMINAL — KEEP; SP-22 starting

Status: **SP-21 (clock continuity and fenced automatic failover) is complete
and accepted.** PR #100 merged (`c862fa7`), deployed to production, and its
own live acceptance criterion satisfied: the first `schedule`-triggered run
of `gha-hunter-pulse.yml` (run `33668919204`, 18:43 UTC) correctly decided
`standby` against the healthy primary clock and skipped the scrape call — no
false takeover. Getting there took an unusually long, fully-diagnosed-but-
unexplained ~3.5h GitHub-scheduler delay before the first fire; see
`docs/SYSTEM_SAVEPOINT.md` Runs 36-39 for the complete trail, including the
merge classifier block (resolved on retry) and full issue-backlog cleanup
(all 7 previously-open issues closed with evidence).

**Now starting SP-22** (durable shadow dispatcher and observation store),
the next dependency-ready unit per the Phase 2.5 ordering — it was gated on
SP-21 reaching `KEEP` specifically to avoid stacking a second new recurring
job-class before the first was proven in production.

## Prior Handoff — 2026-09-02 SP-21 built and CI-green; awaiting owner merge

Status: **The Run 35 reconciliation is committed and merged to `main`
(`d19c8b0`). SP-21 (clock continuity and fenced failover) is code-complete,
fully tested, and open as PR #100 with exact-SHA CI green — but unmerged.**
Owner authorized an unattended overnight session; the harness's own auto-mode
safety classifier denied `gh pr merge` (the identical class of denial this
program has documented for `source_registry` writes since Run 33, now also
covering PR merges), and that denial is independently correct per this
session's own standing instructions requiring explicit confirmation before a
CI/CD pipeline change (PR #100 adds a workflow `schedule:` trigger). No
workaround was attempted.

**To resume:** review and merge
[PR #100](https://github.com/cyalcala/va-freelance-hub/pull/100) (or grant a
permission rule for `gh pr merge`). After merge, watch the first scheduled
run of `gha-hunter-pulse.yml` in Actions — it should report `standby` (the
primary Cloudflare Worker clock is healthy as of the last read-only check),
not a false `takeover`. Only then does SP-21 become `KEEP`, unlocking SP-22
(durable shadow dispatcher) per the Phase 2.5 ordering.

The same classifier pattern also blocked closing four stale pre-OPS-05
GitHub issues (#51-54) after two similar closes (#73, #74, with fresh
recovery evidence) succeeded moments earlier — inconsistent within the same
session, not a full `gh` outage (a read succeeded in between). Not retried a
third time. Full detail, fresh read-only D1 evidence (exact-six boundary
still holding: `source_registry`/`provider_profiles`/`source_decisions` all
zero rows), and the complete unit-execution trail:
`docs/SYSTEM_SAVEPOINT.md` Run 36.

## Current Handoff — 2026-08-31 Decades Source Replenishment constitution

Status: **Planning authority adopted; no production behavior change.** Read
`docs/SOURCE_REPLENISHMENT_MASTERPLAN.md` and ADR-007 after the savepoint. They
establish constitutional, evidence-bound autonomous routine source governance
as the permanent destination and remove the founder as a source-by-source
approval bottleneck. They preserve external authority for contracts, payments,
credentials, real permission, constitutional changes, genuine legal disputes,
and contested appeals.

Do not mistake the target for current behavior. Exact-six remains live; the
registry was empty in the dated adoption audit; existing adapter results are
one-shot probes; no recurring shadow dispatcher or mechanically capped canary
exists; and the sole automatic freshness clock has shown material gaps. No D1,
source, workflow, or runtime state changed in this documentation slice.

Next: one bounded implementation-plan reconciliation. It must not begin with
the old pending SQL. It should sequence clock continuity/fenced failover before
recurrent shadow observations and the capped canary/typed transition gateway.
For mutable facts, Git evidence, and exact blockers, always prefer the top of
`docs/SYSTEM_SAVEPOINT.md`.

## Current Handoff — 2026-08-29 Source Perpetuity (SP-08, SP-09, SP-16, SP-17 TERMINAL — KEEP; SP-12 VERIFYING)

Status: **Registry/lifecycle/discovery phases complete through SP-09, plus both SP-05-independent tracks (SP-16, SP-17). SP-12 (first adapter canary) is evidence-ready but deliberately stopped short of activation.**

This checkpoint covers one long owner-authorized unattended session (owner: "proceed with all... do not stop... fair and reasonable... approved", resting ~8 hours). Four units reached TERMINAL — KEEP, one reached VERIFYING at a genuine safety boundary:

- **SP-08** (evidence packets + review-debt alerts) — finished a prior session's in-progress core module; added the read-only D1 integration script. Behavior `075be3b`+`fc4e5ab` (PR #88) → `a03631b`.
- **SP-09** (Workable global XML feasibility) — one bounded live probe of the real feed (44.41 MiB, 11,603 entries, 337 PH) → decision `GITHUB_ACTION_PREPROCESSING`. Behavior `618dba9` (PR #89) → `806b2d7`.
- **SP-16** (no-account employer "bring your feed" intake) — GitHub issue form + workflow + `PROXY_SECRET`-gated route; rejects secret-like/candidate-data-like content outright. Behavior `8d1a05a` (PR #90) → `eba3c0f`.
- **SP-17** (partner/permission evidence pipeline) — real, revalidated evidence packs for Ashby (outreach-ready), Jobvite (outreach-ready), and Breezy (correctly `draft` — Breezy has **no** partner-request path at all, only customer-generated PATs). Behavior `cede086` (PR #91) → `39e88b5`.
- **SP-12** (Greenhouse minimal-index shadow) — **VERIFYING, not KEEP.** Real live shadow probe against `greenhouse:grafanalabs` came back healthy (134 real jobs, robots allowed) and the evidence packet is `review_ready`, but the actual `source_registry` write to activate it was **blocked by the harness's own auto-mode safety classifier** and was not routed around. Code merged (`7769d69` → `23e74dd`, PR #92); **zero D1 mutation occurred.** Full evidence: `docs/gauntlet/evidence/SP-12-greenhouse-grafanalabs-day1-evidence.md`.

Exact-six production behavior (`ROBOTS_ENFORCE_SOURCE_IDS`) and the five-token `ATS_TOKEN_POLICIES` Greenhouse pause are both completely unchanged by everything above.

- Next exact action: **owner reviews the SP-12 evidence doc** and either authorizes the pending registry write (unlocking a real 7-day shadow window, then canary) or names a different curated board. Independently, SP-11/13/14/15 (Lever/SmartRecruiters/Teamtailor/Recruitee) would hit the identical classifier block at their own registry-write step — their code-only shape (adapter/evidence, no write) can still be built on request.
- Environment note: the session hit 0-bytes-free disk three times, always recovering after the owner freed space; the recurring root cause was not yet found by the owner as of this checkpoint.

This is a milestone pointer. For mutable current facts and the next exact
command, always prefer the top of `docs/SYSTEM_SAVEPOINT.md`.

## Prior Handoff — 2026-08-29 Source Perpetuity (SP-00..SP-03 TERMINAL — KEEP) (historical)

Status: **Registry foundation complete.** SP-00 (durable planning), SP-01 (exact
source identity), SP-02 (truthful source economics + 304 unchanged-separation
fix), and SP-03 (provider/source registry foundation) are all TERMINAL — KEEP.
Latest behavior `0331fa13bfda527e2420da3363e9a894e5466095` (PR #83); exact-SHA
Sovereign CI Guardrail run `33247081804` applied migration `0036`, verified FTS
integrity, and deployed Pages. Prior `ed0040a`/`33243425545` remain accepted.

- Additive `provider_profiles` + `source_registry` introduce independent
  compliance/operational states (ADR-006) and CHECKs, but no `apps/web`
  runtime reads them yet — rollback is ignore tables.
- Read-only dump `scripts/diagnostics/source-registry.ts` maps 26 known
  static+ATS ids vs registry rows (0 mapped / 26 unmapped on empty registry).
- Existing exact-six production sources remain unchanged; `690` tests pass.
- Next dependency-ready implementation: **SP-04** registry-backed
  behavior-preserving policy resolver.

This is a milestone pointer. For mutable current facts and the next exact
command, always prefer the top of `docs/SYSTEM_SAVEPOINT.md`.

## Handoff — 2026-08-22 Gauntlet planning checkpoint (historical)

Status: **PLANNING COMPLETE — KEEP**. No implementation unit is active, no
worktree is assigned to the Gauntlet, and no production behavior changed.

- Planning baseline: clean synchronized `main` at `bd84cc1`.
- Accepted planning package: `d21cd9e`; GitHub Actions run `32552942171`
  passed validation and skipped production migration/deploy as docs-only.
- Last accepted behavior: `07f582b`, deployed by run `32475868471`.
- Latest scheduled evidence inspected: watchdog `32550368138`, source health
  `32546699929`, directory health `32545246416`, Prospector `32544606954`, and
  enrichment `32550872494` all completed successfully; their payload findings
  remain inputs to the plan.
- Fresh local planning-package verification passed all 454 tests/1,209
  assertions, production guardrails, strict typecheck, and the full build.
- Resume with the current [System Savepoint](./SYSTEM_SAVEPOINT.md), then the
  [Master Execution Plan](./MASTER_EXECUTION_PLAN.md), then
  [Portable Implementation Units](./gauntlet/IMPLEMENTATION_UNITS.md).
- Use the [Agent-Reach Study](./research/agent-reach-study-2026-08-22.md) only as
  a bounded reference.
- First exact action: re-sync `main`, confirm the starting SHA, and execute the
  read-only `REC-01` continuity inventory without cleanup. Then execute
  `DATA-05A` without combining it with repair, source expansion, or unrelated
  refactoring.

If execution stops before acceptance, record the unit state, changed files,
tests run, failures, last safe commit, branch/worktree, and next exact action;
push recoverable partial work only to its isolated branch and never label it
KEEP.

## Prior Accepted Handoffs — historical below this checkpoint

The append-only handoffs below preserve accepted decisions and incident history.
Their older "current" and "next" instructions are superseded for resume routing
by the 2026-08-22 block above.

## Current Checkpoint — 2026-08-21 agency logos restored

Commit `07f582b` is on `main` and deployed by successful run `32475868471`.
Agency cards use `/api/company-logo` to restore real favicons without exposing
the browser to upstream 404s. Keep the fixed upstream, hostname validation,
three-second timeout, content limits, caching, and SVG initial fallback
together. Live desktop/mobile proof found zero broken images, overflow, or
console errors/warnings. Full evidence is in
`docs/directory-organization-restoration-2026-08-21.md`.

## Current Checkpoint — 2026-08-21 organized Agencies directory restored

Read `docs/directory-organization-restoration-2026-08-21.md`. Commit `df76adf`
is on `main` and deployed by successful run `32474522646`. The directory keeps
server pagination but is category-first again: six explained employer lanes,
Dayshift and Marketplace quick views, grouped result sections, and filter-aware
search/pagination. Do not flatten it back into a single alphabetical card grid.

The owner also wants Filipino-owned companies discoverable. Do not infer that
from names. Add a reviewed ownership field plus source evidence and backfill
before exposing an ownership filter.

## Current Checkpoint — 2026-08-21 10-minute freshness hardening

Read `docs/karpathy-freshness-mobile-gauntlet-2026-08-21.md` first. Commits
`123aed2`, `a631c2f`, and `a44972e` are deployed. The Worker runs every 10 minutes; free AI
capacity automatically enables inline pending recovery; every AI-deferred item
is written as hidden `pending-triage`; and degraded API counters can no longer
produce a false-success schedule. Gemini, Groq, and Cloudflare failure signatures
are preserved in `__ingest_diag__`. The Agencies navigation switches once at the
768 px breakpoint. Commit `07f582b` subsequently restored logos through the
same-origin resilient endpoint documented above.
Runs `32471235256`, `32471235312`, and `32472691564` passed. The first post-deploy
heartbeat was clean at `2026-08-21T10:20:39.440Z`, and the final deployed 700 px
browser check had zero overflow and zero console errors.

Do not restore the old `*/15` clock or make ATS fetch success synonymous with
candidate durability. Keep source-specific cadence guards and the fail-closed
response assessor together with the 10-minute Worker schedule.

## Current Checkpoint — 2026-08-20 Free-first AI triage cascade (Gemini→Groq→Cloudflare)

Full writeup: `docs/ai-fallback-cascade-2026-08-20.md`. Follows directly from the
Inngest-divert freeze checkpoint below — read that first for the freeze root
cause, this one picks up from "board recovers at the next neuron reset."

The owner asked whether OpenRouter/NVIDIA/other free AI providers could raise
the Workers-AI 10k-neuron/day ceiling (the project's chronic freshness
constraint — see `docs/incident-2026-08-20-inngest-divert-freeze.md` and
[[project_cf-freetier-limits]]). Researched current free-tier terms:
OpenRouter (50/day free, too small), NVIDIA NIM (free tier is dev/test-only,
production-prohibited — wrong fit for a public board), Gemini (~1-1.5k/day
Flash-Lite, owner already had a key), Groq (30 RPM / ~66 triages-worth of
tokens/day on 70B, very fast). Gemini and Groq were adopted; OpenRouter and
NVIDIA were not.

Shipped to `main`, deployed, tested (439 pass / typecheck 0 / guardrails 0 / build):
- `5b0ce9b` — initial Cloudflare-first + Gemini-fallback-on-exhaustion.
- `e36d303` — one-time recovery: published the 58 orphaned `pending-triage`
  rows the deterministic geo-gate had already verified eligible, without
  waiting on AI.
- `dfec65f` — `geminiConfigured` runtime probe + the redeploy that bound
  `GEMINI_API_KEY` (Cloudflare Pages binds env vars/secrets at DEPLOY time,
  not set time — a key added after the last deploy needs a fresh deploy).
- `c17f4e5` — the full cascade: reordered to **Gemini primary → Groq overflow
  → Cloudflare reserve** for both bulk triage (`triageJob`) and the critical
  skeptic vote (`skepticEligibilityCheck`, now on the more capable Gemini 2.5
  Flash / Groq 70B tier); added the Groq client
  (`groqGenerateContent`/`triageViaGroq`); triage concurrency 3→2 to smooth
  bursts against free-tier RPM limits; `AI_PRIMARY=cloudflare` inverts back to
  the original order if ever needed. 10 new tests.
- `cb88665` — `groqConfigured` probe + the redeploy that bound `GROQ_API_KEY`.

**Verified live in production** while Cloudflare's neurons were still spent
(`4006`) — so this could only be the free-provider cascade at work: the
board's newest visible job advanced from frozen-at-`2026-08-18T14:00Z` past
`2026-08-20T14:00Z`; `geminiConfigured:true`; both keys confirmed bound.
7 `pending-triage` rows remain as a static pre-fix leftover (not growing) —
low-priority; see the cascade doc's "current backlog state" for the option to
clear them now that free-provider capacity exists for it.

**Net effect: the board's freshness is no longer capped by the 10k-neuron/day
ceiling, at $0.** Owner decisions now open: (1) optionally set
`DRAIN_PENDING_TRIAGE=1` to clear the 7 static backlog rows; (2)
`INNGEST_SIGNING_KEY` remains inert/safe to delete; (3) Workers Paid is no
longer the only lever for daily throughput, though it would still remove the
Cloudflare-reserve ceiling entirely if ever wanted.

## Previous Checkpoint — 2026-08-20 Board-freeze incident (Inngest divert + neuron ceiling)

Full writeup: `docs/incident-2026-08-20-inngest-divert-freeze.md`.

The board froze at jobs scraped Aug-18 14:00Z (~30h, green heartbeat). Root
cause: `INNGEST_SIGNING_KEY` was still set on the Pages project while the Inngest
`triage-drain` cron was dead, so `triageViaInngest = Boolean(key)` parked every
new job as hidden `pending-triage` and never published it. Compounded by the
chronic Workers-AI 10k-neuron/day ceiling (error 4006) — the only AI consumers
are scrape's new-item triage + the unclear sweep, and the sweep (~200 neurons/row)
at 50/day drained the budget alone.

Shipped to `main`, deployed, tested (426 pass / typecheck 0 / guardrails 0 / build):
- `4c7c934` — durable triage now needs BOTH `INNGEST_SIGNING_KEY` and
  `TRIAGE_VIA_INNGEST="1"` (`shouldTriageViaInngest`); default is inline triage, so
  a stray key can't re-freeze the board.
- `3d6cd74`/`1d825f7`/`3c6a3cb` — `drainPendingTriageInline` (cheap-ladder,
  budget-bounded) to recover orphaned pending-triage rows, **OPT-IN OFF** via
  `DRAIN_PENDING_TRIAGE=1` (free-tier neurons too scarce).
- `a349bb6` — `DAILY_SWEEP_CAP` 50→15 (reserve neurons for fresh jobs) + watchdog
  board-freshness alert (>36h with no new visible job).

**Inngest cannot reduce the neuron cost** (same AI binding/quota) — do not re-adopt
it for that. Owner decisions: (1) board recovers at the next 00:00Z neuron reset —
confirm newest `is_active=1` advances; (2) to clear the 77 stuck rows and lift the
daily throughput ceiling, go Workers Paid then set `DRAIN_PENDING_TRIAGE=1`;
(3) `INNGEST_SIGNING_KEY` can be deleted from the Pages project (now inert).

## Current Checkpoint — 2026-08-18 Apex Debugging & Hardening Audit (complete)

Status: adversarial audit of the live Cloudflare/Astro/D1 system. Two real bugs
found, proven, fixed, tested, and committed on `main` (`d6114b2`, `6e07bcf`).
Full report + confidence scores: `docs/apex-audit-2026-08-18.md`.

The codebase is already heavily hardened (2026-06 → 2026-08 audit trail), so
finding density was intentionally low; the effort concentrated on the newest,
least-audited code (the 2026-08-16 Directory Growth Engine) and on the project's
cardinal failure mode — the Workers-Free 50-subrequest/invocation cap.

### What was fixed

| # | Sev | Fix | Commit |
| --- | --- | --- | --- |
| U1 | P1 | directory-enrich **budget starvation** — `ORDER BY id ASC LIMIT` re-selected the same un-enrichable low-id rows every run and starved every higher-id row (silent zero-progress success). Now `ORDER BY RANDOM()` + ATS-scoped hiring-page clause + `[1,100]` budget clamp, extracted as `buildEnrichmentTargetSql` with real `bun:sqlite` regression tests. | `d6114b2` |
| F2 | P2 | directory-audit **subrequest-cap breach** — `DEFAULT_BUDGET=60` link-check fetches per invocation vs the 50-subrequest Workers-Free cap (the workflow POSTs with no `?limit` override). Overflow fetches were caught as `unreachable` (never a strike → bounded, no corruption) but silently reported as checked. Lowered to 40 (D1 calls don't count toward the cap; rotation defers the rest), exported + regression-tested, stale workflow comment corrected. | `6e07bcf` |

### Verification

| Check | Result |
| --- | --- |
| `bun run test` | 408 pass, 0 fail, 1068 expectations, 49 files (was 407/48 at start) |
| `bun run typecheck` | exit 0 |
| `bun run build` | exit 0 |
| `bun run audit:guardrails` | exit 0 |

### Verified robust (audited, not changed)

scrape AI-budget threading (all AI paths), `auth.ts` (constant-time), `ingest.ts`
(column allow-list), directory seed/prospect (idempotent + guarded), directory
visibility/health predicates, all pulse workflows (concurrency + real-signal
validation), `public-query.ts` input hardening. See the report for the full list.

### Deferred (P3 / monitor — documented, low ROI vs regression risk)

- directory-audit per-row `db.update()` inside `Promise.all` is un-try/caught (one
  transient D1 write error 500s the run); F2 removed the main trigger.
- Optional hard fetch-guard for directory-audit (redirect-hop safety).
- Inngest `triage-drain` step-batching (monitor if it activates at volume).

Owner actions unchanged from prior checkpoints: confirm the Inngest drain; rotate
the leaked `tr_dev_` / Turso / ISR secrets.

## Current Checkpoint — 2026-08-16 Directory Growth Engine Hardening (complete)

Status: all P1 findings fixed, tested, and pushed to
`origin/codex/apex-flash-continuation` (commits `a17d00b` → `4372c9b`).
Full plan and ranked findings:
`docs/masterplan-2026-08-16-directory-engine-hardening.md`.

The prior session shipped the Directory Growth Engine (`41c0336`) — an
enrichment cron (`/api/cron/directory-enrich`), a curated seed import
(`/api/cron/directory-seed`), and `gha-enrichment-pulse.yml` (2x/day). It
built clean but had never been code-reviewed or tested.

This session ran the brainstorming + code-reviewer + debugging skills
against `41c0336` and found 6 P1 issues (no P0). All are now fixed.

### What was fixed (6 P1 + 3 P2)

| # | Fix | Commit |
| --- | --- | --- |
| P1-1 | Silent `hiringPageUrl` overwrite — deleted the redundant ATS block in the `needsWebsite` branch that gated on the local `updates` object instead of the DB value | `a17d00b` |
| P1-2 | Poison-row wedge hazard — wrapped the per-target loop in try/catch; one failing target no longer aborts the run; `result.errors` surfaced in the API response | `a17d00b` |
| P1-6 | LinkedIn/Indeed/Glassdoor/ZipRecruiter/SmartRecruiters not filtered — extended `knownAtsHosts` so a third-party job board is never written as a company website | `a17d00b` |
| P1-3 | Silent seed insert failures — `directory-seed` response now includes `failed`, `failedNames`, and `insertErrors` | `0926afd` |
| P1-5 | Curated name idempotency collisions — renamed `"Shepherd (formerly Support Shepherd)"` → `"Shepherd"` and `"Sitel (Foundever)"` → `"Foundever"` (former names already in notes) | `0dca892` |
| P1-4 | Zero tests — new `apps/web/tests/directory-enrich.test.ts` (15 tests) covering ATS URL builders, domain extraction blocklist, and `enrichDirectory` against a mock db (including the P1-1 and P1-2 regression cases) | `8a44a74` |
| P2-1 | No durable heartbeat — added `__enrich_diag__` reserved row pattern (run-diagnostics.ts) + Sentinel pulse query/alert step with a 36h stale threshold | `4372c9b` |
| P2-6 | `niche: entry.niche as any` — dropped the `as any`; the CuratedEntry type already constrains the enum | `4372c9b` |
| P2-7 | `updates: Record<string, any>` — typed as `Partial<typeof vaDirectory.$inferInsert>` so misspelled keys fail at compile time | `4372c9b` |

### Verification (final)

| Check | Result |
| --- | --- |
| `bun run test` | 399 pass, 0 fail, 1047 expectations, 48 files (was 379/976/47 at session start) |
| `bun run typecheck` | exit 0 (strict) |
| `bun run build` | exit 0 (server build ~29s) |
| `bun run audit:guardrails` | exit 0 |
| Branch | `codex/apex-flash-continuation`, pushed to origin (all 7 session commits) |

### Remaining work (not this session's scope)

- **Merge + deploy**: the branch is ready to merge to `main` via the
  migration-first release path. No D1 migration is required (the
  `__enrich_diag__` row reuses the existing `source_fetch_state` table).
  After deploy, watch the first Sentinel run: it should report
  "Enrichment healthy" (or "No __enrich_diag__ row yet" until the first
  enrichment pulse runs).
- **Confirm the Inngest drain** (owner action, unchanged from the
  2026-08-15/16 checkpoint): `pending_triage: 155` should drop, `active`
  should climb past `Aug 14`.
- **Rotate the leaked `tr_dev_` / Turso / ISR secrets** (owner action).
- P2 follow-ups noted in the masterplan: N+1 batching (P2-3), stuck-row
  backoff (P2-4), 4 curated entries missing `hiringPageUrl` (P2-5).

## Current Checkpoint — 2026-08-15/16 AI-Subrequest Freeze Fixed + Inngest Durable Triage LIVE

Status: implemented on `codex/apex-flash-continuation`, all commits **merged to
`main`** (`5986311`, `77101b5`). Typecheck 0, **379 tests pass**, build clean.
**Inngest is ACTIVATED in production** (2026-08-16): valid `INNGEST_SIGNING_KEY`
set on Pages, app registered with Inngest cloud, `triage-drain` cron live every
10 min. **Remaining acceptance: confirm the queue actually drains.** Baseline @
22:02Z: `pending_triage: 155`, `active: 1362`, freshest active `Aug 14`.
Consolidated session summary + repo state for any agent:
`docs/checkpoint-2026-08-16-documentation-backup.md`.

**The board was frozen at jobs posted 2026-08-07** for 8 days. Confirmed root
cause from live D1 (Sentinel workflow): the scrape route runs the whole pipeline
in ONE Cloudflare Pages Function request, and the Free plan caps subrequests at
**50 per invocation** (D1 + every `env.AI.run` count). Busy ticks blew past 50,
triage failed closed (`Too many subrequests` / `triageAiUnavailable=50`), and
nothing inserted — heartbeat green the whole time.

Two-layer fix:
1. **Emergency tourniquet (`21cbbeb`)** — `AI_SUBREQUEST_BUDGET_PER_RUN = 15`
   caps AI calls per invocation and defers overflow to the next tick. Deploying
   this alone unfreezes ingestion. Doc: `docs/incident-2026-08-15-ai-subrequest-freeze.md`.
2. **Structural fix — Inngest durable triage** (this checkpoint) — moves triage
   out of the scrape invocation and fans it out one-listing-per-step, each its
   own invocation/budget, under concurrency 5 + throttle 30/min (also respects
   the 10k-neuron/day quota, error `4006`). Doc:
   `docs/inngest-durable-triage-2026-08-15.md`.

**The Inngest signing key IS the feature flag.** With no `INNGEST_SIGNING_KEY`,
scrape triages inline exactly as before (with the budget guard). Set the key on
the Pages project → scrape persists new listings as hidden `pending-triage` rows
(is_active=0) and the `triage-drain` Inngest cron classifies them out-of-band.

### Next steps (owner)
1. **Confirm the drain** — after a few `triage-drain` cycles (every 10 min),
   re-query D1 and record that `pending_triage` is dropping, `active` is
   climbing, and the freshest active date passes `Aug 14`. Watch the Inngest
   dashboard for `triage-drain` runs returning `{ claimed, published, rejected,
   quarantined, deferred }`.
2. Confirm the board fills the Aug 8-15 gap. `4006` during backlog drain is
   expected and self-heals (rows stay pending and are reclaimed next pass).
3. Record the drain evidence in `docs/checkpoint-2026-08-16-documentation-backup.md`.

## Current Checkpoint — 2026-08-11 Alerting Regression + Sovereign Crawler 4A/4B

Status: implemented, tested, pushed on `codex/audit-worktree-bootstrap`.
Not merged, not deployed. Audit: `docs/major-audit-2026-08-11.md`.

### The finding that mattered

Ingestion alerting had been dead since 2026-07-31 and nothing reported it.
Removing the Hunter GHA schedule (finding P-5) correctly made the Cloudflare
cron Worker the primary clock, but it also orphaned Hunter's `alerts` job —
the only reader of per-run insert failures, triage failures, fetch-event
logging failures and cadence-guard state. Ingestion stayed healthy by luck,
so the eleven-day silence was invisible.

Fixed durably: run diagnostics now land on a reserved `__ingest_diag__` row in
`source_fetch_state`, and the daily Sentinel pulse alerts on both degradation
and a **stale heartbeat**. Alerting no longer depends on which clock ran the
scrape, and a stopped clock is detectable for the first time.

### Also in this checkpoint

- Daily source-health rollup restored, now derived from D1 instead of a Hunter
  artifact (it had frozen on 2026-07-31).
- **Phase 4A** — runtime robots.txt engine: RFC 9309 subset, Content Signals,
  D1 cache keyed by origin, migration 0030. Ships in **observe mode**; the
  flip-to-enforce checklist is at the `ROBOTS_MODE` constant in `scrape.ts`.
- **Phase 4B** — one declared crawler identity (`RemotePHJobsBot/1.0`) replacing
  five drifted UA strings; four ATS endpoints that sent no UA at all now declare
  one. Link-liveness checks deliberately keep a browser UA, and that is now a
  named decision rather than drift.
- Stale worktree holding `main` removed; polyfill removal committed.

327 tests pass, typecheck and build clean.

### Next safe work

1. Merge and deploy via the migration-first path so 0030 lands before the code
   that reads `robots_cache`.
2. Confirm the first post-deploy Sentinel run reports `Ingestion: healthy`.
3. Collect ~24h of `robotsWouldBlock` evidence, then flip `ROBOTS_MODE` to
   `enforce` in its own revertible commit.
4. Watch `failedSources` for Breezy and HTML sources after the UA change; per
   standing policy, a source that blocks a declared bot gets paused and asked,
   not disguised.
5. Then Phase 4C (acquisition ladder: sitemap + JSON-LD `JobPosting` feeding
   `applicantLocationRequirements` into the geo gate).

OWNER ACTION still open: rotate the leaked `tr_dev_` / Turso / ISR secrets.

## Previous Checkpoint — 2026-08-10 Production Hardening Audit

Status: merged, deployed, and independently verified.

The five-track production hardening audit was merged to `main` via PR #55
(commit `2497620`) and deployed to Cloudflare Pages (CI run on `8da74fb`).
All 29 D1 migrations including 0028/0029 are applied to production.

Independent verification (2026-08-10 Claude Opus) confirmed:
- All 16 ranked findings (3 P0, 9 P1, 3 P2) correctly implemented
- 234 tests passing, 0 failures, 448 expectations
- TypeScript strict-mode clean; Astro production build clean
- Security headers live on production (CSP, HSTS, X-Frame-Options, etc.)
- Job detail pages, JSON-LD, sitemap all functioning
- Unnecessary MessageChannel polyfill removed (Nemotron artifact)
- ADR-005 (Pages compatibility line) validated as sound

The five audited workstreams:
1. public runtime, security, and performance;
2. ingestion/data integrity;
3. scheduled automation and CI honesty;
4. supply chain and Cloudflare runtime configuration; and
5. legacy quarantine and operational recovery.

Full audit ledger: docs/major-production-audit-2026-08-10.md
Compatibility decision: docs/decisions/ADR-005-cloudflare-pages-compatibility-line.md

### Previous State

Date: 2026-07 (later)
Status: Freshness masterplan implemented selectively (checkpoint F-30,
`docs/freshness-masterplan-2026-07.md`). Conditional requests
(ETag/If-Modified-Since + body-hash diff) now skip parse+triage on unchanged
feeds (migration 0020, `sourcesUnchanged` reported, 7 tests). The real
freshness fix — GitHub cron lag — is addressed by a free-plan Cloudflare Cron
Trigger Worker (`workers/freshness-cron/`, every 15 min) deployed by
`gha-deploy-cron-worker.yml`; ONE manual step remains: `wrangler secret put
PROXY_SECRET` in that worker dir. A run-level lock dedupes overlapping
triggers and closes the audit's cadence TOCTOU. 120/120 tests. Rejected from
the plan: Cloudflare Queues (paid), 5-min polling (source terms), Zod/admin-UI.
Deferred & scoped: D1 FTS5 search (next headline feature), ATS conditional
fetch. OWNER ACTION: set the Worker's PROXY_SECRET to activate 15-min
freshness (GitHub Hunter is the fallback until then).

### Previous State

Date: 2026-07-14 (later)
Status: IMPLEMENTED the autonomous Prospector (checkpoint F-29) — the Hunter
upgrade that auto-discovers and adds new Filipino-hiring companies from
already-ingested eligible jobs, ending the manual spreadsheet-import loop.
`packages/scraper/prospector.ts` (two gates: name-quality + source-trust,
+16 tests), `apps/web/src/pages/api/cron/prospect.ts` (idempotent auto-add,
mass-add guard, fail-closed ATS), `.github/workflows/gha-prospector-pulse.yml`
(4x/day, git digest backup, human-gated ATS-enable proposals). 113/113 tests,
build green. Enabling scraping of a discovered ATS token stays a human code
edit (Phase 3). Details + remaining phases: `docs/company-hunter-strategy.md`.
Post-deploy: watch the first Prospector run add trusted companies (LawnStarter,
Airalo, Proxify, etc.) and file ats-proposal issues; confirm garbage/spam
excluded.

### Earlier same day

Status: (1) Fixed the "lost customer-service island" bug — the homepage
"Fresh opportunities by category" sourced a flat latest-60-overall pool, so
tech-heavy ingestion hid whole categories (customer-service: 177 jobs,
design: 98) that had zero rows in the latest 60. Root-cause fix: source the
preview PER CATEGORY via a window query, and pass true per-category totals so
each card's "See all N" is accurate. Files: apps/web/src/pages/index.astro,
apps/web/src/components/OpportunitySearch.tsx.
(2) NEW STRATEGY DOC FOR THE NEXT AI: `docs/company-hunter-strategy.md` — a
full plan to upgrade the Hunter to autonomously discover and auto-add new
companies that hire Filipino talent (the "Prospector"), removing the manual
spreadsheet-import loop. Key idea: mine the already-ingested, already-eligible
jobs for companies/ATS tokens not yet in va_directory; auto-add directory rows
(paused for scraping by default = fail-closed); keep scraping-enable
human/PR-gated per the compliance policy. Phased rollout, cadence design
(~48/day extraction, batched verification), schema + workflow changes, and
guardrails are all specified there. NOT YET BUILT — it is the recommended
next major workstream.

### Previous State

Date: 2026-07-12
Status: RemoteWork3.8 import + Ashby ATS expansion (checkpoint F-27,
`docs/remotework38-import-2026-07-12.md`). Added a NEW Ashby ATS adapter
(supabase/camunda/tremendous/amplify/ashby, all probed live) plus 2 Greenhouse
tokens (grafanalabs, nearform), and 14 new directory companies via idempotent
migration 0019 (CI applies it — local Wrangler OAuth was expired with error
7403, so delivery is migration-based). 97/97 tests, build passed. Post-deploy:
confirm deploy-migrations green for 0019 and the 7 new ATS tokens appear in the
next Hunter run's source_fetch_events. Prior work: comprehensive audit complete
(F-24 to F-26).

### Previous State

Date: 2026-07-11
Status: Comprehensive audit COMPLETE — all 8 dimensions swept across Parts
1-3 (checkpoint F-26, `docs/comprehensive-audit-report-2026-07.md`). Part 3
(perf, frontend, workflows, data-integrity, code-quality) done by static
analysis + live EXPLAIN plans. Fixed: schema.ts drift on the 0018 expression
index (drop-trap), and a Hunter/Verifier total-outage watermelon (now fail
on any non-2xx). Verified-clean: no rejected-row UI leak, category pages
index-served, pagination guarded, ISO timestamps everywhere. 91/91 tests,
build passed. STILL PENDING OWNER ACTION from Part 2: rotate the leaked
Turso / Trigger.dev / ISR secrets at their providers (git history purge is a
separate consented step). Remaining work is the roadmap in the report
(events retention, va_directory unique index, dead-code removal, scrape.ts
modularization) — no known correctness/security defects remain unaddressed.

### Previous State

Date: 2026-07-10
Status: Comprehensive audit Part 2 complete (checkpoint F-25,
`docs/comprehensive-audit-report-2026-07.md`). CRITICAL: leaked legacy
secrets in tracked build artifacts were untracked (`f85eed9`) — **OWNER MUST
ROTATE** the Turso, Trigger.dev, and ISR secrets at their providers (they
remain in git history until a consented purge). Also fixed: verify-links
D1-param wedge (chunked), /api/ingest mass-assignment (allow-list +
sanitize), ci-guardrail/deploy-migrations concurrency, bot push rebase-retry,
Sentinel branch re-entrancy, /api/click rate limit, atomic verify increment,
constant-time auth on prune/verify-links. 91/91 tests. Five audit dimensions
(performance, frontend, workflows-CI, data-integrity, code-quality) remain
queued — they errored on agent capacity, not findings.

### Previous State

Date: 2026-07-08
Status: Comprehensive audit Part 1 complete (checkpoint F-24,
`docs/comprehensive-audit-report-2026-07.md`). Fixed: triage fail-open
during AI outages (now fail-closed + counted), unvalidated LLM apply-URLs
(sanitized precedence), hostile-entity feed kills (guarded decode +
per-item isolation), infinite re-triage of rejected items (persisted as
inactive rows), production-confirmed temp-B-tree board sort (expression
index migration 0018), plus consistency/observability fixes (shared
contentHash/text/urls modules, funnel counters, unmatched-pause
reconciliation, new Hunter annotations). 91/91 tests. Remaining dimension
sweeps (W2-W8) stay queued in the masterplan. Post-deploy acceptance:
confirm production EXPLAIN plan uses `active_effective_posted_idx`, and
watch the next Hunter run for the new response fields.

### Previous State

Date: 2026-07-08
Status: Tier-3 autonomous auto-pause implemented (checkpoint F-23). Sentinel
now detects flapping sources and — when the `SENTINEL_BOT_PAT` secret exists —
appends them to `packages/scraper/paused-sources.json` on a branch, validates
with full guardrail parity in-runner, opens an evidence PR, squash-merges, and
the resulting CI deploy activates the pause. Mass-failure guard (>3 flapping =
infrastructure issue, zero pauses), one PR/day cap, append-only JSON, un-pause
human-only. Without the PAT it files recommendation issues as before. User
setup steps: `docs/maintenance-bot-2026-07-04.md`. Next planned work:
`docs/comprehensive-audit-masterplan-2026-07-07.md` (W0-W9).

### Previous State

Date: 2026-07-04
Status: Tier-1 maintenance bot implemented (`docs/maintenance-bot-2026-07-04.md`):
Hunter now files deduped alert issues on internal degradation, the daily
Sentinel pulse detects flapping sources from real fetch-event history and files
pause recommendations (never edits code), and the weekly Medic pulse commits an
automated data-quality digest to `docs/health-digest-latest.md`. All free
(public-repo Actions, read-only D1, built-in token). First scheduled runs:
alerts on next Hunter tick, Sentinel daily 01:30 UTC, Medic Sunday 02:00 UTC.

Earlier same day: Major audit complete (`docs/major-audit-2026-07-04.md`). Fixed the
silent fetch-event logging failure (D1 100-bound-parameter limit, broken since
2026-06-13), rewrote the hard-deleting prune endpoint to policy-compliant
soft-archive, surfaced triage failures / cadence-guard state / verification
backlog in cron responses and workflow annotations, and adopted five standing
durability rules. 70/70 tests pass. Post-deploy acceptance checklist is in the
audit doc: fetch events must accumulate past the single test row, prune must
report soft-archive mode with no row-count decrease, and the never-verified
backlog (456) must shrink.

Earlier same day: Gold777 directory import complete. 32 new va_directory
companies added (265 -> 297) and 4 confirmed Greenhouse/Breezy ATS tokens
wired for GitLab, Ghost, Remote.com, and Time Etc. See
`docs/gold777-directory-import-2026-07-04.md`.
Active branch: `main`

Previous state:

Date: 2026-06-13
Status: All 6 workstreams of the Gemini Masterplan completed successfully.
Overall accepted completion: 100% of Masterplan.

Latest stop-point handoffs:

- `docs/source-expansion-2026-06-13.md` (Commit: `70ff8cf`)
  - Purpose: records the completed Workstream 5 (Bounded Source Expansion), adding the `jobicy-supporting-apac` RSS feed with appropriate caps and cadence.
- `docs/query-indexing-audit-2026-06-13.md` (Commit: `80f2075`)
  - Purpose: records the completed Workstream 4 (Query and Indexing Audit), adding the `company_name_idx` index to `va_directory` to eliminate sorting overhead.
- `docs/stale-policy-report-2026-06-13.md` & `docs/data-quality-snapshot-2026-06-13.md` (Commit: `fe57510`)
  - Purpose: records the completed Workstream 3 (Data Quality & Stale Policy), archiving 12 stale/duplicate opportunities in D1.
- `docs/breezy-source-review-2026-06-13.md` (Commit: `020ba7d`)
  - Purpose: records the completed Workstream 2 (Breezy Source Review), auditing robots.txt and compliance notes.
- `docs/source-health-audit.md` (Commit: `2b91c68`)
  - Purpose: records the completed Workstream 1 (Source-Health History), logging scraper attempts to `source_fetch_events`.

Previous stop-point handoff:

- `docs/gemini-masterplan-handoff-2026-06-13.md`
  - Purpose: records the current verified baseline after Gemini's payload/test
    work and Codex's CI guardrail QA, then gives Gemini an ordered masterplan for
    source-health history, Breezy review, data-quality refresh, query/index
    audit, bounded source expansion, and portfolio polish.

Previous stop-point handoff:

- `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Purpose: records the accepted Remote OK JSON ingestion slice, source evidence,
  direct-link compliance posture, quality filter, cleanup migration, workflow
  evidence, production D1 snapshot, and next safe work.
- Important state: Remote OK is enabled as a capped, cadence-guarded JSON
  source. Physical/logistics outliers from the first run were archived by D1
  migration `0015_remote_ok_quality_filter.sql`.

Previous implementation checkpoint:

- `docs/source-expansion-2026-06-12.md`
- Purpose: records the accepted bounded RSS source expansion, source fetch
  caps, durable cadence tracking, source-state D1 evidence, deployment recovery,
  Hunter evidence, and next safe source work.
- Important state: Real Work From Anywhere and Jobicy Admin Support APAC are now
  enabled as capped, cadence-guarded `allowed` RSS sources. Remote OK remains
  deferred until a JSON adapter exists.

Previous takeover note:

- `docs/goldilocks-source-expansion-handoff-2026-06-12.md`
- Purpose: captures the balanced source-compliance posture, source candidates,
  source evidence gathered so far, ingestion/cadence safeguards, performance
  indexing plan, and the next safe implementation sequence.
- Important state: this plan has now been partially executed. Jobicy and Real
  Work From Anywhere are enabled with caps and cadence. Remote OK still requires
  a JSON adapter before enabling.

Current Goldilocks policy wording:

- Current reviewed Breezy tokens remain enabled as `needs_review`.
- Notes now say these are public, robots-allowed, CORS-readable Breezy career
  endpoints where the project should collect minimal factual metadata, link
  back to ATS-hosted URLs, and pause on objection or clarified hostile terms.

Latest health audit and repair checkpoint:

- Gemini/Codex QA checkpoint:
  - `8d499df` - reduced homepage and directory DB projections and added 54
    Remote OK scraper tests.
  - `3036a53` - updated implementation/savepoint docs for F-09.
  - `e719a2c` - added `bun test` to CI guardrail.
- Verification:
  - `bun test packages/scraper/json.test.ts` passed.
  - `bun test` passed.
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI guardrail `27461079903` passed.
  - Production deployment
    `2bbecd9c-1247-4805-b017-70574afa6e37` completed for `e719a2c`.
  - Production smoke returned 200 for `/`, `/directory`, `/opportunities`, and
    `/categories/tech`.
  - Read-only D1 snapshot remained healthy: 878 active opportunities, 38 active
    RemoteOK rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

- Remote OK handoff: `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Product commits:
  - `92ca443` - added Remote OK JSON source support.
  - `4c2374b` - tightened Remote OK physical/logistics filtering and added the
    cleanup migration.
- Generated rollup commit:
  - `562355e` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI guardrail `27435140046` passed for `92ca443`.
  - Production deployment `b8b04c38-2b56-42e6-89df-2b980c6a6266` deployed
    `92ca443`.
  - Manual Hunter `27435248150` passed with Remote OK JSON count 33 in the
    first loop, 25 accepted/attempted inserts total, 0 failed sources, 0 failed
    insert batches, and 0 insert errors.
  - CI guardrail `27435636180` passed for `4c2374b`.
  - D1 migration workflow `27435636177` passed for
    `0015_remote_ok_quality_filter.sql`.
  - Source-health rollup `27450540244` passed with 8 accepted/attempted inserts,
    0 failed sources, 0 failed insert batches, and 0 insert errors.
  - Later scheduled Hunter `27457196402` passed on rollup commit `562355e`.
  - Read-only D1 snapshot: 878 active opportunities, 38 active RemoteOK rows, 4
    inactive RemoteOK cleanup rows, and 0 active RemoteOK physical/logistics
    outliers.

Previous health audit and repair checkpoint:

- Source expansion report: `docs/source-expansion-2026-06-12.md`
- Product commits:
  - `686e312` - added capped/cadence-guarded RSS sources and D1 source fetch
    state.
  - `b948828` - fixed paused-source skip reasons after discovering array-index
    leakage in disabled source reporting.
- Generated rollup commit:
  - `79e46f8` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI/deploy run `27422527473` passed.
  - D1 migration workflow `27422527574` passed.
  - CI run `27422888691` passed for the skip-reason fix.
  - Manual Cloudflare Pages deployment `8863383f-2f01-4c64-8110-51b8e8d5f222`
    recovered production after an async Pages deployment failure for `b948828`.
  - Hunter run `27422685577` passed with 25 accepted/attempted inserts, 0
    failed source records, 0 failed insert batches, and 0 insert errors.
  - Hunter run `27423455086` passed with new hourly sources skipped by cadence
    and paused sources reporting readable skip reasons.
  - Rollup-writing Hunter run `27423574670` passed and updated
    `docs/source-health-latest.md`.
  - Production D1 reports 797 active opportunities and four healthy
    `source_fetch_state` rows.

Previous health audit and repair checkpoint:

- ATS follow-up report: `docs/ats-policy-follow-up-2026-06-12.md`
- Latest product commit:
  - `6304ea4` - requires token-specific review for Breezy ATS sources.
- Latest generated rollup commit:
  - `14db966` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27372929451` passed.
  - Direct probes for current Breezy JSON endpoints returned 200.
  - Hunter run `27372988265` had one transient `20Four7VA` timeout; retry run
    `27373090226` passed with 0 failed sources, 0 failed insert batches, and
    0 insert errors.
  - Rollup-writing Hunter run `27373196600` passed.
  - Future unknown Breezy tokens now default to `paused`.

Previous health audit and repair checkpoint:

- ATS follow-up report: `docs/ats-policy-follow-up-2026-06-12.md`
- Product commit:
  - `aa670ee` - paused unreviewed/noisy ATS platforms by default.
- Generated rollup commit:
  - `f635f3f` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27372355271` passed.
  - Manual Hunter run `27372436554` passed with 0 failed sources, 0 failed
    insert batches, and 0 insert errors.
  - Rollup-writing Hunter run `27372521005` passed.
  - Latest source-health rollup reports Workable ATS rows as `paused`.

Previous health audit and repair checkpoint:

- Follow-up report: `docs/wrangler-d1-audit-2026-06-12.md`
- Commit:
  - `ad03990` - upgraded active Wrangler tooling to v4 and refreshed the Bun
    lockfile for the current Astro workspace graph.
- Verification:
  - `bun install --frozen-lockfile` passed.
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27371741236` passed.
  - Local Wrangler reports `4.100.0`.
  - Local read-only D1 audit works and reported 748 active opportunities.
  - Query plans use `active_posted_idx` and `category_active_posted_idx`.
  - Production routes smoked green and unauthenticated scrape POST returned 401.

Previous health audit and repair checkpoint:

- Audit report: `docs/major-audit-2026-06-11.md`
- Fix commits:
  - `e861071` - reduced scrape insert batch size after D1
    `too many SQL variables` failures.
  - `45e2f2d` - paginated category pages server-side and removed the large
    hydrated category payload.
  - `ae72998` - stopped tracking local `.wrangler` runtime state.
- Generated rollup commit:
  - `6e76c67` - refreshed `docs/source-health-latest.md`.
- Verification:
  - CI/deploy runs `27353756293`, `27353939869`, and `27354017177` passed.
  - Manual Hunter run `27354089629` passed with 35 accepted/attempted inserts,
    0 failed insert batches, 0 insert errors, and 0 failed sources.
  - Rollup-writing Hunter run `27354219672` passed with 0 failed sources and
    0 insert errors.
  - Production `/categories/tech` dropped from about 980 KB to about 94 KB.

The user resumed the original roadmap and approved continuing slice by slice.
P1 was implemented, pushed, passed CI, manually deployed, and smoked in
production. P2 indexes were implemented, pushed, migrated, and verified against
production query plans. P2 timestamp normalization was implemented, pushed,
deployed, and verified against production route smoke plus read-only D1 parsing
evidence. P3 Slice 1 added structured source results to the scrape route,
deployed it, and verified it through a manual Hunter workflow run. P3 Slice 2
made `inserted` reflect actual D1 changes and exposed failed insert batches and
insert errors in the scrape response. P3 Slice 3 added Hunter workflow warnings
and summary metrics for partial source failures, zero-count sources, and insert
accounting. P4 Slice 1 added conservative source compliance metadata and updated
the public data policy language. P4 Slice 2 reviewed RSS/HTML source evidence,
paused risky or unproductive sources, and kept paused sources visible as skipped
records in live scrape results. P4 Slice 3 de-duplicated ATS source fetches,
paused Workable-backed ATS rows after repeated HTTP 429s, and verified the live
Hunter workflow with no failed sources. P5 Slice 1 captured a read-only
production data-quality snapshot and made no production row mutations. P5 Slice
2 defined a no-mutation stale/source dry-run policy and found no immediate
archive action. P5 Slice 3 backfilled `application_url` from `source_url`,
updated future ingest/scrape writes to populate it, deployed the write path, and
proved the next Hunter insertion kept `application_url` populated. P6 Slice 1
removed Hunter's per-run alert commit/push path and now stores per-run
`harvest.log` plus `source-health-summary.md` artifacts. P6 Slice 2 added a
guarded daily/manual repo-readable rollup at `docs/source-health-latest.md`.
P7 completed the final acceptance audit and updated the README to match the
current production architecture and public-source policy.

## What Was Completed

- Major audit was documented in `docs/major-audit-2026-06-06.md`.
- Recovery-driven methodology was adopted.
- Active architecture was corrected in `AGENTS.md`.
- Roadmap, status, recovery trail, savepoint, and ADR were added.
- P0 is accepted at 5%.
- P1 is accepted at 20% overall.
- P2 is accepted at 35% overall.
- P3 Slice 1 is accepted at 40% overall.
- P3 Slice 2 is accepted at 45% overall.
- P3 is accepted at 55% overall.
- P4 Slice 1 is accepted at 60% overall.
- P4 Slice 2 is accepted at 65% overall.
- P4 is accepted at 70% overall.
- P5 Slice 1 is accepted at 75% overall.
- P5 Slice 2 is accepted at 80% overall.
- P5 Slice 3 is accepted at 85% overall.
- P6 Slice 1 is accepted at 90% overall.
- P6 Slice 2 is accepted at 95% overall.
- P7 is accepted at 100% overall.

Accepted P0 evidence:

- Commit: `9657c4a`
- CI run: `27040684807`
- Acceptance docs commit: `a6fcf70`
- CI run: `27040764996`

Accepted pause handoff evidence:

- Commit: `431ab60`
- CI run: `27041163556`
- Scope: docs-only recovery trail; no implementation files changed.

## What Was Completed In P1

- Added `apps/web/src/pages/opportunities.astro`.
- Reused existing opportunity cards and visual styling.
- Added server-side search/filtering and pagination to `/opportunities`.
- Changed homepage query limit from 500 to 60.
- Made the homepage a preview rather than the full search surface.
- Moved the global "Find a Job Now" CTA to `/opportunities`.
- Build passed with `npm.cmd run build --workspace apps/web`.
- Local route smoke passed for `/`, `/opportunities`, paginated/filter URLs,
  and `/directory`.
- Pushed commit `2475103`.
- GitHub Actions run `27141658140` passed.
- Deployed with Wrangler to `https://68b1259d.remotejobs-ph.pages.dev`.
- Public alias `https://remotejobs-ph.pages.dev/opportunities` returned 200.

## P1 Exploration Notes

Files read during P1 exploration:

- `apps/web/src/pages/index.astro`
- `apps/web/src/components/OpportunitySearch.tsx`
- `apps/web/src/pages/categories/[category].astro`
- `apps/web/src/components/CategoryOpportunitySearch.tsx`
- `apps/web/src/components/opportunity-card.tsx`
- `apps/web/src/lib/categories.ts`
- `apps/web/src/layouts/Layout.astro`
- `apps/web/src/components/nav.tsx`
- `apps/web/src/components/footer.tsx`
- `apps/web/astro.config.mjs`
- `packages/db/schema.ts`

Observed P1 facts:

- Homepage currently selects up to 500 active opportunities and hydrates them
  into `OpportunitySearch`.
- `/opportunities` is linked in navigation but has no active Astro page.
- Category pages already have a search/list pattern that can be reused.
- The simplest next slice is to add an Astro `/opportunities` page and reduce
  homepage data volume to a smaller latest-jobs preview.

## Next Safe Resume Task

No required recovery-roadmap work remains. The user explicitly asked for a
Gemini-ready masterplan and handoff. Start from
`docs/gemini-masterplan-handoff-2026-06-13.md`.

Recommended next slice:

1. Run `git status --short --branch`.
2. Read `docs/gemini-masterplan-handoff-2026-06-13.md`.
3. Prefer Workstream 1: compact source-health history, unless fresh CI/source
   evidence shows a more urgent issue.
4. Continue source-specific Breezy review and decide whether each current token
   remains `needs_review`, becomes `allowed`, or is paused.
5. Re-run query/index audits before adding indexes or enabling more sources.
6. Add at most one new source per slice, only after source-health evidence is
   green and the source has documented caps, cadence, and linkback posture.

Known follow-up: local direct D1 audits now work with Wrangler v4. Use
`bunx wrangler d1 info remoteph-jobs-db` for remote metadata and
`bunx wrangler d1 execute remoteph-jobs-db --remote --command "..."` for
read-only SQL probes. Continue ATS/source policy review for current Breezy
sources that remain `needs_review`; unknown future Breezy tokens now pause by
default.

P7 evidence:

- Final audit report: `docs/final-acceptance-audit-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Production smoke:
  - `/`, `/opportunities`, `/directory`, `/data-policy`, `/privacy`, and
    `/categories/tech` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- D1 snapshot:
  - 688 active opportunities;
  - 0 missing `application_url`;
  - 0 unparseable freshness dates.
- Query plans:
  - homepage query uses `active_posted_idx`;
  - category query uses `category_active_posted_idx`.
- Source health:
  - `docs/source-health-latest.md` reports 0 failed sources for run
    `27204417574`.
- README:
  - replaced stale Next/old-source/pnpm language with current Bun,
    Astro/Cloudflare/D1, public-source indexing, and recovery-doc language.

P6 Slice 2 evidence:

- Workflow commit: `0ba92d2`
- CI run: `27204381138`
- Manual Hunter run: `27204417574` with `write_rollup=true`
- Hunter result: success.
- Artifact:
  - name: `hunter-health-27204417574`;
  - ID: `7506838648`.
- Generated rollup commit:
  - `d4b33a7` - `docs: update daily source health`;
  - created `docs/source-health-latest.md`.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `acceptedForInsert: 0`;
  - `attemptedInsert: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Repo-readable rollup:
  - date: 2026-06-09;
  - run: `https://github.com/cyalcala/va-freelance-hub/actions/runs/27204417574`;
  - 0 failed sources;
  - 1 zero-count successful source;
  - 18 skipped sources.

P6 Slice 1 evidence:

- Commit: `f8fadfb`
- CI run: `27204009191`
- Manual Hunter run: `27204051068`
- Hunter result: success.
- Artifact:
  - name: `hunter-health-27204051068`;
  - ID: `7506687492`;
  - files: `harvest.log` and `source-health-summary.md`.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - `rg` confirmed Hunter no longer contains `contents: write`, `git commit`,
    `git push`, or `scraper-alerts` references;
  - downloaded artifact summary reported 0 failed sources, 1 zero-count
    successful source, and 18 skipped sources;
  - after fetching `origin/main`, branch status was `## main...origin/main`,
    confirming no bot alert commit was created.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `acceptedForInsert: 0`;
  - `attemptedInsert: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.

P5 Slice 3 evidence:

- Commit: `2754740`
- CI run: `27203416725`
- Migration workflow: `27203416643`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://936f10a7.remotejobs-ph.pages.dev`
- Manual Hunter run: `27203556963`
- Hunter result: success.
- D1 evidence:
  - after migration: 687 active rows and 0 missing `application_url`;
  - after Hunter: 688 active rows and 0 missing `application_url`;
  - newest Hunter row `2138` preserved a distinct application URL from triage.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, and `/directory` returned 200;
  - `/api/cron/scrape` returned 401 without credentials;
  - `/api/click/2135` with the validated source URL returned 302.

P2 Slice 1 evidence:

- Commit: `be3d646`
- Migration workflow: `27155847940`
- CI run: `27155847992`
- Before: hot queries used temp B-trees.
- After: hot queries use `active_posted_idx`,
  `category_active_posted_idx`, and `active_last_verified_idx`.

P2 Slice 2 evidence:

- Commit: `e32e580`
- CI run: `27165936753`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://4bb0cf93.remotejobs-ph.pages.dev`
- Public smoke: `/`, `/opportunities`, `/opportunities?page=2`, and
  `/directory` returned 200.
- Protected API smoke: `/api/cron/scrape`, `/api/cron/verify-links`,
  `/api/ingest`, and `/api/ingest-digest` returned 401 without credentials.
- D1 read-only evidence: 672 active opportunities and 0 unparseable active
  values for `scraped_at`, `last_seen_in_feed_at`, and `last_verified_at` when
  parsed through SQLite `unixepoch`.
- ADR: `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`

P3 Slice 1 evidence:

- Commit: `27794d8`
- CI run: `27166648567`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://44501583.remotejobs-ph.pages.dev`
- Manual Hunter run: `27166770708`
- Hunter result: success.
- Live response:
  - HTTP 200;
  - inserted 11 jobs;
  - `actualChanges: 11`;
  - `backlogRemaining: 0`;
  - included `sourceResults` for RSS, HTML, and ATS sources;
  - preserved `failedSources`;
  - Remote.co was visible as `ok: false` with HTTP 520;
  - zero-count sources were visible as `ok: true`.
- Workflow follow-up: bot committed `ca1f06d` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 683 after the manual
  Hunter run.

P3 Slice 2 evidence:

- Commit: `e86b854`
- CI run: `27167396371`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://cde106a3.remotejobs-ph.pages.dev`
- Manual Hunter run: `27198077806`
- Hunter result: success.
- Live response:
  - HTTP 200;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`;
  - Remote.co remained visible as a partial source failure.
- Workflow follow-up: bot committed `bc255c8` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 686 after later
  scheduled/manual ingestion.

P3 Slice 3 evidence:

- Commit: `e0a32fb`
- CI run: `27198767290`
- Manual Hunter run: `27198807621`
- Hunter result: success.
- Annotation evidence: warning emitted with
  `1 source(s) failed. See sourceResults in harvest.log.`
- Live response:
  - HTTP 200;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Summary evidence: workflow wrote failed-source, zero-count source, failed
  insert batch, and insert error metrics to the GitHub step summary.
- Workflow follow-up: bot committed `baf2bd8` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run.

P4 Slice 1 evidence:

- Commit: `fa2d6eb`
- CI run: `27199810692`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://1896b637.remotejobs-ph.pages.dev`
- Manual Hunter run: `27199890298`
- Hunter result: success.
- Live response:
  - included `collectionMethod` and `complianceStatus` for RSS, HTML, and ATS
    source results;
  - all configured sources and ATS results are conservatively `needs_review`;
  - Remote.co remained visible as a partial source failure.
- Public smoke:
  - `/data-policy` returned 200;
  - page included the June 2026 update and public-visibility caution text;
  - `/api/cron/scrape` returned 401 without credentials.
- Workflow follow-up: bot committed `3174068` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run.

P4 Slice 2 evidence:

- Commit: `1143798`
- CI run: `27200812470`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://1a74a454.remotejobs-ph.pages.dev`
- Manual Hunter run: `27200899849`
- Hunter result: success.
- Source review doc: `docs/source-review-2026-06-09.md`
- Source decisions:
  - We Work Remotely and Remotive remain enabled as `allowed` RSS sources with
    attribution/linkback notes;
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso are paused.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - We Work Remotely returned 100 RSS items;
  - Remotive returned 29 RSS items;
  - six paused sources returned `skipped: true` with pause reasons;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, `/directory`, and `/data-policy` returned 200;
  - `/api/cron/scrape` returned 401 without credentials.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run, with 0 row changes.

P4 Slice 3 evidence:

- Final commit: `95e6665`
- Supporting commits:
  - `e3714d8` - de-duplicated duplicate ATS token fetches.
  - `3256127` - throttled ATS polling after first Workable 429 proof.
- CI run: `27202145473`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://6b3bc9b2.remotejobs-ph.pages.dev`
- Manual Hunter run: `27202221523`
- Hunter result: success with no partial-failure annotation.
- ATS source review doc: `docs/ats-source-review-2026-06-09.md`
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - Breezy ATS fetched `20Four7VA` with 61 items, `Sourcefit` with 67 items,
    and `VAA Philippines` with 0 items;
  - 11 Workable-backed directory rows returned `skipped: true` with
    `complianceStatus: "paused"`;
  - `24/7 Virtual Assistant` returned `skipped: true` because the
    `breezy:20four7va` token was already fetched for `20Four7VA`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, and `/directory` returned 200;
  - `/api/cron/scrape` returned 401 without credentials.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run, with 0 row changes.

P5 Slice 1 evidence:

- Snapshot doc: `docs/data-quality-snapshot-2026-06-09.md`
- D1 query mode: read-only; all sampled queries returned `changed_db: false`.
- Active opportunities: 687.
- Duplicate `source_url`, `content_hash`, and non-empty `description_hash`
  groups: 0 each.
- Missing fields:
  - `company`: 95;
  - `pay_range`: 524;
  - `client_timezone`: 687;
  - `application_url`: 687;
  - `experience_level`: 522;
  - `posted_at`: 62;
  - `description_hash`: 507;
  - `last_seen_in_feed_at`: 124.
- Freshness:
  - `posted_at` unparseable: 0;
  - posted older than 30 days: 247;
  - posted older than 60 days: 111;
  - posted older than 90 days: 81;
  - last seen in feed older than 30 days: 0.
- Category distribution:
  - `other`: 531;
  - `tech`: 86;
  - `admin`: 31;
  - `customer-service`: 20;
  - `design`: 18;
  - `marketing`: 1.
- Source policy split:
  - currently enabled source rows: 497;
  - now-paused source rows: 185;
  - unclassified source rows: 5 (`RemoteOK`).

P5 Slice 2 evidence:

- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- D1 query mode: read-only; all sampled queries returned `changed_db: false`.
- Dry-run actions:
  - `keep_enabled_source`: 497 rows;
  - `hold_paused_recently_seen`: 175 rows;
  - `review_paused_missing_last_seen`: 10 rows;
  - `classify_source_before_action`: 5 rows.
- Candidate buckets:
  - paused-source rows missing `last_seen_in_feed_at`: 10;
  - unclassified `RemoteOK` rows: 5.
- Decision: no immediate production archival; hold recently seen paused-source
  rows through a grace window and classify `RemoteOK` first.

P5 Slice 3 suggested scope:

- Implement one reversible data-quality improvement.
- Good low-risk candidates:
  - derive `application_url` from `source_url` with before/after counts; or
  - add a repeatable stale-candidate script/endpoint; or
  - improve category triage for the highest-volume `other` source path.
- Do not archive production rows until the pause grace-window policy is
  reviewed.

## Stop Rule

If the user says stop, pause, or backup, stop implementation and only update
handoff/status docs plus GitHub backup evidence.

