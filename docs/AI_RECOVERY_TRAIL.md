# AI Recovery Trail

## Purpose

This file defines how future agents and humans recover the project state without
depending on chat history. Every meaningful implementation move should be
recoverable from GitHub: code, docs, verification, workflow evidence, and the
next task.

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
8. `docs/major-audit-2026-06-06.md`
9. `docs/source-review-2026-06-09.md`
10. `docs/ats-source-review-2026-06-09.md`
11. `docs/data-quality-snapshot-2026-06-09.md`
12. `docs/stale-policy-dry-run-2026-06-09.md`
13. `docs/application-url-backfill-2026-06-09.md`
14. `docs/scraper-alerts.md`
15. `docs/scraper-troubleshooting.md`
16. `docs/decisions/ADR-001-recovery-driven-public-job-index.md`
17. `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`

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
- Source failure history lives in `docs/scraper-alerts.md` until replaced by a
  daily rollup/source-health table.

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
