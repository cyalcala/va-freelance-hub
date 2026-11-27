# Source economics — latest (SP-02)

- **As of:** 2026-11-27T11:18:07.984Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 2071 | 662 | 94.57 | 1314 | 43.80 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 10774 | 10774 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 2071 | 662 | 933 | 1314 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 66.6% ⚠️ >40%; top-3 84.6% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 47.1% ⚠️ >40%; top-3 75.9% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 975 | 875 | 553 | we-work-remotely |
| breezy | 353 | 101 | 27 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 243 | 128 | 31 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 150 | 109 | 23 | real-work-from-anywhere |
| greenhouse | 131 | 3 | 1 | greenhouse:canonical, greenhouse:gitlab, greenhouse:ghost, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:solarwinds, greenhouse:trainingthestreet, greenhouse:trinityparktalent |
| remote-ok | 74 | 51 | 20 | remote-ok |
| ashby | 72 | 19 | 2 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:cubic3, ashby:finch, ashby:flipper, ashby:flutterflow, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:railway, ashby:scalemath, ashby:supabase, ashby:the-studio, ashby:tremendous, ashby:trust-wallet, ashby:whippy |
| jobicy | 61 | 25 | 5 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 12 | 3 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |
| lever | 0 | 0 | 0 | lever:90seconds, lever:alltrails, lever:applydigital, lever:audinate, lever:beaverprocess, lever:brafton, lever:brevo, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:jetsupport, lever:levelup, lever:lwolf, lever:nibiru, lever:outsourcedstaff, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 975 | 553 | 875 | 2543 |
| breezy:20four7va | 20Four7VA | 189 | 12 | 63 | 167 |
| workable:hunt-st | Hunt St | 167 | 20 | 82 | 181 |
| real-work-from-anywhere | RealWorkFromAnywhere | 150 | 23 | 109 | 699 |
| breezy:sourcefit | Breezy/sourcefit | 130 | 12 | 33 | 207 |
| greenhouse:canonical | Canonical | 123 | 1 | 2 | 205 |
| remote-ok | RemoteOK | 74 | 20 | 51 | 1500 |
| ashby:multiplymii | Ashby/multiplymii | 72 | 2 | 19 | 30 |
| jobicy-supporting-apac | Jobicy | 54 | 4 | 22 | 185 |
| workable:crewbloom | CrewBloom | 30 | 5 | 20 | 85 |
| workable:coconutva | Coconut VA | 27 | 1 | 14 | 59 |
| workable:pearltalent | Pearl Talent | 18 | 5 | 12 | 81 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| remotive | Remotive | 12 | 0 | 3 | 106 |
| breezy:yokly | Yokly | 11 | 3 | 5 | 10 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 0 | 2 |
| greenhouse:gitlab | GitLab | 7 | 0 | 1 | 713 |
| jobicy-admin-support-apac | Jobicy | 7 | 1 | 3 | 10 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| workable:rocketams | RocketAMS | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:cubic3 | Ashby/cubic3 | 0 | 0 | 0 | 2 |
| ashby:finch | Ashby/finch | 0 | 0 | 0 | 1 |
| ashby:flipper | Ashby/flipper | 0 | 0 | 0 | 2 |
| ashby:flutterflow | Ashby/flutterflow | 0 | 0 | 0 | 1 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 0 | 0 | 0 | 27 |
| ashby:getground | Ashby/getground | 0 | 0 | 0 | 2 |
| ashby:gradient | Ashby/gradient | 0 | 0 | 0 | 5 |
| ashby:homera-health | Ashby/homera-health | 0 | 0 | 0 | 1 |
| ashby:luxor | Ashby/luxor | 0 | 0 | 0 | 2 |
| ashby:molecule | Ashby/molecule | 0 | 0 | 0 | 3 |
| ashby:payscale | Ashby/payscale | 0 | 0 | 0 | 4 |
| ashby:railway | Ashby/railway | 0 | 0 | 0 | 6 |
| ashby:scalemath | Ashby/scalemath | 0 | 0 | 0 | 3 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| ashby:trust-wallet | Ashby/trust-wallet | 0 | 0 | 0 | 13 |
| ashby:whippy | Ashby/whippy | 0 | 0 | 0 | 3 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 469 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 66 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 0 | 0 | 0 | 16 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 0 | 0 | 0 | 1 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 0 | 0 | 0 | 1 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| lever:90seconds | Lever/90seconds | 0 | 0 | 0 | 1 |
| lever:alltrails | Lever/alltrails | 0 | 0 | 0 | 1 |
| lever:applydigital | Lever/applydigital | 0 | 0 | 0 | 6 |
| lever:audinate | Lever/audinate | 0 | 0 | 0 | 2 |
| lever:beaverprocess | Lever/beaverprocess | 0 | 0 | 0 | 2 |
| lever:brafton | Lever/brafton | 0 | 0 | 0 | 5 |
| lever:brevo | Lever/brevo | 0 | 0 | 0 | 5 |
| lever:decilegroup | Lever/decilegroup | 0 | 0 | 0 | 5 |
| lever:deliverect | Lever/deliverect | 0 | 0 | 0 | 9 |
| lever:gushwork | Lever/gushwork | 0 | 0 | 0 | 3 |
| lever:hso | Lever/hso | 0 | 0 | 0 | 1 |
| lever:jetsupport | Lever/jetsupport | 0 | 0 | 0 | 4 |
| lever:levelup | Lever/levelup | 0 | 0 | 0 | 9 |
| lever:lwolf | Lever/lwolf | 0 | 0 | 0 | 4 |
| lever:nibiru | Lever/nibiru | 0 | 0 | 0 | 8 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 0 | 0 | 0 | 5 |
| lever:parcelvision | Lever/parcelvision | 0 | 0 | 0 | 3 |
| lever:piccollage | Lever/piccollage | 0 | 0 | 0 | 3 |
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
| we-work-remotely | 279 | 517 | 0 | 24 | 0 | 27803 |
| remotive | 141 | 679 | 0 | 0 | 0 | 2258 |
| ashby:multiplymii | 128 | 0 | 692 | 0 | 0 | 5309 |
| breezy:20four7va | 128 | 0 | 1512 | 0 | 0 | 15393 |
| breezy:remote-craft | 128 | 0 | 692 | 0 | 0 | 1920 |
| breezy:sourcefit | 128 | 0 | 692 | 0 | 0 | 12947 |
| breezy:time-etc | 128 | 0 | 692 | 0 | 0 | 128 |
| breezy:value-virtual-assistants | 128 | 0 | 692 | 0 | 0 | 1280 |
| breezy:yokly | 128 | 0 | 692 | 0 | 0 | 805 |
| greenhouse:canonical | 128 | 0 | 692 | 0 | 0 | 40688 |
| greenhouse:ghost | 128 | 0 | 692 | 0 | 0 | 640 |
| greenhouse:gitlab | 128 | 0 | 692 | 0 | 0 | 31532 |
| greenhouse:grafanalabs | 128 | 0 | 692 | 0 | 0 | 17728 |
| greenhouse:nearform | 128 | 0 | 692 | 0 | 0 | 2942 |
| greenhouse:remotecom | 128 | 0 | 692 | 0 | 128 | 0 |
| real-work-from-anywhere | 128 | 0 | 692 | 0 | 0 | 6400 |
| workable:coconutva | 89 | 0 | 695 | 36 | 0 | 2871 |
| workable:crewbloom | 89 | 0 | 695 | 36 | 0 | 7439 |
| workable:hello-rache | 86 | 0 | 695 | 39 | 0 | 258 |
| workable:hunt-st | 86 | 0 | 695 | 39 | 0 | 9805 |
| workable:pearltalent | 86 | 0 | 695 | 39 | 0 | 27986 |
| workable:rocketams | 86 | 0 | 695 | 39 | 0 | 642 |
| remote-ok | 81 | 46 | 692 | 1 | 0 | 3592 |
| jobicy-supporting-apac | 21 | 102 | 695 | 2 | 0 | 840 |
| jobicy-admin-support-apac | 3 | 121 | 694 | 2 | 0 | 16 |
| ashby:amplify | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 820 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 820 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 820 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 820 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 820 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 820 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 820 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 820 | 0 | 0 | 0 |
| problogger | 0 | 0 | 820 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 820 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 820 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 820 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 820 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 820 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 820 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 820 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 820 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 820 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 553 | 0 | 270 | 270 | 823 | 67.2% |
| remote-ok | 20 | 3 | 211 | 214 | 234 | 8.5% |
| real-work-from-anywhere | 23 | 2 | 0 | 2 | 25 | 92.0% |
| greenhouse:gitlab | 0 | 1 | 19 | 20 | 20 | 0.0% |
| workable:hunt-st | 20 | 0 | 0 | 0 | 20 | 100.0% |
| breezy:sourcefit | 12 | 0 | 5 | 5 | 17 | 70.6% |
| jobicy-supporting-apac | 4 | 0 | 10 | 10 | 14 | 28.6% |
| breezy:20four7va | 12 | 0 | 1 | 1 | 13 | 92.3% |
| workable:pearltalent | 5 | 0 | 8 | 8 | 13 | 38.5% |
| greenhouse:grafanalabs | 0 | 0 | 10 | 10 | 10 | 0.0% |
| workable:crewbloom | 5 | 0 | 2 | 2 | 7 | 71.4% |
| breezy:yokly | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:canonical | 1 | 0 | 2 | 2 | 3 | 33.3% |
| remotive | 0 | 0 | 3 | 3 | 3 | 0.0% |
| ashby:multiplymii | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:coconutva | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 279 | 27803 | 553 | 1.98 | 1.99 |
| remotive | 141 | 2258 | 0 | 0.00 | 0.00 |
| ashby:multiplymii | 128 | 5309 | 2 | 0.02 | 0.04 |
| breezy:20four7va | 128 | 15393 | 12 | 0.09 | 0.08 |
| breezy:remote-craft | 128 | 1920 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 128 | 12947 | 12 | 0.09 | 0.09 |
| breezy:time-etc | 128 | 128 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 128 | 1280 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 128 | 805 | 3 | 0.02 | 0.37 |
| greenhouse:canonical | 128 | 40688 | 1 | 0.01 | 0.00 |
| greenhouse:ghost | 128 | 640 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 128 | 31532 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 128 | 17728 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 128 | 2942 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 128 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 128 | 6400 | 23 | 0.18 | 0.36 |
| workable:coconutva | 89 | 2871 | 1 | 0.01 | 0.03 |
| workable:crewbloom | 89 | 7439 | 5 | 0.06 | 0.07 |
| workable:hello-rache | 86 | 258 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 86 | 9805 | 20 | 0.23 | 0.20 |
| workable:pearltalent | 86 | 27986 | 5 | 0.06 | 0.02 |
| workable:rocketams | 86 | 642 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 81 | 3592 | 20 | 0.25 | 0.56 |
| jobicy-supporting-apac | 21 | 840 | 4 | 0.19 | 0.48 |
| jobicy-admin-support-apac | 3 | 16 | 1 | 0.33 | 6.25 |
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
