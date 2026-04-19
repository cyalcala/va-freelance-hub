import { db } from '../packages/db';
import { vitals } from '../packages/db/schema';
import { supabase } from '../packages/db/supabase';
import { eq, sql } from 'drizzle-orm';

async function defibrillate() {
  console.log("⚡ [DEFIBRILLATOR] Initiating System Resuscitation...");

  // 1. Clear Turso Vitals Locks
  console.log("🔓 Unlocking Turso Vitals...");
  const vitalsResult = await db.update(vitals)
    .set({ 
      lockStatus: 'IDLE',
      triggerCreditsOk: true,
      lastHarvestEngine: 'DEFIBRILLATOR_RESET'
    })
    .where(sql`1=1`); // Update all rows
  console.log(`✅ Reset ${vitalsResult.rowsAffected} vitals records.`);

  // 2. Clear Supabase Bodega Locks
  console.log("🔓 Unlocking Supabase Bodega...");
  const { data, error } = await supabase
    .from('raw_job_harvests')
    .update({ 
      status: 'RAW', 
      locked_by: null,
      updated_at: new Date().toISOString()
    })
    .not('locked_by', 'is', null);

  if (error) {
    console.error(`❌ Supabase unlock failed: ${error.message}`);
  } else {
    console.log(`✅ Supabase locks cleared.`);
  }

  // 3. Force release of specific regional leases
  console.log("📡 Releasing regional leases...");
  await db.update(vitals)
    .set({ lastHarvestAt: null })
    .where(sql`1=1`);

  console.log("⚡ [DEFIBRILLATOR] System Resuscitated. NOMINAL state restored.");
  process.exit(0);
}

defibrillate().catch(e => {
  console.error("❌ Defibrillator failure:", e);
  process.exit(1);
});
