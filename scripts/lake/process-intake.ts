/**
 * Human Research Intake Processor & Source Prospector — scripts/lake/process-intake.ts
 *
 * Implements HRI-03 (Permitted link checks, enrichment, and source prospecting).
 *
 * Processes vetted company intake items in Turso Data Lake with a prioritized focus:
 *   1. Australian & Dayshift VA employers (Priority 1)
 *   2. Global VA agencies and outsourcing firms (Priority 1)
 *   3. Remote job boards and marketplaces (Priority 1)
 *   4. BPO, Tech, and E-Commerce vetted firms (Priority 2)
 *
 * Actions:
 *   - For Job Boards / Marketplaces: catalogs platform identities, matches existing
 *     production scrapers (Remotive, Remote OK, WWR, Jobicy) or registers candidate boards.
 *   - For Employers & VA Agencies: extracts verified ATS tokens, derives candidate slugs,
 *     probes supported ATS public JSON endpoints (Breezy, Greenhouse, Workable, Lever, Ashby),
 *     and enrolls discovered tenants into `lake_ats_discovery` as candidate sources.
 *   - Updates item status, prospecting status, evidence, and discovered sources in `lake_intake_items`.
 *
 * Run: bun run scripts/lake/process-intake.ts [--batch-id=...] [--focus-only] [--limit=N]
 */

import { parseArgs } from "util";
import { getLakeClient, isLakeConfigured } from "./client";
import { ensureLakeSchema } from "./init-lake";
import { collectionHeaders } from "../../packages/scraper/userAgent";
import { extractAtsToken, sanitizeSourceUrl } from "../../packages/scraper";
import { probeTemplateForFamily, ATS_PROBE_TEMPLATES } from "./domain-ats-discovery";

export interface IntakeItemRow {
  id: number;
  batch_id: string;
  item_index: number;
  entity_type: string;
  company_name: string;
  website: string | null;
  domain: string | null;
  niche: string;
  focus_group: string;
  priority: number;
  is_dayshift: number;
  is_verified: number;
  is_remote: number;
  is_marketplace: number;
  status: string;
  prospecting_status: string;
  discovered_sources_json: string | null;
  prospecting_evidence: string | null;
}

export interface ProcessingReceipt {
  totalProcessed: number;
  priority1Count: number;
  priority2Count: number;
  byFocusGroup: Record<string, number>;
  atsDiscoveredCount: number;
  jobBoardsCatalogedCount: number;
  activeScrapersMatchedCount: number;
  directCareersCatalogedCount: number;
  newAtsEnrolled: Array<{ sourceId: string; company: string; jobs: number }>;
  jobBoardSources: Array<{ sourceId: string; company: string; domain: string }>;
}

// Known ATS tokens from curated SQL migrations / verified sources
export const KNOWN_ATS_TOKENS: Record<string, { family: string; token: string }> = {
  // Australian & Dayshift / Global VA
  "hunt st": { family: "workable", token: "hunt-st" },
  "rocketams": { family: "workable", token: "rocketams" },
  "remote craft": { family: "breezy", token: "remote-craft" },
  "value virtual assistants": { family: "breezy", token: "value-virtual-assistants" },
  "yokly": { family: "breezy", token: "yokly" },
  // Tech & High-Signal Employers
  "gitlab": { family: "greenhouse", token: "gitlab" },
  "grafana labs": { family: "greenhouse", token: "grafanalabs" },
  "remote.com": { family: "greenhouse", token: "remotecom" },
  "ashby": { family: "ashby", token: "ashby" },
  "supabase": { family: "ashby", token: "supabase" },
  "camunda": { family: "ashby", token: "camunda" },
  "tremendous": { family: "ashby", token: "tremendous" },
  "amplify": { family: "ashby", token: "amplify" },
  "nearform": { family: "greenhouse", token: "nearform" },
  "buffer": { family: "greenhouse", token: "buffer" },
  "automattic": { family: "greenhouse", token: "automattic" },
  "help scout": { family: "greenhouse", token: "helpscout" },
};

// Known active production scrapers
export const ACTIVE_PRODUCTION_SCRAPERS: Record<string, string> = {
  "remoteok.com": "remoteok",
  "weworkremotely.com": "weworkremotely",
  "remotive.com": "remotive",
  "jobicy.com": "jobicy-ph-full",
};

/**
 * Derives candidate ATS slugs from company name and domain.
 */
