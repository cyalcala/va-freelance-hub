# Data Quality Snapshot - 2026-06-13

This snapshot records the production D1 data quality, stale-risk, and category distribution metrics after Breezy source review and RemoteOK unit testing.

## Summary

- Active opportunities: 884
- Duplicate `source_url` groups: 0
- Duplicate `content_hash` groups: 0
- Duplicate non-empty `description_hash` groups: 2 (4 rows total)
- Rows from currently enabled sources: 695
- Historical rows from now-paused sources: 189

## Missing Field Coverage

| Field | Missing rows | Share of active rows |
| --- | ---: | ---: |
| `company` | 98 | 11.08% |
| `pay_range` | 717 | 81.1% |
| `client_timezone` | 884 | 100.0% |
| `application_url` | 0 | 0.0% |
| `experience_level` | 626 | 70.8% |
| `posted_at` | 66 | 7.47% |
| `description_hash` | 507 | 57.35% |
| `last_seen_in_feed_at` | 121 | 13.68% |

*Interpretation: `application_url` is now fully backfilled/populated. The triage quality has improved, leaving only 13.68% of rows missing a last seen timestamp.*

## Freshness

| Metric | Rows | Share of active rows |
| --- | ---: | ---: |
| `posted_at` unparseable by SQLite `unixepoch` | 0 | 0.0% |
| Posted older than 30 days | 283 | 32.0% |
| Posted older than 60 days | 118 | 13.3% |
| Posted older than 90 days | 82 | 9.27% |
| Last seen in feed older than 30 days | 0 | 0.0% |

## Category Distribution

| Category | Active rows | Share |
| --- | ---: | ---: |
| `tech` | 222 | 25.11% |
| `design` | 175 | 19.80% |
| `other` | 128 | 14.48% |
| `admin` | 127 | 14.37% |
| `marketing` | 88 | 9.95% |
| `customer-service` | 81 | 9.16% |
| `finance` | 63 | 7.13% |

*Note: The `other` category has been reduced significantly from 77.3% to 14.48% due to improved triage classification.*

## Source Distribution

| Source platform | Active rows | Missing posted | Older than 30d | Max last seen |
| --- | ---: | ---: | ---: | --- |
| `WeWorkRemotely` | 389 | 0 | 115 | `2026-06-13T08:25:52.010Z` |
| `Dribbble` (paused) | 113 | 0 | 79 | `2026-06-09T10:32:00.437Z` |
| `20Four7VA` | 83 | 0 | 39 | `2026-06-13T08:25:52.010Z` |
| `Sourcefit` | 82 | 0 | 32 | `2026-06-13T08:25:52.010Z` |
| `RealWorkFromAnywhere` | 55 | 0 | 0 | `2026-06-13T08:25:52.010Z` |
| `RemoteOK` | 48 | 0 | 0 | `2026-06-13T08:25:52.010Z` |
| `Remotive` | 35 | 0 | 8 | `2026-06-13T08:25:52.010Z` |
| `Pearl Talent` (paused) | 26 | 26 | 0 | `2026-06-11T14:28:50.784Z` |
| `Coconut VA` (paused) | 21 | 21 | 0 | `2026-06-11T16:49:50.425Z` |
| `CrewBloom` (paused) | 13 | 13 | 0 | `2026-06-11T14:28:39.202Z` |
| `AuthenticJobs` (paused) | 10 | 0 | 10 | `2026-06-09T10:32:00.437Z` |
| `Pineapple Staffing` (paused)| 3 | 3 | 0 | `2026-06-11T14:30:44.076Z` |
| `Jobicy` | 3 | 0 | 0 | `2026-06-13T08:25:52.010Z` |
| `Hello Rache` (paused) | 3 | 3 | 0 | `2026-06-11T14:30:44.076Z` |
