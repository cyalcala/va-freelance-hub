import { schedules } from "@trigger.dev/sdk/v3";
import { createDb, opportunities, systemHealth } from "./lib/db";
import { fetchRSSFeed, rssSources } from "./lib/scraper";
import { fetchRedditJobs } from "./lib/reddit";
import { fetchHNJobs } from "./lib/hackernews";
import { fetchJobicyJobs } from "./lib/jobicy";
import { fetchATSJobs } from "./lib/ats";
import { sql } from "drizzle-orm";
import { isLikelyScam } from "./lib/trust";
import { siftOpportunity, OpportunityTier } from "./lib/sifter";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const PH_NATIVE_SOURCES = new Set(["OnlineJobs", "Reddit r/phcareers"]);

async function logToNtfy(message: string, priority: number = 3) {
  try {
    await fetch("https://ntfy.sh/va-freelance-hub-task-log-cyrus", {
      method: "POST",
      body: `[TASK-LOG] ${message}`,
      headers: { "Priority": priority.toString() }
    });
  } catch {
    // ignore
  }
}

export async function harvest() {
  await logToNtfy("══Starting Harvest══");
  console.log("[harvest] ═══ Starting Multi-Source Harvest ═══");
  const db = await createDb();

  // ── LAYER 1: RSS Feeds ──────────────────────────────────
  console.log("[harvest] Layer 1: RSS Feeds...");
  const rssResults = await Promise.allSettled(rssSources.map(s => fetchRSSFeed(s as any)));
  const rssItems = rssResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  rssResults.forEach((r, i) => {
    const src = rssSources[i];
    const cnt = r.status === "fulfilled" ? r.value.length : 0;
    const status = r.status === "fulfilled" ? "OK" : `FAIL`;
    console.log(`  → ${src.name}: ${cnt} (${status})`);
  });

  // ── LAYER 2: Reddit Public JSON ─────────────────────────
  console.log("[harvest] Layer 2: Reddit JSON...");
  const redditItems = await fetchRedditJobs();

  // ── LAYER 3: Hacker News API ────────────────────────────
  console.log("[harvest] Layer 3: Hacker News API...");
  const hnItems = await fetchHNJobs();

  // ── LAYER 4: Jobicy REST API ────────────────────────────
  console.log("[harvest] Layer 4: Jobicy API...");
  const jobicyItems = await fetchJobicyJobs();

  // ── LAYER 5: Direct ATS Harvest (Greenhouse + Lever) ───
  console.log("[harvest] Layer 5: ATS Direct Harvest...");
  const atsItems = await fetchATSJobs();

  // ── COMBINE ALL SOURCES ─────────────────────────────────
  const allItems = [...rssItems, ...redditItems, ...hnItems, ...jobicyItems, ...atsItems];
  
  // ── RECORD HEALTH ───────────────────────────────────────
  const healthMetrics: Array<{ name: string; status: "OK" | "FAIL"; error: string | null }> = [
    ...rssSources.map((s, i) => ({ 
      name: s.name, 
      status: rssResults[i].status === "fulfilled" ? "OK" as const : "FAIL" as const, 
      error: rssResults[i].status === "rejected" ? (rssResults[i] as PromiseRejectedResult).reason?.message : null 
    })),
    { name: "Reddit", status: redditItems.length > 0 ? "OK" : "FAIL", error: redditItems.length > 0 ? null : "No signals found" },
    { name: "HackerNews", status: hnItems.length > 0 ? "OK" : "FAIL", error: hnItems.length > 0 ? null : "No signals found" },
    { name: "Jobicy", status: jobicyItems.length > 0 ? "OK" : "FAIL", error: jobicyItems.length > 0 ? null : "API Error or No signals" },
    { name: "ATS", status: atsItems.length > 0 ? "OK" : "FAIL", error: atsItems.length > 0 ? null : "No signals found" }
  ];

  for (const log of healthMetrics) {
    await db.insert(systemHealth).values({
      id: crypto.randomUUID(),
      sourceName: log.name,
      status: log.status,
      lastSuccess: log.status === "OK" ? new Date() : null,
      errorMessage: log.error,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: [systemHealth.id],
      set: { status: log.status, lastSuccess: log.status === "OK" ? new Date() : undefined, errorMessage: log.error, updatedAt: new Date() }
    });
  }

  console.log(`[harvest] Total fetched: ${allItems.length} (RSS: ${rssItems.length}, Reddit: ${redditItems.length}, HN: ${hnItems.length}, Jobicy: ${jobicyItems.length}, ATS: ${atsItems.length})`);

  if (allItems.length === 0) {
    console.log("[harvest] Zero items from all sources.");
    return { inserted: 0, skipped: 0 };
  }

  // ── DEDUP ───────────────────────────────────────────────
  const existingItems = await db.select({
    hash: opportunities.contentHash,
    title: opportunities.title
  }).from(opportunities);

  const existingHashes = new Set(existingItems.map((r: any) => r.hash));
  const normalizedExisting = new Set(existingItems.map((r: any) => normalizeTitle(r.title)));

  const newItems = allItems.filter((item) => {
    if (!item.contentHash || existingHashes.has(item.contentHash)) return false;
    if (normalizedExisting.has(normalizeTitle(item.title))) return false;
    return true;
  });
  console.log(`[harvest] ${newItems.length} unique after dedup`);

  // ── RELEVANCY FILTER & SIFTING ──────────────────────────
  const relevantItems = allItems.map(item => {
    // 1. Security Layer: Drop scams
    if (isLikelyScam(item.title, item.description ?? "")) return null;

    // 2. Intelligent Sifting & Tiering
    const tier = siftOpportunity(item.title, item.company || "", item.description || "");
    if (tier === OpportunityTier.TRASH) return null;

    // 3. Source-level overrides
    if (item.sourcePlatform === "OnlineJobs") {
      const t = (item.title || "").toLowerCase();
      const isJob = ["hire", "hiring", "job", "apply", "career", "opening", "vacancy", "role"].some(k => t.includes(k));
      if (!isJob) return null;
    }

    return { ...item, tier, scrapedAt: new Date() }; // Pulse: new scrapedAt
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  console.log(`[harvest] ${relevantItems.length} passed sifter funnel`);

  // ── UPSERT (INSERT OR REFRESH) ──────────────────────────
  let processed = 0;
  for (let i = 0; i < relevantItems.length; i += 50) {
    try {
      const batch = relevantItems.slice(i, i + 50);
      // We use onConflictDoUpdate to refresh the 'scrapedAt' and 'isActive' status
      await db.insert(opportunities)
        .values(batch)
        .onConflictDoUpdate({
          target: [opportunities.contentHash],
          set: { 
            scrapedAt: sql`excluded.scraped_at`,
            isActive: sql`CASE WHEN excluded.tier != 4 THEN 1 ELSE 0 END`,
            tier: sql`excluded.tier`
          }
        });
      processed += batch.length;
    } catch (err) {
      console.error("[harvest] Batch failed:", (err as Error).message);
    }
  }

  console.log(`[harvest] ═══ Complete: ${processed} signals processed/refreshed ═══`);

  // ── CLEANUP: Purge stale records older than 60 days ─────
  try {
    const sixtyDaysAgo = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000);
    await db.run(sql`DELETE FROM opportunities WHERE scraped_at < ${sixtyDaysAgo} AND is_active = 0`);
    console.log("[harvest] Stale inactive records purged.");
  } catch {
    // Non-critical — cleanup failure shouldn't break the harvest
  }

  return { processed, skipped: allItems.length - processed };
}


export const scrapeOpportunitiesTask = schedules.task({
  id: "harvest-opportunities",
  cron: "*/15 * * * *", // Every 15 minutes
  queue: {
    name: "high-purity-scrapers",
    concurrencyLimit: 1,
  },
  run: async () => {
    try {
      const result = await harvest();
      await logToNtfy(`SUCCESS: Processed ${result.processed} items.`);
      return result;
    } catch (err: any) {
      await logToNtfy(`CRITICAL FAILURE: ${err.message}`, 5);
      throw err;
    }
  },
});

export const pingHeartbeat = schedules.task({
  id: "ping-heartbeat",
  cron: "*/5 * * * *",
  run: async () => {
    await logToNtfy(`PONG: System alive at ${new Date().toISOString()}`);
  },
});
