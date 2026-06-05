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
7. `docs/major-audit-2026-06-06.md` - latest major audit findings.
8. `docs/decisions/ADR-001-recovery-driven-public-job-index.md` - accepted
   methodology and compliance decision.

## Agent Entry Points

- `AGENTS.md` is the main cross-agent instruction file.
- `CLAUDE.md` is a pointer back to the canonical recovery trail.
- Future agent-specific files should point back here instead of duplicating
  architecture details.

## Operational Docs

- `docs/scraper-alerts.md` records source failure history, but it is currently
  noisy and should be replaced by daily rollups in P6.
- `docs/scraper-troubleshooting.md` contains useful history but may reference
  older Trigger.dev-era assumptions.
- `docs/system-audit-and-optimizations.md` contains earlier optimization notes;
  check against `docs/major-audit-2026-06-06.md` before treating it as current.

## Historical Or Backup Code Paths

- `apps/web-nextjs-backup` is a backup/historical Next.js app path.
- `packages/zig-parser` exists but is not the active production HTML parser.
- `.trigger` and `trigger.config.ts` are historical unless a newer accepted
  decision reactivates Trigger.dev.

## Current Resume Rule

If the repo is clean and `docs/HANDOFF.md` still says work is paused, do not
start implementation until the user asks to resume. If the user resumes, start
with P1 Slice 1 from `docs/IMPLEMENTATION_STATUS.md`.
