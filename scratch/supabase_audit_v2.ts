import { supabase } from "../packages/db/supabase";

async function checkAIStatus() {
  console.log("═══ SRE MASTER AUDIT: SUPABASE AI STATUS ═══");
  
  try {
    const { data: cooldowns, error } = await supabase
      .from('ai_cooldowns')
      .select('*');

    if (error) throw error;

    console.log("\n--- AI PROVIDER HEALTH ---");
    if (!cooldowns || cooldowns.length === 0) {
      console.log("No cooldown records found. All providers are fresh?");
    } else {
      cooldowns.forEach(r => {
        const status = r.is_blocked ? "🔴 BLOCKED" : "🟢 READY";
        console.log(`- ${r.provider_name.padEnd(12)}: ${status} | Errors: ${r.error_count ?? 0}`);
        if (r.last_error) console.log(`  Last Err: ${r.last_error.substring(0, 100)}...`);
      });
    }

    // Also check for FAILED jobs in Supabase to see if AI crashed there
    const { count: failedJobs } = await supabase
      .from('raw_job_harvests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'FAILED');

    console.log(`\n- Failed Jobs in Supabase: ${failedJobs}`);

  } catch (err: any) {
    console.error("Supabase Audit Failed:", err.message);
  }
}

checkAIStatus();
