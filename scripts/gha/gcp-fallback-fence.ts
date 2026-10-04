// GCP-primary fence for the GitHub Actions fallback clocks.
//
// Google Cloud Run is the primary runtime for the two sub-6-hour batch jobs
// (ADR-009): `lake-publish-job` (Cloud Scheduler `47 * * * *` UTC) and
// `shadow-dispatch-job` (`53 * * * *` UTC). The GitHub Actions workflows
// `gha-lake-publish.yml` and `gha-shadow-dispatch.yml` are FALLBACKS only.
// They must never run the job while a GCP execution can be running, and they
// must not repeat work a healthy GCP slot already did.
//
// This file is PURE: no I/O, no clock reads, no environment access. The CLI
// wrapper (scripts/gha/gcp-fallback-gate.ts) gathers evidence and executes
// only what these functions return. Same split as packages/scraper/
// failover-clock.ts (SP-21) and scripts/gha/evaluate-failover-clock.ts.
//
// Two independent fences:
//
// 1. TIME fence (deterministic, needs no credentials). GitHub schedules have
//    no delivery SLA: measured 2026-09-29..10-03, gha-lake-publish.yml runs
//    arrived ~3-9 h after their tick and the hourly gha-shadow-dispatch.yml
//    delivered ~4-5 runs/day at effectively random minutes, several inside
//    the GCP slots. The cron minute alone therefore fences nothing. The
//    gate refuses to START fallback work unless the whole work budget fits
//    outside every busy interval below, and waits for the next free window
//    instead.
//
// 2. HEALTH fence. Fallback work runs only when evidence shows the GCP
//    primary missed its slot or failed. Missing or unreadable evidence is
//    "unknown", and unknown never runs the job (fail safe: a wrong takeover
//    doubles a healthy primary; a wrong standby only waits for the next tick).

export type GcpJob = "lake-publish-job" | "shadow-dispatch-job";

export const GCP_JOBS: readonly GcpJob[] = ["lake-publish-job", "shadow-dispatch-job"];

/** Cloud Scheduler fire minute (UTC, hourly) per job. Read from the live
 * schedulers on 2026-10-04 (lake-publish-hourly, shadow-dispatch-hourly). */
export const GCP_SLOT_MINUTE: Record<GcpJob, number> = {
  "lake-publish-job": 47,
  "shadow-dispatch-job": 53,
};

/** Design worst case for one GCP slot, in minutes from the scheduler fire:
 * task timeout 300 s x 2 attempts (maxRetries 1) + ~10 s start lag each
 * = 10.3 min, rounded up. Measured (68 + 67 executions, 2026-10-01..04):
 * lake-publish max 43 s run / 47 s create->complete, shadow-dispatch max
 * 22 s / 27 s. Schedulers have no retry (retryCount 0 / maxRetryDuration 0 s),
 * so a slot never fires a second execution later. */
export const GCP_WORST_CASE_SLOT_MINUTES = 11;
export const PRE_SLOT_MARGIN_MINUTES = 2;
export const POST_SLOT_MARGIN_MINUTES = 3;

/** A minute-of-hour interval [startMinute, endMinute) repeating every hour (UTC).
 * endMinute <= startMinute means the interval wraps past the top of the hour. */
export interface HourlyInterval {
  startMinute: number;
  endMinute: number;
  label: string;
}

/** Union of both GCP slots plus margins: [:45, :07). Computed, not typed in,
 * so a scheduler move only needs GCP_SLOT_MINUTE updated. */
export function gcpExclusionInterval(): HourlyInterval {
  const minutes = GCP_JOBS.map((job) => GCP_SLOT_MINUTE[job]);
  const start = (Math.min(...minutes) - PRE_SLOT_MARGIN_MINUTES + 60) % 60;
  const end = (Math.max(...minutes) + GCP_WORST_CASE_SLOT_MINUTES + POST_SLOT_MARGIN_MINUTES) % 60;
  return {
    startMinute: start,
    endMinute: end,
    label: "GCP Cloud Run slots (lake-publish :47, shadow-dispatch :53, worst-case run + margins)",
  };
}

/** The Cloudflare freshness Worker also POSTs /api/cron/shadow-dispatch at
 * minute :20 (workers/freshness-cron/src/index.ts). Not a GCP run, but two
 * concurrent dispatches race the per-identity cadence read, so the GHA
 * shadow fallback stays clear of it too. */
