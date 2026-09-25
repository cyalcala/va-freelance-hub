import { getLakeClient } from "./client";

async function initLake() {
  console.log("Connecting to Turso Data Lake...");
  const client = getLakeClient();

  // 1. Connectivity test
  const ping = await client.execute("SELECT 1 AS ping;");
  console.log("Turso connection successful! Ping result:", ping.rows[0]);

  // 2. Create raw observations table
  console.log("Creating lake_raw_observations table...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lake_raw_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      source_platform TEXT NOT NULL,
      fetch_url TEXT NOT NULL,
      http_status INTEGER NOT NULL DEFAULT 200,
      raw_payload TEXT NOT NULL,
      content_hash TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed INTEGER NOT NULL DEFAULT 0,
      error_message TEXT
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_raw_processed 
    ON lake_raw_observations(processed, fetched_at);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_raw_source 
    ON lake_raw_observations(source_id, fetched_at);
  `);

  // 3. Create candidate jobs table
  console.log("Creating lake_candidate_jobs table...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lake_candidate_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_observation_id INTEGER REFERENCES lake_raw_observations(id),
      source_id TEXT NOT NULL,
      source_platform TEXT NOT NULL,
      source_url TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      company TEXT,
      category TEXT DEFAULT 'other',
      location_type TEXT DEFAULT 'remote',
      location_raw TEXT,
      description TEXT,
      application_url TEXT,
      posted_at TEXT,
      observed_at TEXT NOT NULL DEFAULT (datetime('now')),
      fingerprint_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'RAW',
      geo_scope TEXT DEFAULT 'unknown',
      ph_eligibility TEXT DEFAULT 'unclear',
      geo_evidence TEXT,
      triage_verdict TEXT,
      triage_confidence REAL,
      triage_reason TEXT,
      d1_opportunity_id INTEGER,
      synced_to_d1_at TEXT,
      rejection_reason TEXT
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_candidate_status 
    ON lake_candidate_jobs(status);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_candidate_fingerprint 
    ON lake_candidate_jobs(fingerprint_hash);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_candidate_source 
    ON lake_candidate_jobs(source_id, observed_at);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_candidate_ph 
    ON lake_candidate_jobs(ph_eligibility);
  `);

  // 4. Create sightings table for multi-layered deduplication and observation tracking
  console.log("Creating lake_sightings table...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lake_sightings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER REFERENCES lake_candidate_jobs(id),
      raw_observation_id INTEGER REFERENCES lake_raw_observations(id),
      source_id TEXT NOT NULL,
      source_platform TEXT NOT NULL,
      source_url TEXT NOT NULL,
      observed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_sightings_candidate 
    ON lake_sightings(candidate_id);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_sightings_source 
    ON lake_sightings(source_id, observed_at);
  `);

  // 5. Create replay events table for historical rule recovery audit trail
  console.log("Creating lake_replay_events table...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lake_replay_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL REFERENCES lake_candidate_jobs(id),
      original_status TEXT NOT NULL,
      original_ph_eligibility TEXT,
      new_status TEXT NOT NULL,
      new_ph_eligibility TEXT,
      rule_version TEXT NOT NULL,
      reason TEXT NOT NULL,
      replayed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_replay_candidate 
    ON lake_replay_events(candidate_id);
  `);

  // 6. Ensure optional columns exist on lake_candidate_jobs
  try {
    await client.execute(`ALTER TABLE lake_candidate_jobs ADD COLUMN sighting_count INTEGER NOT NULL DEFAULT 1;`);
  } catch {
    // Column already exists
  }
  try {
    await client.execute(`ALTER TABLE lake_candidate_jobs ADD COLUMN last_observed_at TEXT;`);
  } catch {
    // Column already exists
  }

  // 7. Verify tables
  const tables = await client.execute(`
    SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'lake_%';
  `);

  console.log("\nInitialized Tables in Turso Lake:");
  for (const row of tables.rows) {
    console.log(` - ${row.name}`);
  }

  console.log("\nTurso Lake setup is complete and ready for ingestion!");
}

initLake().catch((err) => {
  console.error("Failed to initialize Turso Lake:", err);
  process.exit(1);
});
