# October 12 public job shortfall: bounded GCP runtime evidence

## Observation and scope

The owner reports only one October 12 job on the public site at 17:26 Manila.
This read-only GCP diagnosis observed live metadata at **2026-10-12
09:36:16–09:48:10 UTC (17:36–17:48 Manila)**, against source HEAD
`0f8068350b6572385d2e88d145539cc6c20a9b86`.
Project: `antigravity-494415`; inspected Cloud Run/Scheduler region:
`asia-southeast1`; Artifact Registry repository: `va-hub-runner`.

The current concrete finding is **successful dispatch with zero reported lake
syncs**, plus an old publisher image and no acquisition job in the inspected
region. This receipt does not certify public first exposure, daily flow,
independent qualification, all writers, all regions, or a completed incident.
The separate public/Turso/D1 workstream owns its exact data and serving receipts.

The local service-account key was used only in memory through the existing
`scripts/gcp/auth.ts` helper. API output was explicitly allowlisted. No token,
key, credential or nonpublic environment value, secret payload/reference content, raw description,
raw error body, or raw job body was retained. The URL comparison below accessed
only the publisher's configured `TURSO_DATABASE_URL` secret version, in memory.
No other secret value was read.

## Current clocks and billing

All initial metadata reads returned HTTP **200**. Cloud Billing project info
reports `billingEnabled=true` and a linked billing account. This supersedes the
October 8 `BILLING_DISABLED` observation for the present sampled API state;
the restoration time, cause, costs and spending/budget guard state were not read.
Nothing here enables billing or changes financial authority.

| Scheduler | State | Cron / timezone | Last attempt at initial observation | Next scheduled instant at initial observation |
| --- | --- | --- | --- | --- |
| `lake-publish-hourly` | ENABLED | `47 * * * *`, UTC | 08:47:05.617397 UTC / 16:47 Manila | 09:47:04.886965 UTC / 17:47 Manila |
| `shadow-dispatch-hourly` | ENABLED | `53 * * * *`, UTC | 08:53:04.698288 UTC / 16:53 Manila | 09:53:03.878904 UTC / 17:53 Manila |

The scheduler list was complete: two jobs, no next page. Targets are the
corresponding Cloud Run jobs' `:run` endpoints. **No ten-minute scheduler exists
in this inspected inventory.** These hourly definitions provide an hourly clock,
not an observed ten-minute acquisition/publication/visibility path.

The Cloud Run job list was also complete: `lake-publish-job` and
`shadow-dispatch-job` only. **No lake acquisition miner job appears in this
region.** This is not an all-region or all-project inventory. Code, Dockerfiles,
or a legacy GitHub miner definition do not establish a running GCP miner.

## Five publisher executions and actual application receipts

The initial Cloud Run execution sample contains five completed-success
executions, each with `succeededCount=1` and `Completed=CONDITION_SUCCEEDED`.
ContainerReady and Started also succeeded. The prior October 8 container-read
failure is not occurring in this sample. Missing API failure/count fields remain
null; they were not converted to numerical zero.

Application receipts were independently read from Cloud Logging for the frozen
window **04:40–09:36 UTC**. A broad 200-entry page was incomplete; a narrower
terminal/supply-notice query completed without pagination and recovered all five
requested receipts. These are the latest five at the initial 09:36 observation,
not a claim about later 09:47 execution or the entire day.

| Execution | Creation UTC / Manila | Completion UTC | Terminal event | Reported synced count | Reported enrolled sources | Runner duration |
| --- | --- | --- | --- | ---: | ---: | ---: |
| `lake-publish-job-9pdcq` | 04:47:05.838335 / 12:47 | 04:47:38.120765 | `lake_publish_completed` | 0 | 13 | 16,995 ms |
| `lake-publish-job-pkl5c` | 05:47:05.681160 / 13:47 | 05:47:38.230796 | `lake_publish_completed` | 0 | 13 | 17,316 ms |
| `lake-publish-job-f86kh` | 06:47:05.901266 / 14:47 | 06:47:40.211619 | `lake_publish_completed` | 0 | 13 | 19,032 ms |
| `lake-publish-job-gv78z` | 07:47:05.746317 / 15:47 | 07:47:40.316040 | `lake_publish_completed` | 0 | 13 | 18,160 ms |
| `lake-publish-job-nlhdx` | 08:47:05.706687 / 16:47 | 08:47:36.568154 | `lake_publish_completed` | 0 | 13 | 16,026 ms |

