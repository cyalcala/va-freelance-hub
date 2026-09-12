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

test("buildAtsCandidateMiningQuery selects eligible opportunities with ATS application URLs", () => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE opportunities (
        company TEXT, application_url TEXT, category TEXT, ph_eligibility TEXT
      );
      INSERT INTO opportunities VALUES
        ('Greenhouse Co', 'https://boards.greenhouse.io/ghco/jobs/123', 'tech', 'eligible_verified'),
        ('Greenhouse Co', 'https://boards.greenhouse.io/ghco/jobs/124', 'tech', 'eligible_likely'),
        ('Other Co', 'https://example.com/careers', 'admin', 'eligible_verified'),
        ('Ineligible Co', 'https://jobs.lever.co/ineligible/123', 'tech', 'ineligible');
    `);

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

test("buildDirectoryAtsMiningQuery selects directory entries with ATS website URLs or hiring_page_url", () => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE va_directory (
        company_name TEXT, website TEXT, niche TEXT, hiring_page_url TEXT
      );
      INSERT INTO va_directory VALUES
        ('Breezy Agency', 'https://agency.breezy.hr', 'global-va', NULL),
        ('Workable Agency', 'https://workableagency.com', 'admin', 'https://apply.workable.com/workable-agency'),
        ('Standard Agency', 'https://standardagency.com', 'admin', 'https://standardagency.com/careers');
    `);

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
