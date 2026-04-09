console.log("V12_FUNCTIONS_EVALUATING");
import { inngest } from "./client";
import { db } from "../../../../../packages/db"; // Root packages/db
import { opportunities } from "../../../../../packages/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

import { runAIWaterfall } from "../ai/waterfall";
import { siftOpportunity } from "../../../../../src/core/sieve";

/**
 * job.harvested function
 * Idempotency: MD5 hash of raw_title + raw_company
 */
export const jobHarvested = inngest.createFunction(
  { 
    id: "job-harvested", 
    name: "Job Harvested",
    triggers: [{ event: "job.harvested" }]
  },
  async ({ event, step }) => {
    const { raw_title, raw_company, raw_url, raw_html, trace_id } = event.data;
    const harvested_at = event.data.harvested_at || Date.now();
    console.log(`🚜 [REAL_WORKER] Executing job.harvested for: ${raw_title} (${raw_company})${trace_id ? ` [TRACE:${trace_id}]` : ''}`);

    // 1. Calculate MD5 Shield
    const md5_hash = crypto
      .createHash("md5")
      .update(raw_title + raw_company)
      .digest("hex");

    // 2. Check for existing record (Idempotency Shield)
    const existing = await step.run("check-idempotency", async () => {
      const records = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.md5_hash, md5_hash));
      return records.length > 0 ? records[0] : null;
    });

    if (existing) {
      // 🚥 REFRESH SIGNAL: If the job exists, we refresh its pulse without re-running AI
      console.log(`🚥 [REFRESH] Job exists. Updating pulse for: ${raw_title} [${md5_hash}]`);
      
      await step.run("refresh-pulse", async () => {
        return await db.update(opportunities)
          .set({ 
            lastSeenAt: new Date(), 
            latestActivityMs: Date.now() 
          })
          .where(eq(opportunities.md5_hash, md5_hash));
      });

      // Emit heartbeat to signal active pipeline pulse
      const { emitIngestionHeartbeat } = await import("../../../../../packages/db/governance");
      await emitIngestionHeartbeat("v12-mesh-refresh", existing.region || "Philippines");

      return { status: "refreshed", md5_hash };
    }

    // 3. V12 One-Pass Intelligence (The Agentic Sifter)
    const result = await step.run("ai-extraction-and-sift", async () => {
      const { config } = await import("../../../../../packages/config");
      const isPrimary = event.data.region === config.primary_region;

      try {
        let extraction;
        
        if (isPrimary) {
           // 🧪 HIGH-FIDELITY: AI extraction for primary region
           extraction = await runAIWaterfall(raw_html);
        } else {
           // 🚥 METADATA-ONLY: Skeleton extraction for secondary regions (Credit Saver)
           console.log(`🚥 [GOLDILOCKS] Metadata-Only sync for ${event.data.region} signal.`);
           const heuristic = siftOpportunity(raw_title, raw_html, raw_company, "Metadata Only");
           extraction = {
             title: raw_title,
             company: raw_company,
             description: "Metadata-only signal. Visit source URL for details.",
             salary: null,
             niche: heuristic.domain,
             type: 'direct',
             locationType: 'remote',
             tier: heuristic.tier,
             relevanceScore: 0,
             isPhCompatible: true, // secondary signals are always passive-accept
             metadata: { meta_only: true, region: event.data.region }
           };
        }
        
        // 🛡️ Fail-Closed: If not PH Compatible or Trash, discard (Primary Only)
        if (isPrimary && (!extraction.isPhCompatible || extraction.tier === 4)) {
          return { status: "dropped", reason: "not_ph_compatible", md5_hash };
        }

        // 4. Insert V12 Result into Vault
        await db.insert(opportunities).values({
          id: crypto.randomUUID(),
          md5_hash,
          title: extraction.title,
          company: extraction.company,
          url: raw_url,
          description: extraction.description, 
          salary: extraction.salary,
          niche: extraction.niche,
          type: extraction.type,
          locationType: extraction.locationType,
          sourcePlatform: "V12 Intelligence Mesh",
          region: extraction.metadata?.region || "Philippines", 
          scrapedAt: new Date(),
          isActive: true,
          tier: extraction.tier,
          relevanceScore: extraction.relevanceScore,
          latestActivityMs: Date.now(),
          metadata: JSON.stringify({ 
            ...extraction.metadata, 
            raw_title, 
            raw_company,
            ...(trace_id ? { trace_id, harvested_at, cooked_at: Date.now(), plated_at: Date.now() } : {})
          }),
        });

        // 5. Signal Success (The Goldilocks Heartbeat)
        const { emitIngestionHeartbeat } = await import("../../../../../packages/db/governance");
        await emitIngestionHeartbeat("v12-mesh-direct", extraction.metadata?.region || "Philippines");

        return { status: "inserted", md5_hash, model: extraction.metadata?.model };
      } catch (err: any) {
        console.error(`[Waterfall ERROR] ${err.message}. Triggering Heuristic Fallback...`);
        
        // 🚨 EMERGENCY FALLBACK: Heuristic Tier 6 (Regex/Keywords)
        const heuristic = siftOpportunity(raw_title, raw_html, raw_company, "Heuristic Fallback");
        
        if (heuristic.tier === 4) {
           return { status: "dropped", reason: "heuristic_reject", md5_hash };
        }

        await db.insert(opportunities).values({
          id: crypto.randomUUID(),
          md5_hash,
          title: raw_title,
          company: raw_company,
          url: raw_url,
          description: raw_html, 
          niche: heuristic.domain,
          sourcePlatform: "Emergency Fallback",
          scrapedAt: new Date(),
          isActive: true,
          tier: heuristic.tier,
          relevanceScore: heuristic.relevanceScore,
          latestActivityMs: Date.now(),
          metadata: JSON.stringify({ 
            fallback: true, 
            reason: err.message,
            raw_title, 
            raw_company,
            ...(trace_id ? { trace_id, harvested_at, cooked_at: Date.now(), plated_at: Date.now() } : {})
          }),
        });

        return { status: "inserted_fallback", md5_hash };
      }
    });

    return result;
  }
);
