import { describe, expect, test } from "bun:test";
import { geoGate, isObviousGeoRestriction, type GeoGateInput } from "./geoGate";
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

  test("employer confidence, freshness, PH eligibility, and role approval stay separate decisions", async () => {
    const phCitizens = geoGate({
      ...remoteOpening,
      company: "CrewBloom",
      sourceId: "workable:crewbloom",
      title: "Virtual Assistant",
      description: "Open to citizens of the Philippines.",
      locationRaw: "Philippines",
    });
    expect(isObviousGeoRestriction("Virtual Assistant", "Open to citizens of the Philippines.")).toBe(false);
    expect(isObviousGeoRestriction("Virtual Assistant", "Must be based in the Philippines.")).toBe(false);
    expect(phCitizens.phEligibility).toBe("eligible_verified");
    expect(assessPostingFreshness("2020-01-01T00:00:00.000Z", "2026-10-20T00:00:00.000Z").state).toBe("STALE");

    const contradiction = await decideTriage(
      { ...remoteOpening, title: "Executive Virtual Assistant (US citizens only)", description: "Must reside in the United States.", locationRaw: "Philippines" },
      { geoScope: "apac_incl_ph" },
      { AI: { run: async () => { throw new Error("explicit contradiction must not call a model"); } } },
    );
    expect(contradiction.kind).toBe("ineligible");

    let modelCalls = 0;
    const modelRejected = await decideTriage(
      { ...remoteOpening, locationRaw: "India; Pakistan; Philippines", description: "Remote support for an APAC team." },
      { geoScope: "apac_incl_ph" },
      { AI: { run: async () => { modelCalls += 1; return { response: JSON.stringify({ eligibleForFilipinos: false, eligible: false, reason: "uncertain", category: "other", tags: [] }) }; } } },
    );
    expect(modelRejected.kind).toBe("eligible");
    expect(modelCalls).toBe(1);

    const roleHeld = await decideTriage(
      { ...remoteOpening, locationRaw: "Philippines" },
      { geoScope: "ph_only", requireModelApproval: true },
      {},
    );
    expect(roleHeld.kind).toBe("ai-unavailable");
  });
});
