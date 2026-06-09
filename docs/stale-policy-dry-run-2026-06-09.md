# Stale Policy Dry Run - 2026-06-09

This P5 Slice 2 report defines a no-mutation stale/source policy and applies it
as a dry run against production D1. No production rows were changed.

## Policy

Rows are classified by source state:

- `enabled`: source is still fetched in production ingestion.
- `paused`: source was paused in P4 for compliance, reliability, or usefulness.
- `unclassified`: source appears in historical data but is not represented in
  the current source policy.

Dry-run actions:

| Action | Meaning | Mutate now? |
| --- | --- | --- |
| `keep_enabled_source` | Source is still active in ingestion. Let normal verifier/freshness policy handle it. | No |
| `hold_paused_recently_seen` | Source is paused, but row was seen within 14 days. Hold through a grace window. | No |
| `review_paused_missing_last_seen` | Source is paused and row has no `last_seen_in_feed_at`. Review after source-specific context. | No |
| `classify_source_before_action` | Source is not in the current source policy. Classify source before any row action. | No |

This policy intentionally avoids immediate archival because P4 pauses happened on
2026-06-09. Rows that were recently seen before the pause should not disappear
without a grace window and source-specific review.

## Dry-Run Results

| Dry-run action | Rows |
| --- | ---: |
| `keep_enabled_source` | 497 |
| `hold_paused_recently_seen` | 175 |
| `review_paused_missing_last_seen` | 10 |
| `classify_source_before_action` | 5 |

## Dry-Run Results By Source

| Source state | Source platform | Dry-run action | Rows |
| --- | --- | --- | ---: |
| enabled | `WeWorkRemotely` | `keep_enabled_source` | 313 |
| enabled | `Sourcefit` | `keep_enabled_source` | 79 |
| enabled | `20Four7VA` | `keep_enabled_source` | 74 |
| enabled | `Remotive` | `keep_enabled_source` | 31 |
| paused | `Dribbble` | `hold_paused_recently_seen` | 107 |
| paused | `Pearl Talent` | `hold_paused_recently_seen` | 23 |
| paused | `Coconut VA` | `hold_paused_recently_seen` | 17 |
| paused | `CrewBloom` | `hold_paused_recently_seen` | 12 |
| paused | `AuthenticJobs` | `hold_paused_recently_seen` | 10 |
| paused | `Dribbble` | `review_paused_missing_last_seen` | 6 |
| paused | `Hello Rache` | `hold_paused_recently_seen` | 3 |
| paused | `Pineapple Staffing` | `hold_paused_recently_seen` | 3 |
| paused | `Pearl Talent` | `review_paused_missing_last_seen` | 2 |
| paused | `Coconut VA` | `review_paused_missing_last_seen` | 1 |
| paused | `CrewBloom` | `review_paused_missing_last_seen` | 1 |
| unclassified | `RemoteOK` | `classify_source_before_action` | 5 |

## Review Candidates

Paused-source rows missing `last_seen_in_feed_at`:

| Source platform | Rows | P5 action |
| --- | ---: | --- |
| `Dribbble` | 6 | Review after grace window; likely archive/demote if not manually kept. |
| `Pearl Talent` | 2 | Review Workable history after platform pause. |
| `Coconut VA` | 1 | Review Workable history after platform pause. |
| `CrewBloom` | 1 | Review Workable history after platform pause. |

Unclassified rows:

| Source platform | Rows | P5 action |
| --- | ---: | --- |
| `RemoteOK` | 5 | Classify source status before keep/archive decisions. |

## Important Observations

- Some Authentic Jobs rows look like articles rather than job postings, but they
  were recently seen before the source pause. They should be reviewed as a
  content-quality issue, not silently archived by age alone.
- Dribbble has old posted dates but recent `last_seen_in_feed_at` values. Since
  Dribbble is now paused for source-policy reasons, P5 should decide whether to
  hold, demote, or archive after the grace period.
- Workable-backed rows have many missing `posted_at` values because the Workable
  parser did not always receive or store publish dates. P5 should avoid
  age-based archive decisions for those rows without another signal.

## Next Safe Slice

P5 Slice 3 should implement one safe, reversible data-quality improvement:

- add an explicit `application_url = source_url` backfill only if the team
  accepts that these are equivalent for this product; or
- improve category triage for the highest-volume `other` sources; or
- add a no-mutation stale-candidate endpoint/script so the dry-run report can be
  regenerated without copying SQL from docs.

The next slice should still avoid production archival until the dry-run candidate
set is reviewed after the pause grace window.
