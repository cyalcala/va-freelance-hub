import { supabase } from '../packages/db/supabase';

/**
 * V12 SIFTER: The Janitor (Garbage Collector)
 * 
 * Role: 
 * 1. Delete all jobs marked as PLATED (They are already in Turso Vault).
 * 2. Delete all jobs older than 3 days (Even if RAW/FAILED).
 * 3. Keeps your 500MB Supabase free tier lean.
 */

async function purgeStaleData() {
  console.log('🧹 [JANITOR] Starting garbage collection...');

  // 1. Delete Stale PLATED records (Safety Net for jobs that failed to sync)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const { data: platedData, error: platedError } = await supabase
    .from('raw_job_harvests')
    .delete()
    .eq('status', 'PLATED')
    .lt('updated_at', oneDayAgo.toISOString());

  if (platedError) console.error('🧹 [JANITOR] Error purging stale PLATED jobs:', platedError);
  else console.log('🧹 [JANITOR] Purged stuck PLATED jobs older than 24h.');

  // 2. Delete Stale Jobs (3+ days old)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: staleData, error: staleError } = await supabase
    .from('raw_job_harvests')
    .delete()
    .lt('created_at', threeDaysAgo.toISOString());

  if (staleError) console.error('🧹 [JANITOR] Error purging stale jobs:', staleError);
  else console.log('🧹 [JANITOR] Purged all jobs older than 3 days.');

  console.log('🧹 [JANITOR] Maintenance complete.');
}

// Global invocation (for Bun/Node runner)
purgeStaleData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
