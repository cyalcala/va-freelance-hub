import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import {
  buildProspectCandidateQuery,
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
        company TEXT, source_url TEXT, category TEXT, is_active INTEGER,
        ph_eligibility TEXT, scraped_at TEXT, posted_at TEXT
      );
      CREATE TABLE va_directory (company_name TEXT);
      INSERT INTO opportunities VALUES
        ('Positive Co', 'https://example.com/verified', 'admin', 1, 'eligible_verified', '2026-08-12T00:00:00Z', NULL),
        ('Positive Co', 'https://example.com/likely', 'admin', 1, 'eligible_likely', '2026-08-11T00:00:00Z', NULL),
        ('Positive Co', 'https://example.com/newer-unclear', 'admin', 1, 'unclear', '2026-08-13T00:00:00Z', NULL),
        ('Mixed Co', 'https://example.com/mixed-positive', 'support', 1, 'eligible_verified', '2026-08-12T00:00:00Z', NULL),
        ('Mixed Co', 'https://example.com/mixed-unclear', 'support', 1, 'unclear', '2026-08-13T00:00:00Z', NULL),
        ('Unclear Co', 'https://example.com/unclear-1', 'admin', 1, 'unclear', '2026-08-12T00:00:00Z', NULL),
        ('Unclear Co', 'https://example.com/unclear-2', 'admin', 1, 'unclear', '2026-08-11T00:00:00Z', NULL),
        ('Ineligible Co', 'https://example.com/no-1', 'admin', 1, 'ineligible', '2026-08-12T00:00:00Z', NULL),
        ('Ineligible Co', 'https://example.com/no-2', 'admin', 1, 'ineligible', '2026-08-11T00:00:00Z', NULL);
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
      sampleUrl: "https://example.com/verified",
      category: "admin",
    }]);
    expect(rows.some((row) => row.company === "Mixed Co")).toBe(false);
    expect(rows.some((row) => row.company === "Unclear Co")).toBe(false);
    expect(rows.some((row) => row.company === "Ineligible Co")).toBe(false);
  } finally {
    database.close();
  }
});
