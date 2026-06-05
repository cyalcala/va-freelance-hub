# Implementation Status

## Start Here

When starting a new chat or work session, read these in order:

1. `AGENTS.md`
2. `docs/MASTER_EXECUTION_PLAN.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/AI_RECOVERY_TRAIL.md`
5. `docs/SYSTEM_SAVEPOINT.md`
6. `docs/major-audit-2026-06-06.md`

## Current Focus

Phase P0: Recovery docs and methodology.

The goal is to adopt a techwriter-bot-style execution process: small slices,
evidence gates, GitHub-backed checkpoints, and percentage progress after each
accepted slice.

## Overall Completion

Current status before CI acceptance of this methodology checkpoint: 0%.

Target after this checkpoint is committed, pushed, and accepted by GitHub
Actions: 5%.

## Phase Status

| Phase | Weight | Current accepted % | Status | Next acceptance evidence |
| --- | ---: | ---: | --- | --- |
| P0 Recovery docs and methodology | 5% | 0% | In progress | Docs commit, push, GitHub Actions success |
| P1 Product surface and payload | 15% | 0% | Not started | `/opportunities` 200 and homepage payload reduction |
| P2 Indexing and datetime foundation | 15% | 0% | Not started | D1 migration and query-plan evidence |
| P3 Ingestion observability | 20% | 0% | Not started | Structured per-source status and insert accounting |
| P4 Source compliance and portfolio | 15% | 0% | Not started | Source status config and data-policy update |
| P5 Data quality and triage | 15% | 0% | Not started | Missing-field metrics and better category distribution |
| P6 Reporting and backup hygiene | 10% | 0% | Not started | Daily rollup replaces noisy repeated alert commits |
| P7 Final acceptance and polish | 5% | 0% | Not started | Re-audit and production acceptance |

## Latest Accepted Checkpoint

### Major Audit Baseline

- Date: 2026-06-06
- Commit: `74c0416`
- Message: `docs: add major audit and agent instructions`
- GitHub Actions run: `27039365056`
- Result: success
- Evidence: `docs/major-audit-2026-06-06.md`

## Pending Checkpoint

### P0 Recovery Methodology

- Status: pending commit, push, and GitHub Actions acceptance
- Planned commit: `docs: adopt recovery-driven execution plan`
- Local verification target: `git diff --check`
- CI acceptance target: latest `ci-guardrail` success for pushed commit
- Expected completion after acceptance: 5%

## Next Task After P0

P1 Slice 1: add `/opportunities` as the canonical paginated opportunity board
and reduce homepage data volume.

Acceptance criteria:

- `/opportunities` builds locally and returns 200 after deploy.
- Homepage renders a limited latest-opportunities preview rather than shipping
  the full active jobs dataset.
- `bun run build` passes.
- GitHub Actions run ID is recorded.
- Production smoke evidence is recorded for `/`, `/opportunities`, and
  `/directory`.

## Open Risks To Keep Visible

- Green workflows can hide source failures unless source status is captured.
- Some sources may be public but not automation-friendly under their terms.
- Date strings are mixed format and can make stale comparisons unreliable.
- Homepage payload will keep growing if the board remains a fully hydrated
  all-jobs surface.
- `other` category dominance makes browsing weaker than the raw job count
  suggests.
