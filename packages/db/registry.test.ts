import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

function freshDb(): Database {
  const db = new Database(":memory:");
  // Enable FK enforcement — D1 does; bun:sqlite is off by default.
  db.exec("PRAGMA foreign_keys = ON;");
  const migration = readFileSync(join(import.meta.dir, "./migrations/0036_registry_foundation.sql"), "utf-8");
  db.exec(migration);
  return db;
}

function insertProvider(db: Database, overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    id: "test-provider",
    display_name: "Test Provider",
    provider_family: "test-family",
    mechanism: "rss_feed",
    auth_class: "none",
    evidence_lease_days: 180,
    default_compliance_state: "allowed",
    default_operational_state: "active",
    ...overrides,
  };
  const cols = Object.keys(base).join(", ");
  const placeholders = Object.keys(base).map(() => "?").join(", ");
  db.query(`INSERT INTO provider_profiles (${cols}) VALUES (${placeholders})`).run(...Object.values(base));
}

function insertSource(db: Database, overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    source_id: "test-source",
    provider_id: "test-provider",
    display_name: "Test Source",
    endpoint_url: "https://example.com/feed",
    compliance_state: "allowed",
    operational_state: "active",
    opt_out: 0,
    ...overrides,
  };
  const cols = Object.keys(base).join(", ");
  const placeholders = Object.keys(base).map(() => "?").join(", ");
  db.query(`INSERT INTO source_registry (${cols}) VALUES (${placeholders})`).run(...Object.values(base));
}

// ─── Provider profiles ─────────────────────────────────────────────────────

test("provider_profiles: valid insert", () => {
  const db = freshDb();
  insertProvider(db);
  const row = db.query("SELECT id FROM provider_profiles WHERE id = 'test-provider'").get() as any;
  expect(row.id).toBe("test-provider");
  db.close();
});

test("provider_profiles: duplicate id is rejected", () => {
  const db = freshDb();
  insertProvider(db);
  expect(() => insertProvider(db, { id: "test-provider" })).toThrow();
  db.close();
});

test("provider_profiles: invalid mechanism is rejected", () => {
  const db = freshDb();
  expect(() => insertProvider(db, { mechanism: "bogus" })).toThrow();
  db.close();
});

test("provider_profiles: cadence_max < cadence_min is rejected", () => {
  const db = freshDb();
  expect(() => insertProvider(db, { cadence_min_minutes: 60, cadence_max_minutes: 30 })).toThrow();
  // valid equal passes
  insertProvider(db, { id: "p2", cadence_min_minutes: 60, cadence_max_minutes: 60 });
  const row = db.query("SELECT id FROM provider_profiles WHERE id='p2'").get() as any;
  expect(row.id).toBe("p2");
  db.close();
});

test("provider_profiles: evidence_lease_days must be >0", () => {
  const db = freshDb();
  expect(() => insertProvider(db, { evidence_lease_days: 0 })).toThrow();
  expect(() => insertProvider(db, { id: "p2", evidence_lease_days: -1 })).toThrow();
  db.close();
});

// ─── Source registry ───────────────────────────────────────────────────────

test("source_registry: valid allowed+active", () => {
  const db = freshDb();
  insertProvider(db);
  insertSource(db);
  const row = db.query("SELECT source_id FROM source_registry WHERE source_id='test-source'").get() as any;
  expect(row.source_id).toBe("test-source");
  db.close();
});

test("source_registry: duplicate source_id is rejected (no silent overwrite)", () => {
  const db = freshDb();
  insertProvider(db);
  insertSource(db);
  expect(() => insertSource(db)).toThrow();
  db.close();
});

test("source_registry: invalid compliance_state is rejected", () => {
  const db = freshDb();
  insertProvider(db);
  expect(() => insertSource(db, { compliance_state: "bogus" })).toThrow();
  db.close();
});

test("source_registry: invalid operational_state is rejected", () => {
  const db = freshDb();
  insertProvider(db);
  expect(() => insertSource(db, { operational_state: "bogus" })).toThrow();
  db.close();
});

