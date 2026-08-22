import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import {
  COHORT_QUERIES,
  computeCutoffs,
  emitSql,
  emitPlans,
  emitMeta,
  extractByName,
  reconcile,
} from "./data-quality-cohorts";

// Fixed snapshot instant so cutoffs are deterministic:
//   cut30 = 2026-07-23T00:00:00Z, cut14 = 2026-08-08T00:00:00Z
const AS_OF = new Date("2026-08-22T00:00:00Z");
const CUTOFFS = computeCutoffs(AS_OF);

// Minimal opportunities fixture holding exactly the columns the cohort queries
// read. Hand-built so every expected count below is independently verifiable.
const FIXTURE_DDL = `
CREATE TABLE opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT,
  source_platform TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  posted_at TEXT,
  scraped_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  inactive_reason TEXT,
  last_seen_in_feed_at TEXT,
  last_verified_at TEXT,
  ph_eligibility TEXT
);
`;

interface Row {
  title: string;
  company: string | null;
  source_platform: string;
  category: string;
  posted_at: string | null;
  scraped_at: string;
  is_active: 0 | 1;
  inactive_reason: string | null;
  last_seen_in_feed_at: string | null;
  last_verified_at: string | null;
  ph_eligibility: string | null;
}

const D = " 00:00:00";
const FIXTURE_ROWS: Row[] = [
  // ── Duplicate group A: lower(title)="va assistant", lower(company)="acme" (3) ──
  {
    title: "VA Assistant", company: "Acme", source_platform: "RemoteOK",
    category: "admin", posted_at: "2026-06-01" + D, scraped_at: "2026-06-01" + D,
    is_active: 1, inactive_reason: null, last_seen_in_feed_at: "2026-07-01" + D,
    last_verified_at: "2026-08-01" + D, ph_eligibility: "eligible_verified",
  }, // R1: stale, unseen
  {
    title: "VA Assistant", company: "Acme", source_platform: "RemoteOK",
    category: "admin", posted_at: "2026-08-20" + D, scraped_at: "2026-08-20" + D,
    is_active: 1, inactive_reason: null, last_seen_in_feed_at: "2026-08-21" + D,
    last_verified_at: null, ph_eligibility: "eligible_verified",
  }, // R2: never_verified
  {
    title: "va assistant", company: "acme", source_platform: "WeWorkRemotely",
    category: "admin", posted_at: "2026-08-19" + D, scraped_at: "2026-08-19" + D,
    is_active: 1, inactive_reason: null, last_seen_in_feed_at: null,
    last_verified_at: "2026-08-10" + D, ph_eligibility: "unclear",
  }, // R3: never_seen_in_feed
  // ── Duplicate group B: lower(title)="bookkeeper", lower(company)="" (2) ──
  {
    title: "Bookkeeper", company: null, source_platform: "Remotive",
    category: "finance", posted_at: "2026-05-15" + D, scraped_at: "2026-05-15" + D,
    is_active: 1, inactive_reason: null, last_seen_in_feed_at: "2026-08-21" + D,
    last_verified_at: null, ph_eligibility: "ineligible",
  }, // R4: stale, missing_company(null), never_verified
  {
    title: "Bookkeeper", company: "", source_platform: "Remotive",
    category: "finance", posted_at: "2026-08-01" + D, scraped_at: "2026-08-01" + D,
    is_active: 1, inactive_reason: null, last_seen_in_feed_at: "2026-07-05" + D,
    last_verified_at: null, ph_eligibility: null,
  }, // R5: unseen, missing_company(''), never_verified
  // ── Unique active rows ──
  {
    title: "Designer", company: "Globex", source_platform: "WeWorkRemotely",
    category: "design", posted_at: "garbage-date", scraped_at: "garbage-date",
    is_active: 1, inactive_reason: null, last_seen_in_feed_at: "2026-08-21" + D,
    last_verified_at: "2026-08-20" + D, ph_eligibility: "eligible_likely",
  }, // R6: undated
  {
    title: "Developer", company: "Initech", source_platform: "RemoteOK",
    category: "engineering", posted_at: "2026-07-10" + D, scraped_at: "2026-07-10" + D,
    is_active: 1, inactive_reason: null, last_seen_in_feed_at: null,
    last_verified_at: null, ph_eligibility: "unclear",
  }, // R7: stale, never_seen, never_verified
  // ── Inactive rows ──
  {
    title: "Old Role A", company: "Acme", source_platform: "RemoteOK",
    category: "admin", posted_at: "2026-04-01" + D, scraped_at: "2026-04-01" + D,
    is_active: 0, inactive_reason: "stale-feed", last_seen_in_feed_at: "2026-05-01" + D,
    last_verified_at: "2026-05-01" + D, ph_eligibility: "eligible_verified",
  }, // R8
  {
    title: "Old Role B", company: "Globex", source_platform: "Remotive",
    category: "finance", posted_at: "2026-04-02" + D, scraped_at: "2026-04-02" + D,
    is_active: 0, inactive_reason: "link-unavailable", last_seen_in_feed_at: "2026-05-02" + D,
    last_verified_at: null, ph_eligibility: "unclear",
  }, // R9
  {
    title: "Old Role C", company: "Initech", source_platform: "RemoteOK",
    category: "engineering", posted_at: "2026-04-03" + D, scraped_at: "2026-04-03" + D,
    is_active: 0, inactive_reason: "stale-feed", last_seen_in_feed_at: "2026-05-03" + D,
    last_verified_at: "2026-05-03" + D, ph_eligibility: "ineligible",
  }, // R10
  {
    title: "Old Role D", company: "Umbrella", source_platform: "WeWorkRemotely",
    category: "other", posted_at: "2026-04-04" + D, scraped_at: "2026-04-04" + D,
    is_active: 0, inactive_reason: null, last_seen_in_feed_at: "2026-05-04" + D,
    last_verified_at: "2026-05-04" + D, ph_eligibility: null,
  }, // R11
];

