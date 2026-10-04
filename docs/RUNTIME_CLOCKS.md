# Runtime Clocks Runbook: GCP Primary, GitHub Actions Fenced Fallback

- **Status:** IMPLEMENTED (PR `ops/gha-fallback-fence`, 2026-10-04). Not yet EXERCISED in production until merged and observed.
- **Authority:** ADR-009 (GCP Cloud Run executes sub-6-hour batch clocks; GitHub remembers code, history and docs). Owner approval for this fence: 2026-10-04.
- **Rule:** GCP Cloud Run is the **primary** runtime for lake publication and candidate shadow dispatch. The GitHub Actions workflows for the same work are **fenced fallbacks**. They never run while a GCP execution can be running, and they do nothing while GCP is healthy.

## 1. Clock inventory (all times UTC; Asia/Singapore is UTC+8, same minute)

| Work | Primary (GCP) | Fallback (GitHub Actions) | Other clocks |
|---|---|---|---|
| Lake publish (`lake:sync` + enroll) | `lake-publish-job`, scheduler `lake-publish-hourly` `47 * * * *` (hourly at :47 UTC = :47 SGT) | `gha-lake-publish.yml` `7 4,16 * * *` (04:07 / 16:07 UTC = 12:07 / 00:07 SGT), fenced | none |
| Shadow dispatch (`POST /api/cron/shadow-dispatch`) | `shadow-dispatch-job`, scheduler `shadow-dispatch-hourly` `53 * * * *` (hourly at :53) | `gha-shadow-dispatch.yml` `9 * * * *` (hourly at :09), fenced | Cloudflare freshness Worker calls the same route at :20 every hour (`workers/freshness-cron`) |
| Fallback-clock liveness | none | `gha-shadow-dispatch-watchdog.yml` `37 * * * *`, read-only (GitHub API + issues) | none |

Both GCP jobs: project `antigravity-494415`, region `asia-southeast1`, image pinned by digest, git-sha label `780f0e86` at the time of writing. Task timeout 300 s, `maxRetries` 1. Schedulers have no retry (`retryCount` 0 / `maxRetryDuration` 0 s), attempt deadline 180 s.

**Measured GCP durations** (Cloud Run executions API, every retained execution, 2026-10-01 11:52 → 2026-10-04 01:53 UTC):

| Job | Executions | Run time p50 / p95 / max | Create→complete p50 / p95 / max | Failures |
|---|---|---|---|---|
| `lake-publish-job` | 68 | 28.5 / 34.9 / 42.5 s | 32.7 / 42.0 / 46.6 s | 1 (2026-10-01 12:49 UTC, during first deploy) |
| `shadow-dispatch-job` | 67 | 10.7 / 20.4 / 22.5 s | 13.9 / 24.8 / 26.7 s | 0 |

The fence uses the **design worst case**, not the measurement: 300 s × 2 attempts + start lag ≈ 11 min per slot.

