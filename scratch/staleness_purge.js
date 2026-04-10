const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function runStalenessPurge() {
  console.log('--- STARTING STALENESS & HEALTH CHECK ---');

  // 1. Purge jobs older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoTs = thirtyDaysAgo.getTime();

  console.log(`Deactivating jobs posted before ${thirtyDaysAgo.toISOString()}...`);
  
  const res = await client.execute({
    sql: "UPDATE opportunities SET is_active = 0, metadata = json_set(metadata, '$.purge_reason', 'Staleness: >30 days') WHERE posted_at < ? AND is_active = 1",
    args: [thirtyDaysAgoTs]
  });

  console.log(`Staleness purge: Updated ${res.rowsAffected} records.`);

  // 2. Reset jammed locks in vitals
  console.log('Resetting system locks...');
  const vitalsRes = await client.execute({
    sql: "UPDATE vitals SET lock_status = 'IDLE', lock_updated_at = ? WHERE id = 'GLOBAL'",
    args: [Date.now()]
  });
  console.log(`Vitals lock reset: ${vitalsRes.rowsAffected} records updated.`);

  // 3. Log the action
  await client.execute({
    sql: "INSERT INTO noteslog (id, timestamp, drift_minutes, actions_taken, status) VALUES (?, ?, ?, ?, ?)",
    args: [
      `nightwatch-${Date.now()}`,
      Date.now(),
      0,
      `Nightwatch SRE sweep: Purged ${res.rowsAffected} stale jobs and reset system locks.`,
      'SUCCESS'
    ]
  });

  console.log('--- STALENESS & HEALTH CHECK COMPLETE ---');
  process.exit(0);
}

runStalenessPurge().catch(err => {
  console.error('Fatal Staleness Purge Error:', err);
  process.exit(1);
});
