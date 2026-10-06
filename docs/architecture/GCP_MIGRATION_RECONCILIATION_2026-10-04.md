# GCP migration reconciliation — 2026-10-04

**Unit:** PROMPT-GCP-MEMORY-V6.4. **Mode:** read-only live reconciliation plus
canonical documentation correction. **Observed:** 2026-10-03 23:55–23:57 UTC
(2026-10-04 07:55–07:57 Manila). Project antigravity-494415, asia-southeast1.

The latest owner resource clarifies GCP background execution and GitHub
source control/code/provenance/memory, with Turso and Cloudflare/D1 retained.
Retained frontend/data dependencies are intentional; residual GitHub operational
clocks are the unresolved background migration issue. See CURRENT_STATE.md.
The earlier owner direction was GCP execution and GitHub memory/documentation. Live
evidence confirms publication and shadow clocks migrated to GCP, while complete
working-code migration and GitHub-only-memory separation are **not demonstrated**.
Preserve actual functioning dependencies until governed replacement/retirement.
No jobs were launched, schedules changed, resources deleted or data published.

## Verified current evidence

| Component | Evidence | Conclusion |
| --- | --- | --- |
| GCP lake-publish-job | Live Cloud Run list + five execution receipts | Deployed; five latest sampled executions succeeded at hourly :47 UTC slots |
| GCP shadow-dispatch-job | Live Cloud Run list + five execution receipts | Deployed; five latest sampled executions succeeded at hourly :53 UTC slots |
| Cloud Scheduler | Two jobs, both ENABLED, correct Cloud Run targets | Hourly publication and shadow clocks currently configured in GCP |
| Latest publication receipt | lake-publish-job-n8ptc, completed 23:47:29 UTC; JSON log lake_publish_completed | syncedCount=0, enrolledSources=12; success does not prove new public supply |
| Latest shadow receipt | shadow-dispatch-job-ffq2j, completed 23:53:17 UTC; JSON log success_observed | eligible=1, dispatched=1, registry rows=3; no recorded error class |
| Shadow computation dependency | Live SHADOW_DISPATCH_API_URL | Calls https://remotejobs-ph.pages.dev/api/cron/shadow-dispatch; business route remains outside GCP |
| Publication storage/dependencies | Runner imports/config + live env names | Turso reservoir and Cloudflare/D1 synchronization remain in the implemented path |
| GCP lake miner | Cloud Run jobs and schedulers list in inspected region | No miner job/schedule found here; container/runner definitions do not prove deployment |
| GCP web services | Cloud Run services list in inspected region | Empty; this does not exclude other regions/projects/GCP hosting products |
| Artifact backup | Artifact Registry va-hub-runner, eight image versions | Durable container artifacts exist; complete source/state backup and restore not proved |
| GitHub runtime | Workflow API states + recent scheduled execution receipts | Five sampled runtime workflows remain active; GitHub is not currently memory only |

Raw redacted evidence: [jobs/schedules/executions](../audits/2026-10-04-GCP-MIGRATION-METADATA.json)
and [dependency/artifact/log receipts](../audits/2026-10-04-GCP-MIGRATION-DEPENDENCIES.json).
Only whitelisted operational metadata is retained; no credentials, environment
values other than the public shadow endpoint, private records or raw job bodies.

### Residual GitHub runtime receipts

All five sampled workflow API states are active. Recent completed scheduled runs:

| Workflow | Run ID | Created UTC | Conclusion |
| --- | --- | --- | --- |
| gha-lake-publish.yml | 37147056528 | 2026-10-03 19:12:28 | success |
| gha-shadow-dispatch.yml | 37160755852 | 2026-10-03 23:07:52 | success |
| gha-lake-miner.yml | 37155351228 | 2026-10-03 21:30:36 | success |
| gha-directory-pulse.yml | 37156222195 | 2026-10-03 21:45:46 | success |
| gha-hunter-pulse.yml | 37158446281 | 2026-10-03 22:26:22 | success |

These are executed schedules, not just unused YAML files. Their success does not
prove source-level quality or full event effects; it proves residual GitHub
runtime exists. The inspected definitions designate publication/shadow as fallback.
Do not disable them before verifying replacement, fencing, observation and rollback.

### Artifact and code-revision limits

Registry latest tags currently point to lake-publish digest
8efec6a36d0a4bf353bdc45c196fb04dbbc8aa45905981a656d61dfbefb3cbd4 and
shadow-dispatch digest
da44950cde52aa440819da62fd40528418d72026d66b4f28cf4054dbbb7eab73.
These images were uploaded October 1; mutable latest tags and job updates do not
prove the running code equals current Git HEAD. Exact source-to-deployed-image
mapping and resolved per-execution image provenance remain UNKNOWN. Recent repo
changes must not be called deployed merely because a GCP job succeeds.

## Reconciliation with earlier records

[ADR-009](../decisions/ADR-009-constitution-governed-cloud-runtime-migration.md)
explicitly migrated representative sub-6-hour clocks incrementally and retained
Cloudflare serving, Turso/D1 and GitHub fallback/release responsibilities.
The [GCP-02 unit](../plans/UNIT_GCP_02_LAKE_PUBLISH_MIGRATION.md) excluded changes to
public Astro rendering. Savepoint receipts for GCP-01/02 show deployed primary
jobs; GCP miner support is documented as implementation, not a current deployed
job in the inspected region. The live audit agrees with that partial migration.

The owner's latest desired separation supersedes the older target allocation.
It does not itself prove retirement of retained runtime. Canonical prompts and
AGENTS now distinguish owner direction, verified deployed subset and unresolved
migration gaps, while retaining every source/item/publication gate.

## Latency and next action

The verified publisher schedule is hourly at :47 UTC. A job ready immediately
after a tick can wait nearly 60 minutes before the next dispatch, before execution
and website visibility delay. This is a timing implication of configuration,
not measured p95 submission-to-visible. The proposed <=30-minute target requires
measured feasibility and a governed scheduling improvement; no change made here.

Next: trace the owner's reported PH/VA resource using the verified GCP publisher
and actual Turso/D1/public visibility dependencies. Identify its stage hold and
whether scheduler delay, eligibility or source admission is binding. In the same
execution recovery, reconcile the remaining runtime inventory and source/image
provenance under ADR-009/GCP unit contracts. Do not make finishing unrelated
migration a prerequisite for serving already eligible jobs through current gates.

## Coverage and exclusions

Read AGENTS, canonical prompts, ADR-009, dated migration audit, relevant GCP unit
contracts, GCP auth/status/inspection/runner code, Docker/build files and sampled
workflow definitions. Live reads used authenticated Cloud Run, Scheduler,
Artifact Registry, Logging and GitHub APIs. GCP key used by the existing auth
helper without exposing key/token. No gcloud CLI is available; API access worked.

One project/region, five latest executions per deployed job, recent filtered
structured logs, eight registry images and five GitHub workflows were inspected.
No all-region/all-project inventory, frontend deployment API audit, live DB query,
backup restoration, billing audit or independent source-quality sample was done.
No claim of complete migration, complete health, all-code backup or supply target
acceptance is warranted. Validation/release receipts live in SYSTEM_SAVEPOINT.
