import { claimRawJob, supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { siftWithDualLLM, OpportunityTier } from "../src/core/sieve";
import crypto from "crypto";

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
      ? { "X-VA-Proxy-Secret": EDGE_PROXY_SECRET as string, "user-agent": "VAHubBatchChef/1.0 (+ghost-hydration)" }
      : { "user-agent": "VAHubBatchChef/1.0 (+ghost-hydration)" },
  });
  if (!res.ok) throw new Error(`Hydration fetch failed: ${res.status}`);

  const html = await res.text();
  const text = htmlToText(html);
  if (!text || text.length < 120) throw new Error("Hydration yielded insufficient content");
  return text.slice(0, 20000);
}

/**
 * 👨‍🍳 V12 PANTRY CHEF (Batch Edition)
 * 
 * Role: 
 * 1. Claim RAW jobs from Supabase in batches.
 * 2. Process with AI Mesh (Vector 1 + OpenRouter Rotation).
 * 3. Enforce Phosphorus Shield (Geo-Exclusion).
 * 4. Plate to Turso Gold Vault.
 */

async function runChef(batchSize: number = 10) {
  console.log(`👨‍🍳 [CHEF] Starting batch processing (Size: ${batchSize})...`);

  const jobs = await claimRawJob("manual-chef-batch", batchSize);
  if (!jobs || jobs.length === 0) {
    console.log("📭 Pantry is empty of RAW jobs.");
    return;
  }

  console.log(`👨‍🍳 [CHEF] Claimed ${jobs.length} jobs. Starting extraction...`);

  for (const job of jobs) {
    try {
      console.log(`\n--- Processing: ${job.source_platform} [${job.id}] (${job.region || 'Global'}) ---`);
      
      const ingestionMeta = job.mapped_payload || {};
      const metadata = {
        source_platform: job.source_platform,
        region: ingestionMeta.ingestionRegion || job.region || 'Global',
        trustLevel: ingestionMeta.trustLevel || 'global',
        ...ingestionMeta
      };

      // Hydration Phase (Ghost Support)
      const cookablePayload = await getCookablePayload(job);
      if (cookablePayload !== job.raw_payload) {
         await supabase.from('raw_job_harvests').update({ raw_payload: cookablePayload }).eq('id', job.id);
      }

      // AI Extraction + Sieve with DualLLM (Vector 1 + Vector 2 / Gemini)
      const extraction = await siftWithDualLLM(cookablePayload, metadata);
      
      // 🛡️ PHOSPHORUS SHIELD
      if (!extraction || extraction.tier === OpportunityTier.TRASH) {
        console.log(`🛡️ [SHIELD] Dropped: ${job.source_url} (Reason: Quality/Geo)`);
        await supabase
          .from('raw_job_harvests')
          .update({ 
            status: 'PROCESSED', 
            triage_status: 'REJECTED',
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);
        continue;
      }

      // 📀 PLATING
      const md5_hash = extraction.md5_hash;

      await db.insert(opportunities).values({
        id: crypto.randomUUID(),
        md5_hash,
        title: extraction.title,
        company: extraction.company || 'Confidential',
        url: job.source_url,
        description: extraction.description,
        salary: extraction.salary || null,
        niche: extraction.domain,
        type: extraction.type || 'direct',
        locationType: extraction.locationType || 'remote',
        sourcePlatform: `Batch Chef (${job.source_platform})`,
        scrapedAt: new Date(),
        isActive: true,
        tier: extraction.tier,
        relevanceScore: extraction.relevanceScore,
        latestActivityMs: Date.now(),
        region: job.region || extraction.region || 'Global',
        metadata: JSON.stringify(extraction.metadata || {}),
      }).onConflictDoUpdate({
        target: opportunities.md5_hash,
        set: {
            lastSeenAt: new Date(),
            latestActivityMs: Date.now()
        }
      });

      await supabase
        .from('raw_job_harvests')
        .update({ 
          status: 'PLATED', 
          triage_status: 'PASSED',
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      
      console.log(`✅ [PLATED] ${extraction.title}`);

      await supabase
        .from('raw_job_harvests')
        .update({ 
          status: 'PLATED', 
          triage_status: 'PASSED',
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      
      console.log(`✅ [PLATED] ${extraction.title}`);

    } catch (err: any) {
      console.error(`❌ [ERROR] Failed to process ${job.id}:`, err.message);
      await supabase
        .from('raw_job_harvests')
        .update({ status: 'FAILED', locked_by: null, error_log: err.message })
        .eq('id', job.id);
    }
  }

  console.log("\n👨‍🍳 [CHEF] Batch complete.");
}

// Run multiple batches if needed
async function main() {
  const BATCHES = 10; // Total 100 jobs for this pulse
  for (let i = 0; i < BATCHES; i++) {
    console.log(`\n--- BATCH ${i+1}/${BATCHES} ---`);
    await runChef(10);
  }
}

main().catch(console.error);
