# APEX-10X paused handoff — 2026-09-08

## User instruction and scope

The owner said **pause everything for now**, then authorized documenting progress
and backing up to GitHub. The owner then explicitly authorized ONLY completing
the pending deployment and documenting it. That deployment is now complete.
Implementation, source admission and the six-hour follow-up remain PAUSED.
Wait for another explicit resume instruction before further operational work.
Existing production schedules were left running; the site was not shut down.
The thread automation `apex-source-recovery-and-qualification` is PAUSED.
Both review agents finished; no delegated work remains running.

## Exact repository and deployment state

- Main at this handoff's start: `c3f5951ae387ad0a6f9023d4bbe48dc618678841`.
- Capacity behavior commit: `1efb8aa04febaba2ef7d97970bf07880692e5442`.
- PR #141 merged: https://github.com/cyalcala/va-freelance-hub/pull/141
- PR CI `34222288113`: success on the behavior commit.
- Production run `34222392137`: attempt 1 CANCELLED at the owner's request;
  attempt 2 SUCCESS after the explicit deployment-only authorization.
- Its validation job passed tests, Python tests, build, typecheck and Worker checks.
- Attempt1 stopped after checkout before migrations/deploy. Attempt2 built the
  artifact, applied/checked migrations, verified the D1 transition foundation
  and full-text index, and deployed Cloudflare Pages successfully.
- Last accepted Pages behavior is now `c3f5951ae387ad0a6f9023d4bbe48dc618678841`.
  Deployment: https://280f2e6b.remotejobs-ph.pages.dev at 12:31:44Z September 8.
  Prior deployment `6d45fd42880b3e314c4fccdebb0a4f454580359a` is historical.
- Read-only deployment smoke at 12:32:52Z: Greenhouse renewal PREVIEW200, homepage 200,
  opportunities 200. Preview retained revision3 and evidence IDs4,6,7, published0.
  No renewal/admission was executed.
- Documentation branch: `codex/apex-paused-handoff`. Later documentation-only
  merge SHAs do not change the last deployed behavior above.

Machine-readable CI/deployment evidence: `passing-pr-ci.json` and
`cancelled-production-run.json` (attempt 1), `completed-production-run.json`
(attempt 2), and `deployment-smoke.json` in this directory. The exact final documentation
commit/merge can be recovered with `git log -5 --oneline` after fetching.

## Completed capacity slice

Current admission loading is now one joined SQL snapshot for source, durable
opt-out, provider and latest immutable evidence. Existing digest, revision,
identity, scope, authority and lease validation remains; snapshots are not cached
between preparation, atomic mutation and readback.

Renewal code supports six identities and at most sixteen distinct primary
reference URLs, checked before document fetch. Real migrated SQLite integration
measured seven SQL queries for six-source preview, and twenty-eight SQL statements
plus twenty-eight external requests for the worst-case renewal. Every batch
statement is counted. The six-identity route is now deployed and its current three-source Greenhouse
preview succeeds. No live renewal was used to prove the six-source capacity;
that worst-case measurement is an integration-test result.

Dispatch code limits enumeration and authority attempts to twelve shadow sources.
Hourly rotating windows prevent invalid/cadence-held early rows from permanently
starving later sources. Response `registryWindow.countScope` makes clear that
`totalRegistryRows` describes the selected window, not the entire registry.
Real Drizzle/D1-adapter tests measured twelve due sources at 37 SQL/24 external;
twelve invalid sources at 13 SQL/0 external; twelve cadence-held at 25 SQL/0 external.
The next hourly window reaches later rows. Fresh evidence epochs use their own
cadence. All SQL mutation guards remain active in tests.

Local full suite:1,264 pass,0 fail,126 files; typecheck and guardrails passed.
Pinned CI repeated verification successfully. Independent review found no blocker.
Initial failures were three test fixtures coupled to the old four-query loader;
fixtures were updated, and the complete suite reran successfully.

## Durable source and data state

No new source admissions, provider renewals, source promotions, or public job
writes were performed during the capacity slice. The planned three admissions
were stopped before execution.

