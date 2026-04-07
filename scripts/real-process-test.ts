import { supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";

async function processRealJob() {
  console.log("👨‍🍳 [REAL-VERIFY] Picking up REAL Job from Pantry...");

  try {
    // 1. Fetch the latest RAW job from WWR
    const { data: job, error: fetchErr } = await supabase
      .from('raw_job_harvests')
      .select('*')
      .eq('status', 'RAW')
      .eq('source_platform', 'WeWorkRemotely (Live Audit)')
      .limit(1)
      .single();

    if (fetchErr || !job) throw new Error("No real audit job found in RAW state.");

    console.log(`👨‍🍳 [REAL-VERIFY] Processing Job: ${job.id} (${job.source_url})`);

    // 2. Intelligent Extraction
    const extraction = await AIMesh.extract(job.raw_payload);
    console.log(`✅ [REAL-VERIFY] Extraction Successful! Title: ${extraction.title}`);

    // 3. Update Supabase
    const { error: updateErr } = await supabase
      .from('raw_job_harvests')
      .update({
        status: 'PROCESSED',
        triage_status: 'PASSED',
        raw_payload: JSON.stringify(extraction)
      })
      .eq('id', job.id);

    if (updateErr) throw updateErr;
    console.log("✅ [REAL-VERIFY] Supabase State: PROCESSED");

    return job.id;

  } catch (err) {
    console.error("❌ [REAL-VERIFY] Processing failed:", err);
    process.exit(1);
  }
}

processRealJob();
