import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, opportunities } from "@va-hub/db";
import { inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { rssSources, htmlSources, fetchRSSFeed, fetchHTMLSource, triageJob } from "@va-hub/scraper";

export async function POST(request: Request) {
  console.log("[api/cron/scrape] Starting execution...");
  const cfCtx = await getCloudflareContext();
  const env = cfCtx?.env as any;
  const db = getDb(env);

  // 1. Authorization Check
  const secret = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
  const expectedSecret = env?.CRON_SECRET || process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    console.warn("[api/cron/scrape] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 2. Fetch all raw items
    const rssResults = await Promise.allSettled(rssSources.map(fetchRSSFeed));
    const rssItems = rssResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    const htmlResults = await Promise.allSettled(htmlSources.map(fetchHTMLSource));
    const htmlItems = htmlResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    // Track silent errors that broke at the source level
    const failedSources = [
      ...rssResults.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason.message),
      ...htmlResults.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason.message)
    ];

    const allItems = [...rssItems, ...htmlItems];
    console.log(`[api/cron/scrape] Scraped ${allItems.length} raw items (${rssItems.length} RSS, ${htmlItems.length} HTML)`);

    if (allItems.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: 0, failedSources, message: "No jobs scraped" });
    }

    // 3. De-duplicate against existing database entries
    const existingHashes = new Set(
      (await db.select({ hash: opportunities.contentHash }).from(opportunities)).map((r: any) => r.hash)
    );

    const allFoundHashes = allItems.map(i => i.contentHash).filter(Boolean) as string[];
    const hashesToUpdate = allFoundHashes.filter(h => existingHashes.has(h));
    
    // Fix Staleness: Update lastSeenInFeedAt for existing jobs so they aren't auto-archived
    if (hashesToUpdate.length > 0) {
      for (let i = 0; i < hashesToUpdate.length; i += 100) {
        const batchHashes = hashesToUpdate.slice(i, i + 100);
        await db.update(opportunities)
          .set({ 
            lastSeenInFeedAt: sql`(datetime('now'))`, 
            isActive: true, 
            failedVerificationCount: 0 
          })
          .where(inArray(opportunities.contentHash, batchHashes));
      }
      console.log(`[api/cron/scrape] Updated lastSeenInFeedAt for ${hashesToUpdate.length} existing items`);
    }

    const newItems = allItems.filter((item) => item.contentHash && !existingHashes.has(item.contentHash));
    console.log(`[api/cron/scrape] ${newItems.length} new items found after hash dedup`);

    if (newItems.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: allItems.length, failedSources, message: "Zero new jobs after dedup" });
    }

    // Cap at 15 items per run to avoid Cloudflare Edge 30s timeouts. 
    // The rest will be picked up on the next 30-min cron run.
    const cappedItems = newItems.slice(0, 15);
    console.log(`[api/cron/scrape] Processing ${cappedItems.length} items out of ${newItems.length} new items.`);

    // 4. Triage and classify each new item in batches of 3 to prevent latency timeouts
    const triagedItems: typeof opportunities.$inferInsert[] = [];
    for (let i = 0; i < cappedItems.length; i += 3) {
      const batch = cappedItems.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          console.log(`[api/cron/scrape] Triaging: "${item.title}"`);
          const triage = await triageJob(item.title, item.description || "", env);
          
          if (!triage.eligibleForFilipinos) {
            console.log(`[api/cron/scrape] Filtering out ineligible job: "${item.title}". Reason: ${triage.reason}`);
            return null;
          }

          // Merge tags: combine scraper sources tags, LLM category, and LLM skills/tags
          const mergedTags = Array.from(
            new Set([
              ...(item.tags || []),
              triage.category,
              ...(triage.tags || []),
            ])
          )
            .filter(Boolean)
            .map((t) => t.toLowerCase().trim());

          return {
            ...item,
            tags: mergedTags,
            payRange: triage.payRange,
            clientTimezone: triage.clientTimezone,
            applicationUrl: triage.applicationUrl,
          };
        })
      );

      // Add valid results from the batch
      triagedItems.push(...batchResults.filter((r) => r !== null) as typeof opportunities.$inferInsert[]);
    }

    console.log(`[api/cron/scrape] ${triagedItems.length} jobs approved after AI triaging`);

    if (triagedItems.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: allItems.length, failedSources, message: "No jobs passed AI triage" });
    }

    // 5. Batch insert into D1
    let inserted = 0;
    for (let i = 0; i < triagedItems.length; i += 5) {
      const batch = triagedItems.slice(i, i + 5);
      try {
        await db.insert(opportunities).values(batch).onConflictDoNothing();
        inserted += batch.length;
      } catch (err) {
        console.error(`[api/cron/scrape] Batch insert failed (index ${i}):`, err);
      }
    }

    console.log(`[api/cron/scrape] Finished. Inserted ${inserted} items`);
    
    if (inserted > 0) {
      // Trigger Next.js Incremental Static Regeneration immediately in the background
      revalidatePath("/");
      revalidatePath("/opportunities");
    }
    
    return NextResponse.json({
      inserted,
      filteredOut: cappedItems.length - triagedItems.length,
      skipped: allItems.length - inserted,
      failedSources,
      cappedTotal: newItems.length
    });
  } catch (error) {
    console.error("[api/cron/scrape] Error during scraping task:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
