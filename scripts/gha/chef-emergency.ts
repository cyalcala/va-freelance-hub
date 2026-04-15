import { claimRawJob, supabase } from "../../packages/db/supabase";
import { db } from "../../packages/db";
import { opportunities } from "../../packages/db/schema";
import { siftWithDualLLM, OpportunityTier } from "../../src/core/sieve";
import crypto from "crypto";

const GHOST_SENTINEL = "||V12_GHOST_LEAD||";
const EDGE_PROXY_URL = process.env.EDGE_PROXY_URL || "https://va-edge-proxy.cyrusalcala-agency.workers.dev";
const EDGE_PROXY_SECRET = process.env.VA_PROXY_SECRET;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  let tries = 0;
  while (tries < 2) {
    try {
      const res = await fetch(useEdgeProxy ? proxiedUrl.toString() : job.source_url, {
        signal: AbortSignal.timeout(15000),
        headers: useEdgeProxy
          ? { "X-VA-Proxy-Secret": EDGE_PROXY_SECRET as string, "user-agent": "VAHubGhaChef/1.0 (+ghost-hydration)" }
          : { "user-agent": "VAHubGhaChef/1.0 (+ghost-hydration)" },
      });
      if (!res.ok) throw new Error(`Hydration fetch failed: ${res.status}`);

      const html = await res.text();
      const text = htmlToText(html);
      if (!text || text.length < 120) throw new Error("Hydration yielded insufficient content");
      return text.slice(0, 20000);
    } catch (err) {
      tries++;
      if (tries >= 2) throw err;
      console.warn(`⚠️ [CHEF] Hydration failed. Retrying...`);
      await sleep(2000);
    }
  }
  throw new Error("Hydration exhausted");
}

/**
 * 👨‍🍳 GHA CHEF: The Executive Serverless Cook
 */
async function runEmergencyChef(batchSize: number = 15) {
  const runnerId = 'gha-chef';
  console.log(`👨‍🍳 [CHEF] Opening Kitchen. Checking Bodega for un-cooked tasks (Limit: ${batchSize})...`);

  const { emitProcessingHeartbeat } = await import("../../packages/db/governance");
  await emitProcessingHeartbeat(runnerId, 'Global');

  // 1. Claim Jobs securely
  const jobs = await claimRawJob(runnerId + "-" + crypto.randomUUID().slice(0, 8), batchSize);
  
  if (!jobs || jobs.length === 0) {
    console.log("📭 [CHEF] Kitchen Closed. The Bodega is empty.");
    return;
  }

  console.log(`👨‍🍳 [CHEF] Claimed ${jobs.length} raw ingredients. Starting extraction...`);

  for (const job of jobs) {
    const meta = (job.mapped_payload as any) || {};
    const retries = meta.retry_count || 0;

    try {
      console.log(`\n--- Cooking: ${job.source_platform} [${job.id}] (Retry: ${retries}) ---`);
      
      const metadata = {
        source_platform: job.source_platform,
        region: meta.region || 'Global',
        trustLevel: meta.trustLevel || 'global',
        ...meta
      };

      // 2. Hydration Phase (Ghost Lead Support)
      const cookablePayload = await getCookablePayload(job);
      if (cookablePayload !== job.raw_payload) {
         await supabase.from('raw_job_harvests').update({ raw_payload: cookablePayload, updated_at: new Date().toISOString() }).eq('id', job.id);
      }

      // 3. AI Extraction + Sieve Alignment
      const extraction = await siftWithDualLLM(cookablePayload, metadata);
      
      // 4. Quality Guardrails
      if (!extraction || extraction.tier === OpportunityTier.TRASH) {
        console.log(`🛡️ [CHEF] Sieve rejected standard. Sweeping into bin.`);
        await supabase
          .from('raw_job_harvests')
          .update({ 
            status: 'PROCESSED', 
            triage_status: 'REJECTED',
            locked_by: null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);
        continue;
      }

      // 5. PLATING to Turso Gold Vault
      const md5_hash = crypto.createHash("md5")
        .update((extraction.title || '') + (extraction.company || ''))
        .digest("hex");

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
        sourcePlatform: `GHA Chef (${job.source_platform})`,
        scrapedAt: new Date(),
        isActive: true,
        tier: extraction.tier,
        relevanceScore: extraction.relevanceScore,
        latestActivityMs: Date.now(),
        region: metadata.region,
        metadata: JSON.stringify(extraction.metadata || {}),
      }).onConflictDoUpdate({
        target: opportunities.md5_hash,
        set: {
            lastSeenAt: new Date(),
            latestActivityMs: Date.now()
        }
      });

      // 6. Finalize in Bodega
      await supabase
        .from('raw_job_harvests')
        .update({ 
          status: 'PLATED', 
          triage_status: 'PASSED',
          mapped_payload: { ...meta, ...extraction, retry_count: 0 }, 
          locked_by: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      
      console.log(`✅ [PLATED] Perfectly cooked: "${extraction.title}"`);

    } catch (err: any) {
      console.error(`❌ [CHEF] Burnt dish ${job.id}:`, err.message);
      
      const isRateLimit = err.message.includes('429');
      const nextRetry = retries + 1;

      if (isRateLimit) {
        console.warn(`🛑 [CHEF] Provider throttle detected. Backing off...`);
        await sleep(5000); 
      }

      if (nextRetry >= 3) {
        console.error(`🚫 [CHEF] Job ${job.id} exhausted. Giving up after 3 attempts.`);
        await supabase
          .from('raw_job_harvests')
          .update({ 
            status: 'FAILED', 
            locked_by: null, 
            error_log: `Exhausted 3 retries. Last Error: ${err.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      } else {
        // Recycle back to RAW for another chef to try later
        await supabase
          .from('raw_job_harvests')
          .update({ 
            status: 'RAW', 
            locked_by: null, 
            mapped_payload: { ...meta, retry_count: nextRetry },
            error_log: `Retry ${nextRetry}/3: ${err.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }
  }

  console.log("\n👨‍🍳 [CHEF] Service complete.");
}

// Emulate batching on the GHA side if needed
async function main() {
  const BATCHES = 3; // Cook 45 jobs per 30m GHA run 
  for (let i = 0; i < BATCHES; i++) {
    console.log(`\n--- GHA CHEF CYCLE ${i+1}/${BATCHES} ---`);
    await runEmergencyChef(15);
  }
}

main().catch((err) => {
  console.error("CRITICAL KITCHEN ERROR:", err);
  process.exit(1);
});
