import { describe, it, expect, mock } from "bun:test";
import {
  parseLakeMinerArgs,
  formatMinerLog,
  runLakeMiner,
  type LakeMinerOptions,
} from "./run-lake-miner";
import type { ReconciliationSummary } from "./reconcile-discovered-corpus";
import type { DiscoveryStats } from "./domain-ats-discovery";

describe("Autonomous Lake Miner Runner (run-lake-miner)", () => {
  it("parses CLI args with default fallback values", () => {
    const opts = parseLakeMinerArgs([]);
    expect(opts.reconcilePerFamily).toBe(20);
    expect(opts.domainLimit).toBe(25);
    expect(opts.probeDelayMs).toBe(1500);
    expect(opts.dryRun).toBe(false);
    expect(opts.skipReconcile).toBe(false);
    expect(opts.skipDomainDiscovery).toBe(false);
  });

  it("parses custom CLI arguments correctly", () => {
    const opts = parseLakeMinerArgs([
      "--reconcile-per-family=50",
      "--domain-limit=100",
      "--delay-ms=2000",
      "--dry-run",
      "--skip-reconcile",
    ]);
    expect(opts.reconcilePerFamily).toBe(50);
    expect(opts.domainLimit).toBe(100);
    expect(opts.probeDelayMs).toBe(2000);
    expect(opts.dryRun).toBe(true);
    expect(opts.skipReconcile).toBe(true);
    expect(opts.skipDomainDiscovery).toBe(false);
  });

  it("formats structured miner log payloads to valid JSON", () => {
    const jsonStr = formatMinerLog({
      severity: "INFO",
      component: "lake-miner",
      event: "test_event",
      totalProbed: 15,
      totalAdmitted: 2,
      totalJobsIngested: 8,
      timestamp: "2026-10-02T00:00:00.000Z",
    });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.severity).toBe("INFO");
    expect(parsed.component).toBe("lake-miner");
    expect(parsed.totalProbed).toBe(15);
    expect(parsed.totalJobsIngested).toBe(8);
  });

  it("fails safe by skipping when Turso credentials are missing", async () => {
    const res = await runLakeMiner(
      {
        reconcilePerFamily: 10,
        domainLimit: 10,
        probeDelayMs: 1000,
        dryRun: false,
        skipReconcile: false,
        skipDomainDiscovery: false,
      },
      { TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "" }
    );

    expect(res.ok).toBe(true);
    expect(res.skipped).toBe(true);
    expect(res.aggregate.totalProbed).toBe(0);
  });

  it("executes both reconciliation and discovery phases when configured", async () => {
    const mockReconciliationSummary: ReconciliationSummary = {
      script: "reconcile-discovered-corpus",
      startedAt: "2026-10-02T00:00:00Z",
      finishedAt: "2026-10-02T00:00:05Z",
      corpusSize: 1000,
      sliceSize: 20,
      byFamilySlice: { breezy: 10, lever: 10 },
      domainsScanned: 20,
      admitted: 2,
      shadowed: 3,
      rejected: 15,
      jobsIngested: 6,
      marginalQualifiedYieldPerProbe: 0.3,
      dryRun: true,
    };

    const mockDiscoveryStats: DiscoveryStats = {
      domainsScanned: 15,
      tenantsFound: 8,
      admitted: 1,
      shadowed: 2,
      rejected: 5,
      jobsIngested: 4,
      skippedRateLimitedHost: 0,
    };

    const mockReconcile = mock(async () => mockReconciliationSummary);
    const mockDiscovery = mock(async () => mockDiscoveryStats);

    const res = await runLakeMiner(
      {
        reconcilePerFamily: 10,
        domainLimit: 15,
        probeDelayMs: 1000,
        dryRun: true,
        skipReconcile: false,
        skipDomainDiscovery: false,
      },
      {
        TURSO_DATABASE_URL: "libsql://mock.turso.io",
        TURSO_AUTH_TOKEN: "mock-token",
      },
      {
        reconcileFn: mockReconcile as any,
        domainDiscoveryFn: mockDiscovery as any,
      }
    );

    expect(res.ok).toBe(true);
    expect(mockReconcile).toHaveBeenCalledTimes(1);
    expect(mockDiscovery).toHaveBeenCalledTimes(1);
    expect(res.aggregate.totalProbed).toBe(35); // 20 + 15
    expect(res.aggregate.totalAdmitted).toBe(3); // 2 + 1
    expect(res.aggregate.totalShadowed).toBe(5); // 3 + 2
    expect(res.aggregate.totalRejected).toBe(20); // 15 + 5
    expect(res.aggregate.totalJobsIngested).toBe(10); // 6 + 4
  });

  it("respects skip flags for individual phases", async () => {
    const mockReconcile = mock(async () => ({} as any));
    const mockDiscovery = mock(async () => ({} as any));

    const res = await runLakeMiner(
      {
        reconcilePerFamily: 10,
        domainLimit: 15,
        probeDelayMs: 1000,
        dryRun: true,
        skipReconcile: true,
        skipDomainDiscovery: true,
      },
      {
        TURSO_DATABASE_URL: "libsql://mock.turso.io",
        TURSO_AUTH_TOKEN: "mock-token",
      },
      {
        reconcileFn: mockReconcile as any,
        domainDiscoveryFn: mockDiscovery as any,
      }
    );

    expect(res.ok).toBe(true);
    expect(mockReconcile).toHaveBeenCalledTimes(0);
    expect(mockDiscovery).toHaveBeenCalledTimes(0);
    expect(res.aggregate.totalProbed).toBe(0);
  });

  it("handles fatal phase errors gracefully without uncaught rejection", async () => {
    const mockReconcile = mock(async () => {
      throw new Error("Connection reset by peer");
    });

    const res = await runLakeMiner(
      {
        reconcilePerFamily: 10,
        domainLimit: 15,
        probeDelayMs: 1000,
        dryRun: true,
        skipReconcile: false,
        skipDomainDiscovery: false,
      },
      {
        TURSO_DATABASE_URL: "libsql://mock.turso.io",
        TURSO_AUTH_TOKEN: "mock-token",
      },
      {
        reconcileFn: mockReconcile as any,
      }
    );

    expect(res.ok).toBe(false);
    expect(res.message).toContain("Connection reset by peer");
  });

  it("persists a failed run row in lake_runs on fatal error (MATH-12 failure telemetry)", async () => {
    const mockDiscovery = mock(async () => {
      throw new Error("phase 2 exploded");
    });
    const mockClient = {
      execute: mock(async () => ({})),
    };

    const mockReconciliationSummary: ReconciliationSummary = {
      script: "reconcile-discovered-corpus",
      startedAt: "2026-10-02T00:00:00Z",
      finishedAt: "2026-10-02T00:00:05Z",
      corpusSize: 100,
      sliceSize: 10,
      byFamilySlice: { breezy: 10 },
      domainsScanned: 10,
      admitted: 1,
      shadowed: 1,
      rejected: 8,
      jobsIngested: 3,
      marginalQualifiedYieldPerProbe: 0.1,
      dryRun: false,
    };

    const res = await runLakeMiner(
      {
        reconcilePerFamily: 10,
        domainLimit: 15,
        probeDelayMs: 1000,
        dryRun: false,
        skipReconcile: false,
        skipDomainDiscovery: false,
      },
      {
        TURSO_DATABASE_URL: "libsql://mock.turso.io",
        TURSO_AUTH_TOKEN: "mock-token",
      },
      {
        reconcileFn: mock(async () => mockReconciliationSummary) as any,
        domainDiscoveryFn: mockDiscovery as any,
        client: mockClient as any,
      }
    );

    expect(res.ok).toBe(false);
    // Partial phase results are preserved, not zeroed.
    expect(res.aggregate.totalProbed).toBe(10);
    expect(res.aggregate.totalJobsIngested).toBe(3);
    expect(res.reconciliation?.admitted).toBe(1);
    // One ledger row with status "failed".
    expect(mockClient.execute).toHaveBeenCalledTimes(1);
    const call = (mockClient.execute as any).mock.calls[0][0];
    expect(call.args[0]).toBe("run-lake-miner");
    expect(call.args[1]).toBe("failed");
    const stats = JSON.parse(call.args[2]);
    expect(stats.error).toContain("phase 2 exploded");
    expect(stats.aggregate.totalJobsIngested).toBe(3);
  });

  it("never masks the original error when the failure ledger write itself fails", async () => {
    const mockReconcile = mock(async () => {
      throw new Error("original phase error");
    });
    const mockClient = {
      execute: mock(async () => {
        throw new Error("ledger insert unavailable");
      }),
    };

    const res = await runLakeMiner(
      {
        reconcilePerFamily: 10,
        domainLimit: 15,
        probeDelayMs: 1000,
        dryRun: false,
        skipReconcile: false,
        skipDomainDiscovery: true,
      },
      {
        TURSO_DATABASE_URL: "libsql://mock.turso.io",
        TURSO_AUTH_TOKEN: "mock-token",
      },
      {
        reconcileFn: mockReconcile as any,
        client: mockClient as any,
      }
    );

    expect(res.ok).toBe(false);
    expect(res.message).toContain("original phase error");
    expect(mockClient.execute).toHaveBeenCalledTimes(1);
  });

  it("skips failure ledger writes in dry-run mode", async () => {
    const mockReconcile = mock(async () => {
      throw new Error("dry-run failure");
    });
    const mockClient = {
      execute: mock(async () => ({})),
    };

    const res = await runLakeMiner(
      {
        reconcilePerFamily: 10,
        domainLimit: 15,
        probeDelayMs: 1000,
        dryRun: true,
        skipReconcile: false,
        skipDomainDiscovery: true,
      },
      {
        TURSO_DATABASE_URL: "libsql://mock.turso.io",
        TURSO_AUTH_TOKEN: "mock-token",
      },
      {
        reconcileFn: mockReconcile as any,
        client: mockClient as any,
      }
    );

    expect(res.ok).toBe(false);
    expect(mockClient.execute).toHaveBeenCalledTimes(0);
  });
});
