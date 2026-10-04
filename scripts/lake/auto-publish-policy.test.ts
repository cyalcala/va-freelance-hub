import { describe, expect, it } from "bun:test";
import {
  concentrationAllowance,
  decideAutoPublish,
  parseJevRaw,
  wilsonLowerBound,
  PUBLISH_PH_RATE_FLOOR,
  REJECT_PH_RATE_FLOOR,
} from "./auto-publish-policy";
import { planAutoPublishSources } from "./sync-to-d1";

const canonicalInventory = {
  activeTotal: 895,
  bySource: [
    { sourceId: "we-work-remotely", count: 369 },
    { sourceId: "breezy:sourcefit", count: 200 },
    { sourceId: "greenhouse:gitlab", count: 20 },
  ],
};

describe("automatic publication policy", () => {
  it("puts a 95% Wilson lower bound on the Canonical cohort above the admit floor", () => {
    const lower = wilsonLowerBound(122, 306);
    expect(lower).not.toBeNull();
    expect(lower!).toBeGreaterThan(0.2);
  });

  it("publishes the Canonical qualified rows and relieves the top-family breach", () => {
    const decision = decideAutoPublish({
      sourceId: "greenhouse:canonical",
      totalJobs: 306,
      qualifiedReady: 122,
      inventory: canonicalInventory,
    });
    expect(decision.action).toBe("PUBLISH");
    expect(decision.publishCount).toBe(122);
    expect(decision.concentration).toBe("RELIEVES");
  });

  it("rejects a weak PH rate even if Jev says admit", () => {
    const decision = decideAutoPublish({
      sourceId: "lever:example",
      totalJobs: 100,
      qualifiedReady: 2,
      jevChoice: "ADMIT",
      jevConfidence: 0.95,
      inventory: canonicalInventory,
    });
    expect(decision.action).toBe("REJECT");
    expect(decision.publishCount).toBe(0);
  });

  it("holds an ambiguous rate until Jev is confident", () => {
    const held = decideAutoPublish({
      sourceId: "lever:example",
      totalJobs: 40,
      qualifiedReady: 4,
      jevChoice: "ADMIT",
      jevConfidence: 0.4,
      inventory: null,
    });
    expect(held.action).toBe("HOLD");
    const published = decideAutoPublish({
      sourceId: "lever:example",
      totalJobs: 40,
      qualifiedReady: 4,
      jevChoice: "ADMIT",
      jevConfidence: 0.8,
      inventory: null,
    });
    expect(published.action).toBe("PUBLISH");
    expect(published.publishCount).toBe(4);
  });

  it("holds an already-admitted tenant in the ambiguous band while Jev is silent", () => {
    // ashby:supabase as measured in lake_ats_discovery on 2026-10-04: admitted
    // (review_status auto_approved) with a 27.1% PH rate, but the 13/48 Wilson
    // lower bound is ~16.6%, below the 20% floor, and jev_raw is NULL. A NULL
    // receipt must be read as "no verdict", never as permission: the rows stay
    // recoverable (HOLD, not REJECT) until a real verdict or a human decides.
    const held = decideAutoPublish({
      sourceId: "ashby:supabase",
      totalJobs: 48,
      qualifiedReady: 13,
      jevRaw: null,
      inventory: null,
    });
    expect(held.action).toBe("HOLD");
    expect(held.publishCount).toBe(0);
    expect(held.reason).toContain("ambiguous cohort stays in shadow");
    expect(held.wilsonLower).toBe(wilsonLowerBound(13, 48));
    expect(held.wilsonLower!).toBeGreaterThanOrEqual(REJECT_PH_RATE_FLOOR);
    expect(held.wilsonLower!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
    // A receipt written by any other producer is equally unparsed here: a NULL
    // column and an absent receipt reach the same fail-closed decision.
    expect(parseJevRaw(null)).toBeNull();
    expect(decideAutoPublish({
      sourceId: "ashby:supabase",
      totalJobs: 48,
      qualifiedReady: 13,
      jevRaw: null,
      inventory: null,
    })).toEqual(held);
  });

  it("blocks more jobs from a family that is already over the ceiling", () => {
    const room = concentrationAllowance("we-work-remotely", 50, canonicalInventory);
    expect(room.allowed).toBe(0);
    expect(room.concentration).toBe("BLOCKED");
  });

  it("parses a Jev receipt and the kill switch drops every auto tenant", () => {
    expect(parseJevRaw("jev-1.13:ADMIT@0.82")).toEqual({ choice: "ADMIT", confidence: 0.82 });
    expect(planAutoPublishSources([
      { source_id: "greenhouse:canonical", job_count: 306, qualified_ready: 122, ph_rate: 0.399, jev_raw: null },
    ], canonicalInventory, true)).toEqual([]);
  });
});
