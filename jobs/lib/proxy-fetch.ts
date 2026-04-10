import { config } from "@va-hub/config";

/**
 * 🛡️ THE EDGE SHIELD PROXY FETCH
 * 
 * Routes requests through the Cloudflare Worker to:
 * 1. Rotate IPs (Cloudflare range)
 * 2. Pre-clean HTML (HTML Sieve)
 * 3. Browser Mimicry (Rotating User-Agents)
 * 
 * 🔱 SHIELD FAILOVER [v9.0]: If the proxy fails, fallback to direct fetch
 * ONLY for high-priority RSS/XML vectors to protect IP reputation.
 */
export async function proxyFetch(targetUrl: string, options: RequestInit = {}): Promise<Response> {
  const proxyUrl = config.edge_proxy_url;
  const proxySecret = config.proxy_secret;

  if (!proxyUrl || !proxySecret) {
    console.warn("[ProxyFetch] Edge Proxy not configured. Falling back to direct fetch.");
    return fetch(targetUrl, options);
  }

  try {
    const url = new URL(proxyUrl);
    url.searchParams.set("url", targetUrl);

    const headers = new Headers(options.headers || {});
    headers.set("X-VA-Proxy-Secret", proxySecret);
    
    // 🛡️ ETHICAL IDENTITY: Transparent Identification
    headers.set("User-Agent", "VA-Hub-Harvester/3.0 (Ethical Career Pulse; filipino-freelancer-support; +https://va-freelance-hub.com/ethics)");

    const res = await fetch(url.toString(), {
      ...options,
      headers: headers
    });
    
    if (res.ok) return res;
    
    // If proxy level error (403/502), trigger failover check
    throw new Error(`Proxy Response Error: ${res.status}`);
  } catch (err) {
    console.warn(`[Shield Failover] Proxy down for ${targetUrl}. Checking eligibility for direct fetch...`);
    
    const isPriorityVector = targetUrl.includes('/rss') || targetUrl.includes('/feed') || targetUrl.endsWith('.xml') || targetUrl.includes('api.jobstreet.com');
    
    if (isPriorityVector) {
      console.log(`[Shield Failover] ELIGIBLE: Executing direct fetch for high-priority vector: ${targetUrl}`);
      return fetch(targetUrl, options);
    } else {
      console.warn(`[Shield Failover] INELIGIBLE: Skipping heavy HTML scraper to prevent IP ban.`);
      throw err; // Re-throw to caller to skip this source
    }
  }
}
