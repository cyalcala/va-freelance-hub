import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { eq, sql } from "drizzle-orm";

export const prerender = false;

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

    // Validate the target URL belongs to this job (prevents open redirect)
    const [job] = await db.select({ sourceUrl: opportunities.sourceUrl, applicationUrl: opportunities.applicationUrl })
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1);

    if (!job) {
      return new Response("Job not found", { status: 404 });
    }

    if (targetUrl !== job.sourceUrl && targetUrl !== job.applicationUrl) {
      return new Response("Invalid redirect URL", { status: 403 });
    }

    // Track click and redirect
    await db.update(opportunities)
      .set({ clickCount: sql`${opportunities.clickCount} + 1` })
      .where(eq(opportunities.id, id));

    return redirect(targetUrl, 302);
  } catch (err) {
    console.error(`[api/click] Failed to track click for job ${id}:`, err);
    // Still redirect to the sourceUrl if we validated it, otherwise fail
    return new Response("Internal error", { status: 500 });
  }
};
