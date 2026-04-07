import { supabase } from "../packages/db/supabase";

const WWR_URL = "https://weworkremotely.com/remote-jobs/top-tal-inc-senior-front-end-developer";

async function harvestRealJob() {
  console.log("🚀 [REAL-VERIFY] Fetching WWR Search...");

  try {
    console.log(`🚀 [REAL-VERIFY] Fetching WWR URL: ${WWR_URL}`);

    const jobRes = await fetch(WWR_URL);
    if (!jobRes.ok) throw new Error(`Status: ${jobRes.status}`);
    const jobHtml = await jobRes.text();

    // Inject into Supabase
    const { data: job, error } = await supabase
      .from('raw_job_harvests')
      .upsert({
        source_url: WWR_URL,
        raw_payload: jobHtml,
        source_platform: 'WeWorkRemotely (Live Audit)',
        status: 'RAW'
      }, { onConflict: 'source_url' })
      .select()
      .single();

    if (error) throw error;
    console.log(`✅ [REAL-VERIFY] Real Job Injected: ${job.id}`);
    return job;

  } catch (err) {
    console.error("❌ [REAL-VERIFY] WWR Harvest failed:", err);
    process.exit(1);
  }
}

harvestRealJob();
