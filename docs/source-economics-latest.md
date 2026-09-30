# Source economics — latest (SP-02)

- **As of:** 2026-09-30T08:57:45.188Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1292 | 698 | 99.71 | 983 | 32.77 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 6451 | 6451 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1292 | 698 | 772 | 983 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 25.9%; top-3 64.2%.
- **Active:** top family `we-work-remotely` 27.1%; top-3 63.3%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 350 | 255 | 84 | we-work-remotely |
| workable | 238 | 238 | 238 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 230 | 138 | 138 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 160 | 110 | 34 | real-work-from-anywhere |
| greenhouse | 138 | 131 | 131 | greenhouse:canonical, greenhouse:remotecom, greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 56 | 56 | 56 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| jobicy | 54 | 13 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 52 | 36 | 12 | remote-ok |
| remotive | 12 | 4 | 0 | remotive |
| himalayas | 2 | 2 | 2 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 350 | 84 | 255 | 1120 |
| real-work-from-anywhere | RealWorkFromAnywhere | 160 | 34 | 110 | 430 |
| workable:hunt-st | Hunt St | 146 | 146 | 146 | 3 |
| greenhouse:canonical | Greenhouse/canonical | 122 | 122 | 122 | 0 |
| breezy:20four7va | 20Four7VA | 114 | 53 | 53 | 129 |
| breezy:sourcefit | Sourcefit | 82 | 51 | 51 | 147 |
| ashby:multiplymii | Ashby/multiplymii | 56 | 56 | 56 | 0 |
| remote-ok | RemoteOK | 52 | 12 | 36 | 1168 |
| jobicy-supporting-apac | Jobicy | 49 | 3 | 13 | 80 |
| workable:coconutva | Coconut VA | 37 | 37 | 37 | 21 |
| workable:crewbloom | CrewBloom | 29 | 29 | 29 | 13 |
| workable:pearltalent | Pearl Talent | 18 | 18 | 18 | 26 |
| breezy:remote-craft | Remote Craft | 14 | 14 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 8 | 8 | 608 |
| remotive | Remotive | 12 | 0 | 4 | 88 |
| breezy:yokly | Yokly | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 9 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 7 | 7 | 2 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 0 | 7 |
| himalayas:remote-jobs | Himalayas | 2 | 2 | 2 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:gitlab | GitLab | 1 | 1 | 1 | 456 |
| workable:hello-rache | Hello Rache | 1 | 1 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 303 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 549 | 0 | 0 | 0 | 2222 |
| real-work-from-anywhere | 113 | 0 | 564 | 0 | 0 | 5650 |
| breezy:20four7va | 112 | 0 | 1240 | 0 | 0 | 11802 |
| breezy:sourcefit | 112 | 0 | 564 | 0 | 0 | 9255 |
| breezy:remote-craft | 111 | 0 | 552 | 0 | 0 | 1665 |
| breezy:value-virtual-assistants | 111 | 0 | 552 | 0 | 0 | 999 |
| breezy:yokly | 111 | 0 | 552 | 0 | 0 | 1218 |
| breezy:time-etc | 86 | 0 | 590 | 0 | 0 | 86 |
| greenhouse:ghost | 86 | 0 | 590 | 0 | 0 | 516 |
| greenhouse:nearform | 86 | 0 | 590 | 0 | 0 | 2078 |
| greenhouse:gitlab | 84 | 0 | 592 | 0 | 0 | 16684 |
| greenhouse:grafanalabs | 82 | 0 | 592 | 2 | 0 | 11480 |
| we-work-remotely | 68 | 607 | 0 | 2 | 0 | 5614 |
| greenhouse:remotecom | 55 | 0 | 620 | 0 | 0 | 8853 |
| ashby:multiplymii | 48 | 0 | 222 | 0 | 0 | 2530 |
| jobicy-supporting-apac | 26 | 79 | 567 | 5 | 0 | 1040 |
| remote-ok | 11 | 102 | 564 | 0 | 0 | 468 |
| jobicy-admin-support-apac | 3 | 104 | 567 | 3 | 0 | 9 |
| workable:hunt-st | 1 | 0 | 676 | 0 | 0 | 146 |
| workable:rocketams | 1 | 0 | 676 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 677 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 677 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 677 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 677 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 677 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 677 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 677 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 677 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 677 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 677 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 677 | 0 | 0 | 0 |
| problogger | 0 | 0 | 677 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 677 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 676 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 676 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 676 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| workable:hunt-st | 146 | 0 | 3 | 3 | 149 | 98.0% |
| greenhouse:canonical | 122 | 0 | 0 | 0 | 122 | 100.0% |
| we-work-remotely | 85 | 2 | 13 | 17 | 100 | 85.0% |
| greenhouse:gitlab | 1 | 1 | 90 | 91 | 92 | 1.1% |
| greenhouse:grafanalabs | 0 | 0 | 71 | 71 | 71 | 0.0% |
| ashby:multiplymii | 56 | 0 | 0 | 0 | 56 | 100.0% |
| breezy:sourcefit | 51 | 1 | 4 | 23 | 56 | 91.1% |
| breezy:20four7va | 53 | 0 | 0 | 0 | 53 | 100.0% |
| greenhouse:remotecom | 9 | 3 | 37 | 40 | 49 | 18.4% |
| real-work-from-anywhere | 34 | 2 | 3 | 5 | 39 | 87.2% |
| workable:coconutva | 37 | 0 | 0 | 0 | 37 | 100.0% |
| workable:crewbloom | 29 | 0 | 0 | 0 | 29 | 100.0% |
| workable:pearltalent | 18 | 0 | 0 | 0 | 18 | 100.0% |
| remote-ok | 12 | 3 | 2 | 5 | 17 | 70.6% |
| breezy:remote-craft | 14 | 0 | 1 | 0 | 15 | 93.3% |
| breezy:yokly | 11 | 0 | 0 | 0 | 11 | 100.0% |
| breezy:value-virtual-assistants | 9 | 0 | 0 | 0 | 9 | 100.0% |
| workable:rocketams | 7 | 0 | 2 | 2 | 9 | 77.8% |
| greenhouse:ghost | 0 | 0 | 4 | 4 | 4 | 0.0% |
| greenhouse:nearform | 0 | 0 | 3 | 3 | 3 | 0.0% |
| jobicy-supporting-apac | 3 | 0 | 0 | 0 | 3 | 100.0% |
| himalayas:remote-jobs | 2 | 0 | 0 | 0 | 2 | 100.0% |
| breezy:time-etc | 0 | 0 | 1 | 1 | 1 | 0.0% |
| workable:hello-rache | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 2222 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 113 | 5650 | 34 | 0.30 | 0.60 |
| breezy:20four7va | 112 | 11802 | 53 | 0.47 | 0.45 |
| breezy:sourcefit | 112 | 9255 | 51 | 0.46 | 0.55 |
| breezy:remote-craft | 111 | 1665 | 14 | 0.13 | 0.84 |
| breezy:value-virtual-assistants | 111 | 999 | 9 | 0.08 | 0.90 |
| breezy:yokly | 111 | 1218 | 11 | 0.10 | 0.90 |
| breezy:time-etc | 86 | 86 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 86 | 516 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 86 | 2078 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 84 | 16684 | 1 | 0.01 | 0.01 |
| greenhouse:grafanalabs | 82 | 11480 | 0 | 0.00 | 0.00 |
| we-work-remotely | 68 | 5614 | 85 | 1.25 | 1.51 |
| greenhouse:remotecom | 55 | 8853 | 9 | 0.16 | 0.10 |
| ashby:multiplymii | 48 | 2530 | 56 | 1.17 | 2.21 |
| jobicy-supporting-apac | 26 | 1040 | 3 | 0.12 | 0.29 |
| remote-ok | 11 | 468 | 12 | 1.09 | 2.56 |
| jobicy-admin-support-apac | 3 | 9 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 1 | 146 | 146 | 146.00 | 100.00 |
| workable:rocketams | 1 | 9 | 7 | 7.00 | 77.78 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 37 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 29 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 1 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 18 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
