# SEV-2 lake publication authority incident

Detected 2026-10-08 11:49–11:53 UTC under owner-authorized lucky777 maintenance.
Authority: OPERATIONS.md section 13.2 (unchecked raw D1 insert -> halt affected
pipeline, compensate exact rows, continue independent units); master operating
prompt section 11 permits justified narrow emergency containment before replay.
This is existing authority enforcement, not a source permission decision.

## Reproduction and bounded containment contract

Existing scheduled execution `lake-publish-job-drv4t`, generation 3 / immutable
image digest `97db3a248ac23bd5cab40a44d60c233fb98881d531fbc18f179e1bac8fd3b97a`,
completed successfully at 11:47:53.303405 UTC. It reports 11 syncs, including
`greenhouse:janes` PUBLISH x2. All 49 sampled decisions report concentration
UNKNOWN. D1 has no Janes registry row or opt-out, but two active rows, IDs
9046/9047, and an unlimited count-2 receipt with empty IDs at 11:47:32.192 UTC.
Discovery auto_approved/Jev labels do not substitute for current source authority.
The existing gateway would hold an unregistered nonlegacy ATS identity.

Public `/jobs/9046` and `/jobs/9047` returned 404 twice; public exposure is not
established. ID 9046's title is a generic opportunity invitation, not independently
proven to be a vacancy. No quality/fresh-flow certificate is assigned. Preserve
the [scheduled observation](scheduled-publisher-observation-2026-10-08.json) and
[D1/detail evidence](janes-publication-control-observation-2026-10-08.json).

Allowed emergency effects:

1. GET and retain nonsecret current scheduler/run metadata, then temporarily pause
   only `lake-publish-hourly` in antigravity-494415 / asia-southeast1. Do not change
   the job image/config, shadow/miner/directory clocks or any source permission.
2. Capture existing is_active/inactive_reason for IDs 9046/9047. Conditional UPDATE
   only those IDs with source_id=greenhouse:janes, active=1 and still absent registry:
   set is_active=0, inactive_reason=policy-rejected. Preserve descriptions, dates,
   eligibility, IDs, candidates and original receipts; no deletion or false opt-out.
3. Read back exact row states and scheduler state. Detail route/cache withdrawal
   and full cross-runtime fencing remain separately unverified.

Maximum job rows affected: two. Generated D1 statement must use exact ID/source
and current missing-registry guards and RETURNING IDs; trigger-amplified write
metadata is not an opportunity count. Stop on mismatched preconditions, more than
two returned IDs, unsuccessful receipt, or a nonterminal live execution.

This pause is partial containment: documented GitHub fallback can take over a
missed GCP slot, and current lake upsert can reactivate policy-held rows. GitHub
suspension prevents fallback control/release verification. Neither pause nor
row withdrawal is called a complete fence. Preserve this unresolved risk and
notify the account owner; do not deploy unbacked code, create a replacement clock,
fake employer opt-out or invoke raw sync as a workaround.

Recovery condition: restore normal GitHub access, coordinate primary/fallback
STOP-AUTHORITY, then release a verified current-authority/lease/opt-out/cap/actual-ID
lake publication path with crash/receipt-failure/retry compensation and serving
withdrawal evidence. Resume this scheduler only under that accepted repair.
Do not automatically reactivate these rows: each requires current governed source
and item clearance. Supported scheduler resume is rollback of the temporary pause,
not permission to restart the defective writer.

Owner: maintainer for incident containment; GitHub account owner for external
unblock. Operational playbook escalation target: four hours. Git/config/evidence
BACKUP_PENDING on current local branch while GitHub is suspended; retain a verified
local incremental bundle. Actual API mutation receipts and prechange states are
required before claiming any action succeeded.

## Actual containment attempt — stopped before effects

At 11:59:33 UTC the bounded preflight retained five completed GCP executions,
including `lake-publish-job-drv4t`. It then stopped before obtaining scheduler
state. No pause, D1 UPDATE, row withdrawal or complete fence was performed.
The original [stopped-at-preflight receipt](sev2-lake-containment-receipt-2026-10-08.json)
is preserved rather than overwritten with an assumed result.

One subsequent read-only exact scheduler GET at 12:03:32 UTC returned HTTP 403,
Google status `PERMISSION_DENIED`, reason `BILLING_DISABLED`:
[provider prerequisite receipt](sev2-scheduler-preflight-2026-10-08.json).
This is evidence of a billing prerequisite failure at that API, not an IAM
diagnosis or proof that future scheduler executions have stopped. Do not retry
unchanged, grant IAM, enable billing, incur a paid service or start a replacement
clock. The precondition requiring verified primary pause has not passed, so the
dependent two-row compensation remains pending.

The maintainer can prepare a local fail-closed code fence for the unsafe raw lake
writer while these external prerequisites remain unresolved. Local tests and a
Git bundle do not change the deployed GCP digest or fence the GitHub fallback.
Account-owner action is required for GitHub suspension and the GCP billing
prerequisite. Existing directory and independently governed publication work
retain their scope; certified supply remains UNKNOWN.

