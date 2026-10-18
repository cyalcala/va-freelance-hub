import { describe, expect, test } from "bun:test";
import { geoGate, type GeoGateInput } from "./geoGate";
import { decideTriage } from "./triage-decision";
import { assessPostingFreshness } from "./publication-freshness";

describe("Employer discovery metadata cannot grant per-opening PH eligibility", () => {
  const remoteOpening: GeoGateInput = {
    title: "Executive Assistant",
    description: "Handle scheduling, documentation and customer correspondence.",
    locationRaw: "Remote",
    locationType: "remote",
  };

  test.each([
    ["known employer name", { company: "Hunt St" }],
    ["known canonical source", { company: "Coconut VA", sourceId: "workable:coconutva" }],
    ["same company name on an unrelated tenant", { company: "Athena", sourceId: "greenhouse:unrelated-business" }],
    ["same token under another ATS", { sourceId: "lever:hunt-st" }],
    ["known employer without remote metadata", { company: "Hunt St", locationRaw: null, locationType: null }],
  ] as const)("%s remains unknown without opening-level PH evidence", (_label, identity) => {
    const gate = geoGate({ ...remoteOpening, ...identity });
    expect(gate.geoScope).toBe("unknown");
    expect(gate.phEligibility).toBe("unclear");
    expect(gate.evidence).toBe("No deterministic geo signal");
  });

  test.each([
    "This remote opening accepts applications exclusively from candidates living in Canada.",
    "General responsibilities. ".repeat(80) + "Must reside in Australia.",
  ])("unrecognized or truncated country restrictions cannot be overridden by employer metadata", async (description) => {
    const opening = { ...remoteOpening, company: "Hunt St", sourceId: "workable:hunt-st", description };
    const gate = geoGate(opening);
    expect(gate.phEligibility).toBe("unclear");
    expect(gate.geoScope).toBe("unknown");
    const decision = await decideTriage(opening, gate, {});
    expect(decision.kind).not.toBe("eligible");
  });

  test("explicit remote Philippines metadata retains its verified verdict independently of identity", () => {
    for (const company of ["Hunt St", "Unlisted Employer"]) {
      const gate = geoGate({ ...remoteOpening, company, locationRaw: "Philippines" });
      expect(gate.geoScope).toBe("ph_only");
      expect(gate.phEligibility).toBe("eligible_verified");
      expect(gate.evidence).toContain("location \"Philippines\"");
    }
  });

  test("job-level country and workplace contradictions remain ineligible", () => {
    const us = geoGate({ ...remoteOpening, company: "Hunt St", locationRaw: "United States" });
    expect(us.geoScope).toBe("country_locked");
    expect(us.phEligibility).toBe("ineligible");
    const onsite = geoGate({ ...remoteOpening, company: "Hunt St", locationRaw: "Philippines", locationType: "onsite" });
    expect(onsite.phEligibility).toBe("ineligible");
    expect(onsite.evidence).toContain("Not fully remote");
  });

  test("employer metadata cannot change original-date freshness", () => {
    expect(assessPostingFreshness("2020-01-01T00:00:00.000Z", "2026-10-18T00:00:00.000Z").state).toBe("STALE");
  });
});
