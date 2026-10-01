/**
 * Discovery-Only Source Registry Import — scripts/lake/import-source-registry.ts
 *
 * Gauntlet Phase 2 (Deep Source Universe Expansion): imports an external ATS
 * directory (LastRound 9,935 boards) into the Turso discovery universe as
 * unvalidated discovery claims.
 *
 * SHADOW-ONLY CONTRACT (never violated by this script):
 *  - Zero live endpoint probes during import (validation is a separate mode).
 *  - Zero D1 writes, zero job ingestion, zero source promotion.
 *  - Never overwrites an existing lake_ats_discovery row (ON CONFLICT DO NOTHING).
 *  - Provenance preserved in the dedicated discovery_origin column + lake_runs ledger.
 *  - review_status = 'discovered' (unvalidated claim, distinct from probed
 *    'shadow_monitor') until live validation supersedes it.
 *
 * Modes:
 *   import (default)        Normalize CSV -> dedupe vs lake -> batched insert
 *   --validate-sample=N     Read-only stratified liveness/PH-yield probe of N
 *                           boards per family (deterministic geoGate, no Jev,
 *                           no writes, evidence to stdout for the report)
 *
 * Run:
 *   bun run scripts/lake/import-source-registry.ts --file=tmp/lake-seed-cache/lastroundai-ats-company-directory-2026-08.csv
 *   bun run scripts/lake/import-source-registry.ts --file=<csv> --validate-sample=20
 */

import { getLakeClient } from "./client";
import { buildDiscoverySourceId, ensureDiscoveryTable, probeTemplateForFamily } from "./domain-ats-discovery";
import {
  dedupeSeeds,
  LAROUND_PROVENANCE,
  LAROUND_RAW_URL,
  seedsFromLastRoundCsv,
  type BulkSeed,
} from "./bulk-ats-seed";
import { geoGate } from "../../packages/scraper/geoGate";
import { collectionHeaders } from "../../packages/scraper/userAgent";

type LakeClient = ReturnType<typeof getLakeClient>;

/** Rows per batched INSERT: 8 binds/row × 100 = 800 < SQLite 999 bind ceiling. */
export const IMPORT_CHUNK_ROWS = 100;
/** Inter-chunk micro-pacing (ms) — Turso write hygiene, mirrors discovery pacing. */
export const IMPORT_CHUNK_DELAY_MS = 50;

