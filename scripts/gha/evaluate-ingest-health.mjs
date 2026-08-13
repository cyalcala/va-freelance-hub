import { readFile } from "node:fs/promises";

const DEFAULT_GRACE_HOURS = 2;
const DEFAULT_STALE_HOURS = 3;

/**
 * Convert the durable ingestion row into one reproducible watchdog verdict.
 * Missing rows are tolerated only during a bounded post-deploy grace period.
 */
export function evaluateIngestHealth({
  rows,
  workerDeployedAt,
  now = new Date().toISOString(),
  graceHours = DEFAULT_GRACE_HOURS,
  staleHours = DEFAULT_STALE_HOURS,
}) {
  const evaluatedAt = new Date(now);
  if (!Number.isFinite(evaluatedAt.getTime())) throw new Error("now must be an ISO timestamp");

  if (rows.length === 0) {
    const deployedAt = workerDeployedAt ? new Date(workerDeployedAt) : null;
    const deployAgeHours = deployedAt && Number.isFinite(deployedAt.getTime())
      ? (evaluatedAt.getTime() - deployedAt.getTime()) / 3_600_000
      : null;

    if (deployAgeHours !== null && deployAgeHours >= 0 && deployAgeHours < graceHours) {
      return {
        status: "grace",
        alert: false,
        reason: `awaiting first heartbeat (${deployAgeHours.toFixed(2)}h into ${graceHours}h grace)`,
        evaluatedAt: evaluatedAt.toISOString(),
      };
    }

    return {
      status: "alert",
      alert: true,
      reason: "diagnostic heartbeat row missing after deployment grace",
      evaluatedAt: evaluatedAt.toISOString(),
    };
  }

  const row = rows[0];
  const reasons = [];
  if (row.last_error && row.last_error !== "null") reasons.push(`degraded run: ${row.last_error}`);

  const rawHoursSinceAttempt = row.hours_since_attempt;
  const hoursSinceAttempt = Number(rawHoursSinceAttempt);
  if (rawHoursSinceAttempt === null || rawHoursSinceAttempt === undefined
      || !Number.isFinite(hoursSinceAttempt) || hoursSinceAttempt < 0) {
    reasons.push("heartbeat row has no valid last-attempt age");
  } else if (hoursSinceAttempt >= staleHours) {
    reasons.push(`no scrape run in ${hoursSinceAttempt}h (clock may be stopped)`);
  }

  return {
    status: reasons.length ? "alert" : "healthy",
    alert: reasons.length > 0,
    reason: reasons.join("; ") || `last run clean and heartbeat within ${staleHours}h`,
    evaluatedAt: evaluatedAt.toISOString(),
  };
}

if (import.meta.main) {
  const [diagnosticPath, workerDeployedAt = ""] = process.argv.slice(2);
  if (!diagnosticPath) throw new Error("usage: node evaluate-ingest-health.mjs <diagnostic-json> [worker-deployed-at]");

  const payload = JSON.parse(await readFile(diagnosticPath, "utf8"));
  const rows = payload?.[0]?.results ?? [];
  const result = evaluateIngestHealth({
    rows,
    workerDeployedAt: workerDeployedAt || null,
    now: process.env.WATCHDOG_NOW || new Date().toISOString(),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
