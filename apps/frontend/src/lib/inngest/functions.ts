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

    // 1. Calculate MD5 Shield (Prefer harvester-provided hash for unification)
    const md5_hash = event.data.md5_hash || crypto
      .createHash("md5")
      .update((raw_title + raw_company).toLowerCase().trim())
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
        const { AIMesh } = await import("../../../../../packages/ai/ai-mesh");

        if (isPrimary) {
           // 🧪 Check if we already have enriched data from the harvester
           if (event.data.niche && event.data.salary) {
              console.log("🚥 [ENRICHED] Skipping AI. Using harvester-provided intelligence.");
              extraction = {
                title: raw_title,
                company: raw_company,
                description: raw_html || raw_title,
                salary: event.data.salary,
                niche: event.data.niche,
                type: event.data.type || 'direct',
                locationType: 'remote',
                tier: event.data.tier_hint || 1,
                relevanceScore: 90,
                isPhCompatible: true,
                metadata: { ...event.data.metadata, enriched_source: true }
              };
           } else {
              extraction = await AIMesh.extract(raw_html || raw_title);
           }
        } else {
           // 🚥 METADATA-ONLY for secondary regions
           const heuristic = siftOpportunity(raw_title, raw_html, raw_company, "Metadata Only");
           extraction = {
             title: raw_title,
             company: raw_company,
             description: "Metadata-only signal.",
             salary: event.data.salary || null,
             niche: event.data.niche || heuristic.domain,
             type: 'direct',
             locationType: 'remote',
             tier: event.data.tier_hint || heuristic.tier,
             relevanceScore: 0,
             isPhCompatible: true,
             metadata: { meta_only: true, region: event.data.region }
           };
        }
        
        // 🧪 THE PHOSPHORUS SHIELD: Fail-Closed Geographic & Quality Boundary
        if (!extraction.isPhCompatible || (extraction.tier !== undefined && extraction.tier >= 4)) {
          console.warn(`🛡️ [PHOSPHORUS] Dropped Signal: ${!extraction.isPhCompatible ? 'Geo Boundary breach' : 'Tier 4 Quality Reject'} for ${extraction.title}`);
          const { emitProcessingHeartbeat } = await import("../../../../../packages/db/governance");
          await emitProcessingHeartbeat(`dropped-${!extraction.isPhCompatible ? 'geo' : 'quality'}`, event.data.region || "Philippines");
          
          return { 
            status: "dropped", 
            reason: !extraction.isPhCompatible ? "geo_boundary_breach" : "quality_reject", 
            md5_hash 
          };
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
          type: extraction.type as any,
          locationType: extraction.locationType,
          sourcePlatform: event.data.source || "V12 Intelligence Mesh",
          region: event.data.region || "Philippines", 
          scrapedAt: new Date(),
          isActive: true,
          tier: extraction.tier,
          relevanceScore: extraction.relevanceScore,
          latestActivityMs: Date.now(),
          metadata: JSON.stringify({ 
            ...extraction.metadata, 
            raw_title, 
            raw_company
          }),
        });

        const { emitIngestionHeartbeat } = await import("../../../../../packages/db/governance");
        await emitIngestionHeartbeat("v12-mesh-direct", event.data.region || "Philippines");

        // 🧠 HEURISTIC BACK-PROPAGATION: Emit sifted event for the learning bridge
        await inngest.send({
          name: "job.sifted",
          data: {
            md5_hash,
            tier: extraction.tier,
            score: extraction.relevanceScore,
            is_compatible: extraction.isPhCompatible,
            company: extraction.company,
            title: extraction.title,
            source: event.data.source || "Unknown"
          }
        });

        return { status: "inserted", md5_hash };
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

/**
 * 🛰️ SENTINEL PULSE: Level-4 Autonomous Audit
 * Runs every 4 hours to perform deep system maintenance.
 */
export const sentinelPulse = inngest.createFunction(
  { 
    id: "sentinel-pulse", 
    name: "Sentinel Pulse (Project Aegis)",
    triggers: [{ cron: "0 */4 * * *" }] // Every 4 hours
  },
  async ({ step }) => {
    console.log("🛡️ [AEGIS] Sentinel Pulse initiating autonomous audit...");
    
    // Perform Surgical SRE Audit
    const result = await step.run("sentinel-audit", async () => {
      const { sentinel } = await import("../../../../../packages/db/sentinel");
      await sentinel.diagnoseAndRepair("autonomous-cron-pulse");
      
      return { status: "COMPLETED", timestamp: Date.now() };
    });

    return result;
  }
);
