/**
 * V12 SIFTER: Intelligent "Kitchen Brigade" Orchestrator
 * This route manages the asynchronous processing of raw jobs from the Supabase pantry
 * AND the batched synchronization (Sweep) to the Turso Gold Vault.
 */

import { Inngest } from "inngest";
import { serve } from "inngest/astro";
import { createHash, randomUUID } from "crypto";
import { siftOpportunity, OpportunityTier } from "../../../../../src/core/sieve";

// 1. Initialize Inngest client
export const inngestClient = new Inngest({ id: "va-freelance-hub" });
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
      ? { "X-VA-Proxy-Secret": EDGE_PROXY_SECRET as string, "user-agent": "VAHubKitchen/1.0 (+ingest-hydration)" }
      : { "user-agent": "VAHubKitchen/1.0 (+ingest-hydration)" },
  });
  if (!res.ok) throw new Error(`Hydration fetch failed: ${res.status}`);

  const html = await res.text();
  const text = htmlToText(html);
  if (!text || text.length < 120) throw new Error("Hydration yielded insufficient content");
  return text.slice(0, 20000);
}

/**
 * Chef Function: Poll the Supabase Pantry → Extract → Plate to Turso
 * Wakes up every 10 minutes, claims RAW jobs, processes them, and PLATES to Turso.
 */
