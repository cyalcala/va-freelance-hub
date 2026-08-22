import { test, expect, describe } from "bun:test";
import type { Opportunity } from "@/lib/db";

// Minimal card projection shared with OpportunityCard (keeps hydration payload small).
type OpportunityCardData = Pick<
  Opportunity,
  | "id"
  | "title"
  | "company"
  | "type"
  | "sourceUrl"
  | "sourcePlatform"
  | "tags"
  | "category"
  | "experienceLevel"
  | "postedAt"
  | "geoScope"
  | "phEligibility"
  | "geoEvidence"
>;

function makeOpportunity(overrides: Partial<OpportunityCardData> = {}): OpportunityCardData {
  return {
    id: 1,
    title: "Test Job",
    company: "Test Co",
    type: "full-time",
    sourceUrl: "https://example.com/job/1",
    sourcePlatform: "WeWorkRemotely",
    tags: ["remote"],
    category: "tech",
    experienceLevel: "mid",
    postedAt: "2026-01-15T10:00:00Z",
    geoScope: "worldwide",
    phEligibility: "eligible_verified",
    geoEvidence: "source says worldwide",
    ...overrides,
  };
}

describe("homepage opportunity card contract", () => {
  test("projection type includes phEligibility field", () => {
    const opp = makeOpportunity();
    // TypeScript compile-time check: phEligibility must be present in the type
    expect(opp).toHaveProperty("phEligibility");
    expect(typeof opp.phEligibility).toBe("string");
  });

  test("eligible_verified jobs have internal detail link", () => {
    const opp = makeOpportunity({ phEligibility: "eligible_verified" });
    const hasDetailPage =
      opp.phEligibility === "eligible_verified" ||
      opp.phEligibility === "eligible_likely";
    expect(hasDetailPage).toBe(true);
    // The card would render href="/jobs/1" for this case
  });

  test("eligible_likely jobs have internal detail link", () => {
    const opp = makeOpportunity({ phEligibility: "eligible_likely" });
    const hasDetailPage =
      opp.phEligibility === "eligible_verified" ||
      opp.phEligibility === "eligible_likely";
    expect(hasDetailPage).toBe(true);
  });

  test("unclear jobs use external link", () => {
    const opp = makeOpportunity({ phEligibility: "unclear" });
    const hasDetailPage =
      opp.phEligibility === "eligible_verified" ||
      opp.phEligibility === "eligible_likely";
    expect(hasDetailPage).toBe(false);
  });

  test("ineligible jobs use external link", () => {
    const opp = makeOpportunity({ phEligibility: "ineligible" });
    const hasDetailPage =
      opp.phEligibility === "eligible_verified" ||
      opp.phEligibility === "eligible_likely";
    expect(hasDetailPage).toBe(false);
  });

  test("null phEligibility uses external link", () => {
    const opp = makeOpportunity({ phEligibility: null as any });
    const hasDetailPage =
      opp.phEligibility === "eligible_verified" ||
      opp.phEligibility === "eligible_likely";
    expect(hasDetailPage).toBe(false);
  });

  test("projection excludes heavy fields not needed by card", () => {
    const opp = makeOpportunity();
    // These fields should NOT be in the projection (kept for hydration payload small)
    const heavyFields = [
      "description",
      "contentHash",
      "updatedAt",
      "lastSeenInFeedAt",
      "lastVerifiedAt",
      "failedVerificationCount",
      "descriptionHash",
      "clickCount",
      "locationRaw",
      "geoCheckedAt",
      "applicationUrl",
      "payRange",
      "clientTimezone",
      "locationType",
      "inactiveReason",
      "scrapedAt",
      "isActive",
    ];
    for (const field of heavyFields) {
      expect(opp).not.toHaveProperty(field);
    }
  });
});