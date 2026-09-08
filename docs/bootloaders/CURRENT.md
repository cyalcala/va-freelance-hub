# Current resume pointer

**PAUSED by owner.** The owner authorized only completing the pending capacity
deployment and documenting/backing up the result. Do not admit sources, renew
provider evidence, continue implementation, or re-enable the follow-up without
another explicit resume instruction.

1. [Paused handoff and exact resume procedure](../gauntlet/evidence/APEX-CAPACITY-2026-09-08/PAUSE_HANDOFF.md)
2. [Execution state](../APEX_10X_EXECUTION_STATE.md)
3. [Capacity measurements and review](../gauntlet/evidence/APEX-CAPACITY-2026-09-08/REPORT.md)
4. [Earlier audit and releases](../gauntlet/evidence/APEX-AUDIT-2026-09-08/AUDIT.md)

Capacity code is merged as `c3f5951ae387ad0a6f9023d4bbe48dc618678841` (PR #141).
Deployment run `34222392137`: attempt 1 cancelled; explicitly authorized attempt 2
SUCCEEDED. Capacity code is deployed at https://280f2e6b.remotejobs-ph.pages.dev.
Read-only preview and public-route smoke passed; no further deployment is pending.
Documentation branch: `codex/apex-paused-handoff`.

Last verified source state: five shadows, evidence IDs4–8. Nearform, Ghost and
Wikimedia remain UNADMITTED. No source promotion or public job publication was
performed in the capacity slice. Six-hour task automation is PAUSED. Existing
production schedules continue; Workable daily bulk preprocessing is dormant.

Provisional qualified first-stored baseline 12.71/day; target 127.14/day. No 10x
claim. Qualification still needs eight UTC dates spanning seven days tied to
current evidence plus the complete Autonomy Cutover Predicate.

After explicit resume: fetch, inspect intervening changes, verify deployment,
then freshly probe/admit the three staged sources within the measured capacity.
Safe first commands: `git fetch origin` then `git status -sb`.
