import "dotenv/config";
import { db } from "../packages/db/client";
import { opportunities, vitals } from "../packages/db/schema";
import { eq } from "drizzle-orm";
import { rssSources, fetchRSSFeed } from "../jobs/lib/scraper";
import { fetchRedditJobs } from "../jobs/lib/reddit";
import { goldmineSources, fetchGoldmineJobs } from "../jobs/lib/ph-goldmines";
import { siftOpportunity } from "../src/core/sieve";
import crypto from "crypto";

/**
 * VA.INDEX DIRECT RECOVERY (The Hammer)
 * Bypasses ALL orchestration to inject fresh data directly into the vault.
 */

async function directRecovery() {
  console.log("🛠️ [RECOVERY] Initiating Direct-to-DB Harvest (Bypassing Fleet Mesh)...");
  const startTime = Date.now();
  let totalInserted = 0;

  const sources = [
    ...rssSources.map(s => ({ name: s.name, region: (s as any).region || "Global", fn: () => fetchRSSFeed(s as any) })),
    { name: "Reddit: buhaydigital", region: "Philippines", fn: () => fetchRedditJobs() },
    ...goldmineSources.map(s => ({ name: s.name, region: "Philippines", fn: () => fetchGoldmineJobs(s.name) }))
  ];

  for (const source of sources) {
    if (source.region !== "Philippines") continue; // Target PH first for recovery

    try {
      console.log(`📡 Scouting ${source.name}...`);
      const items = await source.fn();
      if (!items || items.length === 0) continue;

      for (const item of items) {
        const rawTitle = item.title;
        const rawCompany = item.company || "Generic";
        const rawUrl = item.url || item.sourceUrl;
        const rawDescription = item.description || (item as any).__raw || "";

        // 🧬 SIFT: Direct Classification
        const sift = siftOpportunity(rawTitle, rawDescription, rawCompany, source.name);

        if (!sift.isPhCompatible || sift.tier === 4) continue;

        // 🛠️ UPSERT: Direct to Vault
        await db.insert(opportunities).values({
          id: crypto.randomUUID(),
          md5_hash: sift.md5_hash,
          title: rawTitle,
          company: rawCompany,
          url: rawUrl,
          description: rawDescription.slice(0, 2000), // Trim for DB safety
          niche: sift.domain,
          sourcePlatform: source.name,
          region: "Philippines",
          scrapedAt: new Date(),
          lastSeenAt: new Date(),
          isActive: true,
          tier: sift.tier,
          relevanceScore: sift.relevanceScore,
          latestActivityMs: Date.now(),
          metadata: JSON.stringify({ manual_recovery: true, tags: sift.displayTags })
        }).onConflictDoUpdate({
          target: [opportunities.md5_hash],
          set: {
            lastSeenAt: new Date(),
            latestActivityMs: Date.now(),
            isActive: true
          }
        });

        totalInserted++;
      }
      console.log(`✅ ${source.name}: Pulsed items into Vault.`);
    } catch (err: any) {
      console.error(`❌ Source failed: ${source.name} - ${err.message}`);
    }
  }

  // Update Heartbeat to satisfy Watchdog
  await db.update(vitals)
    .set({ 
      lastIngestionHeartbeatMs: Date.now(),
      lastProcessingHeartbeatMs: Date.now(),
      heartbeatSource: "manual-recovery-hammer",
      lockStatus: "IDLE",
      lockUpdatedAt: new Date()
    })
    .where(eq(vitals.id, "HEARTBEAT_Philippines"));

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n🎉 RECOVERY COMPLETE: ${totalInserted} jobs refreshed/inserted.`);
  console.log(`⏱️ Total Time: ${duration.toFixed(2)}s`);
  process.exit(0);
}

directRecovery();