export const WORKER_SHADOW_INTERVAL: HourlyInterval = {
  startMinute: 19,
  endMinute: 22,
  label: "Cloudflare Worker shadow-dispatch call at :20",
};

export function busyIntervalsFor(job: GcpJob): HourlyInterval[] {
  return job === "shadow-dispatch-job"
    ? [gcpExclusionInterval(), WORKER_SHADOW_INTERVAL]
    : [gcpExclusionInterval()];
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

function occurrences(interval: HourlyInterval, fromMs: number, hours: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const firstHour = Math.floor(fromMs / HOUR_MS) * HOUR_MS - HOUR_MS;
  for (let h = 0; h <= hours + 1; h += 1) {
    const base = firstHour + h * HOUR_MS;
    const start = base + interval.startMinute * MINUTE_MS;
    let end = base + interval.endMinute * MINUTE_MS;
    if (interval.endMinute <= interval.startMinute) end += HOUR_MS;
    out.push([start, end]);
  }
  return out;
}

export interface WindowEvaluation {
  /** True when [now, now + budget) touches no busy interval. */
  ok: boolean;
  /** Milliseconds to wait until a free window of the full budget starts (0 when ok). */
  waitMs: number;
  /** Absolute start of that free window (epoch ms). */
  windowStartMs: number;
  /** Busy interval that blocked `now`, if any. */
  blockedBy: string | null;
}

/**
 * Time fence. Work may start at `nowMs` only if the whole work budget ends
 * before the next busy interval begins. Otherwise returns the earliest later
 * start that fits. Never throws for finite inputs.
 */
export function evaluateWindow(nowMs: number, busy: HourlyInterval[], workBudgetMinutes: number): WindowEvaluation {
  if (!Number.isFinite(nowMs)) throw new Error("evaluateWindow: now must be finite");
  const budgetMs = Math.max(0, workBudgetMinutes) * MINUTE_MS;
  const spans = busy.flatMap((interval) => occurrences(interval, nowMs, 4).map(([s, e]) => ({ s, e, label: interval.label })));
  const blocker = (start: number) => spans.find(({ s, e }) => start < e && start + budgetMs > s);
  const first = blocker(nowMs);
  if (!first) return { ok: true, waitMs: 0, windowStartMs: nowMs, blockedBy: null };
  const candidates = spans.map(({ e }) => e).filter((e) => e > nowMs).sort((a, b) => a - b);
  for (const candidate of candidates) {
    if (!blocker(candidate)) {
      return { ok: false, waitMs: candidate - nowMs, windowStartMs: candidate, blockedBy: first.label };
    }
  }
  throw new Error("evaluateWindow: no free window within 4 hours (work budget larger than the free span?)");
}

/** Next scheduler fire for `job` at or after `afterMs` (epoch ms). */
export function nextSlotFireMs(job: GcpJob, afterMs: number): number {
  const base = Math.floor(afterMs / HOUR_MS) * HOUR_MS + GCP_SLOT_MINUTE[job] * MINUTE_MS;
  return base >= afterMs ? base : base + HOUR_MS;
}

/** Instant by which a slot fired at `fireMs` has certainly finished. */
export function slotSettledMs(fireMs: number): number {
  return fireMs + (GCP_WORST_CASE_SLOT_MINUTES + POST_SLOT_MARGIN_MINUTES) * MINUTE_MS;
}

// ---------------------------------------------------------------------------
// Health decisions
// ---------------------------------------------------------------------------

export type FenceAction = "standby" | "takeover" | "unknown";
export type FenceSignal =
  | "force"
  | "cloud-run-executions"
  | "d1-shadow-heartbeat"
  | "turso-lake-backlog-straddle";

export interface FenceDecision {
  action: FenceAction;
  signal: FenceSignal;
  reason: string;
}

/** Parses ISO-8601 or SQLite `YYYY-MM-DD HH:MM:SS` (UTC) timestamps. */
export function parseUtc(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const sqlite = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw);
  const ms = Date.parse(sqlite ? `${raw.replace(" ", "T")}Z` : raw);
  return Number.isFinite(ms) ? ms : null;
}

/** Subset of a Cloud Run v2 Execution resource. */
export interface CloudRunExecutionLite {
  name: string;
  createTime?: string | null;
  completionTime?: string | null;
  succeededCount?: number | null;
  failedCount?: number | null;
  cancelledCount?: number | null;
}

