import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { buildDirectoryEvidenceQuery, directoryEvidenceBacklog, type DirectoryEvidenceRow } from "./directory-enrichment-backlog";

const row = (id: number, changes: Partial<DirectoryEvidenceRow> = {}): DirectoryEvidenceRow => ({
  id, companyName: `Company ${id}`, website: "https://example.org", hiringPageUrl: "https://example.org/careers",
  isVerified: 1, verifiedAt: "2026-10-01 00:00:00", atsPlatform: null, atsToken: null,
  websiteSource: "curated", websiteEvidence: "reviewed public company page", websiteSetAt: "2026-10-01 00:00:00",
  linkStatus: "ok", linkCheckedAt: "2026-10-01 00:00:00", publicVisible: 1, ...changes,
});

describe("directory evidence backlog", () => {
  test("measures overlapping gaps without inventing authority or websites", () => {
    const report = directoryEvidenceBacklog([row(1), row(2, {
      website: null, hiringPageUrl: null, isVerified: 0, verifiedAt: null,
      atsPlatform: "lever", atsToken: null, linkCheckedAt: null, linkStatus: null,
    })], "2026-10-08T10:00:00Z");
    expect(report.visibleRows).toBe(2);
    expect(report.visibleRowsWithGaps).toBe(1);
    expect(report.backlog[0].gaps).toEqual(["missing_website", "missing_hiring_path", "verification_evidence_gap", "incomplete_ats_identity", "link_evidence_gap"]);
    expect(report.backlog[0].nextAction).toContain("identity");
    expect(report.publicationAuthority).toBe("UNKNOWN");
  });

  test("unsafe links and unknown provenance outrank ordinary gaps deterministically", () => {
    const inputs = [row(9, { hiringPageUrl: null }), row(7, { websiteSource: null }), row(3, { website: "javascript:alert(1)" }), row(4, { publicVisible: 0 })];
    const report = directoryEvidenceBacklog(inputs);
    expect(report.backlog.map((entry) => entry.id)).toEqual([3, 7, 9]);
    expect(directoryEvidenceBacklog([...inputs].reverse()).backlog).toEqual(report.backlog);
    expect(report.hiddenRows).toBe(1);
    expect(report.backlog.find((entry) => entry.id === 7)?.gaps).toContain("website_provenance_gap");
  });

  test("credential URLs and invalid/future timestamps remain evidence gaps", () => {
    const report = directoryEvidenceBacklog([row(1, { website: "https://user:secret@example.org", verifiedAt: "tomorrow", linkCheckedAt: "2099-01-01" })], "2026-10-08T10:00:00Z");
    expect(report.backlog[0].gaps).toContain("unsafe_website");
    expect(report.backlog[0].gaps).toContain("verification_evidence_gap");
    expect(report.backlog[0].gaps).toContain("link_evidence_gap");
    expect(JSON.stringify(report)).not.toContain("secret");
  });

  test("uses public URL normalization: bare domains are valid, private hosts are not", () => {
    const report = directoryEvidenceBacklog([row(1, { website: "example.org" }), row(2, { website: "http://127.0.0.1" })]);
    expect(report.backlog.some((entry) => entry.id === 1)).toBe(false);
    expect(report.backlog.find((entry) => entry.id === 2)?.gaps).toContain("unsafe_website");
  });

  test("refuses truncated inventory, duplicate IDs and malformed flags", () => {
    expect(() => directoryEvidenceBacklog(Array.from({ length: 5001 }, (_, i) => row(i + 1)))).toThrow("limit");
    expect(() => directoryEvidenceBacklog([row(1), row(1)])).toThrow("duplicate");
    expect(() => directoryEvidenceBacklog([row(1, { publicVisible: 2 })])).toThrow("invalid");
  });

  test("query uses canonical visibility and includes hidden/unverified rows without notes", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`CREATE TABLE va_directory(id INTEGER, company_name TEXT, website TEXT, hiring_page_url TEXT, is_verified INTEGER, verified_at TEXT, ats_platform TEXT, ats_token TEXT, website_source TEXT, website_evidence TEXT, website_set_at TEXT, link_status TEXT, link_checked_at TEXT, hires_filipinos INTEGER, link_fail_count INTEGER);
        INSERT INTO va_directory(id,company_name,is_verified,hires_filipinos,link_fail_count) VALUES(1,'Unverified PH',0,1,0),(2,'Hidden',1,0,0),(3,'Three strikes',1,1,3);`);
      const rows = db.query(buildDirectoryEvidenceQuery()).all() as DirectoryEvidenceRow[];
      expect(rows.map((entry) => entry.publicVisible)).toEqual([1, 0, 0]);
      expect(buildDirectoryEvidenceQuery()).not.toMatch(/\bnotes\b/i);
    } finally { db.close(); }
  });
});