export function deriveCandidateSlugs(companyName: string, domain: string | null): string[] {
  const slugs = new Set<string>();

  // 1. From company name
  const nameClean = companyName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();
  const nameHyphen = nameClean.replace(/\s+/g, "-");
  const nameFlat = nameClean.replace(/\s+/g, "");

  if (nameHyphen.length >= 2 && nameHyphen.length <= 40) slugs.add(nameHyphen);
  if (nameFlat.length >= 2 && nameFlat.length <= 40) slugs.add(nameFlat);

  // 2. From domain (e.g. "cloudstaff.com" -> "cloudstaff", "affordablestaff.com.au" -> "affordablestaff")
  if (domain) {
    const parts = domain.split(".");
    if (parts[0] && parts[0].length >= 2 && parts[0] !== "www") {
      slugs.add(parts[0].toLowerCase());
    }
  }

  return Array.from(slugs);
}

/**
 * Probes candidate slugs against ATS public endpoints with polite timeout.
 */
export async function probeAtsCandidates(
  companyName: string,
  slugs: string[]
): Promise<{ family: string; token: string; jobCount: number; probeUrl: string } | null> {
  const normName = companyName.toLowerCase().trim();
  if (KNOWN_ATS_TOKENS[normName]) {
    const known = KNOWN_ATS_TOKENS[normName];
    const template = probeTemplateForFamily(known.family);
    if (template) {
      const probeUrl = template.buildUrl(known.token);
      return { family: known.family, token: known.token, jobCount: 1, probeUrl };
    }
  }

  // Probe candidates with parallel fetches across templates
  for (const slug of slugs) {
    const probePromises = ATS_PROBE_TEMPLATES.map(async (template) => {
      const url = template.buildUrl(slug);
      try {
        const res = await fetch(url, {
          headers: collectionHeaders(),
          signal: AbortSignal.timeout(1200),
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("json")) {
            const data = await res.json();
            const jobs = template.extractJobs(data);
            if (jobs.length > 0) {
              return {
                family: template.family.toLowerCase(),
                token: slug,
                jobCount: jobs.length,
                probeUrl: url,
              };
            }
          }
        }
      } catch {
        // Timeout or network error; proceed
      }
      return null;
    });

    const results = await Promise.all(probePromises);
    const hit = results.find(Boolean);
    if (hit) return hit;
  }

  return null;
}

/**
 * Processes intake items from the Turso Data Lake.
 */