const pantryPoll = inngestClient.createFunction(
  { 
    id: "v12-pantry-chef", 
    name: "V12 Pantry Chef",
    triggers: [{ cron: "*/10 * * * *" }, { event: "pantry.poll" }] 
  },
  async ({ step }) => {
    // 2. Atomic Claim from Staging Buffer
    const { claimRawJob, supabase } = await import("../../../../../packages/db/supabase");
    const jobs = await step.run("claim-untouched-jobs", async () => {
      return await claimRawJob("inngest-chef-v12", 15);
    });

    if (!jobs || jobs.length === 0) {
      await step.run("emit-idle-heartbeat", async () => {
        const { emitProcessingHeartbeat } = await import("../../../../../packages/db/governance");
        await emitProcessingHeartbeat("v12-chef-idle");
      });
      return { status: "empty_pantry" };
    }

    // 3. Process + Prep (Plate to Supabase Staging)
    const processingResults = await step.run("extract-and-prep", async () => {
      const { AIMesh } = await import("../../../../../packages/ai/ai-mesh");
      const results = [];

          // A. PH-Compatibility Gate & Regional Isolation
          const { config } = await import("../../../../../packages/config");
          const jobRegion = (job as any).region || "Global";
          const isPrimary = jobRegion === config.primary_region;

          let finalExtraction;
          
          if (isPrimary) {
            const cookablePayload = await getCookablePayload(job);
            if (cookablePayload !== job.raw_payload) {
              await supabase
                .from("raw_job_harvests")
                .update({ raw_payload: cookablePayload, updated_at: new Date().toISOString() })
                .eq("id", job.id);
            }

            // High-Fidelity AI Extraction
            const extraction = await AIMesh.extract(cookablePayload);
            const heuristic = siftOpportunity(
              extraction.title,
              extraction.description,
              extraction.company || "Generic",
              job.source_platform || "V12 Mesh"
            );
            finalExtraction = {
              ...extraction,
              niche: heuristic.domain,
              tier: heuristic.tier,
              relevanceScore: Math.max(extraction.relevanceScore ?? 0, heuristic.relevanceScore),
              metadata: {
                ...(extraction.metadata || {}),
                sieveTier: heuristic.tier,
                sieveDomain: heuristic.domain,
                region: jobRegion
              },
            };
          } else {
            // Metadata-Only Skeleton
            console.log(`🚥 [GOLDILOCKS] Metadata-Only sifting in Pantry for ${jobRegion}`);
            const heuristic = siftOpportunity(job.title || "Unknown", job.raw_payload || "", job.source_platform || "V12", "Metadata Only");
            finalExtraction = {
               title: job.title || "Job Opportunity",
               company: "Confidential",
               description: "Metadata-only signal sync.",
               salary: null,
               niche: heuristic.domain,
               type: 'direct',
               locationType: 'remote',
               tier: heuristic.tier,
               relevanceScore: 0,
               isPhCompatible: true,
               metadata: { meta_only: true, region: jobRegion }
            };
          }
          
          // B. Sifter Guard
          if (isPrimary && (!finalExtraction.isPhCompatible || finalExtraction.tier === OpportunityTier.TRASH)) {
            await supabase
              .from('raw_job_harvests')
              .update({
                status: 'PROCESSED',
                triage_status: 'REJECTED',
                mapped_payload: finalExtraction,
                updated_at: new Date().toISOString(),
              })
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
               mapped_payload: finalExtraction,
               updated_at: new Date().toISOString() 
            })
            .eq('id', job.id);

          results.push({ id: job.id, status: 'plated', title: finalExtraction.title });

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

    await step.run("emit-processing-heartbeat", async () => {
      const { emitProcessingHeartbeat } = await import("../../../../../packages/db/governance");
      await emitProcessingHeartbeat("v12-chef-cycle");
    });

    return { status: "cycle_complete", processed: processingResults.length, results: processingResults };
  }
);

/**
 * Sweep Function: The Dumb Conveyor Belt
 * Wakes up every 15 minutes, grabs PLATED jobs from Supabase, moves them to Turso, and PURGES.
 */
const syncSweep = inngestClient.createFunction(
  { id: "v12-sync-sweep", name: "V12 Sync Sweep", triggers: [{ cron: "*/15 * * * *" }, { event: "pantry.sweep" }] },
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

    if (batch.length === 0) {
      await step.run("emit-idle-heartbeat", async () => {
        const { emitProcessingHeartbeat } = await import("../../../../../packages/db/governance");
        await emitProcessingHeartbeat("v12-sweep-idle");
      });
      return { status: "sweep_idle" };
    }

    // 2. Translocate to Turso Gold Vault
    const translocationResult = await step.run("translocate-to-turso", async () => {
      const { db } = await import("../../../../../packages/db");
      const { opportunities } = await import("../../../../../packages/db/schema");
      const results: { successful_ids: string[]; skipped_ids: string[] } = { successful_ids: [], skipped_ids: [] };

      for (const job of batch) {
        const mapped = job.mapped_payload;
        const fallbackHeuristic = siftOpportunity(
          mapped.title || "",
          mapped.description || "",
          mapped.company || "Generic",
          job.source_platform || "V12 Sweep"
        );
        const finalMapped = {
          ...mapped,
          niche: mapped.niche || fallbackHeuristic.domain,
          tier: typeof mapped.tier === "number" ? mapped.tier : fallbackHeuristic.tier,
          relevanceScore: typeof mapped.relevanceScore === "number" ? mapped.relevanceScore : fallbackHeuristic.relevanceScore,
        };
        
        // Generate MD5 for idempotency check
        const md5_hash = createHash("md5")
            .update((finalMapped.title || '') + (finalMapped.company || ''))
            .digest("hex");

        try {
          await db.insert(opportunities).values({
            id: randomUUID(),
            md5_hash,
            title: finalMapped.title,
            company: finalMapped.company || 'Confidential',
            url: job.source_url,
            description: finalMapped.description,
            salary: finalMapped.salary || null,
            niche: finalMapped.niche,
            type: finalMapped.type || 'direct',
            locationType: finalMapped.locationType || 'remote',
            sourcePlatform: `V12 Mesh (${job.source_platform})`,
            region: finalMapped.metadata?.region || "Philippines", 
            // Use current plating time; job.created_at can be much older due URL upsert semantics.
            scrapedAt: new Date(),
            isActive: true,
            tier: finalMapped.tier,
            relevanceScore: finalMapped.relevanceScore,
            latestActivityMs: Date.now(),
            metadata: JSON.stringify(finalMapped.metadata || {}),
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

    if (translocationResult.successful_ids.length > 0) {
      await step.run("emit-ingestion-heartbeat", async () => {
        const { emitIngestionHeartbeat } = await import("../../../../../packages/db/governance");
        const { config } = await import("../../../../../packages/config");
        // We use primary_region for the main sweep signal, or we could aggregate.
        // For simplicity, we signal the primary region's availability.
        await emitIngestionHeartbeat("v12-sweep-success", config.primary_region);
      });
    }

    return { 
      status: "sweep_complete", 
      moved: translocationResult.successful_ids.length 
    };
  }
);

/**
 * Recovery Function: Trigger.dev Reset
 * Wakes up on the 1st of every month to reset the circuit breaker.
 */
const triggerReset = inngestClient.createFunction(
  { id: "v12-governance-reset", name: "V12 Governance: Trigger Reset", triggers: [{ cron: "0 0 1 * *" }] },
  async ({ step }) => {
    await step.run("reset-governance-flag", async () => {
      const { resetTriggerCredits } = await import("../../../../../packages/db/governance");
      await resetTriggerCredits();
    });
    return { status: "governance_restored" };
  }
);

/**
 * Scout Function: The Harrier Failover
 * A 30-minute cron that runs the harvest sequence.
 * This is our "Zero-Credit" bridge that ensures we keep finding jobs if Trigger.dev is paused.
 */
const scoutFailover = inngestClient.createFunction(
  { id: "v12-scout-failover", name: "V12 Scout: Harrier Failover", triggers: [{ cron: "*/30 * * * *" }] },
  async ({ step }) => {
    const { harvest } = await import("../../../../../jobs/scrape-opportunities");
    const result = await step.run("execute-harvest", async () => {
      return await harvest();
    });
    return { status: "harvest_cycle_complete", result };
  }
);

// 4. Export endpoint serve handlers
export const { GET, POST, PUT } = serve({ 
  client: inngestClient, 
  functions: [pantryPoll, syncSweep, triggerReset, scoutFailover] 
});

