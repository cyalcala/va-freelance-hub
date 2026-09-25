import { getLakeClient } from "./client";
import { toContentHash } from "../../packages/scraper/contentHash";
import { execSync } from "child_process";
import * as fs from "fs";
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

// Canonical source authority list conforming to accepted exact-six + active D1 registry + approved public APIs
const AUTHORIZED_SOURCE_IDS = new Set([
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

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

export async function syncQualifiedJobsToD1(limit = 50, dryRun = false) {
  console.log(`\n=== Starting Governed Sync from Turso Lake to Cloudflare D1 (Limit: ${limit}, DryRun: ${dryRun}) ===`);
  const client = getLakeClient();

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

    const sql = `
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

    sqlStatements.push(sql);
    syncedIds.push(job.id);
  }

  if (dryRun) {
    console.log(`[DRY RUN] Generated ${sqlStatements.length} SQL statements. Sample:`);
    console.log(sqlStatements[0]);
    return { syncedCount: sqlStatements.length, sample: sqlStatements[0] };
  }

  // 3. Write SQL batch to temp file and execute via Wrangler D1
  const tempSqlFile = path.resolve(__dirname, "../../tmp-sync-d1.sql");
  fs.writeFileSync(tempSqlFile, sqlStatements.join("\n\n"), "utf-8");

  try {
    console.log(`Executing batch sync of ${sqlStatements.length} opportunities into Cloudflare D1...`);
    const cmd = `bunx wrangler d1 execute DB --remote --env production --config apps/web/wrangler.jsonc --file="${tempSqlFile}"`;
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
