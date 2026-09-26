import { getLakeClient } from "./client";
import { toContentHash } from "../../packages/scraper/contentHash";
import { decideAutoPublish, parseJevRaw, type InventorySnapshot } from "./auto-publish-policy";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface CandidateRow {
  id: number;
  source_id: string;
  source_platform: string;
  source_url: string;
  title: string;
  company: string | null;
  category: string;
  location_raw: string | null;
  description: string | null;
  application_url: string | null;
  posted_at: string | null;
  geo_scope: string;
  ph_eligibility: string;
  fingerprint_hash: string;
}

// Canonical exact-six + active registry sources (always authorized)
const BASE_AUTHORIZED_SOURCE_IDS = new Set([
  "we-work-remotely",
  "remotive",
  "real-work-from-anywhere",
  "jobicy-admin-support-apac",
  "jobicy-supporting-apac",
  "remote-ok",
  "himalayas:remote-jobs",
  "breezy:20four7va",
  "breezy:sourcefit",
  "breezy:yokly",
  "breezy:remote-craft",
  "breezy:value-virtual-assistants",
]);

/**
 * Auto-approved lake tenants publish when `decideAutoPublish` says so.
 * There is no human approval flag. `--hold-auto-approved` is the kill switch.
 * `--allow-auto-approved` remains as a no-op alias so older commands still run.
 */
export function parseSyncArgs(argv: string[]): {
  limit: number;
  dryRun: boolean;
  holdAutoApproved: boolean;
} {
  const DEFAULT_LIMIT = 200;
  const MAX_LIMIT = 500;
  let limit = DEFAULT_LIMIT;
  for (const arg of argv) {
    const n = Number.parseInt(arg, 10);
    if (Number.isSafeInteger(n) && n > 0) {
      limit = Math.min(n, MAX_LIMIT);
      break;
    }
  }
  return {
    limit,
    dryRun: argv.includes("--dry-run"),
    holdAutoApproved: argv.includes("--hold-auto-approved"),
  };
}

export interface DiscoveryTenantRow {
  source_id: string;
  job_count: number;
  qualified_ready: number;
  ph_rate: number;
  jev_raw: string | null;
}

export interface PlannedSource {
  sourceId: string;
  publishCount: number;
  reason: string;
}

export function planAutoPublishSources(
  tenants: DiscoveryTenantRow[],
  inventory: InventorySnapshot | null,
  holdAutoApproved: boolean,
): PlannedSource[] {
  if (holdAutoApproved) return [];
  const planned: PlannedSource[] = [];
  for (const tenant of tenants) {
    if (!tenant.source_id) continue;
    const jev = parseJevRaw(tenant.jev_raw);
    const qualifiedReady = Math.max(tenant.qualified_ready, 0);
    const totalJobs = Math.max(tenant.job_count, qualifiedReady);
    const decision = decideAutoPublish({
      sourceId: tenant.source_id,
      totalJobs,
      qualifiedReady,
      jevChoice: jev?.choice ?? null,
      jevConfidence: jev?.confidence ?? null,
      inventory,
    });
    console.log(`  [AutoPublish] ${tenant.source_id}: ${decision.action} x${decision.publishCount} — ${decision.reason}`);
    if (decision.action === "PUBLISH" && decision.publishCount > 0) {
      planned.push({ sourceId: tenant.source_id, publishCount: decision.publishCount, reason: decision.reason });
    }
  }
  return planned;
}

export async function loadAutoApprovedTenants(
  client: ReturnType<typeof getLakeClient>,
): Promise<DiscoveryTenantRow[]> {
  try {
    const res = await client.execute(`
      SELECT source_id, job_count, qualified_ready, ph_rate, jev_raw
      FROM lake_ats_discovery
      WHERE review_status = 'auto_approved';
    `);
    return res.rows.map((row) => ({
      source_id: String(row.source_id ?? ""),
      job_count: Number(row.job_count ?? 0),
      qualified_ready: Number(row.qualified_ready ?? 0),
      ph_rate: Number(row.ph_rate ?? 0),
      jev_raw: row.jev_raw == null ? null : String(row.jev_raw),
    }));
  } catch (err: any) {
    if (!err.message?.includes("no such table")) {
      console.warn(`  [AuthSet] Could not query lake_ats_discovery: ${err.message}`);
    }
    return [];
  }
}

/**
 * SQLite string-literal escaping for the generated D1 batch file.
 * Single quotes are doubled (SQLite convention); NUL bytes are stripped
 * because SQLite text cannot contain them.
 */
export function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return "NULL";
  return `'${str.replace(/\0/g, "").replace(/'/g, "''")}'`;
}

/** Minimum-field guard: rows without a title and canonical URL are never synced. */
export function isSyncableCandidate(job: Pick<CandidateRow, "title" | "source_url">): boolean {
  return Boolean(job.title?.trim()) && Boolean(job.source_url?.trim());
}

