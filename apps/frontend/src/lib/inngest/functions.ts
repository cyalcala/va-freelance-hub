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
    const { raw_title, raw_company, raw_url, raw_html } = event.data;

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
      return { status: "dropped", reason: "duplicate_md5", md5_hash };
    }

    // 3. V12 One-Pass Intelligence (The Agentic Sifter)
    const result = await step.run("ai-extraction-and-sift", async () => {
      try {
        const extraction = await runAIWaterfall(raw_html);
        
        // 🛡️ Fail-Closed: If not PH Compatible, discard
        if (!extraction.isPhCompatible || extraction.tier === 4) {
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
            raw_company 
          }),
        });

        return { status: "inserted_fallback", md5_hash };
      }
    });

    return result;
  }
);