/** A success this long before the latest slot fire still covers that slot
 * (e.g. a manual deploy run just before :47). The previous scheduled slot is
 * 60 min earlier, so it can never satisfy this. */
export const CLOUD_RUN_PRE_SLOT_TOLERANCE_MINUTES = 15;
/** An unfinished execution created this recently counts as running. */
export const CLOUD_RUN_RUNNING_LOOKBACK_MINUTES = 30;

/** Most recent scheduler fire for `job` that has certainly settled by `nowMs`. */
export function latestSettledSlotFireMs(job: GcpJob, nowMs: number): number {
  let fire = nextSlotFireMs(job, nowMs) - HOUR_MS;
  while (slotSettledMs(fire) > nowMs) fire -= HOUR_MS;
  return fire;
}

/**
 * Health from the Cloud Run executions API (authoritative when available).
 * Standby iff an execution is running now, or one succeeded at or after the
 * latest settled slot (minus a small tolerance). Otherwise GCP missed or
 * failed that slot: takeover. `executions === null` (read failed, or no
 * credential) is unknown.
 */
export function decideFromCloudRun(
  executions: CloudRunExecutionLite[] | null,
  nowMs: number,
  job: GcpJob,
): FenceDecision {
  const signal: FenceSignal = "cloud-run-executions";
  if (executions === null) return { action: "unknown", signal, reason: "Cloud Run executions could not be read" };
  const running = executions.find((e) => {
    if (e.completionTime) return false;
    const created = parseUtc(e.createTime);
    return created !== null && nowMs - created <= CLOUD_RUN_RUNNING_LOOKBACK_MINUTES * MINUTE_MS && nowMs - created >= -5 * MINUTE_MS;
  });
  if (running) return { action: "standby", signal, reason: `GCP execution ${running.name} is running now` };
  const slot = latestSettledSlotFireMs(job, nowMs);
  const slotIso = new Date(slot).toISOString();
  let lastSuccess: number | null = null;
  let lastCompleted: { at: number; ok: boolean; name: string } | null = null;
  for (const e of executions) {
    const done = parseUtc(e.completionTime);
    if (done === null) continue;
    const ok = (e.succeededCount ?? 0) > 0 && (e.failedCount ?? 0) === 0 && (e.cancelledCount ?? 0) === 0;
    if (ok && (lastSuccess === null || done > lastSuccess)) lastSuccess = done;
    if (!lastCompleted || done > lastCompleted.at) lastCompleted = { at: done, ok, name: e.name };
  }
  if (lastSuccess !== null && lastSuccess >= slot - CLOUD_RUN_PRE_SLOT_TOLERANCE_MINUTES * MINUTE_MS) {
    return { action: "standby", signal, reason: `GCP succeeded at ${new Date(lastSuccess).toISOString()}, covering the ${slotIso} slot` };
  }
  if (lastCompleted && !lastCompleted.ok && lastCompleted.at >= slot) {
    return { action: "takeover", signal, reason: `GCP execution ${lastCompleted.name} for the ${slotIso} slot failed` };
  }
  const last = lastSuccess === null ? "none in retained history" : new Date(lastSuccess).toISOString();
  return { action: "takeover", signal, reason: `GCP missed the ${slotIso} slot (last success: ${last})` };
}

export interface ShadowHeartbeat {
  /** MAX(source_shadow_observations.observed_at), written by every clock that
   * actually probes (GCP :53, Worker :20, or this fallback). */
  lastObservedAt: string | null;
  /** COUNT(*) of source_registry rows in operational_state='shadow'. */
  shadowRows: number | null;
}

/** Normal gap between observations is up to ~3 h, because per-identity
 * cadence floors leave many hourly slots with eligible=0 (GCP logs
 * 2026-10-03..04). One extra missed hour on top of that is 4 h. */
export const SHADOW_STALE_AFTER_MINUTES = 240;

/**
 * Proxy health for shadow dispatch when the Cloud Run API is unavailable.
 * The GCP job writes no per-run heartbeat, so this reads the effect the
 * primary is responsible for: fresh shadow observations from any clock.
 */
