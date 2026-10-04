// GCP-primary fence gate for the GitHub Actions fallback workflows.
//
// Usage (from the repo root, inside a workflow step):
//   bun scripts/gha/gcp-fallback-gate.ts --job lake-publish-job|shadow-dispatch-job \
//     --work-budget-minutes N [--hold-window true] [--max-wait-minutes N] [--output gate.json]
//
// Environment:
//   FORCE=true                 manual emergency run: skips the HEALTH check only.
//                              The time fence (never inside a GCP slot) still applies.
//   GCP_RUN_VIEWER_SA_KEY      optional JSON key of a READ-ONLY service account
//                              (roles/run.viewer). When set, the Cloud Run
//                              executions API is the health signal. Read-only
//                              comes from the IAM role: the Cloud Run API rejects
//                              the cloud-platform.read-only OAuth scope (HTTP 403,
//                              verified 2026-10-04), so the token uses
//                              cloud-platform and the script only issues GETs.
//   CLOUDFLARE_API_TOKEN/_ACCOUNT_ID  proxy evidence: read-only D1 SELECTs.
//   TURSO_DATABASE_URL/_AUTH_TOKEN    proxy evidence for lake-publish: read-only.
//
// Writes `proceed=true|false` (and action/signal/reason/window_ok) to
// $GITHUB_OUTPUT. The workflow runs the job only when proceed == 'true'.
// Every evidence read here is a SELECT or a GET; this script never writes
// production data and never calls a mutating route.
import { spawnSync } from "node:child_process";
import { createSign } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  busyIntervalsFor,
  decideFromCloudRun,
  decideFromLakeStraddle,
  decideFromShadowHeartbeat,
  decideLakePrecheck,
  evaluateWindow,
  GCP_JOBS,
  nextSlotFireMs,
  parseUtc,
  slotSettledMs,
  type CloudRunExecutionLite,
  type FenceDecision,
  type GcpJob,
  type LakeBacklogSnapshot,
  type ShadowHeartbeat,
} from "./gcp-fallback-fence";

