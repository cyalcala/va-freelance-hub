import { schedules } from "@trigger.dev/sdk/v3";
import { claimRawJob, supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

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
    console.log("👨‍🍳 [SOUS-CHEF] Starting Pantry Audit...");

    // 1. Claim Stale, Failed, or Untouched Jobs (Limit: 15)
    const jobs = await claimRawJob("trigger-chef-v12", 15);
    if (!jobs || jobs.length === 0) {
      return { status: "pantry_clean" };
    }

    console.log(`👨‍🍳 [SOUS-CHEF] Claimed ${jobs.length} jobs for processing/recovery.`);

    const results = [];

    for (const job of jobs) {
      // Skip Ghost Leads that haven't been scraped yet
      if (job.raw_payload === '||V12_GHOST_LEAD||' || !job.raw_payload || job.raw_payload.length < 100) {
        await supabase
          .from('raw_job_harvests')
          .update({ status: 'RAW', locked_by: null })
          .eq('id', job.id);
        results.push({ id: job.id, status: 'skipped_ghost' });
        continue;
      }

      try {
        // 2. High-Precision AI Extraction
        console.log(`👨‍🍳 [SOUS-CHEF] Sifting Job ${job.id}...`);
        const extraction = await AIMesh.extract(job.raw_payload);

        // 3. Gatekeeper: PH-Compatibility check
        if (!extraction.isPhCompatible || extraction.tier === 4) {
          await supabase
            .from('raw_job_harvests')
            .update({ status: 'PROCESSED', triage_status: 'REJECTED' })
            .eq('id', job.id);
          results.push({ id: job.id, status: 'rejected_sifter' });
          continue;
        }

        // 4. PLATING: Connect to Turso Gold Vault
        const md5_hash = crypto
          .createHash("md5")
          .update((extraction.title || '') + (extraction.company || ''))
          .digest("hex");

        const existing = await db
          .select()
          .from(opportunities)
          .where(eq(opportunities.md5_hash, md5_hash));

        if (existing.length === 0) {
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
            sourcePlatform: `Trigger Sifter (${job.source_platform})`,
            scrapedAt: new Date(),
            isActive: true,
            tier: extraction.tier,
            relevanceScore: extraction.relevanceScore,
            latestActivityMs: Date.now(),
            metadata: JSON.stringify(extraction.metadata || {}),
          });
          results.push({ id: job.id, status: "plated", title: extraction.title });
        } else {
          results.push({ id: job.id, status: "duplicate" });
        }

        // 5. Cleanup Staging Buffer
        await supabase
          .from('raw_job_harvests')
          .update({ 
            status: 'PLATED', 
            triage_status: 'PASSED'
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
  },
});
