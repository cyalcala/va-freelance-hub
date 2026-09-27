import { describe, it, expect } from "bun:test";
import {
  deriveCandidateSlugs,
  KNOWN_ATS_TOKENS,
  ACTIVE_PRODUCTION_SCRAPERS,
} from "./process-intake";

describe("Intake Processing & Source Prospecting — HRI-03 Contracts", () => {
  it("derives clean candidate tenant slugs from company name and domain", () => {
    const slugs1 = deriveCandidateSlugs("Affordable Staff", "affordablestaff.com.au");
    expect(slugs1).toContain("affordable-staff");
    expect(slugs1).toContain("affordablestaff");

    const slugs2 = deriveCandidateSlugs("ConnectOS", "connectos.co");
    expect(slugs2).toContain("connectos");

    const slugs3 = deriveCandidateSlugs("Cloudstaff", "cloudstaff.com");
    expect(slugs3).toContain("cloudstaff");

    const slugs4 = deriveCandidateSlugs("The Remote Group", "theremotegroup.com");
    expect(slugs4).toContain("the-remote-group");
    expect(slugs4).toContain("theremotegroup");
  });

  it("maintains verified known ATS tokens for high-signal vetted companies", () => {
    expect(KNOWN_ATS_TOKENS["remote craft"]).toEqual({
      family: "breezy",
      token: "remote-craft",
    });
    expect(KNOWN_ATS_TOKENS["value virtual assistants"]).toEqual({
      family: "breezy",
      token: "value-virtual-assistants",
    });
    expect(KNOWN_ATS_TOKENS["yokly"]).toEqual({
      family: "breezy",
      token: "yokly",
    });
    expect(KNOWN_ATS_TOKENS["hunt st"]).toEqual({
      family: "workable",
      token: "hunt-st",
    });
    expect(KNOWN_ATS_TOKENS["gitlab"]).toEqual({
      family: "greenhouse",
      token: "gitlab",
    });
    expect(KNOWN_ATS_TOKENS["supabase"]).toEqual({
      family: "ashby",
      token: "supabase",
    });
  });

  it("recognizes active production scrapers for vetted job boards", () => {
    expect(ACTIVE_PRODUCTION_SCRAPERS["remoteok.com"]).toBe("remoteok");
    expect(ACTIVE_PRODUCTION_SCRAPERS["weworkremotely.com"]).toBe("weworkremotely");
    expect(ACTIVE_PRODUCTION_SCRAPERS["remotive.com"]).toBe("remotive");
    expect(ACTIVE_PRODUCTION_SCRAPERS["jobicy.com"]).toBe("jobicy-ph-full");
  });
});