const REPO_ROOT = resolve(import.meta.dir, "..", "..");
const GCP_PROJECT = process.env.GCP_PROJECT_ID || "antigravity-494415";
const GCP_REGION = process.env.GCP_REGION || "asia-southeast1";
// Cloud Run rejects cloud-platform.read-only (403 "insufficient authentication
// scopes"), so least privilege must come from the service account's IAM role.
const TOKEN_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function log(message: string): void {
  console.log(`[gcp-fallback-gate ${new Date().toISOString()}] ${message}`);
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Mints a 10-minute access token from a service-account key (JWT bearer grant). */
export async function mintAccessToken(keyJson: string, fetchFn: typeof fetch = fetch, nowMs = Date.now()): Promise<string> {
  const key = JSON.parse(keyJson) as { client_email?: string; private_key?: string; token_uri?: string };
  if (!key.client_email || !key.private_key) throw new Error("service-account key is missing client_email/private_key");
  const tokenUri = key.token_uri || "https://oauth2.googleapis.com/token";
  const iat = Math.floor(nowMs / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({ iss: key.client_email, scope: TOKEN_SCOPE, aud: tokenUri, iat, exp: iat + 600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${base64url(signer.sign(key.private_key))}`;
  const response = await fetchFn(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
  });
  if (!response.ok) throw new Error(`token endpoint returned HTTP ${response.status}`);
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("token endpoint returned no access_token");
  return body.access_token;
}

/** Lists recent executions of a Cloud Run job (GET only). Null on any failure. */
export async function readCloudRunExecutions(
  job: GcpJob,
  keyJson: string,
  fetchFn: typeof fetch = fetch,
): Promise<CloudRunExecutionLite[] | null> {
  try {
    const token = await mintAccessToken(keyJson, fetchFn);
    const url = `https://run.googleapis.com/v2/projects/${GCP_PROJECT}/locations/${GCP_REGION}/jobs/${job}/executions?pageSize=25`;
    const response = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      log(`Cloud Run executions read failed: HTTP ${response.status}`);
      return null;
    }
    const body = (await response.json()) as { executions?: Array<Record<string, unknown>> };
    return (body.executions ?? []).map((e) => ({
      name: String(e.name ?? "").split("/").pop() || "unknown",
      createTime: (e.createTime as string) ?? null,
      completionTime: (e.completionTime as string) ?? null,
      succeededCount: Number(e.succeededCount ?? 0),
      failedCount: Number(e.failedCount ?? 0),
      cancelledCount: Number(e.cancelledCount ?? 0),
    }));
  } catch (err) {
    log(`Cloud Run executions read failed: ${(err as Error).message}`);
    return null;
  }
}

export const SHADOW_HEARTBEAT_SQL =
  "SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now') AS observation_utc, " +
  "(SELECT MAX(observed_at) FROM source_shadow_observations) AS last_observed_at, " +
  "(SELECT COUNT(*) FROM source_registry WHERE operational_state = 'shadow') AS shadow_rows;";

/** Parses `wrangler d1 execute --json` output into the first result row. */
export function parseWranglerFirstRow(output: string): Record<string, unknown> | null {
  const start = output.indexOf("[");
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(output.slice(start));
    const row = parsed?.[0]?.results?.[0];
    return row && typeof row === "object" ? row : null;
  } catch {
    return null;
  }
}

/** Read-only D1 SELECT through the repo-pinned Wrangler (same path as the SP-21 Hunter fence). */
function readShadowHeartbeat(): ShadowHeartbeat | null {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    log("CLOUDFLARE_API_TOKEN not configured; D1 heartbeat unavailable");
    return null;
  }
  const result = spawnSync(
    "npx",
    ["--yes", "wrangler@4.143.0", "d1", "execute", "DB", "--remote", "--env", "production",
      "--config", "wrangler.jsonc", "--json", "--command", SHADOW_HEARTBEAT_SQL],
    { cwd: join(REPO_ROOT, "apps", "web"), encoding: "utf8", timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    log(`D1 heartbeat query failed (exit ${result.status ?? "timeout"})`);
    return null;
  }
  const row = parseWranglerFirstRow(result.stdout);
  if (!row) return null;
  const shadowRows = Number(row.shadow_rows);
  return {
    lastObservedAt: row.last_observed_at == null ? null : String(row.last_observed_at),
    shadowRows: Number.isFinite(shadowRows) ? shadowRows : null,
  };
}

/** Read-only lake backlog snapshot: inventory-aware `lake:sync` DRY RUN plus a sync-progress SELECT. */
async function readLakeSnapshot(): Promise<LakeBacklogSnapshot | null> {
  if (!process.env.TURSO_DATABASE_URL || !process.env.CLOUDFLARE_API_TOKEN) {
    log("Turso or Cloudflare credentials not configured; lake backlog unavailable");
    return null;
  }
  const readAt = new Date().toISOString();
  const quiet = console.log;
  try {
    const sync = await import("../lake/sync-to-d1");
    const { getLakeClient } = await import("../lake/client");
    // The live job loads the D1 serving inventory before planning; the dry run
    // must plan with the same caps or it would count rows the job would hold.
    const inventory = sync.fetchD1InventorySnapshot(REPO_ROOT);
    if (!inventory) {
      log("D1 inventory snapshot unavailable; cannot plan like the live job");
      return null;
    }
    console.log = () => {};
    const dry = await sync.syncQualifiedJobsToD1(200, true, { holdAutoApproved: false, inventory });
    console.log = quiet;
    const progress = await getLakeClient().execute(
      "SELECT COUNT(*) AS synced_rows, MAX(synced_to_d1_at) AS last_synced_at FROM lake_candidate_jobs WHERE synced_to_d1_at IS NOT NULL;",
    );
    const row = progress.rows[0] ?? {};
    return {
      readAt,
      pendingStatements: Number(dry.syncedCount ?? 0),
      syncedRows: Number((row as Record<string, unknown>).synced_rows ?? 0),
      lastSyncedAt: (row as Record<string, unknown>).last_synced_at == null ? null : String((row as Record<string, unknown>).last_synced_at),
    };
  } catch (err) {
    console.log = quiet;
    log(`lake backlog snapshot failed: ${(err as Error).message}`);
    return null;
  }
}

interface GateOptions {
  job: GcpJob;
  workBudgetMinutes: number;
  holdWindow: boolean;
  maxWaitMinutes: number;
  force: boolean;
  output: string | null;
}

export function parseArgs(argv: string[], env: Record<string, string | undefined> = process.env): GateOptions {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    if (!k?.startsWith("--")) throw new Error(`unexpected argument ${k}`);
    flags.set(k.slice(2), argv[i + 1] ?? "");
  }
  const job = flags.get("job") as GcpJob;
  if (!GCP_JOBS.includes(job)) throw new Error(`--job must be one of ${GCP_JOBS.join(", ")}`);
  const budget = Number(flags.get("work-budget-minutes") ?? "");
  if (!Number.isFinite(budget) || budget <= 0 || budget > 30) throw new Error("--work-budget-minutes must be in (0, 30]");
  const maxWait = Number(flags.get("max-wait-minutes") ?? "100");
  return {
    job,
    workBudgetMinutes: budget,
    holdWindow: flags.get("hold-window") === "true",
    maxWaitMinutes: Number.isFinite(maxWait) && maxWait >= 0 ? maxWait : 100,
    force: (env.FORCE ?? "").toLowerCase() === "true",
    output: flags.get("output") || null,
  };
}

