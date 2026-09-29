// MATH-12 EX-03 schedule watchdog: thin CLI around the pure decision
// function below. GitHub schedules have no delivery SLA, so this evaluates
// only *scheduled* run recency for gha-shadow-dispatch.yml — a manual
// workflow_dispatch proves the route is reachable but does not prove the
// schedule fired, and must not reset the silence clock.
//
// Usage:
//   bun scripts/gha/evaluate-schedule-silence.ts <runs-json-path> \
//     [--now ISO] [--stale-after-hours N]
//
// <runs-json-path> is the file produced by:
//   gh run list --workflow gha-shadow-dispatch.yml --branch main \
//     --limit 20 --json createdAt,conclusion,event
// i.e. an array of `{ createdAt, conclusion, event }`. A missing file,
// unparseable JSON, or no scheduled runs degrade to "unknown" (no alert)
// rather than throwing, matching the fail-safe contract in
// evaluate-failover-clock.ts.
import { readFile } from "node:fs/promises";

export interface ScheduleRunRecord {
  createdAt?: string | null;
  conclusion?: string | null;
  event?: string | null;
}

export interface ScheduleSilenceDecision {
  status: "alert" | "healthy" | "unknown";
  alert: boolean;
  reason: string;
  evaluatedAt: string;
  lastScheduledRunAt: string | null;
  hoursSinceLastScheduledRun: number | null;
  staleAfterHours: number;
}

// Threshold 6h is measured, not guessed: over 7 days (2026-09-22 → 09-29)
// GitHub delivered only 25% of EX-03's hourly slots (42/168) with a 4.04h
// median inter-run gap and an 8.57h maximum — a 3h threshold would hold the
// alert state more than half the time (no signal discrimination), while 6h
// alerts on ~8/41 gaps (~20%) and still catches the 2026-09-29 7.2h+ event.
// No 7-day gap ever exceeded 9h. Re-measure before changing again.
export const DEFAULT_STALE_AFTER_HOURS = 6;

export function evaluateScheduleSilence(
  runs: ScheduleRunRecord[],
  now: string,
  staleAfterHours: number = DEFAULT_STALE_AFTER_HOURS,
): ScheduleSilenceDecision {
  const lastScheduledRunAt = scheduledRunTimes(runs)[0] ?? null;
  const base = { evaluatedAt: now, lastScheduledRunAt, staleAfterHours };

  if (lastScheduledRunAt === null) {
    // Fail-safe: missing evidence is "unknown", not an alert. The workflow
    // has months of scheduled history, so an empty list in practice means
    // the query degraded, not that the schedule is healthy.
    return {
      ...base,
      status: "unknown",
      alert: false,
      reason: "no scheduled-run evidence found (query degraded or workflow never scheduled)",
      hoursSinceLastScheduledRun: null,
    };
  }

  const lastMs = Date.parse(lastScheduledRunAt);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs)) {
    return {
      ...base,
      status: "unknown",
      alert: false,
      reason: "scheduled-run timestamp unparseable",
      hoursSinceLastScheduledRun: null,
    };
  }

  const hoursSince = (nowMs - lastMs) / 3_600_000;
  if (hoursSince > staleAfterHours) {
    return {
      ...base,
      status: "alert",
      alert: true,
      reason: `no scheduled EX-03 run in ${hoursSince.toFixed(2)}h (threshold ${staleAfterHours}h; GitHub schedules have no delivery SLA)`,
      hoursSinceLastScheduledRun: hoursSince,
    };
  }

  return {
    ...base,
    status: "healthy",
    alert: false,
    reason: `last scheduled run ${lastScheduledRunAt} within the ${staleAfterHours}h threshold`,
    hoursSinceLastScheduledRun: hoursSince,
  };
}

function scheduledRunTimes(runs: ScheduleRunRecord[]): string[] {
  return runs
    .filter((run) => run.event === "schedule")
    .map((run) => run.createdAt)
    .filter((createdAt): createdAt is string =>
      typeof createdAt === "string" && createdAt.length > 0 && Number.isFinite(Date.parse(createdAt)),
    )
    .sort((a, b) => Date.parse(b) - Date.parse(a));
}

async function main(argv: string[]): Promise<void> {
  const [diagnosticPath, ...rest] = argv;
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i];
    if (k?.startsWith("--")) flags.set(k.slice(2), rest[i + 1] ?? "");
  }
  const now = flags.get("now") || new Date().toISOString();
  const staleAfterHours = flags.has("stale-after-hours")
    ? Number.parseInt(flags.get("stale-after-hours")!, 10)
    : DEFAULT_STALE_AFTER_HOURS;

  let runs: ScheduleRunRecord[] = [];
  if (diagnosticPath) {
    try {
      const raw = await readFile(diagnosticPath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) runs = parsed;
    } catch (err) {
      console.error(`warning: could not read run evidence (${(err as Error).message}); treating as missing`);
    }
  }

  const decision = evaluateScheduleSilence(
    runs,
    now,
    Number.isFinite(staleAfterHours) ? staleAfterHours : DEFAULT_STALE_AFTER_HOURS,
  );
  console.log(JSON.stringify(decision));
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
