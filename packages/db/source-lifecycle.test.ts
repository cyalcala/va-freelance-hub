import { expect, test, describe } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(readFileSync(join(import.meta.dir, "./migrations/0036_registry_foundation.sql"), "utf-8"));
  db.exec(readFileSync(join(import.meta.dir, "./migrations/0037_source_lifecycle_opt_out.sql"), "utf-8"));
  return db;
}

function insertProvider(db: Database, id = "p1") {
  db.exec(
    `INSERT INTO provider_profiles (id, display_name, provider_family, mechanism, auth_class, evidence_lease_days, default_compliance_state, default_operational_state) VALUES ('${id}', '${id}', '${id}-family', 'rss_feed', 'none', 180, 'allowed', 'active')`,
  );
}

describe("source_opt_outs — durable do-not-reingest memory", () => {
  test("valid insert", () => {
    const db = freshDb();
    insertProvider(db);
    db.exec(`INSERT INTO source_opt_outs (source_id, provider_id, reason) VALUES ('workable:acme', 'p1', 'provider requested removal')`);
    const row = db.query(`SELECT source_id, reason FROM source_opt_outs WHERE source_id='workable:acme'`).get() as any;
    expect(row.source_id).toBe("workable:acme");
    db.close();
  });

  test("duplicate source_id is rejected", () => {
    const db = freshDb();
    db.exec(`INSERT INTO source_opt_outs (source_id, reason) VALUES ('evil:feed', 'spam')`);
    expect(() => db.exec(`INSERT INTO source_opt_outs (source_id, reason) VALUES ('evil:feed', 'spam2')`)).toThrow();
    db.close();
  });

  test("source_id is durable — not auto-removed when source_registry row missing", () => {
    const db = freshDb();
    // opt-out exists without a source_registry row — must persist
    db.exec(`INSERT INTO source_opt_outs (source_id, reason) VALUES ('orphan:token', 'opt-out before registry row')`);
    const count = (db.query(`SELECT COUNT(*) as c FROM source_opt_outs`).get() as any).c;
    expect(count).toBe(1);
    // Ensure no FK prevents orphan opt-out
    expect(() => db.exec(`INSERT INTO source_opt_outs (source_id, reason) VALUES ('orphan2', 'x')`)).not.toThrow();
    db.close();
  });

  test("opt-out survives source_registry delete (history retained, no cascade delete)", () => {
    const db = freshDb();
    insertProvider(db, "jobicy");
    db.exec(`INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state) VALUES ('jobicy:test', 'jobicy', 'Jobicy Test', 'https://example.com', 'allowed', 'active')`);
    db.exec(`INSERT INTO source_opt_outs (source_id, reason) VALUES ('jobicy:test', 'requested pause')`);
    db.exec(`DELETE FROM source_registry WHERE source_id='jobicy:test'`);
    const opt = db.query(`SELECT source_id FROM source_opt_outs WHERE source_id='jobicy:test'`).get() as any;
    expect(opt.source_id).toBe("jobicy:test");
    db.close();
  });

  test("provider index exists", () => {
    const db = freshDb();
    const idx = db.query(`SELECT name FROM sqlite_master WHERE type='index' AND name='source_opt_outs_provider_idx'`).get() as any;
    expect(idx.name).toBe("source_opt_outs_provider_idx");
    db.close();
  });
});

