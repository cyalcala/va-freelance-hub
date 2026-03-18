import { schedules } from "@trigger.dev/sdk/v3";
import { db, schema } from "@va-hub/db";
import { fetchRSSFeed, rssSources } from "./lib/scraper";

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

    const existingHashes = new Set(
      (await db.select({ hash: schema.opportunities.contentHash }).from(schema.opportunities)).map((r) => r.hash)
    );

    const newItems = allItems.filter((item) => item.contentHash && !existingHashes.has(item.contentHash));
    console.log(`[scrape] ${newItems.length} new after dedup`);

    let inserted = 0;
    for (let i = 0; i < newItems.length; i += 50) {
      try {
        const batch = newItems.slice(i, i + 50).map(item => ({
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
    console.log(`[scrape] Done. Inserted ${inserted}`);
    return { inserted, skipped: allItems.length - inserted };
  },
});

async function revalidate() {
  const secret = process.env.ISR_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secret || !appUrl) return;
  try {
    await fetch(`${appUrl}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {}
}
