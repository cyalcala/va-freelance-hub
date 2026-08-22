# AI Recovery Trail

## Purpose

This file defines how future agents and humans recover the project state without
depending on chat history. Every meaningful implementation move should be
recoverable from GitHub: code, docs, verification, workflow evidence, and the
next task.

## Current Recovery Checkpoint — 2026-08-22 Gauntlet planning

Status: **PLANNING ONLY**. The synchronized planning baseline is `bd84cc1` on
`main`; the last accepted behavior remains `07f582b`, deployed by successful run
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
