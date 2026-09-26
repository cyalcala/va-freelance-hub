import { describe, it, expect } from "bun:test";
import { toContentHash } from "../../packages/scraper/contentHash";
import { geoGate } from "../../packages/scraper/geoGate";
import {
  computeFingerprint,
  isStorableCandidate,
  sha256Hex,
  truncatePayload,
} from "./lake-shared";
import {
  buildSyncSql,
  escapeSql,
  isSyncableCandidate,
  parseSyncArgs,
} from "./sync-to-d1";
import {
  AUTO_APPROVE_PH_RATE,
  AUTO_REJECT_PH_RATE,
  buildDiscoverySourceId,
  decideAdmissionDeterministic,
} from "./domain-ats-discovery";
import { resolveReplay } from "./replay-refinery";

describe("Turso Data Lake Refinery & Bridge Contracts", () => {
  it("computes deterministic, collision-resistant canonical content hashes", () => {
    const hash1 = toContentHash("Virtual Assistant", "https://example.com/jobs/1");
    const hash2 = toContentHash("Virtual Assistant", "https://example.com/jobs/1");
    const hash3 = toContentHash("Virtual Assistant", "https://example.com/jobs/2");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(16);
  });

  it("accurately classifies Philippine-eligible opportunities with geoGate", () => {
    const phJob = geoGate({
      title: "Executive Virtual Assistant",
      description: "We are hiring for our Philippine team. Must be remote.",
      locationRaw: "Philippines",
      tags: ["VA", "remote"],
    });

    expect(phJob.phEligibility).toBe("eligible_verified");
    expect(["ph_only", "apac_incl_ph"]).toContain(phJob.geoScope);
  });

  it("accurately excludes country-locked non-PH opportunities with geoGate", () => {
    const usJob = geoGate({
      title: "Senior Software Engineer",
      description: "Must reside in the US. W2 only.",
      locationRaw: "United States",
      tags: ["tech"],
    });

    expect(usJob.phEligibility).toBe("ineligible");
    expect(["country_locked", "region_excl_ph"]).toContain(usJob.geoScope);
  });

  it("treats ungrounded locations safely as unclear / ambiguous rather than false positive", () => {
    const unclearJob = geoGate({
      title: "Marketing Student Assistant",
      description: "Exciting opportunity in our international team.",
      locationRaw: "Remote",
      tags: [],
    });

    expect(unclearJob.phEligibility).toBe("unclear");
    expect(unclearJob.geoScope).toBe("unknown");
  });
});

