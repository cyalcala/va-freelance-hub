# Remote OK JSON Source Handoff - 2026-06-13

## Stop Point

The user asked to stop feature work and back up the latest acceptable slice.
This document is the current handoff for the Remote OK JSON source work.

## Accepted Slice

Remote OK is now enabled through its public JSON API, not the old failing RSS
path.

Product commits:

- `92ca443` - `feat: add remote ok json source`
- `4c2374b` - `fix: filter remote ok physical roles`

Generated rollup commit:

- `562355e` - `docs: update daily source health`

## What Changed

- Added `SourceType = "json"` and `CollectionMethod = "public_json_api"`.
- Added `jsonSources` and `fetchJSONSource`.
- Added `packages/scraper/json.ts` for Remote OK.
- Wired JSON sources into `apps/web/src/pages/api/cron/scrape.ts`.
- Added Remote OK as an `allowed` source with:
  - URL: `https://remoteok.com/api`
  - `maxItems: 50`
  - `minFetchIntervalMinutes: 120`
- Remote OK cards now display `Remote OK` and link directly to the Remote OK
  job URL instead of the internal click redirect.
- The adapter:
  - stores minimal factual metadata;
  - strips HTML from descriptions;
  - requires Remote OK-hosted URLs;
  - does not use or store the Remote OK logo;
  - drops obvious placeholder titles;
  - filters for hub-relevant remote/admin/support/marketing/tech/finance style
    roles;
  - filters physical/logistics roles such as courier, delivery, warehouse,
    photographer, civil engineer, logistics, and fulfillment operations.
- Added migration `0015_remote_ok_quality_filter.sql` to archive RemoteOK rows
  inserted before the physical/logistics filter was tightened.

## Source Evidence

- `https://remoteok.com/api` returned HTTP 200 and a JSON array.
- The first API row contains a legal notice requiring links back to Remote OK
  job URLs and source mention.
- `https://remoteok.com/robots.txt` allows `/api` for general user agents and
  has a crawl delay.

Compliance posture: Goldilocks allowed. Keep direct Remote OK links, mention
Remote OK visibly, avoid their logo, cap fetches, and respect cadence.

## Verification

Local verification:

- `bun run --cwd apps/web build` passed after the JSON adapter.
- `git diff --check` passed.
- Adapter probe before the quality filter:
  - Remote OK returned 100 raw jobs;
  - capped to 50;
  - emitted 33 candidate items after placeholder/relevance filtering.
- Adapter probe after the quality filter:
  - Remote OK returned 100 raw jobs;
  - capped to 50;
  - emitted 21 candidate items;
  - removed courier/logistics/physical outliers from the probe.

GitHub and production verification:

- CI guardrail `27435140046` passed for `92ca443`.
- Cloudflare Pages production deployment `b8b04c38-2b56-42e6-89df-2b980c6a6266`
  deployed `92ca443`.
- Production `/` and `/opportunities` returned 200 after deployment.
- Manual Hunter `27435248150` passed for `92ca443`.
  - First loop fetched Remote OK as JSON with `count: 33`.
  - First loop inserted 25 jobs total.
  - Failed sources: 0.
  - Failed insert batches: 0.
  - Insert errors: 0.
  - Second loop cadence-skipped Remote OK for the 120-minute guard.
- CI guardrail `27435636180` passed for `4c2374b`.
- D1 migration workflow `27435636177` passed for
  `0015_remote_ok_quality_filter.sql`.
- Later Hunter runs on `4c2374b` passed, including:
  - `27438144918`
  - `27443447369`
  - `27447752512`
  - `27450540244`
- Latest source-health rollup for 2026-06-13:
  - `docs/source-health-latest.md`
  - workflow run `27450540244`
  - 8 accepted/attempted inserts
  - 0 failed sources
  - 0 failed insert batches
  - 0 insert errors
- Later scheduled Hunter `27457196402` also passed on rollup commit `562355e`.

## Production D1 Snapshot

Read-only D1 checks on 2026-06-13 reported `changed_db: false`.

- Active opportunities: 878
- Active RemoteOK opportunities: 38
- Inactive RemoteOK opportunities: 4
- Active RemoteOK physical/logistics outliers: 0
- `source_fetch_state` for `remote-ok`:
  - source type: `JSON`
  - last count: 26
  - last error: null
  - last attempt: `2026-06-13T04:59:05.912Z`
  - last success: `2026-06-13T04:59:05.912Z`

## Current Repo State

At handoff time, local `main` is clean and aligned with `origin/main` at
`562355e`.

## Next Safe Work

- No urgent work is required for this slice.
- Next AI should first run `git status --short --branch`.
- If continuing source expansion, avoid adding new sources until this Remote OK
  quality filter has at least one more healthy rollup day.
- Consider adding a lightweight source-specific denylist/unit test for Remote OK
  title filtering before future source expansion.
- Continue source-specific Breezy review if policy work resumes.