Every sampled run also logged the fixed supply notice:
**`NO_AUTHORIZED_QUALIFIED_READY_VISIBLE`**, derived from the known runner text
"Published 0 opportunities: no authorized QUALIFIED_READY candidate was visible
to this tick." No held-supply notice appeared in the completed narrow query.
These statements describe the publisher's observed eligible work, not an
independent census of everything that could be acquired or qualified.

The latest sampled tick logs `limit=200`, `dryRun=false`, twelve base sources and
49 auto-publish source proposals. Its 49 proposal decisions were `PUBLISH` with
concentration UNKNOWN, including `greenhouse:janes` proposing two. Proposal
counts are not performed writes and are not public job counts. The same tick's
reported actual sync count is zero. Two earlier sampled ticks loaded serving
inventory of 1,617 active rows across 44 sources. Other ticks' missing inventory
notices do not prove an inventory read failure.

The observed runner enters the older sync/proposal path; the local
`RAW_LAKE_PUBLICATION_BLOCKED` entry fence is not demonstrated executing in this
sample. No new raw D1 batch execution notice or nonzero sync receipt was observed
in the retained page. This neither authorizes that writer nor proves complete
containment, safe future work, actual-ID acknowledgements, first publication,
or fresh eligible visibility. Do not restart or feed it as a throughput workaround.

## Reservoir endpoint linkage

At 09:48 UTC, the exact publisher job GET returned 200 and its configured URL
secret version access returned 200. The endpoint was decoded only in memory and
compared with `process.env.TURSO_DATABASE_URL` under normal Bun environment
loading, matching the source client configuration's lookup.

| Comparison | Result |
| --- | --- |
| Both endpoint values configured and URL-valid | true |
| Same normalized hostname | true |
| Same normalized network endpoint | true |
| Local normalized endpoint SHA256 | `6b4bb90b3311c5598dfece9b96b68fbe64b71b0860512d32b9c81d747c9fd641` |
| Job normalized endpoint SHA256 | `6b4bb90b3311c5598dfece9b96b68fbe64b71b0860512d32b9c81d747c9fd641` |

Normalization lowercases hostname, removes trailing path slashes, treats
`libsql:` as its HTTPS transport counterpart, and excludes query strings and
embedded credentials. The comparison proves the represented network endpoint
match; it does not prove identical auth-token permissions, query options,
database state at every instant, or a publication effect. The separate local
reservoir read must retain its own query/count/window receipt.

## Shadow dispatch is not acquisition/publication throughput

All five sampled shadow containers completed successfully, but the application
evidence distinguishes actual observations from empty dispatches. Each receipt
has two registry rows, `error_class=null`, and `failure_stage=null`.

| Execution | Creation UTC / Manila | Application outcome | Eligible | Dispatched | Skipped ineligible | Skipped stale context |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `shadow-dispatch-job-bvwrt` | 04:53:04.868829 / 12:53 | `no_observation` | 0 | 0 | 2 | 0 |
| `shadow-dispatch-job-w96f7` | 05:53:04.701018 / 13:53 | `success_observed` | 2 | 2 | 0 | 0 |
| `shadow-dispatch-job-ngq84` | 06:53:04.924300 / 14:53 | `no_observation` | 0 | 0 | 2 | 0 |
| `shadow-dispatch-job-l2v7c` | 07:53:04.783877 / 15:53 | `success_observed` | 1 | 1 | 1 | 0 |
| `shadow-dispatch-job-c94mj` | 08:53:04.778838 / 16:53 | `success_observed` | 1 | 1 | 1 | 0 |

The structured GCP runner receipt carries aggregate counters, not source IDs,
fetch/item counts, policy-expiry reasons, or published job IDs. Those dimensions
are **unmeasured here**, not zero. A `success_observed` shadow is not an admitted
production collector, a mature canary, reservoir replenishment, or public flow.

## Image/config drift and provenance limits

| Job | Generation / last update | Immutable image digest | Git revision claim in job/execution labels and registry tag |
| --- | --- | --- | --- |
| Publisher | 3 / 2026-10-04 09:13:09.798366 UTC | `sha256:97db3a248ac23bd5cab40a44d60c233fb98881d531fbc18f179e1bac8fd3b97a` | `3a0ba3bc7c0c75c5cd32ae71f924375e2be023f2` |
| Shadow | 7 / 2026-10-04 01:17:04.359329 UTC | `sha256:86c1c3b61866eac59960dbeeb95cc3afa14fd97f9cf99345ca230c4301083da1` | `780f0e86557b71e6800e7004174aca6853e9d8b5` |

