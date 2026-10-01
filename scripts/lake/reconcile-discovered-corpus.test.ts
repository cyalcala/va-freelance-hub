import { describe, it, expect } from "bun:test";
import { parseReconciliationArgs, rowToBulkSeed } from "./reconcile-discovered-corpus";

describe("Discovered-corpus reconciliation contracts", () => {
  it("converts a discovery row into a family-pinned bulk seed", () => {
    const seed = rowToBulkSeed({
      domain: "snappr.lever",
      company_hint: "Snappr",
      ats_family: "lever",
      tenant_slug: "snappr",
    });
    expect(seed).toEqual({ companyName: "Snappr", atsFamily: "lever", tenantSlug: "snappr", website: undefined });
  });

  it("falls back to the synthetic domain when company_hint is missing", () => {
    const seed = rowToBulkSeed({ domain: "xcorp.greenhouse", company_hint: null, ats_family: "greenhouse", tenant_slug: "xcorp" });
    expect(seed.companyName).toBe("xcorp.greenhouse");
  });

  it("parses reconciliation args with defaults", () => {
    const opts = parseReconciliationArgs([]);
    expect(opts.perFamily).toBe(30);
    expect(opts.dryRun).toBe(false);
    expect(opts.probeDelayMs).toBe(1500);
  });

  it("parses explicit per-family and dry-run flags", () => {
    const opts = parseReconciliationArgs(["--per-family=12", "--dry-run", "--delay-ms=1000"]);
    expect(opts.perFamily).toBe(12);
    expect(opts.dryRun).toBe(true);
    expect(opts.probeDelayMs).toBe(1000);
  });
});
