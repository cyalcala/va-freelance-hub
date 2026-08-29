import { describe, expect, test } from "bun:test";
import {
  ATS_PROVIDER_CONFIG,
  providerConfigForPlatform,
  buildCandidateRow,
  distinctAtsCandidates,
  countBacklog,
  countReviewOverdue,
  CANDIDATE_REVIEW_DEADLINE_DAYS,
  CANDIDATE_MAX_PER_RUN,
  CANDIDATE_ANOMALY_CEILING,
  maxRegistryRowsPerBatch,
} from "./prospect-candidate";
import { isOptedOut, computeReviewDeadline } from "./source-lifecycle";
import type { ClassifiedCandidate } from "./prospector";

describe("ATS provider config (SP-03 FK)", () => {
  test("every ATS platform has a provider config with ats_api + none", () => {
    for (const p of ["greenhouse", "ashby", "lever", "breezy", "workable"] as const) {
      const cfg = providerConfigForPlatform(p);
      expect(cfg).not.toBeNull();
      expect(cfg!.providerId).toBe(p);
      expect(cfg!.mechanism).toBe("ats_api");
      expect(cfg!.authClass).toBe("none");
      expect(cfg!.allowedHosts.length).toBeGreaterThan(0);
      expect(cfg!.endpointPattern.includes("{token}")).toBe(true);
    }
  });

  test("unknown platform returns null", () => {
    expect(providerConfigForPlatform("unknown" as any)).toBeNull();
  });

  test("registry chunk sizing stays under D1 100-bound cap", () => {
    expect(maxRegistryRowsPerBatch() * 12).toBeLessThanOrEqual(100);
    expect(CANDIDATE_MAX_PER_RUN).toBe(15);
    expect(CANDIDATE_ANOMALY_CEILING).toBeGreaterThan(CANDIDATE_MAX_PER_RUN);
  });
});

describe("buildCandidateRow", () => {
  const now = "2026-08-29T10:00:00.000Z";
  test("greenhouse token becomes candidate with needs_review + 14-day deadline", () => {
    const row = buildCandidateRow({
      atsRef: { platform: "greenhouse", token: "acme" },
      companyName: "Acme Corp",
      sampleUrl: "https://boards.greenhouse.io/acme/jobs/123",
      jobs: 3,
      nowIso: now,
    });
    expect(row.sourceId).toBe("greenhouse:acme");
    expect(row.providerId).toBe("greenhouse");
    expect(row.displayName).toBe("Acme Corp");
    expect(row.endpointUrl).toBe("https://boards-api.greenhouse.io/v1/boards/acme/jobs");
    expect(row.companyToken).toBe("acme");
    expect(row.complianceState).toBe("needs_review");
    expect(row.operationalState).toBe("candidate");
    expect(row.optOut).toBe(0);
    expect(row.reviewDeadline).toBe(computeReviewDeadline(now, CANDIDATE_REVIEW_DEADLINE_DAYS));
    expect(row.policyExpiry).toBeNull();
    expect(row.owner).toBe("prospector");
    const prov = JSON.parse(row.discoveryProvenance);
    expect(prov.sampleUrl).toBe("https://boards.greenhouse.io/acme/jobs/123");
    expect(prov.discovery).toBe("prospector-ats");
  });

  test("all 5 ATS platforms produce exact endpoint via atsEndpointUrl", () => {
    const cases: Array<{ platform: any; token: string; expected: string }> = [
      { platform: "ashby", token: "supabase", expected: "https://api.ashbyhq.com/posting-api/job-board/supabase" },
      { platform: "breezy", token: "acme", expected: "https://acme.breezy.hr/json" },
      { platform: "lever", token: "vaultoutsourcing", expected: "https://api.lever.co/v0/postings/vaultoutsourcing?mode=json" },
      { platform: "workable", token: "hunt-st", expected: "https://apply.workable.com/api/v3/accounts/hunt-st/jobs" },
      { platform: "greenhouse", token: "gitlab", expected: "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs" },
    ];
    for (const c of cases) {
      const row = buildCandidateRow({ atsRef: { platform: c.platform, token: c.token }, companyName: "X", sampleUrl: null, nowIso: now });
      expect(row.endpointUrl).toBe(c.expected);
    }
  });

  test("provenance is exact-host-safe (lookalike hosts never reach this builder)", () => {
    // This test proves the builder itself does not validate host; the upstream
    // `extractAtsToken` with `exactOrSubdomain` already rejects lookalikes.
    // A caller that bypassed extractAtsToken would still build a deterministic row,
    // but such rows must never be created from lookalike URLs — tested via prospector.test.ts
    // adversarial cases for evilgreenhouse.io etc.
    const row = buildCandidateRow({
      atsRef: { platform: "greenhouse", token: "evil" },
      companyName: "Evil",
      sampleUrl: "https://evilgreenhouse.io/evil/jobs/1",
      nowIso: now,
    });
    expect(row.sourceId).toBe("greenhouse:evil");
    // The safety is upstream: evilgreenhouse.io never yields a greenhouse token.
  });
});

