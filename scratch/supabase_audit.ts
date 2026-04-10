import { supabase } from "../packages/db/supabase";

async function auditSupabase() {
  console.log("═══ SRE SUPABASE AUDIT: THE CHOPPING BOARD ═══");
  
  try {
    // 1. Check Job Counts by Status
    const { data: counts, error: countError } = await supabase
      .from('raw_job_harvests')
      .select('status');
      
    if (countError) throw countError;
    
    const stats: Record<string, number> = {};
    counts?.forEach(row => {
      stats[row.status] = (stats[row.status] || 0) + 1;
    });
    
    console.log("\n[1/3] JOB STATUS DISTRIBUTION");
    Object.entries(stats).forEach(([status, count]) => {
      console.log(`- ${status}: ${count}`);
    });

    // 2. Check for "Orphaned" Locked Jobs
    const { data: locked, error: lockError } = await supabase
      .from('raw_job_harvests')
      .select('id, status, locked_by, updated_at')
      .not('locked_by', 'is', null);
      
    if (lockError) throw lockError;
    
    console.log("\n[2/3] ACTIVE LOCKS");
    locked?.forEach(l => {
      console.log(`- ID: ${l.id} | Status: ${l.status} | LockedBy: ${l.locked_by} | Updated: ${l.updated_at}`);
    });

    // 3. Check AI Cooldowns
    const { data: cooldowns, error: coolError } = await supabase
      .from('ai_cooldowns')
      .select('*');
      
    if (coolError) throw coolError;
    
    console.log("\n[3/3] AI MESH COOLDOWNS");
    cooldowns?.forEach(c => {
      console.log(`- Provider: ${c.provider_name} | Blocked: ${c.is_blocked} | Errors: ${c.error_count}`);
    });

  } catch (err: any) {
    console.error("❌ Supabase Audit Failure:", err.message);
  }
  
  console.log("\n═══ SUPABASE AUDIT COMPLETE ═══");
}

auditSupabase();
