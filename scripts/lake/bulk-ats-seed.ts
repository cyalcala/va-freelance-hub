/**
 * Bulk ATS Tenant Seed Ingestor — scripts/lake/bulk-ats-seed.ts
 *
 * Builds an explicit, family-pinned ATS seed cohort from open datasets and
 * feeds it to the paced discovery engine (`runBulkAtsDiscovery`).
 *
 * Supported inputs (one required unless --curated is passed):
 *   --file=path/to/companies_v2.json   Local OpenJobs-style JSON
 *   --url=https://.../companies_v2.json Remote JSON with local cache in tmp/
 *   --seeds-out=tmp/ats-seeds.json      Where to write the normalized cohort
 *   --curated                           Built-in remote-friendly starter cohort
 *
 * Normalization:
 *   - OpenJobs `companies_v2.json`: extracts ATS tenant slugs from `ats_links`
 *     (boards.greenhouse.io, jobs.lever.co, jobs.ashbyhq.com,
 *      apply.workable.com, *.breezy.hr). Companies without ATS links are skipped.
 *   - Generic JSON arrays / remoteintech-style objects: best-effort detection of
 *     greenhouse/lever/workable/ashby/breezy token fields or career URLs.
 *   - portals.yml (career-ops/templates): parsed as `company: { ats, slug }`
 *     mappings when the file is supplied via --file.
 *
 * Dedupe: filters seeds already present in `lake_ats_discovery`
 * (ats_family, tenant_slug). Lake writes here are read-only checks; this
 * script never inserts jobs — discovery does that with geoGate + admission.
 *
 * Run: bun run scripts/lake/bulk-ats-seed.ts --url=<raw> --limit=100
 *      bun run scripts/lake/bulk-ats-seed.ts --curated --limit=60 --run-discovery
 */

import { createHash } from "crypto";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getLakeClient } from "./client";
import { ensureDiscoveryTable, runBulkAtsDiscovery, type BulkSeed } from "./domain-ats-discovery";
import { collectionHeaders } from "../../packages/scraper/userAgent";

export interface SeedOptions {
  file?: string;
  url?: string;
  curated?: boolean;
  limit?: number;
  family?: string;
  dryRun?: boolean;
  seedsOut?: string;
  runDiscovery?: boolean;
  probeDelayMs?: number;
}

export const SEED_CACHE_DIR = join(import.meta.dir, "..", "..", "tmp", "lake-seed-cache");
export const DEFAULT_SEEDS_OUT = join(import.meta.dir, "..", "..", "tmp", "ats-seeds.json");
export const OPENJOBS_RAW_URL =
  "https://raw.githubusercontent.com/outscal/OpenJobs/main/data/companies_v2.json";

const SUPPORTED_FAMILIES = new Set(["greenhouse", "lever", "workable", "ashby", "breezy"]);

function slugifyToken(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
}

/** Extract a family-pinned seed from a single career/ATS URL. Null when not an ATS URL. */
export function seedFromAtsUrl(companyName: string, website: string, rawUrl: string): BulkSeed | null {
  let u: URL;
  try {
    u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    if (!parts[0]) return null;
    return { companyName, atsFamily: "greenhouse", tenantSlug: slugifyToken(parts[0]), website };
  }
  if (host === "jobs.lever.co") {
    if (!parts[0]) return null;
    return { companyName, atsFamily: "lever", tenantSlug: slugifyToken(parts[0]), website };
  }
  if (host === "jobs.ashbyhq.com" || host === "api.ashbyhq.com") {
    const token = host === "api.ashbyhq.com" ? parts[parts.length - 1] : parts[0];
    if (!token) return null;
    return { companyName, atsFamily: "ashby", tenantSlug: slugifyToken(token), website };
  }
  if (host === "apply.workable.com" || host.endsWith(".workable.com")) {
    const token = host === "apply.workable.com" ? parts[0] : host.split(".")[0];
    if (!token) return null;
    return { companyName, atsFamily: "workable", tenantSlug: slugifyToken(token), website };
  }
  if (host.endsWith(".breezy.hr")) {
    const token = host.split(".")[0];
    if (!token || token === "www" || token === "app") return null;
    return { companyName, atsFamily: "breezy", tenantSlug: slugifyToken(token), website };
  }
  return null;
}

