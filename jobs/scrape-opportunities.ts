import { schedules } from "@trigger.dev/sdk/v3";
import { db, schema } from "@va-hub/db";
import { fetchRSSFeed, rssSources } from "./lib/scraper";
import { count, desc, eq, sql } from "drizzle-orm";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export const scrapeOpportunitiesTask = schedules.task({
  id: "scrape-opportunities",
  cron: "0 */2 * * *", // every 2 hours
  maxDuration: 120,
  run: async () => {
    console.log("[scrape] Starting opportunity scrape...");

    const results = await Promise.allSettled(rssSources.map(fetchRSSFeed));
    const allItems = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    console.log(`[scrape] Fetched ${allItems.length} items`);

    if (allItems.length === 0) return { inserted: 0, skipped: 0 };

    const existingItems = await db.select({ hash: schema.opportunities.contentHash, title: schema.opportunities.title }).from(schema.opportunities);
    const existingHashes = new Set(existingItems.map((r) => r.hash));
    const normalizedExisting = new Set(existingItems.map(r => normalizeTitle(r.title)));

    const newItems = allItems.filter((item) => {
      if (!item.contentHash || existingHashes.has(item.contentHash)) return false;
      if (normalizedExisting.has(normalizeTitle(item.title))) return false; // Fuzzy dedup
      return true;
    });
    console.log(`[scrape] ${newItems.length} unique items after fuzzy dedup`);

    // Scoring layer to filter out low-relevancy "noise"
    const relevantItems = newItems.filter(item => {
      const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
      const phKeywords = ["philippines", "filipino", "pinoy", "ph", "pampanga", "manila", "cebu", "virtual assistant", "assistant", "va", "remote", "offshore", "outsourcing", "freelance"];
      
      // Calculate score based on keyword presence
      let score = 0;
      phKeywords.forEach(kw => {
        if (text.includes(kw)) score += 0.5; // Loosened for higher harvest
      });

      // Special boost for explicit hiring signals
      if (text.includes("apply") || text.includes("hiring") || text.includes("urgent")) score += 2;

      return score >= 0.5; // Harvest any remote/hiring signal
    });

    console.log(`[scrape] ${relevantItems.length} passed relevancy filter`);

    let inserted = 0;
    for (let i = 0; i < relevantItems.length; i += 50) {
      try {
        const batch = relevantItems.slice(i, i + 50).map(item => ({
          ...item,
          id: crypto.randomUUID(),
          scrapedAt: new Date(),
          postedAt: item.postedAt ? new Date(item.postedAt) : null,
        }));
        await db.insert(schema.opportunities).values(batch).onConflictDoNothing();
        inserted += batch.length;
      } catch (err) {
        console.error("[scrape] Batch failed:", err);
      }
    }

    if (inserted > 0) await revalidate();
    
    // --- INTELLIGENT STATUS SYNC ---
    console.log("[scrape] Syncing agency hiring status...");
    const activeAgencies = await db.select().from(schema.agencies);
    for (const agency of activeAgencies) {
      const [{ count: jobCount }] = await db
        .select({ count: count() })
        .from(schema.opportunities)
        .where(
          sql`${schema.opportunities.company} = ${agency.name} AND ${schema.opportunities.isActive} = true`
        );
      
      // If agency has jobs, boost heat; if 0 jobs, set to quiet
      const newStatus = jobCount > 0 ? "active" : "quiet";
      const newHeat = jobCount > 5 ? 3 : jobCount > 0 ? 2 : 1;
      
      await db.update(schema.agencies)
        .set({ status: newStatus as any, hiringHeat: newHeat })
        .where(eq(schema.agencies.id, agency.id));
    }

    console.log(`[scrape] Done. Inserted ${inserted}`);
    return { inserted, skipped: allItems.length - inserted };
  },
});

async function revalidate() {
  const secret = process.env.ISR_SECRET || "fallback_sync_signal"; // Intelligent fallback
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return;
  try {
    await fetch(`${appUrl}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {}
}
