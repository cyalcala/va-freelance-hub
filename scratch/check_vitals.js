const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkVitals() {
  console.log('--- SYSTEM VITALS AUDIT ---');
  
  const res = await client.execute("SELECT * FROM vitals WHERE id = 'GLOBAL'");
  const v = res.rows[0];
  
  if (!v) {
    console.error('CRITICAL: Global vitals record missing!');
    process.exit(1);
  }

  console.log(`Lock Status: ${v.lock_status}`);
  console.log(`Total Purged: ${v.total_purged}`);
  console.log(`AI Quota Count: ${v.ai_quota_count}`);
  console.log(`Last Intervention: ${v.last_intervention_reason}`);
  console.log(`Last Harvest At: ${new Date(v.last_harvest_at).toISOString()}`);
  
  const now = Date.now();
  const drift = (now - Number(v.last_harvest_at)) / 1000 / 60;
  console.log(`Harvest Drift: ${drift.toFixed(2)} minutes`);

  if (v.lock_status !== 'IDLE') {
    console.warn('⚠️  WARNING: System lock is still ACTIVE. Pipeline may be hung.');
  }

  process.exit(0);
}

checkVitals().catch(err => {
  console.error('Vitals Check Failed:', err);
  process.exit(1);
});
