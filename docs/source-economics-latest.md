# Source economics — latest (SP-02)

- **As of:** 2026-11-19T10:41:32.300Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1636 | 174 | 24.86 | 916 | 30.53 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 9380 | 9380 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1636 | 174 | 348 | 916 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 38.4%; top-3 68.9%.
- **Active:** top family `we-work-remotely` 27.9%; top-3 63.9%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 456 | 352 | 93 | we-work-remotely |
| breezy | 336 | 112 | 10 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:value-virtual-assistants, breezy:yokly, breezy:time-etc |
| workable | 253 | 166 | 31 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 160 | 113 | 26 | real-work-from-anywhere |
| greenhouse | 147 | 19 | 2 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| ashby | 110 | 51 | 5 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:finch, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| jobicy | 65 | 27 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 62 | 36 | 3 | remote-ok |
| lever | 35 | 35 | 0 | lever:levelup, lever:nibiru, lever:brevo, lever:jetsupport, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:applydigital, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:lwolf, lever:outsourcedstaff, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |
| remotive | 12 | 5 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 456 | 93 | 352 | 2105 |
| workable:hunt-st | Hunt St | 182 | 24 | 111 | 144 |
| breezy:20four7va | 20Four7VA | 180 | 7 | 61 | 158 |
| real-work-from-anywhere | RealWorkFromAnywhere | 160 | 26 | 113 | 656 |
| breezy:sourcefit | Breezy/sourcefit | 126 | 3 | 46 | 191 |
| greenhouse:canonical | Canonical | 122 | 1 | 1 | 203 |
| ashby:multiplymii | Ashby/multiplymii | 80 | 5 | 21 | 20 |
| remote-ok | RemoteOK | 62 | 3 | 36 | 1268 |
| jobicy-supporting-apac | Jobicy | 58 | 4 | 25 | 164 |
| workable:crewbloom | CrewBloom | 31 | 4 | 22 | 77 |
| workable:coconutva | Coconut VA | 25 | 1 | 20 | 57 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| workable:pearltalent | Pearl Talent | 14 | 2 | 13 | 72 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| remotive | Remotive | 12 | 0 | 5 | 102 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| greenhouse:gitlab | GitLab | 7 | 1 | 1 | 686 |
| jobicy-admin-support-apac | Jobicy | 7 | 0 | 2 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| breezy:yokly | Yokly | 6 | 0 | 5 | 11 |
| lever:brevo | Lever/brevo | 5 | 0 | 5 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 0 | 4 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 0 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 0 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 453 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 64 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 0 | 0 | 0 | 1 |
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
| we-work-remotely | 166 | 764 | 0 | 17 | 0 | 16386 |
| remotive | 165 | 782 | 0 | 0 | 0 | 2718 |
| real-work-from-anywhere | 148 | 0 | 799 | 0 | 0 | 7400 |
| breezy:20four7va | 146 | 0 | 1748 | 0 | 0 | 17632 |
| breezy:remote-craft | 146 | 0 | 801 | 0 | 0 | 2190 |
| breezy:sourcefit | 146 | 0 | 801 | 0 | 0 | 15124 |
| breezy:time-etc | 146 | 0 | 801 | 0 | 0 | 146 |
| breezy:value-virtual-assistants | 146 | 0 | 801 | 0 | 0 | 1460 |
| breezy:yokly | 146 | 0 | 801 | 0 | 0 | 597 |
| greenhouse:canonical | 146 | 0 | 801 | 0 | 0 | 46158 |
| greenhouse:ghost | 146 | 0 | 801 | 0 | 0 | 730 |
| greenhouse:gitlab | 146 | 0 | 801 | 0 | 0 | 36867 |
| greenhouse:grafanalabs | 146 | 0 | 801 | 0 | 0 | 20569 |
| greenhouse:nearform | 146 | 0 | 801 | 0 | 0 | 3743 |
| greenhouse:remotecom | 146 | 0 | 801 | 0 | 146 | 0 |
| ashby:multiplymii | 145 | 0 | 801 | 1 | 0 | 6912 |
| workable:hello-rache | 91 | 0 | 803 | 53 | 0 | 273 |
| workable:pearltalent | 91 | 0 | 803 | 53 | 0 | 26208 |
| workable:coconutva | 88 | 0 | 804 | 55 | 0 | 2839 |
| workable:crewbloom | 88 | 0 | 804 | 55 | 0 | 7606 |
| workable:hunt-st | 87 | 0 | 804 | 56 | 0 | 10793 |
| workable:rocketams | 87 | 0 | 804 | 56 | 0 | 736 |
| jobicy-supporting-apac | 30 | 113 | 801 | 3 | 0 | 1200 |
| remote-ok | 26 | 122 | 799 | 0 | 0 | 1110 |
| jobicy-admin-support-apac | 5 | 140 | 802 | 0 | 0 | 21 |
| ashby:amplify | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 947 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 947 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 947 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 947 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 947 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 947 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 947 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 947 | 0 | 0 | 0 |
| problogger | 0 | 0 | 947 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 947 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 947 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 947 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 947 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 947 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 947 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 947 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 947 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 947 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 93 | 2 | 145 | 147 | 240 | 38.8% |
| greenhouse:gitlab | 1 | 0 | 33 | 33 | 34 | 2.9% |
| real-work-from-anywhere | 26 | 5 | 3 | 8 | 34 | 76.5% |
| workable:hunt-st | 24 | 1 | 1 | 1 | 26 | 92.3% |
| greenhouse:grafanalabs | 0 | 0 | 20 | 20 | 20 | 0.0% |
| workable:pearltalent | 2 | 0 | 9 | 9 | 11 | 18.2% |
| breezy:20four7va | 7 | 0 | 1 | 1 | 8 | 87.5% |
| jobicy-supporting-apac | 4 | 0 | 4 | 4 | 8 | 50.0% |
| remote-ok | 3 | 1 | 4 | 5 | 8 | 37.5% |
| workable:crewbloom | 4 | 0 | 3 | 3 | 7 | 57.1% |
| ashby:multiplymii | 5 | 0 | 0 | 0 | 5 | 100.0% |
| breezy:sourcefit | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:canonical | 1 | 0 | 2 | 2 | 3 | 33.3% |
| greenhouse:nearform | 0 | 0 | 1 | 1 | 1 | 0.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |
| workable:coconutva | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 166 | 16386 | 93 | 0.56 | 0.57 |
| remotive | 165 | 2718 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 148 | 7400 | 26 | 0.18 | 0.35 |
| breezy:20four7va | 146 | 17632 | 7 | 0.05 | 0.04 |
| breezy:remote-craft | 146 | 2190 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 146 | 15124 | 3 | 0.02 | 0.02 |
| breezy:time-etc | 146 | 146 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 146 | 1460 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 146 | 597 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 146 | 46158 | 1 | 0.01 | 0.00 |
| greenhouse:ghost | 146 | 730 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 146 | 36867 | 1 | 0.01 | 0.00 |
| greenhouse:grafanalabs | 146 | 20569 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 146 | 3743 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 146 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:multiplymii | 145 | 6912 | 5 | 0.03 | 0.07 |
| workable:hello-rache | 91 | 273 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 91 | 26208 | 2 | 0.02 | 0.01 |
| workable:coconutva | 88 | 2839 | 1 | 0.01 | 0.04 |
| workable:crewbloom | 88 | 7606 | 4 | 0.05 | 0.05 |
| workable:hunt-st | 87 | 10793 | 24 | 0.28 | 0.22 |
| workable:rocketams | 87 | 736 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobicy-supporting-apac | 30 | 1200 | 4 | 0.13 | 0.33 |
| remote-ok | 26 | 1110 | 3 | 0.12 | 0.27 |
| jobicy-admin-support-apac | 5 | 21 | UNKNOWN | UNKNOWN | UNKNOWN |
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
