import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { publicOpportunityFilters } from "../src/lib/public-opportunities";
import { homepagePreviewQuery } from "../src/lib/homepage-data";
import { buildOpportunityFtsQueries } from "../src/lib/opportunity-fts-query";
import { JOB_CATEGORY_MAP } from "../src/lib/categories";

function database() {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE opportunities (
    id INTEGER PRIMARY KEY, category TEXT, is_active INTEGER, ph_eligibility TEXT,
    title TEXT, company TEXT, type TEXT, source_url TEXT, source_platform TEXT,
    posted_at TEXT, scraped_at TEXT, experience_level TEXT, geo_scope TEXT,
    geo_evidence TEXT, tags TEXT
  );
  CREATE INDEX category_active_effective_posted_idx ON opportunities
    (category, is_active, coalesce(posted_at, scraped_at) DESC);`);
  return db;
}

test("public cards/counts and full-text search share detail-page eligibility", () => {
  const db = database();
  try {
    db.exec(`INSERT INTO opportunities (id,title,is_active,ph_eligibility) VALUES
      (1,'Assistant',1,'eligible_verified'),(2,'Assistant',1,'eligible_likely'),
      (3,'Assistant',1,'unclear'),(4,'Assistant',1,'ineligible'),
      (5,'Assistant',1,NULL),(6,'Assistant',0,'eligible_verified');
      CREATE VIRTUAL TABLE opportunities_fts USING fts5(title);
      INSERT INTO opportunities_fts(rowid,title) SELECT id,title FROM opportunities;`);
    const where = new SQLiteSyncDialect().sqlToQuery(publicOpportunityFilters());
    const rows = db.query(`SELECT id FROM opportunities WHERE ${where.sql} ORDER BY id`)
      .all(...where.params as any[]) as { id: number }[];
    expect(rows.map((row) => row.id)).toEqual([1, 2]);

    const fts = buildOpportunityFtsQueries({ ftsMatch: '"Assistant"', limit: 30, offset: 0 });
    expect(db.query(fts.countSql).get(...fts.filterParams)).toEqual({ total: 2 });
    const matches = db.query(fts.pageSql).all(...fts.pageParams) as { id: number }[];
    expect(matches.map((row) => row.id).sort()).toEqual([1, 2]);
  } finally { db.close(); }
});

test("homepage previews stay under D1's 100-bind ceiling when stored categories exceed 100 preview IDs", () => {
  const db = database();
  try {
    const categories = [...Object.keys(JOB_CATEGORY_MAP), ...Array.from({ length: 16 }, (_, i) => `legacy-${i}`)];
    const insert = db.prepare(`INSERT INTO opportunities
      (category,is_active,ph_eligibility,posted_at,scraped_at) VALUES (?,1,?,?,?)`);
    for (const category of categories) {
      for (let day = 1; day <= 8; day++) {
        insert.run(category, 'eligible_verified', `2026-09-${String(day).padStart(2, '0')}`, '2026-09-01');
      }
      // Newer unclear jobs must not displace eligible preview cards.
      insert.run(category, 'unclear', '2026-09-27', '2026-09-27');
    }
    const previous = db.query(`SELECT id FROM (SELECT id,ROW_NUMBER() OVER (
      PARTITION BY category ORDER BY coalesce(posted_at,scraped_at) DESC
    ) rn FROM opportunities WHERE is_active=1) WHERE rn<=6`).all();
    expect(previous.length).toBeGreaterThan(100);

    const query = new SQLiteSyncDialect().sqlToQuery(homepagePreviewQuery());
    expect(query.params.length).toBeLessThanOrEqual(100);
    const ids = db.query(query.sql).all(...query.params as any[]) as { id: number }[];
    expect(ids).toHaveLength(Object.keys(JOB_CATEGORY_MAP).length * 6);
    // Follow-up card fetch binds IDs plus activity + the two eligibility values.
    expect(ids.length + 3).toBeLessThanOrEqual(100);
    const cards = db.query(`SELECT category,posted_at,ph_eligibility FROM opportunities
      WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids.map((row) => row.id)) as {
        category: string; posted_at: string; ph_eligibility: string;
      }[];
    expect(cards.every((row) => row.ph_eligibility === 'eligible_verified')).toBe(true);
    for (const category of Object.keys(JOB_CATEGORY_MAP)) {
      expect(cards.filter((row) => row.category === category).map((row) => row.posted_at).sort())
        .toEqual(['2026-09-03','2026-09-04','2026-09-05','2026-09-06','2026-09-07','2026-09-08']);
    }
    const plan = db.query(`EXPLAIN QUERY PLAN ${query.sql}`).all(...query.params as any[]) as { detail: string }[];
    expect(plan.filter((row) => row.detail.includes('USING INDEX category_active_effective_posted_idx')))
      .toHaveLength(Object.keys(JOB_CATEGORY_MAP).length);
    expect(plan.some((row) => row.detail.includes('USE TEMP B-TREE'))).toBe(false);
  } finally { db.close(); }
});