describe("source_decisions — reviewer decision history (append-only)", () => {
  test("valid insert with CHECK states", () => {
    const db = freshDb();
    db.exec(
      `INSERT INTO source_decisions (source_id, to_compliance, to_operational, actor, reason) VALUES ('s1', 'allowed', 'shadow', 'reviewer@example.com', 'evidence packet complete')`,
    );
    const row = db.query(`SELECT to_compliance, to_operational FROM source_decisions WHERE source_id='s1'`).get() as any;
    expect(row.to_compliance).toBe("allowed");
    expect(row.to_operational).toBe("shadow");
    db.close();
  });

  test("invalid to_compliance is rejected", () => {
    const db = freshDb();
    expect(() =>
      db.exec(`INSERT INTO source_decisions (source_id, to_compliance, to_operational, actor, reason) VALUES ('s1', 'bogus', 'shadow', 'a', 'r')`),
    ).toThrow();
    db.close();
  });

  test("invalid to_operational is rejected", () => {
    const db = freshDb();
    expect(() =>
      db.exec(`INSERT INTO source_decisions (source_id, to_compliance, to_operational, actor, reason) VALUES ('s1', 'allowed', 'bogus', 'a', 'r')`),
    ).toThrow();
    db.close();
  });

  test("history is retained after source retires (no delete)", () => {
    const db = freshDb();
    insertProvider(db, "remotive");
    db.exec(`INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state) VALUES ('remotive', 'remotive', 'Remotive', 'https://remotive.com', 'allowed', 'active')`);
    db.exec(`INSERT INTO source_decisions (source_id, from_compliance, to_compliance, from_operational, to_operational, actor, reason) VALUES ('remotive', 'allowed', 'blocked', 'active', 'paused', 'owner', 'policy expired')`);
    // Simulate retirement: update registry to paused/retired, but decision stays
    db.exec(`UPDATE source_registry SET operational_state='paused', compliance_state='blocked' WHERE source_id='remotive'`);
    const dec = db.query(`SELECT COUNT(*) as c FROM source_decisions WHERE source_id='remotive'`).get() as any;
    expect(dec.c).toBe(1);
    // Delete registry row — decisions remain (no cascade delete)
    db.exec(`DELETE FROM source_registry WHERE source_id='remotive'`);
    const dec2 = db.query(`SELECT COUNT(*) as c FROM source_decisions WHERE source_id='remotive'`).get() as any;
    expect(dec2.c).toBe(1);
    db.close();
  });

  test("expired evidence makes source dormant without deleting history or opportunities (simulated via registry expiry)", () => {
    const db = freshDb();
    insertProvider(db, "we-work-remotely");
    const past = "2026-08-01T00:00:00.000Z";
    db.exec(
      `INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state, policy_expiry) VALUES ('we-work-remotely', 'we-work-remotely', 'WWR', 'https://weworkremotely.com', 'allowed', 'active', '${past}')`,
    );
    // Opportunities would remain — we prove registry row is not deleted by expiry logic
    // Instead expiry moves it to review_due/paused; DB still has row.
    const before = db.query(`SELECT operational_state FROM source_registry WHERE source_id='we-work-remotely'`).get() as any;
    expect(before.operational_state).toBe("active");
    // Apply expiry as SP-05 lifecycle would: update to review_due rather than DELETE
    db.exec(`UPDATE source_registry SET operational_state='review_due', last_decision='policy_expiry past' WHERE source_id='we-work-remotely'`);
    const after = db.query(`SELECT operational_state FROM source_registry WHERE source_id='we-work-remotely'`).get() as any;
    expect(after.operational_state).toBe("review_due");
    // No row deleted
    expect((db.query(`SELECT COUNT(*) as c FROM source_registry`).get() as any).c).toBe(1);
    db.close();
  });
});

describe("source_registry lease indices (SP-05)", () => {
  test("review_deadline, policy_expiry, opt_out indices exist", () => {
    const db = freshDb();
    const indexes = db.query(`SELECT name FROM sqlite_master WHERE type='index'`).all() as any[];
    const names = new Set(indexes.map((r) => r.name));
    expect(names.has("source_registry_review_deadline_idx")).toBe(true);
    expect(names.has("source_registry_policy_expiry_idx")).toBe(true);
    expect(names.has("source_registry_opt_out_idx")).toBe(true);
    db.close();
  });
});

describe("lifecycle invariants — DB CHECK still enforces shadow/canary/active guard", () => {
  test("needs_review + active is still rejected after SP-05 migration", () => {
    const db = freshDb();
    insertProvider(db, "p1");
    expect(() =>
      db.exec(`INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state) VALUES ('s1', 'p1', 'S1', 'https://example.com', 'needs_review', 'active')`),
    ).toThrow();
    db.close();
  });
  test("blocked + shadow is rejected", () => {
    const db = freshDb();
    insertProvider(db, "p1");
    expect(() =>
      db.exec(`INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state) VALUES ('s1', 'p1', 'S1', 'https://example.com', 'blocked', 'shadow')`),
    ).toThrow();
    db.close();
  });
  test("allowed + shadow passes", () => {
    const db = freshDb();
    insertProvider(db, "p1");
    db.exec(`INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state) VALUES ('s1', 'p1', 'S1', 'https://example.com', 'allowed', 'shadow')`);
    expect((db.query(`SELECT source_id FROM source_registry WHERE source_id='s1'`).get() as any).source_id).toBe("s1");
    db.close();
  });
});