/** Normalize one OpenJobs-style company record into 0+ seeds. */
export function seedsFromOpenJobsRecord(rec: any): BulkSeed[] {
  const companyName = String(rec?.name ?? rec?.company ?? "").trim();
  const website = String(rec?.website ?? "").trim();
  if (!companyName) return [];
  const links: string[] = [
    ...(Array.isArray(rec?.ats_links) ? rec.ats_links : []),
    ...(Array.isArray(rec?.list_urls) ? rec.list_urls : []),
  ].filter((u) => typeof u === "string" && u.length > 4);
  const out: BulkSeed[] = [];
  for (const link of links) {
    const seed = seedFromAtsUrl(companyName, website, link);
    if (seed) out.push(seed);
  }
  // Explicit token fields (remoteintech-style / generic datasets)
  for (const family of ["greenhouse", "lever", "workable", "ashby", "breezy"] as const) {
    const token = rec?.[family] ?? rec?.[`${family}_token`] ?? rec?.ats?.[family];
    if (typeof token === "string" && token.trim().length >= 2) {
      out.push({ companyName, atsFamily: family, tenantSlug: slugifyToken(token.trim()), website });
    }
  }
  return out;
}

/** Minimal portals.yml parser: `company: {ats|family, slug|token}` or `company: family/slug`. */
export function seedsFromPortalsYml(text: string): BulkSeed[] {
  const out: BulkSeed[] = [];
  const lines = text.split(/\r?\n/);
  let currentCompany = "";
  let pendingFamily = "";
  for (const line of lines) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const top = line.match(/^([^:\s][^:]*):\s*(.*)$/);
    if (top && !line.startsWith(" ") && !line.startsWith("\t")) {
      currentCompany = top[1].trim();
      pendingFamily = "";
      const inline = top[2].trim();
      const m = inline.match(/(greenhouse|lever|workable|ashby|breezy)\s*[:/]\s*([A-Za-z0-9-]+)/i);
      if (m && currentCompany) {
        out.push({ companyName: currentCompany, atsFamily: m[1].toLowerCase(), tenantSlug: slugifyToken(m[2]) });
      }
      continue;
    }
    const kv = line.match(/^\s*(ats|family|platform|slug|token|tenant)\s*:\s*([A-Za-z0-9._-]+)\s*$/i);
    if (kv && currentCompany) {
      const val = kv[2].toLowerCase();
      if (kv[1].toLowerCase() === "ats" || kv[1].toLowerCase() === "family" || kv[1].toLowerCase() === "platform") {
        if (SUPPORTED_FAMILIES.has(val)) pendingFamily = val;
      } else if (pendingFamily) {
        out.push({ companyName: currentCompany, atsFamily: pendingFamily, tenantSlug: slugifyToken(kv[2]) });
        pendingFamily = "";
      }
    }
  }
  return out;
}

/** Curated remote-friendly starter cohort (public ATS boards, verified families). */
export function curatedSeeds(): BulkSeed[] {
  const rows: Array<[string, string, string]> = [
    ["GitLab", "greenhouse", "gitlab"],
    ["Grafana Labs", "greenhouse", "grafanalabs"],
    ["Gumroad", "greenhouse", "gumroad"],
    ["Lattice", "greenhouse", "lattice"],
    ["Supabase", "ashby", "supabase"],
    ["Ashby", "ashby", "ashby"],
    ["Amplify", "ashby", "amplify"],
    ["Camunda", "ashby", "camunda"],
    ["Tremendous", "ashby", "tremendous"],
    ["Duolingo", "lever", "duolingo"],
    ["Affirm", "lever", "affirm"],
    ["NerdWallet", "lever", "nerdwallet"],
    ["Outreach", "lever", "outreach"],
    ["20Four7VA", "breezy", "20four7va"],
    ["Sourcefit", "breezy", "sourcefit"],
    ["Yokly", "breezy", "yokly"],
  ];
  return rows.map(([companyName, atsFamily, tenantSlug]) => ({ companyName, atsFamily, tenantSlug }));
}

export function dedupeSeeds(seeds: BulkSeed[]): BulkSeed[] {
  const seen = new Set<string>();
  const out: BulkSeed[] = [];
  for (const s of seeds) {
    if (!SUPPORTED_FAMILIES.has(s.atsFamily.toLowerCase())) continue;
    if (!s.tenantSlug || s.tenantSlug.length < 2) continue;
    const key = `${s.atsFamily.toLowerCase()}:${s.tenantSlug.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ companyName: s.companyName, atsFamily: s.atsFamily.toLowerCase(), tenantSlug: s.tenantSlug, website: s.website });
  }
  return out;
}

async function loadRemoteJsonCached(url: string): Promise<unknown> {
  await mkdir(SEED_CACHE_DIR, { recursive: true });
  const key = createHash("sha256").update(url).digest("hex").slice(0, 16);
  const cachePath = join(SEED_CACHE_DIR, `${key}.json`);
  const cached = Bun.file(cachePath);
  if (await cached.exists()) {
    console.log(`Using cached dataset: ${cachePath}`);
    return await cached.json();
  }
  console.log(`Fetching dataset: ${url}`);
  const res = await fetch(url, { headers: collectionHeaders({ Accept: "application/json" }), signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Dataset fetch failed: HTTP ${res.status} for ${url}`);
  const text = await res.text();
  await Bun.write(cachePath, text);
  return JSON.parse(text);
}

