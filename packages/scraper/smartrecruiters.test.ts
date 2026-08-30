import { describe, it, expect } from "bun:test";
import {
  smartRecruitersListUrl,
  deriveSmartRecruitersSlug,
  deriveSmartRecruitersPostingUrl,
  parseSmartRecruitersListResponse,
  hasMoreSmartRecruitersPages,
  type SmartRecruitersListResponse,
} from "./smartrecruiters";

describe("smartrecruiters — list URL builder", () => {
  it("builds the exact public no-auth endpoint with offset/limit", () => {
    expect(smartRecruitersListUrl("smartrecruiters", 0, 100)).toBe(
      "https://api.smartrecruiters.com/v1/companies/smartrecruiters/postings?offset=0&limit=100",
    );
  });

  it("URL-encodes the company identifier", () => {
    expect(smartRecruitersListUrl("acme & co", 0, 10)).toContain("acme%20%26%20co");
  });
});

describe("smartrecruiters — slug derivation (verified against two real live postings)", () => {
  it("matches the real observed slug for a normal title", () => {
    // Real capture: id 744000143115219, name "Senior Information Security Engineer"
    // -> postingUrl .../744000143115219-senior-information-security-engineer
    expect(deriveSmartRecruitersSlug("Senior Information Security Engineer")).toBe(
      "senior-information-security-engineer",
    );
  });

  it("reproduces the trailing-hyphen behavior for a title with a trailing space", () => {
    // Real capture: id 744000137413079, name "Data Operations Consultant " (trailing space)
    // -> postingUrl .../744000137413079-data-operations-consultant- (trailing hyphen, not trimmed)
    expect(deriveSmartRecruitersSlug("Data Operations Consultant ")).toBe("data-operations-consultant-");
  });

  it("derivePostingUrl reconstructs the exact real observed URLs", () => {
    expect(deriveSmartRecruitersPostingUrl("smartrecruiters", "744000143115219", "Senior Information Security Engineer")).toBe(
      "https://jobs.smartrecruiters.com/smartrecruiters/744000143115219-senior-information-security-engineer",
    );
    expect(deriveSmartRecruitersPostingUrl("smartrecruiters", "744000137413079", "Data Operations Consultant ")).toBe(
      "https://jobs.smartrecruiters.com/smartrecruiters/744000137413079-data-operations-consultant-",
    );
  });
});

// Real, live-captured fixture (2026-08-30) from
// https://api.smartrecruiters.com/v1/companies/smartrecruiters/postings — the
// vendor's own dogfooded account, not synthesized.
const REAL_LIST_RESPONSE: SmartRecruitersListResponse = {
  offset: 0,
  limit: 2,
  totalFound: 2,
  content: [
    {
      id: "744000143115219",
      name: "Senior Information Security Engineer",
      company: { identifier: "smartrecruiters", name: "SmartRecruiters Inc" },
      releasedDate: "2026-08-12T14:04:56.128Z",
      location: { city: "Poland", region: "REMOTE", country: "pl", remote: true, hybrid: false, fullLocation: "Poland, REMOTE, Poland" },
      department: { label: "Engineering" },
      typeOfEmployment: { label: "Full-time" },
      visibility: "PUBLIC",
    },
    {
      id: "744000137413079",
      name: "Data Operations Consultant ",
      company: { identifier: "smartrecruiters", name: "SmartRecruiters Inc" },
      releasedDate: "2026-07-13T09:50:21.127Z",
      location: { city: "Poland", region: "Remote", country: "pl", remote: true, hybrid: false, fullLocation: "Poland, Remote, Poland" },
      department: { label: "Technical Services" },
      typeOfEmployment: { label: "Contract" },
      visibility: "PUBLIC",
    },
  ],
};

describe("smartrecruiters — parseSmartRecruitersListResponse (SP-13 criterion: minimal content, deterministic)", () => {
  it("normalizes real captured postings to minimal fields only", () => {
    const result = parseSmartRecruitersListResponse(REAL_LIST_RESPONSE, "smartrecruiters");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "744000143115219",
      title: "Senior Information Security Engineer",
      companyIdentifier: "smartrecruiters",
      postingUrl: "https://jobs.smartrecruiters.com/smartrecruiters/744000143115219-senior-information-security-engineer",
      locationSummary: "Poland, REMOTE, Poland",
      department: "Engineering",
      typeOfEmployment: "Full-time",
      postedAt: "2026-08-12T14:04:56.128Z",
    });
  });

  it("never includes a description/jobAd field — not present in input, not synthesized in output", () => {
    const result = parseSmartRecruitersListResponse(REAL_LIST_RESPONSE, "smartrecruiters");
    for (const p of result) {
      expect((p as any).jobAd).toBeUndefined();
      expect((p as any).description).toBeUndefined();
    }
  });

  it("filters out non-PUBLIC visibility postings (SP-13 criterion: active/public visibility)", () => {
    const withPrivate: SmartRecruitersListResponse = {
      ...REAL_LIST_RESPONSE,
      content: [...REAL_LIST_RESPONSE.content, { id: "999", name: "Internal Role", visibility: "INTERNAL" } as any],
    };
    const result = parseSmartRecruitersListResponse(withPrivate, "smartrecruiters");
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.id === "999")).toBeUndefined();
  });

  it("filters out postings with no visibility field at all (fail closed, not fail open)", () => {
    const withMissing: SmartRecruitersListResponse = {
      ...REAL_LIST_RESPONSE,
      content: [...REAL_LIST_RESPONSE.content, { id: "888", name: "Undeclared" } as any],
    };
    const result = parseSmartRecruitersListResponse(withMissing, "smartrecruiters");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for a malformed or missing content field", () => {
    expect(parseSmartRecruitersListResponse({ offset: 0, limit: 1, totalFound: 0, content: undefined as any }, "x")).toEqual([]);
    expect(parseSmartRecruitersListResponse(null as any, "x")).toEqual([]);
  });

  it("is pure — identical input yields identical output", () => {
    const a = parseSmartRecruitersListResponse(REAL_LIST_RESPONSE, "smartrecruiters");
    const b = parseSmartRecruitersListResponse(REAL_LIST_RESPONSE, "smartrecruiters");
    expect(a).toEqual(b);
  });
});

describe("smartrecruiters — pagination (SP-13 criterion: pagination deterministic and tested)", () => {
  it("hasMore is true when offset+limit < totalFound", () => {
    expect(hasMoreSmartRecruitersPages(250, 0, 100)).toBe(true);
    expect(hasMoreSmartRecruitersPages(250, 100, 100)).toBe(true);
  });

  it("hasMore is false once offset+limit reaches or exceeds totalFound", () => {
    expect(hasMoreSmartRecruitersPages(250, 200, 100)).toBe(false);
    expect(hasMoreSmartRecruitersPages(2, 0, 2)).toBe(false);
    expect(hasMoreSmartRecruitersPages(2, 0, 100)).toBe(false);
  });

  it("matches the real captured response (2 items, limit 2, totalFound 2 -> no more pages)", () => {
    expect(hasMoreSmartRecruitersPages(REAL_LIST_RESPONSE.totalFound, REAL_LIST_RESPONSE.offset, REAL_LIST_RESPONSE.limit)).toBe(false);
  });
});
