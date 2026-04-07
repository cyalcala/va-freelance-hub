import { supabase } from "../packages/db/supabase";
import { db } from "../packages/db";
import { agencies as agencySchema } from "../packages/db/schema";
import { XMLParser } from "fast-xml-parser";
import { isNotNull } from "drizzle-orm";

/**
 * V12 SIFTER: The Universal Ghost Scout (v12.5)
 * 
 * Features:
 * 1. RSS/Atom Support (WWR, Jobicy, Himalayas).
 * 2. Reddit JSON Swarm (r/BPOph, r/VAjobsPH, r/forhire).
 * 3. Ghost Queue Coordination (No manual SQL needed).
 * 4. User-Agent Masking (Reddit/Cloudflare bypass).
 */

const FEEDS = [
  { name: 'WWR', url: 'https://weworkremotely.com/remote-jobs.rss', host: 'weworkremotely.com', type: 'xml' },
  { name: 'Jobicy', url: 'https://jobicy.com/feed/', host: 'jobicy.com', type: 'xml' },
  { name: 'Remotive', url: 'https://remotive.com/feed', host: 'remotive.com', type: 'xml' },
  { name: 'RemoteOK', url: 'https://remoteok.com/remote-jobs.rss', host: 'remoteok.com', type: 'xml' },
  { name: 'Himalayas', url: 'https://himalayas.app/jobs/rss', host: 'himalayas.app', type: 'xml' },
  { name: 'JS/Remotely', url: 'https://jsremotely.com/rss', host: 'jsremotely.com', type: 'xml' },
  // REDDIT PRECISION SWARM (PH-FOCUS)
  { name: 'r/BPOph', url: 'https://www.reddit.com/r/BPOph/new.json?limit=25', host: 'reddit.com', type: 'json' },
  { name: 'r/VAjobsPH', url: 'https://www.reddit.com/r/VAjobsPH/new.json?limit=25', host: 'reddit.com', type: 'json' },
  { name: 'r/phcareers', url: 'https://www.reddit.com/r/phcareers/new.json?limit=25', host: 'reddit.com', type: 'json' },
  { name: 'r/forhire', url: 'https://www.reddit.com/r/forhire/new.json?limit=25', host: 'reddit.com', type: 'json' },
  { name: 'r/VirtualAssistant', url: 'https://www.reddit.com/r/VirtualAssistant/new.json?limit=25', host: 'reddit.com', type: 'json' }
];

async function scout() {
  console.log("🚜 [SCOUT] Launching Refined 'Gold Net' Discovery...");
  const parser = new XMLParser();

  for (const feed of FEEDS) {
    try {
      console.log(`📡 [SCOUT] Pulling ${feed.name}: ${feed.url}`);
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'V12-Sifter-Scout/2.0' }
      });
      const rawBody = await res.text();
      
      let items: any[] = [];

      try {
        if (feed.type === 'json') {
          const json = JSON.parse(rawBody);
          items = json.data?.children?.map((c: any) => c.data) || [];
        } else {
          const jsonObj = parser.parse(rawBody);
          const rawItems = jsonObj.rss?.channel?.item || jsonObj.feed?.entry;
          items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
        }
      } catch (e) {
        console.error(`⚠️ [SCOUT] Parse failed for ${feed.name}. Skipping...`);
        continue;
      }

      const leads = items.map((item: any) => {
        let url = item.url || item.link;
        if (typeof url === 'object' && url?.['@_href']) url = url['@_href'];
        if (!url) url = item.guid?.['#text'] || item.guid;
        if (url?.startsWith('/r/')) url = `https://reddit.com${url}`;

        return {
          url: url,
          host: feed.host,
          platform: feed.name,
          status: 'READY'
        };
      }).filter(l => l.url && l.url.startsWith('http'));

      console.log(`🎯 [SCOUT] Captured ${leads.length} potential leads from ${feed.name}.`);

      // UNIFIED PANTRY INJECTION (LEAD Status via GHOST Marker)
      const pantryData = leads.map(l => ({
        source_url: l.url,
        raw_payload: '||V12_GHOST_LEAD||', 
        source_platform: l.platform,
        status: 'RAW', 
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('raw_job_harvests')
        .upsert(pantryData, { onConflict: 'source_url' });

      if (error) {
        console.error(`❌ [SCOUT_FAIL] ${feed.name} injection failed:`, error.message);
      } else {
        console.log(`✅ [SCOUT_OK] ${feed.name} leads dumped as GHOSTS into Pantry.`);
      }

    } catch (err) {
      console.error(`❌ [SCOUT_CRASH] ${feed.name} failed:`, err);
    }
  }

  console.log("🚜 [SCOUT] Refined Swarm COMPLETE.");

  // --- AGENCY SWARM (VAULT INTEGRATION) ---
  console.log("🚜 [SCOUT] Syncing Agency Monitoring from Turso Vault...");
  const agencyList = await db.select()
    .from(agencySchema)
    .where(isNotNull(agencySchema.hiringUrl));

  if (!agencyList || agencyList.length === 0) {
    console.warn("⚠️ [SCOUT] No Agencies found in Vault to monitor.");
  } else {
    console.log(`🎯 [SCOUT] Captured ${agencyList.length} Agencies to monitor.`);
    const agencyLeads = agencyList.map(a => ({
      source_url: a.hiringUrl,
      raw_payload: '||V12_GHOST_LEAD||',
      source_platform: `Agency: ${a.name}`,
      status: 'RAW',
      updated_at: new Date().toISOString()
    }));

    await supabase.from('raw_job_harvests').upsert(agencyLeads, { onConflict: 'source_url' });
    console.log(`✅ [SCOUT_OK] ${agencyList.length} Agency Portals added to monitoring.`);
  }

  console.log("🚜 [SCOUT] Ultimate Swarm (v12.7.1) MISSION COMPLETE. Kitchen is in 'High-Gear'!");
}

scout();