function buildDb(): Database {
  const db = new Database(":memory:");
  db.exec(FIXTURE_DDL);
  const insert = db.prepare(
    `INSERT INTO opportunities
      (title, company, source_platform, category, posted_at, scraped_at,
       is_active, inactive_reason, last_seen_in_feed_at, last_verified_at, ph_eligibility)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of FIXTURE_ROWS) {
    insert.run(
      r.title, r.company, r.source_platform, r.category, r.posted_at, r.scraped_at,
      r.is_active, r.inactive_reason, r.last_seen_in_feed_at, r.last_verified_at,
      r.ph_eligibility,
    );
  }
  return db;
}

/** Run each cohort query against the fixture and map name -> rows. */
function runCohorts(db: Database): Record<string, Record<string, unknown>[]> {
  const byName: Record<string, Record<string, unknown>[]> = {};
  for (const q of COHORT_QUERIES) {
    byName[q.name] = db.query(q.sql(CUTOFFS)).all() as Record<string, unknown>[];
  }
  return byName;
}

describe("DATA-03 data-quality cohorts", () => {
  let db: Database;
  let byName: Record<string, Record<string, unknown>[]>;

  beforeAll(() => {
    db = buildDb();
    byName = runCohorts(db);
  });

  test("bun:sqlite supports unixepoch and returns null for unparseable dates", () => {
    const ok = db.query("SELECT unixepoch('2026-06-01 00:00:00') AS e").get() as { e: number };
    expect(typeof ok.e).toBe("number");
    const bad = db.query("SELECT unixepoch('garbage-date') AS e").get() as { e: number | null };
    expect(bad.e).toBeNull();
  });

  test("core_totals: activity partition", () => {
    const core = byName["core_totals"][0];
    expect(core).toMatchObject({ total: 11, active: 7, inactive: 4 });
  });

  test("active_cohorts: stale/unseen/verified/company/undated", () => {
    const c = byName["active_cohorts"][0];
    expect(c).toMatchObject({
      active: 7,
      stale_30d: 3, // R1, R4, R7
      unseen_14d: 2, // R1, R5
      never_seen_in_feed: 2, // R3, R7
      never_verified: 4, // R2, R4, R5, R7
      missing_company: 2, // R4 (null), R5 ('')
      undated: 1, // R6
    });
  });

  test("eligibility_dist reconciles to active and covers null bucket", () => {
    const rows = byName["eligibility_dist"];
    const map = Object.fromEntries(rows.map((r) => [r["ph_eligibility"], r["n"]]));
    expect(map).toMatchObject({
      eligible_verified: 2,
      unclear: 2,
      ineligible: 1,
      eligible_likely: 1,
      "(null)": 1,
    });
    expect(rows.reduce((a, r) => a + Number(r["n"]), 0)).toBe(7);
  });

  test("category_dist reconciles to active", () => {
    const rows = byName["category_dist"];
    const map = Object.fromEntries(rows.map((r) => [r["category"], r["n"]]));
    expect(map).toMatchObject({ admin: 3, finance: 2, design: 1, engineering: 1 });
    expect(rows.reduce((a, r) => a + Number(r["n"]), 0)).toBe(7);
  });

  test("inactive_reason_dist reconciles to inactive and covers null bucket", () => {
    const rows = byName["inactive_reason_dist"];
    const map = Object.fromEntries(rows.map((r) => [r["inactive_reason"], r["n"]]));
    expect(map).toMatchObject({ "stale-feed": 2, "link-unavailable": 1, "(null)": 1 });
    expect(rows.reduce((a, r) => a + Number(r["n"]), 0)).toBe(4);
  });

  test("source_cohorts stratify correctly per source_platform", () => {
    const rows = byName["source_cohorts"];
    const bysrc = Object.fromEntries(rows.map((r) => [r["source_platform"], r]));
    expect(bysrc["RemoteOK"]).toMatchObject({
      active: 3, stale_30d: 2, unseen_14d: 1, never_verified: 2,
      missing_company: 0, ph_unclear: 1, ph_ineligible: 0,
    });
    expect(bysrc["WeWorkRemotely"]).toMatchObject({
      active: 2, stale_30d: 0, unseen_14d: 0, never_verified: 0,
      missing_company: 0, ph_unclear: 1, ph_ineligible: 0,
    });
    expect(bysrc["Remotive"]).toMatchObject({
      active: 2, stale_30d: 1, unseen_14d: 1, never_verified: 2,
      missing_company: 2, ph_unclear: 0, ph_ineligible: 1,
    });
  });

  test("dup_summary counts groups, rows, and excess", () => {
    const d = byName["dup_summary"][0];
    expect(d).toMatchObject({ dup_groups: 2, rows_in_dup_groups: 5, excess_rows: 3 });
  });

  test("dup_top returns capped, redacted samples of the largest clusters", () => {
    const rows = byName["dup_top"];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ sample_title: "VA Assistant", sample_company: "Acme", n: 3 });
    expect(rows[1]).toMatchObject({ sample_title: "Bookkeeper", sample_company: "", n: 2 });
  });

  test("reconcile: every partition delta is zero and undated is flagged", () => {
    const result = reconcile(byName);
    for (const [k, v] of Object.entries(result.deltas)) {
      expect(`${k}=${v}`).toBe(`${k}=0`);
    }
    expect(result.ok).toBe(true);
    expect(result.notes.join(" ")).toContain("unparseable effective date");
  });

  test("extractByName maps a wrangler-style result array by query order", () => {
    const meta = emitMeta(CUTOFFS);
    const wranglerJson = meta.queryOrder.map((name) => ({
      results: byName[name],
      success: true,
      meta: { rows_read: 1, rows_written: 0 },
    }));
    const round = extractByName(wranglerJson, meta);
    expect(reconcile(round).ok).toBe(true);
    // Also accepts the {result: [...]} wrapper shape.
    expect(reconcile(extractByName({ result: wranglerJson }, meta)).ok).toBe(true);
  });

  test("emitted SQL and plans are strictly read-only", () => {
    const combined = emitSql(CUTOFFS) + "\n" + emitPlans(CUTOFFS);
    expect(combined).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|PRAGMA|ATTACH)\b/i);
    // Cutoffs are inlined as integer literals, not left as 'now'.
    expect(emitSql(CUTOFFS)).toContain(String(CUTOFFS.cut30));
    expect(emitSql(CUTOFFS)).toContain(String(CUTOFFS.cut14));
    expect(emitSql(CUTOFFS)).not.toContain("'now'");
  });

  test("emitPlans only probes the queries marked plan:true", () => {
    const plans = emitPlans(CUTOFFS);
    expect(plans).toContain("plan:active_cohorts");
    expect(plans).toContain("plan:source_cohorts");
    expect(plans).not.toContain("plan:eligibility_dist");
    // Two probe statements, each "EXPLAIN QUERY PLAN" on its own line (the header
    // comment mentions the phrase too, so anchor on full lines only).
    expect((plans.match(/^EXPLAIN QUERY PLAN$/gm) ?? []).length).toBe(2);
  });
});
