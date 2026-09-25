/**
 * Himalayas Paginated Category Sweep — scripts/lake/himalayas-sweep.ts
 *
 * Paginates through VA-relevant Himalayas job categories via the public API,
 * harvesting far more than the default 100-item single-page fetch.
 *
 * Compliance:
 * - Himalayas documented public API: https://himalayas.app/docs/remote-jobs-api
 * - No authentication. Pagination is via `limit` + `offset` (or `cursor`) params.
 * - VA-relevant categories mapped from Himalayas category taxonomy.
 * - Polite 2s inter-page delay; 5s inter-category delay.
 *
 * Run: bun run scripts/lake/himalayas-sweep.ts [--dry-run]
 */

import { getLakeClient } from "./client";
import { processAndRefineCandidate } from "./ingest-to-lake";
import { parseHimalayasResponse, type RawHimalayasResponse } from "../../packages/scraper/himalayas";
import { collectionHeaders } from "../../packages/scraper/userAgent";
import { createHash } from "crypto";

const HIMALAYAS_API = "https://himalayas.app/jobs/api";
const PAGE_SIZE = 100;
const MAX_PAGES_PER_CATEGORY = 10; // Safety cap (1,000 items per category max)
const INTER_PAGE_DELAY_MS = 2_000;
const INTER_CATEGORY_DELAY_MS = 5_000;

// VA-relevant Himalayas category slugs
// Source: https://himalayas.app/jobs — category nav taxonomy
const VA_CATEGORIES = [
  { slug: "virtual-assistant", label: "Virtual Assistant" },
  { slug: "customer-support", label: "Customer Support" },
  { slug: "operations", label: "Operations" },
  { slug: "human-resources", label: "Human Resources" },
  { slug: "marketing", label: "Marketing" },
  { slug: "copywriting", label: "Copywriting" },
  { slug: "project-management", label: "Project Management" },
  { slug: "bookkeeping", label: "Bookkeeping" },
  { slug: "data-entry", label: "Data Entry" },
  { slug: "social-media-management", label: "Social Media Management" },
  { slug: "executive-assistant", label: "Executive Assistant" },
  { slug: "account-management", label: "Account Management" },
  { slug: "recruiting", label: "Recruiting" },
  { slug: "content-creation", label: "Content Creation" },
  { slug: "writing", label: "Writing" },
  { slug: "finance", label: "Finance" },
  { slug: "business-development", label: "Business Development" },
  { slug: "sales", label: "Sales" },
];

async function fetchHimalayasPage(
  category: string,
  offset: number
): Promise<{ jobs: RawHimalayasResponse; rawText: string; status: number } | null> {
  const url = `${HIMALAYAS_API}?limit=${PAGE_SIZE}&offset=${offset}&categories=${category}`;
  try {
    const res = await fetch(url, {
      headers: collectionHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(25_000),
    });

    if (res.status === 429) {
      console.warn(`  Rate-limited by Himalayas (offset ${offset}). Waiting 15s...`);
      await new Promise((r) => setTimeout(r, 15_000));
      return null;
    }

    if (!res.ok) {
      console.warn(`  HTTP ${res.status} from Himalayas API (category=${category}, offset=${offset})`);
      return null;
    }

    const rawText = await res.text();
    const json = JSON.parse(rawText) as RawHimalayasResponse;
    return { jobs: json, rawText, status: res.status };
  } catch (err: any) {
    console.warn(`  Fetch error (category=${category}, offset=${offset}): ${err.message}`);
    return null;
  }
}

