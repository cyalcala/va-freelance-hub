# Source economics — latest (SP-02)

- **As of:** 2026-09-10T07:29:26.975Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 846 | 92 | 13.14 | 518 | 17.27 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5304 | 229 | 5075 | 4.3% | 975 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1131 | 93 | 210 | 569 |

## Provider-family concentration (ADR-006 §7)

> ⚠️ **Provisional:** only 13.8% of active rows carry an exact source_id (SP-01 does not backfill legacy rows). The shares below reflect that small attributed base, not a real concentration incident; they stabilize as coverage grows.

- **Net-new 30d:** top family `we-work-remotely` 56.4% ⚠️ >40%; top-3 94.2% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 56.4% ⚠️ >40%; top-3 94.2% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| (unknown) | 975 | 413 | 0 | (unknown) |
| we-work-remotely | 88 | 88 | 53 | we-work-remotely |
| real-work-from-anywhere | 45 | 45 | 25 | real-work-from-anywhere |
| remote-ok | 14 | 14 | 9 | remote-ok |
| jobicy | 9 | 9 | 6 | jobicy-supporting-apac |
| remotive | 0 | 0 | 0 | remotive |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| (unknown) | 20Four7VA | 975 | 0 | 413 | 4100 |
| we-work-remotely | WeWorkRemotely | 88 | 53 | 88 | 14 |
| real-work-from-anywhere | RealWorkFromAnywhere | 45 | 25 | 45 | 6 |
| remote-ok | RemoteOK | 14 | 9 | 14 | 44 |
| jobicy-supporting-apac | Jobicy | 9 | 6 | 9 | 2 |
| remotive | Remotive | 0 | 0 | 0 | 7 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 124 | 526 | 0 | 0 | 0 | 2232 |
| real-work-from-anywhere | 111 | 0 | 539 | 0 | 0 | 5550 |
| we-work-remotely | 58 | 589 | 0 | 3 | 0 | 5271 |
| remote-ok | 35 | 75 | 539 | 1 | 0 | 789 |
| jobicy-supporting-apac | 18 | 87 | 545 | 0 | 0 | 720 |
| jobicy-admin-support-apac | 5 | 101 | 544 | 0 | 0 | 28 |
| ashby:amplify | 0 | 0 | 650 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 650 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 650 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 649 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 649 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 650 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1298 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 649 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 649 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 649 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 650 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 649 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 649 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 649 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 648 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 648 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 650 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 648 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 650 | 0 | 0 | 0 |
| problogger | 0 | 0 | 650 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 650 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 648 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 648 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 646 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 646 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 53 | 2 | 6 | 8 | 61 | 86.9% |
| remote-ok | 9 | 11 | 9 | 20 | 29 | 31.0% |
| real-work-from-anywhere | 25 | 3 | 0 | 2 | 28 | 89.3% |
| jobicy-supporting-apac | 6 | 1 | 0 | 1 | 7 | 85.7% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 124 | 2232 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 111 | 5550 | 25 | 0.23 | 0.45 |
| we-work-remotely | 58 | 5271 | 53 | 0.91 | 1.01 |
| remote-ok | 35 | 789 | 9 | 0.26 | 1.14 |
| jobicy-supporting-apac | 18 | 720 | 6 | 0.33 | 0.83 |
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

- 975 active rows still have no source_id (legacy, pre-migration 0034). They are attributed to '(unknown)' and excluded from provider concentration; a separately reviewed read-only-first backfill may resolve them.
