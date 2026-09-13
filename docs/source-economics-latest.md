# Source economics — latest (SP-02)

- **As of:** 2026-09-13T07:38:21.886Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 855 | 85 | 12.14 | 553 | 18.43 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5350 | 5350 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1089 | 85 | 173 | 603 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 48.8% ⚠️ >40%; top-3 81.3% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 31.7%; top-3 62.2%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 345 | 294 | 49 | we-work-remotely |
| breezy | 168 | 52 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| real-work-from-anywhere | 164 | 144 | 25 | real-work-from-anywhere |
| ashby | 154 | 13 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 151 | 19 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 51 | 51 | 9 | remote-ok |
| jobicy | 46 | 27 | 2 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 10 | 3 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 345 | 49 | 294 | 934 |
| real-work-from-anywhere | RealWorkFromAnywhere | 164 | 25 | 144 | 353 |
| breezy:20four7va | 20Four7VA | 96 | 0 | 35 | 94 |
| breezy:sourcefit | Sourcefit | 71 | 0 | 17 | 102 |
| ashby:supabase | Supabase | 60 | 0 | 7 | 24 |
| remote-ok | RemoteOK | 51 | 9 | 51 | 1136 |
| greenhouse:gitlab | GitLab | 46 | 0 | 1 | 319 |
| greenhouse:remotecom | Remote.com | 46 | 0 | 18 | 527 |
| greenhouse:grafanalabs | Grafana Labs | 44 | 0 | 0 | 188 |
| jobicy-supporting-apac | Jobicy | 42 | 2 | 24 | 77 |
| ashby:ashby | Ashby | 32 | 0 | 2 | 60 |
| ashby:camunda | Camunda | 23 | 0 | 4 | 44 |
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
| remotive | 141 | 618 | 0 | 0 | 0 | 2466 |
| real-work-from-anywhere | 126 | 0 | 633 | 0 | 0 | 6300 |
| we-work-remotely | 70 | 687 | 0 | 2 | 0 | 6319 |
| remote-ok | 37 | 89 | 633 | 0 | 0 | 1206 |
| jobicy-supporting-apac | 13 | 106 | 639 | 1 | 0 | 520 |
| jobicy-admin-support-apac | 3 | 120 | 636 | 0 | 0 | 16 |
| ashby:amplify | 0 | 0 | 759 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 759 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 759 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 758 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 758 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 759 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1516 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 758 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 758 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 758 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 759 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 758 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 758 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 758 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 757 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 757 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 759 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 757 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 759 | 0 | 0 | 0 |
| problogger | 0 | 0 | 759 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 759 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 757 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 757 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 49 | 2 | 8 | 10 | 59 | 83.1% |
| real-work-from-anywhere | 25 | 3 | 0 | 3 | 28 | 89.3% |
| remote-ok | 9 | 11 | 6 | 17 | 26 | 34.6% |
| jobicy-supporting-apac | 2 | 1 | 0 | 1 | 3 | 66.7% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 141 | 2466 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 126 | 6300 | 25 | 0.20 | 0.40 |
| we-work-remotely | 70 | 6319 | 49 | 0.70 | 0.78 |
| remote-ok | 37 | 1206 | 9 | 0.24 | 0.75 |
| jobicy-supporting-apac | 13 | 520 | 2 | 0.15 | 0.38 |
| jobicy-admin-support-apac | 3 | 16 | 0 | 0.00 | 0.00 |
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
