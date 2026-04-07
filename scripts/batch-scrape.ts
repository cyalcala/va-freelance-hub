import { supabase } from "../packages/db/supabase";

/**
 * V12 BATCH SCRAPER: Converts Ghost Leads into Real RAW Jobs
 * Scrapes the actual HTML from source URLs and updates the Supabase record.
 */
async function batchScrape() {
  console.log("🚜 [BATCH] Fetching Ghost Leads to scrape...");
  
  const { data: ghosts, error } = await supabase
    .from('raw_job_harvests')
    .select('*')
    .eq('status', 'RAW')
    .eq('raw_payload', '||V12_GHOST_LEAD||')
    .limit(20); // Scrape 20 at a time

  if (error || !ghosts || ghosts.length === 0) {
    console.log("❌ [BATCH] No Ghost Leads found to scrape.");
    return;
  }

  console.log(`🎯 [BATCH] Found ${ghosts.length} Ghost Leads. Scraping...`);
  let success = 0;
  let failed = 0;

  for (const ghost of ghosts) {
    try {
      const res = await fetch(ghost.source_url, {
        headers: { 'User-Agent': 'V12-Sifter-Hunter/2.0' },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      if (!res.ok) {
        console.warn(`⚠️ [BATCH] HTTP ${res.status} for ${ghost.source_url}`);
        failed++;
        continue;
      }

      const html = await res.text();
      
      if (html.length < 200) {
        console.warn(`⚠️ [BATCH] Too short (${html.length}b) for ${ghost.source_url}`);
        failed++;
        continue;
      }

      // Update with real HTML
      await supabase
        .from('raw_job_harvests')
        .update({
          raw_payload: html.slice(0, 50000), // Cap at 50KB
          status: 'RAW',
          locked_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ghost.id);

      console.log(`✅ [BATCH] Scraped ${ghost.source_platform}: ${ghost.source_url.slice(0, 60)}... (${html.length}b)`);
      success++;
      
      // Small delay to be respectful
      await new Promise(r => setTimeout(r, 500));
    } catch (err: any) {
      console.warn(`❌ [BATCH] Failed ${ghost.source_url}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🚜 [BATCH] COMPLETE: ${success} scraped, ${failed} failed.`);
  console.log(`   These ${success} jobs are now REAL RAW records ready for Inngest to cook.`);
}

batchScrape();
