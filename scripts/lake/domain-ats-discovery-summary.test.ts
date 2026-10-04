import { describe, expect, it } from "bun:test";

import {
  emptyDiscoveryStats,
  formatDiscoverySummary,
  type DiscoveryStats,
} from "./domain-ats-discovery";

/**
 * INCIDENT-0410(w).
 *
 * The P0 incident of 2026-10-04 is a supply incident whose visible symptom is that
 * three consecutive miner runs reported `jobsIngested: 0` while `admitted: 10`, and
 * nothing in the log said so in words an operator could act on.
 *
 * `printDiscoverySummary` printed `AUTO-ADMITTED (ingested): 10` — a *tenant*
 * count carrying an "(ingested)" label — four lines above
 * `Jobs Ingested (QUALIFIED): 0`, the *job* count. Both numbers were correct; the
 * label attached to the first one was not, and "ingested: 10" on a run that ingested
 * nothing is exactly the claim a reader takes away from a success-looking log.
 *
 * These tests pin the relabelling: the tenant line must not claim ingestion, the
 * job line must remain the single ingestion figure, and neither may be derived from
 * the other. They exercise the real exported formatter, not a constant.
 */

/** Every line the summary prints, in order, without trailing blank padding. */
function linesOf(stats: DiscoveryStats): string[] {
  return formatDiscoverySummary(stats)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function valueFor(lines: string[], label: string): string {
  const line = lines.find((candidate) => candidate.startsWith(label));
  if (line === undefined) throw new Error(`no summary line starts with ${JSON.stringify(label)}`);
  return line.slice(label.length).trim();
}

const REAL_RUN_30_COUNTS: DiscoveryStats = {
  ...emptyDiscoveryStats(),
  domainsScanned: 25,
  tenantsFound: 13,
  admitted: 10,
  shadowed: 0,
  rejected: 4,
  // lake_runs id 30, 2026-10-04T06:16:06.758Z: ten tenants admitted, zero jobs.
  jobsIngested: 0,
};

describe("formatDiscoverySummary", () => {
  it("labels the admitted figure as an admission count, never as an ingestion count", () => {
    const text = formatDiscoverySummary(REAL_RUN_30_COUNTS);

    expect(text).toContain("Tenants Auto-Admitted:");
    expect(text).not.toContain("AUTO-ADMITTED (ingested)");
  });

  it("keeps Jobs Ingested as the only ingestion figure and prints the real job count", () => {
    const lines = linesOf(REAL_RUN_30_COUNTS);

    expect(valueFor(lines, "Jobs Ingested (QUALIFIED):")).toBe("0");
    expect(valueFor(lines, "Tenants Auto-Admitted:")).toBe("10");
  });

  it("states the tenant and job counts independently — admission never implies ingestion", () => {
    const admittedNoJobs = linesOf({ ...REAL_RUN_30_COUNTS, admitted: 10, jobsIngested: 0 });
    const admittedWithJobs = linesOf({ ...REAL_RUN_30_COUNTS, admitted: 10, jobsIngested: 37 });

    expect(valueFor(admittedNoJobs, "Tenants Auto-Admitted:")).toBe(
      valueFor(admittedWithJobs, "Tenants Auto-Admitted:"),
    );
    expect(valueFor(admittedNoJobs, "Jobs Ingested (QUALIFIED):")).not.toBe(
      valueFor(admittedWithJobs, "Jobs Ingested (QUALIFIED):"),
    );
  });

  it("surfaces the held-tenant re-adjudication count that sessions 37 wired", () => {
    const withoutPass = linesOf(REAL_RUN_30_COUNTS);
    const withPass = linesOf({ ...REAL_RUN_30_COUNTS, heldTenantsReadjudicated: 20 });

    expect(valueFor(withoutPass, "Held Tenants Re-adjudicated:")).toBe("0");
    expect(valueFor(withPass, "Held Tenants Re-adjudicated:")).toBe("20");
  });

  it("carries every DiscoveryStats field so a count cannot silently go missing", () => {
    const stats: DiscoveryStats = {
      domainsScanned: 25,
      tenantsFound: 13,
      admitted: 10,
      shadowed: 1,
      rejected: 4,
      jobsIngested: 37,
      skippedRateLimitedHost: 2,
      heldTenantsReadjudicated: 20,
    };

    const lines = linesOf(stats);
    expect(valueFor(lines, "Domains Scanned:")).toBe("25");
    expect(valueFor(lines, "Tenants Found (>= min jobs):")).toBe("13");
    expect(valueFor(lines, "Tenants Auto-Admitted:")).toBe("10");
    expect(valueFor(lines, "Shadow Monitored:")).toBe("1");
    expect(valueFor(lines, "Auto-Rejected:")).toBe("4");
    expect(valueFor(lines, "Jobs Ingested (QUALIFIED):")).toBe("37");
    expect(valueFor(lines, "Skipped (rate-limited host):")).toBe("2");
    expect(valueFor(lines, "Held Tenants Re-adjudicated:")).toBe("20");
  });

  it("prints an honest admission total even when nothing at all happened", () => {
    const lines = linesOf(emptyDiscoveryStats());

    expect(valueFor(lines, "Tenants Auto-Admitted:")).toBe("0");
    expect(valueFor(lines, "Jobs Ingested (QUALIFIED):")).toBe("0");
    expect(lines.length).toBeGreaterThan(0);
  });

  it("keeps the zero-ingestion warning visible for the P0 incident's own counts", () => {
    const lines = linesOf(REAL_RUN_30_COUNTS);

    // Tenants admitted but no jobs landed is the exact condition that produced the
    // zero-publication day. It must be legible as its own line, not inferred by a
    // reader subtracting two differently-labelled numbers.
    expect(lines.some((line) => line.startsWith("WARNING:"))).toBe(true);
  });

  it("requires BOTH conditions for the warning: admitted > 0 AND zero jobs ingested", () => {
    const admittedNoJobs = linesOf({ ...REAL_RUN_30_COUNTS, admitted: 10, jobsIngested: 0 });
    const nothingAdmitted = linesOf({ ...REAL_RUN_30_COUNTS, admitted: 0, jobsIngested: 5 });
    const jobsLanded = linesOf({ ...REAL_RUN_30_COUNTS, admitted: 10, jobsIngested: 5 });

    const warningsFor = (lines: string[]): string[] =>
      lines.filter((line) => line.startsWith("WARNING:"));

    expect(warningsFor(admittedNoJobs)).toHaveLength(1);
    expect(warningsFor(nothingAdmitted)).toHaveLength(0);
    expect(warningsFor(jobsLanded)).toHaveLength(0);
    expect(warningsFor(admittedNoJobs)[0]).toContain("10 tenant(s)");
    expect(warningsFor(admittedNoJobs)[0]).toContain("0 job(s)");
  });

  it("emits no ingestion claim for an all-zero run", () => {
    const lines = linesOf(emptyDiscoveryStats());

    expect(lines.some((line) => line.toLowerCase().includes("ingested:"))).toBe(false);
    expect(lines.filter((line) => line.startsWith("WARNING:"))).toHaveLength(0);
  });

  it("does not mutate the stats object it is handed", () => {
    const stats: DiscoveryStats = { ...REAL_RUN_30_COUNTS };
    const before = { ...stats };

    formatDiscoverySummary(stats);

    expect(stats).toEqual(before);
  });
});