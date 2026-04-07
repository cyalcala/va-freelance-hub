import { supabase } from "../packages/db/supabase";
import { INNGEST_EVENT_KEY } from "../packages/db/supabase"; // Mocking the env for script

async function simulateHunt() {
  console.log("🚜 [LIVE_TEST] Hunter V12.3 searching for Ghost Leads...");

  // 1. Claim a Ghost (||V12_GHOST_LEAD||)
  const { data: jobs, error: claimError } = await supabase
    .from('raw_job_harvests')
    .update({ 
      status: 'PROCESSING', 
      locked_by: 'LIVE_TEST_HUNTER' 
    })
    .eq('status', 'RAW')
    .eq('raw_payload', '||V12_GHOST_LEAD||')
    .limit(1)
    .select();

  if (claimError || !jobs || jobs.length === 0) {
    console.error("❌ [LIVE_TEST] No Ghost Leads found to hunt.");
    return;
  }

  const job = jobs[0];
  console.log(`🎯 [LIVE_TEST] Hunting Lead: ${job.source_url}`);

  // 2. Perform Real Scrape
  const res = await fetch(job.source_url);
  const html = await res.text();
  console.log(`📡 [LIVE_TEST] Scraped ${html.length} bytes of HTML.`);

  // 3. Promote to RAW and Notify Inngest
  const { error: updateError } = await supabase
    .from('raw_job_harvests')
    .update({
      raw_payload: html.slice(0, 50000), // Trim for DB
      status: 'RAW', // Real RAW now
      locked_by: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id);

  if (updateError) {
    console.error("❌ [LIVE_TEST] Pantry Update Failed:", updateError.message);
    return;
  }

  // 4. RING THE BELL 🔔
  const eventKey = "eUhXwrLoBK6__htkbP1pbz-iGd0qw2w0ohUQbWHMf6vijVRcdU3SqlKF_YcUE4nomyF-jWAuLHJ38mNvnZBqqA";
  await fetch(`https://innge.st/e/${eventKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "job.harvested",
      data: {
        raw_title: "V12 Live Test Job",
        raw_company: "V12 Automated Hub",
        raw_url: job.source_url,
        raw_html: html.slice(0, 15000)
      }
    })
  });

  console.log("✅ [LIVE_TEST] Job Scraped & Bell Rung! The AI Chef is now Cooking...");
}

simulateHunt();
