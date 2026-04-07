import { supabase } from "../packages/db/supabase";
import { XMLParser } from "fast-xml-parser";

/**
 * V12 SIFTER: The Cheat Scout
 * 
 * Role: 
 * Manually inject 10 jobs into 'raw_job_harvests' to show the user 
 * the 'Chefs' working in real-time while they have dinner.
 */

async function cheatScout() {
  console.log("🚜 [CHEAT_SCOUT] Bypassing ATC... Injecting 10 Uncooked Jobs directly into Pantry.");
  
  const parser = new XMLParser();
  const res = await fetch('https://weworkremotely.com/remote-jobs.rss');
  const xml = await res.text();
  const jsonObj = parser.parse(xml);
  const items = jsonObj.rss?.channel?.item?.slice(0, 10) || [];

  for (const item of items) {
    console.log(`📡 [CHEAT_SCOUT] Injecting: ${item.title}`);
    
    // Inject directly into the PANTRY (raw_job_harvests)
    await supabase.from('raw_job_harvests').insert({
      source_url: item.link,
      raw_payload: `<h1>${item.title}</h1><p>${item.description}</p>`, // Simplified for simulation
      source_platform: 'WWR (Cheat Scout)',
      status: 'RAW'
    });
  }

  console.log("✅ [CHEAT_SCOUT] 10 Jobs injected. Chefs should now be 'Cooking'...");
}

cheatScout();
