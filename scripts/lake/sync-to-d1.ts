import { getLakeClient } from "./client";
import { toContentHash } from "../../packages/scraper/contentHash";
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
 * Builds the effective authorized source set at runtime by unioning the static
 * base set with all tenants autonomously admitted via domain-ats-discovery.ts
 * (review_status = 'auto_approved' in lake_ats_discovery).
 *
 * This means any tenant admitted by the AI admission engine is automatically
 * eligible for D1 sync on the very next lake:sync run — no code change needed.
 */
export async function buildAuthorizedSourceIds(
  client: ReturnType<typeof getLakeClient>
): Promise<Set<string>> {
  const authorized = new Set(BASE_AUTHORIZED_SOURCE_IDS);

  try {
    // Query lake_ats_discovery for autonomously admitted tenants
    const res = await client.execute(`
      SELECT source_id FROM lake_ats_discovery
      WHERE review_status = 'auto_approved';
    `);

    let dynamicCount = 0;
    for (const row of res.rows) {
      const sid = row.source_id as string;
      if (sid && !authorized.has(sid)) {
        authorized.add(sid);
        dynamicCount++;
      }
    }

    if (dynamicCount > 0) {
      console.log(`  [AuthSet] Extended with ${dynamicCount} autonomously admitted ATS tenants.`);
    }
  } catch (err: any) {
    // lake_ats_discovery may not exist yet (pre-first-discovery run) — non-fatal
    if (!err.message?.includes("no such table")) {
      console.warn(`  [AuthSet] Could not query lake_ats_discovery: ${err.message}`);
    }
  }

  return authorized;
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

/** Builds one idempotent upsert statement for a qualified lake candidate. */
export function buildSyncSql(job: CandidateRow): string {
  const titleVal = escapeSql(job.title);
  const companyVal = escapeSql(job.company || "Unknown");
  const sourceUrlVal = escapeSql(job.source_url);
  const sourcePlatformVal = escapeSql(job.source_platform);
  const sourceIdVal = escapeSql(job.source_id);
  const categoryVal = escapeSql(job.category || "other");
  const locationRawVal = escapeSql(job.location_raw || "Remote");
  const descriptionVal = escapeSql(job.description?.slice(0, 1000) || "");
  const applicationUrlVal = escapeSql(job.application_url || job.source_url);
  const postedAtVal = escapeSql(job.posted_at || new Date().toISOString());
  const canonicalHash = toContentHash(job.title, job.source_url);
  const contentHashVal = escapeSql(canonicalHash);
  const geoScopeVal = escapeSql(job.geo_scope || "worldwide");
  const phEligibilityVal = escapeSql(job.ph_eligibility || "eligible_verified");

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

export async function syncQualifiedJobsToD1(limit = 50, dryRun = false) {
  console.log(`\n=== Starting Governed Sync from Turso Lake to Cloudflare D1 (Limit: ${limit}, DryRun: ${dryRun}) ===`);
  const client = getLakeClient();

  // Build dynamic authorized source set (base + autonomously admitted ATS tenants)
  const AUTHORIZED_SOURCE_IDS = await buildAuthorizedSourceIds(client);
  console.log(`  [AuthSet] Total authorized sources: ${AUTHORIZED_SOURCE_IDS.size}`);

  // 1. Fetch qualified candidates from Turso
  const res = await client.execute({
    sql: `
      SELECT id, source_id, source_platform, source_url, title, company,
             category, location_raw, description, application_url,
             posted_at, geo_scope, ph_eligibility, fingerprint_hash
      FROM lake_candidate_jobs
      WHERE status = 'QUALIFIED_READY'
        AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
      ORDER BY id ASC
      LIMIT ?;
    `,
    args: [limit],
  });

  const candidates = (res.rows as unknown as CandidateRow[]).filter((c) =>
    AUTHORIZED_SOURCE_IDS.has(c.source_id)
  );

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
    sqlStatements.push(buildSyncSql(job));
    syncedIds.push(job.id);
  }

  if (dryRun) {
    console.log(`[DRY RUN] Generated ${sqlStatements.length} SQL statements. Sample:`);
    console.log(sqlStatements[0]);
    return { syncedCount: sqlStatements.length, sample: sqlStatements[0] };
  }

  // 3. Write SQL batch to an OS temp file (never inside the repo) and execute via Wrangler D1
  const tempSqlFile = path.join(os.tmpdir(), `va-hub-lake-sync-${Date.now()}.sql`);
  const batchSql = ["BEGIN;", ...sqlStatements, "COMMIT;"].join("\n\n");
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
  const limitArg = parseInt(args[0] || "50", 10);
  const isDry = args.includes("--dry-run");

  syncQualifiedJobsToD1(limitArg, isDry).catch((err) => {
    console.error("Sync to D1 failed:", err);
    process.exit(1);
  });
}
