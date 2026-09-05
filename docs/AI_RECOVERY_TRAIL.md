# AI Recovery Trail

## Purpose

This file defines how future agents and humans recover the project state without
depending on chat history. Every meaningful implementation move should be
recoverable from GitHub: code, docs, verification, workflow evidence, and the
next task.

## Current Recovery Checkpoint — 2026-09-05 SP-23 control plane

Continuation: `docs/SYSTEM_SAVEPOINT.md` Run 42 supersedes the release/next-action
facts below. Independent review repaired the live scrape caller's fail-open
fallback on registry/opt-out errors, removed shared policy state, and bounded
the remaining SP-23 admission/publication work. Fresh dated production evidence
separates raw sightings and scheduler outcomes from accepted supply. SP-23 still
does not have KEEP or autonomous-admission acceptance.

Status: **SP-23 is implemented/control-plane VERIFYING, explicitly not
`KEEP` and not production-accepted.** The branch
`codex/sp-23-transition-plane` contains commits `f6c6d21`, `d3ae321`, and
`d909d96`: deterministic typed transitions, a capped canary resolver envelope,
and schema migration 0039 with an append-only guarded transition-event path.
It also contains `c634e1e`, a narrow Hunter workflow status repair for healthy
zero-insert scrapes.

The code is deliberately not a live source expansion. Registry canaries remain
disabled in the legacy scrape loop until a later unified publisher can apply
the source cap to final canonical public candidates across every insertion
path. Exact-six fallback behavior remains active and uncapped. At this
checkpoint migration 0039 is not deployed, no registry/profile source has
been activated or promoted, no shadow-dispatch schedule has been enabled, and
no opportunity publication path has changed.

Recover by reading `docs/SYSTEM_SAVEPOINT.md` Run 41, then the Source
Replenishment Masterplan and SP implementation plan. The next evidence is
independent review plus exact-SHA CI/deploy/read-only D1 confirmation. Do not
turn SP-23 into `KEEP`, restart historical registry SQL, or infer autonomy from
the deterministic replay fingerprints: a real unified publisher and recurrent
real-source shadow/canary observations remain required by the complete
Autonomy Cutover Predicate.

## Current Recovery Checkpoint — 2026-08-31 Source Replenishment constitution

Status: **Durable masterplan and ADR-007 adopted as planning authority; zero
production behavior change.** The authority chain now separates the permanent
source constitution from the 2026 Source Perpetuity bootstrap strategy and its
sole executable SP unit queue.

The permanent destination is constitutional autonomous replenishment rather
than founder approval for each ordinary source. That autonomy becomes valid
only after recurrent shadow dispatch/observations, enforced canary bounds,
schema-contract validation, typed least-privilege transitions, replay, and
rollback have accepted implementation evidence. Exact-six remains the current
production boundary. External permission, contracts, payments, credentials,
constitutional changes, genuine legal disputes, and appeals still require
accountable external/human/organizational authority.

Resume at `docs/SYSTEM_SAVEPOINT.md`, then follow the read order in
`docs/DOCS_INDEX.md`. The next action is a bounded implementation-plan
reconciliation; do not replay historical registry SQL. This file remains a
milestone pointer rather than a duplicate mutable-state log.

## Current Recovery Checkpoint — 2026-08-29 Source Perpetuity

Status: **SP-08, SP-09, SP-16, SP-17 TERMINAL — KEEP; SP-12 VERIFYING at a deliberate safety boundary.** This checkpoint closes one long owner-authorized unattended session ("proceed with all... do not stop... fair and reasonable... approved" while the owner rested ~8 hours).

Terminal this session, each merged/deployed with exact-SHA CI/deploy evidence:

