import { claimRawJob } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { supabase } from "../packages/db/supabase";

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
    // 2. AI Extraction
    console.log("🧠 Processing with AI Mesh...");
    const extraction = await AIMesh.extract(job.raw_payload);
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
