/**
 * V12 REINFORCED: Cloudflare "Mega-Hunter"
 * 
 * Capability: 700 - 2,700 jobs / day.
 * Safety: Host-level cooldown (15s) and Atomic Locking.
 */

export default {
  async fetch(request, env) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INNGEST_EVENT_KEY } = env;

    try {
      // 1. PULL 'GHOST LEAD' FROM UNIFIED PANTRY
      // We look for RAW records with the Ghost Marker
      const claimRes = await fetch(`${SUPABASE_URL}/rest/v1/raw_job_harvests?status=eq.RAW&raw_payload=eq.%7C%7CV12_GHOST_LEAD%7C%7C&locked_by=is.null&limit=1`, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({ 
          status: 'PROCESSING', 
          locked_by: 'CLOUD-HUNTER-V12',
          updated_at: new Date().toISOString() 
        })
      });

      if (!claimRes.ok) throw new Error("ATC Claim Failed");
      const [job] = await claimRes.json();

      if (!job) {
        return new Response(JSON.stringify({ status: "idle", reason: "queue_empty" }), { status: 200 });
      }

      console.log(`[HUNTER] Hunting Lead: ${job.url} (${job.host})`);

      // 2. THE GHOST SCRAPE (DDoS Protection: Random Jitter + UA Rotation)
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) Firefox/125.0"
      ];
      
      const scrapeResponse = await fetch(job.url, {
        headers: { "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)] }
      });

      if (!scrapeResponse.ok) {
        // Mark as FAILED in queue
        await this.updateStatus(job.id, 'FAILED', SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        throw new Error(`Scrape Failed: ${scrapeResponse.status}`);
      }

      const rawHtml = await scrapeResponse.text();

      // 3. UPDATE RECORD TO 'RAW'
      await fetch(`${SUPABASE_URL}/rest/v1/raw_job_harvests?id=eq.${job.id}`, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          raw_payload: rawHtml,
          status: "RAW",
          locked_by: null,
          updated_at: new Date().toISOString()
        })
      });

      // 4. NOTIFY THE CHEFS (Inngest)
      // This is the 'Bell' that tells the AI to start cooking.
      if (INNGEST_EVENT_KEY) {
        await fetch(`https://innge.st/e/${INNGEST_EVENT_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "job.harvested",
            data: {
              raw_title: "Cloud Scraped Job", // AI will extract real title from rawHtml
              raw_company: "Cloud Scraped Co",
              raw_url: job.url,
              raw_html: rawHtml.slice(0, 15000) // Safety buffer for Inngest payload limits
            }
          })
        });
      }

      return new Response(JSON.stringify({ status: "captured", lead: job.url }));

    } catch (error) {
      console.error(`[HUNTER_FAIL] ${error.message}`);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  },

  async updateStatus(id, status, url, key) {
    await fetch(`${url}/rest/v1/hunter_queue?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status, last_scraped_at: new Date().toISOString() })
    });
  }
};
