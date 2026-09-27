/**
 * Human Research Intake Processor — scripts/lake/human-intake.ts
 *
 * Implements HRI-01 (Durable batch/item schema and provenance) and
 * HRI-02 (Classification, normalization, deduplication, and uncertain fields).
 *
 * Ingests human-curated and directory-vetted research batches into Turso Data Lake
 * tables `lake_intake_batches` and `lake_intake_items`.
 *
 * Focus Groups & Priority:
 *   Priority 1 (Primary focus per maintainer directive):
 *     - australian_dayshift: Australian & dayshift VA companies
 *     - global_va: Global VA agencies & outsourcing firms
 *     - job_boards: Curated remote job boards and marketplaces
 *   Priority 2:
 *     - bpo: BPO & professional services
 *     - tech: Technology & specialized firms
 *     - ecommerce: E-commerce & marketing agencies
 *
 * Run: bun run scripts/lake/human-intake.ts --scrape
 *      bun run scripts/lake/human-intake.ts --file=tmp/vetted-companies-488.json
 */

import { existsSync, readFileSync } from "fs";
import { parseArgs } from "util";
import { getLakeClient, isLakeConfigured } from "./client";
import { ensureLakeSchema } from "./init-lake";
import { sha256Hex } from "./lake-shared";
import { normalizeCompanyName, sanitizeSourceUrl } from "../../packages/scraper";

export interface IntakeRawItem {
  companyName: string;
  website?: string | null;
  logoDomain?: string | null;
  niche?: string;
  isDayshift?: boolean;
  isVerified?: boolean;
  isRemote?: boolean;
  isMarketplace?: boolean;
  hiringPageUrl?: string | null;
  notes?: string | null;
  page?: number;
}

export interface IntakeBatchReceipt {
  batchId: string;
  submitterOrigin: string;
  contentHash: string;
  totalItems: number;
  acceptedItems: number;
  duplicateItems: number;
  rejectedItems: number;
  byFocusGroup: Record<string, number>;
  priority1Count: number;
  priority2Count: number;
  submittedAt: string;
}

export interface FocusClassification {
  focusGroup: "australian_dayshift" | "global_va" | "job_boards" | "bpo" | "tech" | "ecommerce" | "general";
  priority: 1 | 2;
  entityType: "company_lead" | "source_lead" | "job_candidate";
}

/**
 * Classifies an intake item into its focus group, priority, and entity type.
 * Priority 1 is reserved for Australian & dayshift, Global VA, and Job Boards.
 */
export function classifyFocusGroup(item: IntakeRawItem): FocusClassification {
  const niche = (item.niche || "").toLowerCase().trim();
  const isDayshift = Boolean(item.isDayshift);
  const isMarketplace = Boolean(item.isMarketplace);

  if (niche === "australian-dayshift" || (isDayshift && niche !== "job-boards")) {
    return {
      focusGroup: "australian_dayshift",
      priority: 1,
      entityType: "company_lead",
    };
  }

  if (niche === "job-boards" || isMarketplace) {
    return {
      focusGroup: "job_boards",
      priority: 1,
      entityType: "source_lead",
    };
  }

  if (niche === "global-va" || niche.includes("va") || niche.includes("virtual-assistant")) {
    return {
      focusGroup: "global_va",
      priority: 1,
      entityType: "company_lead",
    };
  }

  if (niche === "bpo") {
    return {
      focusGroup: "bpo",
      priority: 2,
      entityType: "company_lead",
    };
  }

  if (niche === "tech") {
    return {
      focusGroup: "tech",
      priority: 2,
      entityType: "company_lead",
    };
  }

  if (niche === "ecommerce") {
    return {
      focusGroup: "ecommerce",
      priority: 2,
      entityType: "company_lead",
    };
  }

  return {
    focusGroup: "general",
    priority: 2,
    entityType: "company_lead",
  };
}

/**
 * Extracts a normalized domain from a website URL, removing www.
 */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Scrapes all vetted companies from remotejobs-ph.pages.dev/directory (11 pages).
 */
