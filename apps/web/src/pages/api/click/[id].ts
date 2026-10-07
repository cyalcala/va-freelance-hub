import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { and, eq, sql } from "drizzle-orm";
import { resolveOutboundUrl } from "@/lib/outbound-url";
import { publicOpportunityFilters } from "@/lib/public-opportunities";
import { parseJobIdRequest } from "@/lib/public-query";
import { publicDataErrorClass } from "@/lib/public-route-load";

export const prerender = false;

type ClickHandlerDependencies = {
  getDb: typeof getDb;
  eligibilityTimeoutMs?: number;
  analyticsTimeoutMs?: number;
};

async function bounded<T>(work: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("click_timeout")), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

export function createClickHandler(dependencies: ClickHandlerDependencies): APIRoute {
  return async ({ params, request, locals, redirect }) => {
  // Validate the id before the D1 binding is touched at all: a malformed id
  // must cost zero row reads, not one read followed by a 400.
  const parsedId = parseJobIdRequest(params.id);
  if (!parsedId.ok) {
    return new Response(parsedId.message, { status: parsedId.status });
  }
  const id = parsedId.id;

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing target URL", { status: 400 });
  }

  try {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    const db = dependencies.getDb(env);

    // Validate the target URL belongs to this job (prevents open redirect).
    //
    // The lookup composes the SAME public eligibility contract as the detail
    // page: a row the site will not show anywhere else (`is_active = 0` after
    // link verification, prune or a source leaving compliance, or a
    // `ph_eligibility` outside `eligible_verified` / `eligible_likely`) must not
    // be redirected to from here either. CONSTITUTION §3.2 #11 requires one
    // eligibility contract across public surfaces, and this is the surface that
    // actually sends a job seeker off-site, so the predicate rides along on the
    // read that already happens — same primary-key lookup, no extra row read —
    // and the existing `if (!job)` refusal then precedes `resolveOutboundUrl`,
    // the limiter and the `click_count` write.
    const [job] = await bounded(db.select({ sourceUrl: opportunities.sourceUrl, applicationUrl: opportunities.applicationUrl })
      .from(opportunities)
      .where(and(eq(opportunities.id, id), publicOpportunityFilters()))
      .limit(1), dependencies.eligibilityTimeoutMs ?? 2_000);

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
        const { success } = await bounded<{ success: boolean }>(rateLimiter.limit({ key: `click:${clientIp}` }), dependencies.analyticsTimeoutMs ?? 500);
        if (success) {
          await bounded(db.update(opportunities)
            .set({ clickCount: sql`${opportunities.clickCount} + 1` })
            .where(eq(opportunities.id, id)), dependencies.analyticsTimeoutMs ?? 500);
        }
      } catch (analyticsError) {
        console.warn(JSON.stringify({ event: "CLICK_ANALYTICS_UNAVAILABLE", id, errorClass: publicDataErrorClass(analyticsError) ?? "analytics_unavailable" }));
      }
    }

    return redirect(safeTargetUrl, 302);
  } catch (err) {
    console.warn(JSON.stringify({ event: "CLICK_ELIGIBILITY_UNAVAILABLE", id, errorClass: publicDataErrorClass(err) ?? "eligibility_unavailable" }));
    // A stale board cannot prove that this job remains eligible or unwithdrawn.
    // Refuse briefly and explicitly; never cache an outage or bypass the gate.
    return new Response("We couldn't verify this posting right now. Please retry shortly.", {
      status: 503,
      headers: { "Retry-After": "30", "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  };
}

export const GET = createClickHandler({ getDb });
