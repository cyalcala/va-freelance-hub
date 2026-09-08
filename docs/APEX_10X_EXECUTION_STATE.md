# APEX-10X Execution State

As of 2026-09-08. Primary executor: Codex. Status: VERIFYING / REVISE.
Working branch: `codex/apex-audit-repair`. Start main:
`727ca4a06dda26b9dcddddf5824238cfdd5ce137`.

Canonical evidence: [September 6–8 audit](gauntlet/evidence/APEX-AUDIT-2026-09-08/AUDIT.md).
[Measured baseline](benchmarks/APEX_10X_BASELINE_2026-09-08.md).
[Workstream continuity](APEX_10X_WORKSTREAM_LEDGER.md).

| Gauntlet | Evidence status | Next action |
| --- | --- | --- |
| G1 reconciliation | Completed against GitHub and D1; PRs #124–134 open at start | Preserve original history; integrate reviewed repairs |
| G2 baseline | Qualified first-stored proxy 89/7 = 12.71/day; 487/30 = 16.23/day | Daily measurements; full publication KPI still provisional |
| G3 architecture | Existing stack retained; ADR-008 tiers advisory, not enforced | Specify evidence renewal before new admission |
| G4 portfolio | Three live shadows; six further Greenhouse allowlist entries code-only | Renew invalid historical primary-evidence fingerprints |
| G5 triage | False positive/negative geo regressions fixed with fixtures | Observe source-level yield after release |
| G6 execution | Heartbeat catch, shadow failure validation, hourly Cloudflare shadow trigger | Verify deployed scheduled execution |
| G7 discovery | Geo facets retained; misleading shift hours removed | Production smoke after release |
| G8 review | Two independent reviews; concrete bugs repaired | Final CI and deployment checks |
| G9 deploy/measure | Await exact-commit production evidence | Merge through PR, observe Pages/Worker, checkpoint |

No 10x completion claim. Provisional target 127.14 qualified first-stored jobs/day
uses a fixed 89/7 baseline; historical publication and deactivation prevent an
exact retrospective publication rate. Original 8.5/day baseline is superseded.
Unknown costs/provider usage/rejection rates must stay unknown.

Production exact-six publication invariant preserved. No automatic source
promotion enabled. Eight distinct UTC observation dates spanning seven days are
required by current server policy; date alone never authorizes canary. Existing
URL/time-based primary evidence needs reviewed renewal before acceptance; new
proposals now hash actual fetched content and reject provider mismatches before
creating candidates. Compensation normalization stays PAUSED.

Next exact unit: finish release verification and D1 Time Travel recovery capture;
then implement/review an additive evidence-renewal lifecycle with atomic provider
and source snapshots, immutable decisions, rollback, tests and renewed shadow
windows. Do not overwrite historical evidence or silently shorten requirements.
