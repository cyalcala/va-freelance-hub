import { supabase } from "../packages/db/supabase";
import { parseStringPromise } from "xml2js"; // Most RSS feeds are XML

async function harvestRealJob() {
  console.log("🚀 [REAL-VERIFY] Fetching Jobicy Feed...");

  try {
    const res = await fetch("https://jobicy.com/?feed=job_feed&job_types=remote&search_keywords=senior");
    const xml = await res.text();
    
    // Simple regex to grab the first <item> if xml2js isn't available
    const firstItem = xml.split('<item>')[1].split('</item>')[0];
    const title = firstItem.split('<title><![CDATA[')[1].split(']]></title>')[0];
    const link = firstItem.split('<link>')[1].split('</link>')[0];
    const description = firstItem.split('<description><![CDATA[')[1].split(']]></description>')[0];

    console.log(`✅ [REAL-VERIFY] Captured Real Job: ${title}`);

    // Inject into Supabase
    const { data: job, error } = await supabase
      .from('raw_job_harvests')
      .upsert({
        source_url: link,
        raw_payload: description,
        source_platform: 'Jobicy RSS Feed',
        status: 'RAW'
      }, { onConflict: 'source_url' })
      .select()
      .single();

    if (error) throw error;
    console.log(`✅ [REAL-VERIFY] Real Job Injected: ${job.id}`);
    return job;

  } catch (err) {
    console.error("❌ [REAL-VERIFY] RSS Harvest failed:", err);
    process.exit(1);
  }
}

harvestRealJob();
