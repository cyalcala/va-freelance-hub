import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import {
  MAX_APPLY_ROWS,
  REPORT_QUERIES,
  buildApplyStatements,
  buildRestoreStatements,
  classifyReport,
  companyMatchesHost,
  evidenceFileHash,
  extractHost,
  normalizeWebsite,
  parseEvidenceFile,
  planApply,
  reconcileReport,
  type Report,
} from "./directory-website-repair";

// ─── Host extraction and mismatch heuristic ───────────────────────────────────

describe("extractHost", () => {
  test("normalizes scheme, case, port, and www prefix", () => {
    expect(extractHost("https://Alpaca.Markets")).toBe("alpaca.markets");
    expect(extractHost("http://WWW.Example.com/path?q=1")).toBe("example.com");
    expect(extractHost("https://example.com:8080/x")).toBe("example.com");
    expect(extractHost("  https://co6.com/  ")).toBe("co6.com");
  });

  test("recovers scheme-less values and returns null for garbage", () => {
    expect(extractHost("example.com/page")).toBe("example.com");
    expect(extractHost("not a url")).toBeNull();
    expect(extractHost("")).toBeNull();
    expect(extractHost("   ")).toBeNull();
  });
});

describe("companyMatchesHost", () => {
  test("matches a real brand token and ignores short tokens", () => {
    expect(companyMatchesHost("Alpaca", "alpaca.markets")).toBe(true);
    expect(companyMatchesHost("MetaLab Studio", "metalab.com")).toBe(true);
    // Tokens shorter than 3 chars never match ("Co" cannot match anything).
    expect(companyMatchesHost("Co", "remotephjobs.com")).toBe(false);
  });

  test("flags the DATA-05A anomaly shape: unrelated company on a foreign host", () => {
    expect(companyMatchesHost("Maven Clinic", "remotephjobs.com")).toBe(false);
    expect(companyMatchesHost("20Four7VA", "20four7va.com")).toBe(true);
  });

  test("never matches a null host", () => {
    expect(companyMatchesHost("Anything", null)).toBe(false);
  });
});

// ─── Report classification ────────────────────────────────────────────────────

function wrangler(rows: Record<string, unknown>[]): unknown {
  return [{ results: rows }];
}

function fixtureReport(): Report {
  return classifyReport({
    "report-totals": wrangler([
      { total_rows: 6, with_website: 4, classified: 1 },
    ]),
    "report-rows": wrangler([
      { id: 1, companyName: "Maven Clinic", website: "https://remotephjobs.com/", linkStatus: "ok", linkCheckedAt: "2026-08-01T00:00:00Z", linkEvidence: "e", linkFailCount: 2, enrichWebsiteNote: 0 },
      { id: 2, companyName: "Support Co", website: "https://remotephjobs.com/support", linkStatus: null, linkCheckedAt: null, linkEvidence: null, linkFailCount: 0, enrichWebsiteNote: 1 },
      { id: 3, companyName: "Metabase", website: "https://www.metabase.com", linkStatus: "ok", linkCheckedAt: null, linkEvidence: null, linkFailCount: 0, enrichWebsiteNote: 0 },
      { id: 4, companyName: "No Host At All", website: "not a url", linkStatus: null, linkCheckedAt: null, linkEvidence: null, linkFailCount: 1, enrichWebsiteNote: 0 },
    ]),
  });
}

