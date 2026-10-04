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
  buildPublicationReceiptSql,
  escapeSql,
  isSyncableCandidate,
  parseSyncArgs,
  buildBatchSql,
} from "./sync-to-d1";
import {
  AUTO_APPROVE_PH_RATE,
  AUTO_REJECT_PH_RATE,
  buildDiscoverySourceId,
  decideAdmissionDeterministic,
  extractDiscoveryCandidatesFromRows,
  mergeAdmissionDecision,
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

  it("buildBatchSql does not wrap remote D1 statements in BEGIN/COMMIT", () => {
    const sql = buildBatchSql(["INSERT INTO opportunities (title) VALUES ('a');"]);
    expect(sql).not.toContain("BEGIN");
    expect(sql).not.toContain("COMMIT");
  });

  it("buildPublicationReceiptSql generates idempotent ledger insert with valid keys (F1 repair)", () => {
    const sql = buildPublicationReceiptSql("breezy:20four7va", 5, "2026-09-27T10:00:00.000Z");
    expect(sql).toContain("INSERT INTO source_publication_ledger");
    expect(sql).toContain("'breezy:20four7va'");
    expect(sql).toContain("'lake-sync:2026-09-27T10:00:00.000Z'");
    expect(sql).toContain("'lake-sync:2026-09-27T10:00:00.000Z:breezy:20four7va:5'");
    expect(sql).toContain("5, 5");
    expect(sql).toContain("'2026-09-27T10:00:00.000Z'");
  });

  it("parseSyncArgs defaults to automatic publish and keeps a kill switch", () => {
    expect(parseSyncArgs(["--dry-run"])).toEqual({ limit: 200, dryRun: true, holdAutoApproved: false });
    expect(parseSyncArgs([])).toEqual({ limit: 200, dryRun: false, holdAutoApproved: false });
    expect(parseSyncArgs(["5", "--dry-run"])).toEqual({ limit: 5, dryRun: true, holdAutoApproved: false });
    expect(parseSyncArgs(["10", "--allow-auto-approved"])).toEqual({ limit: 10, dryRun: false, holdAutoApproved: false });
    expect(parseSyncArgs(["--hold-auto-approved"])).toEqual({ limit: 200, dryRun: false, holdAutoApproved: true });
    const parsed = parseSyncArgs(["not-a-number", "--dry-run"]);
    expect(Number.isFinite(parsed.limit)).toBe(true);
  });
});

