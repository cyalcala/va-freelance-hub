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

Phase P2: Indexing and datetime foundation.

P1 is accepted. The public site now has a canonical `/opportunities` board,
server-side pagination/filtering, and a smaller homepage preview.

## Overall Completion

Current accepted completion: 20%.

P0 and P1 are accepted. The repository has recovery docs, a weighted roadmap,
agent context, a live `/opportunities` board, and production smoke evidence for
the product-surface fix.

## Phase Status

| Phase | Weight | Current accepted % | Status | Next acceptance evidence |
| --- | ---: | ---: | --- | --- |
| P0 Recovery docs and methodology | 5% | 5% | Accepted | Complete |
| P1 Product surface and payload | 15% | 15% | Accepted | Complete |
| P2 Indexing and datetime foundation | 15% | 0% | Not started | D1 migration and query-plan evidence |
| P3 Ingestion observability | 20% | 0% | Not started | Structured per-source status and insert accounting |
| P4 Source compliance and portfolio | 15% | 0% | Not started | Source status config and data-policy update |
| P5 Data quality and triage | 15% | 0% | Not started | Missing-field metrics and better category distribution |
| P6 Reporting and backup hygiene | 10% | 0% | Not started | Daily rollup replaces noisy repeated alert commits |
| P7 Final acceptance and polish | 5% | 0% | Not started | Re-audit and production acceptance |

## Latest Accepted Checkpoint

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

## Next Task

P2 Slice 1: add query-aligned D1 indexes and capture query-plan evidence.

Acceptance criteria:

- Add indexes for the hot opportunity and verifier query shapes.
- Run migration against production D1 only after it is committed.
- Capture before/after query plans where possible.
- Build/CI remains green.
- Update docs with migration and query-plan evidence.

## Open Risks To Keep Visible

- Green workflows can hide source failures unless source status is captured.
- Some sources may be public but not automation-friendly under their terms.
- Date strings are mixed format and can make stale comparisons unreliable.
- CI currently builds but does not deploy automatically; P1 required manual
  Wrangler deployment.
- `other` category dominance makes browsing weaker than the raw job count
  suggests.
