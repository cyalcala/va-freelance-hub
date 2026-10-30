# Source economics — latest (SP-02)

- **As of:** 2026-10-30T08:53:46.455Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1853 | 258 | 36.86 | 1218 | 40.60 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8322 | 8322 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1853 | 258 | 606 | 1218 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 40.1% ⚠️ >40%; top-3 65.2%.
- **Active:** top family `we-work-remotely` 31.3%; top-3 59.5%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 580 | 489 | 101 | we-work-remotely |
| breezy | 333 | 114 | 26 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 189 | 160 | 37 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| greenhouse | 162 | 27 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 160 | 110 | 25 | ashby:multiplymii, ashby:foundry-for-good, ashby:trust-wallet, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:scalemath, ashby:the-studio, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| real-work-from-anywhere | 149 | 110 | 25 | real-work-from-anywhere |
| lever | 145 | 145 | 32 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:levelup, lever:nibiru, lever:applydigital, lever:brafton, lever:brevo, lever:decilegroup, lever:outsourcedstaff, lever:jetsupport, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:audinate, lever:beaverprocess, lever:90seconds, lever:alltrails, lever:hso, lever:trustarc |
| jobicy | 61 | 20 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 59 | 37 | 7 | remote-ok |
| remotive | 15 | 6 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 580 | 101 | 489 | 1480 |
| breezy:20four7va | 20Four7VA | 165 | 17 | 55 | 133 |
| real-work-from-anywhere | RealWorkFromAnywhere | 149 | 25 | 110 | 571 |
| workable:hunt-st | Hunt St | 142 | 28 | 120 | 129 |
| breezy:sourcefit | Breezy/sourcefit | 129 | 8 | 53 | 158 |
| greenhouse:canonical | Canonical | 123 | 0 | 2 | 197 |
| ashby:multiplymii | Ashby/multiplymii | 79 | 3 | 29 | 6 |
| remote-ok | RemoteOK | 59 | 7 | 37 | 1220 |
| jobicy-supporting-apac | Jobicy | 56 | 3 | 18 | 124 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| workable:crewbloom | CrewBloom | 20 | 7 | 18 | 68 |
| workable:coconutva | Coconut VA | 18 | 0 | 14 | 54 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| breezy:yokly | Yokly | 15 | 1 | 5 | 1 |
| remotive | Remotive | 15 | 2 | 6 | 93 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 13 | 13 | 0 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| greenhouse:remotecom | Remote.com | 12 | 0 | 0 | 610 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| lever:levelup | Lever/levelup | 9 | 9 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 8 | 8 | 0 |
| workable:pearltalent | Pearl Talent | 8 | 2 | 7 | 59 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 5 | 595 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 2 | 9 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:brevo | Lever/brevo | 5 | 5 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 0 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 4 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 0 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 3 | 3 | 0 |
| ashby:the-studio | Ashby/the-studio | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 3 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 0 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 3 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 2 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 0 | 2 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 2 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 1 | 1 | 0 |
| ashby:homera-health | Ashby/homera-health | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 1 | 0 | 1 | 0 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
| lever:90seconds | Lever/90seconds | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 1 | 1 | 0 |
| lever:hso | Lever/hso | 1 | 0 | 1 | 0 |
| lever:trustarc | Lever/trustarc | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 1 | 9 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 388 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 57 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 205 | 797 | 0 | 4 | 0 | 19573 |
| remotive | 170 | 836 | 0 | 0 | 0 | 1876 |
| ashby:multiplymii | 153 | 0 | 853 | 0 | 0 | 8164 |
| breezy:20four7va | 153 | 0 | 1859 | 0 | 0 | 18593 |
| breezy:remote-craft | 153 | 0 | 853 | 0 | 0 | 2295 |
| breezy:sourcefit | 153 | 0 | 853 | 0 | 0 | 15618 |
| breezy:time-etc | 153 | 0 | 853 | 0 | 0 | 153 |
| breezy:value-virtual-assistants | 153 | 0 | 853 | 0 | 0 | 1600 |
| breezy:yokly | 153 | 0 | 853 | 0 | 0 | 593 |
| greenhouse:ghost | 153 | 0 | 853 | 0 | 0 | 646 |
| greenhouse:gitlab | 153 | 0 | 853 | 0 | 0 | 36225 |
| greenhouse:grafanalabs | 153 | 0 | 853 | 0 | 0 | 21004 |
| greenhouse:nearform | 153 | 0 | 853 | 0 | 0 | 3601 |
| real-work-from-anywhere | 153 | 0 | 853 | 0 | 0 | 7650 |
| greenhouse:canonical | 152 | 0 | 853 | 1 | 0 | 47714 |
| workable:hello-rache | 113 | 0 | 855 | 38 | 0 | 339 |
| workable:hunt-st | 113 | 0 | 854 | 39 | 0 | 15973 |
| workable:pearltalent | 113 | 0 | 855 | 38 | 0 | 33906 |
| workable:rocketams | 113 | 0 | 854 | 39 | 0 | 1130 |
| workable:coconutva | 110 | 0 | 855 | 41 | 0 | 3480 |
| workable:crewbloom | 110 | 0 | 855 | 41 | 0 | 10351 |
| jobicy-supporting-apac | 26 | 92 | 854 | 34 | 0 | 1040 |
| greenhouse:remotecom | 25 | 0 | 853 | 128 | 25 | 0 |
| remote-ok | 23 | 130 | 853 | 0 | 0 | 988 |
| jobicy-admin-support-apac | 5 | 114 | 855 | 32 | 0 | 22 |
| ashby:amplify | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 817 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 699 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 1006 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 740 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 699 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 1006 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 1006 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 1006 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 817 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 788 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 699 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 740 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 540 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 1006 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 1006 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 1006 | 0 | 0 | 0 |
| problogger | 0 | 0 | 1006 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 1006 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 1006 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 1006 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 1006 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 1006 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 1006 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 1006 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 1006 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 1006 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 101 | 0 | 27 | 27 | 128 | 78.9% |
| real-work-from-anywhere | 25 | 2 | 2 | 4 | 29 | 86.2% |
| greenhouse:gitlab | 0 | 0 | 28 | 28 | 28 | 0.0% |
| workable:hunt-st | 28 | 0 | 0 | 0 | 28 | 100.0% |
| jobicy-supporting-apac | 3 | 0 | 18 | 18 | 21 | 14.3% |
| greenhouse:grafanalabs | 0 | 0 | 18 | 18 | 18 | 0.0% |
| breezy:20four7va | 17 | 0 | 0 | 0 | 17 | 100.0% |
| ashby:trust-wallet | 13 | 0 | 0 | 0 | 13 | 100.0% |
| remote-ok | 7 | 2 | 3 | 5 | 12 | 58.3% |
| breezy:sourcefit | 8 | 0 | 3 | 3 | 11 | 72.7% |
| workable:crewbloom | 8 | 0 | 2 | 2 | 10 | 80.0% |
| lever:levelup | 9 | 0 | 0 | 0 | 9 | 100.0% |
| lever:nibiru | 8 | 0 | 0 | 0 | 8 | 100.0% |
| lever:brevo | 5 | 0 | 0 | 0 | 5 | 100.0% |
| greenhouse:canonical | 0 | 0 | 4 | 4 | 4 | 0.0% |
| lever:jetsupport | 4 | 0 | 0 | 0 | 4 | 100.0% |
| ashby:multiplymii | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:scalemath | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:whippy | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:piccollage | 3 | 0 | 0 | 0 | 3 | 100.0% |
| remotive | 2 | 0 | 1 | 1 | 3 | 66.7% |
| workable:pearltalent | 2 | 0 | 1 | 1 | 3 | 66.7% |
| ashby:cubic3 | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| lever:audinate | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:flutterflow | 1 | 0 | 0 | 0 | 1 | 100.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:ghost | 0 | 0 | 1 | 1 | 1 | 0.0% |
| lever:alltrails | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 205 | 19573 | 101 | 0.49 | 0.52 |
| remotive | 170 | 1876 | 2 | 0.01 | 0.11 |
| ashby:multiplymii | 153 | 8164 | 3 | 0.02 | 0.04 |
| breezy:20four7va | 153 | 18593 | 17 | 0.11 | 0.09 |
| breezy:remote-craft | 153 | 2295 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 153 | 15618 | 8 | 0.05 | 0.05 |
| breezy:time-etc | 153 | 153 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 153 | 1600 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 153 | 593 | 1 | 0.01 | 0.17 |
| greenhouse:ghost | 153 | 646 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 153 | 36225 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 153 | 21004 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 153 | 3601 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 153 | 7650 | 25 | 0.16 | 0.33 |
| greenhouse:canonical | 152 | 47714 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 113 | 339 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 113 | 15973 | 28 | 0.25 | 0.18 |
| workable:pearltalent | 113 | 33906 | 2 | 0.02 | 0.01 |
| workable:rocketams | 113 | 1130 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 110 | 3480 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:crewbloom | 110 | 10351 | 8 | 0.07 | 0.08 |
| jobicy-supporting-apac | 26 | 1040 | 3 | 0.12 | 0.29 |
| greenhouse:remotecom | 25 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 23 | 988 | 7 | 0.30 | 0.71 |
| jobicy-admin-support-apac | 5 | 22 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:amplify | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:ashby | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:camunda | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:circulareconomysystems | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:cubic3 | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:flipper | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:foundry-for-good | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:getground | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:gradient | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:luxor | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:molecule | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:payscale | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:railway | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:scalemath | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
| ashby:supabase | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:the-studio | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:tremendous | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:trust-wallet | 0 | 0 | 13 | UNKNOWN | UNKNOWN |
| ashby:whippy | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
| authentic-jobs | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:vaaphilippines-recruitment | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| dribbble | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobspresso | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:applydigital | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:audinate | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| lever:beaverprocess | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brafton | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brevo | 0 | 0 | 5 | UNKNOWN | UNKNOWN |
| lever:decilegroup | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:deliverect | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:gushwork | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:jetsupport | 0 | 0 | 4 | UNKNOWN | UNKNOWN |
| lever:lwolf | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:nibiru | 0 | 0 | 8 | UNKNOWN | UNKNOWN |
| lever:outsourcedstaff | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:parcelvision | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:piccollage | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
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
| lever:levelup | UNKNOWN | UNKNOWN | 9 | UNKNOWN | UNKNOWN |
| ashby:flutterflow | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
| lever:alltrails | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
