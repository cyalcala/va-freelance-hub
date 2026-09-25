import { describe, it, expect } from "bun:test";
import { toContentHash } from "../../packages/scraper/contentHash";
import { geoGate } from "../../packages/scraper/geoGate";

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
