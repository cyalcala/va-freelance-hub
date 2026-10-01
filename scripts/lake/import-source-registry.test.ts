import { describe, it, expect } from "bun:test";
import { parseCsvLine, seedsFromLastRoundCsv, dedupeSeeds } from "./bulk-ats-seed";
import {
  buildDiscoveryImportSql,
  stratifySample,
  syntheticDomain,
  emptyImportStats,
  IMPORT_CHUNK_ROWS,
} from "./import-source-registry";
import { LAROUND_PROVENANCE } from "./bulk-ats-seed";

const SAMPLE_CSV = [
  "ats_vendor,company_name,board_slug,last_crawled",
  'ashby,"0g Labs",0g,2026-07-12',
  'greenhouse,"Acme, Inc. & Co",acme,2026-08-01',
  'lever,"Quote ""Heavy"" Ltd",quoteheavy,2026-07-15',
  "greenhouse,Whitespace,  ,2026-07-20",
  "workable,Unsupported Vendor,unsupported,2026-07-21",
  "",
].join("\n");

describe("LastRound ATS-directory CSV ingestion", () => {
  it("parses RFC4180-style CSV lines with quoted fields and escaped quotes", () => {
    const cols = parseCsvLine('ashby,"0g Labs",0g,2026-07-12');
    expect(cols).toEqual(["ashby", "0g Labs", "0g", "2026-07-12"]);
    const escaped = parseCsvLine('lever,"Quote ""Heavy"" Ltd",quoteheavy,2026-07-15');
    expect(escaped).toEqual(["lever", 'Quote "Heavy" Ltd', "quoteheavy", "2026-07-15"]);
    const commaInside = parseCsvLine('greenhouse,"Acme, Inc. & Co",acme,2026-08-01');
    expect(commaInside).toEqual(["greenhouse", "Acme, Inc. & Co", "acme", "2026-08-01"]);
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
    expect(parseCsvLine("")).toEqual([""]);
  });

  it("normalizes the LastRound CSV shape into family-pinned seeds, skipping unsupported/invalid rows", () => {
    const seeds = seedsFromLastRoundCsv(SAMPLE_CSV);
    expect(seeds).toHaveLength(3);
    expect(seeds[0]).toEqual({ companyName: "0g Labs", atsFamily: "ashby", tenantSlug: "0g" });
    expect(seeds[1]).toEqual({ companyName: "Acme, Inc. & Co", atsFamily: "greenhouse", tenantSlug: "acme" });
    expect(seeds[2]).toEqual({ companyName: 'Quote "Heavy" Ltd', atsFamily: "lever", tenantSlug: "quoteheavy" });
    const families = new Set(seeds.map((s) => s.atsFamily));
    expect(families.has("workable")).toBe(false);
  });

  it("normalizes the real dataset head shape and slugifies board slugs", () => {
    const real = seedsFromLastRoundCsv(
      [
        "ats_vendor,company_name,board_slug,last_crawled",
        'ashby,"1Password",1password,2026-07-12',
        'greenhouse,"10x Team",10xteam,2026-08-01',
      ].join("\n"),
    );
    expect(real).toEqual([
      { companyName: "1Password", atsFamily: "ashby", tenantSlug: "1password" },
      { companyName: "10x Team", atsFamily: "greenhouse", tenantSlug: "10xteam" },
    ]);
  });

  it("dedupes within-batch by family:slug", () => {
    const seeds = seedsFromLastRoundCsv(SAMPLE_CSV);
    const duped = seeds.concat([{ companyName: "Dup", atsFamily: "ashby", tenantSlug: "0g" }]);
    expect(dedupeSeeds(duped)).toHaveLength(3);
  });
});

describe("Discovery-only registry import contracts", () => {
  it("builds a batched idempotent INSERT with 8 binds per row and SHADOW-only semantics", () => {
    const chunk = [
      { companyName: "1Password", atsFamily: "ashby", tenantSlug: "1password" },
      { companyName: "Acme, Inc. & Co", atsFamily: "greenhouse", tenantSlug: "acme" },
    ];
    const { sql, args } = buildDiscoveryImportSql(chunk);
    expect(args).toHaveLength(16);
    expect((sql.match(/\?/g) ?? []).length).toBe(16);
    expect(sql).toContain("ON CONFLICT(ats_family, tenant_slug) DO NOTHING");
    expect(sql).not.toContain("DO UPDATE");
    expect(args).toContain("discovered");
    expect(args).toContain(LAROUND_PROVENANCE);
    expect(args).toContain("ashby:1password");
    expect(args).toContain("greenhouse:acme");
    expect(args).toContain("https://api.ashbyhq.com/posting-api/job-board/1password");
    expect(args).toContain("https://boards-api.greenhouse.io/v1/boards/acme/jobs");
  });

  it("uses the canonical Lever probe URL pattern", () => {
    const { args } = buildDiscoveryImportSql([{ companyName: "X", atsFamily: "lever", tenantSlug: "xcorp" }]);
    expect(args).toContain("https://api.lever.co/v0/postings/xcorp?mode=json");
  });

  it("respects the 999-bind ceiling at the configured chunk size", () => {
    const chunk = Array.from({ length: IMPORT_CHUNK_ROWS }, (_, i) => ({
      companyName: `Company ${i}`,
      atsFamily: "greenhouse",
      tenantSlug: `co-${i}`,
    }));
    const { sql, args } = buildDiscoveryImportSql(chunk);
    expect(args.length).toBeLessThanOrEqual(999);
    expect((sql.match(/\?/g) ?? []).length).toBe(args.length);
  });

  it("stratifies an evenly-spaced deterministic sample per family", () => {
    const seeds: Array<{ companyName: string; atsFamily: string; tenantSlug: string }> = [];
    for (let i = 0; i < 100; i++) seeds.push({ companyName: `G${i}`, atsFamily: "greenhouse", tenantSlug: `g-${i}` });
    for (let i = 0; i < 50; i++) seeds.push({ companyName: `A${i}`, atsFamily: "ashby", tenantSlug: `a-${i}` });
    for (let i = 0; i < 10; i++) seeds.push({ companyName: `L${i}`, atsFamily: "lever", tenantSlug: `l-${i}` });
    const sample = stratifySample(seeds, 20);
    const counts: Record<string, number> = {};
    for (const s of sample) counts[s.atsFamily] = (counts[s.atsFamily] ?? 0) + 1;
    expect(counts["greenhouse"]).toBe(20);
    expect(counts["ashby"]).toBe(20);
    expect(counts["lever"]).toBe(10);
    const again = stratifySample(seeds, 20);
    expect(sample.map((s) => s.tenantSlug)).toEqual(again.map((s) => s.tenantSlug));
  });

  it("uses the synthetic domain convention for seeds without a website", () => {
    expect(syntheticDomain({ companyName: "X", atsFamily: "Greenhouse", tenantSlug: "xcorp" })).toBe("xcorp.greenhouse");
  });

  it("starts import stats at zero", () => {
    expect(emptyImportStats()).toEqual({
      corpusRows: 0,
      normalized: 0,
      alreadyKnown: 0,
      imported: 0,
      failedChunks: 0,
      writeBatches: 0,
    });
  });
});
