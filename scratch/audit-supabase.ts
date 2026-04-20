import { supabase } from '../packages/db/supabase';

async function audit() {
  console.log("🔍 [SUPABASE] Deep Audit...");

  const { data, error } = await supabase
    .from('raw_job_harvests')
    .select('source_url, created_at, updated_at, status, source_platform')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error("❌ Error:", error.message);
    return;
  }

  console.table(data.map(d => ({
    ...d,
    created_age: ((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60)).toFixed(2) + 'h',
    updated_age: ((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60)).toFixed(2) + 'h'
  })));

  const { count: rawCount } = await supabase.from('raw_job_harvests').select('*', { count: 'exact', head: true }).eq('status', 'RAW');
  console.log(`\nRAW Jobs: ${rawCount}`);
}

audit();
