import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { createDb } from "../packages/db/client";
import { opportunities } from "@va-hub/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { normalizeDate } from "@va-hub/db";
import * as cheerio from "cheerio";

/**
 * CHRONOS HEARTBEAT: Active Triage (Staleness Fighting)
 * Uses Cerebras Qwen 3 235B to detect dead/expired job listings.
 */
export const activeTriage = task({
  id: "active-triage",
  run: async (payload: { limit?: number } = {}) => {
    const { db, client } = createDb();
    const limit = payload.limit || 20;

    logger.info(`[Triage] Starting Semantic Heartbeat for ${limit} opportunities.`);

    // 1. Fetch opportunities to check
    const pending = await db.select()
      .from(opportunities)
      .where(and(eq(opportunities.isActive, true), isNotNull(opportunities.sourceUrl)))
      .limit(limit);

    if (pending.length === 0) {
      logger.info("[Triage] No active opportunities found to triage.");
      return { triaged: 0 };
    }

    let staleCount = 0;

    for (const opp of pending) {
      try {
        logger.info(`[Triage] Checking: ${opp.title} (${opp.company})`);
        
        // 2. Fetch raw text (The Stealth Lane)
        const response = await fetch(opp.sourceUrl!, { 
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VA-Index-Bot/8.3" },
          signal: AbortSignal.timeout(10000)
        });

        if (response.status === 404) {
          logger.warn(`[Triage] 404 Detected for ${opp.id}. Archiving.`);
          await db.update(opportunities).set({ isActive: false }).where(eq(opportunities.id, opp.id));
          staleCount++;
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const bodyText = $("body").text().replace(/\s+/g, " ").slice(0, 5000); // Grab a chunk

        // 3. Cerebras Semantic Heartbeat
        const cerebrasResponse = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "qwen-3-235b-a22b-instruct-2507",
            messages: [
              {
                role: "system",
                content: "You are the Chronos Heartbeat. Determine if this job listing is 'Position Filled', 'Expired', or 'Active'. Return ONLY JSON: { result: 'active' | 'stale', reason: string }"
              },
              { role: "user", content: `Context: ${opp.title} at ${opp.company}. Page Content: ${bodyText}` }
            ],
            response_format: { type: "json_object" }
          }),
        });

        const triageData = await cerebrasResponse.json();
        const triage = JSON.parse(triageData.choices[0].message.content);

        if (triage.result === "stale") {
          logger.warn(`[Triage] STALE Detected: ${triage.reason}. Archiving ${opp.id}.`);
          const currentMetadata = typeof opp.metadata === "string" ? JSON.parse(opp.metadata) : (opp.metadata as Record<string, unknown> || {});
          await db.update(opportunities)
            .set({ 
              isActive: false, 
              metadata: { ...currentMetadata, triageReason: triage.reason, triagedAt: normalizeDate(new Date()).toISOString() } 
            })
            .where(eq(opportunities.id, opp.id));
          staleCount++;
        } else {
          logger.info(`[Triage] Verified Active: ${opp.id}`);
        }

        // Respect the Fleet's Temporal Pacing (prevent rate limits)
        await wait.for({ seconds: 2 });
      } catch (err) {
        logger.error(`[Triage] Failed to check ${opp.id}:`, (err as Error).message);
      }
    }

    await client.close();
    logger.info(`[Triage] Completed. Total Stale/Archived: ${staleCount}`);
    return { triaged: pending.length, stale: staleCount };
  },
});