export async function runHimalayasSweep(options: { dryRun?: boolean } = {}) {
  const { dryRun = false } = options;

  console.log("=== Starting Himalayas Paginated Category Sweep ===");
  console.log(`Mode: ${dryRun ? "DRY-RUN" : "LIVE"} | Categories: ${VA_CATEGORIES.length}`);

  const client = getLakeClient();

  const stats = {
    totalRawCount: 0,
    totalExtracted: 0,
    duplicates: 0,
    excluded: 0,
    qualifiedReady: 0,
    ambiguous: 0,
    categoriesCompleted: 0,
    totalPages: 0,
  };

  for (const cat of VA_CATEGORIES) {
    console.log(`\n[Category: ${cat.label} (slug: ${cat.slug})]`);
    let offset = 0;
    let page = 0;
    let categoryTotal = 0;

    while (page < MAX_PAGES_PER_CATEGORY) {
      console.log(`  Fetching page ${page + 1} (offset=${offset})...`);
      const result = await fetchHimalayasPage(cat.slug, offset);

      if (!result) {
        console.warn(`  Skipping page (fetch failed or rate-limited).`);
        break;
      }

      const { jobs: data, rawText, status } = result;
      const normalized = parseHimalayasResponse(data);

      if (normalized.length === 0) {
        console.log(`  No more results at offset=${offset}. Category exhausted.`);
        break;
      }

      console.log(`  Parsed ${normalized.length} jobs (cumulative: ${categoryTotal + normalized.length}).`);

      if (!dryRun) {
        // Store raw observation for this page
        const obsInsert = await client.execute({
          sql: `
            INSERT INTO lake_raw_observations (source_id, source_platform, fetch_url, http_status, raw_payload, content_hash)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id;
          `,
          args: [
            "himalayas:remote-jobs",
            "Himalayas",
            `${HIMALAYAS_API}?limit=${PAGE_SIZE}&offset=${offset}&categories=${cat.slug}`,
            status,
            rawText.slice(0, 1_000_000),
            createHash("sha256").update(rawText).digest("hex"),
          ],
        });
        const rawObsId = obsInsert.rows[0]?.id as number;
        stats.totalRawCount++;

        for (const item of normalized) {
          await processAndRefineCandidate(
            client,
            rawObsId,
            {
              sourceId: "himalayas:remote-jobs",
              sourcePlatform: "Himalayas",
              sourceUrl: item.guid || item.applicationLink,
              title: item.title,
              company: item.companyName,
              category: cat.slug,
              locationRaw:
                item.locationRestrictions.length > 0
                  ? item.locationRestrictions.join(", ")
                  : item.isWorldwide
                  ? "Worldwide"
                  : "Remote",
              description: item.excerpt || "",
              applicationUrl: item.applicationLink,
              postedAt: item.postedAt,
              tags: item.categories,
            },
            stats
          );
        }

        await client.execute({
          sql: `UPDATE lake_raw_observations SET processed = 1 WHERE id = ?;`,
          args: [rawObsId],
        });
      } else {
        stats.totalRawCount++;
        stats.totalExtracted += normalized.length;
      }

      categoryTotal += normalized.length;
      stats.totalPages++;
      page++;
      offset += PAGE_SIZE;

      // If page returned fewer items than PAGE_SIZE, we've hit the end
      if (normalized.length < PAGE_SIZE) {
        console.log(`  Reached end of category (returned ${normalized.length} < ${PAGE_SIZE}).`);
        break;
      }

      // Polite inter-page delay
      await new Promise((r) => setTimeout(r, INTER_PAGE_DELAY_MS));
    }

    console.log(`  Category total: ${categoryTotal} jobs across ${page} pages.`);
    stats.categoriesCompleted++;

    // Polite inter-category delay
    if (VA_CATEGORIES.indexOf(cat) < VA_CATEGORIES.length - 1) {
      console.log(`  Pausing ${INTER_CATEGORY_DELAY_MS}ms before next category...`);
      await new Promise((r) => setTimeout(r, INTER_CATEGORY_DELAY_MS));
    }
  }

  console.log("\n=======================================================");
  console.log("         HIMALAYAS SWEEP SUMMARY                       ");
  console.log("=======================================================");
  console.log(`Categories Completed:          ${stats.categoriesCompleted}`);
  console.log(`Total Pages Fetched:           ${stats.totalPages}`);
  console.log(`Raw Observations Stored:       ${stats.totalRawCount}`);
  console.log(`Total Candidates Extracted:    ${stats.totalExtracted}`);
  console.log(`Duplicates / Sightings:        ${stats.duplicates}`);
  console.log(`Excluded (Non-PH / Locked):    ${stats.excluded}`);
  console.log(`Ambiguous (Unclear Review):    ${stats.ambiguous}`);
  console.log(`QUALIFIED READY (For D1):      ${stats.qualifiedReady}`);
  console.log("=======================================================\n");

  return stats;
}

if (import.meta.main) {
  const dryRun = process.argv.includes("--dry-run");
  runHimalayasSweep({ dryRun }).catch((err) => {
    console.error("Himalayas sweep failed:", err);
    process.exit(1);
  });
}
