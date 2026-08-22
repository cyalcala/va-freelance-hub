import { test, expect, describe } from "bun:test";
import { getJobCategory } from "@/lib/categories";
import type { Opportunity } from "@/lib/db";

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
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
  } as Opportunity;
}

describe("DATA-06B stored-category display contract", () => {
  test("stored non-other categories are returned unchanged", () => {
    const slugs = [
      "customer-service",
      "admin",
      "marketing",
      "design",
      "tech",
      "finance",
    ];
    for (const slug of slugs) {
      expect(getJobCategory(makeOpportunity({ category: slug }))).toBe(slug);
    }
  });

  test("stored other is not reclassified by title or tags", () => {
    const opp = makeOpportunity({
      category: "other",
      title: "Senior React Developer",
      tags: ["engineer", "python", "full stack"],
    });
    expect(getJobCategory(opp)).toBe("other");
  });

  test("stored other survives every legacy reclassification family", () => {
    const familyTitles = [
      "SEO Growth Marketer",
      "UI Illustrator",
      "Customer Support Chat Agent",
      "Data Entry Admin HR",
      "Bookkeeper Payroll Billing",
      "Senior React Developer",
    ];
    for (const title of familyTitles) {
      expect(getJobCategory(makeOpportunity({ category: "other", title }))).toBe("other");
    }
  });

  test("stored category wins over techy titles in every board slug", () => {
    const cases: Array<[string, string]> = [
      ["admin", "Software Engineer Virtual Assistant"],
      ["marketing", "Developer Growth Marketer"],
      ["design", "Engineer UI Illustrator"],
      ["customer-service", "Backend Support Agent"],
      ["finance", "Python Bookkeeper"],
      ["tech", "Anything"],
    ];
    for (const [slug, title] of cases) {
      expect(getJobCategory(makeOpportunity({ category: slug, title }))).toBe(slug);
    }
  });

  test("missing or empty stored category falls back to other", () => {
    expect(getJobCategory(makeOpportunity({ category: null as any }))).toBe("other");
    expect(getJobCategory(makeOpportunity({ category: "" as any }))).toBe("other");
  });
});
