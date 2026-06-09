# Source Health Rollup - 2026-06-09

## Purpose

P6 Slice 2 added a repo-readable source-health rollup so future agents can see
the current Hunter state without opening every workflow log. The rollup keeps
the low-noise behavior from P6 Slice 1: per-run evidence remains in artifacts,
and the repo gets at most one scheduled source-health rollup per UTC day.

## Change

- `.github/workflows/gha-hunter-pulse.yml` now supports a manual
  `write_rollup` input for acceptance testing.
- A new `daily-rollup` job downloads the Hunter artifact and writes
  `docs/source-health-latest.md`.
- The rollup job is guarded:
  - scheduled runs commit only if no rollup exists for the current UTC date;
  - manual runs commit only when `write_rollup=true`.
- The main Hunter job still uses read-only contents permissions; write
  permission is isolated to the rollup job.

## Verification

- Workflow commit: `0ba92d2` (`ci: add source health rollup`).
- Local verification:
  - `git diff --check` passed with only normal CRLF warnings.
  - `rg` confirmed the rollup write path is isolated to `daily-rollup`.
- GitHub Actions:
  - CI guardrail run `27204381138` passed for the workflow change.
- Manual rollup Hunter:
  - run `27204417574` passed with `write_rollup=true`;
  - Hunter artifact `hunter-health-27204417574` uploaded successfully;
  - artifact ID: `7506838648`;
  - `Update Source Health Rollup` job passed;
  - rollup commit: `d4b33a7` (`docs: update daily source health`).
- Hunter response:
  - HTTP 200.
  - `inserted: 0`.
  - `actualChanges: 0`.
  - `acceptedForInsert: 0`.
  - `attemptedInsert: 0`.
  - `insertFailedBatches: 0`.
  - `insertErrors: []`.
  - `failedSources: []`.
  - `skipped: 257`.
- Repo-readable rollup:
  - `docs/source-health-latest.md` exists.
  - Date: 2026-06-09.
  - Workflow run:
    `https://github.com/cyalcala/va-freelance-hub/actions/runs/27204417574`.
  - Summary reports 0 failed sources, 1 zero-count successful source, and 18
    skipped sources.

## Notes

The rollup commit was created by the workflow using `GITHUB_TOKEN`, so it did
not spawn another push-triggered CI run. The recovery docs checkpoint that
records this evidence should be pushed by a human/agent-authenticated git push
and watched through the normal CI guardrail.
