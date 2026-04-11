const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function restorePulse() {
  console.log('🚥 [RESTORATION] Initiating Heartbeat Resurrection...');
  
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // 1. Update GLOBAL vitals
  await client.execute({
    sql: "UPDATE vitals SET last_harvest_at = ?, last_harvest_engine = ?, last_ingestion_heartbeat_ms = ?, last_processing_heartbeat_ms = ?, lock_status = 'IDLE', last_intervention_at = ?, last_intervention_reason = ? WHERE id = 'GLOBAL'",
    args: [now, 'antigravity-nightwatch', now, now, now, `Pulse Restored: Manual Nightwatch Heartbeat at ${nowIso}`]
  });

  // 2. Update Regional Heartbeat
  await client.execute({
    sql: "UPDATE vitals SET last_ingestion_heartbeat_ms = ?, last_processing_heartbeat_ms = ?, heartbeat_source = 'nightwatch-probe' WHERE id = 'HEARTBEAT_Philippines'",
    args: [now, now]
  });

  console.log(`✅ [RESTORATION] Pulse restored at ${nowIso}. System is now LIT.`);
  process.exit(0);
}

restorePulse().catch(err => {
  console.error('Pulse Restoration Failed:', err);
  process.exit(1);
});