async function filterKnownTenants(client: ReturnType<typeof getLakeClient>, seeds: BulkSeed[]): Promise<BulkSeed[]> {
  try {
    await ensureDiscoveryTable(client);
    const res = await client.execute(`SELECT ats_family, tenant_slug FROM lake_ats_discovery;`);
    const known = new Set((res.rows as any[]).map((r) => `${String(r.ats_family).toLowerCase()}:${String(r.tenant_slug).toLowerCase()}`));
    return seeds.filter((s) => !known.has(`${s.atsFamily.toLowerCase()}:${s.tenantSlug.toLowerCase()}`));
  } catch (err: any) {
    console.warn(`Dedupe check skipped (lake unavailable): ${err?.message ?? err}`);
    return seeds;
  }
}

export function parseSeedArgs(argv: string[]): SeedOptions {
  const get = (prefix: string) => {
    const hit = argv.find((a) => a.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
  };
  return {
    file: get("--file="),
    url: get("--url="),
    curated: argv.includes("--curated"),
    limit: get("--limit=") ? Number.parseInt(get("--limit=")!, 10) : 100,
    family: get("--family=")?.toLowerCase(),
    dryRun: argv.includes("--dry-run"),
    seedsOut: get("--seeds-out=") ?? DEFAULT_SEEDS_OUT,
    runDiscovery: argv.includes("--run-discovery"),
    probeDelayMs: get("--delay-ms=") ? Number.parseInt(get("--delay-ms=")!, 10) : 1500,
  };
}

export async function buildSeedCohort(options: SeedOptions): Promise<BulkSeed[]> {
  let seeds: BulkSeed[] = [];

  if (options.curated) {
    seeds.push(...curatedSeeds());
  }
  if (options.file) {
    const text = await Bun.file(options.file).text();
    if (options.file.endsWith(".yml") || options.file.endsWith(".yaml")) {
      seeds.push(...seedsFromPortalsYml(text));
    } else {
      const parsed = JSON.parse(text);
      const records = Array.isArray(parsed) ? parsed : Array.isArray((parsed as any)?.companies) ? (parsed as any).companies : [parsed];
      for (const rec of records) seeds.push(...seedsFromOpenJobsRecord(rec));
    }
  }
  if (options.url) {
    const parsed = await loadRemoteJsonCached(options.url);
    const records = Array.isArray(parsed) ? parsed : Array.isArray((parsed as any)?.companies) ? (parsed as any).companies : [parsed];
    for (const rec of records) seeds.push(...seedsFromOpenJobsRecord(rec));
  }

  seeds = dedupeSeeds(seeds);
  if (options.family) seeds = seeds.filter((s) => s.atsFamily === options.family);
  const limit = Number.isSafeInteger(options.limit) && (options.limit as number) > 0 ? (options.limit as number) : 100;
  return seeds.slice(0, limit);
}

if (import.meta.main) {
  (async () => {
    const opts = parseSeedArgs(process.argv.slice(2));
    if (!opts.file && !opts.url && !opts.curated) {
      console.error("Provide one of --file=, --url=, or --curated.");
      console.error(`Example: bun run scripts/lake/bulk-ats-seed.ts --url=${OPENJOBS_RAW_URL} --limit=100 --seeds-out=tmp/ats-seeds.json`);
      process.exit(1);
    }
    const cohort = await buildSeedCohort(opts);
    console.log(`Normalized ${cohort.length} unique ATS seeds.`);

    const client = getLakeClient();
    const fresh = await filterKnownTenants(client, cohort);
    console.log(`After lake_ats_discovery dedupe: ${fresh.length} fresh tenants.`);

    await mkdir(dirname(opts.seedsOut!), { recursive: true });
    await Bun.write(opts.seedsOut!, JSON.stringify(fresh, null, 2));
    console.log(`Wrote cohort: ${opts.seedsOut}`);

    const byFamily: Record<string, number> = {};
    for (const s of fresh) byFamily[s.atsFamily] = (byFamily[s.atsFamily] ?? 0) + 1;
    console.log(`Family mix: ${JSON.stringify(byFamily)}`);

    if (opts.runDiscovery && fresh.length > 0 && !opts.dryRun) {
      await runBulkAtsDiscovery(fresh, { dryRun: false, probeDelayMs: opts.probeDelayMs, limit: fresh.length });
    } else if (opts.runDiscovery && opts.dryRun) {
      await runBulkAtsDiscovery(fresh, { dryRun: true, probeDelayMs: opts.probeDelayMs, limit: fresh.length });
    } else {
      console.log(`Next: bun run scripts/lake/domain-ats-discovery.ts --seeds=${opts.seedsOut} --limit=${fresh.length}`);
    }
  })().catch((err) => {
    console.error("Bulk seed failed:", err);
    process.exit(1);
  });
}
