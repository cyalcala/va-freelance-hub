# Source economics — latest (SP-02)

- **As of:** 2026-09-16T07:52:50.218Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 867 | 101 | 14.43 | 491 | 16.37 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5413 | 5413 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1086 | 105 | 193 | 545 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 49.4% ⚠️ >40%; top-3 83.5% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 32.6%; top-3 63.3%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 354 | 269 | 62 | we-work-remotely |
| real-work-from-anywhere | 169 | 135 | 31 | real-work-from-anywhere |
| breezy | 164 | 33 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| ashby | 151 | 13 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 140 | 17 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 54 | 51 | 9 | remote-ok |
| jobicy | 45 | 24 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 9 | 3 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 354 | 62 | 269 | 965 |
| real-work-from-anywhere | RealWorkFromAnywhere | 169 | 31 | 135 | 362 |
| breezy:20four7va | 20Four7VA | 94 | 0 | 24 | 96 |
| breezy:sourcefit | Sourcefit | 69 | 0 | 9 | 104 |
| ashby:supabase | Supabase | 59 | 0 | 7 | 25 |
| remote-ok | RemoteOK | 54 | 9 | 51 | 1138 |
| greenhouse:gitlab | GitLab | 44 | 0 | 1 | 321 |
| greenhouse:remotecom | Remote.com | 43 | 0 | 16 | 530 |
| greenhouse:grafanalabs | Grafana Labs | 42 | 0 | 0 | 190 |
| jobicy-supporting-apac | Jobicy | 41 | 3 | 22 | 82 |
| ashby:ashby | Ashby | 32 | 0 | 2 | 60 |
| ashby:camunda | Camunda | 22 | 0 | 4 | 45 |
| ashby:amplify | Amplify | 20 | 0 | 0 | 67 |
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
| remotive | 130 | 521 | 0 | 0 | 0 | 2174 |
| real-work-from-anywhere | 111 | 0 | 540 | 0 | 0 | 5550 |
| we-work-remotely | 74 | 577 | 0 | 0 | 0 | 6561 |
| remote-ok | 37 | 74 | 540 | 0 | 0 | 1391 |
| jobicy-supporting-apac | 12 | 91 | 547 | 1 | 0 | 480 |
| jobicy-admin-support-apac | 8 | 100 | 543 | 0 | 0 | 41 |
| ashby:amplify | 0 | 0 | 651 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 651 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 651 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 650 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 650 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 651 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1300 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 650 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 650 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 650 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 651 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 650 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 650 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 650 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 649 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 649 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 651 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 649 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 651 | 0 | 0 | 0 |
| problogger | 0 | 0 | 651 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 651 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 649 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 649 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 62 | 1 | 12 | 13 | 75 | 82.7% |
| real-work-from-anywhere | 27 | 8 | 0 | 4 | 35 | 77.1% |
| remote-ok | 9 | 12 | 7 | 19 | 28 | 32.1% |
| jobicy-supporting-apac | 3 | 0 | 2 | 2 | 5 | 60.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 130 | 2174 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 111 | 5550 | 27 | 0.24 | 0.49 |
| we-work-remotely | 74 | 6561 | 62 | 0.84 | 0.94 |
| remote-ok | 37 | 1391 | 9 | 0.24 | 0.65 |
| jobicy-supporting-apac | 12 | 480 | 3 | 0.25 | 0.63 |
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
