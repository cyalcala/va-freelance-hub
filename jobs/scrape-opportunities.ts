import { schedules } from "@trigger.dev/sdk/v3";
import { eq, sql } from "drizzle-orm";
import { db, opportunities } from "@va-hub/db";
import { rssSources, htmlSources, fetchRSSFeed, fetchHTMLSource } from "@va-hub/scraper";

export const scrapeOpportunitiesTask = schedules.task({
  id: "scrape-opportunities",
  cron: "0 */2 * * *",
  maxDuration: 120,
  run: async () => {
    console.log("[scrape] Starting opportunity scrape...");

    const rssResults = await Promise.allSettled(rssSources.map(fetchRSSFeed));
    const rssItems = rssResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    const htmlResults = await Promise.allSettled(htmlSources.map(fetchHTMLSource));
    const htmlItems = htmlResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    const allItems = [...rssItems, ...htmlItems];
    console.log(`[scrape] Fetched ${allItems.length} items (${rssItems.length} RSS, ${htmlItems.length} HTML)`);

    if (allItems.length === 0) return { inserted: 0, skipped: 0 };

    const newItems = allItems.filter((item) => item.sourceUrl);
    console.log(`[scrape] ${newItems.length} valid items to process`);

    let inserted = 0;
    for (let i = 0; i < newItems.length; i += 50) {
      try {
        const batch = newItems.slice(i, i + 50);
        await db
          .insert(opportunities)
          .values(batch)
          .onConflictDoUpdate({
            target: opportunities.sourceUrl,
            set: {
              lastSeenInFeedAt: sql`(datetime('now'))`,
              updatedAt: sql`case when excluded.content_hash != opportunities.content_hash then (datetime('now')) else opportunities.updated_at end`,
              title: sql`excluded.title`,
              description: sql`excluded.description`,
              company: sql`excluded.company`,
              type: sql`excluded.type`,
              sourcePlatform: sql`excluded.source_platform`,
              tags: sql`excluded.tags`,
              locationType: sql`excluded.location_type`,
              payRange: sql`excluded.pay_range`,
              contentHash: sql`excluded.content_hash`,
              isActive: sql`1`,
              failedVerificationCount: sql`0`,
            },
          });
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
  if (!secret || !appUrl) {
    console.warn("[scrape] Skipping revalidation — ISR_SECRET or NEXT_PUBLIC_APP_URL not set");
    return;
  }
  try {
    const res = await fetch(`${appUrl}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[scrape] Revalidation failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("[scrape] Revalidation error:", err);
  }
}