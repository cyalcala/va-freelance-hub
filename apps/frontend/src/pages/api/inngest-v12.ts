/**
 * V12 SIFTER: Intelligent "Kitchen Brigade" Orchestrator
 * This route manages the asynchronous processing of raw jobs from the Supabase pantry
 * AND plates the results into the Turso Gold Vault for the frontend.
 */

import { Inngest } from "inngest";
import { serve } from "inngest/astro";

// 1. Initialize Inngest client
export const inngestClient = new Inngest({ id: "va-freelance-hub" });

/**
 * Chef Function: Poll the Supabase Pantry → Extract → Plate to Turso
 * Wakes up every 15 minutes, claims RAW jobs, processes them, and PLATES to Turso.
 */
const pantryPoll = inngestClient.createFunction(
  { 
    id: "v12-pantry-chef", 
    name: "V12 Pantry Chef",
    triggers: [{ cron: "*/15 * * * *" }] 
  },
  async ({ step }) => {
    // 2. Atomic Claim from Staging Buffer
    const { claimRawJob, supabase } = await import("../../../../../packages/db/supabase");
    const jobs = await step.run("claim-untouched-jobs", async () => {
      return await claimRawJob("inngest-chef-v12", 15);
    });

    if (!jobs || jobs.length === 0) return { status: "empty_pantry" };

    // 3. Process + Plate
    const processingResults = await step.run("extract-and-plate", async () => {
      const { AIMesh } = await import("../../../../../packages/ai/ai-mesh");
      const { db } = await import("../../../../../packages/db");
      const { opportunities } = await import("../../../../../packages/db/schema");
      const { eq } = await import("drizzle-orm");
      const crypto = await import("crypto");
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
          // A. AI Extraction
          const extraction = await AIMesh.extract(job.raw_payload);
          
          // B. PH-Compatibility Gate
          if (!extraction.isPhCompatible || extraction.tier === 4) {
            await supabase
              .from('raw_job_harvests')
              .update({ status: 'PROCESSED', triage_status: 'REJECTED' })
              .eq('id', job.id);
            results.push({ id: job.id, status: 'rejected_sifter' });
            continue;
          }

          // C. PLATING: Write to Turso Gold Vault (THE MISSING LINK)
          const md5_hash = crypto
            .createHash("md5")
            .update((extraction.title || '') + (extraction.company || ''))
            .digest("hex");

          // Idempotency check
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
              sourcePlatform: `V12 Mesh (${job.source_platform})`,
              scrapedAt: new Date(),
              isActive: true,
              tier: extraction.tier,
              relevanceScore: extraction.relevanceScore,
              latestActivityMs: Date.now(),
              metadata: JSON.stringify(extraction.metadata || {}),
            });
            results.push({ id: job.id, status: 'plated', title: extraction.title });
          } else {
            results.push({ id: job.id, status: 'duplicate' });
          }

          // D. Mark as PLATED in Supabase
          await supabase
            .from('raw_job_harvests')
            .update({ status: 'PLATED', triage_status: 'PASSED' })
            .eq('id', job.id);

        } catch (err: any) {
          const errorMsg = err.message || JSON.stringify(err);
          console.error(`👨‍🍳 [CHEF] Failed ${job.id}:`, errorMsg);
          
          await supabase
            .from('raw_job_harvests')
            .update({ status: 'FAILED', locked_by: null, error_log: errorMsg })
            .eq('id', job.id);
          results.push({ id: job.id, status: 'failed', error: errorMsg });
        }
      }
      return results;
    });

    return { status: "cycle_complete", processed: processingResults.length, results: processingResults };
  }
);

// 4. Export endpoint serve handlers
export const { GET, POST, PUT } = serve({ 
  client: inngestClient, 
  functions: [pantryPoll] 
});

