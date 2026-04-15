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

const TARGET_FLEET = [
  "https://himalayas.app/jobs/philippines",
  "https://weworkremotely.com/remote-jobs/search?term=philippines",
  "https://www.jobstreet.com.ph/remote-jobs",
  "https://remotive.com/remote-jobs/search?query=philippines",
  "https://jobicy.com/remote-jobs-philippines"
];

// 🧬 THE AUTONOMOUS HARVESTER (Core Logic)
async function processHarvest(targetUrl: string, env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;

  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": userAgent }
    });

    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      
      // Simple Pattern Discovery (Heuristic)
      const isJobBoard = html.includes("Apply") || html.includes("Salary") || html.includes("Remote");
      
      if (isJobBoard) {
         // EMIT TO SUPABASE: The Sovereign Bodega Staging Area
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
             raw_payload: html.substring(0, 50000), 
             source_platform: "Sovereign Edge Harvester",
             status: "RAW",
             triage_status: "PENDING",
             created_at: new Date().toISOString()
           })
         });
      }
    }
  } catch (err) {
    console.error(`Harvest Failed for ${targetUrl}:`, err);
  }
}

export default {
  // 🕒 THE HEARTBEAT: Autonomous Cron Trigger
  async scheduled(event: any, env: Env, ctx: any) {
    console.log(`[Heartbeat] Pulse firing at ${new Date().toISOString()}`);
    
    // Process the entire fleet in-memory
    ctx.waitUntil(Promise.all(
      TARGET_FLEET.map(url => processHarvest(url, env))
    ));
  },

  // 🖱️ THE PROXY: Manual/Hot-Path Trigger
  async fetch(request: any, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("VA.INDEX Autonomous Edge Proxy\nStatus: Pulse Nominal", { status: 200 });
    }

    // 1. Secret Handshake Check
    const secret = request.headers.get("X-VA-Proxy-Secret");
    if (secret !== env.VA_PROXY_SECRET) {
      return new Response("Forbidden: Invalid Proxy Secret", { status: 403 });
    }

    // Trigger immediate background harvest
    ctx.waitUntil(processHarvest(targetUrl, env));

    // Proxied Fetch with Mimicry
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const headers = new Headers(request.headers);
    headers.set("User-Agent", userAgent);
    headers.delete("X-VA-Proxy-Secret"); 

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        redirect: "follow",
      });

      const contentType = response.headers.get("Content-Type") || "";
      
      if (contentType.includes("text/html")) {
        return new HTMLRewriter()
          .on("script", { element(el) { el.remove(); } })
          .on("style", { element(el) { el.remove(); } })
          .on("svg", { element(el) { el.remove(); } })
          .on("meta", { element(el) { el.remove(); } })
          .onDocument({ comments(comment) { comment.remove(); } })
          .transform(response);
      }

      return response;
    } catch (err: any) {
      return new Response(`Proxy Error: ${err.message}`, { status: 502 });
    }
  },
};
