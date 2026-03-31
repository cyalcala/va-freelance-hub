import { schedules, logger } from "@trigger.dev/sdk/v3";
import { db, client } from "@va-hub/db/client";
import { opportunities as opportunitiesSchema, logs as logsSchema, systemHealth as healthSchema } from "@va-hub/db/schema";
import { fetchRSSFeed, rssSources } from "./lib/scraper";
import { fetchRedditJobs } from "./lib/reddit";
import { fetchJobicyJobs } from "./lib/jobicy";
import { fetchATSJobs } from "./lib/ats";
import { fetchJSONFeed } from "./lib/json-harvester";
import { probeAgencies } from "./lib/agency-sensor";
import { config } from "@va-hub/config";
import { sql, eq, and, not } from "drizzle-orm";
import { isLikelyScam } from "./lib/trust";
import { siftOpportunity, OpportunityTier } from "./lib/sifter";
import { v4 as uuidv4 } from "uuid";
import { healBatchWithLLM } from "./lib/autonomous-harvester";
import { agencies as agenciesSchema } from "@va-hub/db/schema";
import { OpportunitySchema } from "@va-hub/db/validation";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .trim();
}

function normalizePlatform(name: string): string {
  let n = name.trim();
  if (n.startsWith('reddit/')) return n; // Already normalized
  if (n.toLowerCase().includes('greenhouse')) return "Greenhouse";
  if (n.toLowerCase().includes('lever')) return "Lever";
  if (n.toLowerCase().startsWith('reddit')) {
    return n.replace(/\br\//i, "").replace(/\s+/g, "/");
  }
  return n;
}

function normalizeLocation(loc: string): string {
  if (!loc) return "Remote";
  return loc
    .replace(/^remote\s*-\s*/i, "")
    .replace(/\(\s*remote\s*\)/i, "")
    .trim() || "Remote";
}

async function recordLog(message: string, level: 'info' | 'warn' | 'error' | 'snapshot' = 'info', metadata: any = {}) {
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

export async function harvest(options?: { unhealthySources?: string[] }) {
  const targetSources = options?.unhealthySources || [];
  const startTime = Date.now();
  
  if (targetSources.length > 0) {
    await recordLog(`🕵️ Targeted SRE Healing Initiated for: ${targetSources.join(", ")}`, "warn");
  } else {
    await recordLog("══ Starting Multi-Source Signal Harvesting ══", "info");
  }

  const results: any[] = [];
  
  // 1. Fetch Priority Agencies for Sifter
  const activeAgencies = await db.select({ name: agenciesSchema.name })
    .from(agenciesSchema)
    .where(eq(agenciesSchema.status, 'active'));
  const priorityAgencyNames = activeAgencies.map((a: any) => a.name);

  // 2. Fetch Circuit Breaker Status
  const healthStates = await db.select().from(healthSchema);
  const openCircuits = new Set(
    healthStates
      .filter(s => s.status === 'CIRCUIT_OPEN' || (s.consecutiveFailures ?? 0) >= 5)
      .map(s => s.sourceName)
  );
  
  const sources = [
    ...rssSources.map(s => ({ 
      id: `rss-${s.id}`, 
      name: s.name, 
      fn: () => fetchRSSFeed(s as any) 
    })),
    { id: "reddit-json", name: "Reddit JSON", fn: fetchRedditJobs },
    { id: "jobicy-api", name: "Jobicy API", fn: () => fetchJobicyJobs(db) },
    { id: "direct-ats", name: "Direct ATS", fn: () => fetchATSJobs(db) },
    ...config.json_sources.map(s => ({ 
      id: `json-${s.id}`, 
      name: s.name, 
      fn: () => fetchJSONFeed(s as any) 
    })),
    { id: "agency-sensor", name: "Agency Sensor", fn: () => probeAgencies(db) }
  ];

  for (const source of sources) {
    // SRE FILTER: If targeting specific unhealthy sources, skip all others
    if (targetSources.length > 0 && !targetSources.some(t => t.toLowerCase() === source.name.toLowerCase())) {
        continue;
    }

    if (openCircuits.has(source.name)) {
      await recordLog(`Skipping throttled source: ${source.name} (Circuit Open)`, "warn");
      continue;
    }

    try {
      const startSource = Date.now();
      
      // SRE DEFENSE: 30s timeout per source to prevent Zombie Tasks
      const items = await Promise.race([
        source.fn(),
        new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error("Source Timeout (30s)")), 30000))
      ]);
      
      const duration = Date.now() - startSource;
      results.push(...(items || []));
      
      // TELEMETRY BRIDGE: Clear failures on success
      await db.insert(healthSchema)
        .values({
          id: source.name,
          sourceName: source.name,
          status: 'OK',
          consecutiveFailures: 0,
          lastSuccess: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [healthSchema.id],
          set: { 
            status: 'OK', 
            consecutiveFailures: 0, 
            lastSuccess: new Date(), 
            updatedAt: new Date(), 
            errorMessage: null 
          }
        });

      await recordLog(`Harvested ${items?.length || 0} signals from ${source.name}`, "info", { durationMs: duration, source: source.name });
    } catch (err: any) {
      await recordLog(`Source failure: ${source.name} - ${err.message}`, "error", { source: source.name, error: err.message });
      
      // Increment Failure Count / Open Circuit
      const currentHealth = healthStates.find(s => s.sourceName === source.name);
      const newFailCount = (currentHealth?.consecutiveFailures ?? 0) + 1;
      const newStatus = newFailCount >= 5 ? 'CIRCUIT_OPEN' : 'FAIL';

      await db.insert(healthSchema)
        .values({
          id: source.name,
          sourceName: source.name,
          status: newStatus,
          consecutiveFailures: newFailCount,
          errorMessage: err.message,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [healthSchema.id],
          set: { 
            status: newStatus, 
            consecutiveFailures: newFailCount, 
            errorMessage: err.message, 
            updatedAt: new Date() 
          }
        });
    }
  }

  // ── DEDUP & SIFT ───────────────────────────────────────────────
  const processedFingerprints = new Set();
  const dedupedRelevant: any[] = [];
  const now = Date.now();

  for (const item of results) {
    if (!item || !item.title || !item.sourceUrl) {
      if (item && (item as any).__raw) {
          const healed = await healBatchWithLLM(db, (item as any).__raw, item.sourcePlatform || "Unknown");
          if (healed.length > 0) {
             dedupedRelevant.push(...healed);
             await recordLog(`Successfully healed signal batch from ${item.sourcePlatform}`, "info");
             continue;
          }
      }
      continue;
    }
    
    // Strict Data Contract: Ignore visual noise, focus on structured data
    if (isLikelyScam(item.title, item.description ?? "")) continue;

    const fingerprint = `${normalizeTitle(item.title)}|${(item.company || '').toLowerCase()}|${item.sourceUrl}`;
    if (processedFingerprints.has(fingerprint)) continue;
    
    const tier = siftOpportunity(
      item.title, 
      item.description ?? "", 
      item.company ?? "Generic", 
      item.sourcePlatform ?? "Generic",
      priorityAgencyNames
    );

    if (tier === OpportunityTier.TRASH) continue;

    // ── DATA INTEGRITY SHIELD (ZOD) ──
    const validationResult = OpportunitySchema.safeParse({
      ...item,
      id: item.id || uuidv4(),
      title: item.title.trim(), 
      company: (item.company || 'Generic').trim(),
      sourcePlatform: normalizePlatform(item.sourcePlatform || "Generic"),
      tags: item.tags || [],
      locationType: normalizeLocation(item.locationType || "remote"),
      tier: tier ?? 3,
      scrapedAt: new Date(),
      lastSeenAt: new Date(),
      latestActivityMs: item.postedAt ? new Date(item.postedAt).getTime() : 0 // Sentinel 0 if no posted date
    });

    let finalData = null;

    if (!validationResult.success) {
      // ── AGENTIC HEALING TRIGGER ──
      const rawPayload = (item as any).__raw || JSON.stringify(item);
      await recordLog(`Zod Boundary Breach: ${item.title || 'Unknown'}. Triggering Healer.`, "warn", { 
        errors: validationResult.error.errors,
        source: item.sourcePlatform,
        rawPayload: (item as any).__raw || JSON.stringify(item)
      });

      const healedRecords = await healBatchWithLLM(db, rawPayload, item.sourcePlatform || "Unknown");
      if (healedRecords.length > 0) {
        // Just take the first one or all? The loop handles one at a time usually, but healed is a batch.
        // We push all from healedRecords in future iterations, but let's just use the first for current item compatibility
        finalData = healedRecords[0];
      }
    } else {
      finalData = validationResult.data;
    }

    if (!finalData) {
      await recordLog(`Bounced poisoned signal (Healer failed): ${item.title || 'Unknown'}`, "error", { source: item.sourcePlatform });
      continue;
    }

    processedFingerprints.add(fingerprint);
    dedupedRelevant.push(finalData);
  }

  // ── UPSERT (STRICT TYPE-SAFETY) ─────────────────────────────
  let processed = 0;
  for (let i = 0; i < dedupedRelevant.length; i += 50) {
    try {
      const batch = dedupedRelevant.slice(i, i + 50);
      await db.insert(opportunitiesSchema)
        .values(batch)
        .onConflictDoUpdate({
          target: [opportunitiesSchema.title, opportunitiesSchema.company, opportunitiesSchema.sourceUrl],
          set: { 
            scrapedAt: new Date(),
            lastSeenAt: new Date(), // COMMANDER'S PATCH: Force freshness on collision
            isActive: true,
            tier: sql`excluded.tier`,
            contentHash: sql`excluded.content_hash`,
            sourceUrl: sql`excluded.source_url`,
            latestActivityMs: sql`CASE 
              WHEN excluded.latest_activity_ms > 0 THEN excluded.latest_activity_ms 
              ELSE ${opportunitiesSchema.latestActivityMs} 
            END` 
          }
        });
      processed += batch.length;
    } catch (err: any) {
      await recordLog(`Batch upsert failure: ${err.message}`, "error", { error: err.message });
    }
  }

  const totalDuration = Date.now() - startTime;
  
  // SIGNAL INVARIANT: If our primary sources are alive but return 0, we have a Silent Failure.
  if (processed === 0) {
    await recordLog("CRITICAL: Harvest cycle returned zero signals. Possible upstream blackout.", "error");
    throw new Error("Zero Signal Invariant Breach: Total processed signals is 0.");
  }

  await recordLog(`Harvest cycle complete. ${processed} signals ingested in ${totalDuration}ms.`, "snapshot", { totalProcessed: processed, durationMs: totalDuration });

  return { processed, durationMs: totalDuration };
}

export const scrapeOpportunitiesTask = schedules.task({
  id: "harvest-opportunities",
  cron: "*/30 * * * *",
  queue: { concurrencyLimit: 1 },
  run: async (payload: any, { ctx }: any) => {
    const triggerSource = payload?.source || (ctx as any).trigger?.id || 'schedule';
    logger.info(`[harvest] Initiating cycle. Trigger source: ${triggerSource}`);
    try {
      const result = await harvest({ unhealthySources: payload?.unhealthySources });
      return result;
    } catch (err: any) {
      logger.error(`[harvest] CRITICAL ENGINE FAILURE: ${err.message}`);
      throw err;
    } finally {
      // Connection reuse handled by singleton in @va-hub/db/client
    }
  },
});
