# Data Quality Snapshot - 2026-06-09

This P5 Slice 1 snapshot is read-only. It records current production D1 data
quality, stale-risk, and source-history metrics after P4 source policy
enforcement. No production rows were changed.

## Summary

- Active opportunities: 687
- Duplicate `source_url` groups: 0
- Duplicate `content_hash` groups: 0
- Duplicate non-empty `description_hash` groups: 0
- Rows from currently enabled sources: 497
- Historical rows from now-paused sources: 185
- Unclassified source rows: 5 (`RemoteOK`)

## Missing Field Coverage

| Field | Missing rows | Share of active rows |
| --- | ---: | ---: |
| `company` | 95 | 13.8% |
| `pay_range` | 524 | 76.3% |
| `client_timezone` | 687 | 100.0% |
| `application_url` | 687 | 100.0% |
| `experience_level` | 522 | 76.0% |
| `posted_at` | 62 | 9.0% |
| `description_hash` | 507 | 73.8% |
| `last_seen_in_feed_at` | 124 | 18.0% |

## Freshness

| Metric | Rows | Share of active rows |
| --- | ---: | ---: |
| `posted_at` unparseable by SQLite `unixepoch` | 0 | 0.0% |
| Posted older than 30 days | 247 | 35.9% |
| Posted older than 60 days | 111 | 16.2% |
| Posted older than 90 days | 81 | 11.8% |
| Last seen in feed older than 30 days | 0 | 0.0% |

Interpretation: stale-looking rows are mostly old `posted_at` values that are
still recently seen in feeds or were recently seen before a source was paused.
P5 should define source-specific freshness behavior before archiving.

## Category Distribution

| Category | Active rows | Share |
| --- | ---: | ---: |
| `other` | 531 | 77.3% |
| `tech` | 86 | 12.5% |
| `admin` | 31 | 4.5% |
| `customer-service` | 20 | 2.9% |
| `design` | 18 | 2.6% |
| `marketing` | 1 | 0.1% |

The `other` category remains the largest triage-quality problem.

## Source Distribution

| Source platform | Active rows | Missing posted | Older than 30d | Max last seen |
| --- | ---: | ---: | ---: | --- |
| `WeWorkRemotely` | 313 | 0 | 101 | `2026-06-09T11:12:22.205Z` |
| `Dribbble` | 113 | 0 | 72 | `2026-06-09T10:32:00.437Z` |
| `Sourcefit` | 79 | 0 | 24 | `2026-06-09T11:12:22.205Z` |
| `20Four7VA` | 74 | 0 | 35 | `2026-06-09T11:12:22.205Z` |
| `Remotive` | 31 | 0 | 5 | `2026-06-09T11:12:22.205Z` |
| `Pearl Talent` | 25 | 25 | 0 | `2026-06-09T10:46:17.749Z` |
| `Coconut VA` | 18 | 18 | 0 | `2026-06-09T10:46:17.749Z` |
| `CrewBloom` | 13 | 13 | 0 | `2026-06-09T10:46:17.749Z` |
| `AuthenticJobs` | 10 | 0 | 10 | `2026-06-09T10:32:00.437Z` |
| `RemoteOK` | 5 | 0 | 0 | null |
| `Pineapple Staffing` | 3 | 3 | 0 | `2026-06-09T10:46:17.749Z` |
| `Hello Rache` | 3 | 3 | 0 | `2026-06-09T10:46:17.749Z` |

## Now-Paused Source History

Rows from sources paused in P4 remain active until P5 defines a stale policy.

| Source platform | Active rows | Notes |
| --- | ---: | --- |
| `Dribbble` | 113 | RSS source paused for automated-access terms risk. |
| `Pearl Talent` | 25 | Workable ATS source paused after repeated HTTP 429s. |
| `Coconut VA` | 18 | Workable ATS source paused after repeated HTTP 429s. |
| `CrewBloom` | 13 | Workable ATS source paused after repeated HTTP 429s. |
| `AuthenticJobs` | 10 | RSS source paused because robots disallows `/feed/`. |
| `Pineapple Staffing` | 3 | Workable ATS source paused after repeated HTTP 429s. |
| `Hello Rache` | 3 | Workable ATS source paused after repeated HTTP 429s. |

## Last-Seen Gaps

Active rows missing `last_seen_in_feed_at` by source:

| Source platform | Rows |
| --- | ---: |
| `WeWorkRemotely` | 104 |
| `Dribbble` | 6 |
| `RemoteOK` | 5 |
| `Sourcefit` | 3 |
| `Remotive` | 2 |
| `Pearl Talent` | 2 |
| `CrewBloom` | 1 |
| `Coconut VA` | 1 |

## P5 Recommendations

1. Define a no-mutation stale policy first:
   - currently enabled source + recently seen: keep;
   - paused source + missing or old `last_seen_in_feed_at`: candidate for
     archive review;
   - paused source + recently seen before pause: hold for a short grace window.
2. Add a dry-run stale candidate query before any archive mutation.
3. Improve triage/category mapping before broad backfill because 77.3% of active
   rows are still `other`.
4. Treat `application_url` as a derived field from `source_url` unless a direct
   apply URL becomes separately available.
5. Do not infer pay or timezone from weak text; mark as unknown unless source
   data is explicit.

## Repeatable SQL

The snapshot used read-only `wrangler d1 execute --remote --command` queries
against `remoteph-jobs-db`. Key query groups:

- missing field counts across active rows;
- `posted_at` and `last_seen_in_feed_at` freshness buckets using
  SQLite `unixepoch`;
- category, type, experience, and source-platform distributions;
- duplicate `source_url`, `content_hash`, and non-empty `description_hash`
  groups;
- source split between currently enabled, now-paused, and unclassified
  platforms.
