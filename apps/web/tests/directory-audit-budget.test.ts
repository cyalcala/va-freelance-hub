import { describe, expect, test } from "bun:test";
import { DEFAULT_BUDGET } from "../src/pages/api/cron/directory-audit";

// Regression guard for the directory-audit subrequest-cap breach (2026-08-18).
//
// directory-audit runs in one Cloudflare Pages Function invocation and performs
// one checkDirectoryLink() fetch per company checked. Workers Free caps
// subrequests at 50 per invocation — the same ceiling that froze ingestion on
// 2026-08-08 (see ai-subrequest-budget.test.ts). D1 binding calls do not count
// toward that cap (the scrape route makes dozens of D1 ops per run), so the
// per-run fetch budget is the only thing that must stay under 50.
//
// The default was 60: whenever 50+ rows carried a website, fetches 51+ threw
// "Too many subrequests", were caught as `unreachable` (never a strike, so no
// data corruption), and the run silently reported them as checked. Unlike the
// scrape route, there is no active budget guard here — the oldest-checked-first
// rotation is the deferral mechanism, so the fix is simply to keep the per-run
// budget under the cap with headroom for redirect hops.
describe("directory-audit DEFAULT_BUDGET", () => {
  test("stays under the Workers-Free 50-subrequest/invocation cap", () => {
    expect(DEFAULT_BUDGET).toBeGreaterThan(0);
    // Hard invariant: must never reach the 50-subrequest ceiling again.
    expect(DEFAULT_BUDGET).toBeLessThan(50);
    // Headroom for the two D1 selects and redirect hops that a followed
    // link check can add on top of the initial fetch.
    expect(DEFAULT_BUDGET).toBeLessThanOrEqual(45);
  });
});
