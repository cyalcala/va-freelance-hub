import { task, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { opportunities as opportunitiesSchema, type NewOpportunity } from "@va-hub/db/schema";
import { atsSources } from "@va-hub/config/ats-sources";
import { siftOpportunity, OpportunityTier, generateIdempotencyHash } from "@va-hub/core/sieve";
import { v4 as uuidv4 } from 'uuid';
import { sql } from "drizzle-orm";
import { normalizeDate } from "@va-hub/db";
import { proxyFetch } from "./lib/proxy-fetch";

/**
 * 🛰️ ATS SITEMAP SNIPER
 * 
 * Surgically targets Greenhouse, Lever, and specialized Agency feeds.
 */

/**
 * 🛰️ ATS SITEMAP SNIPER - CORE LOGIC
 */
export async function runAtsSniper(db: any) {
  logger.info("Starting Surgical ATS Sniper Run...");
  
  try {
    let totalCaptured = 0;
    let totalSifted = 0;

    for (const source of atsSources) {
      // 🔱 ANTI-OOM & RPM THROTTLE [v9.0]
      // Sequential processing with a 2s gap to respect LLM RPM limits during failover.
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        logger.info(`[sniper] Target: ${source.name} (${source.type})`);
        let rawJobs: any[] = [];

        if (source.type === "greenhouse") {
          const res = await proxyFetch(`https://boards-api.greenhouse.io/v1/boards/${source.token}/jobs`);
          const data = await res.json();
          rawJobs = data.jobs || [];
        } else if (source.type === "lever") {
          const res = await proxyFetch(`https://api.lever.co/v0/postings/${source.token}?mode=json`);
          rawJobs = await res.json();
        } else if (source.type === "zoho") {
          const res = await proxyFetch(`https://recruit.zoho.eu/recruit/v2/PublicPostings?board_url=${source.token}`);
          const data = await res.json();
          rawJobs = data.data || [];
        } else if (source.type === "rss") {
          const res = await proxyFetch(source.token);
          const xml = await res.text();
          const { XMLParser } = await import("fast-xml-parser");
          const parser = new XMLParser();
          const data = parser.parse(xml);
          const items = data.rss?.channel?.item || [];
          rawJobs = Array.isArray(items) ? items : [items];
        }

        if (rawJobs.length === 0) {
          logger.warn(`[sniper] ${source.name}: Received 0 jobs.`);
          continue;
        }

        logger.info(`[sniper] ${source.name}: Processing ${rawJobs.length} raw signals...`);
        const batch: NewOpportunity[] = [];
        const now = normalizeDate(new Date());

        for (const raw of rawJobs) {
          let title = "", url = "", description = "";

          if (source.type === "greenhouse") {
            title = raw.title; url = raw.absolute_url; description = raw.content || "";
          } else if (source.type === "lever") {
            title = raw.text; url = raw.hostedUrl; description = raw.description || "";
          } else if (source.type === "zoho") {
            title = raw["Job Title"] || raw.job_title; 
            url = raw["Application URL"] || raw.application_url;
            description = raw["Job Description"] || raw.job_description || "";
          } else if (source.type === "rss") {
            title = raw.title; url = raw.link; description = raw.description || "";
          }

          if (!title || !url) continue;

          // 🧬 THE TITANIUM IDEMPOTENCY SHIELD: MD5(JobTitle + Company)
          const idempotencyHash = generateIdempotencyHash(title, source.name);

          const siftResult = siftOpportunity(title, description || "", source.name, source.type);
          totalSifted++;

          if (siftResult.tier === OpportunityTier.TRASH) {
            logger.debug(`[sniper] Rejected: ${title} (${source.name}) - TRASH`);
            continue;
          }

          logger.info(`[sniper] Captured: ${title} (${source.name}) - TIER ${siftResult.tier}`);
          batch.push({
            id: uuidv4(),
            title: title.trim(),
            company: source.name,
            type: "direct",
            sourceUrl: url,
            sourcePlatform: source.type,
            tags: [...(source.tags || []), siftResult.domain, "ats-sniper"], // Changed to array, Drizzle handles JSON stringify
            description: (description || "").substring(0, 500),
            scrapedAt: now,
            lastSeenAt: now,
            createdAt: now,
            isActive: true,
            tier: siftResult.tier,
            relevanceScore: siftResult.relevanceScore,
            displayTags: siftResult.displayTags, // Changed to array
            contentHash: idempotencyHash,
            latestActivityMs: now.getTime()
          } as any);
        }

        if (batch.length > 0) {
          await db.insert(opportunitiesSchema)
            .values(batch)
            .onConflictDoUpdate({
              target: [opportunitiesSchema.title, opportunitiesSchema.company, opportunitiesSchema.sourceUrl],
              set: { 
                scrapedAt: now,
                lastSeenAt: now,
                isActive: true,
                tier: sql`excluded.tier`,
                relevanceScore: sql`excluded.relevance_score`,
                displayTags: sql`excluded.display_tags`,
                latestActivityMs: now.getTime()
              }
            });
          totalCaptured += batch.length;
        }

      } catch (err: any) {
        logger.error(`[sniper] Error targeting ${source.name}: ${err.message}`);
      }
    }

    logger.info(`[sniper] Audit Complete. Captured ${totalCaptured}/${totalSifted} signals.`);

    // ── HEARTBEAT MANDATE ──
    const { systemHealth } = await import("@va-hub/db/schema");
    await db.insert(systemHealth)
      .values({
        id: "ATS_SNIPER",
        sourceName: "ATS Sniper (Engine A)",
        status: "HEALTHY",
        lastSuccess: normalizeDate(new Date()),
        updatedAt: normalizeDate(new Date()),
        consecutiveFailures: 0
      })
      .onConflictDoUpdate({
        target: [systemHealth.id],
        set: { 
          status: "HEALTHY",
          lastSuccess: new Date(),
          updatedAt: new Date(),
          consecutiveFailures: 0,
          errorMessage: null
        }
      });

    return { totalCaptured, totalSifted };
  } catch (err: any) {
    logger.error(`[sniper] Fatal error in runAtsSniper: ${err.message}`);
    throw err;
  }
}

export const atsSniperTask = task({
  id: "ats-sniper",
  run: async () => {
    const { db, client } = createDb();
    try {
      return await runAtsSniper(db);
    } finally {
      client.close();
    }
  },
});

// --- LOCAL EXECUTION (DEBUG ONLY) ---
if (process.env.RUN_LOCAL === 'true') {
    logger.info("Local run detected. Executing sniper...");
    const { db, client } = createDb();
    runAtsSniper(db)
      .then(res => {
        console.log("Final Report:", res);
        client.close();
      })
      .catch(err => {
        console.error(err);
        client.close();
      });
}