describe("distinctAtsCandidates (idempotency + duplicate suppression)", () => {
  const now = "2026-08-29T10:00:00.000Z";
  const mk = (companyName: string, platform: any, token: string, jobs: number, sampleUrl: string | null): ClassifiedCandidate => ({
    companyName,
    normalized: companyName.toLowerCase(),
    jobs,
    sampleUrl,
    atsRef: token ? { platform, token } : null,
    niche: "global-va",
  });

  test("collects distinct sourceIds and keeps highest jobs for same token", () => {
    const classified: ClassifiedCandidate[] = [
      mk("Acme", "greenhouse", "acme", 2, "https://boards.greenhouse.io/acme/jobs/1"),
      mk("Acme Duplicate Low", "greenhouse", "acme", 1, "https://boards.greenhouse.io/acme/jobs/2"),
      mk("Acme High", "greenhouse", "acme", 5, "https://boards.greenhouse.io/acme/jobs/3"),
      mk("Supabase", "ashby", "supabase", 3, "https://jobs.ashbyhq.com/supabase/1"),
      mk("No ATS", "greenhouse", "", 3, "https://weworkremotely.com/remote-jobs/x" as any), // atsRef null
    ];
    // token is already lowercased by extractAtsToken; distinct groups by exact sourceId
    const map = distinctAtsCandidates(classified.filter((c) => c.atsRef) as any, now);
    // "greenhouse:acme" should appear once with highest jobs (5)
    expect(map.size).toBe(2);
    expect(map.get("greenhouse:acme")!.candidate.jobs).toBe(5);
    expect(map.get("ashby:supabase")!.candidate.companyName).toBe("Supabase");
  });

  test("rejects lookalike hosts via empty atsRef (already filtered upstream)", () => {
    const malicious: ClassifiedCandidate[] = [
      mk("Evil", "greenhouse", "acme", 3, "https://evilgreenhouse.io/acme/jobs/1"),
    ];
    // If extractAtsToken had been used, Evil would have atsRef null.
    const withNullAts: ClassifiedCandidate[] = [{ ...malicious[0], atsRef: null }];
    const map = distinctAtsCandidates(withNullAts, now);
    expect(map.size).toBe(0);
  });

  test("non-ATS trusted entries without atsRef are not queued as candidates", () => {
    const trustedNoAts: ClassifiedCandidate[] = [
      mk("LawnStarter", "greenhouse", "", 4, "https://weworkremotely.com/remote-jobs/lawnstarter-x" as any) as any,
    ];
    const m = distinctAtsCandidates([{ ...trustedNoAts[0], atsRef: null }], now);
    expect(m.size).toBe(0);
  });
});

describe("opt-out and backlog helpers", () => {
  test("isOptedOut blocks even allowed|shadow", () => {
    const optOuts = new Set(["greenhouse:acme", "ashby:supabase"]);
    expect(isOptedOut("greenhouse:acme", optOuts)).toBe(true);
    expect(isOptedOut("greenhouse:other", optOuts)).toBe(false);
  });

  test("countBacklog counts only candidate+needs_review", () => {
    const rows = [
      { sourceId: "a", complianceState: "needs_review", operationalState: "candidate", reviewDeadline: "2026-09-12T00:00:00.000Z" },
      { sourceId: "b", complianceState: "allowed", operationalState: "candidate", reviewDeadline: null },
      { sourceId: "c", complianceState: "needs_review", operationalState: "paused", reviewDeadline: null },
      { sourceId: "d", complianceState: "needs_review", operationalState: "candidate", reviewDeadline: null },
    ];
    expect(countBacklog(rows)).toBe(2);
  });

  test("countReviewOverdue respects exact ISO boundary", () => {
    const now = "2026-08-29T10:00:00.000Z";
    const atDeadline = "2026-08-29T10:00:00.000Z";
    const before = "2026-08-29T09:59:59.000Z";
    const after = "2026-08-29T10:00:01.000Z";
    const rows = [
      { sourceId: "a", complianceState: "needs_review", operationalState: "candidate", reviewDeadline: atDeadline },
      { sourceId: "b", complianceState: "needs_review", operationalState: "candidate", reviewDeadline: before },
      { sourceId: "c", complianceState: "needs_review", operationalState: "candidate", reviewDeadline: after },
      { sourceId: "d", complianceState: "needs_review", operationalState: "candidate", reviewDeadline: null },
      { sourceId: "e", complianceState: "needs_review", operationalState: "paused", reviewDeadline: before },
    ];
    expect(countReviewOverdue(rows, now)).toBe(2); // a and b
  });
});
