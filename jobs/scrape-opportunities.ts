import { schedules } from "@trigger.dev/sdk/v3";
import { createDb, opportunities } from "./lib/db";
import { fetchRSSFeed, rssSources } from "./lib/scraper";
import { fetchRedditJobs } from "./lib/reddit";
import { fetchHNJobs } from "./lib/hackernews";
import { fetchJobicyJobs } from "./lib/jobicy";
import { sql } from "drizzle-orm";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const PH_NATIVE_SOURCES = new Set(["OnlineJobs", "Reddit r/phcareers"]);

export const scrapeOpportunitiesTask = schedules.task({
  id: "scrape-opportunities",
  cron: "0 */2 * * *",
  maxDuration: 120,
  run: async () => {
    console.log("[harvest] ═══ Starting Multi-Source Harvest ═══");
    const db = createDb();

    // ── LAYER 1: RSS Feeds ──────────────────────────────────
    console.log("[harvest] Layer 1: RSS Feeds...");
    const rssResults = await Promise.allSettled(rssSources.map(fetchRSSFeed));
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

    // ── COMBINE ALL SOURCES ─────────────────────────────────
    const allItems = [...rssItems, ...redditItems, ...hnItems, ...jobicyItems];
    console.log(`[harvest] Total fetched: ${allItems.length} (RSS: ${rssItems.length}, Reddit: ${redditItems.length}, HN: ${hnItems.length}, Jobicy: ${jobicyItems.length})`);

    if (allItems.length === 0) {
      console.log("[harvest] Zero items from all sources.");
      return { inserted: 0, skipped: 0 };
    }

    // ── DEDUP ───────────────────────────────────────────────
    const existingItems = await db.select({
      hash: opportunities.contentHash,
      title: opportunities.title
    }).from(opportunities);

    const existingHashes = new Set(existingItems.map((r) => r.hash));
    const normalizedExisting = new Set(existingItems.map((r) => normalizeTitle(r.title)));

    const newItems = allItems.filter((item) => {
      if (!item.contentHash || existingHashes.has(item.contentHash)) return false;
      if (normalizedExisting.has(normalizeTitle(item.title))) return false;
      return true;
    });
    console.log(`[harvest] ${newItems.length} unique after dedup`);

    // ── RELEVANCY FILTER ────────────────────────────────────
    const relevantItems = newItems.filter(item => {
      // OnlineJobs is a BLOG feed — only pass entries with hiring keywords in title
      if (item.sourcePlatform === "OnlineJobs") {
        const t = (item.title || "").toLowerCase();
        return ["hire", "hiring", "job", "apply", "career", "opening", "vacancy", "role"].some(k => t.includes(k));
      }
      // PH-native and curated sources bypass filter
      if (item.sourcePlatform && PH_NATIVE_SOURCES.has(item.sourcePlatform)) return true;
      // Reddit & HN already pre-filtered for hiring signals
      if (item.sourcePlatform?.startsWith("Reddit") || item.sourcePlatform === "HackerNews") return true;
      // Jobicy is already a curated remote board
      if (item.sourcePlatform === "Jobicy") return true;

      // Global RSS: check for remote/hiring signals
      const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
      const signals = [
        "remote", "virtual", "assistant", "freelance", "outsource",
        "offshore", "philippines", "filipino", "manila", "cebu",
        "apply", "hiring", "urgent", "contract", "part-time",
        "customer support", "data entry", "bookkeeping", "social media",
        "admin", "executive assistant", "project manager"
      ];
      return signals.some(kw => text.includes(kw));
    });

    console.log(`[harvest] ${relevantItems.length} passed relevancy filter`);

    // ── INSERT ──────────────────────────────────────────────
    let inserted = 0;
    for (let i = 0; i < relevantItems.length; i += 50) {
      try {
        const batch = relevantItems.slice(i, i + 50);
        await db.insert(opportunities).values(batch).onConflictDoNothing();
        inserted += batch.length;
      } catch (err) {
        console.error("[harvest] Batch failed:", (err as Error).message);
      }
    }

    console.log(`[harvest] ═══ Complete: ${inserted} new opportunities inserted ═══`);

    // ── CLEANUP: Purge stale records older than 60 days ─────
    try {
      const sixtyDaysAgo = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000);
      await db.run(sql`DELETE FROM opportunities WHERE scraped_at < ${sixtyDaysAgo} AND is_active = 0`);
      console.log("[harvest] Stale inactive records purged.");
    } catch {
      // Non-critical — cleanup failure shouldn't break the harvest
    }

    return { inserted, skipped: allItems.length - inserted };
  },
});
