import { db } from '../packages/db';
import { opportunities } from '../packages/db/schema';
import { desc } from 'drizzle-orm';
import { supabase } from '../packages/db/supabase';

async function audit() {
  console.log("🔍 [DIAG] Auditing Sovereign Vaults...");

  try {
    const [lastTurso] = await db.select().from(opportunities).orderBy(desc(opportunities.latestActivityMs)).limit(1);
    if (lastTurso) {
      const ageHours = (Date.now() - Number(lastTurso.latestActivityMs)) / (1000 * 60 * 60);
      console.log(`✅ [TURSO] Latest Job: "${lastTurso.title}" (${ageHours.toFixed(2)}h ago)`);
    } else {
      console.log("❌ [TURSO] No signals found.");
    }
  } catch (e: any) {
    console.error(`❌ [TURSO] Error: ${e.message}`);
  }

  try {
    const { data: latest } = await supabase.from('raw_job_harvests').select('source_url, created_at, status').order('created_at', { ascending: false }).limit(5);
    if (latest && latest.length > 0) {
       latest.forEach(j => {
          const ageHours = (Date.now() - new Date(j.created_at).getTime()) / (1000 * 60 * 60);
          console.log(`✅ [SUPABASE] Latest Harvest: "${j.source_url.slice(0, 30)}..." (${ageHours.toFixed(2)}h ago) [Status: ${j.status}]`);
       });
    } else {
      console.log("❌ [SUPABASE] No harvest signals found.");
    }
  } catch (e: any) {
    console.error(`❌ [SUPABASE] Error: ${e.message}`);
  }
}

audit();
