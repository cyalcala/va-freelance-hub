# Final Acceptance Audit - 2026-06-09

## Summary

P7 re-audited the production system after P0-P6 and updated the public README to
match the real Cloudflare/Astro/D1 implementation and public-source policy.

Accepted completion after this checkpoint: 100%.

## Build Evidence

- Command: `npm.cmd run build --workspace apps/web`
- Result: passed.
- Note: Astro/Cloudflare emitted the known cleanup warning for
  `ultrahtml_nxDOIah1.mjs`, but the build exited successfully and produced the
  server/client bundles.

## Production Route Smoke

| Route | Status | Bytes |
| --- | ---: | ---: |
| `/` | 200 | 191,966 |
| `/opportunities` | 200 | 95,719 |
| `/directory` | 200 | 271,826 |
| `/data-policy` | 200 | 15,381 |
| `/privacy` | 200 | 14,979 |
| `/categories/tech` | 200 | 433,375 |

Unauthenticated POST to `/api/cron/scrape` returned 401.

## Production D1 Snapshot

- Active opportunities: 688.
- Missing `application_url`: 0.
- Missing `last_seen_in_feed_at`: 124.
- Missing `posted_at`: 62.
- Unparseable freshness dates: 0.
- Enabled or currently reviewed source rows: 498.
- Historical paused-source rows: 185.
- Unclassified source rows: 5.

Category distribution:

- `other`: 532.
- `tech`: 86.
- `admin`: 31.
- `customer-service`: 20.
- `design`: 18.
- `marketing`: 1.

## Query Plan Evidence

Homepage latest-opportunities query:

```text
SEARCH opportunities USING INDEX active_posted_idx (is_active=?)
```

Category latest-opportunities query:

```text
SEARCH opportunities USING INDEX category_active_posted_idx (category=? AND is_active=?)
```

## Workflow Evidence

Recent accepted runs:

- `27204653809` - docs checkpoint for P6 source-health rollup: success.
- `27204417574` - Hunter Pulse with `write_rollup=true`: success.
- `27204381138` - workflow change for source-health rollup: success.
- `27204051068` - Hunter artifact reporting: success.
- `27203416643` - D1 application URL migration: success.
- `27203416725` - application URL code change: success.

Current repo-readable source health:

- File: `docs/source-health-latest.md`.
- Date: 2026-06-09.
- Run: `27204417574`.
- Failed sources: 0.
- Zero-count successful sources: 1.
- Skipped sources: 18.

## Remaining Known Work

No high-priority preventable breakage remains from the original audit baseline.
The honest follow-up list is:

- Category `other` is still the dominant bucket and should be improved in a
  future data-quality phase.
- Historical rows from paused sources remain visible under the P5 stale policy;
  they should be reviewed over time rather than mass-archived blindly.
- `last_seen_in_feed_at` and `posted_at` still have historical gaps.
- CI builds successfully but production Pages deployment is still manual for app
  code changes.
- Wrangler 3.114.17 reports that a Wrangler 4 upgrade is available.

## Acceptance Decision

Accept the recovery roadmap as complete. The production site is live, the
current active architecture is documented, source policy is conservative,
ingestion health is visible, D1 query plans use the intended indexes, and future
agents can recover the project from committed docs and GitHub workflow evidence.
