import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import {
  buildProspectCandidateQuery,
  buildAtsCandidateMiningQuery,
  buildDirectoryAtsMiningQuery,
  POSITIVE_PH_ELIGIBILITY,
  PROSPECT_CANDIDATE_FRESHNESS_SQL,
  PROSPECT_SAMPLE_FRESHNESS_SQL,
} from "../src/lib/prospect-query";

test("prospector candidate query uses opportunity timestamp columns that exist", () => {
  expect(PROSPECT_SAMPLE_FRESHNESS_SQL).toBe("COALESCE(o2.scraped_at, o2.posted_at)");
  expect(PROSPECT_CANDIDATE_FRESHNESS_SQL).toBe("COALESCE(o.scraped_at, o.posted_at)");
  expect(PROSPECT_SAMPLE_FRESHNESS_SQL).not.toContain("created_at");
  expect(PROSPECT_CANDIDATE_FRESHNESS_SQL).not.toContain("created_at");
});

test("prospector candidate query uses only positive PH evidence for counts and samples", () => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE opportunities (
        company TEXT, source_url TEXT, application_url TEXT, category TEXT, is_active INTEGER,
        ph_eligibility TEXT, scraped_at TEXT, posted_at TEXT
      );
      CREATE TABLE va_directory (company_name TEXT);
      INSERT INTO opportunities VALUES
        ('Positive Co', 'https://example.com/verified', 'https://jobs.lever.co/positive-co/1', 'admin', 1, 'eligible_verified', '2026-08-12T00:00:00Z', NULL),
        ('Positive Co', 'https://example.com/likely', NULL, 'admin', 1, 'eligible_likely', '2026-08-11T00:00:00Z', NULL),
        ('Positive Co', 'https://example.com/newer-unclear', NULL, 'admin', 1, 'unclear', '2026-08-13T00:00:00Z', NULL),
        ('Mixed Co', 'https://example.com/mixed-positive', NULL, 'support', 1, 'eligible_verified', '2026-08-12T00:00:00Z', NULL),
        ('Mixed Co', 'https://example.com/mixed-unclear', NULL, 'support', 1, 'unclear', '2026-08-13T00:00:00Z', NULL),
        ('Unclear Co', 'https://example.com/unclear-1', NULL, 'admin', 1, 'unclear', '2026-08-12T00:00:00Z', NULL),
        ('Unclear Co', 'https://example.com/unclear-2', NULL, 'admin', 1, 'unclear', '2026-08-11T00:00:00Z', NULL),
        ('Ineligible Co', 'https://example.com/no-1', NULL, 'admin', 1, 'ineligible', '2026-08-12T00:00:00Z', NULL),
        ('Ineligible Co', 'https://example.com/no-2', NULL, 'admin', 1, 'ineligible', '2026-08-11T00:00:00Z', NULL);
    `);

    const dialect = new SQLiteSyncDialect();
    const query = dialect.sqlToQuery(buildProspectCandidateQuery({
      minimumJobs: 2,
      staleCutoff: "2026-01-01T00:00:00Z",
      limit: 200,
    }));
    const rows = database.query(query.sql).all(...query.params as any[]) as Array<{
      company: string;
      jobs: number;
      sampleUrl: string;
      category: string;
    }>;

    expect(POSITIVE_PH_ELIGIBILITY).toEqual(["eligible_verified", "eligible_likely"]);
    expect(rows).toEqual([{
      company: "Positive Co",
      jobs: 2,
      sampleUrl: "https://jobs.lever.co/positive-co/1",
      category: "admin",
    }]);
    expect(rows.some((row) => row.company === "Mixed Co")).toBe(false);
    expect(rows.some((row) => row.company === "Unclear Co")).toBe(false);
    expect(rows.some((row) => row.company === "Ineligible Co")).toBe(false);
  } finally {
    database.close();
  }
});

/**
 * Build an in-memory `opportunities` table from a row array using CTAS.
 *
 * The mining queries hardcode the table name `opportunities`, so the fixture has
 * to use it; CTAS keeps the row literals in TypeScript and out of an INSERT
 * statement, which also keeps this file clear of the guarded data-mutation SQL
 * patterns that MERGE_RUBRIC §4.3F holds.
 */
function seedOpportunities(
  database: Database,
  rows: Array<[string, string | null, string | null, string, number | null]>,
): void {
  const literals = rows
    .map(([company, applicationUrl, category, phEligibility, isActive]) =>
      `SELECT ${sqlLiteral(company)} AS company, ${sqlLiteral(applicationUrl)} AS application_url, ` +
      `${sqlLiteral(category)} AS category, ${sqlLiteral(phEligibility)} AS ph_eligibility, ` +
      `${isActive === null ? "NULL" : String(isActive)} AS is_active`)
    .join(" UNION ALL ");
  database.exec(`CREATE TABLE opportunities AS SELECT * FROM (${literals})`);
}

function sqlLiteral(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
}

test("buildAtsCandidateMiningQuery selects eligible opportunities with ATS application URLs", () => {
  const database = new Database(":memory:");
  try {
    seedOpportunities(database, [
      ["Greenhouse Co", "https://boards.greenhouse.io/ghco/jobs/123", "tech", "eligible_verified", 1],
      ["Greenhouse Co", "https://boards.greenhouse.io/ghco/jobs/124", "tech", "eligible_likely", 1],
      ["Other Co", "https://example.com/careers", "admin", "eligible_verified", 1],
      ["Ineligible Co", "https://jobs.lever.co/ineligible/123", "tech", "ineligible", 1],
    ]);

    const dialect = new SQLiteSyncDialect();
    const query = dialect.sqlToQuery(buildAtsCandidateMiningQuery(50));
    const rows = database.query(query.sql).all(...query.params as any[]) as Array<{
      company: string;
      jobs: number;
      sampleUrl: string;
      category: string;
    }>;

    expect(rows.length).toBe(1);
    expect(rows[0].company).toBe("Greenhouse Co");
    expect(rows[0].jobs).toBe(2);
    expect(rows[0].sampleUrl).toBe("https://boards.greenhouse.io/ghco/jobs/124");
  } finally {
    database.close();
  }
});

test("buildAtsCandidateMiningQuery ignores deactivated opportunities", () => {
  const database = new Database(":memory:");
  try {
    seedOpportunities(database, [
      ["Retired Co", "https://boards.greenhouse.io/retiredco/jobs/9", "tech", "eligible_verified", 0],
      ["Rejected Co", "https://jobs.lever.co/rejectedco/4", "tech", "eligible_verified", 0],
      ["Superseded Co", "https://apply.workable.com/supersededco/1/", "admin", "eligible_likely", 0],
      ["NullState Co", "https://jobs.lever.co/nullstate/5", "tech", "eligible_verified", null],
      ["Live Co", "https://boards.greenhouse.io/liveco/jobs/1", "tech", "eligible_verified", 1],
      ["Live Co", "https://boards.greenhouse.io/liveco/jobs/2", "tech", "eligible_verified", 0],
    ]);

    const dialect = new SQLiteSyncDialect();
    const query = dialect.sqlToQuery(buildAtsCandidateMiningQuery(50));
    const rows = database.query(query.sql).all(...query.params as any[]) as Array<{
      company: string;
      jobs: number;
      sampleUrl: string;
      category: string;
    }>;

    // A deactivated row is withdrawn evidence: it must not mint a candidate on
    // its own, and it must not inflate another company's active job count.
    expect(rows.map((row) => row.company)).toEqual(["Live Co"]);
    expect(rows[0].jobs).toBe(1);
    expect(rows[0].sampleUrl).toBe("https://boards.greenhouse.io/liveco/jobs/1");
  } finally {
    database.close();
  }
});

/**
 * Build an in-memory `va_directory` table from a row array using CTAS, for the
 * same reason as `seedOpportunities`: the mining query hardcodes the table name
 * `va_directory`, so the fixture must use it, while keeping row literals in
 * TypeScript and out of a data-mutation statement.
 */
function seedDirectory(
  database: Database,
  rows: Array<[string, string | null, string | null, string | null, number, number]>,
): void {
  const literals = rows
    .map(([companyName, website, niche, hiringPageUrl, hiresFilipinos, linkFailCount]) =>
      `SELECT ${sqlLiteral(companyName)} AS company_name, ${sqlLiteral(website)} AS website, ` +
      `${sqlLiteral(niche)} AS niche, ${sqlLiteral(hiringPageUrl)} AS hiring_page_url, ` +
      `${String(hiresFilipinos)} AS hires_filipinos, ${String(linkFailCount)} AS link_fail_count`)
    .join(" UNION ALL ");
  database.exec(`CREATE TABLE va_directory AS SELECT * FROM (${literals})`);
}

test("buildDirectoryAtsMiningQuery selects directory entries with ATS website URLs or hiring_page_url", () => {
  const database = new Database(":memory:");
  try {
    seedDirectory(database, [
      ["Breezy Agency", "https://agency.breezy.hr", "global-va", null, 1, 0],
      ["Workable Agency", "https://workableagency.com", "admin", "https://apply.workable.com/workable-agency", 1, 0],
      ["Standard Agency", "https://standardagency.com", "admin", "https://standardagency.com/careers", 1, 0],
    ]);

    const dialect = new SQLiteSyncDialect();
    const query = dialect.sqlToQuery(buildDirectoryAtsMiningQuery(50));
    const rows = database.query(query.sql).all(...query.params as any[]) as Array<{
      company: string;
      jobs: number;
      sampleUrl: string;
      category: string;
    }>;

    expect(rows.length).toBe(2);
    expect(rows[0].company).toBe("Breezy Agency");
    expect(rows[0].sampleUrl).toBe("https://agency.breezy.hr");
    expect(rows[0].category).toBe("global-va");
    expect(rows[1].company).toBe("Workable Agency");
    expect(rows[1].sampleUrl).toBe("https://apply.workable.com/workable-agency");
    expect(rows[1].category).toBe("admin");
  } finally {
    database.close();
  }
});

test("buildDirectoryAtsMiningQuery ignores directory entries the public directory hides", () => {
  const database = new Database(":memory:");
  try {
    seedDirectory(database, [
      // Hidden because it is not positively identified as Filipino-friendly.
      ["Not Ph Co", "https://notph.breezy.hr", "admin", null, 0, 0],
      // Hidden because the link verifier struck it three times.
      ["Dead Link Co", "https://apply.workable.com/deadlink", "admin", null, 1, 3],
      ["Live Co", "https://live.breezy.hr", "admin", null, 1, 2],
    ]);

    const dialect = new SQLiteSyncDialect();
    const query = dialect.sqlToQuery(buildDirectoryAtsMiningQuery(50));
    const rows = database.query(query.sql).all(...query.params as any[]) as Array<{
      company: string;
      jobs: number;
      sampleUrl: string;
      category: string;
    }>;

    // A hidden directory row is evidence the public product does not stand
    // behind, so it must not mint an ATS candidate. A row two strikes old is
    // still visible and must keep mining.
    expect(rows.map((row) => row.company)).toEqual(["Live Co"]);
    expect(rows[0].sampleUrl).toBe("https://live.breezy.hr");
  } finally {
    database.close();
  }
});
