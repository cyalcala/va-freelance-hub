import "dotenv/config";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { siftOpportunity } from "../src/core/sieve";
import { createHash, randomUUID } from "crypto";

async function bypass() {
  console.log("🫀 [BYPASS] Initiating Heart-Lung Ingestion Bypass...");
  
  // 1. Fetch RAW signals from Supabase Pantry
  const { data: rawJobs, error } = await supabase
    .from('raw_job_harvests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
    
  if (error) {
    console.error("❌ [BYPASS] Failed to fetch from Pantry:", error);
    return;
  }
  
  if (!rawJobs || rawJobs.length === 0) {
    console.log("🚥 [BYPASS] Pantry is empty. No signals to sweep.");
    return;
  }
  
  console.log(`👨‍🍳 [BYPASS] Sifting ${rawJobs.length} signals...`);
  
  for (const job of rawJobs) {
    try {
      console.log(`🤖 [AI] Extracting: ${job.source_url}`);
      
      const content = job.raw_payload || job.title;
      const extraction = await AIMesh.extract(content, job.source_url);
      
      const md5_hash = createHash("md5")
        .update((extraction.title || '') + (extraction.company || ''))
        .digest("hex");

      const heuristic = siftOpportunity(
        extraction.title,
        extraction.description,
        extraction.company || "Generic",
        job.source_platform || "Bypass"
      );

      // Plate to Turso
      await db.insert(opportunities).values({
        id: randomUUID(),
        md5_hash,
        title: extraction.title,
        company: extraction.company || 'Confidential',
        url: job.source_url,
        description: extraction.description,
        salary: extraction.salary || null,
        niche: extraction.niche || heuristic.domain,
        type: extraction.type || 'direct',
        locationType: extraction.locationType || 'remote',
        sourcePlatform: `Apex Pulse Bypass (${job.source_platform})`,
        region: job.region || 'Global',
        scrapedAt: new Date(),
        isActive: true,
        tier: extraction.tier || 3,
        relevanceScore: 75,
        latestActivityMs: Date.now(),
        metadata: JSON.stringify(extraction.metadata || {}),
      }).onConflictDoUpdate({
        target: opportunities.md5_hash,
        set: {
          scrapedAt: new Date(),
          latestActivityMs: Date.now()
        }
      });
      
      // Cleanup Supabase
      await supabase.from('raw_job_harvests').delete().eq('id', job.id);
      console.log(`✅ [BYPASS] Plated: ${extraction.title}`);
      
    } catch (err: any) {
      console.error(`❌ [BYPASS] Failed job ${job.id}:`, err.message);
    }
  }
  
  console.log("🏁 [BYPASS] Manuever Complete. The pulse should be live on the frontend.");
}

bypass();