test("source_registry: shadow/canary/active require allowed or conditional", () => {
  const db = freshDb();
  insertProvider(db);
  // needs_review + active must fail
  expect(() => insertSource(db, { source_id: "s1", compliance_state: "needs_review", operational_state: "active" })).toThrow();
  expect(() => insertSource(db, { source_id: "s2", compliance_state: "needs_review", operational_state: "shadow" })).toThrow();
  expect(() => insertSource(db, { source_id: "s3", compliance_state: "blocked", operational_state: "canary" })).toThrow();
  expect(() => insertSource(db, { source_id: "s4", compliance_state: "awaiting_permission", operational_state: "active" })).toThrow();
  // allowed + active passes
  insertSource(db, { source_id: "s5", compliance_state: "allowed", operational_state: "active" });
  // conditional + shadow passes
  insertSource(db, { source_id: "s6", compliance_state: "conditional", operational_state: "shadow" });
  // needs_review + candidate passes (candidate does not require allowed)
  insertSource(db, { source_id: "s7", compliance_state: "needs_review", operational_state: "candidate" });
  // blocked + paused passes
  insertSource(db, { source_id: "s8", compliance_state: "blocked", operational_state: "paused" });
  // allowed + paused passes
  insertSource(db, { source_id: "s9", compliance_state: "allowed", operational_state: "paused" });
  const count = (db.query("SELECT COUNT(*) as c FROM source_registry").get() as any).c;
  expect(count).toBe(5);
  db.close();
});

test("source_registry: FK to provider_profiles is enforced", () => {
  const db = freshDb();
  // no provider inserted -> FK fails
  expect(() => insertSource(db, { provider_id: "missing" })).toThrow();
  // after provider exists -> ok
  insertProvider(db, { id: "missing" });
  insertSource(db, { provider_id: "missing", source_id: "s1" });
  expect((db.query("SELECT source_id FROM source_registry WHERE source_id='s1'").get() as any).source_id).toBe("s1");
  db.close();
});

test("source_registry: opt_out is boolean 0/1 only", () => {
  const db = freshDb();
  insertProvider(db);
  expect(() => insertSource(db, { opt_out: 2 } as any)).toThrow();
  insertSource(db, { source_id: "s1", opt_out: 0 });
  insertSource(db, { source_id: "s2", opt_out: 1 });
  db.close();
});

