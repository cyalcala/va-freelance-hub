import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { planDirectoryFactualPatch, type DirectoryFactualBaseline, type DirectoryFactualPatchPacket,
  type DirectoryFactualPatchPlan } from "./directory-factual-patch";

const now = "2026-10-08T20:30:00.000Z";
function fixture(companyName = "O'Hara Company") {
  const db = new Database(":memory:");
  const migration = readFileSync(new URL("../../packages/db/migrations/0045_add_graduated_va_agencies_to_directory.sql", import.meta.url), "utf8");
  const start = migration.indexOf("CREATE TABLE IF NOT EXISTS va_directory");
  db.exec(migration.slice(start, migration.indexOf(");", start) + 2));
  db.query(`INSERT INTO va_directory(id,company_name,website,hiring_page_url,website_source,website_evidence,website_set_at,
    hires_filipinos,is_verified,is_remote,is_dayshift,is_marketplace,link_fail_count,notes,verified_at,ats_platform,ats_token,
    link_status,link_checked_at,link_evidence,rating) VALUES(1,?,?,?,?,?,?,1,1,1,0,0,0,?,?,?,?,?,?,?,5)`)
    .run(companyName, "https://old.example.org/", null, "curated", "owner's original seed", "2026-10-01 00:00:00",
      "untouched note", "2026-10-01 00:00:00", "greenhouse", "test", "ok", "2026-10-01 00:00:00", "original link check");
  const current = (id = 1): DirectoryFactualBaseline => {
    const { linkStatus, linkCheckedAt, linkEvidence, ...value } = db.query(`SELECT id,company_name AS companyName,website,hiring_page_url AS hiringPageUrl,
    website_source AS websiteSource,website_evidence AS websiteEvidence,website_set_at AS websiteSetAt,
    hires_filipinos AS hiresFilipinos,is_verified AS isVerified,is_remote AS isRemote,is_dayshift AS isDayshift,
    is_marketplace AS isMarketplace,link_fail_count AS linkFailCount,link_status AS linkStatus,link_checked_at AS linkCheckedAt,link_evidence AS linkEvidence,
    CASE WHEN hires_filipinos=1 AND link_fail_count<3 THEN 1 ELSE 0 END AS publicVisible FROM va_directory WHERE id=?`).get(id) as Omit<DirectoryFactualBaseline, "linkHealth">
      & { linkStatus: string | null; linkCheckedAt: string | null; linkEvidence: string | null };
    return { ...value, linkHealth: { state: "KNOWN", value: { linkStatus, linkCheckedAt, linkEvidence } } };
  };
  const full = () => db.query("SELECT * FROM va_directory ORDER BY id").all() as Record<string, unknown>[];
  const packet = (): DirectoryFactualPatchPacket => ({ version: 1, preparedAt: "2026-10-08T20:20:00.000Z",
    validFrom: "2026-10-08T20:00:00.000Z", expiresAt: "2026-10-08T21:00:00.000Z",
    baselineReceipt: { status: "PASS", observedAt: "2026-10-08T20:10:00.000Z", receiptId: "native-sqlite-fixture-select",
      success: true, rowsWritten: 0, changedDb: false }, rows: [{ id: 1, companyName, identity: "CONFIRMED",
      baseline: { state: "KNOWN", value: current() }, review: { status: "ACCEPTED", reviewerId: "/root/independent-fixture-reviewer",
        reviewedAt: "2026-10-08T20:15:00.000Z" }, changes: [{ field: "website", value: "https://official.example.org/",
          evidence: { kind: "PRIMARY_OFFICIAL", url: "https://official.example.org/about", capturedAt: "2026-10-08T20:05:00.000Z",
            companyName, field: "website" } }] }] });
  return { db, current, full, packet };
}
function noSql(plan: DirectoryFactualPatchPlan) {
  expect(plan.readyCount).toBe(0);
  expect(plan.rows.every(row => !row.updateSql && !row.undoSql)).toBe(true);
  expect(plan.productionReads).toBe(0);
  expect(plan.productionWrites).toBe(0);
  expect(plan.publicationAuthorized).toBe(false);
  expect(plan.qualificationAuthorized).toBe(false);
}
const sqlColumns = ["id", "company_name", "website", "hiring_page_url", "website_source", "website_evidence", "website_set_at",
  "hires_filipinos", "is_verified", "is_remote", "is_dayshift", "is_marketplace", "link_fail_count",
  "link_status", "link_checked_at", "link_evidence"];

