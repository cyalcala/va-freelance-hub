import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSupabase() {
  console.log('📡 [HEARTBEAT] Testing Supabase connection...');
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Connectivity Test
    const { count, error: healthError } = await supabase
      .from('raw_job_harvests')
      .select('*', { count: 'exact', head: true });

    if (healthError) {
      if (healthError.message.includes('relation "raw_job_harvests" does not exist')) {
        console.error('🔴 CONNECTION OK, but TABLE MISSING.');
        console.error('👉 Please run the SQL in `scripts/pantry-schema.sql` in your Supabase SQL Editor.');
      } else {
        console.error('🔴 CONNECTION FAILED:', healthError.message);
      }
      process.exit(1);
    }

    console.log('🟢 CONNECTION SUCCESSFUL!');
    console.log('🟢 TABLE "raw_job_harvests" FOUND!');

    // 2. Mock Insert Test
    console.log('📡 [HEARTBEAT] Testing mock insert...');
    const { data: mockInsert, error: insertError } = await supabase
      .from('raw_job_harvests')
      .insert({
        source_url: `https://example.com/heartbeat-${Date.now()}`,
        raw_payload: '<h1>Heartbeat</h1>',
        source_platform: 'Heartbeat',
        status: 'RAW'
      })
      .select();

    if (insertError) {
      console.error('🔴 MOCK INSERT FAILED:', insertError.message);
      process.exit(1);
    }

    console.log('🟢 MOCK INSERT SUCCESSFUL!');
    process.exit(0);

  } catch (err: any) {
    console.error('🔴 UNEXPECTED ERROR:', err.message);
    process.exit(1);
  }
}

checkSupabase();
