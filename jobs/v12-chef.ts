import { schedules } from "@trigger.dev/sdk/v3";
import { claimRawJob, supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";
import { siftOpportunity, OpportunityTier } from "../src/core/sieve";
const GHOST_SENTINEL = "||V12_GHOST_LEAD||";
const EDGE_PROXY_URL = process.env.EDGE_PROXY_URL || "https://va-edge-proxy.cyrusalcala-agency.workers.dev";
const EDGE_PROXY_SECRET = process.env.VA_PROXY_SECRET;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getCookablePayload(job: { raw_payload?: string; source_url?: string | null }): Promise<string> {
  if (job.raw_payload && job.raw_payload !== GHOST_SENTINEL && job.raw_payload.length >= 120) {
    return job.raw_payload;
  }
  if (!job.source_url) throw new Error("Missing source_url for ghost hydration");

  const proxiedUrl = new URL(EDGE_PROXY_URL);
  proxiedUrl.searchParams.set("url", job.source_url);
  const useEdgeProxy = Boolean(EDGE_PROXY_URL && EDGE_PROXY_SECRET);

  const res = await fetch(useEdgeProxy ? proxiedUrl.toString() : job.source_url, {
    signal: AbortSignal.timeout(15000),
    headers: useEdgeProxy
      ? { "X-VA-Proxy-Secret": EDGE_PROXY_SECRET as string, "user-agent": "VAHubSousChef/1.0 (+ghost-hydration)" }
      : { "user-agent": "VAHubSousChef/1.0 (+ghost-hydration)" },
  });
  if (!res.ok) throw new Error(`Hydration fetch failed: ${res.status}`);

  const html = await res.text();
  const text = htmlToText(html);
  if (!text || text.length < 120) throw new Error("Hydration yielded insufficient content");
  return text.slice(0, 20000);
}

/**
 * V12 SIFTER: The Sous Chef (Trigger.dev)
 * 
 * Roles:
 * 1. Scavenger: Picks up RAW jobs missed by Inngest (latency buffer).
 * 2. Plater: Writes results directly to the Turso Gold Vault.
 */
export const v12Chef = schedules.task({
  id: "v12-pantry-sous-chef",
  cron: "0,30 * * * *", // Every 30 minutes
  run: async (payload) => {
    const { getTriggerStatus, setTriggerExhausted } = await import("../packages/db/governance");
    
    // 1. V12 CIRCUIT BREAKER: Check if Scout is Allowed to Fly
    const status = await getTriggerStatus('trigger');
    if (!status.ok) {
      console.warn("🚫 [CIRCUIT BREAKER] Trigger.dev Sous-Chef PAUSED until next Month.");
      return { status: "paused_by_governance" };
    }

    try {
      console.log("👨‍🍳 [SOUS-CHEF] Starting Pantry Audit...");

      // 1. Claim Stale, Failed, or Untouched Jobs (Limit: 15)
      const jobs = await claimRawJob("trigger-chef-v12", 15);
      if (!jobs || jobs.length === 0) {
        return { status: "pantry_clean" };
      }

      console.log(`👨‍🍳 [SOUS-CHEF] Claimed ${jobs.length} jobs for processing/recovery.`);

      const results = [];

      for (const job of jobs) {
        try {
          const cookablePayload = await getCookablePayload(job);
          if (cookablePayload !== job.raw_payload) {
            await supabase
              .from("raw_job_harvests")
              .update({ raw_payload: cookablePayload, updated_at: new Date().toISOString() })
              .eq("id", job.id);
          }

          // 2. High-Precision AI Extraction
          console.log(`👨‍🍳 [SOUS-CHEF] Sifting Job ${job.id} (${job.region || "Global"})...`);
          
          const ingestionMeta = job.mapped_payload || {};
          const metadata = {
            source_platform: job.source_platform,
            region: ingestionMeta.ingestionRegion || job.region || 'Global',
            trustLevel: ingestionMeta.trustLevel || 'global',
            ...ingestionMeta
          };

          const sifterResult = await siftWithDualLLM(cookablePayload, metadata);

          if (!sifterResult || sifterResult.tier === OpportunityTier.TRASH) {
            await supabase
              .from('raw_job_harvests')
              .update({
                status: 'PROCESSED',
                triage_status: 'REJECTED',
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
            results.push({ id: job.id, status: 'rejected_sifter' });
            continue;
          }

          const finalExtraction = sifterResult;

          // 3. Gatekeeper: PH-Compatibility check
          if (finalExtraction.tier === OpportunityTier.TRASH) {
            await supabase
              .from('raw_job_harvests')
              .update({
                status: 'PROCESSED',
                triage_status: 'REJECTED',
                mapped_payload: finalExtraction,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
            results.push({ id: job.id, status: 'rejected_sifter' });
            continue;
          }

          // 4. PLATING: Connect to Turso Gold Vault (SRE Optimized Upsert)
          const md5_hash = createHash("md5")
            .update((finalExtraction.title || '') + (finalExtraction.company || ''))
            .digest("hex");

          const nowMs = Date.now();
          const plated = await db.insert(opportunities).values({
            id: randomUUID(),
            md5_hash,
            title: finalExtraction.title,
            company: finalExtraction.company || 'Confidential',
            url: job.source_url,
            description: finalExtraction.description,
            salary: finalExtraction.salary || null,
            niche: finalExtraction.niche,
            type: finalExtraction.type || 'direct',
            locationType: finalExtraction.locationType || 'remote',
            sourcePlatform: `Trigger Sifter (${job.source_platform})`,
            region: job.region || finalExtraction.region || 'Global',
            metadata: JSON.stringify(finalExtraction.metadata || {}),
          }).onConflictDoUpdate({
            target: opportunities.md5_hash,
            set: {
              lastSeenAt: new Date(),
              latestActivityMs: nowMs
            }
          });

          results.push({ id: job.id, status: "plated", title: finalExtraction.title });

          // 5. Cleanup Staging Buffer
          await supabase
            .from('raw_job_harvests')
            .update({ 
              status: 'PLATED', 
              triage_status: 'PASSED',
              mapped_payload: finalExtraction,
              locked_by: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

        } catch (err: any) {
          console.error(`👨‍🍳 [SOUS-CHEF] Failed ${job.id}:`, err.message);
          
          await supabase
            .from('raw_job_harvests')
            .update({ status: 'FAILED', locked_by: null, error_log: `Sous Chef Error: ${err.message}` })
            .eq('id', job.id);

          results.push({ id: job.id, status: "failed", error: err.message });
        }
      }

      return { status: "service_complete", results };
    } catch (err: any) {
      const isExhaustion = 
        err.message?.toLowerCase().includes("credit") || 
        err.message?.toLowerCase().includes("usage limit") ||
        err.message?.toLowerCase().includes("rate limit");

      if (isExhaustion) {
        await setTriggerExhausted(`Platform Error: ${err.message}`);
      }
    }
  },
});
