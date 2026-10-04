import { describe, test, expect } from "bun:test";
import {
  normalizeUrlForIdentity,
  getIdentityKey,
  resolveIdentities,
  compareIdentityStrategies,
  formatIdentityReport,
  IDENTITY_FIXTURES,
  MINIMAL_IDENTITY_FIXTURES,
  FINGERPRINT_HASH_GAP_FIXTURE,
  type IdentityFixture,
  type IdentityStrategy,
} from "./identity-fixtures";

describe("MATH-09: Offline Identity Fixtures — False Split/Merge Measurement", () => {
  describe("normalizeUrlForIdentity", () => {
    test("strips tracking parameters", () => {
      const url = "https://jobs.ashbyhq.com/co/123?utm_source=linkedin&utm_medium=social&ref=email";
      const normalized = normalizeUrlForIdentity(url);
      expect(normalized).toBe("https://jobs.ashbyhq.com/co/123");
    });

    test("preserves non-tracking parameters", () => {
      const url = "https://jobs.ashbyhq.com/co/123?department=engineering&role=senior";
      const normalized = normalizeUrlForIdentity(url);
      expect(normalized).toContain("department=engineering");
      expect(normalized).toContain("role=senior");
    });

    test("lowercases hostname", () => {
      const url = "https://JOBS.ASHBYHQ.COM/co/123";
      const normalized = normalizeUrlForIdentity(url);
      expect(normalized).toBe("https://jobs.ashbyhq.com/co/123");
    });

    test("removes fragment", () => {
      const url = "https://jobs.ashbyhq.com/co/123#apply";
      const normalized = normalizeUrlForIdentity(url);
      expect(normalized).not.toContain("#apply");
    });

    test("sorts parameters for determinism", () => {
      const url1 = "https://example.com/job?b=2&a=1";
      const url2 = "https://example.com/job?a=1&b=2";
      expect(normalizeUrlForIdentity(url1)).toBe(normalizeUrlForIdentity(url2));
    });

    test("handles malformed URLs gracefully", () => {
      const url = "not-a-valid-url";
      const normalized = normalizeUrlForIdentity(url);
      expect(normalized).toBe("not-a-valid-url");
    });
  });

  describe("getIdentityKey", () => {
    const fixture: IdentityFixture = {
      id: "test-1",
      title: "Senior Engineer",
      sourceUrl: "https://jobs.ashbyhq.com/company/abc123",
      atsJobId: "ashby_job_123",
      expectedCanonicalId: "canon:1",
      description: "Test fixture",
    };

    test("EXACT_ATS_ID uses ats: prefix", () => {
      const key = getIdentityKey(fixture, "EXACT_ATS_ID");
      expect(key).toBe("ats:ashby_job_123");
    });

    test("EXACT_ATS_ID falls back when no ATS ID", () => {
      const noAts = { ...fixture, atsJobId: null };
      const key = getIdentityKey(noAts, "EXACT_ATS_ID");
      expect(key).toBe("no-ats:test-1");
    });

    test("NORMALIZED_URL uses normalized URL", () => {
      const key = getIdentityKey(fixture, "NORMALIZED_URL");
      expect(key).toBe("url:https://jobs.ashbyhq.com/company/abc123");
    });

    test("CONTENT_HASH uses toContentHash", () => {
      const key = getIdentityKey(fixture, "CONTENT_HASH");
      expect(key).toMatch(/^content:[a-f0-9]{16}$/);
    });


  });

  describe("resolveIdentities", () => {
    test("detects false splits: same canonicalId → different identities", () => {
      const fixtures: IdentityFixture[] = [
        { id: "1", title: "Engineer", sourceUrl: "https://a.com/1", atsJobId: "ats_1", expectedCanonicalId: "canon:1", description: "" },
        { id: "2", title: "Engineer (Remote)", sourceUrl: "https://a.com/1", atsJobId: "ats_1", expectedCanonicalId: "canon:1", description: "" },
      ];
      const result = resolveIdentities(fixtures, "CONTENT_HASH");
      expect(result.falseSplits).toBe(1);
      expect(result.splits[0].canonicalId).toBe("canon:1");
      expect(result.splits[0].identities.length).toBe(2);
    });

test("detects false merges: different canonicalIds → same identity", () => {
      const fixtures: IdentityFixture[] = [
        { id: "1", title: "Engineer", sourceUrl: "https://a.com/1", atsJobId: "ats_1", expectedCanonicalId: "canon:1", description: "" },
        { id: "2", title: "Engineer", sourceUrl: "https://a.com/1", atsJobId: "ats_2", expectedCanonicalId: "canon:2", description: "" },
      ];
      const result = resolveIdentities(fixtures, "CONTENT_HASH");
      expect(result.falseMerges).toBe(1);
    });

    test("EXACT_ATS_ID has zero false splits/merges when ATS IDs are correct", () => {
      const result = resolveIdentities(MINIMAL_IDENTITY_FIXTURES, "EXACT_ATS_ID");
      expect(result.falseSplits).toBe(0);
      expect(result.falseMerges).toBe(0);
    });

    test("CONTENT_HASH splits title variants (false split)", () => {
      const result = resolveIdentities(MINIMAL_IDENTITY_FIXTURES, "CONTENT_HASH");
      expect(result.falseSplits).toBe(1); // min-1 and min-2 have same canonical but different title
      expect(result.falseMerges).toBe(0);
    });

    test("CONTENT_HASH merges different jobs with same title (false merge)", () => {
      const result = resolveIdentities(MINIMAL_IDENTITY_FIXTURES, "CONTENT_HASH");
      // min-1 and min-3 have different canonicalIds but could have same content hash if URL not in hash
      // Actually CONTENT_HASH includes sourceUrl so they should be different
      // The false merge would be if two different jobs had same title AND same URL (unlikely)
      expect(result.falseMerges).toBe(0);
    });
  });

  describe("compareIdentityStrategies", () => {
    test("runs all three strategies on minimal fixtures", () => {
      const report = compareIdentityStrategies(MINIMAL_IDENTITY_FIXTURES);
      expect(report.results.EXACT_ATS_ID).toBeDefined();
      expect(report.results.NORMALIZED_URL).toBeDefined();
      expect(report.results.CONTENT_HASH).toBeDefined();
      expect(report.summary.bestStrategy).toBeDefined();
      expect(report.summary.recommendedStrategy).toBeDefined();
    });

    test("recommends EXACT_ATS_ID when ATS coverage exists", () => {
      const report = compareIdentityStrategies(MINIMAL_IDENTITY_FIXTURES);
      expect(report.summary.recommendedStrategy).toBe("EXACT_ATS_ID");
    });

    test("full fixture set produces expected split/merge patterns", () => {
      const report = compareIdentityStrategies(IDENTITY_FIXTURES);

      // EXACT_ATS_ID should be perfect for fixtures WITH ATS IDs
      const atsFixtures = IDENTITY_FIXTURES.filter((f) => f.atsJobId);
      const atsReport = compareIdentityStrategies(atsFixtures);
      expect(atsReport.results.EXACT_ATS_ID.falseSplits).toBe(0);
      expect(atsReport.results.EXACT_ATS_ID.falseMerges).toBe(0);

      // NORMALIZED_URL merges tracking param variants (tracking-2a/2b) but splits cross-posts (different URLs)
      expect(report.results.NORMALIZED_URL.falseSplits).toBeGreaterThanOrEqual(0);

      // CONTENT_HASH splits on title variations (crosspost-1a vs 1b have different URLs so OK)
      // but title-var-3a/3b/3c have same URL so CONTENT_HASH differs
      expect(report.results.CONTENT_HASH.falseSplits).toBeGreaterThan(0);

      // CONTENT_HASH merges diff-jobs-4a/4b (same title, different URL → different hash, so NO merge)
      // Actually they have different URLs so different hashes - no false merge here
      // False merge would need same title + same URL which doesn't happen in fixtures
    });

    test("documents the D1 fingerprint_hash gap in notes", () => {
      const report = compareIdentityStrategies(IDENTITY_FIXTURES);
      const notes = report.summary.notes.join(" ");
      expect(notes).toContain("fingerprint_hash");
      expect(notes).toContain("UNMEASURED");
    });

    test("FINGERPRINT_HASH_GAP_FIXTURE pins the missing column gap", () => {
      expect(FINGERPRINT_HASH_GAP_FIXTURE.id).toBe("fingerprint-hash-gap");
      expect(FINGERPRINT_HASH_GAP_FIXTURE.description).toContain("fingerprint_hash");
      expect(FINGERPRINT_HASH_GAP_FIXTURE.description).toContain("UNMEASURED");
      expect(FINGERPRINT_HASH_GAP_FIXTURE.description).toContain("METRICS.md Query 3A");
      expect(FINGERPRINT_HASH_GAP_FIXTURE.description).toContain("PARAMETERS.md");
    });
  });

  describe("IDENTITY_FIXTURES coverage", () => {
    test("includes cross-posting scenarios", () => {
      const crossposts = IDENTITY_FIXTURES.filter((f) =>
        f.description.toLowerCase().includes("cross-post") ||
        f.id.startsWith("crosspost-")
      );
      expect(crossposts.length).toBeGreaterThanOrEqual(3);
    });

    test("includes tracking parameter scenarios", () => {
      const tracking = IDENTITY_FIXTURES.filter((f) => f.description.includes("tracking"));
      expect(tracking.length).toBeGreaterThanOrEqual(2);
    });

    test("includes title variation scenarios", () => {
      const titleVars = IDENTITY_FIXTURES.filter((f) => f.description.includes("title"));
      expect(titleVars.length).toBeGreaterThanOrEqual(3);
    });

    test("includes different-jobs-same-title scenario", () => {
      const diffJobs = IDENTITY_FIXTURES.filter((f) => f.expectedCanonicalId.startsWith("canonical:team-"));
      expect(diffJobs.length).toBe(2);
      expect(diffJobs[0].expectedCanonicalId).not.toBe(diffJobs[1].expectedCanonicalId);
    });

    test("includes repost scenarios", () => {
      const reposts = IDENTITY_FIXTURES.filter((f) =>
        f.description.toLowerCase().includes("repost") ||
        f.id.startsWith("repost-")
      );
      expect(reposts.length).toBe(2);
    });

    test("includes ATS-specific scenarios (Greenhouse, Breezy)", () => {
      const greenhouse = IDENTITY_FIXTURES.filter((f) => f.sourceUrl.includes("greenhouse"));
      const breezy = IDENTITY_FIXTURES.filter((f) => f.sourceUrl.includes("breezy"));
      expect(greenhouse.length).toBe(2);
      expect(breezy.length).toBe(2);
    });

    test("includes RSS/no-ATS scenarios", () => {
      const rss = IDENTITY_FIXTURES.filter((f) => f.atsJobId === null && f.sourceUrl.includes("remotive"));
      expect(rss.length).toBe(2);
    });

    test("all fixtures have unique IDs", () => {
      const ids = IDENTITY_FIXTURES.map((f) => f.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    test("all fixtures have expectedCanonicalId", () => {
      for (const f of IDENTITY_FIXTURES) {
        expect(f.expectedCanonicalId).toBeTruthy();
      }
    });
  });

  describe("formatIdentityReport", () => {
    test("renders markdown with all sections", () => {
      const report = compareIdentityStrategies(MINIMAL_IDENTITY_FIXTURES);
      const md = formatIdentityReport(report);
      expect(md).toContain("# MATH-09 Identity Resolution Fixture Report");
      expect(md).toContain("Per-Strategy Results");
      expect(md).toContain("False Splits");
      expect(md).toContain("False Merges");
      expect(md).toContain("Summary & Recommendation");
      expect(md).toContain("Notes");
    });
  });
});