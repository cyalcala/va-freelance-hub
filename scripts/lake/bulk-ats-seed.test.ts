import { describe, it, expect } from "bun:test";
import {
  clampProbeDelay,
  hostOf,
  probeTemplateForFamily,
} from "./domain-ats-discovery";
import {
  curatedSeeds,
  dedupeSeeds,
  seedFromAtsUrl,
  seedsFromOpenJobsRecord,
  seedsFromPortalsYml,
} from "./bulk-ats-seed";

describe("bulk ATS seed normalization", () => {
  it("extracts family-pinned slugs from ATS board URLs", () => {
    expect(seedFromAtsUrl("Acme", "", "https://boards.greenhouse.io/acme"))?.toMatchObject({
      atsFamily: "greenhouse",
      tenantSlug: "acme",
    });
    expect(seedFromAtsUrl("Acme", "", "https://jobs.lever.co/affirm"))?.toMatchObject({
      atsFamily: "lever",
      tenantSlug: "affirm",
    });
    expect(seedFromAtsUrl("Acme", "", "https://jobs.ashbyhq.com/supabase"))?.toMatchObject({
      atsFamily: "ashby",
      tenantSlug: "supabase",
    });
    expect(seedFromAtsUrl("Acme", "", "https://acme.apply.workable.com"))?.toMatchObject({
      atsFamily: "workable",
    });
    expect(seedFromAtsUrl("Acme", "", "https://sourcefit.breezy.hr/json"))?.toMatchObject({
      atsFamily: "breezy",
      tenantSlug: "sourcefit",
    });
    expect(seedFromAtsUrl("Acme", "", "https://acme.com/careers")).toBeNull();
  });

  it("normalizes OpenJobs records via ats_links", () => {
    const seeds = seedsFromOpenJobsRecord({
      name: "Demo Co",
      website: "https://demo.co",
      ats_links: ["https://boards.greenhouse.io/demo", "https://demo.co/careers"],
    });
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toMatchObject({ atsFamily: "greenhouse", tenantSlug: "demo" });
  });

  it("parses portals.yml company mappings", () => {
    const seeds = seedsFromPortalsYml("acme:\n  family: greenhouse\n  slug: acme-inc\n");
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toMatchObject({ companyName: "acme", atsFamily: "greenhouse", tenantSlug: "acme-inc" });
  });

  it("dedupes case-insensitively and drops unknown families", () => {
    const seeds = dedupeSeeds([
      { companyName: "A", atsFamily: "greenhouse", tenantSlug: "Acme" },
      { companyName: "A", atsFamily: "Greenhouse", tenantSlug: "acme" },
      { companyName: "B", atsFamily: "nope", tenantSlug: "x" },
    ]);
    expect(seeds).toHaveLength(1);
  });

  it("curated cohort is family-pinned and non-empty", () => {
    expect(curatedSeeds().length).toBeGreaterThan(5);
    for (const s of curatedSeeds()) expect(probeTemplateForFamily(s.atsFamily)).toBeDefined();
  });
});

describe("discovery pacing helpers", () => {
  it("clamps probe delay into the polite 1000-2000ms band", () => {
    expect(clampProbeDelay(100)).toBe(1000);
    expect(clampProbeDelay(1500)).toBe(1500);
    expect(clampProbeDelay(99999)).toBe(2000);
    expect(clampProbeDelay(Number.NaN)).toBe(1500);
  });

  it("extracts rate-limit host keys", () => {
    expect(hostOf("https://boards-api.greenhouse.io/v1/boards/acme/jobs")).toBe("boards-api.greenhouse.io");
  });

  it("resolves all five ATS families including Ashby", () => {
    for (const f of ["breezy", "greenhouse", "workable", "lever", "ashby"]) {
      expect(probeTemplateForFamily(f)?.family.toLowerCase()).toBe(f);
    }
  });
});