export function decideFromShadowHeartbeat(
  heartbeat: ShadowHeartbeat | null,
  nowMs: number,
  staleAfterMinutes = SHADOW_STALE_AFTER_MINUTES,
): FenceDecision {
  const signal: FenceSignal = "d1-shadow-heartbeat";
  if (!heartbeat || heartbeat.shadowRows === null || !Number.isFinite(heartbeat.shadowRows)) {
    return { action: "unknown", signal, reason: "D1 shadow heartbeat could not be read" };
  }
  if (heartbeat.shadowRows <= 0) {
    return { action: "standby", signal, reason: "no source_registry rows are in shadow state; nothing to dispatch" };
  }
  if (heartbeat.lastObservedAt === null) {
    return { action: "takeover", signal, reason: `${heartbeat.shadowRows} shadow row(s) and no shadow observation recorded by any clock` };
  }
  const last = parseUtc(heartbeat.lastObservedAt);
  if (last === null) return { action: "unknown", signal, reason: `unparseable last observation ${JSON.stringify(heartbeat.lastObservedAt)}` };
  if (last - nowMs > 5 * MINUTE_MS) return { action: "unknown", signal, reason: "last observation is in the future (clock skew)" };
  const age = Math.round((nowMs - last) / MINUTE_MS);
  if (age >= staleAfterMinutes) {
    return { action: "takeover", signal, reason: `last shadow observation ${age} min ago (>= ${staleAfterMinutes} min): primary clocks are not observing` };
  }
  return { action: "standby", signal, reason: `last shadow observation ${age} min ago (< ${staleAfterMinutes} min)` };
}

export interface LakeBacklogSnapshot {
  /** Evaluation instant (ISO). */
  readAt: string;
  /** Statements an inventory-aware `lake:sync` dry run would execute (0 = nothing to publish). */
  pendingStatements: number;
  /** Rows ever marked synced (lake_candidate_jobs.synced_to_d1_at IS NOT NULL). */
  syncedRows: number;
  /** MAX(lake_candidate_jobs.synced_to_d1_at). */
  lastSyncedAt: string | null;
}

/** Pre-check: an empty backlog needs no straddle; the fallback has nothing to do. */
export function decideLakePrecheck(before: LakeBacklogSnapshot | null): FenceDecision | null {
  const signal: FenceSignal = "turso-lake-backlog-straddle";
  if (!before || !Number.isFinite(before.pendingStatements)) {
    return { action: "unknown", signal, reason: "lake backlog snapshot could not be read" };
  }
  if (before.pendingStatements <= 0) {
    return { action: "standby", signal, reason: "lake:sync dry run finds nothing publishable; nothing for the fallback to do" };
  }
  return null;
}

/**
 * Proxy health for lake publish when the Cloud Run API is unavailable.
 * Takes one backlog snapshot BEFORE a :47 slot fires and one AFTER it has
 * certainly settled. If rows that were publishable before the slot are still
 * publishable after it and the slot synced nothing, GCP missed or failed
 * that slot. Rows that appeared after the slot never trigger a takeover:
 * they belong to GCP's next slot.
 */
export function decideFromLakeStraddle(
  before: LakeBacklogSnapshot | null,
  after: LakeBacklogSnapshot | null,
  slotFireMs: number,
): FenceDecision {
  const signal: FenceSignal = "turso-lake-backlog-straddle";
  const pre = decideLakePrecheck(before);
  if (pre) return pre;
  if (!after || !Number.isFinite(after.pendingStatements)) {
    return { action: "unknown", signal, reason: "post-slot lake backlog snapshot could not be read" };
  }
  const beforeAt = parseUtc(before!.readAt);
  const afterAt = parseUtc(after.readAt);
  if (beforeAt === null || afterAt === null || beforeAt > slotFireMs || afterAt < slotSettledMs(slotFireMs)) {
    return { action: "unknown", signal, reason: "snapshots do not straddle a settled GCP lake-publish slot" };
  }
  if (after.pendingStatements <= 0) {
    return { action: "standby", signal, reason: "backlog cleared across the GCP slot" };
  }
  const progressed =
    after.syncedRows > before!.syncedRows ||
    (after.lastSyncedAt ?? "") > (before!.lastSyncedAt ?? "");
  if (progressed) {
    return { action: "standby", signal, reason: "the GCP slot synced rows (synced_to_d1_at advanced); remaining backlog is its to drain" };
  }
  return {
    action: "takeover",
    signal,
    reason: `rows publishable before the ${new Date(slotFireMs).toISOString()} slot are still unpublished after it and nothing was synced: GCP missed or failed the slot`,
  };
}
