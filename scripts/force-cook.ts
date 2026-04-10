import { claimRawJob } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { supabase } from "../packages/db/supabase";

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

  console.log(`📡 [HYDRATE] Fetching content for: ${job.source_url}`);
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

async function forceCook() {
  console.log("👨‍🍳 [FORCE-COOK] Attempting manual job processing...");

  // 1. Claim 1 Job
  const jobs = await claimRawJob("manual-force-cook", 1);
  if (!jobs || jobs.length === 0) {
    console.log("📭 No RAW jobs found in the pantry.");
    process.exit(0);
  }

  const job = jobs[0];
  console.log(`👨‍🍳 [FORCE-COOK] Claimed Job: ${job.id} (${job.source_platform})`);

  try {
    // 2. Hydration & AI Extraction
    const cookablePayload = await getCookablePayload(job);
    console.log("🧠 Processing with AI Mesh...");
    const extraction = await AIMesh.extract(cookablePayload);
    console.log("✨ AI Result:", JSON.stringify(extraction, null, 2));

    // 3. Logic Check
    if (!extraction.isPhCompatible || extraction.tier === 4) {
      console.log("❌ Job Rejected (Not PH Compatible or Tier 4)");
      await supabase
        .from('raw_job_harvests')
        .update({ status: 'PROCESSED', triage_status: 'REJECTED' })
        .eq('id', job.id);
    } else {
      // 4. Plating to Turso
      const md5_hash = crypto
        .createHash("md5")
        .update((extraction.title || '') + (extraction.company || ''))
        .digest("hex");

      console.log("📀 Plating to Turso Vault...");
      await db.insert(opportunities).values({
        id: crypto.randomUUID(),
        md5_hash,
        title: extraction.title,
        company: extraction.company || 'Confidential',
        url: job.source_url,
        description: extraction.description,
        salary: extraction.salary || null,
        niche: extraction.niche,
        type: extraction.type || 'direct',
        locationType: extraction.locationType || 'remote',
        sourcePlatform: `Manual Force Cook (${job.source_platform})`,
        scrapedAt: new Date(),
        isActive: true,
        tier: extraction.tier,
        relevanceScore: extraction.relevanceScore,
        latestActivityMs: Date.now(),
        metadata: JSON.stringify(extraction.metadata || {}),
      });

      // 5. Mark as PLATED
      await supabase
        .from('raw_job_harvests')
        .update({ status: 'PLATED', triage_status: 'PASSED' })
        .eq('id', job.id);
      
      console.log("✅ SUCCESS: Job plated and marked in Supabase.");
    }
  } catch (err: any) {
    console.error("❌ FORCE-COOK FAILED:", err.message);
    await supabase
      .from('raw_job_harvests')
      .update({ status: 'FAILED', locked_by: null, error_log: `Force Cook Error: ${err.message}` })
      .eq('id', job.id);
  }

  process.exit(0);
}

forceCook();