Both jobs have one task, a 300-second task timeout, and one configured retry.
Neither job specifies command/argument overrides, so it uses the image entrypoint.
The shadow's public `TIMEOUT_MS` configuration is 60,000. The publisher has no
`MAX_ITEMS`/`MAX_JOBS_PER_RUN` override among the allowlisted numeric configuration;
its observed 200-row limit comes from the executing runner. Environment names
were inspected; values and secret references were not retained.

Cloud Build's latest five global builds were read without executing a build.
Build `c50e3b5d-1fe2-401f-9449-448976fdcf8e` succeeded October 4 at
09:11:53.839449 UTC, producing the exact publisher digest above under image tag
`3a0ba3bc7c0c75c5cd32ae71f924375e2be023f2`.
Build `ec08c328-8278-4c87-ab88-738b46c603a5` succeeded October 4 at
01:16:52.333820 UTC, producing the exact shadow digest under tag
`780f0e86557b71e6800e7004174aca6853e9d8b5`.

This proves the sampled build-output digest -> registry -> job -> execution
mapping. Both build inputs are **storage archives**, with no resolved repository
commit SHA in the inspected provenance. A tag/label is a source-revision claim,
not independent proof of archive bytes or image contents. The current Git HEAD
is not the deployed revision claim. Neither image was extracted, rebuilt,
redeployed, or cryptographically compared to a committed source archive here.
The artifact list's first ten entries included both current digests and had a
next page; it was not a complete artifact inventory.

## Residual fallback and next dependency

Local `.github/workflows/gha-lake-publish.yml` defines fenced fallback at
`7 4,16 * * *`; `.github/workflows/gha-shadow-dispatch.yml` defines fenced
fallback at `9 * * * *`. Their comments/contracts require both time and primary
health fencing. These checked-in definitions do not prove current GitHub
execution, available GitHub credentials, or active workflow state. No fresh
GitHub API call or new GitHub dependency was added. GitLab mirroring is source
preservation, not evidence of a miner or a production clock.

**Observed next prerequisite:** reconcile the acquisition trigger/runtime feeding
the matching reservoir and its exact source/item gates, alongside root's existing
empty-lake/public snapshot measurements. Restore a governed acquisition path and
measure new ready candidates before assuming a faster publisher clock alone
will deliver fresh jobs. No acquisition job is configured in this inspected GCP
region; whether another region, residual GitHub miner, access/permission failure,
or another hold explains the empty intake remains separately unresolved.

Before any release, reconcile the old raw publisher and executing image against
the current safety/schema/publication contract and preserve exact-version build
provenance. The current billing/container access recovery removes the dated
access blocker for these reads; it does not authorize source admission, schema
changes, wider budgets, raw sync, or a new clock. A future nonzero sync still
requires authority, actual-ID/uncertainty and public visibility evidence.

The independent data workstream's empty ready reservoir makes acquisition a
concrete diagnostic lead. The sampled publisher logs show no bind-limit failure;
the local binding repair is a useful prerequisite, not an empirically demonstrated
cause of this current zero-sync sample. Certified 100–150/day remains UNKNOWN.

## Reproducible read boundary

The bounded read used the existing authentication helper and these paths:

- Cloud Run v2: regional job list; latest five executions for each known job;
  exact job metadata for config/URL comparison.
- Cloud Scheduler v1: regional job list (page size ten).
- Cloud Billing v1: `projects/antigravity-494415/billingInfo`.
- Artifact Registry v1: regional `va-hub-runner/dockerImages` (page size ten).
- Cloud Build v1: project global build list (page size five).
- Cloud Logging v2: `entries:list`, restricted to the named job and frozen
  04:40–09:36 UTC window. This is a read-only **POST** API; parent explicitly
  requested receipt logs after the initial GET-only inventory.
- Secret Manager v1: access to the publisher's exact configured URL version
  only; payload decoded and compared in memory, never retained.

Each request had a 20-second abort deadline and a host/method/path allowlist.
No failed current denial was retried. OAuth token exchanges were the only other
POSTs. There was no run/execute/build/deploy/PATCH/DELETE, IAM grant, billing
enablement, provider/source request, DB query/mutation, or public publication.
Ephemeral ignored read wrappers are local diagnostics, not a deployed service.

API-method references: [Cloud Build list](https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.locations.builds/list),
[Cloud Billing project info](https://docs.cloud.google.com/billing/docs/reference/rest/v1/projects/getBillingInfo),
and [Cloud Logging entries.list](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/entries/list).
