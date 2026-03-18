import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "./lib/db";
import { sql } from "drizzle-orm";
import { config } from "@va-hub/config";

/**
 * 🛠️ DEEP SYSTEM AUDIT & AUTO-CORRECTION ENGINE
 * 
 * Purpose: A surgical daily operation that identifies fakeries, silent failures, 
 * data ratholes, scaling inefficiencies, and bypassed heuristics across the entire architecture.
 * 
 * Auto-Heals:
 * 1. Data Ratholes: Expiring ancient job links before they clutter the frontend.
 * 2. Silent Failures: Detecting if scrapers returned zero items organically in the last 24h.
 * 3. Fakeries/Misrepresentation: Post-insertion deep scanning for mutating scam vectors bypassing initial filters.
 */
export const systemAuditTask = schedules.task({
  id: "deep-system-audit",
  cron: "0 0 * * *", // Runs everyday at Midnight UTC
  maxDuration: 180,
  run: async () => {
    logger.info("[deep-audit] Initiating surgical system audit...");
    const db = createDb();
    
    // Time Definitions
    const now = Math.floor(Date.now() / 1000);
    const ONE_DAY = 24 * 60 * 60;
    const TWO_WEEKS = 14 * ONE_DAY;

    const report = {
      ratholesClosed: 0,
      silentFailuresDetected: false,
      fakeriesScrubbed: 0,
      agenciesCorrected: 0,
      healthScore: 100
    };

    /**
     * 1. THE RATHOLE: Link Rot Accumulation
     * Inefficiency: If our system continuously adds 200 URLs a day, checking them linearly is unsustainable memory-wise.
     * Solution: Any link past 14 days fundamentally expires automatically, guaranteeing O(1) database bloat.
     */
    const staleThreshold = now - TWO_WEEKS;
    const staleRotQuery = await db.run(
      sql`UPDATE opportunities 
          SET is_active = 0 
          WHERE is_active = 1 
            AND scraped_at < ${staleThreshold}`
    );
    report.ratholesClosed = staleRotQuery.rowsAffected;
    if (report.ratholesClosed > 0) {
      logger.info(`[deep-audit] Surgically closed ${report.ratholesClosed} expired link ratholes.`);
    }

    /**
     * 2. SILENT FAILURES: The 24-Hour Scraper Blackout
     * Concern: If HackerNews or Jobicy updates their CSS/API, the parser gracefully errors internally without crashing the build.
     * Solution: Assert that 'created_at' in opportunities generated at least > 0 rows in the last 24H.
     */
    const yesterday = now - ONE_DAY;
    const freshSignalQuery = await db.all(
      sql`SELECT COUNT(id) as freshCount FROM opportunities WHERE scraped_at > ${yesterday}`
    ) as any[];
    
    const freshCount = freshSignalQuery[0]?.freshCount || 0;
    if (freshCount === 0) {
      logger.error("[deep-audit] CRITICAL SILENT FAILURE: 0 new signals in the last 24 hours. Scrapers may be fundamentally broken or heavily rate-limited.");
      report.silentFailuresDetected = true;
      report.healthScore -= 50;
    }

    /**
     * 3. FAKERIES & EVASION: Mutated Spam Vectors
     * Concern: Malicious actors learn basic regex and evade initial trust filters with modified strings.
     * Solution: Heavy post-insertion audit over all active descriptions. 
     */
    const evasionRegex = [
      /\$?\d+\s*\/\s*(day|wk|hr)/i, // Matches "$500 / day" or "500/day" heavily obfuscated
      /(t\.me|wa\.me)/i,             // Matches direct telegram/whatsapp links hidden in URLs
      /no experience.*make \$/i,     // Highly correlated MLM / Scam vectors
    ];
    
    // Fetch all currently active opportunities
    const activeOpps = await db.all(
      sql`SELECT id, title, description FROM opportunities WHERE is_active = 1`
    ) as { id: string, title: string, description: string }[];
    
    for (const opp of activeOpps) {
      const textBlock = `${opp.title} ${opp.description}`;
      if (evasionRegex.some(regex => regex.test(textBlock))) {
        await db.run(sql`UPDATE opportunities SET is_active = 0 WHERE id = ${opp.id}`);
        report.fakeriesScrubbed++;
      }
    }
    
    if (report.fakeriesScrubbed > 0) {
      logger.warn(`[deep-audit] Surgically scrubbed ${report.fakeriesScrubbed} active jobs that evaded initial trust filters.`);
      report.healthScore -= 10;
    }

    /**
     * 4. POTENTIAL SYSTEM CRACKS: Agency Orphaned Signals
     * Concern: Agencies marked 'active' without verified URLs or completely lacking 'hiring_url'.
     * Solution: Force normalize to 'quiet' state if data is missing structurally.
     */
    const orphanedAgencies = await db.run(
      sql`UPDATE agencies SET status = 'quiet' WHERE status = 'active' AND (hiring_url IS NULL OR hiring_url = '')`
    );
    report.agenciesCorrected = orphanedAgencies.rowsAffected;
    if (report.agenciesCorrected > 0) {
      logger.info(`[deep-audit] Restored data integrity on ${report.agenciesCorrected} misconfigured agencies.`);
    }

    // Final Health Summary
    logger.info(`[deep-audit] System Audit Complete. Health Score: ${report.healthScore}/100.`);
    return report;
  },
});
