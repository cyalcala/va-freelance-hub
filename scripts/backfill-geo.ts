// Retroactive geo-eligibility backfill (geo masterplan Phase 2, 2026-07).
//
// Runs the deterministic geo-gate (packages/scraper/geoGate.ts) over every
// ACTIVE opportunity already in production and generates chunked UPDATE
// statements for wrangler d1 execute. Old rows have no location_raw (that
// signal only exists for newly ingested jobs), so the gate works from
// title + description + tags — which still catches non-English postings,
// residence locks, title pins, and language tags.
//
// Usage (from repo root):
//   1. npx wrangler d1 execute remoteph-jobs-db --remote --json \
//        --command "SELECT id, title, description, tags FROM opportunities WHERE is_active = 1;" > /tmp/active.json
//   2. bun scripts/backfill-geo.ts <path-to-active.json> <output-dir>
//   3. npx wrangler d1 execute remoteph-jobs-db --remote --file <output-dir>/backfill-geo-N.sql   (for each N)
//
// Verdict mapping for existing rows:
// - ineligible  → is_active = 0 + geo fields (removed from the board, kept for audit)
// - everything else → geo fields only (unclear stays visible until Phase 3/4
//   decides the default view; flipping unclear rows off without AI review
//   would purge half the board on heuristics alone — too aggressive).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { geoGate } from "../packages/scraper/geoGate";

const [, , inputPath, outDir] = process.argv;
if (!inputPath || !outDir) {
  console.error("usage: bun scripts/backfill-geo.ts <active.json> <output-dir>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const rows: { id: number; title: string; description: string | null; tags: string | null }[] =
  Array.isArray(raw) ? raw[0].results : raw.results;

console.log(`loaded ${rows.length} active rows`);

function sq(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

const now = new Date().toISOString();
const statements: string[] = [];
const summary: Record<string, number> = {};
const deactivated: { id: number; title: string; evidence: string }[] = [];

for (const row of rows) {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags || "[]");
    if (Array.isArray(parsed)) tags = parsed.map(String);
  } catch { /* stored tags unparseable — gate runs without them */ }

  const v = geoGate({
    title: row.title || "",
    description: row.description,
    locationRaw: null, // pre-migration rows never captured a location signal
    tags,
  });

  summary[v.phEligibility] = (summary[v.phEligibility] || 0) + 1;

  const sets = [
    `geo_scope = ${sq(v.geoScope)}`,
    `ph_eligibility = ${sq(v.phEligibility)}`,
    `geo_evidence = ${sq(v.evidence.slice(0, 300))}`,
    `geo_checked_at = ${sq(now)}`,
  ];
  if (v.phEligibility === "ineligible") {
    sets.push("is_active = 0", `updated_at = ${sq(now)}`);
    deactivated.push({ id: row.id, title: row.title, evidence: v.evidence });
  }
  statements.push(`UPDATE opportunities SET ${sets.join(", ")} WHERE id = ${Number(row.id)};`);
}

mkdirSync(outDir, { recursive: true });
const CHUNK = 400;
let files = 0;
for (let i = 0; i < statements.length; i += CHUNK) {
  files += 1;
  writeFileSync(join(outDir, `backfill-geo-${files}.sql`), statements.slice(i, i + CHUNK).join("\n") + "\n");
}

writeFileSync(
  join(outDir, "backfill-geo-report.json"),
  JSON.stringify({ generatedAt: now, totalRows: rows.length, verdicts: summary, deactivated }, null, 2),
);

console.log("verdict summary:", JSON.stringify(summary));
console.log(`deactivating ${deactivated.length} rows; ${files} SQL chunk files written to ${outDir}`);
for (const d of deactivated.slice(0, 25)) console.log(`  #${d.id} ${d.title.slice(0, 60)} — ${d.evidence}`);
if (deactivated.length > 25) console.log(`  … and ${deactivated.length - 25} more (see backfill-geo-report.json)`);
