import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import {
  ECONOMICS_QUERIES,
  computeWindows,
  emitSql,
  emitMeta,
  extractByName,
  collectByName,
  reconcile,
  providerFamilyForSourceId,
  foldProviderFamilies,
  summarizeConcentration,
  renderReport,
  UNKNOWN_SOURCE,
} from "./source-economics";

// Fixed snapshot instant so the freshness windows are deterministic:
//   cut7 = 2026-08-22, cut14 = 2026-08-15, cut30 = 2026-07-30 (all 00:00:00Z)
const AS_OF = new Date("2026-08-29T00:00:00Z");
const WINDOWS = computeWindows(AS_OF);

const OPP_DDL = `
CREATE TABLE opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  source_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  scraped_at TEXT NOT NULL
);
`;

interface OppRow {
  title: string;
  source_platform: string;
  source_id: string | null;
  is_active: 0 | 1;
  scraped_at: string;
}

// Every count below is independently verifiable from these rows.
const OPP_ROWS: OppRow[] = [
  // we-work-remotely: 3 active (net7=1, net14=2, net30=2), 1 inactive
  { title: "W1", source_platform: "WeWorkRemotely", source_id: "we-work-remotely", is_active: 1, scraped_at: "2026-08-28" },
  { title: "W2", source_platform: "WeWorkRemotely", source_id: "we-work-remotely", is_active: 1, scraped_at: "2026-08-20" },
  { title: "W3", source_platform: "WeWorkRemotely", source_id: "we-work-remotely", is_active: 1, scraped_at: "2026-07-01" },
  { title: "W4", source_platform: "WeWorkRemotely", source_id: "we-work-remotely", is_active: 0, scraped_at: "2026-05-01" },
  // real-work-from-anywhere: 1 active (all windows)
  { title: "R1", source_platform: "RealWorkFromAnywhere", source_id: "real-work-from-anywhere", is_active: 1, scraped_at: "2026-08-27" },
  // remote-ok: 1 active (net30 only)
  { title: "O1", source_platform: "RemoteOK", source_id: "remote-ok", is_active: 1, scraped_at: "2026-08-10" },
  // two Jobicy feeds — one provider family, distinct source_ids
  { title: "J1", source_platform: "Jobicy", source_id: "jobicy-admin-support-apac", is_active: 1, scraped_at: "2026-08-25" },
  { title: "J2", source_platform: "Jobicy", source_id: "jobicy-supporting-apac", is_active: 1, scraped_at: "2026-08-26" },
  // two Workable tenants — one provider family, distinct platform:token ids
  { title: "K1", source_platform: "Workable", source_id: "workable:acme", is_active: 1, scraped_at: "2026-08-24" },
  { title: "K2", source_platform: "Workable", source_id: "workable:globex", is_active: 1, scraped_at: "2026-08-23" },
  // legacy null source_id: 1 active (net30 only) + 1 inactive
  { title: "L1", source_platform: "OldFeed", source_id: null, is_active: 1, scraped_at: "2026-08-05" },
  { title: "L2", source_platform: "OldFeed", source_id: null, is_active: 0, scraped_at: "2026-06-01" },
];

const EVT_DDL = `
CREATE TABLE source_fetch_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  ok INTEGER NOT NULL,
  skipped INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL
);
`;

interface EvtRow { source_id: string; ok: 0 | 1; skipped: 0 | 1; count: number; timestamp: string; }

const EVT_ROWS: EvtRow[] = [
  { source_id: "we-work-remotely", ok: 1, skipped: 0, count: 20, timestamp: "2026-08-28" }, // real, items 20
  { source_id: "we-work-remotely", ok: 1, skipped: 0, count: 0, timestamp: "2026-08-27" }, // real, zero-yield
  { source_id: "we-work-remotely", ok: 0, skipped: 1, count: 0, timestamp: "2026-08-26" }, // skip
  { source_id: "remotive", ok: 0, skipped: 0, count: 0, timestamp: "2026-08-25" }, // failure
  { source_id: "__scrape_run_lock__", ok: 1, skipped: 0, count: 0, timestamp: "2026-08-28" }, // reserved: excluded
  { source_id: "real-work-from-anywhere", ok: 1, skipped: 0, count: 5, timestamp: "2026-08-10" }, // out of 7d window: excluded
];

