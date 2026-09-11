# Source economics — latest (SP-02)

- **As of:** 2026-09-11T07:27:35.664Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 843 | 96 | 13.71 | 531 | 17.70 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5325 | 250 | 5075 | 4.7% | 943 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1114 | 99 | 187 | 584 |

## Provider-family concentration (ADR-006 §7)

> ⚠️ **Provisional:** only 15.4% of active rows carry an exact source_id (SP-01 does not backfill legacy rows). The shares below reflect that small attributed base, not a real concentration incident; they stabilize as coverage grows.

- **Net-new 30d:** top family `we-work-remotely` 55.6% ⚠️ >40%; top-3 94.7% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 55.6% ⚠️ >40%; top-3 94.7% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| (unknown) | 943 | 413 | 0 | (unknown) |
| we-work-remotely | 95 | 95 | 54 | we-work-remotely |
| real-work-from-anywhere | 52 | 52 | 32 | real-work-from-anywhere |
| remote-ok | 15 | 15 | 9 | remote-ok |
| jobicy | 9 | 9 | 4 | jobicy-supporting-apac |
| remotive | 0 | 0 | 0 | remotive |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| (unknown) | 20Four7VA | 943 | 0 | 413 | 4132 |
| we-work-remotely | WeWorkRemotely | 95 | 54 | 95 | 18 |
| real-work-from-anywhere | RealWorkFromAnywhere | 52 | 32 | 52 | 7 |
| remote-ok | RemoteOK | 15 | 9 | 15 | 45 |
| jobicy-supporting-apac | Jobicy | 9 | 4 | 9 | 2 |
| remotive | Remotive | 0 | 0 | 0 | 7 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 127 | 526 | 0 | 0 | 0 | 2259 |
| real-work-from-anywhere | 112 | 0 | 541 | 0 | 0 | 5600 |
| we-work-remotely | 63 | 587 | 0 | 3 | 0 | 5705 |
| remote-ok | 34 | 77 | 541 | 1 | 0 | 915 |
| jobicy-supporting-apac | 17 | 88 | 548 | 0 | 0 | 680 |
| jobicy-admin-support-apac | 5 | 103 | 545 | 0 | 0 | 28 |
| ashby:amplify | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 652 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 652 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 653 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1304 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 652 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 652 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 652 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 653 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 652 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 652 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 652 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 651 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 651 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 651 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 653 | 0 | 0 | 0 |
| problogger | 0 | 0 | 653 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 651 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 651 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 649 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 54 | 2 | 9 | 11 | 65 | 83.1% |
| real-work-from-anywhere | 30 | 6 | 0 | 3 | 36 | 83.3% |
| remote-ok | 9 | 10 | 7 | 17 | 26 | 34.6% |
| jobicy-supporting-apac | 4 | 1 | 0 | 1 | 5 | 80.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 127 | 2259 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 112 | 5600 | 30 | 0.27 | 0.54 |
| we-work-remotely | 63 | 5705 | 54 | 0.86 | 0.95 |
| remote-ok | 34 | 915 | 9 | 0.26 | 0.98 |
| jobicy-supporting-apac | 17 | 680 | 4 | 0.24 | 0.59 |
| jobicy-admin-support-apac | 5 | 28 | 0 | 0.00 | 0.00 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:20four7va | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:time-etc | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:rocketams | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |

## Notes

- 943 active rows still have no source_id (legacy, pre-migration 0034). They are attributed to '(unknown)' and excluded from provider concentration; a separately reviewed read-only-first backfill may resolve them.