describe("classifyReport", () => {
  test("assigns deterministic flags and shared-host groups", () => {
    const report = fixtureReport();
    const byId = new Map(report.rows.map((r) => [r.id, r]));

    // Rows 1+2 share one host across two distinct companies → shared_host.
    expect(byId.get(1)?.flags).toContain("shared_host");
    expect(byId.get(2)?.flags).toContain("shared_host");
    expect(report.sharedHostGroups).toEqual([
      { host: "remotephjobs.com", companies: ["maven clinic", "support co"], ids: [1, 2] },
    ]);

    // Enrichment-note evidence is carried through from the query marker.
    expect(byId.get(2)?.flags).toContain("enrichment_note_evidence");

    // Name/host mismatch: Maven Clinic has no token in remotephjobs.com.
    expect(byId.get(1)?.flags).toContain("name_host_mismatch");

    // A clean curated row (metabase.com) gets no flags.
    expect(byId.get(3)?.flags).toEqual([]);

    // Unparseable website always mismatches.
    expect(byId.get(4)?.flags).toContain("name_host_mismatch");

    expect(report.summary).toEqual({
      unclassifiedWebsiteRows: 4,
      withEnrichmentNoteEvidence: 1,
      inSharedHostGroups: 2,
      withNameHostMismatch: 3,
    });
  });

  test("same-company duplicates do not form a shared-host group", () => {
    const report = classifyReport({
      "report-totals": wrangler([{ total_rows: 3, with_website: 2, classified: 0 }]),
      "report-rows": wrangler([
        { id: 10, companyName: "Remote.com", website: "https://remote.com/apac", linkStatus: null, linkCheckedAt: null, linkEvidence: null, linkFailCount: 0, enrichWebsiteNote: 0 },
        { id: 11, companyName: "remote.com", website: "https://remote.com/eu", linkStatus: null, linkCheckedAt: null, linkEvidence: null, linkFailCount: 0, enrichWebsiteNote: 0 },
      ]),
    });
    expect(report.sharedHostGroups).toEqual([]);
    expect(report.rows.every((r) => !r.flags.includes("shared_host"))).toBe(true);
  });

  test("throws when the totals query does not return exactly one row", () => {
    expect(() =>
      classifyReport({
        "report-totals": wrangler([]),
        "report-rows": wrangler([]),
      }),
    ).toThrow(/exactly one totals row/);
  });
});

describe("reconcileReport", () => {
  test("zero delta when unclassified rows plus classified equal with_website", () => {
    expect(reconcileReport({ total_rows: 6, with_website: 4, classified: 1 }, 3).ok).toBe(true);
  });

  test("non-zero delta fails closed", () => {
    const recon = reconcileReport({ total_rows: 6, with_website: 4, classified: 1 }, 5);
    expect(recon.ok).toBe(false);
    expect(recon.deltas["rows_plus_classified_vs_with_website"]).not.toBe(0);
  });
});

// ─── Evidence file parsing ────────────────────────────────────────────────────

const validEntry = { id: 1, currentWebsite: "https://remotephjobs.com/", reason: "enrichment-era value; company has no relationship to this host" };

function validEvidence() {
  return {
    unit: "DATA-05B",
    approvedBy: "owner",
    approvedAt: "2026-08-23T00:00:00Z",
    rows: [{ ...validEntry }],
  };
}

