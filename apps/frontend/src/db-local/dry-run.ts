import { createDb, opportunities } from "../../jobs/lib/db";
import { fetchRSSFeed, rssSources } from "../../jobs/lib/scraper";
import { fetchRedditJobs } from "../../jobs/lib/reddit";
import { fetchHNJobs } from "../../jobs/lib/hackernews";
import { fetchJobicyJobs } from "../../jobs/lib/jobicy";
import { isLikelyScam } from "../../jobs/lib/trust";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\bvirtual assistant\b/g, "va").replace(/[^a-z0-9]/g, "").trim();
}

async function dryRun() {
  const db = createDb();

  console.log("═══ MULTI-SOURCE HARVEST TEST ═══\n");

  // Layer 1: RSS
  console.log("Layer 1: RSS Feeds...");
  const rssResults = await Promise.allSettled(rssSources.map(fetchRSSFeed));
  const rssItems = rssResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  console.log(`  RSS total: ${rssItems.length}\n`);

  // Layer 2: Reddit
  console.log("Layer 2: Reddit JSON...");
  const redditItems = await fetchRedditJobs();
  console.log(`  Reddit total: ${redditItems.length}\n`);

  // Layer 3: HN
  console.log("Layer 3: Hacker News...");
  const hnItems = await fetchHNJobs();
  console.log(`  HN total: ${hnItems.length}\n`);

  // Layer 4: Jobicy
  console.log("Layer 4: Jobicy API...");
  const jobicyItems = await fetchJobicyJobs();
  console.log(`  Jobicy total: ${jobicyItems.length}\n`);

  const allItems = [...rssItems, ...redditItems, ...hnItems, ...jobicyItems];
  console.log(`TOTAL HARVESTED: ${allItems.length}`);

  // Dedup
  const existingItems = await db.select({ hash: opportunities.contentHash, title: opportunities.title }).from(opportunities);
  const existingHashes = new Set(existingItems.map((r) => r.hash));
  const normalizedExisting = new Set(existingItems.map((r) => normalizeTitle(r.title)));

  const newItems = allItems.filter((item) => {
    if (!item.contentHash || existingHashes.has(item.contentHash)) return false;
    if (normalizedExisting.has(normalizeTitle(item.title))) return false;
    return true;
  });
  console.log(`NEW UNIQUE: ${newItems.length}`);

  const PH_NATIVE_SOURCES = new Set(["OnlineJobs", "Reddit r/phcareers"]);
  const relevantItems = newItems.filter(item => {
    if (isLikelyScam(item.title, item.description ?? "")) {
      console.log(`[trust] Blocked likely scam: ${item.title}`);
      return false;
    }
    if (item.sourcePlatform === "OnlineJobs") {
      const t = (item.title || "").toLowerCase();
      return ["hire", "hiring", "job", "apply", "career", "opening", "vacancy", "role"].some(k => t.includes(k));
    }
    if (item.sourcePlatform && PH_NATIVE_SOURCES.has(item.sourcePlatform)) return true;
    if (item.sourcePlatform?.startsWith("Reddit") || item.sourcePlatform === "HackerNews") return true;
    if (item.sourcePlatform === "Jobicy") return true;

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

  console.log(`PASSED RELEVANCY & TRUST FILTERS: ${relevantItems.length}`);

  // Insert
  let inserted = 0;
  for (let i = 0; i < relevantItems.length; i += 50) {
    try {
      const batch = relevantItems.slice(i, i + 50);
      await db.insert(opportunities).values(batch).onConflictDoNothing();
      inserted += batch.length;
    } catch (err) {
      console.error("Batch failed:", (err as Error).message);
    }
  }
  console.log(`\n✅ INSERTED ${inserted} NEW OPPORTUNITIES`);
}

dryRun().catch(console.error);