**Measured GitHub delivery** (2026-09-29 → 10-03): `gha-lake-publish.yml` runs arrived **about 3–9 hours after their scheduled tick**. The hourly `gha-shadow-dispatch.yml` delivered only about 4–5 runs a day, at **effectively random minutes**. Several landed inside the GCP slots, for example shadow fallback at 20:47, 19:58, 23:56 and 20:53 UTC, and lake fallback at 09:50 UTC (3 minutes after that hour's GCP lake publish). The cron minute alone therefore fences nothing.

## 2. The fence (`scripts/gha/gcp-fallback-gate.ts`, pure logic in `scripts/gha/gcp-fallback-fence.ts`)

Every fallback run, scheduled or manual, runs the gate before any work. The workflow runs the job steps only when the gate outputs `proceed=true`.

### 2.1 Time fence (deterministic, needs no credentials)

```text
minute of hour (UTC; SGT has the same minutes)
:00      :07                :19 :22                       :45 :47      :53     :58    :04 :07
 |########|------------------|##|--------------------------|###|########|#######|######|##|
 |  GCP   |                  |W |                          |pre| lake   |shadow | tails |  |
 | tail   |   FREE: fallback |  |  FREE: fallback work     |   | slot   | slot  |(worst |  |
 |        |   work may run   |  |  may run                 |   | ■ 47s  | ■ 27s | case) |  |
 |        |                  |  |                          |   | max    | max   |       |  |
 GCP exclusion zone = [:45, :07)  (both slots + 11 min worst case + 2 min before / 3 min after)
 W = Cloudflare Worker shadow call at :20 -> shadow fallback also avoids [:19, :22)
 Measured GCP runs: lake :47:00-:47:47, shadow :53:00-:53:27 (max create->complete)
```

- Work may **start** only if `[start, start + work budget)` touches no busy interval. Budgets: shadow 4 min; lake 10 min (18 with manual discovery).
- If the run arrives inside or too close to a busy interval, the gate **waits** for the next free window (at most ~25 min for shadow, longer for the lake straddle below). It never shortens the fence.
- The exclusion zone is computed from `GCP_SLOT_MINUTE`. If a scheduler moves, update that constant and this runbook in the same PR.

### 2.2 Health fence (runs only when GCP missed its slot or failed)

Signals in order of preference. **Unknown evidence always means standby**, with a `::warning::` annotation.

1. **Cloud Run executions API** (authoritative), used when the repo secret `GCP_RUN_VIEWER_SA_KEY` exists. Standby if an execution is running now, or if one succeeded at or after the latest settled slot (15 min tolerance for a manual run just before it). Otherwise the result is takeover ("failed" or "missed").
   - **Status: the secret does not exist yet.** The existing `GCP_SA_KEY` is deliberately **not** used. It belongs to the only custom service account (`va-hub-scheduler-invoker`), which runs the jobs, holds their Secret Manager access, and can deploy and create secrets. It is not a read-only credential.
   - The Cloud Run API rejects the `cloud-platform.read-only` OAuth scope (HTTP 403, verified 2026-10-04), so least privilege must come from IAM. Owner action: create a dedicated service account with only `roles/run.viewer` on the project and store its JSON key as `GCP_RUN_VIEWER_SA_KEY`. Workload Identity Federation (keyless) is a better long-term option. No code change is needed when the secret appears.
2. **Data-plane proxy** (used now, existing secrets, read-only):
   - **Shadow:** a single D1 `SELECT` (`MAX(source_shadow_observations.observed_at)`, count of `source_registry` rows in `shadow`) through repo-pinned Wrangler. This is the same read-only pattern as the SP-21 Hunter fence. Takeover only if shadow rows exist and **no clock** has recorded an observation for ≥ 4 h. Normal gaps are up to ~3 h because cadence floors leave many slots with `eligible=0`. The GCP job writes no per-run heartbeat, so this proxy reads the effect the primary is responsible for.
   - **Lake:** a backlog **straddle**. Snapshot A is an inventory-aware `lake:sync` **dry run** plus `COUNT/MAX(synced_to_d1_at)` from Turso, taken before a :47 slot. If A finds nothing publishable, the run stands by at once (the normal case: GCP syncs 0 most hours). Otherwise the gate waits until that slot has certainly settled and the free window opens, then takes snapshot B. Takeover only if rows are still publishable **and** `synced_to_d1_at` did not advance. Rows that appear after the slot never trigger a takeover; they belong to GCP's next slot.

### 2.3 Concurrency and locks

- Each workflow keeps its own concurrency group (`gha-shadow-dispatch`, `gha-lake-publish`, `cancel-in-progress: false`), so two GitHub runs of the same workflow never overlap. A newer tick queues behind a waiting run.
- **Cross-runtime (GHA ↔ GCP):** there is no shared database lock or lease. Mutual exclusion comes from the time fence plus the health fence above. Mitigations already in the jobs: the shadow route's per-identity cadence floor (60 min minimum; it reads the last observation before probing, which is not an atomic lease), and `lake:sync`'s idempotent `ON CONFLICT(source_url)` upsert. Publication ledger receipts are **not** idempotent across two concurrent syncs. This is exactly why the fence exists.

## 3. Manual operation

- **Normal manual run:** Actions → workflow → Run workflow. It goes through the same gate and is usually a standby.
- **Emergency (`force: true`):** skips the **health** check only. The time fence still applies: the run waits for the free window and never starts inside `[:45, :07)`. Use it only when GCP is known broken and the data-plane evidence is unavailable.
- **Discovery (`discover: true`, lake workflow):** GHA-only work that GCP does not do. It is time-fenced, not health-gated. It is manual only, because the old `github.event.schedule == '17 4 * * *'` condition never matched the `17 4,16 * * *` cron string.
- **Kill switches (owner actions):** disable the GitHub workflow; `lake:sync --hold-auto-approved`; pause the GCP scheduler (`lake-publish-hourly` / `shadow-dispatch-hourly`), which makes the fallback take over after the fence detects the missed slot.

## 4. Reading a run

The gate step prints `DECISION {...}` and writes a step-summary block. A `gate.json` artifact is uploaded on every run. `STANDBY (no-op)` with a reason such as "GCP succeeded at … covering the … slot" or "lake:sync dry run finds nothing publishable" is the expected steady state. `RUN FALLBACK` means GCP missed or failed a slot. Investigate the GCP job (`gcp-deploy.py status <job>`) the same day.
