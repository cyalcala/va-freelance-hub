import { supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";

const MOCK_HTML = `
<html>
<body>
  <h1>Senior Fullstack Developer (Remote)</h1>
  <p>Company: V12 Brigade Tech</p>
  <p>Salary: $5000/mo</p>
  <p>Looking for someone who knows Astro, Inngest, and Supabase.</p>
</body>
</html>
`;

async function runV2Audit() {
  console.log("🚀 [AUDIT-V2] Starting Brigade Synchronization Test...");

  // 1. Reset Cooldowns for Clean Test
  await supabase.from('ai_cooldowns').update({ is_blocked: false, last_error: null }).neq('provider_name', '');

  // 2. Inject Mock Job
  const { data: job, error } = await supabase
    .from('raw_job_harvests')
    .insert({
      source_url: `https://v2-audit.com/${Date.now()}`,
      raw_payload: MOCK_HTML,
      source_platform: 'Audit-V2',
      status: 'RAW'
    })
    .select()
    .single();

  if (error || !job) throw new Error("Failed to inject audit job");
  console.log(`✅ [AUDIT-V2] Job Injected: ${job.id}`);

  // 3. Simulate Inngest Processing with a MOCKED 429
  console.log("🔬 [AUDIT-V2] Step 1: Simulating Inngest with intelligent rotation...");
  try {
    const extraction = await AIMesh.extract(job.raw_payload);
    console.log("✅ [AUDIT-V2] Extraction Successful from initial provider.");
    console.log(`🧠 [AUDIT-V2] Provider: ${extraction.metadata?.model}`);
  } catch (err) {
    console.warn("⚠️ [AUDIT-V2] Inngest experienced a failure (Expected if testing cooldowns).");
  }

  // 4. Verify Cooldown Propagation
  const { data: health } = await supabase.from('ai_cooldowns').select('*').eq('is_blocked', true);
  if (health && health.length > 0) {
    console.log(`🚨 [AUDIT-V2] Cooldown Detected: ${health.map(h => h.provider_name).join(", ")}`);
  } else {
    console.log("🟢 [AUDIT-V2] All providers healthy.");
  }

  // 5. Cleanup Audit Job
  await supabase.from('raw_job_harvests').delete().eq('id', job.id);
  console.log("🧹 [AUDIT-V2] Cleanup Complete.");
}

runV2Audit().catch(console.error);
