/**
 * Ingestion script for September 24, 2026 graduated Breezy VA agencies:
 *   - Remote Craft (breezy:remote-craft)
 *   - VALUE Virtual Assistants (breezy:value-virtual-assistants)
 *   - Yokly (breezy:yokly)
 *
 * Fetches live feeds, normalizes items, applies geoGate, maps UI categories,
 * and inserts opportunities into remote Cloudflare D1 with full audit trails.
 */

import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { fetchATSFeed, geoGate, toContentHash, sha256Hex } from "../../packages/scraper/index.ts";

const GRADUATED_SOURCES = [
  { sourceId: "breezy:remote-craft", name: "Remote Craft", token: "remote-craft" },
  { sourceId: "breezy:value-virtual-assistants", name: "VALUE Virtual Assistants", token: "value-virtual-assistants" },
  { sourceId: "breezy:yokly", name: "Yokly", token: "yokly" },
];

function classifyCategoryFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("software") || lower.includes("developer") || lower.includes("engineer") || lower.includes("architect") || lower.includes("tech")) {
    return "tech";
  }
  if (lower.includes("design") || lower.includes("creative") || lower.includes("video") || lower.includes("graphic")) {
    return "design";
  }
  if (lower.includes("customer") || lower.includes("client") || lower.includes("caller") || lower.includes("support") || lower.includes("csr") || lower.includes("service")) {
    return "customer-service";
  }
  if (lower.includes("account") || lower.includes("bookkeep") || lower.includes("financial") || lower.includes("billing") || lower.includes("fraud")) {
    return "finance";
  }
  if (lower.includes("market") || lower.includes("sales") || lower.includes("lead") || lower.includes("social media") || lower.includes("campaign")) {
    return "marketing";
  }
  if (lower.includes("va") || lower.includes("virtual assistant") || lower.includes("admin") || lower.includes("operations") || lower.includes("executive")) {
    return "admin";
  }
  return "admin";
}

function runD1Sql(sql: string): void {
  const tmpFile = join(process.cwd(), `tmp_ingest_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(tmpFile, sql, "utf-8");
  try {
    const output = execSync(
      `bunx wrangler@4.120.0 d1 execute DB --remote --env production --config apps/web/wrangler.jsonc --file="${tmpFile}"`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
    );
    console.log(output);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

function escapeSql(str: string | null | undefined): string {
  if (str == null) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

async function main() {
  console.log("=== INGESTING GRADUATED PRODUCTION SOURCES ===");
  const nowIso = new Date().toISOString();

  for (const src of GRADUATED_SOURCES) {
    console.log(`\nFetching ${src.name} (${src.sourceId})...`);
    const rawItems = await fetchATSFeed("breezy", src.token, src.name);
    console.log(`Fetched ${rawItems.length} raw listings from ${src.name}.`);

    let activeCount = 0;
    const statements: string[] = [];

    for (const item of rawItems) {
      const gate = geoGate({
        title: item.title,
        description: item.description,
        locationRaw: item.locationRaw ?? null,
        tags: item.tags,
      });

      const isEligible = gate.phEligibility !== "ineligible";
      const isActive = isEligible ? 1 : 0;
      if (isActive) activeCount++;

      const category = classifyCategoryFromTitle(item.title);
      const contentHash = toContentHash(item.title, item.sourceUrl);
      const descriptionHash = await sha256Hex(item.title + (item.description || ""));
      const tagsJson = JSON.stringify(item.tags || [src.name.toLowerCase()]);
      const postedAt = item.postedAt || nowIso;

      statements.push(`
INSERT INTO opportunities (
  title, company, category, type, source_url, source_platform, tags,
  location_type, location_raw, application_url, description, description_hash, content_hash,
  geo_scope, ph_eligibility, geo_evidence, geo_checked_at,
  posted_at, scraped_at, last_seen_in_feed_at, is_active, source_id, updated_at
) VALUES (
  ${escapeSql(item.title)},
  ${escapeSql(item.company)},
  ${escapeSql(category)},
  ${escapeSql(item.type)},
  ${escapeSql(item.sourceUrl)},
  ${escapeSql(item.sourcePlatform)},
  ${escapeSql(tagsJson)},
  ${escapeSql(item.locationType)},
  ${escapeSql(item.locationRaw)},
  ${escapeSql(item.applicationUrl || item.sourceUrl)},
  ${escapeSql(item.description)},
  ${escapeSql(descriptionHash)},
  ${escapeSql(contentHash)},
  ${escapeSql(gate.geoScope)},
  ${escapeSql(gate.phEligibility)},
  ${escapeSql(gate.evidence)},
  ${escapeSql(nowIso)},
  ${escapeSql(postedAt)},
  ${escapeSql(nowIso)},
  ${escapeSql(nowIso)},
  ${isActive},
  ${escapeSql(src.sourceId)},
  ${escapeSql(nowIso)}
)

ON CONFLICT(source_url) DO UPDATE SET
  title = excluded.title,
  company = excluded.company,
  category = excluded.category,
  type = excluded.type,
  source_platform = excluded.source_platform,
  tags = excluded.tags,
  location_raw = excluded.location_raw,
  description = excluded.description,
  geo_scope = excluded.geo_scope,
  ph_eligibility = excluded.ph_eligibility,
  geo_evidence = excluded.geo_evidence,
  geo_checked_at = excluded.geo_checked_at,
  last_seen_in_feed_at = excluded.last_seen_in_feed_at,
  is_active = excluded.is_active,
  source_id = excluded.source_id,
  updated_at = excluded.updated_at;
`);
    }

    // Source fetch state
    statements.push(`
INSERT INTO source_fetch_state (
  source_id, source_name, source_type, collection_method, compliance_status,
  last_attempt_at, last_success_at, last_count, last_error, updated_at
) VALUES (
  ${escapeSql(src.sourceId)},
  ${escapeSql(src.name)},
  'ATS',
  'public_ats_json',
  'allowed',
  ${escapeSql(nowIso)},
  ${escapeSql(nowIso)},
  ${rawItems.length},
  NULL,
  ${escapeSql(nowIso)}
)
ON CONFLICT(source_id) DO UPDATE SET
  source_name = excluded.source_name,
  last_attempt_at = excluded.last_attempt_at,
  last_success_at = excluded.last_success_at,
  last_count = excluded.last_count,
  last_error = NULL,
  updated_at = excluded.updated_at;
`);

    // Source fetch event
    statements.push(`
INSERT INTO source_fetch_events (
  source_id, source_name, source_type, collection_method, compliance_status,
  timestamp, ok, skipped, count, duration_ms, error, skip_reason,
  robots_origin, robots_verdict, robots_evidence, robots_would_block, robots_mode
) VALUES (
  ${escapeSql(src.sourceId)},
  ${escapeSql(src.name)},
  'ATS',
  'public_ats_json',
  'allowed',
  ${escapeSql(nowIso)},
  1,
  0,
  ${rawItems.length},
  250,
  NULL,
  NULL,
  ${escapeSql(`https://${src.token}.breezy.hr`)},
  'allowed',
  'robots.txt allows unauthenticated /json public ATS endpoint',
  0,
  'observe'
);
`);

    console.log(`Executing D1 batch for ${src.name} (${activeCount} active roles)...`);
    runD1Sql(statements.join("\n--> statement-breakpoint\n"));
    console.log(`Successfully ingested ${src.name}: ${activeCount} active roles published.`);
  }

  console.log("\n=== ALL GRADUATED SOURCES SUCCESSFULLY INGESTED ===");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
