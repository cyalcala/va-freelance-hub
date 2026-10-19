# Source economics — latest (SP-02)

- **As of:** 2026-10-19T08:02:47.883Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1724 | 268 | 38.29 | 1421 | 47.37 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7558 | 7558 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1724 | 268 | 464 | 1421 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 28.4%; top-3 63.8%.
- **Active:** top family `we-work-remotely` 28.2%; top-3 62.8%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 487 | 403 | 121 | we-work-remotely |
| workable | 307 | 307 | 30 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 289 | 196 | 26 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 148 | 141 | 3 | greenhouse:canonical, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:grafanalabs, greenhouse:nearform |
| real-work-from-anywhere | 143 | 101 | 32 | real-work-from-anywhere |
| ashby | 128 | 128 | 9 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 86 | 86 | 25 | lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:applydigital, lever:brafton, lever:decilegroup, lever:outsourcedstaff, lever:lwolf, lever:gushwork, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| remote-ok | 64 | 41 | 14 | remote-ok |
| jobicy | 55 | 13 | 7 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 15 | 3 | 1 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 487 | 121 | 403 | 1332 |
| workable:hunt-st | Hunt St | 202 | 27 | 202 | 3 |
| breezy:20four7va | 20Four7VA | 147 | 14 | 85 | 128 |
| real-work-from-anywhere | RealWorkFromAnywhere | 143 | 32 | 101 | 525 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 188 |
| breezy:sourcefit | Breezy/sourcefit | 106 | 12 | 75 | 148 |
| ashby:multiplymii | Ashby/multiplymii | 77 | 6 | 77 | 0 |
| remote-ok | RemoteOK | 64 | 14 | 41 | 1196 |
| jobicy-supporting-apac | Jobicy | 49 | 5 | 11 | 97 |
| workable:coconutva | Coconut VA | 41 | 0 | 41 | 21 |
| workable:crewbloom | CrewBloom | 37 | 2 | 37 | 13 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 18 | 0 | 18 | 26 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| remotive | Remotive | 15 | 1 | 3 | 89 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| breezy:yokly | Yokly | 12 | 0 | 12 | 0 |
| lever:tenna | Lever/tenna | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 10 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 8 | 1 | 8 | 2 |
| greenhouse:gitlab | GitLab | 6 | 3 | 6 | 549 |
| jobicy-admin-support-apac | Jobicy | 6 | 2 | 2 | 8 |
| lever:applydigital | Lever/applydigital | 6 | 6 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 5 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:the-studio | Ashby/the-studio | 3 | 0 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 3 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 0 | 3 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 2 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| himalayas:remote-jobs | Himalayas | 2 | 0 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 1 | 1 | 0 |
| ashby:homera-health | Ashby/homera-health | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 1 | 0 | 1 | 0 |
| lever:90seconds | Lever/90seconds | 1 | 0 | 1 | 0 |
| lever:hso | Lever/hso | 1 | 0 | 1 | 0 |
| lever:trustarc | Lever/trustarc | 1 | 0 | 1 | 0 |
| workable:hello-rache | Hello Rache | 1 | 0 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 342 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 158 | 739 | 0 | 0 | 0 | 2254 |
| ashby:multiplymii | 142 | 0 | 755 | 0 | 0 | 8205 |
| breezy:20four7va | 142 | 0 | 1651 | 0 | 0 | 16310 |
| breezy:remote-craft | 142 | 0 | 755 | 0 | 0 | 2130 |
| breezy:sourcefit | 141 | 0 | 755 | 0 | 0 | 12476 |
| breezy:time-etc | 141 | 0 | 755 | 0 | 0 | 141 |
| breezy:value-virtual-assistants | 141 | 0 | 755 | 0 | 0 | 1551 |
| breezy:yokly | 141 | 0 | 755 | 0 | 0 | 1551 |
| greenhouse:canonical | 141 | 0 | 755 | 0 | 0 | 43690 |
| greenhouse:ghost | 141 | 0 | 755 | 0 | 0 | 846 |
| greenhouse:gitlab | 141 | 0 | 755 | 0 | 0 | 31513 |
| greenhouse:grafanalabs | 141 | 0 | 755 | 0 | 0 | 15351 |
| greenhouse:nearform | 141 | 0 | 754 | 0 | 0 | 3066 |
| real-work-from-anywhere | 141 | 0 | 755 | 1 | 0 | 7050 |
| we-work-remotely | 114 | 774 | 0 | 9 | 0 | 10005 |
| greenhouse:remotecom | 55 | 0 | 754 | 86 | 55 | 0 |
| remote-ok | 40 | 101 | 755 | 1 | 0 | 1659 |
| jobicy-supporting-apac | 18 | 120 | 758 | 1 | 0 | 720 |
| jobicy-admin-support-apac | 6 | 134 | 757 | 0 | 0 | 21 |
| ashby:amplify | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 301 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 896 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 896 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 897 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 896 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 897 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 897 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 403 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 896 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 896 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 896 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 896 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 21 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 896 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 98 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 896 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 896 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 403 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 896 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 896 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 897 | 0 | 0 | 0 |
| problogger | 0 | 0 | 897 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 897 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 896 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 896 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 121 | 4 | 19 | 19 | 144 | 84.0% |
| greenhouse:gitlab | 3 | 0 | 31 | 31 | 34 | 8.8% |
| real-work-from-anywhere | 32 | 1 | 0 | 1 | 33 | 97.0% |
| remote-ok | 14 | 6 | 7 | 13 | 27 | 51.9% |
| workable:hunt-st | 27 | 0 | 0 | 0 | 27 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 22 | 22 | 22 | 0.0% |
| breezy:20four7va | 14 | 0 | 0 | 0 | 14 | 100.0% |
| breezy:sourcefit | 12 | 0 | 0 | 4 | 12 | 100.0% |
| lever:tenna | 11 | 0 | 0 | 0 | 11 | 100.0% |
| jobicy-supporting-apac | 5 | 0 | 4 | 4 | 9 | 55.6% |
| ashby:multiplymii | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:applydigital | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:outsourcedstaff | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:gushwork | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:luxor | 2 | 0 | 0 | 0 | 2 | 100.0% |
| jobicy-admin-support-apac | 2 | 0 | 0 | 0 | 2 | 100.0% |
| workable:crewbloom | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:finch | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 158 | 2254 | 1 | 0.01 | 0.04 |
| ashby:multiplymii | 142 | 8205 | 6 | 0.04 | 0.07 |
| breezy:20four7va | 142 | 16310 | 14 | 0.10 | 0.09 |
| breezy:remote-craft | 142 | 2130 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 141 | 12476 | 12 | 0.09 | 0.10 |
| breezy:time-etc | 141 | 141 | 0 | 0.00 | 0.00 |
| breezy:value-virtual-assistants | 141 | 1551 | 0 | 0.00 | 0.00 |
| breezy:yokly | 141 | 1551 | 0 | 0.00 | 0.00 |
| greenhouse:canonical | 141 | 43690 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 141 | 846 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 141 | 31513 | 3 | 0.02 | 0.01 |
| greenhouse:grafanalabs | 141 | 15351 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 141 | 3066 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 141 | 7050 | 32 | 0.23 | 0.45 |
| we-work-remotely | 114 | 10005 | 121 | 1.06 | 1.21 |
| greenhouse:remotecom | 55 | 0 | 0 | 0.00 | 0.00 |
| remote-ok | 40 | 1659 | 14 | 0.35 | 0.84 |
| jobicy-supporting-apac | 18 | 720 | 5 | 0.28 | 0.69 |
| jobicy-admin-support-apac | 6 | 21 | 2 | 0.33 | 9.52 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:circulareconomysystems | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:foundry-for-good | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:getground | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:gradient | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:luxor | 0 | 0 | 2 | 0.00 | 0.00 |
| ashby:molecule | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:payscale | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:the-studio | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:applydigital | 0 | 0 | 6 | 0.00 | 0.00 |
| lever:beaverprocess | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:brafton | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:decilegroup | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:deliverect | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:gushwork | 0 | 0 | 3 | 0.00 | 0.00 |
| lever:lwolf | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:outsourcedstaff | 0 | 0 | 5 | 0.00 | 0.00 |
| lever:repurposeglobal | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:snappr | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:tenna | 0 | 0 | 11 | 0.00 | 0.00 |
| lever:truezerotech | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 2 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 0 | 0 | 27 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:rocketams | 0 | 0 | 1 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
