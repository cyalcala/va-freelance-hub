/**
 * Remotive Full JSON API Ingestion — scripts/lake/remotive-full.ts
 *
 * Streams the complete Remotive public JSON API dataset (all categories, ~1,000+ listings)
 * into lake_raw_observations and refines each candidate through geoGate.
 *
 * Compliance:
 * - Uses documented Remotive JSON API: https://remotive.com/api/remote-jobs
 * - No authentication required. Public API with documented category parameters.
 * - Stores minimal discovery metadata; links back to original remotive.com listings.
 * - Category enumeration comes from the /api/remote-jobs/categories endpoint.
 *
 * Run: bun run scripts/lake/remotive-full.ts
 */

import { getLakeClient } from "./client";
import { processAndRefineCandidate } from "./ingest-to-lake";
import { collectionHeaders } from "../../packages/scraper/userAgent";
import { createHash } from "crypto";

const REMOTIVE_CATEGORIES_URL = "https://remotive.com/api/remote-jobs/categories";
const REMOTIVE_JOBS_URL = "https://remotive.com/api/remote-jobs";

// VA-relevant and high-signal categories for Filipino remote workers
const VA_PRIORITY_CATEGORIES = new Set([
  "virtual-assistant",
  "customer-support",
  "business",
  "hr",
  "finance",
  "marketing",
  "writing",
  "design",
  "project-management",
  "data",
  "all-other",
]);

interface RemotiveCategory {
  id: number;
  name: string;
  slug: string;
  jobs_count: number;
}

