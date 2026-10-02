# Source economics — latest (SP-02)

- **As of:** 2026-10-02T08:55:31.940Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1366 | 621 | 88.71 | 1058 | 35.27 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 6573 | 6573 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1366 | 621 | 839 | 1058 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 26.4%; top-3 65.1%.
- **Active:** top family `we-work-remotely` 27.5%; top-3 64.3%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 375 | 279 | 94 | we-work-remotely |
| workable | 259 | 259 | 259 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 244 | 151 | 29 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 156 | 109 | 18 | real-work-from-anywhere |
| greenhouse | 138 | 131 | 131 | greenhouse:canonical, greenhouse:remotecom, greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 60 | 60 | 60 | ashby:multiplymii, ashby:the-studio, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| jobicy | 55 | 14 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 52 | 36 | 12 | remote-ok |
| lever | 13 | 13 | 13 | lever:snappr |
| remotive | 12 | 4 | 0 | remotive |
| himalayas | 2 | 2 | 2 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 375 | 94 | 279 | 1135 |
| workable:hunt-st | Hunt St | 158 | 158 | 158 | 3 |
| real-work-from-anywhere | RealWorkFromAnywhere | 156 | 18 | 109 | 445 |
| breezy:20four7va | 20Four7VA | 124 | 19 | 62 | 128 |
| greenhouse:canonical | Greenhouse/canonical | 122 | 122 | 122 | 0 |
| breezy:sourcefit | Sourcefit | 85 | 9 | 54 | 147 |
| ashby:multiplymii | Ashby/multiplymii | 57 | 57 | 57 | 0 |
| remote-ok | RemoteOK | 52 | 12 | 36 | 1170 |
| jobicy-supporting-apac | Jobicy | 50 | 3 | 14 | 80 |
| workable:coconutva | Coconut VA | 41 | 41 | 41 | 21 |
| workable:crewbloom | CrewBloom | 34 | 34 | 34 | 13 |
| workable:pearltalent | Pearl Talent | 18 | 18 | 18 | 26 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 8 | 8 | 608 |
| lever:snappr | Lever/snappr | 13 | 13 | 13 | 0 |
| breezy:yokly | Yokly | 12 | 1 | 12 | 0 |
| remotive | Remotive | 12 | 0 | 4 | 89 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 7 | 7 | 2 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 0 | 7 |
| ashby:the-studio | Ashby/the-studio | 3 | 3 | 3 | 0 |
| himalayas:remote-jobs | Himalayas | 2 | 2 | 2 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:gitlab | GitLab | 1 | 1 | 1 | 468 |
| workable:hello-rache | Hello Rache | 1 | 1 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 307 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 136 | 573 | 0 | 0 | 0 | 2295 |
| breezy:20four7va | 120 | 0 | 1296 | 0 | 0 | 12847 |
| breezy:remote-craft | 120 | 0 | 588 | 0 | 0 | 1800 |
| breezy:sourcefit | 120 | 0 | 588 | 0 | 0 | 9974 |
| breezy:time-etc | 120 | 0 | 588 | 0 | 0 | 120 |
| breezy:value-virtual-assistants | 120 | 0 | 588 | 0 | 0 | 1080 |
| breezy:yokly | 120 | 0 | 588 | 0 | 0 | 1306 |
| greenhouse:nearform | 120 | 0 | 588 | 0 | 0 | 2875 |
| real-work-from-anywhere | 120 | 0 | 589 | 0 | 0 | 6000 |
| greenhouse:ghost | 119 | 0 | 588 | 1 | 0 | 714 |
| greenhouse:gitlab | 118 | 0 | 590 | 0 | 0 | 23577 |
| greenhouse:grafanalabs | 115 | 0 | 590 | 3 | 0 | 15467 |
| greenhouse:remotecom | 89 | 0 | 618 | 0 | 14 | 9920 |
| ashby:multiplymii | 82 | 0 | 393 | 0 | 0 | 4178 |
| we-work-remotely | 64 | 643 | 0 | 2 | 0 | 5378 |
| jobicy-supporting-apac | 25 | 88 | 592 | 4 | 0 | 1000 |
| remote-ok | 11 | 109 | 589 | 0 | 0 | 463 |
| jobicy-admin-support-apac | 3 | 112 | 592 | 2 | 0 | 9 |
| workable:hunt-st | 1 | 0 | 708 | 0 | 0 | 146 |
| workable:rocketams | 1 | 0 | 708 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 709 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 709 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 709 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 709 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 46 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 709 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 709 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 709 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 709 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 709 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 46 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 709 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 709 | 0 | 0 | 0 |
| problogger | 0 | 0 | 709 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 708 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| workable:hunt-st | 158 | 0 | 3 | 3 | 161 | 98.1% |
| greenhouse:canonical | 122 | 0 | 0 | 0 | 122 | 100.0% |
| we-work-remotely | 95 | 1 | 14 | 15 | 110 | 86.4% |
| greenhouse:gitlab | 1 | 2 | 101 | 103 | 104 | 1.0% |
| greenhouse:grafanalabs | 0 | 0 | 75 | 75 | 75 | 0.0% |
| ashby:multiplymii | 57 | 0 | 0 | 0 | 57 | 100.0% |
| greenhouse:remotecom | 9 | 3 | 37 | 40 | 49 | 18.4% |
| workable:coconutva | 41 | 0 | 0 | 0 | 41 | 100.0% |
| workable:crewbloom | 34 | 0 | 0 | 0 | 34 | 100.0% |
| real-work-from-anywhere | 18 | 1 | 6 | 7 | 25 | 72.0% |
| breezy:20four7va | 19 | 0 | 0 | 0 | 19 | 100.0% |
| workable:pearltalent | 18 | 0 | 0 | 0 | 18 | 100.0% |
| remote-ok | 12 | 2 | 0 | 2 | 14 | 85.7% |
| lever:snappr | 13 | 0 | 0 | 0 | 13 | 100.0% |
| breezy:sourcefit | 9 | 0 | 0 | 1 | 9 | 100.0% |
| workable:rocketams | 7 | 0 | 2 | 2 | 9 | 77.8% |
| greenhouse:ghost | 0 | 0 | 4 | 4 | 4 | 0.0% |
| ashby:the-studio | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:nearform | 0 | 0 | 3 | 3 | 3 | 0.0% |
| jobicy-supporting-apac | 3 | 0 | 0 | 0 | 3 | 100.0% |
| himalayas:remote-jobs | 2 | 0 | 0 | 0 | 2 | 100.0% |
| breezy:time-etc | 0 | 0 | 1 | 1 | 1 | 0.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |
| workable:hello-rache | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 136 | 2295 | 0 | 0.00 | 0.00 |
| breezy:20four7va | 120 | 12847 | 19 | 0.16 | 0.15 |
| breezy:remote-craft | 120 | 1800 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 120 | 9974 | 9 | 0.07 | 0.09 |
| breezy:time-etc | 120 | 120 | 0 | 0.00 | 0.00 |
| breezy:value-virtual-assistants | 120 | 1080 | 0 | 0.00 | 0.00 |
| breezy:yokly | 120 | 1306 | 1 | 0.01 | 0.08 |
| greenhouse:nearform | 120 | 2875 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 120 | 6000 | 18 | 0.15 | 0.30 |
| greenhouse:ghost | 119 | 714 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 118 | 23577 | 1 | 0.01 | 0.00 |
| greenhouse:grafanalabs | 115 | 15467 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 89 | 9920 | 9 | 0.10 | 0.09 |
| ashby:multiplymii | 82 | 4178 | 57 | 0.70 | 1.36 |
| we-work-remotely | 64 | 5378 | 95 | 1.48 | 1.77 |
| jobicy-supporting-apac | 25 | 1000 | 3 | 0.12 | 0.30 |
| remote-ok | 11 | 463 | 12 | 1.09 | 2.59 |
| jobicy-admin-support-apac | 3 | 9 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 1 | 146 | 158 | 158.00 | 108.22 |
| workable:rocketams | 1 | 9 | 7 | 7.00 | 77.78 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:the-studio | 0 | 0 | 3 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:snappr | 0 | 0 | 13 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 41 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 34 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 1 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 18 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
