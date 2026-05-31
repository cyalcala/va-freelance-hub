import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { eq, sql } from "drizzle-orm";

export const GET: APIRoute = async ({ params, request, locals, redirect }) => {
  const idStr = params.id;
  if (!idStr) {
    return new Response("Missing job ID", { status: 400 });
  }

  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return new Response("Invalid job ID", { status: 400 });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing target URL", { status: 400 });
  }

  try {
    const env = locals.runtime.env as any;
    const db = getDb(env);

    // Run in background (don't await) to keep redirect fast, but since it's a worker, 
    // we need to use ctx.waitUntil if we want it to run after response.
    // D1 is fast enough, we can just await it.
    await db.update(opportunities)
      .set({ clickCount: sql`${opportunities.clickCount} + 1` })
      .where(eq(opportunities.id, id));

    return redirect(targetUrl, 302);
  } catch (err) {
    console.error(`[api/click] Failed to track click for job ${id}:`, err);
    // Still redirect even if tracking fails
    return redirect(targetUrl, 302);
  }
};
