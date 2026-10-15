import { describe, expect, test } from "bun:test";
import { findTrustedEmployer, isTrustedPhEmployer, TRUSTED_PH_EMPLOYERS } from "./trustedEmployers";
import { geoGate } from "./geoGate";
import { assessPostingFreshness } from "./publication-freshness";

const OBSERVED_NOW = "2026-10-14T15:00:00.000Z";

describe("Formalized Trusted PH Employer Evidence (Milestone M2 & Priority 2)", () => {
  describe("findTrustedEmployer resolution", () => {
    test("resolves canonical tokens correctly", () => {
      expect(findTrustedEmployer("hunt-st")?.companyName).toBe("Hunt St");
      expect(findTrustedEmployer("coconutva")?.companyName).toBe("Coconut VA");
      expect(findTrustedEmployer("20four7va")?.companyName).toBe("20Four7VA");
      expect(findTrustedEmployer("crewbloom")?.companyName).toBe("CrewBloom");
      expect(findTrustedEmployer("pearltalent")?.companyName).toBe("Pearl Talent");
      expect(findTrustedEmployer("hammerjack")?.companyName).toBe("Hammerjack");
      expect(findTrustedEmployer("multiplymii")?.companyName).toBe("MultiplyMii");
      expect(findTrustedEmployer("athena")?.companyName).toBe("Athena");
      expect(findTrustedEmployer("hello-rache")?.companyName).toBe("Hello Rache");
      expect(findTrustedEmployer("sourcefit")?.companyName).toBe("Sourcefit");
      expect(findTrustedEmployer("rocketams")?.companyName).toBe("RocketAMS");
    });

    test("resolves sourceId prefixes (workable, breezy, greenhouse)", () => {
      expect(findTrustedEmployer("workable:hunt-st")?.companyName).toBe("Hunt St");
      expect(findTrustedEmployer("workable:coconutva")?.companyName).toBe("Coconut VA");
      expect(findTrustedEmployer("breezy:20four7va")?.companyName).toBe("20Four7VA");
      expect(findTrustedEmployer("breezy:sourcefit")?.companyName).toBe("Sourcefit");
      expect(findTrustedEmployer("greenhouse:athena")?.companyName).toBe("Athena");
    });

    test("resolves company names and aliases with case-insensitive normalization", () => {
      expect(findTrustedEmployer("Hunt St")?.id).toBe("hunt-st");
      expect(findTrustedEmployer("hunt street")?.id).toBe("hunt-st");
      expect(findTrustedEmployer("Coconut VA")?.id).toBe("coconutva");
      expect(findTrustedEmployer("20 Four 7 VA")?.id).toBe("20four7va");
      expect(findTrustedEmployer("Crew Bloom")?.id).toBe("crewbloom");
      expect(findTrustedEmployer("Pearl Talent")?.id).toBe("pearltalent");
      expect(findTrustedEmployer("Multiply Mii")?.id).toBe("multiplymii");
      expect(findTrustedEmployer("Hello Rache")?.id).toBe("hello-rache");
    });

    test("returns null and false for unknown or empty employers", () => {
      expect(findTrustedEmployer("Unknown Agency")).toBeNull();
      expect(findTrustedEmployer("")).toBeNull();
      expect(findTrustedEmployer(null)).toBeNull();
      expect(findTrustedEmployer(undefined)).toBeNull();
      expect(isTrustedPhEmployer("Unknown Agency")).toBe(false);
      expect(isTrustedPhEmployer("")).toBe(false);
    });
  });

  describe("Authoritative Employer Evidence in geoGate", () => {
    test("vetted PH employer surfaces remote job without explicit Philippines token in description", () => {
      const huntRole = geoGate({
        company: "Hunt St",
        title: "Senior Bookkeeper",
        description: "Manage accounts payable, reconcile bank statements, and prepare monthly financial reports.",
        locationRaw: "Remote",
        locationType: "remote",
      });

      expect(huntRole.phEligibility).toBe("eligible_verified");
      expect(huntRole.geoScope).toBe("ph_only");
      expect(huntRole.evidence).toContain("Authoritative employer evidence: Hunt St");
      expect(huntRole.evidence).toContain("tier_a_vetted");
    });

    test("vetted PH employer with sourceId resolves in geoGate", () => {
      const coconutRole = geoGate({
        sourceId: "workable:coconutva",
        title: "Executive Virtual Assistant",
        description: "Support executive calendar management, email correspondence, and travel coordination.",
        locationRaw: "",
        locationType: "remote",
      });

      expect(coconutRole.phEligibility).toBe("eligible_verified");
      expect(coconutRole.geoScope).toBe("ph_only");
      expect(coconutRole.evidence).toContain("Coconut VA");
    });

    test("hammerjack and rocketams default to apac_incl_ph default scope", () => {
      const hjRole = geoGate({
        company: "Hammerjack",
        title: "Accountant",
        description: "Handle general ledger reconciliation.",
        locationRaw: "Remote",
        locationType: "remote",
      });
      expect(hjRole.phEligibility).toBe("eligible_verified");
      expect(hjRole.geoScope).toBe("apac_incl_ph");

      const rocketRole = geoGate({
        sourceId: "workable:rocketams",
        title: "Technical Support Specialist",
        description: "Provide tier 1 IT support for clients.",
        locationRaw: "Remote",
        locationType: "remote",
      });
      expect(rocketRole.phEligibility).toBe("eligible_verified");
      expect(rocketRole.geoScope).toBe("apac_incl_ph");
    });
  });

  describe("Constitutional Separation: Employer trust cannot override negative constraints", () => {
    test("Hunt St job with explicit foreign country lock in locationRaw is REJECTED", () => {
      const lockedRole = geoGate({
        company: "Hunt St",
        title: "Client Success Manager",
        description: "Remote role for UK operations.",
        locationRaw: "London, United Kingdom",
        locationType: "remote",
      });

      expect(lockedRole.phEligibility).toBe("ineligible");
      expect(lockedRole.geoScope).toBe("country_locked");
      expect(lockedRole.evidence).toContain("United Kingdom");
    });

    test("Hunt St job with US state in title is REJECTED", () => {
      const usRole = geoGate({
        company: "Hunt St",
        title: "Operations Assistant (Austin, TX)",
        description: "Coordinate regional office affairs.",
        locationRaw: "Remote",
        locationType: "remote",
      });

      expect(usRole.phEligibility).toBe("ineligible");
      expect(usRole.geoScope).toBe("country_locked");
    });

    test("Hunt St job with onsite/hybrid workplace is REJECTED", () => {
      const onsiteRole = geoGate({
        company: "Hunt St",
        title: "Office Coordinator",
        description: "Coordinate physical office supplies.",
        locationRaw: "Manila, Philippines",
        locationType: "onsite",
      });

      expect(onsiteRole.phEligibility).toBe("ineligible");
      expect(onsiteRole.geoScope).toBe("country_locked");
      expect(onsiteRole.evidence).toContain("Not fully remote");
    });

    test("Hunt St job with hard US residence lock is REJECTED", () => {
      const resLockRole = geoGate({
        company: "Hunt St",
        title: "Virtual Assistant",
        description: "Candidate must be a US citizen and currently reside in the United States.",
        locationRaw: "Remote",
        locationType: "remote",
      });

      expect(resLockRole.phEligibility).toBe("ineligible");
      expect(resLockRole.geoScope).toBe("region_excl_ph");
      expect(resLockRole.evidence).toContain("Residence/authorization lock");
    });

    test("Counterexample Pineapple Staffing remains 0% publishable despite VA niche", () => {
      const pineapple = geoGate({
        company: "Pineapple Staffing",
        sourceId: "workable:pineapple-staffing",
        title: "Executive Virtual Assistant",
        locationRaw: "United States",
        locationType: "remote",
      });

      expect(pineapple.phEligibility).toBe("ineligible");
      expect(pineapple.geoScope).toBe("country_locked");

      const freshness = assessPostingFreshness("2020-01-01T00:00:00.000Z", OBSERVED_NOW);
      expect(freshness.state).toBe("STALE");
    });

    test("Counterexample Affordable Staff remains 0% publishable for onsite Bacolod office roles", () => {
      const affordable = geoGate({
        company: "Affordable Staff",
        title: "AU Accounting Associate",
        locationRaw: "Bacolod, Philippines",
        locationType: "onsite",
      });

      expect(affordable.phEligibility).toBe("ineligible");
      expect(affordable.geoScope).toBe("country_locked");
    });

    test("Counterexample UpGuard remains 0% publishable when pinned to Australia", () => {
      const upguard = geoGate({
        company: "UpGuard",
        title: "Director of Customer Success, APAC",
        locationRaw: "Australia",
        locationType: "remote",
      });

      expect(upguard.phEligibility).toBe("ineligible");
      expect(upguard.geoScope).toBe("country_locked");
    });
  });
});