test("source_registry: represents every current static + ATS source id without collision", () => {
  const db = freshDb();
  // Seed minimal provider families that cover the 6 exact-six and paused families.
  const providers = [
    { id: "we-work-remotely", family: "we-work-remotely" },
    { id: "remotive", family: "remotive" },
    { id: "real-work-from-anywhere", family: "real-work-from-anywhere" },
    { id: "remote-ok", family: "remote-ok" },
    { id: "jobicy", family: "jobicy" },
    { id: "paused-rss", family: "paused-rss" },
    { id: "ashby", family: "ashby" },
    { id: "greenhouse", family: "greenhouse" },
    { id: "breezy", family: "breezy" },
  ];
  for (const p of providers) {
    insertProvider(db, { id: p.id, provider_family: p.family, display_name: p.id });
  }

  // 12 static ids from packages/scraper/sources.ts
  const staticIds = [
    "we-work-remotely", "remotive", "real-work-from-anywhere",
    "jobicy-admin-support-apac", "jobicy-supporting-apac", "remote-ok",
    "problogger", "remote-co", "authentic-jobs", "dribbble", "onlinejobs-ph", "jobspresso",
  ];
  // 14 ATS token ids from scrape.ts ATS_TOKEN_POLICIES
  const atsIds = [
    "ashby:supabase", "ashby:camunda", "ashby:tremendous", "ashby:amplify", "ashby:ashby",
    "greenhouse:grafanalabs", "greenhouse:nearform", "greenhouse:gitlab", "greenhouse:ghost", "greenhouse:remotecom",
    "breezy:20four7va", "breezy:sourcefit", "breezy:vaaphilippines-recruitment", "breezy:time-etc",
  ];

  const providerFor = (sid: string): string => {
    if (sid.startsWith("ashby:")) return "ashby";
    if (sid.startsWith("greenhouse:")) return "greenhouse";
    if (sid.startsWith("breezy:")) return "breezy";
    if (sid.startsWith("jobicy")) return "jobicy";
    if (["we-work-remotely", "remotive", "real-work-from-anywhere", "remote-ok"].includes(sid)) return sid;
    return "paused-rss";
  };

  for (const sid of [...staticIds, ...atsIds]) {
    const isAllowed = ["we-work-remotely", "remotive", "real-work-from-anywhere", "remote-ok", "jobicy-admin-support-apac", "jobicy-supporting-apac"].includes(sid);
    insertSource(db, {
      source_id: sid,
      provider_id: providerFor(sid),
      display_name: sid,
      endpoint_url: `https://example.com/${sid}`,
      compliance_state: isAllowed ? "allowed" : sid.startsWith("ashby:") || sid.startsWith("greenhouse:") || sid.startsWith("breezy:") ? "blocked" : "blocked",
      operational_state: isAllowed ? "active" : "paused",
    });
  }

  const count = (db.query("SELECT COUNT(*) as c FROM source_registry").get() as any).c;
  expect(count).toBe(26);
  // No duplicate source_id
  const distinct = (db.query("SELECT COUNT(DISTINCT source_id) as c FROM source_registry").get() as any).c;
  expect(distinct).toBe(26);
  // Provider families: jobicy folds 2 feeds
  const families = db.query("SELECT DISTINCT provider_family FROM provider_profiles").all() as any[];
  expect(families.length).toBe(9);
  db.close();
});

// ─── Mapping audit (pure, no DB) ───────────────────────────────────────────

function auditMapping(knownIds: string[], registryIds: string[]): { mapped: string[]; unmapped: string[]; extra: string[] } {
  const knownSet = new Set(knownIds);
  const regSet = new Set(registryIds);
  const mapped = [...knownSet].filter((id) => regSet.has(id));
  const unmapped = [...knownSet].filter((id) => !regSet.has(id));
  const extra = [...regSet].filter((id) => !knownSet.has(id));
  return { mapped, unmapped, extra };
}

test("mapping audit: flags unmapped known sources without activating them", () => {
  const known = ["we-work-remotely", "remotive", "ashby:supabase", "greenhouse:gitlab"];
  const registry = ["we-work-remotely"] as string[];
  const audit = auditMapping(known, registry);
  expect(audit.mapped).toEqual(["we-work-remotely"]);
  expect(audit.unmapped).toEqual(["remotive", "ashby:supabase", "greenhouse:gitlab"]);
  expect(audit.extra).toEqual([]);
});

test("mapping audit: empty registry flags all 26 known sources as unmapped (read-only, no activation)", () => {
  const known = [
    "we-work-remotely", "remotive", "real-work-from-anywhere", "jobicy-admin-support-apac", "jobicy-supporting-apac", "remote-ok",
    "problogger", "remote-co", "authentic-jobs", "dribbble", "onlinejobs-ph", "jobspresso",
    "ashby:supabase", "ashby:camunda", "ashby:tremendous", "ashby:amplify", "ashby:ashby",
    "greenhouse:grafanalabs", "greenhouse:nearform", "greenhouse:gitlab", "greenhouse:ghost", "greenhouse:remotecom",
    "breezy:20four7va", "breezy:sourcefit", "breezy:vaaphilippines-recruitment", "breezy:time-etc",
  ];
  const audit = auditMapping(known, []);
  expect(audit.mapped.length).toBe(0);
  expect(audit.unmapped.length).toBe(26);
});

test("mapping audit: extra registry ids are flagged", () => {
  const audit = auditMapping(["we-work-remotely"], ["we-work-remotely", "orphan:token"]);
  expect(audit.extra).toEqual(["orphan:token"]);
});
