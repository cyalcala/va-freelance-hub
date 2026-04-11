import { schedules, logger } from "@trigger.dev/sdk/v3";
import "dotenv/config";
import { db } from "@va-hub/db/client";
import { logs as logsSchema, systemHealth as healthSchema } from "@va-hub/db/schema";
import { fetchRSSFeed, rssSources } from "./lib/scraper";
import { fetchRedditJobs } from "./lib/reddit";
import { fetchJobicyJobs } from "./lib/jobicy";
import { fetchATSJobs } from "./lib/ats";
import { fetchJSONFeed } from "./lib/json-harvester";
import { probeAgencies } from "./lib/agency-sensor";
import { config } from "@va-hub/config";
import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "@va-hub/db";
import { fetchWeWorkRemotelyJobs } from "./lib/weworkremotely";
import { fetchGoldmineJobs, goldmineSources } from "./lib/ph-goldmines";

// V10/V12 Intelligence Bridge
import { inngest } from "@va-hub/pulse";
import { stripJunk } from "@va-hub/ai/waterfall";

async function recordLog(message: string, level: 'info' | 'warn' | 'error' | 'snapshot' = 'info', metadata: any = {}) {
  try {
    await db.insert(logsSchema).values({
      id: uuidv4(),
      message,
      level,
      metadata: JSON.stringify(metadata),
      timestamp: normalizeDate(new Date())
    });
    console.log(`[${level.toUpperCase()}] ${message}`);
  } catch (err) {
    console.error("Failed to record log:", err);
  }
}

export async function harvest(options?: { unhealthySources?: string[], targetRegion?: string, runnerId?: string }) {
  const { getTriggerStatus, setTriggerExhausted } = await import("../packages/db/governance");
  
  // 1. V12 CIRCUIT BREAKER: Check if Scout is Allowed to Fly
  const runnerId = options?.runnerId || 'trigger';
  const status = await getTriggerStatus(runnerId);
  if (!status.ok) {
    console.warn("🚫 [CIRCUIT BREAKER] Trigger.dev Scouting PAUSED until next Month.");
    return { status: "paused_by_governance", emitted: 0 };
  }

  const targetSources = options?.unhealthySources || [];
  const targetRegion = options?.targetRegion;
  const startTime = Date.now();
  
  await recordLog(`══ Starting V12 Signal Harvesting Sequence ${targetRegion ? `(${targetRegion})` : '(ALL)'} ══`, "info");

  const sources = [
    ...rssSources.map(s => ({ 
      id: `rss-${s.id}`, 
      name: s.name, 
      region: (s as any).region || "Global",
      fn: () => fetchRSSFeed(s as any) 
    })),
    { id: "reddit-json", name: "Reddit JSON", region: "Global", fn: fetchRedditJobs },
    { id: "jobicy-api", name: "Jobicy API", region: "Global", fn: () => fetchJobicyJobs(db) },
    { id: "direct-ats", name: "Direct ATS", region: "Global", fn: () => fetchATSJobs(db) },
    ...config.json_sources.map(s => ({ 
      id: `json-${s.id}`, 
      name: s.name,
      region: (s as any).region || "Global", 
      fn: () => fetchJSONFeed(s as any) 
    })),
    { id: "agency-sensor", name: "Agency Sensor", region: "Philippines", fn: () => probeAgencies(db) },
    { id: "weworkremotely", name: "We Work Remotely", region: "Global", fn: fetchWeWorkRemotelyJobs },
    ...goldmineSources.map(s => ({
      id: `goldmine-${s.name.toLowerCase()}`,
      name: s.name,
      region: "Philippines",
      fn: () => fetchGoldmineJobs(s.name)
    }))
  ];

  let totalEmitted = 0;

  for (const source of sources) {
    // Audit Gate 1: Source Filter
    if (targetSources.length > 0 && !targetSources.some(t => t.toLowerCase() === source.name.toLowerCase())) {
        continue;
    }

    // Audit Gate 2: Regional Filter (Surgical Remediation)
    if (targetRegion && source.region !== targetRegion) {
        continue;
    }

    try {
      const items = await source.fn();
      if (!items || items.length === 0) continue;

      logger.info(`[Emitter] Emitting ${items.length} signals from ${source.name}`);

      // BATCH EMIT: Send all items in a single HTTP call to Inngest (fixes N+1 bottleneck)
      const events = items.map(item => {
        const rawContent = item.description || (item as any).__raw || "";
        const sanitizedHtml = stripJunk(rawContent);
        
        return {
          name: "job.harvested" as const,
          data: {
            raw_title: item.title,
            raw_company: item.company || "Generic",
            raw_url: item.url || item.sourceUrl,
            raw_html: sanitizedHtml,
            source: source.name,
            region: (source as any).region || "Global",
            harvested_at: Date.now(),
            // 🛰️ V12 ENRICHMENT BRIDGE
            md5_hash: (item as any).md5_hash,
            niche: (item as any).niche,
            salary: (item as any).salary,
            tier_hint: (item as any).tier_hint || 3,
            metadata: (item as any).metadata || {}
          }
        };
      });

      await inngest.send(events);
      totalEmitted += events.length;

      await recordLog(`Pulsed ${items.length} signals from ${source.name}`, "info");
    } catch (err: any) {
      await recordLog(`Source failure: ${source.name} - ${err.message}`, "error");
    }
  }

  const totalDuration = Date.now() - startTime;
  await recordLog(`Harvest cycle complete. ${totalEmitted} signals pulsed to Intelligence Mesh.`, "snapshot", { totalEmitted, durationMs: totalDuration });

  return { emitted: totalEmitted, durationMs: totalDuration };
}

export const scrapeOpportunitiesTask = schedules.task({
  id: "harvest-opportunities",
  cron: "*/20 * * * *", // Staggered: 20-min cadence (The Goldilocks Rule)
  queue: { concurrencyLimit: 1 },
  run: async (payload: any, { ctx }: any) => {
    const { getTriggerStatus, setTriggerExhausted, shouldSkipDiscovery, recordHarvestSuccess } = await import("../packages/db/governance");
    const triggerSource = payload?.source || ctx.trigger?.id || 'schedule';
    logger.info(`[harvest] Initiating signal pulse. Source: ${triggerSource}`);
    
    // 🛡️ ETHICAL FLEET: Respect the Seat with Adaptive Pulse
    const { getAdaptiveCadence } = await import("../packages/db/governance");
    const pulse = await getAdaptiveCadence(payload?.region || 'Philippines');
    logger.info(`[PULSE] Current Cadence: ${pulse.cadence} (Interval: ${pulse.intervalMin}m)`);

    if (await shouldSkipDiscovery('trigger', payload?.region || 'Philippines', pulse.intervalMin)) {
      return { status: "skipped_by_fleet_coordination", emitted: 0, pulse: pulse.cadence };
    }

    try {
      const result = await harvest({ 
        unhealthySources: payload?.unhealthySources,
        targetRegion: payload?.region || payload?.targetRegion,
        runnerId: 'trigger'
      });

      if (result.emitted > 0) {
        await recordHarvestSuccess('trigger');
      }

      return result;
    } catch (err: any) {
      // 🕵️ Autonomous Detection: If the platform is screaming about credits/usage
      const isExhaustion = 
        err.message?.toLowerCase().includes("credit") || 
        err.message?.toLowerCase().includes("usage limit") ||
        err.message?.toLowerCase().includes("rate limit");

      if (isExhaustion) {
        await setTriggerExhausted(`Platform Error: ${err.message}`);
      }
      throw err; // Re-throw to inform the dashboard
    }
  },
});