test("preparation emits one guarded update and undo with zero effects on actual native SQLite", () => {
  const f = fixture();
  try {
    const before = f.db.serialize(); const packet = f.packet(); const saved = JSON.stringify(packet);
    const plan = planDirectoryFactualPatch(packet, now);
    expect(plan).toMatchObject({ version: 1, mode: "EMIT_ONLY", state: "READY", readyCount: 1,
      productionReads: 0, productionWrites: 0, publicationAuthorized: false, qualificationAuthorized: false });
    expect(plan.rows[0]).toMatchObject({ id: 1, state: "READY", changedFields: ["website", "website_source", "website_evidence", "website_set_at",
      "link_status", "link_checked_at", "link_evidence"] });
    expect(plan.rows[0]?.updateSql?.match(/\bUPDATE\b/g)).toHaveLength(1);
    expect(plan.rows[0]?.undoSql?.match(/\bUPDATE\b/g)).toHaveLength(1);
    expect(f.db.serialize()).toEqual(before);
    expect(JSON.stringify(packet)).toBe(saved);
  } finally { f.db.close(); }
});

test("native website update invalidates prior provenance and recent link health, preserving flags and strikes", () => {
  const f = fixture();
  try {
    f.db.exec("UPDATE va_directory SET link_checked_at='2026-10-08 20:02:00',link_fail_count=2 WHERE id=1");
    const packet = f.packet(); const row = packet.rows[0]!;
    row.changes.push({ field: "hiring_page_url", value: "https://official.example.org/careers/",
      evidence: { ...row.changes[0]!.evidence, field: "hiring_page_url", url: "https://official.example.org/careers/" } });
    const before = f.full()[0]!; const plan = planDirectoryFactualPatch(packet, now).rows[0]!;
    expect(f.db.run(plan.updateSql!).changes).toBe(1);
    const after = f.full()[0]!;
    expect(after).toEqual({ ...before, website: "https://official.example.org/", hiring_page_url: "https://official.example.org/careers/",
      website_source: null, website_evidence: null, website_set_at: null, link_status: null, link_checked_at: null, link_evidence: null });
    expect(f.db.query("SELECT id FROM va_directory WHERE link_checked_at IS NULL ORDER BY link_checked_at ASC LIMIT 1").get()).toEqual({ id: 1 });
    expect(f.db.run(plan.undoSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual(before);
  } finally { f.db.close(); }
});

test("UNKNOWN health holds the entire changed-website row while hiring-only and equivalent websites preserve receipts", () => {
  const f = fixture();
  try {
    const packet = f.packet(); const row = packet.rows[0]!;
    if (row.baseline.state === "KNOWN") row.baseline.value.linkHealth = { state: "UNKNOWN" };
    const hiring = { ...row.changes[0]!, field: "hiring_page_url" as const, value: "https://old.example.org/careers",
      evidence: { ...row.changes[0]!.evidence, field: "hiring_page_url" as const } };
    const changedWebsite = row.changes[0]!;
    for (const changes of [[changedWebsite], [hiring, changedWebsite], [changedWebsite, hiring]]) {
      row.changes = changes; const plan = planDirectoryFactualPatch(packet, now); noSql(plan);
      expect(plan.rows[0]?.reasons).toEqual(["BASELINE_INVALID"]);
    }
    row.changes = [{ ...changedWebsite, value: "//old.example.org/" }];
    expect(planDirectoryFactualPatch(packet, now).state).toBe("NO_CHANGE");
    row.changes.push(hiring);
    const before = f.full()[0]!; const ready = planDirectoryFactualPatch(packet, now).rows[0]!;
    expect(ready.state).toBe("READY"); expect(ready.changedFields).toEqual(["hiring_page_url"]);
    expect(f.db.run(ready.updateSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual({ ...before, hiring_page_url: "https://old.example.org/careers" });
    expect(f.db.run(ready.undoSql!).changes).toBe(1); expect(f.full()[0]).toEqual(before);
  } finally { f.db.close(); }
});

test("native website health guards distinguish known empty strings from NULL and restore exact prior receipts", () => {
  const f = fixture();
  try {
    f.db.exec("UPDATE va_directory SET link_status='',link_checked_at='',link_evidence='',link_fail_count=2 WHERE id=1");
    const before = f.full()[0]!; const plan = planDirectoryFactualPatch(f.packet(), now).rows[0]!;
    expect(plan.state).toBe("READY");
    for (const column of ["link_status", "link_checked_at", "link_evidence"]) {
      expect(plan.updateSql).toContain(`${column} IS ''`);
      f.db.query(`UPDATE va_directory SET ${column}=NULL WHERE id=1`).run();
      expect(f.db.run(plan.updateSql!).changes).toBe(0);
      f.db.query(`UPDATE va_directory SET ${column}='' WHERE id=1`).run();
    }
    expect(f.db.run(plan.updateSql!).changes).toBe(1);
    expect(f.current()).toMatchObject({ linkFailCount: 2, isVerified: 1, publicVisible: 1,
      linkHealth: { state: "KNOWN", value: { linkStatus: null, linkCheckedAt: null, linkEvidence: null } } });
    expect(f.db.run(plan.undoSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual(before);
  } finally { f.db.close(); }
});

test("malformed health coverage never supplies guessed NULL values to a changed website", () => {
  const f = fixture();
  try {
    for (const health of [null, {}, { state: "KNOWN", value: { linkStatus: null, linkCheckedAt: null } },
      { state: "KNOWN", value: { linkStatus: "UNKNOWN", linkCheckedAt: null, linkEvidence: null } },
      { state: "KNOWN", value: { linkStatus: null, linkCheckedAt: null, linkEvidence: "nul\0" } },
      { state: "UNKNOWN", value: null }]) {
      const packet = f.packet(); if (packet.rows[0]!.baseline.state === "KNOWN") (packet.rows[0]!.baseline.value as any).linkHealth = health;
      noSql(planDirectoryFactualPatch(packet, now));
    }
  } finally { f.db.close(); }
});

test("hiring-only preparation preserves correct website and every provenance, flag and link-health field", () => {
  const f = fixture();
  try {
    const packet = f.packet(); const row = packet.rows[0]!;
    row.changes = [{ ...row.changes[0]!, field: "hiring_page_url", value: "https://old.example.org/careers",
      evidence: { ...row.changes[0]!.evidence, field: "hiring_page_url" } }];
    const plan = planDirectoryFactualPatch(packet, now).rows[0]!; const before = f.full()[0]!;
    expect(plan.changedFields).toEqual(["hiring_page_url"]);
    expect(f.db.run(plan.updateSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual({ ...before, hiring_page_url: "https://old.example.org/careers" });
    expect(f.db.run(plan.undoSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual(before);
  } finally { f.db.close(); }
});

test("normalized-equivalent correct URLs are no change without gratuitous normalization or provenance stamping", () => {
  const f = fixture();
  try {
    for (const website of ["old.example.org", "https://OLD.example.org", "//old.example.org/"]) {
      f.db.query("UPDATE va_directory SET website=? WHERE id=1").run(website);
      const packet = f.packet(); packet.rows[0]!.changes[0]!.value = "https://old.example.org/";
      const plan = planDirectoryFactualPatch(packet, now);
      expect(plan.state).toBe("NO_CHANGE"); noSql(plan);
      expect(f.current().website).toBe(website);
      expect(f.current().websiteSource).toBe("curated");
    }
  } finally { f.db.close(); }
});

test("native forward CAS refuses drift in exact identity, URLs, provenance, link health and all visibility/company flags", () => {
  for (const column of sqlColumns) {
    const f = fixture();
    try {
      const plan = planDirectoryFactualPatch(f.packet(), now).rows[0]!;
      const next = column === "id" ? 2 : ["hires_filipinos", "is_verified", "is_remote"].includes(column) ? 0
        : ["is_dayshift", "is_marketplace", "link_fail_count"].includes(column) ? 1 : "drifted";
      f.db.query(`UPDATE va_directory SET ${column}=? WHERE id=1`).run(next);
      const drifted = f.full();
      expect(f.db.run(plan.updateSql!).changes).toBe(0);
      expect(f.full()).toEqual(drifted);
    } finally { f.db.close(); }
  }
});

test("native undo CAS refuses post-apply drift rather than restoring stale provenance or identity", () => {
  for (const column of sqlColumns) {
    const f = fixture();
    try {
      const plan = planDirectoryFactualPatch(f.packet(), now).rows[0]!;
      expect(f.db.run(plan.updateSql!).changes).toBe(1);
      const next = column === "id" ? 2 : ["hires_filipinos", "is_verified", "is_remote"].includes(column) ? 0
        : ["is_dayshift", "is_marketplace", "link_fail_count"].includes(column) ? 1 : "post-apply drift";
      f.db.query(`UPDATE va_directory SET ${column}=? WHERE id=1`).run(next);
      const drifted = f.full();
      expect(f.db.run(plan.undoSql!).changes).toBe(0);
      expect(f.full()).toEqual(drifted);
    } finally { f.db.close(); }
  }
});

test("native forward and undo replay are counted no-ops after their exact state changes", () => {
  const f = fixture();
  try {
    const plan = planDirectoryFactualPatch(f.packet(), now).rows[0]!;
    expect(f.db.run(plan.updateSql!).changes).toBe(1);
    expect(f.db.run(plan.updateSql!).changes).toBe(0);
    expect(f.db.run(plan.undoSql!).changes).toBe(1);
    expect(f.db.run(plan.undoSql!).changes).toBe(0);
  } finally { f.db.close(); }
});

test("known actual null is patchable but UNKNOWN, missing and undefined baseline values never become SQL null", () => {
  const f = fixture();
  try {
    f.db.exec("UPDATE va_directory SET website=NULL,website_source=NULL,website_evidence=NULL,website_set_at=NULL WHERE id=1");
    const known = planDirectoryFactualPatch(f.packet(), now);
    expect(known.readyCount).toBe(1);
    expect(f.db.run(known.rows[0]!.updateSql!).changes).toBe(1);
    for (const change of [(p: any) => { p.rows[0].baseline = { state: "UNKNOWN" }; },
      (p: any) => { delete p.rows[0].baseline.value.website; }, (p: any) => { p.rows[0].baseline.value.website = undefined; }]) {
      const packet = f.packet(); change(packet); const plan = planDirectoryFactualPatch(packet, now);
      noSql(plan); expect(plan.rows[0]?.state).toBe("HELD");
    }
  } finally { f.db.close(); }
});

test("failed, unknown, write-bearing and incomplete baseline receipts withhold every row", () => {
  const f = fixture();
  try {
    for (const changes of [{ status: "FAILED" }, { status: "UNKNOWN" }, { success: false }, { success: null },
      { rowsWritten: 1 }, { rowsWritten: null }, { changedDb: true }, { changedDb: null }, { receiptId: null }, { observedAt: null }]) {
      const packet = f.packet(); Object.assign(packet.baselineReceipt, changes);
      const plan = planDirectoryFactualPatch(packet, now); noSql(plan);
      expect(plan.rows[0]?.state).toBe("HELD");
    }
  } finally { f.db.close(); }
});

test("review labels alone, missing reviewer identity and review before evidence or baseline cannot emit SQL", () => {
  const f = fixture();
  try {
    for (const changes of [{ status: "NOT_PERFORMED" }, { status: "HELD" }, { reviewerId: null },
      { reviewerId: "UNKNOWN" }, { reviewerId: " " }, { reviewedAt: null }, { reviewedAt: "2026-10-08T20:04:00.000Z" },
      { reviewedAt: "2026-10-08T20:09:00.000Z" }, { reviewedAt: "2026-10-08T20:31:00.000Z" }]) {
      const packet = f.packet(); Object.assign(packet.rows[0]!.review, changes);
      noSql(planDirectoryFactualPatch(packet, now));
    }
  } finally { f.db.close(); }
});

test("primary evidence must be dated, official and tied to the exact company and proposed field", () => {
  const f = fixture();
  try {
    for (const changes of [{ kind: "SECONDARY" }, { companyName: "Other Company" }, { field: "hiring_page_url" },
      { url: "http://127.0.0.1/" }, { capturedAt: "UNKNOWN" }, { capturedAt: "2026-02-30T20:05:00.000Z" },
      { capturedAt: "2026-10-08T19:59:59.999Z" }, { capturedAt: "2026-10-08T20:16:00.000Z" }]) {
      const packet = f.packet(); Object.assign(packet.rows[0]!.changes[0]!.evidence, changes);
      noSql(planDirectoryFactualPatch(packet, now));
    }
  } finally { f.db.close(); }
});

test("held alias identity, renamed company, mismatched ID and unknown company flags cannot emit SQL", () => {
  const f = fixture();
  try {
    for (const mutate of [(p: any) => { p.rows[0].identity = "HELD"; }, (p: any) => { p.rows[0].companyName = "Renamed"; },
      (p: any) => { p.rows[0].baseline.value.id = 2; }, (p: any) => { p.rows[0].baseline.value.isVerified = null; },
      (p: any) => { p.rows[0].baseline.value.isRemote = true; }, (p: any) => { p.rows[0].baseline.value.publicVisible = 0; },
      (p: any) => { p.rows[0].baseline.value.hiresFilipinos = 0; }, (p: any) => { p.rows[0].baseline.value.linkFailCount = 3; }]) {
      const packet = f.packet(); mutate(packet); noSql(planDirectoryFactualPatch(packet, now));
    }
  } finally { f.db.close(); }
});

test("only website/hiring additions or corrections are allowed, including strict packet and row keys", () => {
  const f = fixture();
  try {
    for (const mutate of [(p: any) => { p.rows[0].changes[0].field = "is_verified"; },
      (p: any) => { p.rows[0].changes[0].value = null; }, (p: any) => { p.rows[0].isVerified = 1; },
      (p: any) => { p.rows[0].baseline.value.extra = "unexpected"; }, (p: any) => { p.rows[0].changes.push(p.rows[0].changes[0]); },
      (p: any) => { p.extra = true; }]) {
      const packet = f.packet(); mutate(packet); noSql(planDirectoryFactualPatch(packet, now));
    }
  } finally { f.db.close(); }
});

test("malformed, unsafe, oversized or NUL-bearing desired URLs are held without coercion", () => {
  const f = fixture();
  try {
    for (const value of ["UNKNOWN", "javascript:alert(1)", "mailto:hello@example.org", "https://user:secret@example.org/",
      "http://localhost/", "http://127.0.0.1/", "https://example.org/\0", "https://example.org/" + "x".repeat(2048), 123, {}]) {
      const packet = f.packet(); (packet.rows[0]!.changes[0] as any).value = value;
      noSql(planDirectoryFactualPatch(packet, now));
    }
  } finally { f.db.close(); }
});

test("SQLite string quoting makes malicious-looking names and URL paths literal without changing other rows or flags", () => {
  const f = fixture("O'Hara'; UPDATE va_directory SET is_verified=0; --");
  try {
    const packet = f.packet(); packet.rows[0]!.changes[0]!.value = "https://official.example.org/o'hara');DROP TABLE va_directory;--";
    const before = f.full()[0]!; const plan = planDirectoryFactualPatch(packet, now).rows[0]!;
    expect(f.db.run(plan.updateSql!).changes).toBe(1);
    expect(f.full()[0]!.is_verified).toBe(1);
    expect(f.full()[0]!.company_name).toBe(before.company_name);
    expect(f.db.query("SELECT COUNT(*) AS n FROM va_directory").get()).toEqual({ n: 1 });
    expect(f.db.run(plan.undoSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual(before);
  } finally { f.db.close(); }
});

test("finite preparation window rejects stale receipt/evidence, future clocks and equality expiry", () => {
  const f = fixture();
  try {
    for (const mutate of [(p: any) => { p.baselineReceipt.observedAt = "2026-10-08T19:59:59.999Z"; },
      (p: any) => { p.preparedAt = "2026-10-08T20:31:00.000Z"; }, (p: any) => { p.validFrom = p.expiresAt; },
      (p: any) => { p.expiresAt = now; }, (p: any) => { p.baselineReceipt.observedAt = "2026-10-08T20:31:00.000Z"; }]) {
      const packet = f.packet(); mutate(packet); noSql(planDirectoryFactualPatch(packet, now));
    }
    noSql(planDirectoryFactualPatch(f.packet(), "2026-02-30T00:00:00.000Z"));
  } finally { f.db.close(); }
});

test("packet exceeds three rows or duplicate IDs fail closed with no partial SQL", () => {
  const f = fixture();
  try {
    const duplicate = f.packet(); duplicate.rows.push(structuredClone(duplicate.rows[0]!));
    noSql(planDirectoryFactualPatch(duplicate, now));
    const oversized = f.packet(); oversized.rows = Array.from({ length: 4 }, (_, i) => ({ ...structuredClone(oversized.rows[0]!), id: i + 1 }));
    noSql(planDirectoryFactualPatch(oversized, now));
  } finally { f.db.close(); }
});

test("mixed three-row cohort emits only its independently reviewed known ready row", () => {
  const f = fixture();
  try {
    const packet = f.packet(); const first = packet.rows[0]!;
    const second = structuredClone(first); second.id = 2; second.identity = "HELD"; second.baseline = { state: "UNKNOWN" };
    f.db.query("INSERT INTO va_directory(id,company_name,website,hires_filipinos,is_verified,is_remote,link_fail_count) VALUES(3,?,?,1,1,1,0)")
      .run("Fixture Company C", "https://old.example.org/");
    const third = structuredClone(first); third.id = 3; third.companyName = "Fixture Company C";
    third.baseline = { state: "KNOWN", value: f.current(3) };
    third.changes[0]!.evidence.companyName = third.companyName;
    third.changes[0]!.value = "https://old.example.org/";
    packet.rows.push(second, third);
    const plan = planDirectoryFactualPatch(packet, now);
    expect(plan.readyCount).toBe(1);
    expect(plan.rows.map(row => row.state)).toEqual(["READY", "HELD", "NO_CHANGE"]);
    expect(plan.rows.filter(row => row.updateSql)).toHaveLength(1);
  } finally { f.db.close(); }
});

test("native known empty strings stay distinct from NULL in URL and provenance forward/undo guards", () => {
  const f = fixture();
  try {
    f.db.exec("UPDATE va_directory SET hiring_page_url='',website_source='',website_evidence='',website_set_at='' WHERE id=1");
    const packet = f.packet(); const row = packet.rows[0]!;
    row.changes = [{ ...row.changes[0]!, field: "hiring_page_url", value: "https://old.example.org/careers",
      evidence: { ...row.changes[0]!.evidence, field: "hiring_page_url" } }];
    const before = f.full()[0]!; const plan = planDirectoryFactualPatch(packet, now).rows[0]!;
    expect(plan.state).toBe("READY");
    expect(plan.updateSql).toContain("hiring_page_url IS ''");
    expect(plan.updateSql).toContain("website_evidence IS ''");
    f.db.exec("UPDATE va_directory SET hiring_page_url=NULL WHERE id=1");
    expect(f.db.run(plan.updateSql!).changes).toBe(0);
    f.db.exec("UPDATE va_directory SET hiring_page_url='',website_evidence=NULL WHERE id=1");
    expect(f.db.run(plan.updateSql!).changes).toBe(0);
    f.db.exec("UPDATE va_directory SET website_evidence='' WHERE id=1");
    expect(f.db.run(plan.updateSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual({ ...before, hiring_page_url: "https://old.example.org/careers" });
    expect(f.db.run(plan.undoSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual(before);
    f.db.exec("UPDATE va_directory SET website='' WHERE id=1");
    const websitePatch = planDirectoryFactualPatch(f.packet(), now).rows[0]!; const empty = f.full()[0]!;
    expect(websitePatch.state).toBe("READY");
    expect(f.db.run(websitePatch.updateSql!).changes).toBe(1);
    expect(f.current()).toMatchObject({ websiteSource: null, websiteEvidence: null, websiteSetAt: null });
    expect(f.db.run(websitePatch.undoSql!).changes).toBe(1);
    expect(f.full()[0]).toEqual(empty);
  } finally { f.db.close(); }
});

test("review recorded after preparation is valid when baseline and captured evidence precede it within the window", () => {
  const f = fixture();
  try {
    const packet = f.packet(); packet.preparedAt = "2026-10-08T20:08:20.000Z";
    const plan = planDirectoryFactualPatch(packet, now);
    expect(plan.readyCount).toBe(1);
    expect(plan.rows[0]?.state).toBe("READY");
  } finally { f.db.close(); }
});

test("malformed JSON values and sparse rows stay HELD with bounded reasons and no raw exception text", () => {
  const f = fixture();
  try {
    for (const value of [null, [], "packet", 0, {}, { ...f.packet(), rows: [null] }, { ...f.packet(), rows: new Array(1) }]) {
      const plan = planDirectoryFactualPatch(value as any, now); noSql(plan);
      expect(plan.state).toBe("HELD");
    }
    for (const mutate of [(p: any) => { p.rows[0].id = "1"; }, (p: any) => { p.rows[0].changes = [null]; },
      (p: any) => { p.rows[0].changes[0].evidence = null; }, (p: any) => { p.rows[0].review = null; },
      (p: any) => { p.rows[0].baseline = null; }, (p: any) => { p.rows[0].baseline.value.websiteEvidence = "UNKNOWN"; }]) {
      const packet = f.packet(); mutate(packet); const plan = planDirectoryFactualPatch(packet, now); noSql(plan);
      expect(plan.rows[0]?.state).toBe("HELD");
      expect(plan.rows[0]?.reasons).toHaveLength(1);
      expect(plan.rows[0]?.reasons[0]).toMatch(/^[A-Z_]+$/);
    }
  } finally { f.db.close(); }
});

test("a failed-baseline fixture cohort and held alias identity prepare zero ready updates", () => {
  const f = fixture();
  try {
    const packet = f.packet(); packet.baselineReceipt = { status: "FAILED", observedAt: null, receiptId: "D1_AUTH_7403",
      success: false, rowsWritten: null, changedDb: null };
    packet.rows = [["Fixture Company A", 1, "CONFIRMED"], ["Fixture Alias Company", 2, "HELD"],
      ["Fixture Company C", 3, "CONFIRMED"]].map(([companyName, id, identity]) => ({ ...structuredClone(packet.rows[0]!),
        id: id as number, companyName: companyName as string, identity: identity as "CONFIRMED" | "HELD", baseline: { state: "UNKNOWN" } }));
    const plan = planDirectoryFactualPatch(packet, now); noSql(plan);
    expect(plan.rows).toHaveLength(3);
    expect(plan.rows.every(row => row.state === "HELD")).toBe(true);
  } finally { f.db.close(); }
});

test("retained actual proposal packet cannot emit SQL with FAILED receipt or UNKNOWN row baselines", () => {
  const packet = JSON.parse(readFileSync(new URL("../../docs/operations/directory-factual-proposals-2026-10-09.json", import.meta.url), "utf8")) as DirectoryFactualPatchPacket;
  const plan = planDirectoryFactualPatch(packet, "2026-10-08T20:20:00.000Z");
  noSql(plan);
  expect(plan.rows).toHaveLength(3);
  expect(plan.rows.map(row => row.state)).toEqual(["HELD", "HELD", "HELD"]);
  expect(plan.rows.map(row => row.reasons[0])).toEqual(["BASELINE_UNAVAILABLE", "IDENTITY_HELD", "BASELINE_UNAVAILABLE"]);
  packet.baselineReceipt = { status: "PASS", observedAt: "2026-10-08T20:09:00.000Z", receiptId: "hypothetical-fixture-only",
    success: true, rowsWritten: 0, changedDb: false };
  const stillUnknown = planDirectoryFactualPatch(packet, "2026-10-08T20:20:00.000Z");
  noSql(stillUnknown);
  expect(stillUnknown.rows).toHaveLength(3);
  expect(stillUnknown.rows.map(row => row.reasons[0])).toEqual(["BASELINE_INVALID", "IDENTITY_HELD", "BASELINE_INVALID"]);
});
