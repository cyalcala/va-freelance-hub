import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OpportunityCard,
  type OpportunityCardData,
} from "../src/components/opportunity-card";
import { buildOpportunityFtsQueries } from "../src/lib/opportunity-fts-query";

test("FTS search preserves filters, ranking, card fields, and safe links", () => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE opportunities (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT,
        description TEXT,
        category TEXT,
        type TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_platform TEXT NOT NULL,
        posted_at TEXT,
        experience_level TEXT,
        geo_scope TEXT,
        ph_eligibility TEXT,
        geo_evidence TEXT,
        is_active INTEGER NOT NULL
      );
      CREATE VIRTUAL TABLE opportunities_fts USING fts5(
        title, company, description,
        content='opportunities', content_rowid='id'
      );
      INSERT INTO opportunities VALUES
        (1, 'Assistant', 'Alpha', 'remote assistant role', 'admin', 'VA',
         'https://jobs.example/alpha', 'Remotive', '2026-08-12T00:00:00Z',
         'junior', 'worldwide', 'eligible_verified', 'Worldwide applicants', 1),
        (2, 'Executive Assistant', 'Beta', 'assistant assistant assistant', 'admin', 'VA',
         'https://jobs.example/beta', 'Remotive', '2026-08-11T00:00:00Z',
         'senior', 'apac_incl_ph', 'unclear', 'APAC listing', 1),
        (3, 'Assistant', 'Filtered Category', 'assistant', 'engineering', 'VA',
         'https://jobs.example/category', 'Remotive', NULL, NULL, NULL, 'unclear', NULL, 1),
        (4, 'Assistant', 'Inactive', 'assistant', 'admin', 'VA',
         'https://jobs.example/inactive', 'Remotive', NULL, NULL, NULL, 'unclear', NULL, 0),
        (5, 'Assistant', 'Filtered Platform', 'assistant', 'admin', 'VA',
         'https://jobs.example/platform', 'RemoteOK', NULL, NULL, NULL, 'unclear', NULL, 1);
      INSERT INTO opportunities_fts(rowid, title, company, description)
        SELECT id, title, company, description FROM opportunities;
    `);

    const query = buildOpportunityFtsQueries({
      ftsMatch: '"assistant"',
      category: "admin",
      type: "VA",
      platform: "Remotive",
      limit: 30,
      offset: 0,
    });
    const count = database
      .query(query.countSql)
      .get(...query.filterParams) as { total: number };
    const rows = database
      .query(query.pageSql)
      .all(...query.pageParams) as OpportunityCardData[];

    expect(count.total).toBe(2);
    expect(rows.map((row) => row.id)).toEqual([2, 1]);
    expect(rows[0]).toEqual({
      id: 2,
      title: "Executive Assistant",
      company: "Beta",
      type: "VA",
      sourceUrl: "https://jobs.example/beta",
      sourcePlatform: "Remotive",
      postedAt: "2026-08-11T00:00:00Z",
      experienceLevel: "senior",
      geoScope: "apac_incl_ph",
      phEligibility: "unclear",
      geoEvidence: "APAC listing",
    });

    const html = rows
      .map((row) => renderToStaticMarkup(createElement(OpportunityCard, { opportunity: row })))
      .join("");
    expect(html).toContain('href="/jobs/1"');
    expect(html).toContain(
      'href="/api/click/2?url=https%3A%2F%2Fjobs.example%2Fbeta"',
    );
    expect(html).not.toContain("url=undefined");
    expect(html).toContain("Executive Assistant");
    expect(html).toContain("Beta");
    expect(html).toContain("Aug 11");
    expect(html).toContain(">VA<");
    expect(html).toContain("Worldwide applicants");
  } finally {
    database.close();
  }
});
