import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { eq, sql } from "drizzle-orm";
import { resolveOutboundUrl } from "@/lib/outbound-url";

export const prerender = false;

type ClickHandlerDependencies = {
  getDb: typeof getDb;
};

export function createClickHandler(dependencies: ClickHandlerDependencies): APIRoute {
  return async ({ params, request, locals, redirect }) => {
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
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    const db = dependencies.getDb(env);

    // Validate the target URL belongs to this job (prevents open redirect)
    const [job] = await db.select({ sourceUrl: opportunities.sourceUrl, applicationUrl: opportunities.applicationUrl })
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1);

    if (!job) {
      return new Response("Job not found", { status: 404 });
    }

    const safeTargetUrl = resolveOutboundUrl(job, targetUrl);
    if (!safeTargetUrl) {
      return new Response("Invalid redirect URL", { status: 403 });
    }

    // Analytics is optional and fail-closed. Pages does not currently prove a
    // Rate Limiting binding for this project, so an absent binding means no D1
    // write. Once the redirect target is validated, limiter or analytics
    // failures must never prevent the user from reaching the posting.
    const rateLimiter = env?.API_RATE_LIMITER;
    if (rateLimiter) {
      try {
        const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
        const { success } = await rateLimiter.limit({ key: `click:${clientIp}` });
        if (success) {
          await db.update(opportunities)
            .set({ clickCount: sql`${opportunities.clickCount} + 1` })
            .where(eq(opportunities.id, id));
        }
      } catch (analyticsError) {
        console.warn(`[api/click] Optional analytics failed for job ${id}:`, analyticsError);
      }
    }

    return redirect(safeTargetUrl, 302);
  } catch (err) {
    console.error(`[api/click] Failed to track click for job ${id}:`, err);
    // Still redirect to the sourceUrl if we validated it, otherwise fail
    return new Response("Internal error", { status: 500 });
  }
  };
}

export const GET = createClickHandler({ getDb });
