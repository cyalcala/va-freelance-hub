# Source economics — latest (SP-02)

- **As of:** 2026-09-15T07:59:55.071Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 860 | 86 | 12.29 | 468 | 15.60 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5376 | 5376 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1078 | 88 | 178 | 520 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 48.5% ⚠️ >40%; top-3 82.7% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 32.1%; top-3 62.6%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 346 | 252 | 47 | we-work-remotely |
| breezy | 167 | 33 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| real-work-from-anywhere | 162 | 127 | 29 | real-work-from-anywhere |
| ashby | 152 | 13 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 143 | 17 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 53 | 51 | 9 | remote-ok |
| jobicy | 46 | 24 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 9 | 3 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 346 | 47 | 252 | 946 |
| real-work-from-anywhere | RealWorkFromAnywhere | 162 | 29 | 127 | 360 |
| breezy:20four7va | 20Four7VA | 96 | 0 | 24 | 94 |
| breezy:sourcefit | Sourcefit | 70 | 0 | 9 | 103 |
| ashby:supabase | Supabase | 59 | 0 | 7 | 25 |
| remote-ok | RemoteOK | 53 | 9 | 51 | 1138 |
| greenhouse:gitlab | GitLab | 45 | 0 | 1 | 320 |
| greenhouse:remotecom | Remote.com | 45 | 0 | 16 | 528 |
| greenhouse:grafanalabs | Grafana Labs | 42 | 0 | 0 | 190 |
| jobicy-supporting-apac | Jobicy | 42 | 3 | 22 | 81 |
| ashby:ashby | Ashby | 32 | 0 | 2 | 60 |
| ashby:camunda | Camunda | 22 | 0 | 4 | 45 |
| ashby:amplify | Amplify | 21 | 0 | 0 | 66 |
| ashby:tremendous | Tremendous | 18 | 0 | 0 | 13 |
| greenhouse:nearform | Nearform | 10 | 0 | 0 | 42 |
| remotive | Remotive | 9 | 0 | 3 | 84 |
| jobicy-admin-support-apac | Jobicy | 4 | 0 | 2 | 8 |
| breezy:time-etc | Time Etc | 1 | 0 | 0 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 6 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| workable:coconutva | Coconut VA | 0 | 0 | 0 | 21 |
| workable:crewbloom | CrewBloom | 0 | 0 | 0 | 13 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 3 |
| workable:pearltalent | Pearl Talent | 0 | 0 | 0 | 26 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 130 | 537 | 0 | 0 | 0 | 2226 |
| real-work-from-anywhere | 114 | 0 | 553 | 0 | 0 | 5700 |
| we-work-remotely | 64 | 601 | 0 | 2 | 0 | 5729 |
| remote-ok | 37 | 77 | 553 | 0 | 0 | 1329 |
| jobicy-supporting-apac | 10 | 96 | 560 | 1 | 0 | 400 |
| jobicy-admin-support-apac | 8 | 103 | 556 | 0 | 0 | 41 |
| ashby:amplify | 0 | 0 | 667 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 667 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 667 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 666 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 666 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 667 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1332 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 666 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 666 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 666 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 667 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 666 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 666 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 666 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 665 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 665 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 667 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 665 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 667 | 0 | 0 | 0 |
| problogger | 0 | 0 | 667 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 667 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 665 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 47 | 2 | 9 | 11 | 58 | 81.0% |
| real-work-from-anywhere | 29 | 4 | 0 | 4 | 33 | 87.9% |
| remote-ok | 8 | 13 | 7 | 19 | 28 | 28.6% |
| jobicy-supporting-apac | 2 | 2 | 2 | 3 | 6 | 33.3% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 130 | 2226 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 114 | 5700 | 29 | 0.25 | 0.51 |
| we-work-remotely | 64 | 5729 | 47 | 0.73 | 0.82 |
| remote-ok | 37 | 1329 | 8 | 0.22 | 0.60 |
| jobicy-supporting-apac | 10 | 400 | 2 | 0.20 | 0.50 |
| jobicy-admin-support-apac | 8 | 41 | 0 | 0.00 | 0.00 |
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
