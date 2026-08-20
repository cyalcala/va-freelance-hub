import { readFile } from "node:fs/promises";

const DEFAULT_GRACE_HOURS = 2;
const DEFAULT_STALE_HOURS = 3;
// Board-freshness backstop. The heartbeat above only proves the scrape RAN; it
// stays green during a "silent success" where every new job is filtered/parked
// and nothing reaches the public board (exactly the 2026-08-18 Inngest-divert
// freeze, which went unseen for ~30h). This alerts when no new VISIBLE job has
// been published in this many hours. Sized above the normal daily-batch cadence
// (the Workers-AI neuron cap means the board often refreshes once/day), so a
// breach means a missed cycle, not a quiet afternoon. Absent value = skip.
const DEFAULT_BOARD_STALE_HOURS = 36;

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
  boardStaleHours = DEFAULT_BOARD_STALE_HOURS,
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

  // Board-freshness backstop (see DEFAULT_BOARD_STALE_HOURS). Only evaluated when
  // the query supplied a valid age, so older watchdog data never false-alarms.
  const rawBoardAge = row.board_stale_hours;
  const boardAge = Number(rawBoardAge);
  if (
    rawBoardAge !== null && rawBoardAge !== undefined && rawBoardAge !== "null" &&
    Number.isFinite(boardAge) && boardAge >= 0 && boardAge >= boardStaleHours
  ) {
    reasons.push(`board frozen: no new visible job in ${boardAge}h (scrape green but publishing nothing)`);
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