describe("lake-shared fingerprint & payload helpers", () => {
  it("computes stable 32-hex fingerprints insensitive to case/punctuation", () => {
    const a = computeFingerprint("Acme Inc.", "Virtual-Assistant!", "https://acme.com/jobs/1");
    const b = computeFingerprint("acme inc", "virtual assistant", "https://www.acme.com/jobs/1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });

  it("separates fingerprints across company, title, and apply domain", () => {
    const base = computeFingerprint("Acme", "VA", "https://acme.com/1");
    expect(computeFingerprint("Other", "VA", "https://acme.com/1")).not.toBe(base);
    expect(computeFingerprint("Acme", "Designer", "https://acme.com/1")).not.toBe(base);
    expect(computeFingerprint("Acme", "VA", "https://other.com/1")).not.toBe(base);
  });

  it("sha256Hex is deterministic and truncatePayload caps length", () => {
    expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
    expect(sha256Hex("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(truncatePayload("x".repeat(10), 5)).toBe("xxxxx");
    expect(truncatePayload("short")).toBe("short");
  });

  it("isStorableCandidate rejects junk drafts missing title or url", () => {
    expect(isStorableCandidate({ title: "VA", sourceUrl: "https://x.com/1" })).toBe(true);
    expect(isStorableCandidate({ title: "  ", sourceUrl: "https://x.com/1" })).toBe(false);
    expect(isStorableCandidate({ title: "VA", sourceUrl: "" })).toBe(false);
    expect(isStorableCandidate({})).toBe(false);
  });
});

describe("sync-to-d1 SQL builder", () => {
  it("escapeSql doubles quotes, strips NUL, and maps null to NULL", () => {
    expect(escapeSql("o'clock")).toBe("'o''clock'");
    expect(escapeSql(null)).toBe("NULL");
    expect(escapeSql(undefined)).toBe("NULL");
    expect(escapeSql("a\0b")).toBe("'ab'");
  });

  it("isSyncableCandidate requires title and source_url", () => {
    expect(isSyncableCandidate({ title: "VA", source_url: "https://x.com/1" })).toBe(true);
    expect(isSyncableCandidate({ title: "", source_url: "https://x.com/1" })).toBe(false);
    expect(isSyncableCandidate({ title: "VA", source_url: " " })).toBe(false);
  });

  it("buildSyncSql emits an idempotent upsert with canonical hash", () => {
    const sql = buildSyncSql({
      id: 1,
      source_id: "we-work-remotely",
      source_platform: "WeWorkRemotely",
      source_url: "https://example.com/jobs/1",
      title: "Virtual Assistant",
      company: "Acme",
      category: "admin",
      location_raw: "Philippines",
      description: "Remote VA role",
      application_url: "https://example.com/jobs/1",
      posted_at: "2026-09-26T00:00:00.000Z",
      geo_scope: "ph_only",
      ph_eligibility: "eligible_verified",
      fingerprint_hash: "abc",
    });
    expect(sql).toContain("ON CONFLICT(source_url) DO UPDATE");
    expect(sql).toContain(toContentHash("Virtual Assistant", "https://example.com/jobs/1"));
    expect(sql).toContain("eligible_verified");
  });

  it("buildSyncSql keeps unknown posted_at NULL instead of fabricating now()", () => {
    const sql = buildSyncSql({
      id: 2,
      source_id: "remotive",
      source_platform: "Remotive",
      source_url: "https://example.com/jobs/2",
      title: "Virtual Assistant",
      company: "Acme",
      category: "admin",
      location_raw: "Remote",
      description: "Remote VA role",
      application_url: "https://example.com/jobs/2",
      posted_at: null,
      geo_scope: "apac_incl_ph",
      ph_eligibility: "eligible_likely",
      fingerprint_hash: "def",
    });
    // Unknown posting date stays NULL (sync time is recorded separately
    // in scraped_at/last_seen_in_feed_at); never fabricated as now().
    expect(sql).toContain(", NULL,");
  });

  it("buildSyncSql refuses to fabricate eligibility or worldwide scope", () => {
    const base = {
      id: 3,
      source_id: "remotive",
      source_platform: "Remotive",
      source_url: "https://example.com/jobs/3",
      title: "Virtual Assistant",
      company: "Acme",
      category: "admin",
      location_raw: "Remote",
      description: "Remote VA role",
      application_url: "https://example.com/jobs/3",
      posted_at: "2026-09-26T00:00:00.000Z",
      geo_scope: "",
      ph_eligibility: "eligible_likely",
      fingerprint_hash: "ghi",
    };
    // Empty geo_scope degrades honestly to 'unknown', never 'worldwide'.
    expect(buildSyncSql(base)).toContain("'unknown'");
    expect(buildSyncSql(base)).not.toContain("'worldwide'");
    // Non-eligible rows throw instead of defaulting to eligible_verified.
    expect(() => buildSyncSql({ ...base, ph_eligibility: "unclear" })).toThrow();
    expect(() => buildSyncSql({ ...base, ph_eligibility: "ineligible" })).toThrow();
  });

  it("parseSyncArgs defaults safely and never yields NaN", () => {
    expect(parseSyncArgs(["--dry-run"])).toEqual({ limit: 50, dryRun: true, allowAutoApproved: false });
    expect(parseSyncArgs([])).toEqual({ limit: 50, dryRun: false, allowAutoApproved: false });
    expect(parseSyncArgs(["5", "--dry-run"])).toEqual({ limit: 5, dryRun: true, allowAutoApproved: false });
    expect(parseSyncArgs(["10", "--allow-auto-approved"])).toEqual({ limit: 10, dryRun: false, allowAutoApproved: true });
    const parsed = parseSyncArgs(["not-a-number", "--dry-run"]);
    expect(Number.isFinite(parsed.limit)).toBe(true);
  });
});

describe("ATS discovery admission thresholds", () => {
  it("builds portable lowercase source ids", () => {
    expect(buildDiscoverySourceId("Greenhouse", "acme")).toBe("greenhouse:acme");
    expect(buildDiscoverySourceId("Breezy", "My-Co")).toBe("breezy:My-Co");
  });

  it("admits strong PH signal, shadows borderline, rejects weak signal", () => {
    expect(
      decideAdmissionDeterministic({
        totalJobs: 20,
        qualifiedReady: 10,
        excluded: 5,
        ambiguous: 5,
        phRate: 0.5,
        topCategories: ["support"],
      }).verdict
    ).toBe("ADMIT");

    expect(
      decideAdmissionDeterministic({
        totalJobs: 20,
        qualifiedReady: 2,
        excluded: 10,
        ambiguous: 8,
        phRate: (AUTO_APPROVE_PH_RATE + AUTO_REJECT_PH_RATE) / 2,
        topCategories: [],
      }).verdict
    ).toBe("SHADOW");

    expect(
      decideAdmissionDeterministic({
        totalJobs: 20,
        qualifiedReady: 0,
        excluded: 20,
        ambiguous: 0,
        phRate: 0,
        topCategories: [],
      }).verdict
    ).toBe("REJECT");

    // Too few jobs never admits
    expect(
      decideAdmissionDeterministic({
        totalJobs: 1,
        qualifiedReady: 1,
        excluded: 0,
        ambiguous: 0,
        phRate: 1,
        topCategories: [],
      }).verdict
    ).toBe("REJECT");
  });
});

describe("replay-refinery pure resolution", () => {
  it("recovers PH-eligible rows and excludes country-locked rows", () => {
    const recovered = resolveReplay({
      title: "Executive Virtual Assistant",
      description: "We are hiring for our Philippine team. Must be remote.",
      location_raw: "Philippines",
      status: "AMBIGUOUS",
      ph_eligibility: "unclear",
    });
    expect(recovered.changed).toBe(true);
    expect(recovered.newStatus).toBe("QUALIFIED_READY");

    const excluded = resolveReplay({
      title: "Senior Software Engineer",
      description: "Must reside in the US. W2 only.",
      location_raw: "United States",
      status: "AMBIGUOUS",
      ph_eligibility: "unclear",
    });
    expect(excluded.changed).toBe(true);
    expect(excluded.newStatus).toBe("EXCLUDED");
    expect(excluded.rejectionReason).toBeTruthy();
  });

  it("leaves genuinely unclear rows unchanged", () => {
    const same = resolveReplay({
      title: "Marketing Student Assistant",
      description: "Exciting opportunity in our international team.",
      location_raw: "Remote",
      status: "AMBIGUOUS",
      ph_eligibility: "unclear",
    });
    expect(same.changed).toBe(false);
    expect(same.newStatus).toBe("AMBIGUOUS");
  });
});
