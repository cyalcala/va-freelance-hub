# VA Freelance Hub — current architectural ownership and evidence

**Version:** 1.2 · 2026-10-04. **Purpose:** canonical ownership, current evidence
pointers and unresolved migration facts. This map does not dispatch runtime work.
The [October 4 owner resource](../directives/2026-10-04-PH-VA-FRESHNESS-GCP-CANONICAL-UPGRADE.md)
clarifies source control versus execution. The [October 1 topology snapshot](CURRENT_STATE_2026-10-01_SNAPSHOT.md)
is preserved verbatim as historical evidence; it is not today's runtime inventory.
Read the newest savepoint and verify deployed versions before acting.

## Canonical operating model

```text
GitHub: code/tests/infra, version history, review, governance, evidence/recovery
  -> reproducible committed build/config with immutable deployment provenance
GCP: Cloud Scheduler -> Cloud Run jobs/controllers/background compute
  -> Turso: permitted acquisition, source/intake memory, qualified candidates
  -> source/item policy + current publication gateway/ledger
  -> Cloudflare D1: governed public serving mart
  -> Cloudflare: Astro public frontend/edge/API -> observed eligible visibility
```

GitHub stores code; it does not supply the required production clock. CI/release
verification is separate from production scheduling. GCP migration does not imply
moving Turso, D1 or the public frontend. Retained edge/API execution is an explicit
dependency, not an architecture contradiction. Every collection/publication still
requires its actual authority, eligibility, budgets, leases, ledger and rollback.

## Dated deployed subset and unresolved residuals

Evidence window: 2026-10-04 07:55–07:57 Manila, from the [live reconciliation](GCP_MIGRATION_RECONCILIATION_2026-10-04.md).
It covers one project/region and sampled workflows, not the entire fleet.

| Component/workload | Classification | Evidence / next decision |
| --- | --- | --- |
| GCP lake-publish-job / lake-publish-hourly | CURRENT / MIGRATED primary clock | Two GCP APIs confirm deployment and enabled hourly :47 UTC; latest five sampled executions succeeded |
| GCP shadow-dispatch-job / shadow-dispatch-hourly | CURRENT / MIGRATED primary clock | Enabled hourly :53 UTC; latest five sampled executions succeeded |
| Cloudflare shadow-dispatch route | CURRENT retained execution dependency | Live GCP job target calls the Pages endpoint; qualify actual code revision separately |
| Turso/D1 publisher dependencies | CURRENT in inspected code/config | GCP runner retains lake/sync path; no new database migration claimed |
| gha-lake-publish / gha-shadow-dispatch | FALLBACK, still executing | Definitions identify standby and API shows recent scheduled success; reconcile fencing, need and retirement contract |
| gha-lake-miner | CURRENT residual background runtime | Active recent scheduled GitHub execution; GCP runner/definition alone is not migration acceptance |
| gha-directory-pulse / gha-hunter-pulse | CURRENT residual runtime | Active recent scheduled GitHub executions; replacement/retirement ownership unresolved |
| GitHub project validation | CI-ONLY as runtime role | Tests/build/type checks validate inspected source; not GCP health or production publication |
| GitHub docs/ADRs/prompts/history | DOCUMENTATION-ONLY / source control | Durable memory and versioned code/config provenance |
| GCP miner / other migrated controllers | UNKNOWN outside inspected scope | No miner job/scheduler in inspected region; don't infer none elsewhere |
| Exact Git SHA -> running image/config | UNKNOWN | Artifact images/tags exist; immutable source-to-execution mapping not recovered |
| Historical Trigger/Vercel/Next application paths | LEGACY unless new evidence | Preserve artifacts; don't revive old clocks merely for familiarity |

Classifications describe observed roles and required decisions, not permission.
Complete GCP ownership of background runtime remains **incomplete/unverified**.
Do not pretend residual GitHub production has ceased. Do not make GitHub cron a
new required freshness dependency. For each residual identify owner, trigger,
source/publication authority, retry/failure behavior, shared budgets and lease/fence
before bounded replacement/retirement. No uncontrolled duplicate publication clocks.

## Runtime provenance and durability

All meaningful code/tests/infrastructure/config/doc changes enter Git history and
GitHub backup. Every deployed GCP revision maps to Git SHA or a reproducible artifact
with Git-backed definition, immutable image digest, job/config version, deployment
time, scheduler/policy/parameter version, execution IDs, checks and rollback.
Mutable latest is not proof of current Git deployment. Detect drift and reconcile
it before attributing inspected behavior to runtime. Keep artifact/state backups
and required restoration evidence separately; code history is not DB recovery.

## PH/VA freshness and sparse adoption

[Master section 10D](../bootloaders/MASTER_OPERATING_PROMPT.md#10d-implementation-led-delivery-and-urgent-owner-submissions)
is the canonical priority/math/SLO/queue contract. Owner-reported PH/VA leads get
immediate permitted evidence attention ahead of bulk exploration, while all source
and vacancy gates remain intact. Conceptual service classes are distinct from
cohort tiers and schema enums. HRI-04/05 and scheduler integration are not certified.

Proposed established-source p95 targets: discovery->decision <=10m,
clearance->visible <=5m, discovery->visible <=15m. New structured priority-source
submission->PUBLISH/HOLD/REJECT <=30m. They are unaccepted engineering hypotheses;
an honest HOLD names missing evidence and scheduled follow-up. The observed hourly
publisher cannot establish the 5/15-minute targets. Actual latency and expiry-loss
measurement remains missing; a successful run with syncedCount=0 proves no new flow.

Continue SSAE-00..15 supporting adoption under the sole source queue and existing
MATH-01..13. Preserve reusable evidence, material deltas, exact replay, shared pacing
and independent audit. Priority/expiry signals feed scarce attention, not admission.
Local/documentation progress does not prove deployed benefit or 100/day acceptance.

## Next recovery and acceptance

Recover the newest owner PH/VA intake/identity and exact stage hold through the
verified GCP publisher and retained serving path. Proceed with the smallest
permitted evidence/remediation slice; don't hold already-cleared jobs for unrelated
cohort or migration work. Parallel independent work only under current collaboration
rules. Record runtime/quality/cost/supply/latency effects or UNKNOWN, commit/push
checkpoints and continue within authority. A documentation task grants no migration,
schedule change, SQL write, source promotion or production publication.