function argOf(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

export interface ImportOptions {
  file?: string;
  url?: string;
  limit?: number;
  family?: string;
  dryRun?: boolean;
  validateSample?: number;
}

export interface ImportStats {
  corpusRows: number;
  normalized: number;
  alreadyKnown: number;
  imported: number;
  failedChunks: number;
  writeBatches: number;
}

export function emptyImportStats(): ImportStats {
  return { corpusRows: 0, normalized: 0, alreadyKnown: 0, imported: 0, failedChunks: 0, writeBatches: 0 };
}

/** Synthetic domain convention for seeds without a website (same as runBulkAtsDiscovery). */
export function syntheticDomain(seed: BulkSeed): string {
  return `${seed.tenantSlug}.${seed.atsFamily.toLowerCase()}`;
}

/** Builds one batched idempotent discovery-claim INSERT. Pure; unit-testable. */
export function buildDiscoveryImportSql(chunk: BulkSeed[]): { sql: string; args: unknown[] } {
  const placeholders: string[] = [];
  const args: unknown[] = [];
  for (const seed of chunk) {
    placeholders.push("(?, ?, ?, ?, ?, ?, ?, ?)");
    args.push(
      syntheticDomain(seed),
      seed.companyName,
      seed.atsFamily.toLowerCase(),
      seed.tenantSlug,
      probeTemplateForFamily(seed.atsFamily)?.buildUrl(seed.tenantSlug) ?? "",
      "discovered",
      LAROUND_PROVENANCE,
      buildDiscoverySourceId(seed.atsFamily, seed.tenantSlug),
    );
  }
  const sql = `
    INSERT INTO lake_ats_discovery
      (domain, company_hint, ats_family, tenant_slug, probe_url, review_status, admission_reason, source_id)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT(ats_family, tenant_slug) DO NOTHING;
  `;
  return { sql, args };
}

/** Deterministic stratified sample: evenly-spaced K boards per family, corpus order. */
export function stratifySample(seeds: BulkSeed[], perFamily: number): BulkSeed[] {
  const byFamily = new Map<string, BulkSeed[]>();
  for (const s of seeds) {
    const list = byFamily.get(s.atsFamily.toLowerCase()) ?? [];
    list.push(s);
    byFamily.set(s.atsFamily.toLowerCase(), list);
  }
  const out: BulkSeed[] = [];
  for (const [, list] of byFamily) {
    if (list.length === 0) continue;
    const k = Math.min(perFamily, list.length);
    const stride = Math.max(1, Math.floor(list.length / k));
    for (let i = 0; i < k; i++) out.push(list[i * stride]);
  }
  return out;
}

/** Adds the discovery_origin provenance column when missing (idempotent, additive). */
export async function ensureDiscoveryOriginColumn(client: LakeClient): Promise<void> {
  try {
    await client.execute(`ALTER TABLE lake_ats_discovery ADD COLUMN discovery_origin TEXT;`);
  } catch {
    // Column already exists
  }
}

async function filterKnownTenants(client: LakeClient, seeds: BulkSeed[], stats: ImportStats): Promise<BulkSeed[]> {
  try {
    await ensureDiscoveryTable(client);
    const res = await client.execute(`SELECT ats_family, tenant_slug FROM lake_ats_discovery;`);
    const known = new Set(
      (res.rows as any[]).map((r) => `${String(r.ats_family).toLowerCase()}:${String(r.tenant_slug).toLowerCase()}`),
    );
    const fresh = seeds.filter((s) => !known.has(`${s.atsFamily.toLowerCase()}:${s.tenantSlug.toLowerCase()}`));
    stats.alreadyKnown = seeds.length - fresh.length;
    return fresh;
  } catch (err: any) {
    console.warn(`Dedupe check skipped (lake unavailable): ${err?.message ?? err}`);
    return seeds;
  }
}

export async function importSourceRegistry(options: ImportOptions): Promise<ImportStats> {
  const stats = emptyImportStats();
  const startedAt = new Date().toISOString();

  if (!options.file && !options.url) {
    throw new Error("Provide one of --file= or --url= (LastRound ATS-directory CSV).");
  }

  let text: string;
  if (options.file) {
    text = await Bun.file(options.file).text();
  } else {
    const res = await fetch(options.url!, {
      headers: collectionHeaders({ Accept: "text/csv" }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Dataset fetch failed: HTTP ${res.status} for ${options.url}`);
    text = await res.text();
  }
  stats.corpusRows = text.split(/\r?\n/).filter((l) => l.trim()).length - 1;

  let seeds = dedupeSeeds(seedsFromLastRoundCsv(text));
  if (options.family) seeds = seeds.filter((s) => s.atsFamily === options.family);
  stats.normalized = seeds.length;
  console.log(`Normalized ${seeds.length} unique ATS seeds from ${stats.corpusRows} corpus rows.`);

  const client = getLakeClient();
  if (!options.dryRun) {
    await ensureDiscoveryTable(client);
    await ensureDiscoveryOriginColumn(client);
  }
  seeds = await filterKnownTenants(client, seeds, stats);
  console.log(`After lake_ats_discovery dedupe: ${seeds.length} fresh tenants (${stats.alreadyKnown} already known).`);

  const limit = Number.isSafeInteger(options.limit) && (options.limit as number) > 0 ? (options.limit as number) : seeds.length;
  const cohort = seeds.slice(0, limit);

  if (options.dryRun) {
    const byFamily: Record<string, number> = {};
    for (const s of cohort) byFamily[s.atsFamily] = (byFamily[s.atsFamily] ?? 0) + 1;
    console.log(`[DryRun] Would import ${cohort.length} discovery claims. Family mix: ${JSON.stringify(byFamily)}`);
    stats.imported = 0;
    return stats;
  }

  for (let i = 0; i < cohort.length; i += IMPORT_CHUNK_ROWS) {
    const chunk = cohort.slice(i, i + IMPORT_CHUNK_ROWS);
    if (chunk.length === 0) break;
    const { sql, args } = buildDiscoveryImportSql(chunk);
    try {
      await client.execute({ sql, args });
      stats.imported += chunk.length;
      stats.writeBatches++;
      console.log(`  Batch ${stats.writeBatches}: +${chunk.length} discovery claims (${stats.imported}/${cohort.length})`);
    } catch (err: any) {
      stats.failedChunks++;
      console.error(`  Batch ${stats.writeBatches + 1} FAILED (${chunk.length} rows): ${err?.message ?? err}`);
    }
    if (i + IMPORT_CHUNK_ROWS < cohort.length) await sleep(IMPORT_CHUNK_DELAY_MS);
  }

  const summary = {
    script: "import-source-registry",
    startedAt,
    finishedAt: new Date().toISOString(),
    dataset: options.file ?? options.url,
    corpusRows: stats.corpusRows,
    normalized: stats.normalized,
    alreadyKnown: stats.alreadyKnown,
    imported: stats.imported,
    failedChunks: stats.failedChunks,
    reviewStatus: "discovered",
    provenance: LAROUND_PROVENANCE,
  };
  try {
    await client.execute({
      sql: `INSERT INTO lake_runs (script, status, stats_json) VALUES (?, ?, ?);`,
      args: ["import-source-registry", stats.failedChunks > 0 ? "partial" : "completed", JSON.stringify(summary)],
    });
  } catch (err: any) {
    console.warn(`Run ledger write skipped: ${err?.message ?? err}`);
  }

  console.log(`\nImport complete: ${stats.imported} discovery claims (review_status='discovered', SHADOW only).`);
  console.log(`Failed chunks: ${stats.failedChunks} (idempotent re-run replays them).`);
  console.log(`No D1 writes. No probes. No promotion. Next: --validate-sample=N for bounded live validation.`);
  return stats;
}

// ── Read-only stratified validation probe ─────────────────────────────────────

export interface ValidationBoardResult {
  seed: BulkSeed;
  probeUrl: string;
  httpStatus: number | null;
  jobCount: number;
  bytes: number;
  phQualified: number;
  phRate: number;
  error: string | null;
}

export function emptyValidationResult(seed: BulkSeed, probeUrl: string): ValidationBoardResult {
  return { seed, probeUrl, httpStatus: null, jobCount: 0, bytes: 0, phQualified: 0, phRate: 0, error: null };
}

export async function validateSampleBoard(
  seed: BulkSeed,
  rateLimitedHosts: Set<string>,
  delayMs: number,
): Promise<ValidationBoardResult> {
  const template = probeTemplateForFamily(seed.atsFamily);
  const probeUrl = template ? template.buildUrl(seed.tenantSlug) : "";
  const result = emptyValidationResult(seed, probeUrl);
  if (!template) {
    result.error = `unknown ATS family ${seed.atsFamily}`;
    return result;
  }
  const host = probeUrl ? new URL(probeUrl).hostname.toLowerCase() : "";
  if (rateLimitedHosts.has(host)) {
    result.error = `host ${host} rate-limited this run`;
    return result;
  }
  try {
    const res = await fetch(probeUrl, {
      headers: collectionHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(12_000),
    });
    result.httpStatus = res.status;
    if (res.status === 429) {
      rateLimitedHosts.add(host);
      result.error = "HTTP 429 rate-limited";
      return result;
    }
    if (!res.ok) {
      result.error = `HTTP ${res.status}`;
      return result;
    }
    const data = await res.json();
    const jobs = template.extractJobs(data);
    result.jobCount = jobs.length;
    result.bytes = Number(res.headers.get("content-length") ?? 0);
    let qualified = 0;
    for (const job of jobs) {
      const verdict = geoGate({
        title: job.title,
        description: job.description,
        locationRaw: job.locationRaw,
        tags: job.tags,
      });
      if (verdict.phEligibility === "eligible_verified" || verdict.phEligibility === "eligible_likely") qualified++;
    }
    result.phQualified = qualified;
    result.phRate = jobs.length > 0 ? qualified / jobs.length : 0;
  } catch (err: any) {
    result.error = err?.message ?? String(err);
  }
  return result;
}

export async function runStratifiedValidation(
  seeds: BulkSeed[],
  perFamily: number,
  probeDelayMs: number,
): Promise<ValidationBoardResult[]> {
  const sample = stratifySample(seeds, perFamily);
  console.log(`\n=== Stratified Validation Probe (read-only, no Jev, no writes) ===`);
  console.log(`Sample: ${sample.length} boards (${perFamily} per family) | Delay: ${probeDelayMs}ms\n`);
  const rateLimitedHosts = new Set<string>();
  const results: ValidationBoardResult[] = [];
  for (const seed of sample) {
    const result = await validateSampleBoard(seed, rateLimitedHosts, probeDelayMs);
    results.push(result);
    const status = result.error
      ? `✗ ${result.error}`
      : `${result.jobCount} jobs, PH ${result.phQualified}/${result.jobCount} (${(result.phRate * 100).toFixed(1)}%)`;
    console.log(`  ${seed.atsFamily}/${seed.tenantSlug} [${seed.companyName}]: ${status}`);
    await new Promise((r) => setTimeout(r, probeDelayMs));
  }
  const alive = results.filter((r) => r.httpStatus === 200 && !r.error);
  const dead = results.filter((r) => r.httpStatus !== null && r.httpStatus !== 200 && !r.error);
  const errored = results.filter((r) => r.error !== null);
  const totalJobs = alive.reduce((acc, r) => acc + r.jobCount, 0);
  const totalQualified = alive.reduce((acc, r) => acc + r.phQualified, 0);
  console.log(`\nValidation summary:`);
  console.log(`  Alive (HTTP 200):     ${alive.length}/${results.length}`);
  console.log(`  Dead (4xx/5xx):       ${dead.length}`);
  console.log(`  Errored (network/429): ${errored.length}`);
  console.log(`  Observed open jobs:   ${totalJobs}`);
  console.log(`  PH-qualified (deterministic geoGate estimate): ${totalQualified} (${totalJobs > 0 ? ((totalQualified / totalJobs) * 100).toFixed(1) : "0.0"}%)`);
  console.log(`  Note: small-sample estimate; Wilson intervals are wide at n=${sample.length}.`);
  return results;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

if (import.meta.main) {
  (async () => {
    const opts: ImportOptions = {
      file: argOf("file"),
      url: argOf("url") ?? (process.argv.slice(2).includes("--lastround") ? LAROUND_RAW_URL : undefined),
      limit: argOf("limit") ? Number.parseInt(argOf("limit")!, 10) : undefined,
      family: argOf("family")?.toLowerCase(),
      dryRun: process.argv.slice(2).includes("--dry-run"),
      validateSample: argOf("validate-sample") ? Number.parseInt(argOf("validate-sample")!, 10) : undefined,
    };

    if (!opts.file && !opts.url) {
      console.error(`Provide --file=<csv>, --url=<csv>, or --lastround.`);
      console.error(`Example: bun run scripts/lake/import-source-registry.ts --file=tmp/lake-seed-cache/lastroundai-ats-company-directory-2026-08.csv`);
      process.exit(1);
    }

    if (opts.validateSample !== undefined) {
      const text = opts.file ? await Bun.file(opts.file).text() : await (await fetch(opts.url!)).text();
      let sampleSeeds = dedupeSeeds(seedsFromLastRoundCsv(text));
      if (opts.family) sampleSeeds = sampleSeeds.filter((s) => s.atsFamily === opts.family);
      await runStratifiedValidation(sampleSeeds, opts.validateSample, 1500);
    } else {
      await importSourceRegistry(opts);
    }
  })().catch((err) => {
    console.error("Source registry import failed:", err);
    process.exit(1);
  });
}
