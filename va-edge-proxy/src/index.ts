export interface Env {
  VA_PROXY_SECRET: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Apple; Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
];

const LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.8",
  "en-PH,en;q=0.9,fil-PH;q=0.8,fil;q=0.7",
];

export default {
  async fetch(request: any, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing 'url' parameter", { status: 400 });
    }

    // 1. Secret Handshake Check
    const secret = request.headers.get("X-VA-Proxy-Secret");
    if (secret !== env.VA_PROXY_SECRET) {
      return new Response("Forbidden: Invalid Proxy Secret", { status: 403 });
    }

    // 2. Browser Mimicry
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const acceptLang = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];

    const headers = new Headers(request.headers);
    headers.set("User-Agent", userAgent);
    headers.set("Accept-Language", acceptLang);
    headers.delete("X-VA-Proxy-Secret"); // Security: Don't leak secret to target

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        redirect: "follow",
      });

      // 3. Active Scout: Identify and Emit Signals
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("text/html") && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        
        // Clone for inspection to avoid consuming the original body prematurely
        const clonedResponse = response.clone();
        
        // Background the sifting process to avoid blocking the user request
        ctx.waitUntil((async () => {
          try {
            const html = await clonedResponse.text();
            
            // Simple Pattern Discovery (Heuristic)
            const isJobBoard = html.includes("Apply") || html.includes("Salary") || html.includes("Remote");
            
            if (isJobBoard) {
               // EMIT TO SUPABASE: Direct High-Velocity Lead Generation
               await fetch(`${env.SUPABASE_URL}/rest/v1/raw_job_harvests`, {
                 method: 'POST',
                 headers: {
                   'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                   'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                   'Content-Type': 'application/json',
                   'Prefer': 'return=minimal'
                 },
                 body: JSON.stringify({
                   source_url: targetUrl,
                   raw_payload: html.substring(0, 50000), // Cap payload for edge limits
                   source_platform: "Cloudflare Edge Scout",
                   status: "RAW",
                   triage_status: "PENDING",
                   created_at: new Date().toISOString()
                 })
               });
            }
          } catch (scoutErr) {
            console.error("Scout Ingestion Error:", scoutErr);
          }
        })());
      }

      // 4. Payload Sieve (HTML Rewriting to reduce OOM risk in Trigger.dev)
      if (contentType.includes("text/html")) {
        return new HTMLRewriter()
          .on("script", { element(el) { el.remove(); } })
          .on("style", { element(el) { el.remove(); } })
          .on("svg", { element(el) { el.remove(); } })
          .on("meta", { element(el) { el.remove(); } })
          .on("link", { element(el) { el.remove(); } })
          .on("nav", { element(el) { el.remove(); } })
          .on("footer", { element(el) { el.remove(); } })
          .on("header", { element(el) { el.remove(); } })
          .on("aside", { element(el) { el.remove(); } })
          .onDocument({
            comments(comment) {
              comment.remove();
            }
          })
          .transform(response);
      }

      return response;
    } catch (err: any) {
      return new Response(`Proxy Error: ${err.message}`, { status: 502 });
    }
  },
};
