# Source economics — latest (SP-02)

- **As of:** 2026-10-01T09:22:58.365Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1324 | 588 | 84.00 | 1010 | 33.67 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 6505 | 6505 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1324 | 588 | 792 | 1010 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 27.2%; top-3 65.0%.
- **Active:** top family `we-work-remotely` 28.2%; top-3 64.0%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 374 | 275 | 96 | we-work-remotely |
| workable | 238 | 238 | 238 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 236 | 143 | 25 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 160 | 112 | 24 | real-work-from-anywhere |
| greenhouse | 138 | 131 | 131 | greenhouse:canonical, greenhouse:remotecom, greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 57 | 57 | 57 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| jobicy | 55 | 14 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 52 | 34 | 11 | remote-ok |
| remotive | 12 | 4 | 0 | remotive |
| himalayas | 2 | 2 | 2 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 374 | 96 | 275 | 1124 |
| real-work-from-anywhere | RealWorkFromAnywhere | 160 | 24 | 112 | 437 |
| workable:hunt-st | Hunt St | 146 | 146 | 146 | 3 |
| greenhouse:canonical | Greenhouse/canonical | 122 | 122 | 122 | 0 |
| breezy:20four7va | 20Four7VA | 117 | 14 | 55 | 128 |
| breezy:sourcefit | Sourcefit | 84 | 10 | 53 | 148 |
| ashby:multiplymii | Ashby/multiplymii | 57 | 57 | 57 | 0 |
| remote-ok | RemoteOK | 52 | 11 | 34 | 1168 |
| jobicy-supporting-apac | Jobicy | 50 | 4 | 14 | 80 |
| workable:coconutva | Coconut VA | 37 | 37 | 37 | 21 |
| workable:crewbloom | CrewBloom | 29 | 29 | 29 | 13 |
| workable:pearltalent | Pearl Talent | 18 | 18 | 18 | 26 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 8 | 8 | 608 |
| breezy:yokly | Yokly | 12 | 1 | 12 | 0 |
| remotive | Remotive | 12 | 0 | 4 | 89 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 7 | 7 | 2 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 0 | 7 |
| himalayas:remote-jobs | Himalayas | 2 | 2 | 2 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:gitlab | GitLab | 1 | 1 | 1 | 463 |
| workable:hello-rache | Hello Rache | 1 | 1 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 306 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 134 | 569 | 0 | 0 | 0 | 2301 |
| breezy:20four7va | 118 | 0 | 1286 | 0 | 0 | 12484 |
| breezy:remote-craft | 118 | 0 | 584 | 0 | 0 | 1770 |
| breezy:sourcefit | 118 | 0 | 584 | 0 | 0 | 9774 |
| breezy:value-virtual-assistants | 118 | 0 | 584 | 0 | 0 | 1062 |
| breezy:yokly | 118 | 0 | 584 | 0 | 0 | 1284 |
| real-work-from-anywhere | 118 | 0 | 585 | 0 | 0 | 5900 |
| breezy:time-etc | 100 | 0 | 602 | 0 | 0 | 100 |
| greenhouse:ghost | 100 | 0 | 602 | 0 | 0 | 600 |
| greenhouse:nearform | 100 | 0 | 602 | 0 | 0 | 2414 |
| greenhouse:gitlab | 98 | 0 | 604 | 0 | 0 | 19507 |
| greenhouse:grafanalabs | 96 | 0 | 604 | 2 | 0 | 13183 |
| greenhouse:remotecom | 69 | 0 | 632 | 0 | 0 | 9787 |
| we-work-remotely | 68 | 633 | 0 | 2 | 0 | 5679 |
| ashby:multiplymii | 62 | 0 | 289 | 0 | 0 | 3214 |
| jobicy-supporting-apac | 26 | 84 | 588 | 5 | 0 | 1040 |
| remote-ok | 12 | 106 | 585 | 0 | 0 | 508 |
| jobicy-admin-support-apac | 3 | 109 | 588 | 3 | 0 | 9 |
| workable:hunt-st | 1 | 0 | 702 | 0 | 0 | 146 |
| workable:rocketams | 1 | 0 | 702 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 703 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 703 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 703 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 703 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 703 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 703 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 703 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 703 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 703 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 703 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 703 | 0 | 0 | 0 |
| problogger | 0 | 0 | 703 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 703 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 702 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 702 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 702 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| workable:hunt-st | 146 | 0 | 3 | 3 | 149 | 98.0% |
| greenhouse:canonical | 122 | 0 | 0 | 0 | 122 | 100.0% |
| we-work-remotely | 97 | 1 | 13 | 14 | 111 | 87.4% |
| greenhouse:gitlab | 1 | 2 | 96 | 98 | 99 | 1.0% |
| greenhouse:grafanalabs | 0 | 0 | 74 | 74 | 74 | 0.0% |
| ashby:multiplymii | 57 | 0 | 0 | 0 | 57 | 100.0% |
| greenhouse:remotecom | 9 | 3 | 37 | 40 | 49 | 18.4% |
| workable:coconutva | 37 | 0 | 0 | 0 | 37 | 100.0% |
| real-work-from-anywhere | 24 | 1 | 6 | 7 | 31 | 77.4% |
| workable:crewbloom | 29 | 0 | 0 | 0 | 29 | 100.0% |
| workable:pearltalent | 18 | 0 | 0 | 0 | 18 | 100.0% |
| breezy:20four7va | 14 | 0 | 0 | 0 | 14 | 100.0% |
| remote-ok | 11 | 2 | 0 | 2 | 13 | 84.6% |
| breezy:sourcefit | 10 | 0 | 1 | 1 | 11 | 90.9% |
| workable:rocketams | 7 | 0 | 2 | 2 | 9 | 77.8% |
| greenhouse:ghost | 0 | 0 | 4 | 4 | 4 | 0.0% |
| jobicy-supporting-apac | 4 | 0 | 0 | 0 | 4 | 100.0% |
| greenhouse:nearform | 0 | 0 | 3 | 3 | 3 | 0.0% |
| himalayas:remote-jobs | 2 | 0 | 0 | 0 | 2 | 100.0% |
| breezy:time-etc | 0 | 0 | 1 | 1 | 1 | 0.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |
| workable:hello-rache | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 134 | 2301 | 0 | 0.00 | 0.00 |
| breezy:20four7va | 118 | 12484 | 14 | 0.12 | 0.11 |
| breezy:remote-craft | 118 | 1770 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 118 | 9774 | 10 | 0.08 | 0.10 |
| breezy:value-virtual-assistants | 118 | 1062 | 0 | 0.00 | 0.00 |
| breezy:yokly | 118 | 1284 | 1 | 0.01 | 0.08 |
| real-work-from-anywhere | 118 | 5900 | 24 | 0.20 | 0.41 |
| breezy:time-etc | 100 | 100 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 100 | 600 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 100 | 2414 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 98 | 19507 | 1 | 0.01 | 0.01 |
| greenhouse:grafanalabs | 96 | 13183 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 69 | 9787 | 9 | 0.13 | 0.09 |
| we-work-remotely | 68 | 5679 | 97 | 1.43 | 1.71 |
| ashby:multiplymii | 62 | 3214 | 57 | 0.92 | 1.77 |
| jobicy-supporting-apac | 26 | 1040 | 4 | 0.15 | 0.38 |
| remote-ok | 12 | 508 | 11 | 0.92 | 2.17 |
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
