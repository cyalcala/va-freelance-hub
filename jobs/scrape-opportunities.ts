import { schedules } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { opportunities as opportunitiesSchema, systemHealth } from "@va-hub/db/schema";
import { fetchRSSFeed, rssSources } from "./lib/scraper";
import { fetchRedditJobs } from "./lib/reddit";
import { fetchJobicyJobs } from "./lib/jobicy";
import { fetchJobBoardJobs } from "./lib/job-boards";
import { fetchATSJobs } from "./lib/ats";
import { fetchJSONFeed } from "./lib/json-harvester";
import { config } from "@va-hub/config";
import { sql } from "drizzle-orm";
import { isLikelyScam } from "./lib/trust";
import { siftOpportunity, OpportunityTier } from "./lib/sifter";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .trim();
}

async function logToNtfy(message: string, priority: number = 3) {
  try {
    await fetch("https://ntfy.sh/va-freelance-hub-task-log-cyrus", {
      method: "POST",
      body: `[TASK-LOG] ${message}`,
      headers: { "Priority": priority.toString() }
    });
  } catch {
    // ignore
  }
}

export async function harvest(db: any) {
  await logToNtfy("══Starting Harvest══");
  console.log("[harvest] ═══ Starting Multi-Source Harvest ═══");

  // ── LAYER 1: RSS Feeds ──────────────────────────────────
  const rssResults = await Promise.allSettled(rssSources.map(s => fetchRSSFeed(s as any)));
  const rssItems = rssResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // ── LAYER 2: Reddit JSON ─────────────────────────
  const redditItems = await fetchRedditJobs();

  // ── LAYER 3: Job Boards (Jobicy etc.) ────────────────────────────
  const jobicyItems = await fetchJobicyJobs();

  // ── LAYER 4: Direct ATS Harvest ───
  const atsItems = await fetchATSJobs();

  // ── LAYER 5: JSON Probes ───────────────────
  const jsonResults = await Promise.allSettled(config.json_sources.map(s => fetchJSONFeed(s as any)));
  const jsonItems = jsonResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // ── COMBINE ALL SOURCES ─────────────────────────────────
  const allItems = [...rssItems, ...redditItems, ...jobicyItems, ...atsItems, ...jsonItems];
  
  // ── DEDUP & SIFT ───────────────────────────────────────────────
  const processedFingerprints = new Set();
  const dedupedRelevant: any[] = [];
  
  const now = Date.now();

  for (const item of allItems) {
    if (!item) continue;
    const itemTitle = item.title || "";
    if (isLikelyScam(itemTitle, item.description ?? "")) continue;

    const fingerprint = `${normalizeTitle(itemTitle)}|${(item.company || '').toLowerCase()}`;
    if (processedFingerprints.has(fingerprint)) continue;
    
    const tier = siftOpportunity(itemTitle, item.description ?? "", item.company ?? "Generic", item.sourcePlatform ?? "Generic");
    if (tier === OpportunityTier.TRASH) continue;

    processedFingerprints.add(fingerprint);
    dedupedRelevant.push({ 
      ...item, 
      title: itemTitle.trim(), 
      company: (item.company || 'Generic').trim(),
      tier: tier ?? 3,
      latestActivityMs: Math.max(
        item.postedAt ? new Date(item.postedAt).getTime() : 0, 
        item.scrapedAt ? new Date(item.scrapedAt).getTime() : now
      )
    });
  }

  // ── UPSERT (SEMANTIC MERGE) ─────────────────────────────
  let processed = 0;
  for (let i = 0; i < dedupedRelevant.length; i += 50) {
    try {
      const batch = dedupedRelevant.slice(i, i + 50);
      await db.insert(opportunitiesSchema)
        .values(batch)
        .onConflictDoUpdate({
          target: [opportunitiesSchema.title, opportunitiesSchema.company],
          set: { 
            scrapedAt: new Date(),
            isActive: 1,
            tier: sql`excluded.tier`,
            contentHash: sql`excluded.content_hash`,
            sourceUrl: sql`excluded.source_url`,
            latestActivityMs: sql`excluded.latest_activity_ms`
          }
        });
      processed += batch.length;
    } catch (err) {
      console.error("[harvest] Batch failed:", (err as Error).message);
    }
  }

  return { processed, newCount: processed }; // Simplified for now
}

export const scrapeOpportunitiesTask = schedules.task({
  id: "harvest-opportunities",
  cron: "*/30 * * * *",
  run: async () => {
    const { db, client } = createDb();
    try {
      const result = await harvest(db);
      await logToNtfy(`SUCCESS: ${result.processed} signals processed.`);
      return result;
    } catch (err: any) {
      await logToNtfy(`CRITICAL FAILURE: ${err.message}`, 5);
      throw err;
    } finally {
      client.close();
    }
  },
});
