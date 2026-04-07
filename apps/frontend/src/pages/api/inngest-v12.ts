 * V12 SIFTER: Intelligent "Kitchen Brigade" Orchestrator
 * This route manages the asynchronous processing of raw jobs from the Supabase pantry
 * AND the batched synchronization (Sweep) to the Turso Gold Vault.
 */

import { Inngest } from "inngest";
import { serve } from "inngest/astro";
import crypto from "crypto";

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

    // 3. Process + Prep (Plate to Supabase Staging)
    const processingResults = await step.run("extract-and-prep", async () => {
      const { AIMesh } = await import("../../../../../packages/ai/ai-mesh");
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

          // C. PREP: Mark as PLATED with the extraction payload
          await supabase
            .from('raw_job_harvests')
            .update({ 
               status: 'PLATED', 
               triage_status: 'PASSED',
               mapped_payload: extraction,
               updated_at: new Date().toISOString() 
            })
            .eq('id', job.id);

          results.push({ id: job.id, status: 'plated', title: extraction.title });

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

/**
 * Sweep Function: The Dumb Conveyor Belt
 * Wakes up every 15 minutes, grabs PLATED jobs from Supabase, moves them to Turso, and PURGES.
 */
const syncSweep = inngestClient.createFunction(
  { id: "v12-sync-sweep", name: "V12 Sync Sweep", triggers: [{ cron: "*/15 * * * *" }] },
  async ({ step }) => {
    const { supabase } = await import("../../../../../packages/db/supabase");
    
    // 1. Fetch PLATED jobs with mapped data
    const batch = await step.run("fetch-plated-batch", async () => {
      const { data } = await supabase
        .from('raw_job_harvests')
        .select('*')
        .eq('status', 'PLATED')
        .not('mapped_payload', 'is', null)
        .limit(50); // Safe batch size for serverless timeouts
      return data || [];
    });

    if (batch.length === 0) return { status: "sweep_idle" };

    // 2. Translocate to Turso Gold Vault
    const translocationResult = await step.run("translocate-to-turso", async () => {
      const { db } = await import("../../../../../packages/db");
      const { opportunities } = await import("../../../../../packages/db/schema");
      const results = { successful_ids: [], skipped_ids: [] };

      for (const job of batch) {
        const mapped = job.mapped_payload;
        
        // Generate MD5 for idempotency check
        const md5_hash = crypto
            .createHash("md5")
            .update((mapped.title || '') + (mapped.company || ''))
            .digest("hex");

        try {
          await db.insert(opportunities).values({
            id: crypto.randomUUID(),
            md5_hash,
            title: mapped.title,
            company: mapped.company || 'Confidential',
            url: job.source_url,
            description: mapped.description,
            salary: mapped.salary || null,
            niche: mapped.niche,
            type: mapped.type || 'direct',
            locationType: mapped.locationType || 'remote',
            sourcePlatform: `V12 Mesh (${job.source_platform})`,
            scrapedAt: new Date(job.created_at),
            isActive: true,
            tier: mapped.tier,
            relevanceScore: mapped.relevanceScore,
            latestActivityMs: Date.now(),
            metadata: JSON.stringify(mapped.metadata || {}),
          }).onConflictDoNothing(); // The Idempotency Shield

          results.successful_ids.push(job.id);
        } catch (err) {
          console.error(`🔴 [SWEEP] Failed job ${job.id}:`, err);
        }
      }
      return results;
    });

    // 3. GC: Atomic Purge from Supabase (Only what was moved)
    if (translocationResult.successful_ids.length > 0) {
      await step.run("purge-from-pantry", async () => {
        await supabase
          .from('raw_job_harvests')
          .delete()
          .in('id', translocationResult.successful_ids);
      });
    }

    return { 
      status: "sweep_complete", 
      moved: translocationResult.successful_ids.length 
    };
  }
);

// 4. Export endpoint serve handlers
export const { GET, POST, PUT } = serve({ 
  client: inngestClient, 
  functions: [pantryPoll, syncSweep] 
});

