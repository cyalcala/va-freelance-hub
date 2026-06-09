# Hunter Health Artifacts - 2026-06-09

## Purpose

P6 Slice 1 removed repeated per-run scraper alert commits from the Hunter
workflow while preserving source-level visibility. Hunter now emits warnings,
keeps the GitHub step summary useful, and uploads `harvest.log` plus a compact
`source-health-summary.md` artifact for each run.

## Change

- `.github/workflows/gha-hunter-pulse.yml` now uses `contents: read` instead of
  `contents: write`.
- The old auto-commit block that appended to `docs/scraper-alerts.md`, committed
  it, and pushed from every failing run was removed.
- A new `Evaluate Hunter Health` step keeps warning/error annotations and writes
  `source-health-summary.md`.
- A new `Upload Hunter Evidence` step uploads:
  - `harvest.log`;
  - `source-health-summary.md`.

## Verification

- Commit: `f8fadfb` (`ci: stop hunter alert commit spam`).
- Local verification:
  - `git diff --check` passed with only normal CRLF warnings.
  - `rg` confirmed the workflow no longer contains `contents: write`,
    `git commit`, `git push`, or `scraper-alerts` references.
- GitHub Actions:
  - CI guardrail run `27204009191` passed.
- Hunter workflow:
  - Manual Hunter run `27204051068` passed.
  - The run completed `Evaluate Hunter Health`, `Generate Pulse Summary`, and
    `Upload Hunter Evidence`.
  - The artifact `hunter-health-27204051068` uploaded successfully.
  - Artifact ID: `7506687492`.
  - Artifact digest:
    `3e755158b6dc584502cf57bf7b44dad0394170ad7786c899bfdf6a0ed854f114`.
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
- Downloaded artifact check:
  - `harvest.log`: 10,500 bytes.
  - `source-health-summary.md`: 3,393 bytes.
  - Summary reported 0 failed sources, 1 zero-count successful source, and 18
    skipped sources.
- Git backup check:
  - `git fetch origin main` followed by `git status --short --branch` reported
    `## main...origin/main`.
  - `git log --oneline -5` showed `f8fadfb` as the latest commit, confirming
    Hunter did not create a bot alert commit.

## Remaining P6 Work

This slice stops commit spam and preserves per-run evidence. P6 still needs a
compact daily or latest source-health report that can be read from the repo
without opening each workflow run.
