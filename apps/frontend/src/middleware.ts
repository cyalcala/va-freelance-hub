import { defineMiddleware } from "astro:middleware";

/**
 * VECTOR 4: THE UNIVERSAL TRANSLATOR (Edge Proxy)
 * Mandate: Normalize inbound signals and handle outbound job redirection.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // 1. OUTBOUND REDIRECTION (The "Go" Proxy)
  // Usage: /go?url=https://jobstreet.com.ph...
  if (url.pathname === "/go") {
    const targetUrl = url.searchParams.get("url");
    if (targetUrl) {
      console.log(`[Universal Translator] Redirecting to: ${targetUrl}`);
      
      // TITANIUM HEADER INJECTION: Standardize the origin for the job board.
      const headers = new Headers();
      headers.set("Location", targetUrl);
      headers.set("X-VA-Hub-Origin", "Autonomous-Agent/8.3");
      
      return new Response(null, {
        status: 302,
        headers
      });
    }
  }

  // 2. INBOUND SIGNAL REWRITING (Status Normalization)
  // If the request is for an internal API but marked as 'legacy', rewrite it.
  if (url.pathname.startsWith("/api/legacy")) {
     const newUrl = new URL(context.request.url);
     newUrl.pathname = newUrl.pathname.replace("/api/legacy", "/api");
     return context.rewrite(newUrl);
  }

  // 3. GEOGRAPHIC BOUNDARY (Bouncer)
  // [Optional] Block non-PH traffic for specific sensitive POST endpoints.
  /*
  if (url.pathname.startsWith("/api/control") && context.request.method === "POST") {
    const country = context.locals.runtime?.vercel?.country || "PH"; 
    if (country !== "PH") {
      return new Response("UNAUTHORIZED_REGION", { status: 403 });
    }
  }
  */

  return next();
});
