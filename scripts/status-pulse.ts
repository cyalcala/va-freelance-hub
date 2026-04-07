import { supabase } from '../packages/db/supabase';
import { db } from '../packages/db/client';
import { opportunities } from '../packages/db/schema';
import { count } from 'drizzle-orm';

async function runPulse() {
  console.log('═══ V12 SYSTEM PULSE AUDIT ═══');

  // 1. Check Supabase (The Intake Valve)
  console.log('\n📡 [SUPABASE] Intake Pipeline:');
  const { data: supaStats, error: supaError } = await supabase
    .from('raw_job_harvests')
    .select('status');

  if (supaError) {
    console.error('  🛑 Supabase Error:', supaError.message);
  } else {
    const counts = supaStats?.reduce((acc: any, curr: any) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});
    console.log('  📊 Status Breakdown:', counts || '{ No Records }');
    
    // Cloudflare Check
    const rawCount = (counts?.['RAW'] || 0) + (counts?.['LEAD'] || 0);
    if (rawCount > 0) {
      console.log(`  ✅ Cloudflare: WORKING (Captured ${rawCount} raw leads awaiting Chef).`);
    } else {
      console.log('  ⚠️ Cloudflare: IDLE (No new raw leads detected).');
    }

    // Chef Check
    const platedCount = counts?.['PLATED'] || 0;
    if (platedCount > 0) {
      console.log(`  👨‍🍳 Chef: WORKING (Plated ${platedCount} jobs for the Sync Sweep).`);
    } else {
      console.log('  ⚠️ Chef: IDLE or SYNCED (No plated jobs waiting in Supabase).');
    }
  }

  // 2. Check Turso (The Gold Vault)
  console.log('\n🏆 [TURSO] Gold Vault:');
  const [tursoResult] = await db.select({ value: count() }).from(opportunities);
  console.log(`  💰 Total Gold Opportunities: ${tursoResult.value}`);
  
  // 3. Verification
  console.log('\n🚀 [CONCLUSION]:');
  if (supaStats?.length === 0 && tursoResult.value > 0) {
    console.log('  ✅ ALL SYSTEMS NOMINAL: The "Dumb Conveyor Belt" has cleared the intake and moved everything to the Vault.');
  } else if (supaStats?.some(s => s.status === 'PLATED')) {
    console.log('  🚜 SYNC IN PROGRESS: The Sweep worker is scheduled and awaiting its next run.');
  } else {
    console.log('  🟢 IDLE: Standing by for new job signals.');
  }
}

runPulse().catch(console.error);
