# Major Health Audit - 2026-06-11

This audit was run after the user asked for a full health check and approved
autonomous fixes. It reviewed the active Astro/Cloudflare/D1 path, production
routes, GitHub Actions, Hunter ingestion artifacts, local build health, and repo
hygiene.

## Executive Summary

The public site is online and the current production path is healthy after three
repairs:

- Fixed Hunter ingestion writes that were failing with D1 `too many SQL
  variables` insert errors.
- Reduced `/categories/tech` production HTML from about 981 KB to about 94 KB by
  removing the hydrated all-category job payload.
- Stopped tracking local `.wrangler` D1 runtime files so local verification no
  longer leaves the repo dirty.

The latest manual Hunter evidence shows no failed sources, no failed insert
batches, and no insert errors.

2026-06-12 follow-up: the local Wrangler/D1 verification limit from this audit
has been resolved. See `docs/wrangler-d1-audit-2026-06-12.md` for the Wrangler
v4 upgrade, restored local read-only D1 audit evidence, and CI/deploy run
`27371741236`.

## Findings And Fixes

### F-01 - Hunter accepted jobs but D1 rejected every insert batch

Severity: high

Evidence before fix:

- Scheduled Hunter runs on 2026-06-10 and 2026-06-11 were failing.
- Run `27347417365` accepted and attempted 250 inserts across the workflow loop.
- Every insert batch failed with:
  `D1_ERROR: too many SQL variables at offset 797: SQLITE_ERROR`.
- The scrape route inserted five jobs per statement, which exceeded D1's bound
  variable ceiling for the current opportunity schema.

Fix:

- Commit `e861071` - `fix: reduce D1 scrape insert batch size (F-01)`
- Changed `apps/web/src/pages/api/cron/scrape.ts` to use a safe insert batch
  size of 3 rows.

Verification:

- Local `bun run --cwd apps/web build` passed.
- CI/deploy run `27353756293` passed.
- Manual Hunter run `27354089629` passed after deployment.
- Hunter summary for run `27354089629` reported:
  - signals harvested: 35
  - accepted for insert: 35
  - attempted inserts: 35
  - failed insert batches: 0
  - insert errors: 0
  - failed sources: 0
- Rollup-writing Hunter run `27354219672` passed and updated
  `docs/source-health-latest.md`.

### F-02 - Category pages still hydrated a large all-jobs payload

Severity: medium

Evidence before fix:

- Production `/categories/tech` returned 200 but about 980,592 bytes of HTML.
- The category page queried up to 1,000 opportunities and passed them to a
  client-loaded React island for in-page search.

Fix:

- Commit `45e2f2d` - `fix: paginate category pages server-side (F-02)`
- Replaced the hydrated all-category payload with server-side pagination in
  `apps/web/src/pages/categories/[category].astro`.
- Category pages now render 30 jobs per page and link to the canonical
  `/opportunities?category=<category>#search` board for search.

Verification:

- Local `bun run --cwd apps/web build` passed.
- CI/deploy run `27353939869` passed.
- Production smoke after deploy:
  - `/categories/tech?audit=...`: 200, 94,453 bytes
  - `/categories/tech?page=2&audit=...`: 200, 93,912 bytes

### F-03 - Local Wrangler state was tracked in Git

Severity: low

Evidence before fix:

- `git status --short` showed a modified
  `apps/web/.wrangler/...sqlite-shm` runtime file before any source edits.
- `git ls-files apps/web/.wrangler` showed three tracked local D1 state files.

Fix:

- Commit `ae72998` - `chore: stop tracking local wrangler state (F-03)`
- Added `.wrangler/` to `.gitignore`.
- Removed tracked local `.wrangler` SQLite state files from the repository index.

Verification:

- CI/deploy run `27354017177` passed.
- Local `git status --short --branch` was clean after pulling the generated
  source-health rollup commit.

## Production Smoke

Production target: `https://remotejobs-ph.pages.dev`

Checked after the F-03 deployment:

| Route | Status | Bytes |
| --- | ---: | ---: |
| `/` | 200 | 213,440 |
| `/opportunities` | 200 | 95,793 |
| `/opportunities?page=2` | 200 | 96,443 |
| `/directory` | 200 | 273,357 |
| `/data-policy` | 200 | 15,368 |
| `/privacy` | 200 | 14,966 |
| `/categories/tech?audit=...` | 200 | 94,453 |
| `/categories/tech?page=2&audit=...` | 200 | 93,912 |
| unauthenticated `POST /api/cron/scrape` | 401 | expected |

## GitHub Actions

Latest relevant runs after fixes:

| Run | Workflow | Result | Evidence |
| --- | --- | --- | --- |
| `27353756293` | CI Guardrail | success | F-01 build and deploy |
| `27353939869` | CI Guardrail | success | F-02 build and deploy |
| `27354017177` | CI Guardrail | success | F-03 build and deploy |
| `27354089629` | Hunter manual | success | 35 inserts, 0 insert errors |
| `27354219672` | Hunter manual + rollup | success | 0 failed sources, 0 insert errors, rollup updated |

The earlier scheduled Hunter failures from 2026-06-10 and 2026-06-11 were caused
by the D1 insert batch issue fixed in F-01.

## Source Health

Current repo-readable source-health rollup:

- File: `docs/source-health-latest.md`
- Generated by run: `27354219672`
- Commit referenced by rollup: `ae72998`
- Failed sources: 0
- Failed insert batches: 0
- Insert errors: 0
- Skipped sources: 16

Skipped sources remain expected because they are paused for compliance,
usefulness, duplicate-token, or Workable rotation reasons.

## Verification Limits

2026-06-12 update: this limit has been resolved by commit `ad03990`. Local
Wrangler now reports `4.100.0`, `bunx wrangler d1 info remoteph-jobs-db`
succeeds without the `ratelimits` warning, and read-only D1 query-plan audits
work from this machine. The original limit is preserved below for historical
context.

Direct local D1 read-only queries could not be completed from this machine:

- Command attempted: `bunx wrangler d1 execute remoteph-jobs-db --remote ...`
- Result: Cloudflare API error `7403`, account not valid or not authorized.
- Wrangler also warned that local Wrangler v3 is out of date and that top-level
  `ratelimits` is an unexpected config field.

This did not block production validation because CI deploys with repository
Cloudflare credentials and the live Hunter workflow successfully exercised the
production D1 write path.

## Remaining Improvements

- Completed 2026-06-12: Wrangler v4 compatibility pass and local D1 audit
  recovery are documented in `docs/wrangler-d1-audit-2026-06-12.md`.
- Continue ATS source policy review for sources marked `needs_review`.
- Consider persisting source-health history in D1 if workflow artifacts and the
  latest rollup are not enough for longer-term operational reporting.

## Final Health Verdict

After the fixes and verification above, the public product, deploy pipeline,
and Hunter ingestion loop are in good working condition. The most important
current residual risk is operational access: local direct D1 auditing is blocked
by Cloudflare auth/account configuration, so production database audits currently
depend on GitHub workflow evidence unless credentials are refreshed.
