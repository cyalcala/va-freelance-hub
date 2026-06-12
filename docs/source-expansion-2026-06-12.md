# Source Expansion Evidence - 2026-06-12

## Purpose

This checkpoint closes the first Goldilocks source-expansion slice. It enables
two public RSS sources with caps and durable cadence tracking, keeps unclear or
fragile sources paused, and records production evidence so another AI can resume
without re-discovering the same state.

## Commits And Runs

- Handoff commit: `d1616da` - `docs: add goldilocks source expansion handoff`
- Source expansion commit: `686e312` - `feat: add cadence guarded rss sources`
- Skip-reason fix commit: `b948828` - `fix: preserve paused source skip reasons`
- Generated rollup commit: `79e46f8` - `docs: update daily source health`
- CI/deploy for source expansion: `27422527473` - passed
- D1 migration workflow: `27422527574` - passed
- CI for skip-reason fix: `27422888691` - passed
- Manual production deploy after async Pages deploy failure:
  - deployment ID: `8863383f-2f01-4c64-8110-51b8e8d5f222`
  - source commit: `b948828`
- First manual Hunter after expansion: `27422685577` - passed
- Manual Hunter after skip-reason deploy: `27423455086` - passed
- Rollup-writing Hunter: `27423574670` - passed

## What Changed

- Added source-level `maxItems` and enforced it in RSS and HTML adapters.
- Added optional `minFetchIntervalMinutes` for configured sources.
- Added `source_fetch_state` in D1 so fetch cadence survives deployments and
  workflow runs.
- Added `source_fetch_state_last_attempt_idx` for source-health/cadence checks.
- Added cadence guards in `/api/cron/scrape`.
- Added defensive behavior if the new source-state table is temporarily missing
  during deploy/migration ordering: the scrape route warns and still fetches
  instead of breaking unrelated ingestion.
- Decoded numeric and common HTML entities in RSS titles before triage.
- Enabled these RSS sources:
  - Real Work From Anywhere: <https://www.realworkfromanywhere.com/rss.xml>
  - Jobicy Admin Support APAC:
    <https://jobicy.com/feed/job_feed?job_categories=admin-support&job_types=full-time&search_region=apac>
- Kept Remote OK deferred until a JSON adapter exists:
  - API reference: <https://remoteok.com/api>

## Source Decisions

- Real Work From Anywhere is enabled as `allowed`, capped at 50 items, and
  cadence guarded at 60 minutes.
- Jobicy Admin Support APAC is enabled as `allowed`, capped at 40 items, and
  cadence guarded at 60 minutes.
- We Work Remotely and Remotive remain enabled as `allowed` with a 100-item cap.
- Remote OK remains deferred. It should not be re-enabled through the RSS path;
  add a JSON adapter and source-specific checks first.
- Paused sources remain visible as skipped source results with explicit reasons.

## Verification Evidence

- `bun run --cwd apps/web build` passed.
- `git diff --check` passed.
- Direct adapter probe:
  - Real Work From Anywhere produced 136 raw RSS items and was capped to 50.
  - Jobicy produced 3 RSS items.
  - Jobicy titles decode HTML entities, including the en dash in the sample
    title `Administrative Officer / Legal Administrative Officer - Financial
    Services`.
- D1 migration created `source_fetch_state`.
- First manual Hunter run `27422685577`:
  - passed;
  - accepted 25 jobs;
  - attempted 25 inserts;
  - had 0 failed insert batches;
  - had 0 insert errors;
  - had 0 failed sources;
  - increased active jobs to 797.
- Manual Hunter run `27423455086` after the skip-reason fix:
  - passed;
  - reported Real Work From Anywhere and Jobicy as cadence-skipped;
  - reported paused sources with readable skip reasons, not numeric array
    indexes;
  - had 0 failed sources;
  - had 0 failed insert batches;
  - had 0 insert errors.
- Rollup-writing Hunter run `27423574670`:
  - passed;
  - updated `docs/source-health-latest.md`;
  - reports 0 failed sources, 0 failed insert batches, 0 insert errors, and 20
    skipped sources.

## Production D1 Snapshot

Read-only D1 checks on 2026-06-12 reported `changed_db: false`.

Active opportunities:

- `797`

`source_fetch_state` rows:

| Source | Last count | Last error | Last attempt |
| --- | ---: | --- | --- |
| Jobicy Admin Support APAC | 3 | null | `2026-06-12T14:39:12.207Z` |
| Real Work From Anywhere | 50 | null | `2026-06-12T14:39:12.207Z` |
| Remotive | 32 | null | `2026-06-12T14:54:44.151Z` |
| We Work Remotely | 100 | null | `2026-06-12T14:54:44.151Z` |

Source-state query plan:

- `SEARCH source_fetch_state USING INDEX source_fetch_state_last_attempt_idx`

## Deployment Note

The normal CI run for `b948828` passed, but Cloudflare later marked the Pages
deployment sourced from that run as failed. The current `apps/web/dist` output
was manually deployed to Cloudflare Pages, producing successful production
deployment `8863383f-2f01-4c64-8110-51b8e8d5f222` for commit `b948828`.

## Next Safe Work

- Add a JSON source adapter before considering Remote OK.
- Add longer-retention source-health history if source trend reporting becomes
  important. `source_fetch_state` is current-state tracking, not a full event
  log.
- Continue Breezy token-specific review and decide whether each current Breezy
  source should stay `needs_review`, become `allowed`, or be paused.
- Run another query/index audit if homepage or category result shapes change;
  existing hot opportunity indexes and the new source-state index are healthy
  for the current shapes.