## Local code fence — release pending

The central `syncQualifiedJobsToD1` entry rejects every mode except literal
`dryRun === true` with `RawLakePublicationBlockedError` /
`RAW_LAKE_PUBLICATION_BLOCKED`, before logging, client creation, inventory/options
access, subprocess execution or database calls. No CLI/environment override
exists. Historical raw SQL builders remain available only for read-only planning
and offline gap characterization; their old planning lists are not source authority.

The configured GCP default runner reports a coded failure with zero syncs and
enrollments before reaching enrollment. The sync CLI exits nonzero; existing
GitHub publish/enrollment success gating is unchanged. Dry-run generates SQL
from SELECT-only queries, returns zero synced jobs and a separate statement count;
the existing fallback health sampler reads that planning field. Optional GitHub
discovery and standalone source enrollment are independent operations and are
not covered by this publication fence.

The first safe isolated regression run failed two assertions on the old code
with lake credentials empty, before any inventory I/O. Green isolated tests
cover default/invalid modes, synthetic credentials/override attempts, configured
GCP behavior, SELECT-only planning and the actual CLI exit. A focused independent
review found no blocking new issue; subprocess paths use portable fileURLToPath.
Final combined check/commit receipts belong to the newest savepoint.

This is LOCAL CODE CONTAINMENT only. No running image, primary/fallback clock,
source lifecycle or production row has changed. Removing the guard is not a
routine resume switch: the complete replacement boundary below must pass first.

## New scheduled-container failure — 14:12–14:13 UTC read

Two read-only Cloud Run API GETs refreshed changed execution evidence, without
retrying the unchanged failed scheduler preflight or launching a job. The five-run
[execution receipt](publisher-execution-refresh-2026-10-08.json) reports
`CONDITION_FAILED` for `lake-publish-job-bj6tr` (created 12:47:05 UTC) and
`lake-publish-job-7g975` (created 13:47:05 UTC), after the previously recorded
11:47 success. NULL start/completion/count fields are not fabricated zeroes.

The [exact newest execution receipt](publisher-container-start-failure-2026-10-08.json)
reports `CONTAINER_PERMISSION_DENIED` in all four conditions, last transitioned
13:47:06 UTC. Its service agent could not read the configured Artifact Registry
image digest `97db3a248ac23bd5cab40a44d60c233fb98881d531fbc18f179e1bac8fd3b97a`.
That is an actual container-start failure, separate from the earlier scheduler
`BILLING_DISABLED` response. The receipt does not establish its root cause, an
IAM change requirement, source/publication outcomes, a disabled clock, complete
containment or Git-to-image provenance. Other writers remain independently scoped.

Account owner owns normal GitHub/GCP access restoration and investigation of the
image-read prerequisite. No billing purchase, IAM grant, scheduler change, image
rollout, provider request or D1 mutation was dispatched. The next observation is
triggered by changed access/configuration or a new execution; do not spin on the
same failed probe. Dependency-ready local evidence work continues.

## Required replacement boundary — not deployed

The next implementation uses an authenticated lake publication operation behind
the existing web ingest API and a narrow atomic executor. Reusing unchanged
ingest is insufficient: it returns counts, uses timestamp retry keys and can
insert active rows before recording a receipt. No raw D1 fallback is allowed.

The request supplies immutable candidate/material identity and qualification
facts. The server owns current authority, opt-out/lease checks, item remote/PH
evidence, safe URLs, canonical deduplication, accepted caps, tick and actual D1
IDs. Auto-approved/Jev/QUALIFIED_READY labels select research or work; they never
clear publication. Preserve only the explicit canonical exact-six exception.

Stage new rows hidden with RETURNING IDs; conflicts never reactivate withdrawn
or policy-rejected rows. Use native D1 prepare/batch with a compare-and-swap guard,
actual-ID ledger and activation in one atomic commit. Require stable operation
identity and a durable manifest/tick across chunks and retries. A bounded additive
attempt table is justified only if existing control records cannot supply that
contract. Return per-candidate committed/already-present/held/rejected/unknown
outcomes; Turso mappings/status may advance only from verified committed outcomes.
Sync acknowledgements and new public exposures are separate counts.

Required regressions: Janes missing registry; expiry/opt-out; authority change
after staging; onsite/non-PH/unsafe/missing evidence; conflicts without reactivation;
concurrent/chunked caps; ledger rollback; crash after hidden staging; commit timeout
replay; Turso acknowledgement recovery; changed material under the same operation;
malformed responses. The GCP client must run with Bun fetch and existing API
authentication, with no Node/subprocess/SQL publication fallback.

Keep activation disabled until the atomic/idempotency tests and independent
review pass. Normal Cloudflare release precedes a SHA-proven GCP image rollout
and fallback coordination. This is the pending MATH-06 control repair, not an
accepted production capability or a fresh-flow certificate.
