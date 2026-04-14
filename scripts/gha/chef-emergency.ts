import { claimRawJob, supabase } from "../../packages/db/supabase";
import { db } from "../../packages/db";
import { opportunities } from "../../packages/db/schema";
import { siftWithDualLLM, OpportunityTier } from "../../src/core/sieve";
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
      ? { "X-VA-Proxy-Secret": EDGE_PROXY_SECRET as string, "user-agent": "VAHubGhaChef/1.0 (+ghost-hydration)" }
      : { "user-agent": "VAHubGhaChef/1.0 (+ghost-hydration)" },
  });
  if (!res.ok) throw new Error(`Hydration fetch failed: ${res.status}`);

  const html = await res.text();
  const text = htmlToText(html);
  if (!text || text.length < 120) throw new Error("Hydration yielded insufficient content");
  return text.slice(0, 20000);
}

/**
 * 👨‍🍳 GHA CHEF: The Executive Serverless Cook
 * 
 * Claims RAW jobs from the Bodega, applies AI Mesh logic,
 * and Plates them to the Turso Gold Vault.
 */
async function runEmergencyChef(batchSize: number = 15) {
  console.log(`👨‍🍳 [CHEF] Opening Kitchen. Checking Bodega for un-cooked tasks (Limit: ${batchSize})...`);

  // 1. Claim Jobs securely
  const jobs = await claimRawJob("gha-chef-" + crypto.randomUUID().slice(0, 8), batchSize);
  
  if (!jobs || jobs.length === 0) {
    console.log("📭 [CHEF] Kitchen Closed. The Bodega is empty.");
    return;
  }

  console.log(`👨‍🍳 [CHEF] Claimed ${jobs.length} raw ingredients. Starting extraction...`);

  for (const job of jobs) {
    try {
      console.log(`\n--- Cooking: ${job.source_platform} [${job.id}] (${(job.mapped_payload as any)?.region || 'Global'}) ---`);
      
      const ingestionMeta = job.mapped_payload || {};
      const metadata = {
        source_platform: job.source_platform,
        region: ingestionMeta.region || 'Global',
        trustLevel: ingestionMeta.trustLevel || 'global',
        ...ingestionMeta
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
        console.log(`🛡️ [CHEF] Sieve rejected standard. Sweeping into bin (Quality/Geo).`);
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
          mapped_payload: extraction, // Store final state
          locked_by: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      
      console.log(`✅ [PLATED] Perfectly cooked: "${extraction.title}"`);

    } catch (err: any) {
      console.error(`❌ [CHEF] Burnt dish ${job.id}:`, err.message);
      
      // If we hit Rate Limits or crashes, release the lock so next run can try again
      const isRateLimit = err.message.includes('429');
      
      await supabase
        .from('raw_job_harvests')
        .update({ 
          status: isRateLimit ? 'RAW' : 'FAILED', 
          locked_by: null, 
          error_log: err.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
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
