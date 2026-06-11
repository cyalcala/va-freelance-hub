# Wrangler And D1 Follow-Up Audit - 2026-06-12

This follow-up closes the local Cloudflare/Wrangler verification gap recorded in
`docs/major-audit-2026-06-11.md`.

## Summary

Local direct D1 audits are working again from this machine. The active project
tooling now uses Wrangler v4, which accepts the current Pages Functions
`ratelimits` configuration without the Wrangler v3 warning.

## F-04 - Wrangler v3 flagged current Cloudflare config

Severity: medium

Evidence before fix:

- `bunx wrangler --version` reported `3.114.17`.
- `bunx wrangler d1 list` and `d1 info` worked, but warned that top-level
  `ratelimits` was an unexpected config field.
- Official Cloudflare documentation shows rate limiting bindings configured with
  the `ratelimits` array in `wrangler.jsonc` and notes that the binding requires
  Wrangler `4.36.0` or later.
- Reference:
  `https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/`
- `apps/web/wrangler.jsonc` already has `compatibility_date: "2024-11-01"`, so
  no compatibility-date change was needed for this slice.

Fix:

- Commit `ad03990` - `chore: upgrade wrangler for current cloudflare config`
- Updated root and active web app Wrangler dev dependencies to `^4.100.0`.
- Refreshed `bun.lock` so it matches the active Astro workspace dependency
  graph, not the stale older Next.js-era web app graph.

## Local D1 Audit Evidence

Wrangler v4 checks:

- `bunx wrangler --version` returned `4.100.0`.
- `bunx wrangler d1 info remoteph-jobs-db` succeeded with no `ratelimits`
  config warning.
- Remote D1 metadata:
  - tables: 4
  - region: APAC
  - database size: about 1.98 MB
  - read queries in last 24h: 486
  - write queries in last 24h: 415

Read-only production D1 checks:

- Active opportunities: 748
- The active-count query returned `changed_db: false`.
- Homepage query plan:
  `SEARCH opportunities USING INDEX active_posted_idx (is_active=?)`
- Category query plan:
  `SEARCH opportunities USING INDEX category_active_posted_idx (category=? AND is_active=?)`
- Schema sanity check confirmed the opportunity location column is
  `location_type`, not `location`; an initial stale query-plan probe failed on
  that column name and did not mutate the database.

## Verification

- `bun install --frozen-lockfile` passed.
- `bun run --cwd apps/web build` passed.
- `git diff --check` passed with only expected CRLF warnings.
- GitHub Actions CI/deploy run
  `27371741236` passed for commit `ad03990`.
- Production smoke after deployment:

| Route | Status | Bytes |
| --- | ---: | ---: |
| `/` | 200 | 245,836 |
| `/opportunities` | 200 | 94,229 |
| `/opportunities?page=2` | 200 | 95,766 |
| `/directory` | 200 | 273,405 |
| `/data-policy` | 200 | 15,416 |
| `/privacy` | 200 | 15,014 |
| `/categories/tech` | 200 | 94,467 |
| `/categories/tech?page=2` | 200 | 93,926 |
| unauthenticated `POST /api/cron/scrape` | 401 | expected |

## Current Operational Notes

- Use `bunx wrangler d1 info remoteph-jobs-db` with Wrangler v4; `d1 info` acts
  on remote D1 databases by default and no longer accepts `--remote`.
- Use `bunx wrangler d1 execute remoteph-jobs-db --remote --command "..."` for
  read-only remote SQL probes.
- The historical `apps/web-nextjs-backup` workspace still carries Wrangler v3
  because it is not the active production app.
- Remaining non-blocking follow-up: continue ATS/source policy review for
  sources marked `needs_review`.