export async function scrapeDirectoryPages(baseUrl = "https://remotejobs-ph.pages.dev"): Promise<IntakeRawItem[]> {
  const allCompanies: IntakeRawItem[] = [];
  let page = 1;

  while (page <= 25) {
    const url = `${baseUrl}/directory?page=${page}`;
    console.log(`[scrapeDirectory] Fetching page ${page}: ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        console.log(`[scrapeDirectory] Reached end of directory at page ${page} (404 Not Found).`);
        break;
      }
      throw new Error(`Failed to fetch directory page ${page}: HTTP ${res.status}`);
    }

    const html = await res.text();
    const sectionRegex = /<section\s+aria-labelledby="directory-group-([^"]+)">([\s\S]*?)<\/section>/g;
    let secMatch: RegExpExecArray | null;
    let pageCount = 0;

    while ((secMatch = sectionRegex.exec(html)) !== null) {
      const niche = secMatch[1];
      const secHtml = secMatch[2];

      const articleRegex = /<article[\s\S]*?<\/article>/g;
      let artMatch: RegExpExecArray | null;

      while ((artMatch = articleRegex.exec(secHtml)) !== null) {
        const artHtml = artMatch[0];

        const hrefMatch = artHtml.match(/<a\s+href="([^"]+)"/);
        const rawWebsite = hrefMatch ? hrefMatch[1] : null;
        const website = sanitizeSourceUrl(rawWebsite);

        const nameMatch = artHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
        const companyName = nameMatch ? nameMatch[1].trim() : "Unknown Company";

        const isVerified = artHtml.includes('aria-label="Verified company"');
        const isDayshift = artHtml.includes(">Dayshift</span>");
        const isRemote = artHtml.includes(">Remote</span>");
        const isMarketplace = artHtml.includes(">Marketplace</span>");

        const logoMatch = artHtml.match(/domain=([^&"']+)/);
        const logoDomain = logoMatch ? decodeURIComponent(logoMatch[1]) : extractDomain(website);

        allCompanies.push({
          companyName,
          website,
          logoDomain,
          niche,
          isDayshift,
          isVerified,
          isRemote,
          isMarketplace,
          page,
        });
        pageCount++;
      }
    }

    console.log(`[scrapeDirectory] Page ${page}: extracted ${pageCount} companies.`);
    if (pageCount === 0) break;
    page++;
  }

  return allCompanies;
}

/**
 * Persists an intake batch and its normalized items to the Turso Data Lake.
 */
export async function ingestIntakeBatch(
  client: ReturnType<typeof getLakeClient>,
  items: IntakeRawItem[],
  origin = "human_research:cyalcala:remotejobs-ph-directory"
): Promise<IntakeBatchReceipt> {
  await ensureLakeSchema(client);

  const rawJson = JSON.stringify(items);
  const contentHash = sha256Hex(rawJson);
  const now = new Date().toISOString();
  const dateKey = now.slice(0, 10).replace(/-/g, "");
  const batchId = `batch_${dateKey}_${contentHash.slice(0, 10)}`;

  const byFocusGroup: Record<string, number> = {
    australian_dayshift: 0,
    global_va: 0,
    job_boards: 0,
    bpo: 0,
    tech: 0,
    ecommerce: 0,
    general: 0,
  };

  let acceptedItems = 0;
  let duplicateItems = 0;
  let rejectedItems = 0;

  // 1. Create or retrieve batch record
  await client.execute({
    sql: `
      INSERT INTO lake_intake_batches (
        batch_id, submitter_origin, input_format, raw_payload, content_hash,
        item_count, status, metadata_json, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'captured', ?, ?)
      ON CONFLICT(batch_id) DO UPDATE SET
        item_count = excluded.item_count,
        raw_payload = excluded.raw_payload;
    `,
    args: [
      batchId,
      origin,
      "json_directory_export",
      rawJson.length > 500_000 ? rawJson.slice(0, 500_000) : rawJson,
      contentHash,
      items.length,
      JSON.stringify({ totalInput: items.length, ingestedVia: "human-intake.ts" }),
      now,
    ],
  });

  // 2. Process each item
  for (let idx = 0; idx < items.length; idx++) {
    const raw = items[idx];
    const name = (raw.companyName || "").trim();
    if (!name) {
      rejectedItems++;
      continue;
    }

    const classification = classifyFocusGroup(raw);
    byFocusGroup[classification.focusGroup] = (byFocusGroup[classification.focusGroup] || 0) + 1;

    const domain = extractDomain(raw.website) || raw.logoDomain || null;
    const itemJson = JSON.stringify(raw);

    try {
      await client.execute({
        sql: `
          INSERT INTO lake_intake_items (
            batch_id, item_index, entity_type, company_name, website, domain,
            niche, focus_group, priority, is_dayshift, is_verified, is_remote,
            is_marketplace, raw_json, status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'captured', ?, ?, ?)
          ON CONFLICT(batch_id, item_index) DO UPDATE SET
            company_name = excluded.company_name,
            website = excluded.website,
            domain = excluded.domain,
            focus_group = excluded.focus_group,
            priority = excluded.priority,
            updated_at = excluded.updated_at;
        `,
        args: [
          batchId,
          idx,
          classification.entityType,
          name,
          raw.website ?? null,
          domain,
          raw.niche ?? "general",
          classification.focusGroup,
          classification.priority,
          raw.isDayshift ? 1 : 0,
          raw.isVerified ? 1 : 0,
          raw.isRemote ? 1 : 0,
          raw.isMarketplace ? 1 : 0,
          itemJson,
          raw.notes ?? null,
          now,
          now,
        ],
      });
      acceptedItems++;
    } catch (err: any) {
      console.warn(`[human-intake] Item ${idx} (${name}) insert error: ${err.message}`);
      rejectedItems++;
    }
  }

  // 3. Update batch statistics
  await client.execute({
    sql: `
      UPDATE lake_intake_batches
      SET accepted_count = ?, duplicate_count = ?, rejected_count = ?
      WHERE batch_id = ?;
    `,
    args: [acceptedItems, duplicateItems, rejectedItems, batchId],
  });

  const priority1Count =
    (byFocusGroup.australian_dayshift || 0) +
    (byFocusGroup.global_va || 0) +
    (byFocusGroup.job_boards || 0);
  const priority2Count = items.length - priority1Count;

  return {
    batchId,
    submitterOrigin: origin,
    contentHash,
    totalItems: items.length,
    acceptedItems,
    duplicateItems,
    rejectedItems,
    byFocusGroup,
    priority1Count,
    priority2Count,
    submittedAt: now,
  };
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      scrape: { type: "boolean", default: false },
      file: { type: "string" },
      origin: { type: "string", default: "human_research:cyalcala:remotejobs-ph-directory" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  let rawItems: IntakeRawItem[] = [];

  if (values.scrape) {
    console.log("=== Scraping 488 vetted companies from remotejobs-ph.pages.dev/directory ===");
    rawItems = await scrapeDirectoryPages();
  } else if (values.file) {
    if (!existsSync(values.file)) {
      throw new Error(`File not found: ${values.file}`);
    }
    console.log(`=== Reading items from ${values.file} ===`);
    const content = readFileSync(values.file, "utf-8");
    rawItems = JSON.parse(content);
  } else if (existsSync("tmp/vetted-companies-488.json")) {
    console.log("=== Using existing cache tmp/vetted-companies-488.json ===");
    rawItems = JSON.parse(readFileSync("tmp/vetted-companies-488.json", "utf-8"));
  } else {
    console.log("=== Fetching vetted companies from live remotejobs-ph.pages.dev/directory ===");
    rawItems = await scrapeDirectoryPages();
  }

  console.log(`Loaded ${rawItems.length} items.`);

  if (values["dry-run"]) {
    console.log("Dry-run mode enabled; skipping database persistence.");
    const sample = rawItems.slice(0, 5).map((item) => ({
      name: item.companyName,
      niche: item.niche,
      classification: classifyFocusGroup(item),
    }));
    console.log("Sample classifications:", sample);
    return;
  }

  if (!isLakeConfigured()) {
    throw new Error("TURSO_DATABASE_URL is not set in environment.");
  }

  const client = getLakeClient();
  const receipt = await ingestIntakeBatch(client, rawItems, values.origin);

  console.log("\n=================== INTAKE BATCH RECEIPT ===================");
  console.log(`Batch ID:          ${receipt.batchId}`);
  console.log(`Submitter Origin:  ${receipt.submitterOrigin}`);
  console.log(`Content Hash:      ${receipt.contentHash}`);
  console.log(`Total Submitted:   ${receipt.totalItems}`);
  console.log(`Accepted to Lake:  ${receipt.acceptedItems}`);
  console.log(`Rejected:          ${receipt.rejectedItems}`);
  console.log(`Submitted At:      ${receipt.submittedAt}`);
  console.log("---------------- Focus Group Breakdown ----------------");
  console.log(` [P1] Australian & Dayshift: ${receipt.byFocusGroup.australian_dayshift ?? 0}`);
  console.log(` [P1] Global VA Agencies:    ${receipt.byFocusGroup.global_va ?? 0}`);
  console.log(` [P1] Job Boards/Markets:    ${receipt.byFocusGroup.job_boards ?? 0}`);
  console.log(` [P2] BPO & Professional:    ${receipt.byFocusGroup.bpo ?? 0}`);
  console.log(` [P2] Tech & Specialized:    ${receipt.byFocusGroup.tech ?? 0}`);
  console.log(` [P2] E-Commerce & Mktg:     ${receipt.byFocusGroup.ecommerce ?? 0}`);
  console.log("-------------------------------------------------------");
  console.log(`Priority 1 Total (Focus):    ${receipt.priority1Count}`);
  console.log(`Priority 2 Total:            ${receipt.priority2Count}`);
  console.log("============================================================\n");
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Fatal error during intake:", err);
    process.exit(1);
  });
}