- **SP-08** evidence packets + review-debt alerts — behavior `075be3b`+`fc4e5ab` (PR #88) → `main` `a03631b`.
- **SP-09** Workable global XML feasibility — one bounded live probe of the real feed → `GITHUB_ACTION_PREPROCESSING` decision; behavior `618dba9` (PR #89) → `main` `806b2d7`.
- **SP-16** no-account employer "bring your feed" intake — behavior `8d1a05a` (PR #90) → `main` `eba3c0f`.
- **SP-17** partner/permission evidence pipeline (Ashby/Breezy/Jobvite, revalidated live) — behavior `cede086` (PR #91) → `main` `39e88b5`.

**SP-12 (Greenhouse minimal-index shadow) is VERIFYING, not KEEP.** Real live SP-07 shadow probe against `greenhouse:grafanalabs` returned healthy (134 real jobs, robots allowed); the SP-08 evidence packet is `review_ready`. Code merged (`7769d69` → `main` `23e74dd`, PR #92) with **zero D1 mutation** — the actual `source_registry`/`provider_profiles`/`source_decisions` write was **blocked by the harness's own auto-mode safety classifier** (a real compliance-state change on a source outside the exact six) and was deliberately not routed around; it awaits explicit owner authorization. Evidence: `docs/gauntlet/evidence/SP-12-greenhouse-grafanalabs-day1-evidence.md`. Exact-six `ROBOTS_ENFORCE_SOURCE_IDS` and the five-token `ATS_TOKEN_POLICIES` Greenhouse pause are both unchanged.

Resume in the canonical order defined at the top of `docs/DOCS_INDEX.md`, with
`docs/SYSTEM_SAVEPOINT.md` as the sole mutable current-session baton. Use
`docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md` to reconstruct a fresh AI
session. Next exact action: owner reviews the SP-12 evidence doc and either
authorizes the pending write or names a different curated board; SP-11/13/14/15
would hit the identical classifier block at their own equivalent step.

This file is updated for milestones and interruptions, not after every unit.
The savepoint plus SP plan/status ledgers carry mutable current execution facts.

## Recovery Checkpoint — 2026-08-29 Source Perpetuity SP-00..SP-02 (historical)

Status: **Measurement foundation TERMINAL — KEEP (SP-00..SP-02).** SP-01 exact
source identity and SP-02 truthful source-economics + 304 unchanged-separation
fix are merged and deployed; latest behavior `ed0040a` (PR #82), exact-SHA
CI/deploy `33243425545` applied migration `0035` and deployed Pages. Current
exact-six production behavior remains unchanged. Next dependency-ready unit at
the time of this checkpoint: **SP-03** provider/source registry foundation.

## Recovery Checkpoint — 2026-08-22 Gauntlet planning (historical)

Status: **PLANNING COMPLETE — KEEP**. The synchronized audit baseline was
`bd84cc1`; the planning package is backed up on `main` at `d21cd9e` and passed
GitHub Actions run `32552942171` (docs-only deploy correctly skipped). The last
accepted production behavior remains `07f582b`, deployed by successful run
`32475868471`. No Gauntlet implementation unit has begun.

Current scheduled evidence includes successful watchdog `32550368138`,
source-health `32546699929`, directory `32545246416`, Prospector `32544606954`,
and enrichment `32550872494` runs. Treat the generated payloads as evidence;
workflow success alone is not production-health acceptance.

Recovery and resume order:

1. [System Savepoint](./SYSTEM_SAVEPOINT.md)
2. [Master Execution Plan](./MASTER_EXECUTION_PLAN.md)
3. [Portable Implementation Units](./gauntlet/IMPLEMENTATION_UNITS.md)
4. [Agent-Reach Study](./research/agent-reach-study-2026-08-22.md)
5. [Implementation Status](./IMPLEMENTATION_STATUS.md)
6. [Handoff](./HANDOFF.md)

The next unit is read-only `REC-01`; it inventories and classifies existing
worktrees without deleting them. The first production implementation after that
preflight is `DATA-05A`. Before starting either unit, re-sync `main`, preserve
unrelated work, and record the actual starting SHA because automated digest
commits may advance the branch. Partial implementation is recoverable only when
clearly marked non-accepted on an isolated pushed branch.

## Historical Recovery Checkpoint — 2026-08-10 (superseded)

The current recoverable work is the paused production-hardening branch
codex/production-apex-audit-2026-08-09. It is a backup checkpoint, not a
production release. Do not deploy or merge it merely because the code is
present.

The primary code checkpoint is 33c1995 on the remote branch of the same name.
No GitHub Actions run was triggered by that branch push because the CI guardrail
targets main and pull requests. Treat the saved branch as recoverable code and
documentation, not as an accepted release.

Read docs/major-production-audit-2026-08-10.md and
docs/decisions/ADR-005-cloudflare-pages-compatibility-line.md before resuming.
They contain the five-workstream audit ledger, fixed findings, residual
advisories, deferred release gates, and the reason the project remains on its
Cloudflare Pages-compatible adapter line. Then read HANDOFF.md and
SYSTEM_SAVEPOINT.md for the exact Git savepoint.

The owner’s 2/5 marker is a stop-and-handoff marker. All five workstreams were
audited; no deployment acceptance is implied.

The model is intentionally similar to `cyalcala/techwriter-bot`: small slices,
documented checkpoints, percentage progress, GitHub-backed evidence, and a clear
handoff after every important move.

## Canonical Recovery Files

Read these first when starting a new work session:

1. `docs/DOCS_INDEX.md`
2. `AGENTS.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/HANDOFF.md`
5. `docs/MASTER_EXECUTION_PLAN.md`
6. `docs/AI_RECOVERY_TRAIL.md`
7. `docs/SYSTEM_SAVEPOINT.md`
8. `docs/ats-policy-follow-up-2026-06-12.md`
9. `docs/wrangler-d1-audit-2026-06-12.md`
10. `docs/major-audit-2026-06-11.md`
11. `docs/major-audit-2026-06-10.md`
12. `docs/major-audit-2026-06-06.md`
13. `docs/source-review-2026-06-09.md`
14. `docs/ats-source-review-2026-06-09.md`
15. `docs/data-quality-snapshot-2026-06-09.md`
16. `docs/stale-policy-dry-run-2026-06-09.md`
17. `docs/application-url-backfill-2026-06-09.md`
18. `docs/hunter-health-artifacts-2026-06-09.md`
19. `docs/source-health-rollup-2026-06-09.md`
20. `docs/source-health-latest.md`
21. `docs/final-acceptance-audit-2026-06-09.md`
22. `docs/scraper-alerts.md`
23. `docs/scraper-troubleshooting.md`
24. `docs/decisions/ADR-001-recovery-driven-public-job-index.md`
25. `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`
26. `docs/major-code-audit-2026-08-09.md`
27. `docs/decisions/ADR-004-migrate-before-deploy-and-validate-fts.md`

## Latest Recovery Checkpoint — 2026-08-09

- Branch: `main`
- Production merge commit: `5bc6d09`; source implementation commit: `2ea2226`.
- Read the major audit and ADR-004 before changing the release, FTS, or pulse
  workflows. They explain why FTS indexes all external-content rows, why only
  indexed text triggers an FTS rewrite, and why production migration must
  precede Pages deployment.
- Local evidence: `bun run verify` passed on the merged tree in 55.8 seconds with 190 tests, zero
  failures, 354 assertions, strict TypeScript, and an Astro production build.
  The four edited workflow files parse with PyYAML.
- Production acceptance: GitHub Actions run `31317525008` passed its
  validation job and then the migration-first release job: D1 migrations,
  remote FTS integrity, and Pages deployment all completed successfully. Public
  smoke checks for `/`, `/opportunities`, `/opportunities?q=assistant`, and
  `/directory` each returned HTTP 200.
- Do not run D1 migration 0027 manually unless recovering from a failed main
  release. If recovery is necessary, use the manual `Deploy Database
  Migrations` workflow with a recorded reason; it shares the production D1
  lock and performs the FTS integrity check.

## Required Backup Loop

Use this loop for every non-trivial change:

1. Choose the smallest useful slice.
2. Make the change.
3. Run targeted local verification.
4. Run `bun run build` when the change touches app behavior, routing, schema,
   runtime code, or frontend rendering.
5. For data/indexing work, capture read-only D1 evidence such as counts, query
   plans, and before/after timings where available.
6. Commit the code or documentation slice.
7. Push to GitHub.
8. Watch GitHub Actions for that commit.
9. Update `docs/IMPLEMENTATION_STATUS.md` with:
   - phase and overall percentage;
   - commit hash;
   - verification commands and result;
   - GitHub Actions run ID and result;
   - production smoke check when relevant;
   - exact next task.
10. Commit and push the acceptance checkpoint when the evidence is known.

For tiny docs-only updates, `git diff --check` plus a successful GitHub Actions
run is enough verification. For code paths, do not replace behavior tests with
documentation.

## Required Evidence

Record the evidence that matches the type of change:

| Change type | Minimum evidence |
| --- | --- |
| Docs/process | `git diff --check`, commit hash, GitHub Actions run ID |
| Frontend route/UI | `bun run build`, route smoke check, GitHub Actions run ID |
| Database/indexing | migration file, query plan before/after, D1 count sanity check |
| Ingestion | source-level counts, failed-source list, insert accounting, workflow run ID |
| Compliance/source policy | source config status, reason, policy note, source-review evidence, opt-out path |
| Production acceptance | immutable commit, deployed URL/status, smoke response evidence |

## Percentage Rules

Percentages are weighted acceptance points, not optimism.

Overall percentage is the sum of accepted phase points:

| Phase | Weight | Acceptance definition |
| --- | ---: | --- |
| P0 | 5% | Recovery docs, roadmap, ADR, and agent context are committed, pushed, and CI-accepted |
| P1 | 15% | `/opportunities` exists and homepage payload is reduced with route smoke evidence |
| P2 | 15% | D1 indexes and datetime normalization are migrated and query plans improve |
| P3 | 20% | Ingestion returns structured source status and no longer hides ATS/write failures |
| P4 | 15% | Source compliance states are explicit and high-risk sources are paused or approved |
| P5 | 15% | Data quality gaps are backfilled or intentionally marked unknown |
| P6 | 10% | Alerts become rollups and backup/reporting hygiene is stable |
| P7 | 5% | Final audit passes and portfolio docs match production behavior |

Partial phase credit is allowed only when a sub-slice has its own acceptance
evidence. Example: P3 can move from 0% to 5% when source status responses are
merged and CI-accepted, even before alert rollups ship.

## Watermelon And Rathole Controls

Watermelon risk means a system is green externally but red internally. In this
repo, a green GitHub Actions run is not enough when the workflow body reports
failed sources, zero-item fetches, insert errors, or stale data. Acceptance must
include source-level health.

Rathole risk means over-investing in one failing source or one elegant internal
abstraction while the public product remains broken. Time-box source-specific
debugging. If a source repeatedly fails, mark it `paused` or `needs_review`,
record why, and keep the rest of the ingestion system healthy.

## Decision Trail Rules

- Product strategy and phase weights live in `docs/MASTER_EXECUTION_PLAN.md`.
- Current status, percentages, and next tasks live in
  `docs/IMPLEMENTATION_STATUS.md`.
- Durable architectural decisions live in `docs/decisions/`.
- Raw audit evidence and findings live in `docs/major-audit-2026-06-06.md`.
- Latest ATS source policy hardening evidence lives in
  `docs/ats-policy-follow-up-2026-06-12.md`.
- Latest Wrangler/D1 audit recovery evidence lives in
  `docs/wrangler-d1-audit-2026-06-12.md`.
- Major health repair evidence lives in `docs/major-audit-2026-06-11.md`.
- Source failure history previously lived in `docs/scraper-alerts.md`; Hunter
  now uploads per-run `harvest.log` and `source-health-summary.md` artifacts.
  The latest repo-readable rollup lives in `docs/source-health-latest.md`.

Do not bury important decisions only in commit messages or chat.

## Pause And Handoff Protocol

When the user asks to stop, pause, or only back up progress:

1. Stop implementation immediately.
2. Confirm whether the working tree has code changes.
3. If no code changes exist, do not invent a code checkpoint.
4. Update `docs/HANDOFF.md`, `docs/IMPLEMENTATION_STATUS.md`, and
   `docs/SYSTEM_SAVEPOINT.md` with the exact pause point.
5. Commit, push, and watch CI for the docs-only recovery checkpoint.
6. Record the checkpoint evidence before ending the turn.
