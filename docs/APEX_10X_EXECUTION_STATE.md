# APEX-10X Execution State

**PAUSED — owner-authorized deployment and documentation only.**
As of 2026-09-08. Working documentation branch: `codex/apex-paused-handoff`.
The follow-up automation `apex-source-recovery-and-qualification` is PAUSED.
The documentation request and deployment-only exception do not resume other work.

Canonical continuation: [paused handoff](gauntlet/evidence/APEX-CAPACITY-2026-09-08/PAUSE_HANDOFF.md).
[Capacity evidence](gauntlet/evidence/APEX-CAPACITY-2026-09-08/REPORT.md).
[Earlier audit](gauntlet/evidence/APEX-AUDIT-2026-09-08/AUDIT.md).
[Baseline](benchmarks/APEX_10X_BASELINE_2026-09-08.md).
[Preserved workstreams](APEX_10X_WORKSTREAM_LEDGER.md).

| Item | Exact state |
| --- | --- |
| Capacity unit start | dda9c168d6ac39a53ec85b3ac0bd45cb1a541774 |
| Behavior commit |1efb8aa04febaba2ef7d97970bf07880692e5442|
| Merged main |c3f5951ae387ad0a6f9023d4bbe48dc618678841 — PR #141|
| PR CI |34222288113 success|
| Production run |34222392137 initial attempt cancelled before migrations/deploy; explicitly authorized attempt 2 SUCCEEDED; capacity code deployed|
| Prior accepted deployment |6d45fd42880b3e314c4fccdebb0a4f454580359a — run34218427110|
| Verification |1,264 Bun tests,15 Python tests,build,typecheck,guardrails,Worker checks|
| Native source mutations during capacity slice |None|
| Current real shadows |Five; current evidence IDs4–8|
| Next admissions |Nearform, Ghost, Wikimedia — NOT executed|
| Task automation |PAUSED; existing production clocks were not stopped|

The joined evidence loader now uses one coherent SQL snapshot and retains the
same immutable digest/revision/authority/lease and durable opt-out checks.
Six-source renewal measured 28 SQL statements/28 external requests at maximum
sixteen primary documents. Twelve-source dispatch measured 37 SQL/24 external;
invalid and cadence-held rows consume bounded authority reads. Hourly windows
rotate beyond invalid early rows. No cached authority or shortened evidence gate.
These changes are deployed at https://280f2e6b.remotejobs-ph.pages.dev. Read-only
Greenhouse preview and public-route smoke passed; see deployment-smoke.json.

G1–G8 reconciliation, baseline, capacity implementation and review are recorded.
G9 capacity deployment is VERIFIED; documentation backup is the authorized closeout;
further source expansion and observation work remains paused. No 10x completion.
The fixed qualified first-stored proxy 89/7=12.71/day and target 127.14/day remain
provisional, not exact historical publication throughput or independently measured
billing. Unknown attribution, usage and rejection metrics remain unknown.

Exact-six publication boundary remains. Eight distinct UTC observation dates
spanning seven days must bind to current admission evidence, plus every named
Autonomy Cutover Predicate condition. Old September 6 evidence epochs do not count
toward September 8 renewals. ADR008 tier summaries remain advisory. Compensation
normalization remains PAUSED; no ledger workstream was dropped.

Canonical remains withheld at524288-byte probe bound. Workable exceeded 512MiB
in GHA34217743529; daily bulk schedule dormant, next review September 15 or earlier
supported bounded-feed evidence. Do not retry bulk downloads to manufacture green.

After explicit resume: fetch/preserve dirty work, restate full SHA, remeasure
intervening workflows and current evidence, confirm deployed capacity, then fresh
allowed probes and sequential shadow admission for the three staged sources.
Do not renew merely to test capacity: it would restart observation epochs.
