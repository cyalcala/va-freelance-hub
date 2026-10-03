import { describe, expect, test } from "bun:test";
import {
  buildAshbyProviderProfile,
  buildAshbyCandidateRow,
  ASHBY_PROVIDER_ID,
  ASHBY_EVIDENCE_URL,
  ASHBY_EVIDENCE_LEASE_DAYS,
  ASHBY_ALLOWED_HOSTS,
  type AshbyProviderProfileRow,
  type AshbyCandidateRow,
  type AshbyBoardInput,
} from "./ashby-canary";
import {
  computeReviewDeadline,
  computePolicyExpiry,
} from "./source-lifecycle";
import { validateProviderProfileForDispatch } from "./shadow-dispatcher";

const NOW = "2026-09-05T12:00:00.000Z";

describe("ashby-canary — provider profile (MATH-03 supply bottleneck: 4 candidates, 146 positions)", () => {
  test("buildAshbyProviderProfile returns valid profile matching shadow-dispatcher enums", () => {
    const profile = buildAshbyProviderProfile();

    expect(profile.id).toBe(ASHBY_PROVIDER_ID);
    expect(profile.displayName).toBe("Ashby");
    expect(profile.providerFamily).toBe("ashby");
    expect(profile.mechanism).toBe("ats_api");
    expect(profile.authClass).toBe("none");
    expect(profile.endpointPattern).toBe("https://api.ashbyhq.com/posting-api/job-board/{token}");
    expect(profile.allowedHosts).toBe(ASHBY_ALLOWED_HOSTS);
    expect(profile.evidenceUrl).toBe(ASHBY_EVIDENCE_URL);
    expect(profile.evidenceLeaseDays).toBe(ASHBY_EVIDENCE_LEASE_DAYS);
    expect(profile.visibilityFilter).toBe("published");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.cadenceMinMinutes).toBe(60);
    expect(profile.cadenceMaxMinutes).toBe(1440);
    expect(profile.rateGuidance).toContain("unauthenticated");
    expect(profile.robotsHandling).toBe("observe");
    expect(profile.removalSemantics).toContain("reconciliation");
    expect(profile.defaultComplianceState).toBe("needs_review");
    expect(profile.defaultOperationalState).toBe("candidate");
    expect(profile.notes).toContain("ashbyhq.com");
  });

  test("provider profile passes shadow-dispatcher validation (mechanism, auth, visibility, contentScope)", () => {
    const profile = buildAshbyProviderProfile();
    const result = validateProviderProfileForDispatch({
      id: profile.id,
      providerFamily: profile.providerFamily,
      mechanism: profile.mechanism,
      authClass: profile.authClass,
      endpointPattern: profile.endpointPattern,
      allowedHosts: profile.allowedHosts,
      evidenceUrl: profile.evidenceUrl,
      evidenceLeaseDays: profile.evidenceLeaseDays,
      visibilityFilter: profile.visibilityFilter,
      contentScope: profile.contentScope,
      cadenceMinMinutes: profile.cadenceMinMinutes,
      cadenceMaxMinutes: profile.cadenceMaxMinutes,
      rateGuidance: profile.rateGuidance,
      robotsHandling: profile.robotsHandling,
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("provider profile uses only valid enum values per migration 0036 CHECK constraints", () => {
    const profile = buildAshbyProviderProfile();

    // These are the exact CHECK constraint values from migration 0036
    const validMechanisms = new Set(["syndication_feed", "public_api", "customer_auth", "partner_feed", "rss_feed", "public_html", "public_json_api", "ats_api"]);
    const validAuthClasses = new Set(["none", "api_key", "oauth", "partner_token", "customer_auth"]);
    const validVisibilityFilters = new Set(["published", "listed", "public", "indexable", "private"]);
    const validContentScopes = new Set(["minimal", "full", "metadata_only"]);

    expect(validMechanisms.has(profile.mechanism)).toBe(true);
    expect(validAuthClasses.has(profile.authClass)).toBe(true);
    expect(validVisibilityFilters.has(profile.visibilityFilter)).toBe(true);
    expect(validContentScopes.has(profile.contentScope)).toBe(true);
  });

  test("provider profile constants are correctly defined", () => {
    expect(ASHBY_PROVIDER_ID).toBe("ashby");
    expect(ASHBY_EVIDENCE_URL).toBe("https://developers.ashbyhq.com/docs/public-job-posting-api.md");
    expect(ASHBY_EVIDENCE_LEASE_DAYS).toBe(180);
    expect(ASHBY_ALLOWED_HOSTS).toBe("api.ashbyhq.com");
  });
});

describe("ashby-canary — candidate row generation (MATH-03: 4 high-yield candidates)", () => {
  const ashbyCandidates: AshbyBoardInput[] = [
    { token: "amplify", companyName: "Amplify", nowIso: NOW },
    { token: "camunda", companyName: "Camunda", nowIso: NOW },
    { token: "supabase", companyName: "Supabase", nowIso: NOW },
    { token: "tremendous", companyName: "Tremendous", nowIso: NOW },
  ];

  for (const candidate of ashbyCandidates) {
    test(`buildAshbyCandidateRow(${candidate.token}) generates correct candidate row`, () => {
      const row = buildAshbyCandidateRow(candidate);

      expect(row.sourceId).toBe(`ashby:${candidate.token}`);
      expect(row.providerId).toBe(ASHBY_PROVIDER_ID);
      expect(row.displayName).toBe(candidate.companyName);
      expect(row.endpointUrl).toBe(`https://api.ashbyhq.com/posting-api/job-board/${candidate.token}`);
      expect(row.companyToken).toBe(candidate.token);
      expect(row.complianceState).toBe("conditional");
      expect(row.operationalState).toBe("candidate");
      expect(row.canaryMaxNewItemsPerTick).toBe(2);
      expect(row.owner).toBe("techwriter-bot");
      expect(row.lastDecision).toBe("conditional minimal-index decision (public no-auth Ashby posting API)");
      expect(row.lastDecisionAt).toBe(NOW);
      expect(row.optOut).toBe(0);
    });

    test(`buildAshbyCandidateRow(${candidate.token}) provenance contains required fields`, () => {
      const row = buildAshbyCandidateRow(candidate);
      const provenance = JSON.parse(row.discoveryProvenance);

      expect(provenance.companyName).toBe(candidate.companyName);
      expect(provenance.token).toBe(candidate.token);
      expect(provenance.decidedAt).toBe(NOW);
      expect(provenance.provenance).toBe("ashby-ph-agency-qualification");
      expect(provenance.complianceBasis).toContain("developers.ashbyhq.com");
      expect(provenance.complianceBasis).toContain("conditional decision");
    });

    test(`buildAshbyCandidateRow(${candidate.token}) computes reviewDeadline and policyExpiry correctly`, () => {
      const row = buildAshbyCandidateRow(candidate);

      const expectedReviewDeadline = computeReviewDeadline(NOW, 14);
      const expectedPolicyExpiry = computePolicyExpiry(NOW, ASHBY_EVIDENCE_LEASE_DAYS);

      expect(row.reviewDeadline).toBe(expectedReviewDeadline);
      expect(row.policyExpiry).toBe(expectedPolicyExpiry);
    });

    test(`buildAshbyCandidateRow(${candidate.token}) respects custom reviewDeadlineDays`, () => {
      const customInput = { ...candidate, reviewDeadlineDays: 21 };
      const row = buildAshbyCandidateRow(customInput);

      const expectedReviewDeadline = computeReviewDeadline(NOW, 21);
      expect(row.reviewDeadline).toBe(expectedReviewDeadline);
      // policyExpiry unchanged
      expect(row.policyExpiry).toBe(computePolicyExpiry(NOW, ASHBY_EVIDENCE_LEASE_DAYS));
    });
  }

  test("all 4 candidates have distinct sourceIds and endpointUrls", () => {
    const rows = ashbyCandidates.map(c => buildAshbyCandidateRow(c));
    const sourceIds = rows.map(r => r.sourceId);
    const endpointUrls = rows.map(r => r.endpointUrl);

    expect(new Set(sourceIds).size).toBe(4);
    expect(new Set(endpointUrls).size).toBe(4);
    expect(sourceIds).toEqual(["ashby:amplify", "ashby:camunda", "ashby:supabase", "ashby:tremendous"]);
  });

  test("all 4 candidates share the same providerId and allowedHosts", () => {
    const rows = ashbyCandidates.map(c => buildAshbyCandidateRow(c));

    for (const row of rows) {
      expect(row.providerId).toBe(ASHBY_PROVIDER_ID);
      expect(row.endpointUrl).toContain(ASHBY_ALLOWED_HOSTS);
    }
  });
});

describe("ashby-canary — integration with source-lifecycle date functions", () => {
  test("computeReviewDeadline adds exact days to nowIso", () => {
    const base = "2026-09-05T12:00:00.000Z";
    expect(computeReviewDeadline(base, 14)).toBe("2026-09-19T12:00:00.000Z");
    expect(computeReviewDeadline(base, 7)).toBe("2026-09-12T12:00:00.000Z");
    expect(computeReviewDeadline(base, 21)).toBe("2026-09-26T12:00:00.000Z");
  });

  test("computePolicyExpiry adds leaseDays to nowIso", () => {
    const base = "2026-01-01T00:00:00.000Z";
    const p180 = computePolicyExpiry(base, 180);
    const p365 = computePolicyExpiry(base, 365);

    expect(Date.parse(p180)).toBe(Date.parse(base) + 180 * 86_400_000);
    expect(Date.parse(p365)).toBe(Date.parse(base) + 365 * 86_400_000);
  });

  test("Ashby candidate row uses 180-day evidence lease", () => {
    const row = buildAshbyCandidateRow({ token: "test", companyName: "Test", nowIso: NOW });
    const expectedExpiry = computePolicyExpiry(NOW, 180);
    expect(row.policyExpiry).toBe(expectedExpiry);
  });

  test("Ashby candidate row defaults to 14-day review deadline", () => {
    const row = buildAshbyCandidateRow({ token: "test", companyName: "Test", nowIso: NOW });
    const expectedDeadline = computeReviewDeadline(NOW, 14);
    expect(row.reviewDeadline).toBe(expectedDeadline);
  });
});

describe("ashby-canary — admission pipeline readiness (MATH-03 supply constraint)", () => {
  test("candidate row operationalState is 'candidate' (admission starts from candidate)", () => {
    const rows = ashbyCandidates.map(c => buildAshbyCandidateRow({ ...c, nowIso: NOW }));
    for (const row of rows) {
      expect(row.operationalState).toBe("candidate");
    }
  });

  test("candidate row complianceState is 'conditional' (eligible for shadow per shadow-dispatcher)", () => {
    const rows = ashbyCandidates.map(c => buildAshbyCandidateRow({ ...c, nowIso: NOW }));
    for (const row of rows) {
      expect(row.complianceState).toBe("conditional");
    }
  });

  test("candidate row has optOut = 0 (not opted out)", () => {
    const rows = ashbyCandidates.map(c => buildAshbyCandidateRow({ ...c, nowIso: NOW }));
    for (const row of rows) {
      expect(row.optOut).toBe(0);
    }
  });

  test("candidate row has positive canaryMaxNewItemsPerTick (rate bound for canary)", () => {
    const rows = ashbyCandidates.map(c => buildAshbyCandidateRow({ ...c, nowIso: NOW }));
    for (const row of rows) {
      expect(row.canaryMaxNewItemsPerTick).toBe(2);
      expect(row.canaryMaxNewItemsPerTick).toBeGreaterThan(0);
    }
  });

  test("candidate row endpointUrl uses https and correct host", () => {
    const rows = ashbyCandidates.map(c => buildAshbyCandidateRow({ ...c, nowIso: NOW }));
    for (const row of rows) {
      expect(row.endpointUrl).toMatch(/^https:\/\/api\.ashbyhq\.com\/posting-api\/job-board\//);
      const url = new URL(row.endpointUrl);
      expect(url.hostname).toBe("api.ashbyhq.com");
      expect(url.protocol).toBe("https:");
    }
  });

  test("provenance includes complianceBasis referencing public no-auth API", () => {
    const rows = ashbyCandidates.map(c => buildAshbyCandidateRow({ ...c, nowIso: NOW }));
    for (const row of rows) {
      const provenance = JSON.parse(row.discoveryProvenance);
      expect(provenance.complianceBasis).toContain("public/no-auth");
      expect(provenance.complianceBasis).toContain("Ashby posting API");
      expect(provenance.complianceBasis).toContain("developers.ashbyhq.com");
    }
  });
});

const ashbyCandidates = [
  { token: "amplify", companyName: "Amplify" },
  { token: "camunda", companyName: "Camunda" },
  { token: "supabase", companyName: "Supabase" },
  { token: "tremendous", companyName: "Tremendous" },
];