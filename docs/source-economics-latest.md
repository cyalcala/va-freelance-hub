# Source economics — latest (SP-02)

- **As of:** 2026-09-18T07:35:34.928Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 861 | 88 | 12.57 | 460 | 15.33 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5443 | 5443 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1051 | 88 | 190 | 498 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 48.4% ⚠️ >40%; top-3 84.5% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 32.4%; top-3 63.8%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 340 | 241 | 53 | we-work-remotely |
| real-work-from-anywhere | 169 | 131 | 24 | real-work-from-anywhere |
| breezy | 162 | 26 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| ashby | 134 | 12 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 134 | 13 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 56 | 49 | 7 | remote-ok |
| jobicy | 45 | 21 | 2 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 11 | 5 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 340 | 53 | 241 | 995 |
| real-work-from-anywhere | RealWorkFromAnywhere | 169 | 24 | 131 | 371 |
| breezy:20four7va | 20Four7VA | 93 | 0 | 21 | 97 |
| breezy:sourcefit | Sourcefit | 68 | 0 | 5 | 105 |
| remote-ok | RemoteOK | 56 | 7 | 49 | 1139 |
| ashby:supabase | Supabase | 53 | 0 | 7 | 31 |
| greenhouse:gitlab | GitLab | 43 | 0 | 1 | 322 |
| greenhouse:remotecom | Remote.com | 41 | 0 | 12 | 532 |
| jobicy-supporting-apac | Jobicy | 41 | 2 | 20 | 82 |
| greenhouse:grafanalabs | Grafana Labs | 40 | 0 | 0 | 192 |
| ashby:ashby | Ashby | 30 | 0 | 2 | 62 |
| ashby:camunda | Camunda | 22 | 0 | 3 | 45 |
| ashby:amplify | Amplify | 16 | 0 | 0 | 71 |
| ashby:tremendous | Tremendous | 13 | 0 | 0 | 18 |
| remotive | Remotive | 11 | 2 | 5 | 84 |
| greenhouse:nearform | Nearform | 9 | 0 | 0 | 43 |
| jobicy-admin-support-apac | Jobicy | 4 | 0 | 1 | 8 |
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
| remotive | 128 | 509 | 0 | 0 | 0 | 2100 |
| real-work-from-anywhere | 106 | 0 | 531 | 0 | 0 | 5300 |
| we-work-remotely | 67 | 569 | 0 | 1 | 0 | 5853 |
| remote-ok | 30 | 76 | 531 | 0 | 0 | 1254 |
| jobicy-supporting-apac | 9 | 91 | 536 | 1 | 0 | 360 |
| jobicy-admin-support-apac | 7 | 96 | 534 | 0 | 0 | 35 |
| ashby:amplify | 0 | 0 | 637 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 637 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 637 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 637 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 637 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 637 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1274 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 637 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 637 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 637 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 637 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 637 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 637 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 637 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 637 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 637 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 637 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 637 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 637 | 0 | 0 | 0 |
| problogger | 0 | 0 | 637 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 637 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 637 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 637 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 637 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 637 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 637 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 637 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 637 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 636 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 636 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 636 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 636 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 636 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 636 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 636 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 53 | 1 | 12 | 13 | 66 | 80.3% |
| real-work-from-anywhere | 24 | 4 | 1 | 5 | 29 | 82.8% |
| remote-ok | 7 | 3 | 3 | 6 | 13 | 53.8% |
| jobicy-supporting-apac | 2 | 0 | 2 | 2 | 4 | 50.0% |
| remotive | 2 | 0 | 1 | 1 | 3 | 66.7% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 2100 | 2 | 0.02 | 0.10 |
| real-work-from-anywhere | 106 | 5300 | 24 | 0.23 | 0.45 |
| we-work-remotely | 67 | 5853 | 53 | 0.79 | 0.91 |
| remote-ok | 30 | 1254 | 7 | 0.23 | 0.56 |
| jobicy-supporting-apac | 9 | 360 | 2 | 0.22 | 0.56 |
| jobicy-admin-support-apac | 7 | 35 | 0 | 0.00 | 0.00 |
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
