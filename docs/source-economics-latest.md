# Source economics — latest (SP-02)

- **As of:** 2026-11-21T10:06:16.574Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1751 | 353 | 50.43 | 993 | 33.10 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 9793 | 9793 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1751 | 353 | 513 | 993 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 49.4% ⚠️ >40%; top-3 73.8% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 34.1%; top-3 67.2%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 597 | 491 | 255 | we-work-remotely |
| breezy | 336 | 100 | 13 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:value-virtual-assistants, breezy:yokly, breezy:time-etc |
| workable | 244 | 133 | 37 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 156 | 109 | 25 | real-work-from-anywhere |
| greenhouse | 130 | 2 | 2 | greenhouse:canonical, greenhouse:gitlab, greenhouse:ghost, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:solarwinds, greenhouse:trainingthestreet, greenhouse:trinityparktalent |
| ashby | 105 | 48 | 1 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:finch, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| remote-ok | 75 | 48 | 15 | remote-ok |
| jobicy | 64 | 25 | 5 | jobicy-supporting-apac, jobicy-admin-support-apac |
| lever | 32 | 32 | 0 | lever:levelup, lever:nibiru, lever:brevo, lever:jetsupport, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:applydigital, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:lwolf, lever:outsourcedstaff, lever:parcelvision, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |
| remotive | 12 | 5 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 597 | 255 | 491 | 2212 |
| breezy:20four7va | 20Four7VA | 182 | 9 | 65 | 163 |
| workable:hunt-st | Hunt St | 170 | 28 | 87 | 160 |
| real-work-from-anywhere | RealWorkFromAnywhere | 156 | 25 | 109 | 672 |
| greenhouse:canonical | Canonical | 122 | 1 | 1 | 204 |
| breezy:sourcefit | Breezy/sourcefit | 121 | 2 | 31 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 75 | 1 | 18 | 25 |
| remote-ok | RemoteOK | 75 | 15 | 48 | 1350 |
| jobicy-supporting-apac | Jobicy | 57 | 5 | 23 | 169 |
| workable:crewbloom | CrewBloom | 31 | 2 | 23 | 78 |
| workable:coconutva | Coconut VA | 27 | 5 | 14 | 59 |
| workable:pearltalent | Pearl Talent | 15 | 2 | 9 | 74 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| remotive | Remotive | 12 | 0 | 5 | 103 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| breezy:yokly | Yokly | 9 | 2 | 4 | 10 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| greenhouse:gitlab | GitLab | 7 | 1 | 1 | 699 |
| jobicy-admin-support-apac | Jobicy | 7 | 0 | 2 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| lever:brevo | Lever/brevo | 5 | 0 | 5 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 0 | 4 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 0 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:finch | Ashby/finch | 0 | 0 | 0 | 1 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 0 | 0 | 0 | 27 |
| ashby:getground | Ashby/getground | 0 | 0 | 0 | 2 |
| ashby:gradient | Ashby/gradient | 0 | 0 | 0 | 5 |
| ashby:homera-health | Ashby/homera-health | 0 | 0 | 0 | 1 |
| ashby:luxor | Ashby/luxor | 0 | 0 | 0 | 2 |
| ashby:molecule | Ashby/molecule | 0 | 0 | 0 | 3 |
| ashby:payscale | Ashby/payscale | 0 | 0 | 0 | 4 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 468 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 64 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 0 | 0 | 0 | 16 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 0 | 0 | 0 | 1 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 0 | 0 | 0 | 1 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| lever:90seconds | Lever/90seconds | 0 | 0 | 0 | 1 |
| lever:applydigital | Lever/applydigital | 0 | 0 | 0 | 6 |
| lever:beaverprocess | Lever/beaverprocess | 0 | 0 | 0 | 2 |
| lever:brafton | Lever/brafton | 0 | 0 | 0 | 5 |
| lever:decilegroup | Lever/decilegroup | 0 | 0 | 0 | 5 |
| lever:deliverect | Lever/deliverect | 0 | 0 | 0 | 9 |
| lever:gushwork | Lever/gushwork | 0 | 0 | 0 | 3 |
| lever:hso | Lever/hso | 0 | 0 | 0 | 1 |
| lever:lwolf | Lever/lwolf | 0 | 0 | 0 | 4 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 0 | 0 | 0 | 5 |
| lever:parcelvision | Lever/parcelvision | 0 | 0 | 0 | 3 |
| lever:repurposeglobal | Lever/repurposeglobal | 0 | 0 | 0 | 3 |
| lever:snappr | Lever/snappr | 0 | 0 | 0 | 13 |
| lever:tenna | Lever/tenna | 0 | 0 | 0 | 11 |
| lever:truezerotech | Lever/truezerotech | 0 | 0 | 0 | 17 |
| lever:trustarc | Lever/trustarc | 0 | 0 | 0 | 1 |
| lever:vacancies | Lever/vacancies | 0 | 0 | 0 | 20 |
| lever:willowinc | Lever/willowinc | 0 | 0 | 0 | 4 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 224 | 692 | 0 | 17 | 0 | 21850 |
| remotive | 162 | 771 | 0 | 0 | 0 | 2651 |
| real-work-from-anywhere | 147 | 0 | 786 | 0 | 0 | 7350 |
| breezy:20four7va | 145 | 0 | 1721 | 0 | 0 | 17436 |
| breezy:remote-craft | 145 | 0 | 788 | 0 | 0 | 2175 |
| breezy:sourcefit | 145 | 0 | 788 | 0 | 0 | 14899 |
| breezy:time-etc | 145 | 0 | 788 | 0 | 0 | 145 |
| breezy:value-virtual-assistants | 145 | 0 | 788 | 0 | 0 | 1450 |
| breezy:yokly | 145 | 0 | 788 | 0 | 0 | 666 |
| greenhouse:canonical | 145 | 0 | 788 | 0 | 0 | 45897 |
| greenhouse:ghost | 145 | 0 | 788 | 0 | 0 | 725 |
| greenhouse:gitlab | 145 | 0 | 788 | 0 | 0 | 36332 |
| greenhouse:grafanalabs | 145 | 0 | 788 | 0 | 0 | 19973 |
| greenhouse:nearform | 145 | 0 | 788 | 0 | 0 | 3558 |
| greenhouse:remotecom | 145 | 0 | 788 | 0 | 145 | 0 |
| ashby:multiplymii | 144 | 0 | 788 | 1 | 0 | 6674 |
| workable:pearltalent | 83 | 0 | 791 | 59 | 0 | 24310 |
| workable:hello-rache | 82 | 0 | 791 | 60 | 0 | 246 |
| workable:coconutva | 77 | 0 | 790 | 66 | 0 | 2478 |
| workable:crewbloom | 77 | 0 | 790 | 66 | 0 | 6621 |
| workable:hunt-st | 73 | 0 | 791 | 69 | 0 | 9070 |
| workable:rocketams | 73 | 0 | 791 | 69 | 0 | 598 |
| remote-ok | 56 | 91 | 786 | 0 | 0 | 2463 |
| jobicy-supporting-apac | 33 | 107 | 788 | 5 | 0 | 1320 |
| jobicy-admin-support-apac | 6 | 137 | 789 | 1 | 0 | 26 |
| ashby:amplify | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 933 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 933 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 933 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 933 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 933 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 933 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 933 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 933 | 0 | 0 | 0 |
| problogger | 0 | 0 | 933 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 933 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 933 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 933 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 933 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 933 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 933 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 933 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 933 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 933 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 255 | 2 | 174 | 176 | 431 | 59.2% |
| remote-ok | 15 | 3 | 80 | 83 | 98 | 15.3% |
| greenhouse:gitlab | 1 | 0 | 39 | 39 | 40 | 2.5% |
| real-work-from-anywhere | 26 | 3 | 1 | 4 | 30 | 86.7% |
| workable:hunt-st | 28 | 0 | 1 | 1 | 29 | 96.6% |
| greenhouse:grafanalabs | 0 | 0 | 21 | 21 | 21 | 0.0% |
| workable:pearltalent | 2 | 0 | 10 | 10 | 12 | 16.7% |
| breezy:20four7va | 9 | 0 | 0 | 0 | 9 | 100.0% |
| jobicy-supporting-apac | 5 | 0 | 4 | 4 | 9 | 55.6% |
| workable:coconutva | 5 | 0 | 0 | 0 | 5 | 100.0% |
| breezy:sourcefit | 2 | 0 | 2 | 2 | 4 | 50.0% |
| greenhouse:canonical | 1 | 0 | 3 | 3 | 4 | 25.0% |
| breezy:yokly | 2 | 0 | 0 | 0 | 2 | 100.0% |
| workable:crewbloom | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:multiplymii | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 224 | 21850 | 255 | 1.14 | 1.17 |
| remotive | 162 | 2651 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 147 | 7350 | 26 | 0.18 | 0.35 |
| breezy:20four7va | 145 | 17436 | 9 | 0.06 | 0.05 |
| breezy:remote-craft | 145 | 2175 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 145 | 14899 | 2 | 0.01 | 0.01 |
| breezy:time-etc | 145 | 145 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 145 | 1450 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 145 | 666 | 2 | 0.01 | 0.30 |
| greenhouse:canonical | 145 | 45897 | 1 | 0.01 | 0.00 |
| greenhouse:ghost | 145 | 725 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 145 | 36332 | 1 | 0.01 | 0.00 |
| greenhouse:grafanalabs | 145 | 19973 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 145 | 3558 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:remotecom | 145 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:multiplymii | 144 | 6674 | 1 | 0.01 | 0.01 |
| workable:pearltalent | 83 | 24310 | 2 | 0.02 | 0.01 |
| workable:hello-rache | 82 | 246 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 77 | 2478 | 5 | 0.06 | 0.20 |
| workable:crewbloom | 77 | 6621 | 2 | 0.03 | 0.03 |
| workable:hunt-st | 73 | 9070 | 28 | 0.38 | 0.31 |
| workable:rocketams | 73 | 598 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 56 | 2463 | 15 | 0.27 | 0.61 |
| jobicy-supporting-apac | 33 | 1320 | 5 | 0.15 | 0.38 |
| jobicy-admin-support-apac | 6 | 26 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:amplify | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:ashby | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:camunda | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:circulareconomysystems | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:cubic3 | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:flipper | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:foundry-for-good | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:getground | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:gradient | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:luxor | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:molecule | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:payscale | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:railway | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:scalemath | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:supabase | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:the-studio | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:tremendous | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:trust-wallet | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:whippy | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| authentic-jobs | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:vaaphilippines-recruitment | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| dribbble | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobspresso | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:applydigital | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:audinate | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:beaverprocess | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brafton | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brevo | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:decilegroup | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:deliverect | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:gushwork | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:jetsupport | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:lwolf | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:nibiru | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:outsourcedstaff | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:parcelvision | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:piccollage | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:repurposeglobal | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:snappr | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:tenna | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:truezerotech | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:vacancies | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:vaultoutsourcing | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:willowinc | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
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
