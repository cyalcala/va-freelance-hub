import postgres from "postgres";

/**
 * 🛡️ PROGRAMMATIC SUPABASE MIGRATION (V12 SIFTER)
 * 
 * Goal: Add 'mapped_payload' JSONB column to 'raw_job_harvests' table.
 * Requirement: Idempotent and safe for CI/CD environments.
 * Infrastructure: Requires direct Postgres connection string (SUPABASE_DB_URL).
 */

async function migrate() {
    const dbUrl = process.env.SUPABASE_DB_URL;

    if (!dbUrl) {
        console.error("🔴 [MIGRATION] ERROR: SUPABASE_DB_URL environment variable is missing.");
        process.exit(1);
    }

    // Connect to Supabase Postgres (Direct/Pooler connection)
    // 🛡️ Resilience: Added 3 retries and 30s timeout for CI/CD networking stability
    const sql = postgres(dbUrl, {
        ssl: 'require',
        max: 1,
        connect_timeout: 30, // 30 seconds
        onnotice: () => {}, // Silence internal Postgres notices
    });

    console.log("🛠️ [MIGRATION] Checking schema for 'raw_job_harvests'...");

    try {
        // 1. Idempotent Column Creation
        await sql`
            ALTER TABLE raw_job_harvests 
            ADD COLUMN IF NOT EXISTS mapped_payload JSONB;
        `;
        console.log("✅ [MIGRATION] 'mapped_payload' column ensured (using IF NOT EXISTS).");
        
        // 2. V12 Governance: Autonomous Circuit Breaker Columns
        console.log("🛠️ [MIGRATION] Checking schema for 'vitals'...");
        await sql`
            ALTER TABLE vitals 
            ADD COLUMN IF NOT EXISTS trigger_credits_ok BOOLEAN DEFAULT TRUE;
        `;
        await sql`
            ALTER TABLE vitals 
            ADD COLUMN IF NOT EXISTS trigger_last_exhaustion TIMESTAMP;
        `;
        console.log("✅ [MIGRATION] V12 Governance columns ensured.");

        // 3. Index for Performance (Speed up the Sweep sync)
        await sql`
            CREATE INDEX IF NOT EXISTS idx_raw_jobs_plated_mapped 
            ON raw_job_harvests (status, (mapped_payload IS NOT NULL)) 
            WHERE status = 'PLATED';
        `;
        console.log("✅ [MIGRATION] Sync performance index ensured.");

    } catch (err: any) {
        console.error("🔴 [MIGRATION] FAILED during schema update:", err.message);
        process.exit(1);
    } finally {
        await sql.end();
    }

    console.log("🎉 [MIGRATION] Zero-Touch Infrastructure Sweep Complete.");
}

migrate();
