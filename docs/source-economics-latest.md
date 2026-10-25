# Source economics — latest (SP-02)

- **As of:** 2026-10-25T07:46:33.487Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 2005 | 393 | 56.14 | 1576 | 52.53 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8086 | 8086 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 2005 | 393 | 640 | 1576 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 29.6%; top-3 62.9%.
- **Active:** top family `we-work-remotely` 27.8%; top-3 61.9%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 557 | 466 | 129 | we-work-remotely |
| workable | 364 | 364 | 61 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 320 | 110 | 38 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 165 | 158 | 17 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 162 | 162 | 34 | ashby:multiplymii, ashby:foundry-for-good, ashby:trust-wallet, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:scalemath, ashby:the-studio, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| real-work-from-anywhere | 143 | 103 | 27 | real-work-from-anywhere |
| lever | 142 | 142 | 64 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:levelup, lever:nibiru, lever:applydigital, lever:brafton, lever:brevo, lever:decilegroup, lever:outsourcedstaff, lever:jetsupport, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:repurposeglobal, lever:audinate, lever:beaverprocess, lever:90seconds, lever:alltrails, lever:hso, lever:trustarc |
| remote-ok | 72 | 46 | 11 | remote-ok |
| jobicy | 63 | 19 | 11 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 15 | 4 | 1 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 557 | 129 | 466 | 1404 |
| workable:hunt-st | Hunt St | 240 | 41 | 240 | 5 |
| breezy:20four7va | 20Four7VA | 157 | 11 | 53 | 129 |
| real-work-from-anywhere | RealWorkFromAnywhere | 143 | 27 | 103 | 558 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 196 |
| breezy:sourcefit | Breezy/sourcefit | 123 | 23 | 51 | 153 |
| ashby:multiplymii | Ashby/multiplymii | 82 | 5 | 82 | 0 |
| remote-ok | RemoteOK | 72 | 11 | 46 | 1203 |
| jobicy-supporting-apac | Jobicy | 58 | 10 | 17 | 102 |
| workable:coconutva | Coconut VA | 51 | 10 | 51 | 21 |
| workable:crewbloom | CrewBloom | 41 | 4 | 41 | 38 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 23 | 5 | 23 | 41 |
| lever:vacancies | Lever/vacancies | 20 | 20 | 20 | 0 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:yokly | Yokly | 16 | 4 | 5 | 0 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 16 | 16 | 0 |
| remotive | Remotive | 15 | 1 | 4 | 90 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 13 | 13 | 0 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| lever:levelup | Lever/levelup | 9 | 9 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 8 | 8 | 0 |
| workable:rocketams | RocketAMS | 8 | 1 | 8 | 2 |
| ashby:railway | Ashby/railway | 6 | 6 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 6 | 578 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 1 | 2 | 9 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:brevo | Lever/brevo | 5 | 5 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 5 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 4 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 4 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 3 | 3 | 0 |
| ashby:the-studio | Ashby/the-studio | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 3 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 3 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 3 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 2 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 2 | 2 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| himalayas:remote-jobs | Himalayas | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 2 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
| ashby:homera-health | Ashby/homera-health | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 1 | 0 | 1 | 0 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 1 | 1 | 0 |
| lever:90seconds | Lever/90seconds | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 1 | 1 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 383 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 57 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 169 | 848 | 0 | 0 | 0 | 1755 |
| ashby:multiplymii | 153 | 0 | 864 | 0 | 0 | 8802 |
| breezy:20four7va | 153 | 0 | 1881 | 0 | 0 | 17979 |
| breezy:remote-craft | 153 | 0 | 864 | 0 | 0 | 2295 |
| breezy:sourcefit | 153 | 0 | 864 | 0 | 0 | 14278 |
| breezy:time-etc | 153 | 0 | 864 | 0 | 0 | 153 |
| breezy:value-virtual-assistants | 153 | 0 | 864 | 0 | 0 | 1683 |
| breezy:yokly | 153 | 0 | 864 | 0 | 46 | 577 |
| greenhouse:canonical | 153 | 0 | 864 | 0 | 0 | 47567 |
| greenhouse:ghost | 153 | 0 | 864 | 0 | 0 | 770 |
| greenhouse:gitlab | 153 | 0 | 864 | 0 | 0 | 35588 |
| greenhouse:grafanalabs | 153 | 0 | 864 | 0 | 0 | 20674 |
| greenhouse:nearform | 153 | 0 | 864 | 0 | 0 | 3382 |
| real-work-from-anywhere | 153 | 0 | 864 | 0 | 0 | 7650 |
| we-work-remotely | 153 | 860 | 0 | 4 | 0 | 14209 |
| workable:coconutva | 70 | 0 | 912 | 35 | 0 | 2249 |
| workable:crewbloom | 70 | 0 | 912 | 35 | 0 | 8394 |
| workable:hello-rache | 70 | 0 | 912 | 35 | 0 | 210 |
| workable:pearltalent | 70 | 0 | 912 | 35 | 0 | 20474 |
| workable:hunt-st | 66 | 0 | 912 | 39 | 0 | 9425 |
| workable:rocketams | 66 | 0 | 912 | 39 | 0 | 660 |
| remote-ok | 29 | 124 | 864 | 0 | 0 | 1241 |
| jobicy-supporting-apac | 26 | 95 | 865 | 31 | 0 | 1040 |
| jobicy-admin-support-apac | 4 | 117 | 865 | 31 | 0 | 20 |
| ashby:amplify | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 96 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 353 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 380 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 1017 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 19 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 1017 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 1017 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 1017 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 864 | 153 | 0 | 0 |
| jobspresso | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 96 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 67 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 891 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 19 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 968 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 413 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 785 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 1017 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 785 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 1017 | 0 | 0 | 0 |
| problogger | 0 | 0 | 1017 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 1017 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 1017 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 1017 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 1017 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 1017 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 1017 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 1017 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 1017 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 1017 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 129 | 10 | 26 | 27 | 165 | 78.2% |
| greenhouse:grafanalabs | 0 | 0 | 50 | 50 | 50 | 0.0% |
| workable:hunt-st | 41 | 1 | 1 | 1 | 43 | 95.3% |
| real-work-from-anywhere | 27 | 5 | 1 | 6 | 33 | 81.8% |
| greenhouse:gitlab | 0 | 0 | 30 | 30 | 30 | 0.0% |
| workable:crewbloom | 4 | 0 | 25 | 25 | 29 | 13.8% |
| breezy:sourcefit | 23 | 0 | 1 | 3 | 24 | 95.8% |
| lever:vacancies | 20 | 0 | 0 | 0 | 20 | 100.0% |
| workable:pearltalent | 5 | 0 | 15 | 15 | 20 | 25.0% |
| remote-ok | 11 | 4 | 3 | 7 | 18 | 61.1% |
| jobicy-supporting-apac | 10 | 0 | 7 | 7 | 17 | 58.8% |
| greenhouse:solarwinds | 16 | 0 | 0 | 0 | 16 | 100.0% |
| ashby:trust-wallet | 13 | 0 | 0 | 0 | 13 | 100.0% |
| breezy:20four7va | 11 | 0 | 0 | 0 | 11 | 100.0% |
| workable:coconutva | 10 | 0 | 0 | 0 | 10 | 100.0% |
| lever:levelup | 9 | 0 | 0 | 0 | 9 | 100.0% |
| greenhouse:canonical | 0 | 0 | 8 | 8 | 8 | 0.0% |
| lever:nibiru | 8 | 0 | 0 | 0 | 8 | 100.0% |
| ashby:railway | 6 | 0 | 0 | 0 | 6 | 100.0% |
| ashby:multiplymii | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:brevo | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:outsourcedstaff | 5 | 0 | 0 | 0 | 5 | 100.0% |
| breezy:yokly | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:jetsupport | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:willowinc | 4 | 0 | 0 | 0 | 4 | 100.0% |
| ashby:scalemath | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:whippy | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:gushwork | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:parcelvision | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:cubic3 | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:flipper | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| lever:audinate | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:trinityparktalent | 1 | 0 | 0 | 0 | 1 | 100.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:alltrails | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 169 | 1755 | 1 | 0.01 | 0.06 |
| ashby:multiplymii | 153 | 8802 | 5 | 0.03 | 0.06 |
| breezy:20four7va | 153 | 17979 | 11 | 0.07 | 0.06 |
| breezy:remote-craft | 153 | 2295 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 153 | 14278 | 23 | 0.15 | 0.16 |
| breezy:time-etc | 153 | 153 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 153 | 1683 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 153 | 577 | 4 | 0.03 | 0.69 |
| greenhouse:canonical | 153 | 47567 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 153 | 770 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 153 | 35588 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 153 | 20674 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 153 | 3382 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 153 | 7650 | 27 | 0.18 | 0.35 |
| we-work-remotely | 153 | 14209 | 129 | 0.84 | 0.91 |
| workable:coconutva | 70 | 2249 | 10 | 0.14 | 0.44 |
| workable:crewbloom | 70 | 8394 | 4 | 0.06 | 0.05 |
| workable:hello-rache | 70 | 210 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 70 | 20474 | 5 | 0.07 | 0.02 |
| workable:hunt-st | 66 | 9425 | 41 | 0.62 | 0.44 |
| workable:rocketams | 66 | 660 | 1 | 0.02 | 0.15 |
| remote-ok | 29 | 1241 | 11 | 0.38 | 0.89 |
| jobicy-supporting-apac | 26 | 1040 | 10 | 0.38 | 0.96 |
| jobicy-admin-support-apac | 4 | 20 | 1 | 0.25 | 5.00 |
| ashby:amplify | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:ashby | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:camunda | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:circulareconomysystems | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:cubic3 | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:flipper | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:foundry-for-good | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:getground | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:gradient | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:luxor | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:molecule | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:payscale | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:railway | 0 | 0 | 6 | UNKNOWN | UNKNOWN |
| ashby:supabase | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:the-studio | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:tremendous | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:trust-wallet | 0 | 0 | 13 | UNKNOWN | UNKNOWN |
| authentic-jobs | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:vaaphilippines-recruitment | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| dribbble | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:remotecom | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobspresso | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:applydigital | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:audinate | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| lever:beaverprocess | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brafton | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brevo | 0 | 0 | 5 | UNKNOWN | UNKNOWN |
| lever:decilegroup | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:deliverect | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:gushwork | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
| lever:lwolf | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:nibiru | 0 | 0 | 8 | UNKNOWN | UNKNOWN |
| lever:outsourcedstaff | 0 | 0 | 5 | UNKNOWN | UNKNOWN |
| lever:parcelvision | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
| lever:repurposeglobal | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:snappr | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:tenna | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:truezerotech | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:vacancies | 0 | 0 | 20 | UNKNOWN | UNKNOWN |
| lever:vaultoutsourcing | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:willowinc | 0 | 0 | 4 | UNKNOWN | UNKNOWN |
| onlinejobs-ph | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| problogger | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-co | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:connectos | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:global-strategic | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:myoutdesk | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:outsource-access | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pineapple-staffing | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:staff-domain-inc | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:superstaff | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:virtualstaff365 | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:solarwinds | UNKNOWN | UNKNOWN | 16 | UNKNOWN | UNKNOWN |
| lever:levelup | UNKNOWN | UNKNOWN | 9 | UNKNOWN | UNKNOWN |
| lever:jetsupport | UNKNOWN | UNKNOWN | 4 | UNKNOWN | UNKNOWN |
| ashby:scalemath | UNKNOWN | UNKNOWN | 3 | UNKNOWN | UNKNOWN |
| ashby:whippy | UNKNOWN | UNKNOWN | 3 | UNKNOWN | UNKNOWN |
| greenhouse:trinityparktalent | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
| lever:alltrails | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
