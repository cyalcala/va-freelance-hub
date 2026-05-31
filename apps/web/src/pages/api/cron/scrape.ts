import type { APIRoute } from "astro";
import { getDb, opportunities, vaDirectory } from "@va-hub/db";
import { isNotNull, and, inArray, sql } from "drizzle-orm";

export const prerender = false;
import { rssSources, htmlSources, fetchRSSFeed, fetchHTMLSource, fetchATSFeed, triageJob } from "@va-hub/scraper";

async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function mapTriageCategoryToUiCategory(cat: string): string {
  switch (cat) {
    case "admin": return "admin";
    case "creative": return "design";
    case "tech": return "tech";
    case "social-media": return "marketing";
    case "customer-support": return "customer-service";
    case "finance": return "other";
    default: return "other";
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/scrape] Starting execution...");
  
  const env = locals.runtime.env as any;
  const db = getDb(env);

  // 1. Rate Limiting Check
  const rateLimiter = env?.API_RATE_LIMITER;
  if (rateLimiter) {
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await rateLimiter.limit({ key: clientIp });
    if (!success) {
      console.warn(`[api/cron/scrape] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(JSON.stringify({ error: "Too Many Requests" }), { 
        status: 429, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }

  // 2. Authorization Check
  const authHeader = request.headers.get("Authorization");
  const proxySecret = env?.PROXY_SECRET;
  if (!proxySecret || authHeader !== `Bearer ${proxySecret}`) {
    console.warn("[api/cron/scrape] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const failedSources: string[] = [];

    // 3. Fetch all raw items
    const rssResults = await Promise.allSettled(rssSources.map(fetchRSSFeed));
    const rssItems = rssResults.flatMap((r, idx) => {
      if (r.status === "fulfilled") {
        return r.value;
      } else {
        const sourceName = rssSources[idx]?.name || "Unknown RSS";
        failedSources.push(`${sourceName} (RSS): ${r.reason?.message || r.reason}`);
        return [];
      }
    });

    const htmlResults = await Promise.allSettled(htmlSources.map(fetchHTMLSource));
    const htmlItems = htmlResults.flatMap((r, idx) => {
      if (r.status === "fulfilled") {
        return r.value;
      } else {
        const sourceName = htmlSources[idx]?.name || "Unknown HTML";
        failedSources.push(`${sourceName} (HTML): ${r.reason?.message || r.reason}`);
        return [];
      }
    });

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
    const atsItems = atsResults.flatMap((r, idx) => {
      if (r.status === "fulfilled") {
        return r.value;
      } else {
        const sourceName = atsAgencies[idx]?.companyName || "Unknown ATS";
        failedSources.push(`${sourceName} (ATS): ${r.reason?.message || r.reason}`);
        return [];
      }
    });

    const allItems = [...rssItems, ...htmlItems, ...atsItems];
    console.log(`[api/cron/scrape] Scraped ${allItems.length} raw items (${rssItems.length} RSS, ${htmlItems.length} HTML, ${atsItems.length} ATS)`);

    if (allItems.length === 0) {
      return new Response(JSON.stringify({ 
        inserted: 0, 
        skipped: 0, 
        failedSources, 
        message: "No jobs scraped" 
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 4. De-duplicate against existing database entries by source URL (batch check, not full-table scan)
    const allScrapedUrls = allItems.map(item => item.sourceUrl).filter(Boolean);
    const BATCH_SIZE = 50;
    const existingUrls = new Set<string>();
    for (let i = 0; i < allScrapedUrls.length; i += BATCH_SIZE) {
      const batch = allScrapedUrls.slice(i, i + BATCH_SIZE);
      const found = await db.select({ sourceUrl: opportunities.sourceUrl })
        .from(opportunities)
        .where(inArray(opportunities.sourceUrl, batch));
      found.forEach((r: any) => existingUrls.add(r.sourceUrl));
    }

    // Update lastSeenInFeedAt for jobs still in feeds (prevents false stale archiving)
    if (existingUrls.size > 0) {
      const existingUrlArray = Array.from(existingUrls);
      for (let i = 0; i < existingUrlArray.length; i += BATCH_SIZE) {
        const batch = existingUrlArray.slice(i, i + BATCH_SIZE);
        await db.update(opportunities)
          .set({ lastSeenInFeedAt: sql`(datetime('now'))` })
          .where(inArray(opportunities.sourceUrl, batch));
      }
      console.log(`[api/cron/scrape] Updated lastSeenInFeedAt for ${existingUrls.size} existing jobs`);
    }

    const newItems = allItems.filter((item) => item.sourceUrl && !existingUrls.has(item.sourceUrl));
    console.log(`[api/cron/scrape] ${newItems.length} new items found after URL dedup`);

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ 
        inserted: 0, 
        skipped: allItems.length, 
        failedSources, 
        message: "Zero new jobs after dedup" 
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 5. Triage and classify new items
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

        const cleanDesc = (item.description || "").slice(0, 1500);
        const descriptionHash = await generateHash(item.title + cleanDesc);

        triagedItems.push({
          ...item,
          tags: mergedTags,
          payRange: triage.payRange,
          category: mapTriageCategoryToUiCategory(triage.category),
          experienceLevel: triage.experienceLevel,
          type: triage.employmentType === "contract" ? "freelance" : (triage.employmentType || "freelance"),
          descriptionHash,
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
        failedSources,
        message: "No jobs passed AI triage in this batch"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 6. Batch insert into D1
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
      failedSources,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/scrape] Error during scraping task:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
