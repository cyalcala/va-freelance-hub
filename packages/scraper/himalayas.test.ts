import { describe, expect, it } from "bun:test";
import {
  parseHimalayasPubDate,
  parseLocationRestrictions,
  normalizeHimalayasPayRange,
  parseHimalayasResponse,
  filterHimalayasPlausibleCandidates,
  himalayasJobToOpportunity,
  HIMALAYAS_SOURCE_ID,
  type RawHimalayasResponse,
} from "./himalayas";
import {
  buildHimalayasProviderProfile,
  buildHimalayasCandidateRow,
  HIMALAYAS_PROVIDER_ID,
} from "./himalayas-canary";

describe("Himalayas Adapter — Pure Parsing & Normalization", () => {
  it("parseHimalayasPubDate correctly parses seconds, ms, strings, and handles invalid dates", () => {
    // 1790339147 seconds -> ~2026
    const secParsed = parseHimalayasPubDate(1790339147);
    expect(secParsed).toBe(new Date(1790339147 * 1000).toISOString());

    // ms
    const ms = 1790339147000;
    expect(parseHimalayasPubDate(ms)).toBe(new Date(ms).toISOString());

    // numeric string
    expect(parseHimalayasPubDate("1790339147")).toBe(new Date(1790339147 * 1000).toISOString());

    // ISO string
    const iso = "2026-09-25T12:00:00.000Z";
    expect(parseHimalayasPubDate(iso)).toBe(iso);

    // Invalid / empty
    expect(parseHimalayasPubDate(null)).toBeNull();
    expect(parseHimalayasPubDate(undefined)).toBeNull();
    expect(parseHimalayasPubDate("")).toBeNull();
    expect(parseHimalayasPubDate(0)).toBeNull();
    expect(parseHimalayasPubDate("not-a-date")).toBeNull();
  });

  it("parseLocationRestrictions extracts countries, Worldwide, and Philippines flags", () => {
    // Explicit Philippines
    const phResult = parseLocationRestrictions("Philippines");
    expect(phResult.isPhilippinesExplicit).toBe(true);
    expect(phResult.isWorldwide).toBe(false);
    expect(phResult.locations).toEqual(["Philippines"]);

    // Array containing Philippines
    const phArray = parseLocationRestrictions(["United States", "Philippines", "Canada"]);
    expect(phArray.isPhilippinesExplicit).toBe(true);
    expect(phArray.isWorldwide).toBe(false);

    // Worldwide string
    const wwResult = parseLocationRestrictions("Worldwide");
    expect(wwResult.isWorldwide).toBe(true);
    expect(wwResult.isPhilippinesExplicit).toBe(false);

    // Anywhere string
    const anyResult = parseLocationRestrictions("Anywhere in the world");
    expect(anyResult.isWorldwide).toBe(true);

    // Non-PH country locked
    const nlResult = parseLocationRestrictions("Netherlands");
    expect(nlResult.isWorldwide).toBe(false);
    expect(nlResult.isPhilippinesExplicit).toBe(false);
    expect(nlResult.locations).toEqual(["Netherlands"]);

    // Empty / null defaults to Worldwide
    expect(parseLocationRestrictions(null).isWorldwide).toBe(true);
    expect(parseLocationRestrictions([]).isWorldwide).toBe(true);
  });

  it("normalizeHimalayasPayRange formats salary ranges cleanly", () => {
    expect(normalizeHimalayasPayRange(50000, 80000, "USD", "Year")).toBe("USD 50,000-80,000 / year");
    expect(normalizeHimalayasPayRange(3000, null, "USD", "Month")).toBe("USD 3,000 / month");
    expect(normalizeHimalayasPayRange(null, 50, "USD", "Hour")).toBe("USD 50 / hour");
    expect(normalizeHimalayasPayRange(null, null, "USD", "Year")).toBeNull();
    expect(normalizeHimalayasPayRange(0, 0, "USD", "Year")).toBeNull();
  });

  it("parseHimalayasResponse extracts valid jobs and rejects malformed items", () => {
    const mockResponse: RawHimalayasResponse = {
      total_count: 3,
      jobs: [
        {
          title: "Executive Virtual Assistant",
          companyName: "Core-VA Solutions",
          companySlug: "core-va-solutions",
          applicationLink: "https://himalayas.app/companies/core-va/jobs/va-role",
          guid: "https://himalayas.app/companies/core-va/jobs/va-role",
          pubDate: 1790339147,
          locationRestrictions: "Philippines",
          employmentType: "Full Time",
          categories: ["Admin", "Virtual Assistant"],
          minSalary: 1200,
          maxSalary: 1800,
          currency: "USD",
          salaryPeriod: "Month",
          excerpt: "<p>Looking for a talented <b>Virtual Assistant</b> in the Philippines.</p>",
        },
        {
          title: "Senior Content Engineer",
          companyName: "Lingo.dev",
          companySlug: "lingo-dev",
          applicationLink: "https://himalayas.app/companies/lingo-dev/jobs/engineer",
          pubDate: "2026-09-25T10:00:00Z",
          locationRestrictions: "Worldwide",
          employmentType: "Contractor",
          categories: ["Engineering", "Developer"],
          excerpt: "Remote content engineer anywhere in the world.",
        },
        {
          // Missing required companyName -> should be skipped
          title: "Invalid Role",
          applicationLink: "https://example.com/apply",
        },
        {
          // Country locked non-PH
          title: "Dentist",
          companyName: "Dutch Dental",
          applicationLink: "https://himalayas.app/jobs/dutch-dentist",
          locationRestrictions: "Netherlands",
        },
      ],
    };

    const parsed = parseHimalayasResponse(mockResponse);
    expect(parsed.length).toBe(3); // 2 valid + 1 non-PH valid

    // Check first job
    const job1 = parsed[0];
    expect(job1.title).toBe("Executive Virtual Assistant");
    expect(job1.companyName).toBe("Core-VA Solutions");
    expect(job1.isPhilippinesExplicit).toBe(true);
    expect(job1.isWorldwide).toBe(false);
    expect(job1.excerpt).toBe("Looking for a talented Virtual Assistant in the Philippines.");
    expect(job1.minSalary).toBe(1200);

    // Check plausible filter
    const plausible = filterHimalayasPlausibleCandidates(parsed);
    expect(plausible.length).toBe(2); // Core-VA (PH) + Lingo.dev (Worldwide); Dutch Dental excluded
    expect(plausible.map((j) => j.companyName)).toEqual(["Core-VA Solutions", "Lingo.dev"]);
  });

  it("himalayasJobToOpportunity maps cleanly to NewOpportunity shape", () => {
    const job = {
      title: "Customer Support Specialist",
      companyName: "SupportNinja",
      companySlug: "supportninja",
      applicationLink: "https://himalayas.app/companies/supportninja/jobs/cs-rep",
      guid: "guid-supportninja-cs",
      postedAt: "2026-09-25T11:00:00.000Z",
      employmentType: "Full Time",
      categories: ["customer support", "operations"],
      locationRestrictions: ["Philippines"],
      isWorldwide: false,
      isPhilippinesExplicit: true,
      minSalary: 800,
      maxSalary: 1200,
      currency: "USD",
      salaryPeriod: "Month",
      excerpt: "Dedicated customer support representative role.",
    };

    const opp = himalayasJobToOpportunity(job);
    expect(opp.title).toBe("Customer Support Specialist");
    expect(opp.company).toBe("SupportNinja");
    expect(opp.type).toBe("full-time");
    expect(opp.sourceUrl).toBe("https://himalayas.app/companies/supportninja/jobs/cs-rep");
    expect(opp.sourcePlatform).toBe("Himalayas");
    expect(opp.locationType).toBe("remote");
    expect(opp.locationRaw).toBe("Philippines (Remote)");
    expect(opp.payRange).toBe("USD 800-1,200 / month");
    expect(opp.description).toBe("Dedicated customer support representative role.");
    expect(opp.postedAt).toBe("2026-09-25T11:00:00.000Z");
    expect(opp.isActive).toBe(true);
    expect(opp.sourceId).toBe(HIMALAYAS_SOURCE_ID);
    expect(opp.contentHash).toBeDefined();
    expect(opp.contentHash.length).toBe(16);
  });

  it("buildHimalayasProviderProfile and buildHimalayasCandidateRow produce valid registry definitions", () => {
    const nowIso = "2026-09-25T12:00:00.000Z";
    const profile = buildHimalayasProviderProfile();
    expect(profile.id).toBe(HIMALAYAS_PROVIDER_ID);
    expect(profile.mechanism).toBe("public_api");
    expect(profile.authClass).toBe("none");
    expect(profile.contentScope).toBe("minimal");
    expect(profile.allowedHosts).toBe("himalayas.app");

    const candidate = buildHimalayasCandidateRow({ nowIso });
    expect(candidate.sourceId).toBe(HIMALAYAS_SOURCE_ID);
    expect(candidate.providerId).toBe(HIMALAYAS_PROVIDER_ID);
    expect(candidate.operationalState).toBe("candidate");
    expect(candidate.complianceState).toBe("conditional");
    expect(candidate.canaryMaxNewItemsPerTick).toBe(2);
    expect(candidate.optOut).toBe(0);
  });
});
