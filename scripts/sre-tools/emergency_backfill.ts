import { supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { createHash, randomUUID } from "crypto";

async function backfillFailedJobs() {
  console.log("═══ EMERGENCY SRE RECOVERY: BACKFILL FAILED JOBS ═══");
  
  try {
    const { data: failedJobs, error } = await supabase
      .from('raw_job_harvests')
      .select('*')
      .eq('status', 'FAILED');

    if (error || !failedJobs || failedJobs.length === 0) {
      console.log("No failed jobs found for backfill.");
      return;
    }

    console.log(`Recovering ${failedJobs.length} failed jobs...`);

    for (const job of failedJobs) {
      try {
        console.log(`\n- Retrying ID: ${job.id}`);
        const extraction = await AIMesh.extract(job.raw_payload || "");
        
        const md5_hash = createHash("md5")
          .update((extraction.title || '') + (extraction.company || ''))
          .digest("hex");

        await db.insert(opportunities).values({
          id: randomUUID(),
          md5_hash,
          title: extraction.title,
          company: extraction.company || 'Confidential',
          url: job.source_url,
          description: extraction.description,
          salary: extraction.salary || null,
          niche: extraction.niche,
          type: extraction.type || 'direct',
          locationType: extraction.locationType || 'remote',
          sourcePlatform: `SRE Backfill (${job.source_platform})`,
          scrapedAt: new Date(),
          isActive: true,
          tier: extraction.tier,
          relevanceScore: extraction.relevanceScore,
          latestActivityMs: Date.now(),
          metadata: JSON.stringify(extraction.metadata || {}),
        }).onConflictDoUpdate({
           target: opportunities.md5_hash,
           set: { latestActivityMs: Date.now() }
        });

        await supabase
          .from('raw_job_harvests')
          .update({ status: 'PLATED', updated_at: new Date().toISOString(), error_log: null })
          .eq('id', job.id);

        console.log(`✅ RECOVERED: ${extraction.title}`);

      } catch (err: any) {
        console.error(`❌ Still failing ${job.id}:`, err.message);
        await supabase.from('raw_job_harvests').update({ error_log: `Backfill Retry: ${err.message}` }).eq('id', job.id);
      }
    }

  } catch (err: any) {
    console.error("Backfill Failed:", err.message);
  }
}

backfillFailedJobs();