async function main(argv: string[]): Promise<void> {
  const opts = parseArgs(argv);
  const startedMs = Date.now();
  const deadlineMs = startedMs + opts.maxWaitMinutes * 60_000;
  const busy = busyIntervalsFor(opts.job);
  log(`job=${opts.job} budget=${opts.workBudgetMinutes}min force=${opts.force} busy=${busy.map((b) => `[:${String(b.startMinute).padStart(2, "0")},:${String(b.endMinute).padStart(2, "0")})`).join(" ")}`);

  /** Sleeps until `targetMs`; false when that would pass the wait deadline. */
  const sleepUntil = async (targetMs: number, why: string): Promise<boolean> => {
    const waitMs = targetMs - Date.now();
    if (waitMs <= 0) return true;
    if (targetMs > deadlineMs) {
      log(`would need to wait until ${new Date(targetMs).toISOString()} (${why}); exceeds --max-wait-minutes`);
      return false;
    }
    log(`waiting ${Math.ceil(waitMs / 1000)}s until ${new Date(targetMs).toISOString()} (${why})`);
    await Bun.sleep(waitMs);
    return true;
  };
  const waitForWindow = async (): Promise<boolean> => {
    const w = evaluateWindow(Date.now(), busy, opts.workBudgetMinutes);
    if (w.ok) return true;
    return sleepUntil(w.windowStartMs, `time fence: ${w.blockedBy}`);
  };

  let decision: FenceDecision | null = null;
  const viewerKey = process.env.GCP_RUN_VIEWER_SA_KEY || "";

  if (opts.force) {
    decision = { action: "takeover", signal: "force", reason: "manual workflow_dispatch with force=true: health check skipped by operator" };
    if (!(await waitForWindow())) decision = { action: "standby", signal: "force", reason: "forced, but no free window before the wait limit" };
  } else {
    if (!(await waitForWindow())) {
      decision = { action: "standby", signal: viewerKey ? "cloud-run-executions" : opts.job === "shadow-dispatch-job" ? "d1-shadow-heartbeat" : "turso-lake-backlog-straddle", reason: "no free window before the wait limit" };
    } else if (viewerKey) {
      const executions = await readCloudRunExecutions(opts.job, viewerKey);
      const d = decideFromCloudRun(executions, Date.now(), opts.job);
      log(`cloud-run: ${d.action} — ${d.reason}`);
      if (d.action !== "unknown") decision = d;
      else log("Cloud Run signal unknown; falling back to the data-plane proxy");
    } else {
      log("GCP_RUN_VIEWER_SA_KEY not configured; using the data-plane proxy signal");
    }

    if (!decision && opts.job === "shadow-dispatch-job") {
      decision = decideFromShadowHeartbeat(readShadowHeartbeat(), Date.now());
    }

    if (!decision && opts.job === "lake-publish-job") {
      const before = await readLakeSnapshot();
      log(`lake snapshot before: ${JSON.stringify(before)}`);
      decision = decideLakePrecheck(before);
      if (!decision) {
        const slot = nextSlotFireMs("lake-publish-job", parseUtc(before!.readAt)!);
        log(`backlog present; straddling the GCP lake-publish slot at ${new Date(slot).toISOString()}`);
        if (!(await sleepUntil(slotSettledMs(slot), "GCP slot must settle")) || !(await waitForWindow())) {
          decision = { action: "standby", signal: "turso-lake-backlog-straddle", reason: "straddle would exceed the wait limit" };
        } else {
          const after = await readLakeSnapshot();
          log(`lake snapshot after: ${JSON.stringify(after)}`);
          decision = decideFromLakeStraddle(before, after, slot);
        }
      }
    }
  }

  decision ??= { action: "unknown", signal: "cloud-run-executions", reason: "no decision" };
  let proceed = decision.action === "takeover";
  // Discovery-style GHA-only work may still need the free window on standby.
  if ((proceed || opts.holdWindow) && !evaluateWindow(Date.now(), busy, opts.workBudgetMinutes).ok) {
    if (!(await waitForWindow())) {
      proceed = false;
      decision = { ...decision, reason: `${decision.reason}; window closed before work could start` };
    }
  }
  const windowOk = evaluateWindow(Date.now(), busy, opts.workBudgetMinutes).ok;
  if (!windowOk) proceed = false;

  const result = {
    job: opts.job,
    proceed,
    windowOk,
    action: decision.action,
    signal: decision.signal,
    reason: decision.reason,
    waitedSeconds: Math.round((Date.now() - startedMs) / 1000),
    evaluatedAt: new Date().toISOString(),
  };
  log(`DECISION ${JSON.stringify(result)}`);
  if (decision.action === "unknown") console.log(`::warning title=GCP fallback fence::health evidence unknown, fallback stays idle: ${decision.reason}`);
  if (proceed) console.log(`::notice title=GCP fallback fence::fallback takeover for ${opts.job}: ${decision.reason}`);
  if (opts.output) writeFileSync(opts.output, `${JSON.stringify(result, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) {
    const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ");
    appendFileSync(process.env.GITHUB_OUTPUT, [
      `proceed=${proceed}`, `window_ok=${windowOk}`, `action=${decision.action}`,
      `signal=${decision.signal}`, `reason=${oneLine(decision.reason)}`, "",
    ].join("\n"));
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      `### GCP-primary fence: ${opts.job}`,
      `- Decision: **${proceed ? "RUN FALLBACK" : "STANDBY (no-op)"}** (${decision.action}, signal \`${decision.signal}\`)`,
      `- Reason: ${decision.reason}`,
      `- Time fence: busy ${busy.map((b) => `[:${String(b.startMinute).padStart(2, "0")}, :${String(b.endMinute).padStart(2, "0")}) UTC`).join(", ")}; work budget ${opts.workBudgetMinutes} min; waited ${result.waitedSeconds}s`,
      "",
    ].join("\n"));
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

