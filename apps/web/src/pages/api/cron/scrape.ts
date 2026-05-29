import type { APIRoute } from "astro";
import { getDb, opportunities, vaDirectory } from "@va-hub/db";
import { isNotNull, and } from "drizzle-orm";
import { rssSources, htmlSources, fetchRSSFeed, fetchHTMLSource, fetchATSFeed, triageJob } from "@va-hub/scraper";

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

    const atsAgencies = await db.select().from(vaDirectory).where(
      and(
        isNotNull(vaDirectory.atsPlatform),
        isNotNull(vaDirectory.atsToken)
      )
    );
    
    console.log(`[api/cron/scrape] Found ${atsAgencies.length} ATS-enabled agencies in the directory.`);
    
    const atsResults = await Promise.allSettled(
      atsAgencies.map((agency) => 
        fetchATSFeed(agency.atsPlatform as any, agency.atsToken as string, agency.companyName)
      )
    );
    const atsItems = atsResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    const allItems = [...rssItems, ...htmlItems, ...atsItems];
    console.log(`[api/cron/scrape] Scraped ${allItems.length} raw items (${rssItems.length} RSS, ${htmlItems.length} HTML, ${atsItems.length} ATS)`);

    if (allItems.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: 0, message: "No jobs scraped" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 3. De-duplicate against existing database entries by source URL (more robust than content hash)
    const existingUrls = new Set(
      (await db.select({ sourceUrl: opportunities.sourceUrl }).from(opportunities))
        .map((r: any) => r.sourceUrl)
        .filter(Boolean)
    );

    const newItems = allItems.filter((item) => item.sourceUrl && !existingUrls.has(item.sourceUrl));
    console.log(`[api/cron/scrape] ${newItems.length} new items found after URL dedup`);

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: allItems.length, message: "Zero new jobs after dedup" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 4. Triage and classify new items (with limit and concurrency to prevent Cloudflare execution timeouts)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "15", 10);
    const itemsToProcess = newItems.slice(0, limit);
    console.log(`[api/cron/scrape] Processing ${itemsToProcess.length} out of ${newItems.length} new items (limit: ${limit})`);

    const triagedItems: typeof opportunities.$inferInsert[] = [];
    const concurrency = 3;

    for (let i = 0; i < itemsToProcess.length; i += concurrency) {
      const chunk = itemsToProcess.slice(i, i + concurrency);
      const results = await Promise.all(
        chunk.map(async (item) => {
          console.log(`[api/cron/scrape] Triaging: "${item.title}"`);
          try {
            const triage = await triageJob(item.title, item.description || "", env);
            return { item, triage };
          } catch (err) {
            console.error(`[api/cron/scrape] Triage failed for "${item.title}":`, err);
            return { item, triage: null };
          }
        })
      );

      for (const { item, triage } of results) {
        if (!triage) continue;

        if (!triage.eligibleForFilipinos) {
          console.log(`[api/cron/scrape] Filtering out ineligible job: "${item.title}". Reason: ${triage.reason}`);
          continue;
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
    }

    console.log(`[api/cron/scrape] ${triagedItems.length} jobs approved after AI triaging`);

    if (triagedItems.length === 0) {
      return new Response(JSON.stringify({
        inserted: 0,
        processed: itemsToProcess.length,
        backlogRemaining: newItems.length - itemsToProcess.length,
        skipped: allItems.length,
        message: "No jobs passed AI triage in this batch"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 5. Batch insert into D1
    let inserted = 0;
    let actualChanges = 0;
    for (let i = 0; i < triagedItems.length; i += 5) {
      const batch = triagedItems.slice(i, i + 5);
      try {
        console.log(`[api/cron/scrape] Inserting batch of ${batch.length} items:`, batch.map(b => `${b.title} (${b.sourceUrl})`));
        const res = await db.insert(opportunities).values(batch).onConflictDoNothing();
        console.log(`[api/cron/scrape] D1 insert result:`, JSON.stringify(res));
        inserted += batch.length;
        if (res && (res as any).meta && typeof (res as any).meta.changes === "number") {
          actualChanges += (res as any).meta.changes;
        }
      } catch (err) {
        console.error(`[api/cron/scrape] Batch insert failed (index ${i}):`, err);
      }
    }

    console.log(`[api/cron/scrape] Finished. Processed ${itemsToProcess.length}, batch inserted ${inserted} (actual DB changes: ${actualChanges})`);
    return new Response(JSON.stringify({
      inserted,
      actualChanges,
      filteredOut: itemsToProcess.length - triagedItems.length,
      processed: itemsToProcess.length,
      backlogRemaining: newItems.length - itemsToProcess.length,
      skipped: allItems.length - inserted,
      triagedItems,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/scrape] Error during scraping task:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