/** Builds one idempotent upsert statement for a qualified lake candidate.
 *
 * HONESTY CONTRACT (§20 freshness, §2 anti-fabrication):
 * - Unknown `posted_at` stays SQL NULL (never `now()`). A sync event is not
 *   a posting event; downstream ordering already falls back via
 *   `coalesce(posted_at, scraped_at)`.
 * - `ph_eligibility` must already be `eligible_verified`/`eligible_likely`
 *   (the SELECT guarantees this); anything else throws instead of
 *   defaulting to `eligible_verified`.
 * - Unknown `geo_scope` stays `'unknown'` (the schema's honest value),
 *   never `'worldwide'`.
 */
export function buildSyncSql(job: CandidateRow): string {
  if (job.ph_eligibility !== "eligible_verified" && job.ph_eligibility !== "eligible_likely") {
    throw new Error(
      `Refusing to sync row id=${job.id} with ph_eligibility=${JSON.stringify(job.ph_eligibility)} (must be eligible_verified/eligible_likely).`
    );
  }
  const titleVal = escapeSql(job.title);
  const companyVal = escapeSql(job.company || "Unknown");
  const sourceUrlVal = escapeSql(job.source_url);
  const sourcePlatformVal = escapeSql(job.source_platform);
  const sourceIdVal = escapeSql(job.source_id);
  const categoryVal = escapeSql(job.category || "other");
  const locationRawVal = escapeSql(job.location_raw || "Remote");
  const descriptionVal = escapeSql(job.description?.slice(0, 1000) || "");
  const applicationUrlVal = escapeSql(job.application_url || job.source_url);
  const postedAtVal = job.posted_at?.trim() ? escapeSql(job.posted_at) : "NULL";
  const canonicalHash = toContentHash(job.title, job.source_url);
  const contentHashVal = escapeSql(canonicalHash);
  const geoScopeVal = escapeSql(job.geo_scope?.trim() ? job.geo_scope : "unknown");
  const phEligibilityVal = escapeSql(job.ph_eligibility);

  return `
      INSERT INTO opportunities (
        title, company, type, source_url, source_platform, source_id,
        category, location_type, location_raw, description,
        application_url, posted_at, is_active, content_hash,
        geo_scope, ph_eligibility, scraped_at, last_seen_in_feed_at
      ) VALUES (
        ${titleVal}, ${companyVal}, 'freelance', ${sourceUrlVal}, ${sourcePlatformVal}, ${sourceIdVal},
        ${categoryVal}, 'remote', ${locationRawVal}, ${descriptionVal},
        ${applicationUrlVal}, ${postedAtVal}, 1, ${contentHashVal},
        ${geoScopeVal}, ${phEligibilityVal}, datetime('now'), datetime('now')
      )
      ON CONFLICT(source_url) DO UPDATE SET
        last_seen_in_feed_at = datetime('now'),
        is_active = 1,
        ph_eligibility = excluded.ph_eligibility,
        geo_scope = excluded.geo_scope;
    `.trim();
}

/** Remote D1 rejects SQL BEGIN/COMMIT, so the batch is a sequence of idempotent statements. */
export function buildBatchSql(statements: string[]): string {
  return statements.join("\n\n");
}

/** Repo-pinned wrangler invocation (matches the savepoint's MODULE_NOT_FOUND lesson). */
function wranglerD1Command(tempSqlFile: string): string {
  const repoRoot = path.resolve(import.meta.dir, "..", "..");
  const pinned = path.join(repoRoot, "node_modules", "wrangler", "bin", "wrangler.js");
  const config = path.join(repoRoot, "apps", "web", "wrangler.jsonc");
  if (fs.existsSync(pinned)) {
    return `bun "${pinned}" d1 execute DB --remote --env production --config "${config}" --file="${tempSqlFile}"`;
  }
  return `bunx wrangler@4.120.0 d1 execute DB --remote --env production --config "${config}" --file="${tempSqlFile}"`;
}

const CANDIDATE_SELECT = `
  SELECT id, source_id, source_platform, source_url, title, company,
         category, location_raw, description, application_url,
         posted_at, geo_scope, ph_eligibility, fingerprint_hash
  FROM lake_candidate_jobs
  WHERE status = 'QUALIFIED_READY'
    AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
    AND source_id IN (`;