describe("ATS discovery admission thresholds", () => {
  it("builds portable lowercase source ids", () => {
    expect(buildDiscoverySourceId("Greenhouse", "acme")).toBe("greenhouse:acme");
    expect(buildDiscoverySourceId("Breezy", "My-Co")).toBe("breezy:My-Co");
    expect(buildDiscoverySourceId("Lever", "snappr")).toBe("lever:snappr");
    expect(buildDiscoverySourceId("Ashby", "the-studio")).toBe("ashby:the-studio");
  });

  it("does not let Jev hold a cohort whose Wilson bound already cleared", () => {
    const decision = mergeAdmissionDecision(
      {
        totalJobs: 306,
        qualifiedReady: 122,
        excluded: 184,
        ambiguous: 0,
        phRate: 122 / 306,
        topCategories: ["engineering"],
      },
      { choice: "SHADOW", confidence: 0.91 },
    );
    expect(decision.verdict).toBe("ADMIT");
  });

  it("lets a confident Jev verdict publish an ambiguous cohort", () => {
    const decision = mergeAdmissionDecision(
      {
        totalJobs: 40,
        qualifiedReady: 4,
        excluded: 36,
        ambiguous: 0,
        phRate: 0.1,
        topCategories: ["support"],
      },
      { choice: "ADMIT", confidence: 0.8 },
    );
    expect(decision.verdict).toBe("ADMIT");
  });

  it("does not let a maximally confident Jev ADMIT overturn a hard reject", () => {
    // Both hard-reject routes: ph_rate below the reject floor, and an
    // insufficient job sample. AI is L1 ADVISE (CONSTITUTION 2.2), so a
    // 0.99-confidence ADMIT must not widen admission for either.
    const belowFloor = {
      totalJobs: 38,
      qualifiedReady: 1,
      excluded: 37,
      ambiguous: 0,
      phRate: 1 / 38,
      topCategories: ["engineering"],
    };
    const tooFewJobs = {
      totalJobs: 2,
      qualifiedReady: 1,
      excluded: 1,
      ambiguous: 0,
      phRate: 0.5,
      topCategories: ["support"],
    };
    for (const metrics of [belowFloor, tooFewJobs]) {
      expect(decideAdmissionDeterministic(metrics).verdict).toBe("REJECT");
      const decision = mergeAdmissionDecision(metrics, { choice: "ADMIT", confidence: 0.99 });
      expect(decision.verdict).toBe("REJECT");
      expect(decision.reason).toBe(decideAdmissionDeterministic(metrics).reason);
    }
  });

  it("returns the identical hard-reject decision whether or not Jev answered", () => {
    // The load-bearing invariant for skipping the discarded Jev call on a hard
    // reject: the merge result is the deterministic decision itself, so the
    // verdict, confidence and reason cannot change when the answer is absent.
    // Only a receipt can differ, and merge writes none on this path.
    const metrics = {
      totalJobs: 38,
      qualifiedReady: 1,
      excluded: 37,
      ambiguous: 0,
      phRate: 1 / 38,
      topCategories: ["engineering"],
    };
    const deterministic = decideAdmissionDeterministic(metrics);
    const withJev = mergeAdmissionDecision(metrics, { choice: "ADMIT", confidence: 0.99 });
    const withoutJev = mergeAdmissionDecision(metrics, null);
    expect(deterministic.verdict).toBe("REJECT");
    expect(withJev).toEqual(deterministic);
    expect(withoutJev).toEqual(deterministic);
    expect(withJev.jevRaw).toBeUndefined();
    expect(withoutJev.jevRaw).toBeUndefined();
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

describe("Discovery Flywheel Candidate Extraction", () => {
  it("extracts direct ATS application links with pinned family and slug", () => {
    const rows = [
      {
        company: "Loadsmart",
        application_url: "https://jobs.lever.co/loadsmart/8040d7c3-cae0-47b7-bd66-df720ae02517",
      },
      {
        company: "20Four7VA",
        application_url: "https://20four7va.breezy.hr/p/40e266a5190b-b-cpt-11415",
      },
      {
        company: "Supabase",
        application_url: "https://jobs.ashbyhq.com/supabase/abc-123",
      },
      {
        company: "Hunt St",
        application_url: "https://apply.workable.com/hunt-st/j/ABC/",
      },
    ];

    const candidates = extractDiscoveryCandidatesFromRows(rows, 10);
    expect(candidates).toHaveLength(4);

    expect(candidates.find((c) => c.company === "Loadsmart")).toMatchObject({
      company: "Loadsmart",
      slug: "loadsmart",
      family: "lever",
    });

    expect(candidates.find((c) => c.company === "20Four7VA")).toMatchObject({
      company: "20Four7VA",
      slug: "20four7va",
      family: "breezy",
    });

    expect(candidates.find((c) => c.company === "Supabase")).toMatchObject({
      company: "Supabase",
      slug: "supabase",
      family: "ashby",
    });

    expect(candidates.find((c) => c.company === "Hunt St")).toMatchObject({
      company: "Hunt St",
      slug: "hunt-st",
      family: "workable",
    });
  });

  it("resolves known high-signal employer tokens with pinned family even on aggregator URLs", () => {
    const rows = [
      {
        company: "GitLab",
        application_url: "https://weworkremotely.com/remote-jobs/gitlab-staff-engineer",
      },
      {
        company: "Camunda",
        application_url: "https://www.realworkfromanywhere.com/jobs/camunda-engineer-123",
      },
    ];

    const candidates = extractDiscoveryCandidatesFromRows(rows, 10);
    expect(candidates).toHaveLength(2);

    expect(candidates[0]).toMatchObject({
      company: "GitLab",
      slug: "gitlab",
      family: "greenhouse",
    });

    expect(candidates[1]).toMatchObject({
      company: "Camunda",
      slug: "camunda",
      family: "ashby",
    });
  });

  it("derives candidate slugs from aggregator job postings for unknown employers", () => {
    const rows = [
      {
        company: "Salesloft",
        application_url: "https://weworkremotely.com/remote-jobs/salesloft-account-executive",
      },
      {
        company: "ClickUp",
        application_url: "https://jobicy.com/jobs/151244-technical-account-manager",
      },
    ];

    const candidates = extractDiscoveryCandidatesFromRows(rows, 10);
    expect(candidates.some((c) => c.slug === "salesloft" && c.family === undefined)).toBe(true);
    expect(candidates.some((c) => c.slug === "clickup" && c.family === undefined)).toBe(true);
  });

  it("deduplicates across multiple postings and suppresses unpinned slugs when family is resolved", () => {
    const rows = [
      {
        company: "Loadsmart",
        application_url: "https://jobs.lever.co/loadsmart/job-1",
      },
      {
        company: "Loadsmart",
        application_url: "https://jobs.lever.co/loadsmart/job-2",
      },
      {
        company: "Loadsmart",
        application_url: "https://weworkremotely.com/remote-jobs/loadsmart-remote-dispatch",
      },
    ];

    const candidates = extractDiscoveryCandidatesFromRows(rows, 10);
    // Should produce exactly 1 candidate: the pinned lever:loadsmart
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      company: "Loadsmart",
      slug: "loadsmart",
      family: "lever",
    });
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

describe("lake client transient error detection", () => {
  it("identifies network socket resets, timeouts, and gateway errors as transient", async () => {
    const { isTransientLakeError } = await import("./client");

    expect(isTransientLakeError({ code: "ECONNRESET" })).toBe(true);
    expect(isTransientLakeError({ code: "ETIMEDOUT" })).toBe(true);
    expect(isTransientLakeError({ code: "UND_ERR_SOCKET" })).toBe(true);
    expect(isTransientLakeError(new Error("fetch failed"))).toBe(true);
    expect(isTransientLakeError(new Error("socket hang up"))).toBe(true);
    expect(isTransientLakeError(new Error("502 Bad Gateway"))).toBe(true);
    expect(isTransientLakeError(new Error("504 Gateway Timeout"))).toBe(true);
  });

  it("does not classify permanent SQL syntax or integrity errors as transient", async () => {
    const { isTransientLakeError } = await import("./client");

    expect(isTransientLakeError(null)).toBe(false);
    expect(isTransientLakeError(new Error("no such table: fake_table"))).toBe(false);
    expect(isTransientLakeError(new Error("UNIQUE constraint failed: lake_candidate_jobs.source_url"))).toBe(false);
    expect(isTransientLakeError(new Error("syntax error at or near SELECT"))).toBe(false);
  });
});

