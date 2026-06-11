# Docs Index

## Purpose

This index tells future AI agents which documents are canonical, which are
historical, and where to resume. Start here instead of guessing from filenames.

## Canonical Recovery Trail

Read these in order:

1. `AGENTS.md` - active project context and operating rules.
2. `docs/IMPLEMENTATION_STATUS.md` - current percentage, phase status, and next
   task.
3. `docs/HANDOFF.md` - latest stop/resume note.
4. `docs/MASTER_EXECUTION_PLAN.md` - full roadmap and acceptance strategy.
5. `docs/AI_RECOVERY_TRAIL.md` - backup loop and evidence requirements.
6. `docs/SYSTEM_SAVEPOINT.md` - current saved state and operational baseline.
7. `docs/major-audit-2026-06-11.md` - latest major health audit and hotfix
   evidence.
8. `docs/major-audit-2026-06-10.md` - post-Lens 2 health audit and timestamp
   backfill evidence.
9. `docs/major-audit-2026-06-06.md` - original recovery-roadmap major audit
   findings.
10. `docs/source-review-2026-06-09.md` - latest RSS/HTML source keep/pause
   evidence.
11. `docs/ats-source-review-2026-06-09.md` - latest ATS source policy evidence.
12. `docs/data-quality-snapshot-2026-06-09.md` - latest production data-quality
   metrics.
13. `docs/stale-policy-dry-run-2026-06-09.md` - latest no-mutation stale policy
   dry run.
14. `docs/application-url-backfill-2026-06-09.md` - latest reversible P5 data
   quality improvement.
15. `docs/hunter-health-artifacts-2026-06-09.md` - latest P6 Hunter reporting
   and backup-hygiene checkpoint.
16. `docs/source-health-rollup-2026-06-09.md` - latest P6 source-health rollup
   checkpoint.
17. `docs/source-health-latest.md` - current repo-readable source-health state.
18. `docs/final-acceptance-audit-2026-06-09.md` - final recovery-roadmap
   acceptance audit.
19. `docs/decisions/ADR-001-recovery-driven-public-job-index.md` - accepted
   methodology and compliance decision.
20. `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md` - accepted
   timestamp normalization decision.

## Agent Entry Points

- `AGENTS.md` is the main cross-agent instruction file.
- `CLAUDE.md` is a pointer back to the canonical recovery trail.
- Future agent-specific files should point back here instead of duplicating
  architecture details.

## Operational Docs

- `docs/scraper-alerts.md` records historical source failure commits. P6 Slice
  1 stopped new per-run alert commits; use Hunter artifacts for current per-run
  evidence until the repo-readable rollup lands.
- `docs/source-review-2026-06-09.md` records the current RSS/HTML source
  compliance and usefulness review behind P4 Slice 2.
- `docs/ats-source-review-2026-06-09.md` records the ATS duplicate-token and
  Workable pause decisions behind P4 Slice 3.
- `docs/data-quality-snapshot-2026-06-09.md` records the read-only P5 Slice 1
  production data-quality baseline.
- `docs/stale-policy-dry-run-2026-06-09.md` records the P5 Slice 2 no-mutation
  stale/source candidate policy.
- `docs/application-url-backfill-2026-06-09.md` records the P5 Slice 3
  reversible application URL backfill and ingestion write-path evidence.
- `docs/hunter-health-artifacts-2026-06-09.md` records the P6 Slice 1 Hunter
  artifact-reporting change and no-bot-commit proof.
- `docs/source-health-rollup-2026-06-09.md` records the P6 Slice 2 rollup job
  and generated `docs/source-health-latest.md` proof.
- `docs/source-health-latest.md` is the compact current source-health rollup.
- `docs/final-acceptance-audit-2026-06-09.md` records the P7 final acceptance
  audit.
- `docs/major-audit-2026-06-11.md` records the latest health audit, Hunter D1
  insert recovery, category payload reduction, repo hygiene cleanup, and
  post-fix verification evidence.
- `docs/scraper-troubleshooting.md` contains useful history but may reference
  older Trigger.dev-era assumptions.
- `docs/system-audit-and-optimizations.md` contains earlier optimization notes;
  check against `docs/major-audit-2026-06-06.md` before treating it as current.
- `docs/major-audit-2026-06-10.md` is the post-Lens 2 health audit showing
  readiness and the final timestamp normalization completion.

## Historical Or Backup Code Paths

- `apps/web-nextjs-backup` is a backup/historical Next.js app path.
- `packages/zig-parser` exists but is not the active production HTML parser.
- `.trigger` and `trigger.config.ts` are historical unless a newer accepted
  decision reactivates Trigger.dev.

## Current Resume Rule

If the repo is clean, resume from the current focus in
`docs/IMPLEMENTATION_STATUS.md` and the next safe task in `docs/HANDOFF.md`.
If the user says stop, pause, or backup, only update the recovery docs and push
that checkpoint.
