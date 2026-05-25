import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { rssSources, htmlSources, fetchRSSFeed, fetchHTMLSource, triageJob } from "@va-hub/scraper";

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/scrape] Starting execution...");
  
  const env = locals.runtime.env as any;
  const db = getDb(env);

  // 1. Authorization Check
  const secret = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
  const expectedSecret = env?.CRON_SECRET || process.env?.CRON_SECRET;
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

    const allItems = [...rssItems, ...htmlItems];
    console.log(`[api/cron/scrape] Scraped ${allItems.length} raw items (${rssItems.length} RSS, ${htmlItems.length} HTML)`);

    if (allItems.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: 0, message: "No jobs scraped" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 3. De-duplicate against existing database entries
    const existingHashes = new Set(
      (await db.select({ hash: opportunities.contentHash }).from(opportunities)).map((r: any) => r.hash)
    );

    const newItems = allItems.filter((item) => item.contentHash && !existingHashes.has(item.contentHash));
    console.log(`[api/cron/scrape] ${newItems.length} new items found after hash dedup`);

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: allItems.length, message: "Zero new jobs after dedup" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 4. Triage and classify each new item
    const triagedItems: typeof opportunities.$inferInsert[] = [];
    for (const item of newItems) {
      console.log(`[api/cron/scrape] Triaging: "${item.title}"`);
      const triage = await triageJob(item.title, item.description || "", env);

      if (!triage.eligibleForFilipinos) {
        console.log(`[api/cron/scrape] Filtering out ineligible job: "${item.title}". Reason: ${triage.reason}`);
        continue; // Skip the job completely
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
        .map((t) => typeof t === 'string' ? t.toLowerCase().trim() : t);

      triagedItems.push({
        ...item,
        tags: mergedTags,
        payRange: triage.payRange,
      });
    }

    console.log(`[api/cron/scrape] ${triagedItems.length} jobs approved after AI triaging`);

    if (triagedItems.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: allItems.length, message: "No jobs passed AI triage" }), { status: 200, headers: { "Content-Type": "application/json" } });
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
    return new Response(JSON.stringify({
      inserted,
      filteredOut: newItems.length - triagedItems.length,
      skipped: allItems.length - inserted,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/scrape] Error during scraping task:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