export async function syncQualifiedJobsToD1(
  limit = 200,
  dryRun = false,
  opts: { holdAutoApproved?: boolean; inventory?: InventorySnapshot | null } = {}
) {
  console.log(`\n=== Starting automatic lake sync to Cloudflare D1 (Limit: ${limit}, DryRun: ${dryRun}) ===`);
  const client = getLakeClient();
  const holdAutoApproved = opts.holdAutoApproved === true;
  const tenants = await loadAutoApprovedTenants(client);
  const planned = planAutoPublishSources(tenants, opts.inventory ?? null, holdAutoApproved);
  if (holdAutoApproved && tenants.length > 0) {
    console.warn(`  [AutoPublish] Kill switch held ${tenants.length} auto-approved tenant(s).`);
  }
  const baseIds = [...BASE_AUTHORIZED_SOURCE_IDS];
  console.log(`  [AuthSet] Base sources ${baseIds.length}; auto-publish sources ${planned.length}.`);

  const candidates: CandidateRow[] = [];
  const seen = new Set<number>();
  let remaining = limit;

  for (const source of planned) {
    if (remaining <= 0) break;
    const take = Math.min(source.publishCount, remaining);
    const res = await client.execute({
      sql: `${CANDIDATE_SELECT}?) ORDER BY id ASC LIMIT ?;`,
      args: [source.sourceId, take],
    });
    for (const row of res.rows as unknown as CandidateRow[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      candidates.push(row);
      remaining -= 1;
    }
  }

  if (remaining > 0 && baseIds.length > 0) {
    const placeholders = baseIds.map(() => "?").join(",");
    const res = await client.execute({
      sql: `${CANDIDATE_SELECT}${placeholders}) ORDER BY id ASC LIMIT ?;`,
      args: [...baseIds, remaining],
    });
    for (const row of res.rows as unknown as CandidateRow[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      candidates.push(row);
    }
  }

  const authorizedList = [...baseIds, ...planned.map((source) => source.sourceId)];
  const heldPlaceholders = authorizedList.map(() => "?").join(",");
  try {
    const held = await client.execute({
      sql: `
        SELECT COUNT(*) as cnt FROM lake_candidate_jobs
        WHERE status = 'QUALIFIED_READY'
          AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
          AND source_id NOT IN (${heldPlaceholders});
      `,
      args: [...authorizedList],
    });
    const heldCount = Number(held.rows[0]?.cnt ?? 0);
    if (heldCount > 0) {
      console.log(`  [Queue] ${heldCount} QUALIFIED_READY row(s) held by the source gate (unauthorized source_id).`);
    }
  } catch {
    // Observability only; never blocks the sync.
  }

  if (candidates.length === 0) {
    console.log("No authorized candidates with status = 'QUALIFIED_READY' found to sync.");
    return { syncedCount: 0 };
  }

  console.log(`Found ${candidates.length} authorized qualified jobs in Turso Lake ready for D1 sync.`);

  // 2. Generate idempotent D1 SQL statements with canonical content hash
  const sqlStatements: string[] = [];
  const syncedIds: number[] = [];

  for (const job of candidates) {
    if (!isSyncableCandidate(job)) {
      console.warn(`  [Sync] Skipping unsyncable row id=${job.id} (missing title or source_url).`);
      continue;
    }
    try {
      sqlStatements.push(buildSyncSql(job));
    } catch (err: any) {
      console.warn(`  [Sync] Skipping row id=${job.id}: ${err.message}`);
      continue;
    }
    syncedIds.push(job.id);
  }

  if (dryRun) {
    console.log(`[DRY RUN] Generated ${sqlStatements.length} SQL statements. Sample:`);
    console.log(sqlStatements[0]);
    return { syncedCount: sqlStatements.length, sample: sqlStatements[0] };
  }

  // Remote D1 rejects SQL BEGIN/COMMIT. Statements are idempotent, so a retry is safe.
  const tempSqlFile = path.join(os.tmpdir(), `va-hub-lake-sync-${Date.now()}.sql`);
  const batchSql = buildBatchSql(sqlStatements);
  fs.writeFileSync(tempSqlFile, batchSql, "utf-8");

  try {
    console.log(`Executing batch sync of ${sqlStatements.length} opportunities into Cloudflare D1...`);
    const cmd = wranglerD1Command(tempSqlFile);
    const output = execSync(cmd, { encoding: "utf-8" });
    console.log("Wrangler D1 execution output:", output);

    // 4. Mark candidate rows as SYNCED_TO_D1 in Turso Lake
    console.log("Marking candidate rows as SYNCED_TO_D1 in Turso Lake...");
    for (const id of syncedIds) {
      await client.execute({
        sql: `UPDATE lake_candidate_jobs SET status = 'SYNCED_TO_D1', synced_to_d1_at = datetime('now') WHERE id = ?;`,
        args: [id],
      });
    }

    console.log(`Successfully synced ${syncedIds.length} qualified opportunities from Turso Lake into Production D1!`);
    return { syncedCount: syncedIds.length };
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const { limit, dryRun, holdAutoApproved } = parseSyncArgs(args);

  syncQualifiedJobsToD1(limit, dryRun, { holdAutoApproved }).catch((err) => {
    console.error("Sync to D1 failed:", err);
    process.exit(1);
  });
}
