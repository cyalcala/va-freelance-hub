# Source economics — latest (SP-02)

- **As of:** 2026-09-12T07:19:38.375Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 854 | 88 | 12.57 | 549 | 18.30 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5342 | 5342 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1106 | 88 | 186 | 599 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 48.6% ⚠️ >40%; top-3 81.1% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 31.4%; top-3 61.7%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 347 | 291 | 51 | we-work-remotely |
| breezy | 169 | 52 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| real-work-from-anywhere | 166 | 143 | 24 | real-work-from-anywhere |
| ashby | 163 | 13 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 152 | 19 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 51 | 51 | 10 | remote-ok |
| jobicy | 48 | 27 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 10 | 3 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 347 | 51 | 291 | 927 |
| real-work-from-anywhere | RealWorkFromAnywhere | 166 | 24 | 143 | 350 |
| breezy:20four7va | 20Four7VA | 97 | 0 | 35 | 93 |
| breezy:sourcefit | Sourcefit | 71 | 0 | 17 | 102 |
| ashby:supabase | Supabase | 60 | 0 | 7 | 24 |
| remote-ok | RemoteOK | 51 | 10 | 51 | 1134 |
| greenhouse:gitlab | GitLab | 46 | 0 | 1 | 319 |
| greenhouse:remotecom | Remote.com | 46 | 0 | 18 | 527 |
| greenhouse:grafanalabs | Grafana Labs | 45 | 0 | 0 | 187 |
| jobicy-supporting-apac | Jobicy | 44 | 3 | 24 | 75 |
| ashby:ashby | Ashby | 38 | 0 | 2 | 54 |
| ashby:camunda | Camunda | 26 | 0 | 4 | 41 |
| ashby:amplify | Amplify | 21 | 0 | 0 | 66 |
| ashby:tremendous | Tremendous | 18 | 0 | 0 | 13 |
| greenhouse:nearform | Nearform | 14 | 0 | 0 | 38 |
| remotive | Remotive | 10 | 0 | 3 | 83 |
| jobicy-admin-support-apac | Jobicy | 4 | 0 | 3 | 8 |
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
| remotive | 134 | 593 | 0 | 0 | 0 | 2364 |
| real-work-from-anywhere | 122 | 0 | 605 | 0 | 0 | 6100 |
| we-work-remotely | 69 | 656 | 0 | 2 | 0 | 6234 |
| remote-ok | 35 | 86 | 605 | 1 | 0 | 1063 |
| jobicy-supporting-apac | 15 | 99 | 612 | 1 | 0 | 600 |
| jobicy-admin-support-apac | 3 | 116 | 608 | 0 | 0 | 17 |
| ashby:amplify | 0 | 0 | 727 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 727 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 727 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 726 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 726 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 727 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1452 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 726 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 726 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 726 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 727 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 726 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 726 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 726 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 725 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 725 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 727 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 725 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 727 | 0 | 0 | 0 |
| problogger | 0 | 0 | 727 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 727 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 725 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 724 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 724 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 51 | 2 | 6 | 8 | 59 | 86.4% |
| real-work-from-anywhere | 24 | 3 | 0 | 3 | 27 | 88.9% |
| remote-ok | 10 | 9 | 6 | 15 | 25 | 40.0% |
| jobicy-supporting-apac | 3 | 1 | 0 | 1 | 4 | 75.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 134 | 2364 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 122 | 6100 | 24 | 0.20 | 0.39 |
| we-work-remotely | 69 | 6234 | 51 | 0.74 | 0.82 |
| remote-ok | 35 | 1063 | 10 | 0.29 | 0.94 |
| jobicy-supporting-apac | 15 | 600 | 3 | 0.20 | 0.50 |
| jobicy-admin-support-apac | 3 | 17 | 0 | 0.00 | 0.00 |
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
