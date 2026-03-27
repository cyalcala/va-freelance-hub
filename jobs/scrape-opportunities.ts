import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { opportunities as opportunitiesSchema, logs as logsSchema } from "@va-hub/db/schema";
import { fetchRSSFeed, rssSources } from "./lib/scraper";
import { fetchRedditJobs } from "./lib/reddit";
import { fetchJobicyJobs } from "./lib/jobicy";
import { fetchATSJobs } from "./lib/ats";
import { fetchJSONFeed } from "./lib/json-harvester";
import { config } from "@va-hub/config";
import { sql } from "drizzle-orm";
import { isLikelyScam } from "./lib/trust";
import { siftOpportunity, OpportunityTier } from "./lib/sifter";
import { v4 as uuidv4 } from "uuid";
import { healPayloadWithLLM } from "./lib/autonomous-harvester";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .trim();
}

async function recordLog(db: any, message: string, level: 'info' | 'warn' | 'error' | 'snapshot' = 'info', metadata: any = {}) {
  try {
    await db.insert(logsSchema).values({
      id: uuidv4(),
      message,
      level,
      metadata: JSON.stringify(metadata),
      timestamp: new Date()
    });
    console.log(`[${level.toUpperCase()}] ${message}`);
  } catch (err) {
    console.error("Failed to record log:", err);
  }
}

export async function harvest(db: any) {
  const startTime = Date.now();
  await recordLog(db, "══ Starting Multi-Source Signal Harvesting ══", "info");

  const results: any[] = [];
  
  const sources = [
    { name: "RSS Feeds", fn: () => Promise.allSettled(rssSources.map(s => fetchRSSFeed(s as any))).then(r => r.flatMap(x => x.status === "fulfilled" ? x.value : [])) },
    { name: "Reddit JSON", fn: fetchRedditJobs },
    { name: "Jobicy API", fn: fetchJobicyJobs },
    { name: "Direct ATS", fn: fetchATSJobs },
    { name: "JSON Probes", fn: () => Promise.allSettled(config.json_sources.map(s => fetchJSONFeed(s as any))).then(r => r.flatMap(x => x.status === "fulfilled" ? x.value : [])) }
  ];

  for (const source of sources) {
    try {
      const startSource = Date.now();
      const items = await source.fn();
      const duration = Date.now() - startSource;
      results.push(...(items || []));
      await recordLog(db, `Harvested ${items?.length || 0} signals from ${source.name}`, "info", { durationMs: duration, source: source.name });
    } catch (err: any) {
      await recordLog(db, `Source failure: ${source.name} - ${err.message}`, "error", { source: source.name, error: err.message });
    }
  }

  // ── DEDUP & SIFT ───────────────────────────────────────────────
  const processedFingerprints = new Set();
  const dedupedRelevant: any[] = [];
  const now = Date.now();

  for (const item of results) {
    if (!item || !item.title || !item.sourceUrl) {
      if (item && (item as any).__raw) {
         // Potential for healing
         const healed = await healPayloadWithLLM((item as any).__raw, item.sourcePlatform || "Unknown");
         if (healed) {
            Object.assign(item, healed);
            await recordLog(db, `Successfully healed signal from ${item.sourcePlatform}`, "info", { title: item.title });
         } else {
            continue;
         }
      } else {
        continue;
      }
    }
    
    // Strict Data Contract: Ignore visual noise, focus on structured data
    if (isLikelyScam(item.title, item.description ?? "")) continue;

    const fingerprint = `${normalizeTitle(item.title)}|${(item.company || '').toLowerCase()}`;
    if (processedFingerprints.has(fingerprint)) continue;
    
    const tier = siftOpportunity(
      item.title, 
      item.description ?? "", 
      item.company ?? "Generic", 
      item.sourcePlatform ?? "Generic"
    );

    if (tier === OpportunityTier.TRASH) continue;

    processedFingerprints.add(fingerprint);
    dedupedRelevant.push({ 
      ...item, 
      id: item.id || uuidv4(),
      title: item.title.trim(), 
      company: (item.company || 'Generic').trim(),
      tier: tier ?? 3,
      scrapedAt: new Date(),
      latestActivityMs: Math.max(
        item.postedAt ? new Date(item.postedAt).getTime() : 0, 
        item.scrapedAt ? new Date(item.scrapedAt).getTime() : now
      )
    });
  }

  // ── UPSERT (STRICT TYPE-SAFETY) ─────────────────────────────
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
    } catch (err: any) {
      await recordLog(db, `Batch upsert failure: ${err.message}`, "error", { error: err.message });
    }
  }

  const totalDuration = Date.now() - startTime;
  await recordLog(db, `Harvest cycle complete. ${processed} signals ingested in ${totalDuration}ms.`, "snapshot", { totalProcessed: processed, durationMs: totalDuration });

  return { processed, durationMs: totalDuration };
}

export const scrapeOpportunitiesTask = schedules.task({
  id: "harvest-opportunities",
  cron: "*/30 * * * *",
  run: async (payload: any, { ctx }: any) => {
    const { db, client } = createDb();
    try {
      const triggerSource = payload?.source || (ctx as any).trigger?.id || 'schedule';
      logger.info(`[harvest] Initiating cycle. Trigger source: ${triggerSource}`);
      const result = await harvest(db);
      return result;
    } catch (err: any) {
      logger.error(`[harvest] CRITICAL ENGINE FAILURE: ${err.message}`);
      throw err;
    } finally {
      await client.close();
    }
  },
});
