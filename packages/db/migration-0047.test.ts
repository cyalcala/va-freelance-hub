import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

function setupDatabase(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  
  // Create tables needed for migration 0047
  db.exec(`
    CREATE TABLE source_registry (
      source_id TEXT PRIMARY KEY NOT NULL,
      operational_state TEXT NOT NULL
    );

    CREATE TABLE opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      source_id TEXT,
      title TEXT NOT NULL,
      location_raw TEXT,
      is_active INTEGER DEFAULT 1 NOT NULL,
      inactive_reason TEXT,
      ph_eligibility TEXT DEFAULT 'unclear',
      geo_scope TEXT DEFAULT 'unknown',
      geo_evidence TEXT,
      updated_at TEXT
    );
  `);

  return db;
}

describe("0047 deactivate shadow candidate jobs and unclear titles", () => {
  test("splits cleanly through wrangler unstable_splitSqlQuery for LF and CRLF", async () => {
    const { unstable_splitSqlQuery } = await import("wrangler");
    const migration = readFileSync(
      join(import.meta.dir, "./migrations", "0047_deactivate_shadow_candidate_jobs_and_unclear_titles.sql"),
      "utf-8",
    );

    for (const newline of ["\n", "\r\n"]) {
      const statements = unstable_splitSqlQuery(migration.replace(/\r?\n/g, newline));
      expect(statements.length).toBe(5);
    }
  });

  test("executes all 4 update steps with exact precision", () => {
    const db = setupDatabase();

    // 1. Seed registry
    db.exec(`
      INSERT INTO source_registry (source_id, operational_state) VALUES
      ('breezy:sourcefit', 'active'),
      ('breezy:yokly', 'active'),
      ('greenhouse:nearform', 'canary'),
      ('greenhouse:ghost', 'canary'),
      ('ashby:supabase', 'candidate'),
      ('greenhouse:gitlab', 'shadow'),
      ('teamtailor:quarantined', 'quarantined');
    `);

    // 2. Seed opportunities
    db.exec(`
      INSERT INTO opportunities (id, source_id, title, location_raw, is_active, inactive_reason, ph_eligibility) VALUES
      -- Legitimate active sourcefit job
      (1, 'breezy:sourcefit', 'Accountant', 'Eastwood, PH', 1, NULL, 'eligible_verified'),
      -- Legitimate canary ghost job
      (2, 'greenhouse:ghost', 'Senior Manager', NULL, 1, NULL, 'eligible_likely'),
      -- Candidate source job (leak)
      (3, 'ashby:supabase', 'Support Engineer (AMER)', NULL, 1, NULL, 'unclear'),
      -- Shadow source job (leak)
      (4, 'greenhouse:gitlab', 'Director, Support (EMEA)', NULL, 1, NULL, 'unclear'),
      -- Canary Nearform country-locked jobs
      (5, 'greenhouse:nearform', 'Senior DevOps Engineer (Perm, UK, Remote)', NULL, 1, NULL, 'eligible_likely'),
      (6, 'greenhouse:nearform', 'Technical Director (Perm, Canada, Remote)', NULL, 1, NULL, 'eligible_likely'),
      (7, 'greenhouse:nearform', 'Technical Director (Perm, USA, Remote)', NULL, 1, NULL, 'eligible_likely'),
      (8, 'greenhouse:nearform', 'Technical Director (Perm, Ireland, Remote)', NULL, 1, NULL, 'unclear'),
      -- Genuine Yokly Philippine jobs
      (9, 'breezy:yokly', 'Operations Virtual Assistant', 'bohol, PH', 1, NULL, 'unclear'),
      (10, 'breezy:yokly', 'Revenue Operations Lead', 'Luzon, PH', 1, NULL, 'unclear'),
      (11, 'breezy:yokly', 'Video Editor & Graphic Designer', 'leyte, PH', 1, NULL, 'unclear'),
      (12, 'breezy:yokly', 'Marketing Specialist', 'batangas, PH', 1, NULL, 'unclear'),
      (13, 'breezy:yokly', 'Lead Gen Specialist', 'general santos, PH', 1, NULL, 'unclear'),
      -- Remaining unclear jobs
      (14, 'remotive', 'Head of Marketing & Communications', NULL, 1, NULL, 'unclear');
    `);

    // 3. Execute migration
    const migration = readFileSync(
      join(import.meta.dir, "./migrations", "0047_deactivate_shadow_candidate_jobs_and_unclear_titles.sql"),
      "utf-8",
    );
    // Strip drizzle statement-breakpoints and comments
    const executableStatements = migration
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of executableStatements) {
      db.exec(statement);
    }

    // 4. Verify results
    // Step 1: Candidate / shadow jobs deactivated
    const candidateJob = db.query("SELECT is_active, inactive_reason FROM opportunities WHERE id = 3").get() as any;
    expect(candidateJob.is_active).toBe(0);
    expect(candidateJob.inactive_reason).toBe("policy-rejected");

    const shadowJob = db.query("SELECT is_active, inactive_reason FROM opportunities WHERE id = 4").get() as any;
    expect(shadowJob.is_active).toBe(0);
    expect(shadowJob.inactive_reason).toBe("policy-rejected");

    // Step 2: Nearform country-locked jobs deactivated & marked ineligible
    const nearformJob1 = db.query("SELECT is_active, inactive_reason, ph_eligibility, geo_scope FROM opportunities WHERE id = 5").get() as any;
    expect(nearformJob1.is_active).toBe(0);
    expect(nearformJob1.inactive_reason).toBe("policy-rejected");
    expect(nearformJob1.ph_eligibility).toBe("ineligible");
    expect(nearformJob1.geo_scope).toBe("country_locked");

    const nearformJob2 = db.query("SELECT is_active, inactive_reason, ph_eligibility, geo_scope FROM opportunities WHERE id = 6").get() as any;
    expect(nearformJob2.is_active).toBe(0);
    expect(nearformJob2.ph_eligibility).toBe("ineligible");

    // Step 3: Yokly genuine PH jobs upgraded
    const yoklyJobs = db.query("SELECT id, ph_eligibility, geo_scope, is_active FROM opportunities WHERE source_id = 'breezy:yokly'").all() as any[];
    expect(yoklyJobs.length).toBe(5);
    for (const y of yoklyJobs) {
      expect(y.ph_eligibility).toBe("eligible_verified");
      expect(y.geo_scope).toBe("ph_only");
      expect(y.is_active).toBe(1);
    }

    // Step 4: Remaining unclear job deactivated
    const remainingUnclear = db.query("SELECT is_active, inactive_reason FROM opportunities WHERE id = 14").get() as any;
    expect(remainingUnclear.is_active).toBe(0);
    expect(remainingUnclear.inactive_reason).toBe("policy-rejected");

    // Legitimate active jobs unchanged
    const sourcefit = db.query("SELECT is_active, ph_eligibility FROM opportunities WHERE id = 1").get() as any;
    expect(sourcefit.is_active).toBe(1);
    expect(sourcefit.ph_eligibility).toBe("eligible_verified");

    const ghost = db.query("SELECT is_active, ph_eligibility FROM opportunities WHERE id = 2").get() as any;
    expect(ghost.is_active).toBe(1);
    expect(ghost.ph_eligibility).toBe("eligible_likely");

    // ZERO active unclear jobs
    const activeUnclear = db.query("SELECT count(*) as count FROM opportunities WHERE is_active = 1 AND ph_eligibility = 'unclear'").get() as any;
    expect(activeUnclear.count).toBe(0);

    // ZERO active candidate/shadow jobs
    const activeShadow = db.query("SELECT count(*) as count FROM opportunities o JOIN source_registry sr ON o.source_id = sr.source_id WHERE o.is_active = 1 AND sr.operational_state IN ('candidate', 'shadow')").get() as any;
    expect(activeShadow.count).toBe(0);

    db.close();
  });
});
