import { db } from "../../packages/db/client";
import { logs as logsSchema } from "../../packages/db/schema";
import { fetchRSSFeed, rssSources } from "../../jobs/lib/scraper";
import { fetchRedditJobs } from "../../jobs/lib/reddit";
import { fetchJobicyJobs } from "../../jobs/lib/jobicy";
import { fetchATSJobs } from "../../jobs/lib/ats";
import { fetchJSONFeed } from "../../jobs/lib/json-harvester";
import { probeAgencies } from "../../jobs/lib/agency-sensor";
import { fetchWeWorkRemotelyJobs } from "../../jobs/lib/weworkremotely";
import { fetchGoldmineJobs, goldmineSources } from "../../jobs/lib/ph-goldmines";
import { config } from "../../packages/config";
import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "../../packages/db";
import { stripJunk } from "../../apps/frontend/src/lib/ai/waterfall";
import { supabase } from "../../packages/db/supabase";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1"
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

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

/**
 * 🏹 GHA HUNTER: The Supply Runner
 * Bypasses Inngest entirely and stages directly into the Supabase Bodega.
 */
async function runEmergencyHarvest() {
  const runnerId = 'gha';
  console.log("🏹 [HUNTER] Starting Sovereign Hardened Execution...");

  const { emitIngestionHeartbeat } = await import("../../packages/db/governance");
  await emitIngestionHeartbeat(runnerId, 'Global');

  const startTime = Date.now();
  await recordLog(`══ Starting Hardened GHA Signal Harvesting Sequence ══`, "info");

  const sources = [
    ...rssSources.map(s => ({ 
      id: `rss-${s.id}`, 
      name: s.name, 
      region: (s as any).region || "Global", 
      fn: () => fetchRSSFeed({ ...s, headers: { "User-Agent": getRandomUA() } } as any) 
    })),
    { 
      id: "reddit-json", 
      name: "Reddit JSON", 
      region: "Global", 
      fn: () => fetchRedditJobs() 
    },
    { 
      id: "jobicy-api", 
      name: "Jobicy API", 
      region: "Global", 
      fn: () => fetchJobicyJobs(db) 
    },
    { 
      id: "direct-ats", 
      name: "Direct ATS", 
      region: "Global", 
      fn: () => fetchATSJobs(db) 
    },
    ...config.json_sources.map(s => ({ 
      id: `json-${s.id}`, 
      name: s.name, 
      region: (s as any).region || "Global", 
      fn: () => fetchJSONFeed(s as any) 
    })),
    { 
      id: "agency-sensor", 
      name: "Agency Sensor", 
      region: "Philippines", 
      fn: () => probeAgencies(db) 
    },
    { 
      id: "weworkremotely", 
      name: "We Work Remotely", 
      region: "Global", 
      fn: () => fetchWeWorkRemotelyJobs() 
    },
    ...goldmineSources.map(s => ({ 
      id: `goldmine-${s.name.toLowerCase()}`, 
      name: s.name, 
      region: "Philippines", 
      fn: () => fetchGoldmineJobs(s.name) 
    }))
  ];

  let totalEmitted = 0;

  for (const source of sources) {
    try {
      console.log(`\n🏹 [HUNTER] Searching zone: ${source.name}...`);
      const items = await source.fn();
      if (!items || items.length === 0) continue;

      console.log(`🏹 [HUNTER] Retrieved ${items.length} raw signals from ${source.name}. Staging to Bodega...`);

      // Stage items into Bodega (Supabase raw_job_harvests)
      const uploads = items.map(item => {
        const rawContent = item.description || (item as any).__raw || "";
        
        // 🛡️ SURGICAL SANITIZATION
        const sanitizedHtml = stripJunk(rawContent)
          .replace(/<svg[\s\S]*?<\/svg>/gi, "") // Remove bloated SVGs
          .replace(/data:image\/[^;]+;base64[^"]+/g, "") // Remove base64 images
          .trim();

        const finalPayload = sanitizedHtml.length > 50 
          ? sanitizedHtml.slice(0, 16000) // Increase buffer slightly for better AI context
          : "||V12_GHOST_LEAD||";

        return {
          source_url: item.link || item.url || `ghost-${uuidv4()}`,
          raw_payload: finalPayload,
          source_platform: source.name,
          status: 'RAW' as const,
          triage_status: 'PENDING' as const,
          mapped_payload: {
            raw_title: item.title,
            raw_company: item.company || "Generic",
            region: source.region || "Global",
            harvested_at: Date.now(),
            md5_hash: (item as any).md5_hash,
            niche: (item as any).niche,
            salary: (item as any).salary,
            tier_hint: (item as any).tier_hint || 3,
            metadata: (item as any).metadata || {}
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      // BATCH UPSERT into Supabase
      // 🛡️ DE-DUPLICATION: Ensure unique source_url per batch
      const uniqueUploads = Array.from(new Map(uploads.map(u => [u.source_url, u])).values());

      const { error } = await supabase.from('raw_job_harvests').upsert(uniqueUploads, { onConflict: 'source_url' });
      if (error) {
        console.error(`❌ [HUNTER] Bodega Reject for ${source.name}:`, error.message);
      } else {
        totalEmitted += uploads.length;
        await recordLog(`Staged ${uploads.length} signals into Bodega from ${source.name}`, "info");
      }
    } catch (err: any) {
      await recordLog(`Source failure: ${source.name} - ${err.message}`, "error");
    }
  }

  const { recordHarvestSuccess } = await import("../../packages/db/governance");
  if (totalEmitted > 0) {
    await recordHarvestSuccess(runnerId, 'Global');
  }

  const totalDuration = Date.now() - startTime;
  await recordLog(`GHA Harvest complete. ${totalEmitted} signals staged into the Bodega.`, "snapshot", { totalEmitted, durationMs: totalDuration });

  console.log(`\n🏹 [HUNTER] Hunt Concluded. Total signals: ${totalEmitted}`);
  process.exit(0);
}

runEmergencyHarvest().catch(console.error);