interface RemotiveJob {
  id: number;
  url?: string;
  title?: string;
  company_name?: string;
  company_logo?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

interface RemotiveApiResponse {
  job_count: number;
  jobs: RemotiveJob[];
}

interface RemoticeCategoriesResponse {
  jobs: RemotiveCategory[];
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: collectionHeaders({ Accept: "application/json" }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429) {
        const backoff = (i + 1) * 5_000;
        console.warn(`  Rate-limited by Remotive. Backing off ${backoff}ms...`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      return res;
    } catch (err: any) {
      if (i === retries - 1) throw err;
      const backoff = (i + 1) * 3_000;
      console.warn(`  Fetch error (attempt ${i + 1}/${retries}): ${err.message}. Retrying in ${backoff}ms...`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

export async function runRemotiveFullIngestion(options: {
  priorityOnly?: boolean;
  dryRun?: boolean;
} = {}) {
  const { priorityOnly = false, dryRun = false } = options;

  console.log("=== Starting Remotive Full JSON API Ingestion ===");
  console.log(`Mode: ${priorityOnly ? "VA-priority categories only" : "all categories"} | DryRun: ${dryRun}`);

  const client = getLakeClient();

  const stats = {
    totalRawCount: 0,
    totalExtracted: 0,
    duplicates: 0,
    excluded: 0,
    qualifiedReady: 0,
    ambiguous: 0,
    categoriesProcessed: 0,
    categoriesSkipped: 0,
  };

  // Step 1: Fetch category list
  let categories: RemotiveCategory[] = [];
  try {
    console.log(`\nFetching category list from ${REMOTIVE_CATEGORIES_URL}...`);
    const catRes = await fetchWithRetry(REMOTIVE_CATEGORIES_URL);
    if (catRes.ok) {
      const catData = (await catRes.json()) as RemoticeCategoriesResponse;
      categories = catData.jobs || [];
      console.log(`Found ${categories.length} categories.`);
    }
  } catch (err: any) {
    console.error("Failed to fetch categories:", err.message);
    // Fall through and attempt to ingest the "all jobs" endpoint as single batch
  }

  // Step 2: If no categories (API may not list them or we're doing all-jobs), ingest root endpoint
  if (categories.length === 0) {
    console.log("\nFalling back to ingesting all Remotive jobs from root endpoint...");
    await ingestRemotiveUrl(client, REMOTIVE_JOBS_URL, "remotive", "all", stats, dryRun);
    return stats;
  }

  // Step 3: Ingest per category (respects priority filter + inter-request delay)
  for (const cat of categories) {
    const slug = cat.slug;

    if (priorityOnly && !VA_PRIORITY_CATEGORIES.has(slug)) {
      stats.categoriesSkipped++;
      continue;
    }

    if (cat.jobs_count === 0) {
      stats.categoriesSkipped++;
      continue;
    }

    console.log(`\n[Category: ${cat.name} (${cat.jobs_count} jobs)]`);
    const url = `${REMOTIVE_JOBS_URL}?category=${slug}`;
    await ingestRemotiveUrl(client, url, "remotive", slug, stats, dryRun);
    stats.categoriesProcessed++;

    // Polite inter-request delay (1.5s between categories)
    await new Promise((r) => setTimeout(r, 1_500));
  }

  printSummary(stats);
  return stats;
}

async function ingestRemotiveUrl(
  client: ReturnType<typeof getLakeClient>,
  url: string,
  sourceId: string,
  category: string,
  stats: {
    totalRawCount: number;
    totalExtracted: number;
    duplicates: number;
    excluded: number;
    qualifiedReady: number;
    ambiguous: number;
  },
  dryRun: boolean
) {
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} from ${url}`);
      return;
    }

    const rawText = await res.text();
    const data = JSON.parse(rawText) as RemotiveApiResponse;
    const jobs: RemotiveJob[] = Array.isArray(data.jobs) ? data.jobs : [];
    console.log(`  Fetched ${jobs.length} jobs (total_reported: ${data.job_count ?? "?"}).`);

    if (jobs.length === 0) return;

    if (dryRun) {
      console.log(`  [DryRun] Would store raw observation and process ${jobs.length} candidates.`);
      stats.totalRawCount++;
      stats.totalExtracted += jobs.length;
      return;
    }

    // Store raw observation
    const obsInsert = await client.execute({
      sql: `
        INSERT INTO lake_raw_observations (source_id, source_platform, fetch_url, http_status, raw_payload, content_hash)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id;
      `,
      args: [
        sourceId,
        "Remotive",
        url,
        res.status,
        rawText.slice(0, 1_000_000),
        createHash("sha256").update(rawText).digest("hex"),
      ],
    });
    const rawObsId = obsInsert.rows[0]?.id as number;
    stats.totalRawCount++;

    // Process each job through geoGate refinery
    for (const item of jobs) {
      if (!item || !item.url || !item.title) continue;

      await processAndRefineCandidate(
        client,
        rawObsId,
        {
          sourceId,
          sourcePlatform: "Remotive",
          sourceUrl: item.url,
          title: item.title,
          company: item.company_name || "Unknown",
          category: item.category || category || "other",
          locationRaw: item.candidate_required_location || "Remote",
          description: item.description || "",
          applicationUrl: item.url,
          postedAt: item.publication_date
            ? new Date(item.publication_date).toISOString()
            : null,
          tags: Array.isArray(item.tags) ? item.tags : [],
        },
        stats
      );
    }

    await client.execute({
      sql: `UPDATE lake_raw_observations SET processed = 1 WHERE id = ?;`,
      args: [rawObsId],
    });
  } catch (err: any) {
    console.error(`  Error ingesting ${url}: ${err.message}`);
  }
}

function printSummary(stats: {
  totalRawCount: number;
  totalExtracted: number;
  duplicates: number;
  excluded: number;
  qualifiedReady: number;
  ambiguous: number;
  categoriesProcessed: number;
  categoriesSkipped: number;
}) {
  const s = stats;
  console.log("\n=======================================================");
  console.log("         REMOTIVE FULL API INGESTION SUMMARY           ");
  console.log("=======================================================");
  console.log(`Categories Processed:          ${s.categoriesProcessed ?? "N/A"}`);
  console.log(`Categories Skipped:            ${s.categoriesSkipped ?? "N/A"}`);
  console.log(`Raw Observations Stored:       ${s.totalRawCount}`);
  console.log(`Total Candidates Extracted:    ${s.totalExtracted}`);
  console.log(`Duplicates / Sightings:        ${s.duplicates}`);
  console.log(`Excluded (Non-PH / Locked):    ${s.excluded}`);
  console.log(`Ambiguous (Unclear Review):    ${s.ambiguous}`);
  console.log(`QUALIFIED READY (For D1):      ${s.qualifiedReady}`);
  console.log("=======================================================\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const priorityOnly = args.includes("--priority-only");
  const dryRun = args.includes("--dry-run");

  runRemotiveFullIngestion({ priorityOnly, dryRun }).catch((err) => {
    console.error("Remotive full ingestion failed:", err);
    process.exit(1);
  });
}