Last verified real shadows (five):

| Source | Current evidence ID | Status |
| --- | --- | --- |
| greenhouse:grafanalabs |4| Renewed September 8; shadow |
| recruitee:myjewellery |5| Renewed September 8; shadow |
| greenhouse:gitlab |6| Actually admitted September 8; shadow |
| greenhouse:remotecom |7| Actually admitted September 8; shadow |
| teamtailor:career.teamtailor.com |8| Renewed September 8; shadow |

`start-observations.json` records Teamtailor evidence8 at11:20:21.807Z. The
absence of a corresponding GHA shadow invocation and the deployed minute20
Worker schedule support independent-clock execution; attribution is inferred,
not a new database dispatch-origin field. Do not count old evidence IDs1–3 toward
new epochs. Require eight distinct UTC dates spanning seven days plus the FULL
Autonomy Cutover Predicate. A calendar date alone never authorizes promotion.

Nearform, Ghost and Wikimedia have healthy earlier probes but remain UNADMITTED.
After resume they need fresh allowed probes and actual admission/readback;
the capacity route deployment is complete. Canonical exceeded the 524288-byte probe bound;
Workable exceeded 512MiB in GHA34217743529. Both remain withheld. Workable's daily
bulk schedule is dormant; manual diagnostic remains, next review September 15 or
earlier supported bounded-feed evidence. Do not repeat bulk fetches blindly.

The fixed September 8 qualified first-stored proxy is89/7=12.71 jobs/day, provisional
10x target 127.14/day. This is not exact historical publication throughput. No 10x
result or independently measured$0 cost is claimed. Source attribution remains
incomplete. Compensation normalization remains PAUSED; all ledger workstreams
and historical evidence remain preserved.

`recent-fetch-health.json` is an unfinished bounded event-count inspection saved
at pause. It covers only the latest1,000 source-fetch event rows and includes
policy/cadence skips; zero failed events does NOT prove successful real fetches,
qualified supply, or full source health. Do not turn it into a green-health claim.

## Resume procedure — only after owner authorization

1. Read AGENTS.md, docs/bootloaders/CURRENT.md, this file, the capacity REPORT.md,
   and the prior audit/primary-evidence decision before mutations.
2. Fetch origin, preserve dirty work, restate the full starting SHA, and inspect
   intervening commits/workflow runs. Confirm the main/production difference.
3. Confirm the successful attempt 2 of run34222392137 and check intervening
   deployments. The capacity release is complete; do not rerun it unnecessarily.
   Do not mark any future green PR as deployed without production evidence.
4. Read-only `/api/cron/source-renew` preview of the current Greenhouse group must
   succeed on deployed code. Do NOT renew merely to test capacity: that would
   restart accepted observation epochs.
5. Freshly probe/admit Nearform, Ghost and Wikimedia sequentially within the
   reviewed conditional shadow scope, stopping on any drift/failure. This brings
   Greenhouse to six and total shadows to eight. Verify native D1 evidence and
   zero publication; then run the bounded dispatcher and record outcomes.
6. Observe current-epoch cadence and qualification, update economics, and work
   through remaining dependency-ready units without weakening the cutover gate.
7. Re-enable the paused thread automation only if the owner's resume instruction
   authorizes ongoing scheduled execution. Commit/push evidence and recovery docs.

Safe first commands: `git fetch origin` then `git status -sb`.
No deployment rerun is pending. Subsequent code changes need their own tested
and authorized release; this deployment-only exception is already fulfilled.

## Earlier work retained

The full supplied mandate is archived at docs/gauntlet/APEX_10X_OPERATING_MANDATE.md.
The September 6–8 audit, PR135–140 releases, native evidence renewal, GitLab/Remote.com
admissions, source-economics automation, D1 Time Travel bookmark, and prior public
route smoke are in ../APEX-AUDIT-2026-09-08/AUDIT.md and its artifacts. Code and
aggregate evidence are on GitHub; database recovery uses D1 Time Travel, not a
public raw database dump. No credentials or secrets are included.