describe("parseEvidenceFile", () => {
  test("accepts a well-formed file", () => {
    const parsed = parseEvidenceFile(validEvidence());
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.approvedBy).toBe("owner");
  });

  test("refuses wrong unit, missing approver, bad timestamp, malformed rows", () => {
    expect(() => parseEvidenceFile({ ...validEvidence(), unit: "OTHER" })).toThrow(/unit/);
    expect(() => parseEvidenceFile({ ...validEvidence(), approvedBy: "  " })).toThrow(/approvedBy/);
    expect(() => parseEvidenceFile({ ...validEvidence(), approvedAt: "yesterday" })).toThrow(/approvedAt/);
    expect(() => parseEvidenceFile({ ...validEvidence(), rows: {} })).toThrow(/rows array/);
    expect(() => parseEvidenceFile({ ...validEvidence(), rows: [{ id: -1, currentWebsite: "https://x.com", reason: "long enough reason" }] })).toThrow(/invalid id/);
    expect(() => parseEvidenceFile({ ...validEvidence(), rows: [{ id: 1, currentWebsite: " ", reason: "long enough reason" }] })).toThrow(/currentWebsite/);
    expect(() => parseEvidenceFile({ ...validEvidence(), rows: [{ id: 1, currentWebsite: "https://x.com", reason: "short" }] })).toThrow(/reason/);
    expect(() => parseEvidenceFile({ ...validEvidence(), rows: [{ id: 1, currentWebsite: "https://x.com", reason: "long enough reason", sharedDomainReviewed: "yes" }] })).toThrow(/boolean/);
  });

  test("hash is stable across identical files and sensitive to content", () => {
    const a = evidenceFileHash(parseEvidenceFile(validEvidence()));
    const b = evidenceFileHash(parseEvidenceFile(validEvidence()));
    const c = evidenceFileHash(
      parseEvidenceFile({ ...validEvidence(), rows: [{ ...validEntry, reason: "a materially different approval rationale" }] }),
    );
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

// ─── Apply planning ───────────────────────────────────────────────────────────

describe("planApply", () => {
  test("plans eligible rows and records faithful undo state", () => {
    const report = fixtureReport();
    const plan = planApply(
      {
        unit: "DATA-05B",
        approvedBy: "owner",
        approvedAt: "2026-08-23T00:00:00Z",
        rows: [
          { id: 1, currentWebsite: "HTTPS://remotephjobs.com", reason: "cross-company host anomaly; no name match", sharedDomainReviewed: true },
          { id: 2, currentWebsite: "https://remotephjobs.com/support", reason: "enrichment note evidence marks heuristic origin", sharedDomainReviewed: true },
        ],
      },
      report,
      new Date("2026-08-23T12:00:00Z"),
    );

    expect(plan.planned.map((p) => p.id)).toEqual([1, 2]);
    expect(plan.planned[0].expectedWebsite).toBe("https://remotephjobs.com");
    expect(plan.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);

    // Undo captures the exact pre-repair link-health fields.
    expect(plan.undo[0]).toEqual({
      id: 1,
      companyName: "Maven Clinic",
      oldWebsite: "https://remotephjobs.com/",
      oldLinkStatus: "ok",
      oldLinkCheckedAt: "2026-08-01T00:00:00Z",
      oldLinkEvidence: "e",
      oldLinkFailCount: 2,
    });
    expect(plan.skipped).toEqual([]);
  });

  test("skips stale CAS expectations instead of mutating them", () => {
    const plan = planApply(
      {
        unit: "DATA-05B",
        approvedBy: "owner",
        approvedAt: "2026-08-23T00:00:00Z",
        rows: [
          { id: 1, currentWebsite: "https://some-other-domain.com", reason: "stale expectation from an older report" },
        ],
      },
      fixtureReport(),
    );
    expect(plan.planned).toEqual([]);
    expect(plan.skipped).toEqual([{ id: 1, reason: "cas_drift_current_website_changed" }]);
  });

  test("skips unknown or already-cleared ids", () => {
    const plan = planApply(
      {
        unit: "DATA-05B",
        approvedBy: "owner",
        approvedAt: "2026-08-23T00:00:00Z",
        rows: [{ id: 999, currentWebsite: "https://x.com", reason: "id that does not exist in production" }],
      },
      fixtureReport(),
    );
    expect(plan.skipped).toEqual([{ id: 999, reason: "row_missing_or_already_cleared" }]);
  });

  test("refuses rows with no demonstrated support gap", () => {
    const plan = planApply(
      {
        unit: "DATA-05B",
        approvedBy: "owner",
        approvedAt: "2026-08-23T00:00:00Z",
        rows: [{ id: 3, currentWebsite: "https://www.metabase.com", reason: "clean row the tool must refuse to clear" }],
      },
      fixtureReport(),
    );
    expect(plan.planned).toEqual([]);
    expect(plan.skipped).toEqual([{ id: 3, reason: "no_demonstrated_support_gap" }]);
  });

  test("repeated-domain guard requires explicit review and never mutates silently", () => {
    const plan = planApply(
      {
        unit: "DATA-05B",
        approvedBy: "owner",
        approvedAt: "2026-08-23T00:00:00Z",
        rows: [{ id: 1, currentWebsite: "https://remotephjobs.com", reason: "anomalous but shared host without review flag" }],
      },
      fixtureReport(),
    );
    expect(plan.skipped).toEqual([{ id: 1, reason: "shared_domain_needs_explicit_review" }]);
  });

  test("aborts the whole apply when the approved set exceeds the cap", () => {
    const rows = Array.from({ length: MAX_APPLY_ROWS + 1 }, (_, i) => ({
      id: i + 100,
      currentWebsite: `https://host-${i}.com`,
      reason: "cap overflow probe row; never planned against real data",
    }));
    expect(() =>
      planApply(
        { unit: "DATA-05B", approvedBy: "owner", approvedAt: "2026-08-23T00:00:00Z", rows },
        { ...fixtureReport(), rows: [], sharedHostGroups: [] },
      ),
    ).toThrow(/hard cap/);
  });
});

// ─── Guarded SQL emission ─────────────────────────────────────────────────────

function plannedFixture() {
  const report = fixtureReport();
  return planApply(
    {
      unit: "DATA-05B",
      approvedBy: "owner",
      approvedAt: "2026-08-23T00:00:00Z",
      rows: [
        { id: 1, currentWebsite: "https://remotephjobs.com", reason: "cross-company host anomaly", sharedDomainReviewed: true },
      ],
    },
    report,
    new Date("2026-08-23T12:00:00Z"),
  );
}

describe("buildApplyStatements", () => {
  test("guards on exact expected website and records repair provenance", () => {
    const stmts = buildApplyStatements(plannedFixture());
    expect(stmts).toHaveLength(1);
    const stmt = stmts[0];
    expect(stmt).toContain("WHERE id = 1");
    expect(stmt).toContain("AND lower(rtrim(trim(website), '/')) = 'https://remotephjobs.com'");
    expect(stmt).toContain("website_source = 'repair_cleared'");
    expect(stmt).toContain("'2026-08-23T12:00:00.000Z'");
    expect(stmt).toContain("[repair DATA-05B ev=");
    expect(stmt).toContain("website = NULL");
    expect(stmt).toContain("link_status = NULL");
    expect(stmt).toContain("link_fail_count = 0");
  });

  test("escapes single quotes in expected values", () => {
    const plan = plannedFixture();
    plan.planned[0].expectedWebsite = "https://o'briens.example";
    const stmt = buildApplyStatements(plan)[0];
    expect(stmt).toContain("'https://o''briens.example'");
  });
});

describe("buildRestoreStatements", () => {
  test("restore is guarded on the repaired state so drift becomes a no-op", () => {
    const stmts = buildRestoreStatements(plannedFixture().undo);
    expect(stmts).toHaveLength(1);
    const stmt = stmts[0];
    expect(stmt).toContain("SET website = 'https://remotephjobs.com/'");
    expect(stmt).toContain("WHERE id = 1");
    expect(stmt).toContain("AND website IS NULL");
    expect(stmt).toContain("AND website_source = 'repair_cleared'");
    expect(stmt).toContain("link_fail_count = 2");
  });

  test("refuses malformed undo records instead of interpolating them", () => {
    const bad = [{ id: "1 OR 1=1", companyName: "Evil", oldWebsite: "https://x.com", oldLinkStatus: null, oldLinkCheckedAt: null, oldLinkEvidence: null, oldLinkFailCount: 0 }] as unknown as Parameters<typeof buildRestoreStatements>[0];
    expect(() => buildRestoreStatements(bad)).toThrow(/malformed record/);
  });
});

// ─── Execution round-trip: the emitted SQL must actually repair SQLite ────────

function repairableDb(): Database {
  const db = new Database(":memory:");
  // Minimal va_directory with the pre-0033 shape plus the provenance columns.
  db.exec(`
    CREATE TABLE va_directory (
      id INTEGER PRIMARY KEY,
      company_name TEXT NOT NULL,
      website TEXT,
      link_status TEXT,
      link_checked_at TEXT,
      link_evidence TEXT,
      link_fail_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      website_source TEXT,
      website_evidence TEXT,
      website_set_at TEXT
    );
  `);
  const insert = db.prepare(
    "INSERT INTO va_directory (id, company_name, website, link_status, link_checked_at, link_evidence, link_fail_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  // The three storage variants proven to coexist in production by migration
  // 0031's predicate list, plus a drifted row that must NOT be touched.
  insert.run(1, "Slash Co", "https://remotephjobs.com/", "ok", "2026-08-01T00:00:00Z", "ev", 2);
  insert.run(2, "Upper Co", "HTTPS://REMOTEPHJOBS.COM", null, null, null, 0);
  insert.run(3, "Bare Co", "https://remotephjobs.com", "bot_wall", null, null, 1);
  insert.run(4, "Drifted Co", "https://someone-else.com", null, null, null, 0);
  return db;
}

describe("apply SQL round-trip against bun:sqlite", () => {
  test("every planned statement changes exactly its row; drifted rows no-op", () => {
    const report = classifyReport({
      "report-totals": wrangler([{ total_rows: 4, with_website: 4, classified: 0 }]),
      "report-rows": wrangler([
        { id: 1, companyName: "Slash Co", website: "https://remotephjobs.com/", linkStatus: "ok", linkCheckedAt: "2026-08-01T00:00:00Z", linkEvidence: "ev", linkFailCount: 2, enrichWebsiteNote: 0 },
        { id: 2, companyName: "Upper Co", website: "HTTPS://REMOTEPHJOBS.COM", linkStatus: null, linkCheckedAt: null, linkEvidence: null, linkFailCount: 0, enrichWebsiteNote: 0 },
        { id: 3, companyName: "Bare Co", website: "https://remotephjobs.com", linkStatus: "bot_wall", linkCheckedAt: null, linkEvidence: null, linkFailCount: 1, enrichWebsiteNote: 0 },
      ]),
    });
    const plan = planApply(
      {
        unit: "DATA-05B",
        approvedBy: "owner",
        approvedAt: "2026-08-23T00:00:00Z",
        rows: [1, 2, 3].map((id) => ({
          id,
          currentWebsite: id === 2 ? "https://remotephjobs.com" : `https://remotephjobs.com${id === 1 ? "/" : ""}`,
          reason: "shared anomalous host across unrelated companies",
          sharedDomainReviewed: true,
        })),
      },
      report,
      new Date("2026-08-23T12:00:00Z"),
    );
    expect(plan.planned).toHaveLength(3);

    const db = repairableDb();
    try {
      for (const stmt of buildApplyStatements(plan)) {
        db.run(stmt);
      }
      const repaired = db.query("SELECT id, website, website_source FROM va_directory WHERE website_source = 'repair_cleared' ORDER BY id").all() as Array<{ id: number; website: string | null }>;
      // All three stored variants of the same value were actually cleared —
      // this pins the critic finding that lower(trim()) alone missed the
      // trailing-slash form.
      expect(repaired.map((r) => r.id)).toEqual([1, 2, 3]);
      expect(repaired.every((r) => r.website === null)).toBe(true);
      // The drifted row was untouched.
      const drifted = db.query("SELECT website, website_source FROM va_directory WHERE id = 4").get() as { website: string; website_source: string | null };
      expect(drifted.website).toBe("https://someone-else.com");
      expect(drifted.website_source).toBeNull();

      // Re-applying the same statements is a counted no-op (idempotent CAS).
      let changedAgain = 0;
      for (const stmt of buildApplyStatements(plan)) {
        const res = db.run(stmt);
        changedAgain += Number(res.changes ?? 0);
      }
      expect(changedAgain).toBe(0);

      // Undo restores the exact pre-repair values through the same guard.
      for (const stmt of buildRestoreStatements(plan.undo)) {
        db.run(stmt);
      }
      const restored = db.query("SELECT id, website, link_status, website_source FROM va_directory ORDER BY id").all() as Array<{ id: number; website: string | null; link_status: string | null; website_source: string | null }>;
      expect(restored[0]).toMatchObject({ id: 1, website: "https://remotephjobs.com/", link_status: "ok", website_source: null });
      expect(restored[2]?.website).toBe("https://remotephjobs.com");
      expect(restored.every((r) => r.website_source === null)).toBe(true);
    } finally {
      db.close();
    }
  });
});

// ─── Emitted SQL stays read-only ──────────────────────────────────────────────

describe("REPORT_QUERIES", () => {
  test("every emitted report statement is a SELECT", () => {
    for (const q of REPORT_QUERIES) {
      expect(q.sql.trim().toUpperCase().startsWith("SELECT")).toBe(true);
      expect(q.sql.toLowerCase()).not.toContain("insert ");
      expect(q.sql.toLowerCase()).not.toContain("update ");
      expect(q.sql.toLowerCase()).not.toContain("delete ");
      expect(q.sql.toLowerCase()).not.toContain("alter ");
    }
  });
});

describe("normalizeWebsite", () => {
  test("trims, lowercases, and strips trailing slashes", () => {
    expect(normalizeWebsite(" HTTPS://Example.COM/// ")).toBe("https://example.com");
  });
});