export async function processLakeIntakeItems(
  client: ReturnType<typeof getLakeClient>,
  options: {
    batchId?: string;
    focusOnly?: boolean;
    pendingOnly?: boolean;
    limit?: number;
  } = {}
): Promise<ProcessingReceipt> {
  await ensureLakeSchema(client);

  let query = `
    SELECT id, batch_id, item_index, entity_type, company_name, website, domain,
           niche, focus_group, priority, is_dayshift, is_verified, is_remote,
           is_marketplace, status, prospecting_status, discovered_sources_json,
           prospecting_evidence
    FROM lake_intake_items
  `;
  const conditions: string[] = [];
  const args: any[] = [];

  if (options.batchId) {
    conditions.push("batch_id = ?");
    args.push(options.batchId);
  }

  if (options.focusOnly) {
    conditions.push("priority = 1");
  }

  if (options.pendingOnly !== false) {
    conditions.push("status = 'captured'");
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY priority ASC, id ASC";

  if (options.limit && options.limit > 0) {
    query += " LIMIT ?";
    args.push(options.limit);
  }

  const result = await client.execute({ sql: query, args });
  const items = result.rows as unknown as IntakeItemRow[];

  console.log(`[processLakeIntake] Fetched ${items.length} items to process.`);

  const receipt: ProcessingReceipt = {
    totalProcessed: 0,
    priority1Count: 0,
    priority2Count: 0,
    byFocusGroup: {},
    atsDiscoveredCount: 0,
    jobBoardsCatalogedCount: 0,
    activeScrapersMatchedCount: 0,
    directCareersCatalogedCount: 0,
    newAtsEnrolled: [],
    jobBoardSources: [],
  };

  const updateBatch: Array<{ sql: string; args: any[] }> = [];
  let currentIndex = 0;
  let processedCount = 0;

  async function processSingleItem(item: IntakeItemRow) {
    let prospectingStatus = "direct_careers_cataloged";
    let prospectingEvidence = "Direct careers portal cataloged; no public ATS feed detected";
    let discoveredSources: string[] = [];
    let atsEnrollment: any = null;
    let jobBoardEntry: any = null;
    let activeScraperEntry = false;
    let atsEntry: any = null;

    // ── 1. Job Boards & Marketplaces ─────────────────────────────────────────
    if (item.focus_group === "job_boards" || item.is_marketplace === 1) {
      const domain = (item.domain || "").toLowerCase();
      if (domain && ACTIVE_PRODUCTION_SCRAPERS[domain]) {
        const scraperId = ACTIVE_PRODUCTION_SCRAPERS[domain];
        prospectingStatus = "active_board_enrolled";
        prospectingEvidence = `Matched active production scraper '${scraperId}'`;
        discoveredSources = [scraperId];
        activeScraperEntry = true;
      } else {
        const boardSlug = (domain || item.company_name).toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const boardSourceId = `board:${boardSlug}`;
        prospectingStatus = "job_board_cataloged";
        prospectingEvidence = `Vetted remote marketplace/job board cataloged as candidate source`;
        discoveredSources = [boardSourceId];
        jobBoardEntry = {
          sourceId: boardSourceId,
          company: item.company_name,
          domain: item.domain || "unknown",
        };
      }
    }
    // ── 2. Direct Employers & VA Agencies ────────────────────────────────────
    else {
      let atsRef = extractAtsToken(item.website);

      if (atsRef) {
        const sourceId = `${atsRef.platform.toLowerCase()}:${atsRef.token.toLowerCase()}`;
        prospectingStatus = "ats_discovered";
        prospectingEvidence = `Direct ATS URL detected (${atsRef.platform}:${atsRef.token})`;
        discoveredSources = [sourceId];
        atsEntry = {
          sourceId,
          company: item.company_name,
          jobs: 1,
        };

        atsEnrollment = {
          domain: item.domain || atsRef.token,
          company: item.company_name,
          family: atsRef.platform.toLowerCase(),
          token: atsRef.token.toLowerCase(),
          probeUrl: item.website || "",
          jobCount: 1,
          sourceId,
        };
      } else {
        const slugs = deriveCandidateSlugs(item.company_name, item.domain);
        const discovered = await probeAtsCandidates(item.company_name, slugs);

        if (discovered) {
          const sourceId = `${discovered.family}:${discovered.token}`;
          prospectingStatus = "ats_discovered";
          prospectingEvidence = `Discovered active ${discovered.family} endpoint with ${discovered.jobCount} live jobs`;
          discoveredSources = [sourceId];
          atsEntry = {
            sourceId,
            company: item.company_name,
            jobs: discovered.jobCount,
          };

          atsEnrollment = {
            domain: item.domain || discovered.token,
            company: item.company_name,
            family: discovered.family,
            token: discovered.token,
            probeUrl: discovered.probeUrl,
            jobCount: discovered.jobCount,
            sourceId,
          };
        }
      }
    }

    return {
      itemUpdates: {
        id: item.id,
        prospectingStatus,
        discoveredSources,
        prospectingEvidence,
      },
      atsEnrollment,
      jobBoardEntry,
      activeScraperEntry,
      atsEntry,
    };
  }

  const CONCURRENCY = 6;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      const result = await processSingleItem(item);

      receipt.totalProcessed++;
      if (item.priority === 1) receipt.priority1Count++;
      else receipt.priority2Count++;

      receipt.byFocusGroup[item.focus_group] = (receipt.byFocusGroup[item.focus_group] || 0) + 1;

      if (result.activeScraperEntry) receipt.activeScrapersMatchedCount++;
      if (result.jobBoardEntry) {
        receipt.jobBoardsCatalogedCount++;
        receipt.jobBoardSources.push(result.jobBoardEntry);
      }
      if (result.atsEntry) {
        receipt.atsDiscoveredCount++;
        receipt.newAtsEnrolled.push(result.atsEntry);
      }
      if (!result.activeScraperEntry && !result.jobBoardEntry && !result.atsEntry) {
        receipt.directCareersCatalogedCount++;
      }

      if (result.atsEnrollment) {
        updateBatch.push({
          sql: `
            INSERT INTO lake_ats_discovery (
              domain, company_hint, ats_family, tenant_slug, probe_url,
              job_count, review_status, source_id, admission_reason, discovered_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'shadow_monitor', ?, 'Vetted directory discovery', datetime('now'))
            ON CONFLICT(ats_family, tenant_slug) DO UPDATE SET
              job_count = excluded.job_count,
              company_hint = coalesce(lake_ats_discovery.company_hint, excluded.company_hint);
          `,
          args: [
            result.atsEnrollment.domain,
            result.atsEnrollment.company,
            result.atsEnrollment.family,
            result.atsEnrollment.token,
            result.atsEnrollment.probeUrl,
            result.atsEnrollment.jobCount,
            result.atsEnrollment.sourceId,
          ],
        });
      }

      updateBatch.push({
        sql: `
          UPDATE lake_intake_items
          SET status = 'processed',
              prospecting_status = ?,
              discovered_sources_json = ?,
              prospecting_evidence = ?,
              updated_at = datetime('now')
          WHERE id = ?;
        `,
        args: [
          result.itemUpdates.prospectingStatus,
          JSON.stringify(result.itemUpdates.discoveredSources),
          result.itemUpdates.prospectingEvidence,
          result.itemUpdates.id,
        ],
      });

      processedCount++;
      if (updateBatch.length >= 25) {
        const toFlush = updateBatch.splice(0, updateBatch.length);
        console.log(`[processLakeIntake] Flushing ${toFlush.length} database updates (${processedCount}/${items.length} completed)...`);
        await client.batch(toFlush, "write");
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  if (updateBatch.length > 0) {
    console.log(`[processLakeIntake] Flushing final ${updateBatch.length} database updates...`);
    await client.batch(updateBatch, "write");
    updateBatch.length = 0;
  }

  // Update batch overall status
  if (options.batchId) {
    await client.execute({
      sql: `UPDATE lake_intake_batches SET status = 'processed', processed_at = datetime('now') WHERE batch_id = ?;`,
      args: [options.batchId],
    });
  }

  return receipt;
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "batch-id": { type: "string" },
      "focus-only": { type: "boolean", default: false },
      limit: { type: "string" },
    },
  });

  if (!isLakeConfigured()) {
    throw new Error("TURSO_DATABASE_URL is not set in environment.");
  }

  const client = getLakeClient();
  const limitNum = values.limit ? parseInt(values.limit, 10) : undefined;

  console.log("=== Processing Vetted Intake Items in Turso Data Lake ===");
  if (values["batch-id"]) console.log(`Batch filter: ${values["batch-id"]}`);
  if (values["focus-only"]) console.log(`Focus filter: Priority 1 only (Australian/Dayshift, Global VA, Job Boards)`);
  if (limitNum) console.log(`Limit: ${limitNum} items`);

  const receipt = await processLakeIntakeItems(client, {
    batchId: values["batch-id"],
    focusOnly: values["focus-only"],
    limit: limitNum,
  });

  console.log("\n=================== INTAKE PROCESSING RECEIPT ===================");
  console.log(`Total Items Processed:      ${receipt.totalProcessed}`);
  console.log(`Priority 1 Total (Focus):   ${receipt.priority1Count}`);
  console.log(`Priority 2 Total:           ${receipt.priority2Count}`);
  console.log("---------------- Focus Group Breakdown ----------------");
  for (const [group, cnt] of Object.entries(receipt.byFocusGroup)) {
    console.log(` - ${group.padEnd(22)}: ${cnt}`);
  }
  console.log("---------------- Sourcing Discoveries -----------------");
  console.log(`Discovered ATS Tenants:     ${receipt.atsDiscoveredCount}`);
  console.log(`Active Scrapers Matched:    ${receipt.activeScrapersMatchedCount}`);
  console.log(`Job Boards Cataloged:       ${receipt.jobBoardsCatalogedCount}`);
  console.log(`Direct Careers Cataloged:   ${receipt.directCareersCatalogedCount}`);
  console.log("---------------- Discovered ATS Cohort ----------------");
  for (const ats of receipt.newAtsEnrolled) {
    console.log(` * ${ats.company.padEnd(25)} -> ${ats.sourceId} (${ats.jobs} jobs)`);
  }
  console.log("---------------- Candidate Job Boards -----------------");
  for (const b of receipt.jobBoardSources.slice(0, 10)) {
    console.log(` # ${b.company.padEnd(25)} -> ${b.sourceId} (${b.domain})`);
  }
  if (receipt.jobBoardSources.length > 10) {
    console.log(` ... and ${receipt.jobBoardSources.length - 10} more job boards`);
  }
  console.log("=================================================================\n");
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Fatal error during intake processing:", err);
    process.exit(1);
  });
}
