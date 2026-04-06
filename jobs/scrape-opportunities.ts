import { schedules, logger } from "@trigger.dev/sdk/v3";
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

export async function harvest(options?: { unhealthySources?: string[] }) {
  const targetSources = options?.unhealthySources || [];
  const startTime = Date.now();
  
  await recordLog("══ Starting V12 Signal Harvesting Sequence ══", "info");

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

  let totalEmitted = 0;

  for (const source of sources) {
    if (targetSources.length > 0 && !targetSources.some(t => t.toLowerCase() === source.name.toLowerCase())) {
        continue;
    }

    try {
      const items = await source.fn();
      if (!items || items.length === 0) continue;

      logger.info(`[Emitter] Emitting ${items.length} signals from ${source.name}`);

      for (const item of items) {
        // V12 TOKEN GUARD: Sanitize raw HTML before emission to reduce pulse payload
        const rawContent = item.description || (item as any).__raw || "";
        const sanitizedHtml = stripJunk(rawContent);

        // 🧬 EMIT TO PULSE: The V12 Intelligence Mesh (Inngest)
        await inngest.send({
          name: "job.harvested",
          data: {
            raw_title: item.title,
            raw_company: item.company || "Generic",
            raw_url: item.sourceUrl,
            raw_html: sanitizedHtml,
            source: source.name
          }
        });
        totalEmitted++;
      }

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
  cron: "*/10 * * * *",
  queue: { concurrencyLimit: 1 },
  run: async (payload: any, { ctx }: any) => {
    const triggerSource = payload?.source || ctx.trigger?.id || 'schedule';
    logger.info(`[harvest] Initiating signal pulse. Source: ${triggerSource}`);
    return await harvest({ unhealthySources: payload?.unhealthySources });
  },
});
