import { supabase } from "../packages/db/supabase";

const REAL_URL = "https://jobicy.com/jobs/remote-senior-java-developer-developer-id-94827";

async function harvestRealJob() {
  console.log(`🚀 [REAL-VERIFY] Harvesting: ${REAL_URL}`);

  try {
    // 1. Fetch Real HTML
    const res = await fetch(REAL_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (V12-Brigade-Audit)" }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const html = await res.text();

    console.log(`✅ [REAL-VERIFY] HTML Captured (${html.length} chars)`);

    // 2. Dump to Supabase
    const { data: job, error } = await supabase
      .from('raw_job_harvests')
      .insert({
        source_url: REAL_URL,
        raw_payload: html,
        source_platform: 'Jobicy (Live Audit)',
        status: 'RAW'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log("⚠️ [REAL-VERIFY] Job already exists in Pantry. Proceeding to process existing record.");
        const { data: existing } = await supabase.from('raw_job_harvests').select('*').eq('source_url', REAL_URL).single();
        return existing;
      }
      throw error;
    }

    console.log(`✅ [REAL-VERIFY] Real Job Injected: ${job.id}`);
    return job;

  } catch (err) {
    console.error("❌ [REAL-VERIFY] Harvest failed:", err);
    process.exit(1);
  }
}

harvestRealJob().then(job => {
  console.log("DONE");
});