function buildDb(): Database {
  const db = new Database(":memory:");
  db.exec(OPP_DDL);
  db.exec(EVT_DDL);
  const insOpp = db.prepare(
    `INSERT INTO opportunities (title, source_platform, source_id, is_active, scraped_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  for (const r of OPP_ROWS) insOpp.run(r.title, r.source_platform, r.source_id, r.is_active, r.scraped_at);
  const insEvt = db.prepare(
    `INSERT INTO source_fetch_events (source_id, ok, skipped, count, timestamp) VALUES (?, ?, ?, ?, ?)`,
  );
  for (const r of EVT_ROWS) insEvt.run(r.source_id, r.ok, r.skipped, r.count, r.timestamp);
  return db;
}

function runQueries(db: Database): Record<string, Record<string, unknown>[]> {
  const byName: Record<string, Record<string, unknown>[]> = {};
  for (const q of ECONOMICS_QUERIES) byName[q.name] = db.query(q.sql(WINDOWS)).all() as Record<string, unknown>[];
  return byName;
}

describe("SP-02 source economics", () => {
  let db: Database;
  let byName: Record<string, Record<string, unknown>[]>;

  beforeAll(() => {
    db = buildDb();
    byName = runQueries(db);
  });

  test("identity_coverage partitions total by activity and by source_id presence", () => {
    expect(byName["identity_coverage"][0]).toMatchObject({
      total: 12, active: 10, inactive: 2,
      with_source_id: 10, null_source_id: 2,
      active_with_source_id: 9, active_null_source_id: 1,
    });
  });

  test("supply_totals net-new windows over active rows", () => {
    expect(byName["supply_totals"][0]).toMatchObject({
      active: 10, net_new_7d: 6, net_new_14d: 7, net_new_30d: 9,
    });
  });

  test("source_supply groups by exact source_id, keeping shared platforms distinct", () => {
    const bySrc = Object.fromEntries(byName["source_supply"].map((r) => [r["source_id"], r]));
    expect(bySrc["we-work-remotely"]).toMatchObject({ active: 3, net_new_7d: 1, net_new_14d: 2, net_new_30d: 2, inactive: 1 });
    expect(bySrc["jobicy-admin-support-apac"]).toMatchObject({ active: 1, net_new_30d: 1, source_platform: "Jobicy" });
    expect(bySrc["jobicy-supporting-apac"]).toMatchObject({ active: 1, net_new_30d: 1, source_platform: "Jobicy" });
    expect(bySrc["workable:acme"]).toMatchObject({ active: 1, source_platform: "Workable" });
    expect(bySrc["workable:globex"]).toMatchObject({ active: 1, source_platform: "Workable" });
    expect(bySrc["(unknown)"]).toMatchObject({ active: 1, net_new_30d: 1, inactive: 1 });
  });

  test("fetch_outcomes_7d separates real/skip/failure/zero-yield and honors window + reserved filters", () => {
    const byId = Object.fromEntries(byName["fetch_outcomes_7d"].map((r) => [r["source_id"], r]));
    expect(byId["we-work-remotely"]).toMatchObject({ real_fetches: 2, skips: 1, failures: 0, zero_yield: 1, items: 20 });
    expect(byId["remotive"]).toMatchObject({ real_fetches: 0, skips: 0, failures: 1, zero_yield: 0, items: 0 });
    // Reserved diagnostic id and the out-of-window RWFA event are excluded.
    expect(byId["__scrape_run_lock__"]).toBeUndefined();
    expect(byId["real-work-from-anywhere"]).toBeUndefined();
  });

  test("reconcile: every partition delta is zero and the unknown-id gap is flagged", () => {
    const result = reconcile(byName);
    for (const [k, v] of Object.entries(result.deltas)) expect(`${k}=${v}`).toBe(`${k}=0`);
    expect(result.ok).toBe(true);
    expect(result.notes.join(" ")).toContain("no source_id");
  });

  test("providerFamilyForSourceId folds ATS tokens and the two Jobicy feeds", () => {
    expect(providerFamilyForSourceId("workable:acme")).toBe("workable");
    expect(providerFamilyForSourceId("workable:globex")).toBe("workable");
    expect(providerFamilyForSourceId("jobicy-admin-support-apac")).toBe("jobicy");
    expect(providerFamilyForSourceId("jobicy-supporting-apac")).toBe("jobicy");
    expect(providerFamilyForSourceId("we-work-remotely")).toBe("we-work-remotely");
    expect(providerFamilyForSourceId(UNKNOWN_SOURCE)).toBe(UNKNOWN_SOURCE);
  });

  test("foldProviderFamilies collapses correlated risk families", () => {
    const families = foldProviderFamilies(byName["source_supply"]);
    const byFam = Object.fromEntries(families.map((f) => [f.family, f]));
    expect(byFam["jobicy"]).toMatchObject({ active: 2, net_new_30d: 2 });
    expect(byFam["jobicy"].sourceIds.sort()).toEqual(["jobicy-admin-support-apac", "jobicy-supporting-apac"]);
    expect(byFam["workable"]).toMatchObject({ active: 2, net_new_30d: 2 });
    expect(byFam["workable"].sourceIds.sort()).toEqual(["workable:acme", "workable:globex"]);
    expect(byFam["we-work-remotely"]).toMatchObject({ active: 3 });
    // Sorted by active desc: we-work-remotely leads.
    expect(families[0].family).toBe("we-work-remotely");
  });

  test("summarizeConcentration excludes unknown and raises the top-3 flag", () => {
    const families = foldProviderFamilies(byName["source_supply"]);
    const c = summarizeConcentration(families, "net_new_30d");
    // Attributed net-new-30d = 8 (the (unknown) row is excluded).
    expect(c.total).toBe(8);
    expect(c.topShare).toBeCloseTo(0.25, 5); // largest family holds 2/8
    expect(c.top3Share).toBeCloseTo(0.75, 5); // three families of 2 = 6/8
    expect(c.topWarn).toBe(false);
    expect(c.top3Warn).toBe(true);
  });

  test("renderReport produces a reconciled markdown baseline", () => {
    const md = renderReport(byName, emitMeta(WINDOWS));
    expect(md).toContain("# Source economics — latest (SP-02)");
    expect(md).toContain("Reconciliation:** OK");
    expect(md).toContain("we-work-remotely");
    expect(md).toContain("jobicy");
    expect(md).toContain("workable:acme");
    expect(md).toContain("⚠️ >70%"); // top-3 net-new concentration flag fires on this fixture
    // 90% of active rows are attributed here, so concentration is NOT provisional.
    expect(md).not.toContain("Provisional");
  });

  test("renderReport flags concentration as provisional when source_id coverage is low", () => {
    // Mirrors the real post-SP-01 state: almost every active row is still legacy
    // NULL, so the attributed base is tiny and concentration must not be trusted.
    const lowCoverage: Record<string, Record<string, unknown>[]> = {
      identity_coverage: [{
        total: 5090, active: 1278, inactive: 3812,
        with_source_id: 15, null_source_id: 5075,
        active_with_source_id: 11, active_null_source_id: 1267,
      }],
      supply_totals: [{ active: 1278, net_new_7d: 150, net_new_14d: 430, net_new_30d: 579 }],
      source_supply: [
        { source_id: "real-work-from-anywhere", source_platform: "RealWorkFromAnywhere", active: 7, net_new_7d: 7, net_new_14d: 7, net_new_30d: 7, inactive: 0 },
        { source_id: "(unknown)", source_platform: "OldFeed", active: 1267, net_new_7d: 139, net_new_14d: 400, net_new_30d: 568, inactive: 3808 },
      ],
      fetch_outcomes_7d: [],
    };
    const md = renderReport(lowCoverage, emitMeta(WINDOWS));
    expect(md).toContain("Provisional");
    expect(md).toContain("of active rows carry an exact source_id");
  });

  test("extractByName maps a wrangler-style array by query order", () => {
    const meta = emitMeta(WINDOWS);
    const wranglerJson = meta.queryOrder.map((name) => ({ results: byName[name], success: true, meta: { rows_written: 0 } }));
    expect(reconcile(extractByName(wranglerJson, meta)).ok).toBe(true);
    expect(reconcile(extractByName({ result: wranglerJson }, meta)).ok).toBe(true);
  });

  test("collectByName reassembles per-query --command outputs by name", () => {
    const meta = emitMeta(WINDOWS);
    const perQuery: Record<string, unknown> = {};
    for (const name of meta.queryOrder) perQuery[name] = [{ results: byName[name], success: true, meta: { rows_written: 0 } }];
    const collected = collectByName(perQuery, meta);
    expect(collected["identity_coverage"][0]).toMatchObject({ total: 12 });
    expect(reconcile(collected).ok).toBe(true);
    expect(collectByName({ ...perQuery, source_supply: [] }, meta)["source_supply"]).toEqual([]);
  });

  test("emitted SQL is strictly read-only with inlined integer cutoffs", () => {
    const sql = emitSql(WINDOWS);
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|PRAGMA|ATTACH)\b/i);
    expect(sql).toContain(String(WINDOWS.cut7));
    expect(sql).toContain(String(WINDOWS.cut30));
    expect(sql).not.toContain("'now'");
  });
});
