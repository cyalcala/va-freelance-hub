import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { count, eq, desc } from "drizzle-orm";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = getDb(locals.runtime?.env);

    // Get total active listings
    const activeResult = await db
      .select({ count: count() })
      .from(opportunities)
      .where(eq(opportunities.isActive, true));

    const totalActive = activeResult[0]?.count ?? 0;

    // Get the most recent scraped listing to calculate staleness
    const latestScrapedResult = await db
        .select({ scrapedAt: opportunities.scrapedAt })
        .from(opportunities)
        .where(eq(opportunities.isActive, true))
        .orderBy(desc(opportunities.scrapedAt))
        .limit(1);

    // If there is no latest scraped we have no items
    let stalenessHrs = 999;
    if (latestScrapedResult.length > 0 && latestScrapedResult[0].scrapedAt) {
      const lastScraped = new Date(latestScrapedResult[0].scrapedAt);
      const now = new Date();
      stalenessHrs = (now.getTime() - lastScraped.getTime()) / (1000 * 60 * 60);

      // Ensure staleness is not negative and fix precision
      if (stalenessHrs < 0) stalenessHrs = 0;
      stalenessHrs = Math.round(stalenessHrs * 100) / 100;
    }

    const vitals = {
      totalActive,
      stalenessHrs,
    };

    return new Response(JSON.stringify({
      status: "HEALTHY",
      vitals,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Health API Error:", error);
    return new Response(JSON.stringify({
      status: "DEGRADED",
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
