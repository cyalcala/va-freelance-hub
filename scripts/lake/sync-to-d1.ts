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
 * Builds the effective authorized source set at runtime.
 *
 * FAIL-CLOSED CONTRACT (ADR-007): lake-local ATS admission
 * (`lake_ats_discovery.review_status = 'auto_approved'`) is NOT D1
 * publication authority. The Autonomy Cutover Predicate has not been met,
 * so auto-approved tenants are EXCLUDED by default. Pass
 * `--allow-auto-approved` to include them explicitly for a reviewed run;
 * even then this bridge does NOT pass through the D1 publication gateway
 * (no registry/lease/ledger/cap/opt-out enforcement — see the live-run
 * warning in `syncQualifiedJobsToD1`). Lake admission is never automatically
 * publication admission.
 */
export function parseSyncArgs(argv: string[]): {
  limit: number;
  dryRun: boolean;
  allowAutoApproved: boolean;
} {
  const DEFAULT_LIMIT = 50;
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
    allowAutoApproved: argv.includes("--allow-auto-approved"),
  };
}

export async function buildAuthorizedSourceIds(
  client: ReturnType<typeof getLakeClient>,
  opts: { includeAutoApproved?: boolean } = {}
): Promise<Set<string>> {
  const { includeAutoApproved = false } = opts;
  const authorized = new Set(BASE_AUTHORIZED_SOURCE_IDS);

  try {
    // Query lake_ats_discovery for autonomously admitted tenants
    const res = await client.execute(`
      SELECT source_id FROM lake_ats_discovery
      WHERE review_status = 'auto_approved';
    `);

    const admitted: string[] = [];
    for (const row of res.rows) {
      const sid = row.source_id as string;
      if (sid && !authorized.has(sid)) {
        admitted.push(sid);
      }
    }

    if (admitted.length > 0 && includeAutoApproved) {
      for (const sid of admitted) authorized.add(sid);
      console.log(`  [AuthSet] Extended with ${admitted.length} autonomously admitted ATS tenants (--allow-auto-approved).`);
    } else if (admitted.length > 0) {
      console.warn(
        `  [AuthSet] ${admitted.length} auto-approved ATS tenant(s) HELD (lake admission is not D1 authority; re-run with --allow-auto-approved after review).`
      );
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

export async function syncQualifiedJobsToD1(
  limit = 50,
  dryRun = false,
  opts: { allowAutoApproved?: boolean } = {}
) {
  console.log(`\n=== Starting Governed Sync from Turso Lake to Cloudflare D1 (Limit: ${limit}, DryRun: ${dryRun}) ===`);
  if (!dryRun) {
    console.warn(
      "  [BYPASS NOTICE] This bridge writes raw INSERTs and does NOT pass through the D1 " +
        "publication gateway (no source-registry/lease/ledger/canary-cap/opt-out enforcement). " +
        "Live runs are for explicitly reviewed cohorts only. Prefer --dry-run review first."
    );
  }
  const client = getLakeClient();

  // Build authorized source set (base; auto-approved only with explicit opt-in)
  const AUTHORIZED_SOURCE_IDS = await buildAuthorizedSourceIds(client, {
    includeAutoApproved: opts.allowAutoApproved,
  });
  console.log(`  [AuthSet] Total authorized sources: ${AUTHORIZED_SOURCE_IDS.size}`);

  // Authorization is part of candidate selection (no post-filter starvation):
  // LIMIT applies AFTER the source gate, so unauthorized head rows can never
  // hide later authorized rows.
  const authorizedList = [...AUTHORIZED_SOURCE_IDS];
  const placeholders = authorizedList.map(() => "?").join(",");
  // 1. Fetch qualified candidates from Turso
  const res = await client.execute({
    sql: `
      SELECT id, source_id, source_platform, source_url, title, company,
             category, location_raw, description, application_url,
             posted_at, geo_scope, ph_eligibility, fingerprint_hash
      FROM lake_candidate_jobs
      WHERE status = 'QUALIFIED_READY'
        AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
        AND source_id IN (${placeholders})
      ORDER BY id ASC
      LIMIT ?;
    `,
    args: [...authorizedList, limit],
  });

  const candidates = res.rows as unknown as CandidateRow[];

  // Backlog visibility (§19): how many qualified rows are held by the source gate?
  try {
    const held = await client.execute({
      sql: `
        SELECT COUNT(*) as cnt FROM lake_candidate_jobs
        WHERE status = 'QUALIFIED_READY'
          AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
          AND source_id NOT IN (${placeholders});
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
  const { limit, dryRun, allowAutoApproved } = parseSyncArgs(args);

  syncQualifiedJobsToD1(limit, dryRun, { allowAutoApproved }).catch((err) => {
    console.error("Sync to D1 failed:", err);
    process.exit(1);
  });
}
