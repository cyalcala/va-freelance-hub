# Source economics — latest (SP-02)

- **As of:** 2026-09-22T07:55:58.904Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 817 | 98 | 14.00 | 438 | 14.60 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5501 | 5501 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 982 | 100 | 188 | 440 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 51.8% ⚠️ >40%; top-3 88.9% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 32.2%; top-3 64.2%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 316 | 228 | 63 | we-work-remotely |
| real-work-from-anywhere | 163 | 124 | 25 | real-work-from-anywhere |
| breezy | 151 | 10 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| ashby | 129 | 7 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 114 | 7 | 0 | greenhouse:remotecom, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 50 | 39 | 6 | remote-ok |
| jobicy | 46 | 19 | 2 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 13 | 6 | 4 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 316 | 63 | 228 | 1052 |
| real-work-from-anywhere | RealWorkFromAnywhere | 163 | 25 | 124 | 388 |
| breezy:20four7va | 20Four7VA | 86 | 0 | 8 | 104 |
| breezy:sourcefit | Sourcefit | 64 | 0 | 2 | 109 |
| ashby:supabase | Supabase | 52 | 0 | 3 | 32 |
| remote-ok | RemoteOK | 50 | 6 | 39 | 1151 |
| jobicy-supporting-apac | Jobicy | 42 | 2 | 18 | 84 |
| greenhouse:remotecom | Remote.com | 40 | 0 | 6 | 533 |
| greenhouse:gitlab | GitLab | 36 | 0 | 1 | 329 |
| ashby:ashby | Ashby | 30 | 0 | 1 | 62 |
| greenhouse:grafanalabs | Grafana Labs | 29 | 0 | 0 | 203 |
| ashby:camunda | Camunda | 20 | 0 | 3 | 47 |
| ashby:amplify | Amplify | 16 | 0 | 0 | 71 |
| remotive | Remotive | 13 | 4 | 6 | 87 |
| ashby:tremendous | Tremendous | 11 | 0 | 0 | 20 |
| greenhouse:nearform | Nearform | 8 | 0 | 0 | 44 |
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
| remotive | 144 | 568 | 0 | 0 | 0 | 2608 |
| real-work-from-anywhere | 117 | 0 | 595 | 0 | 0 | 5850 |
| we-work-remotely | 77 | 634 | 0 | 1 | 0 | 6580 |
| remote-ok | 27 | 90 | 595 | 0 | 0 | 1148 |
| jobicy-supporting-apac | 18 | 96 | 598 | 0 | 0 | 720 |
| jobicy-admin-support-apac | 3 | 112 | 597 | 0 | 0 | 12 |
| ashby:amplify | 0 | 0 | 712 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 712 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 712 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 712 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 712 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 712 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1424 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 712 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 712 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 712 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 712 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 712 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 712 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 712 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 712 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 712 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 712 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 712 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 712 | 0 | 0 | 0 |
| problogger | 0 | 0 | 712 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 712 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 712 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 712 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 712 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 712 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 712 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 712 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 712 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 711 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 711 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 711 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 711 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 711 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 711 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 711 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 62 | 2 | 12 | 13 | 76 | 81.6% |
| real-work-from-anywhere | 24 | 4 | 1 | 4 | 29 | 82.8% |
| remote-ok | 6 | 1 | 3 | 4 | 10 | 60.0% |
| remotive | 4 | 0 | 3 | 3 | 7 | 57.1% |
| jobicy-supporting-apac | 2 | 0 | 1 | 1 | 3 | 66.7% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 144 | 2608 | 4 | 0.03 | 0.15 |
| real-work-from-anywhere | 117 | 5850 | 24 | 0.21 | 0.41 |
| we-work-remotely | 77 | 6580 | 62 | 0.81 | 0.94 |
| remote-ok | 27 | 1148 | 6 | 0.22 | 0.52 |
| jobicy-supporting-apac | 18 | 720 | 2 | 0.11 | 0.28 |
| jobicy-admin-support-apac | 3 | 12 | 0 | 0.00 | 0.00 |
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
