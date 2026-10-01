import { describe, it, expect, mock } from "bun:test";
import { runGcpLakeMiner, formatGcpMinerLog } from "./run-lake-miner";

describe("Unit GCP-MINER: Cloud Run Job Lake Miner Runner", () => {
  it("formats structured GCP logs conforming to GcpMinerLogPayload", () => {
    const log = formatGcpMinerLog({
      severity: "INFO",
      component: "lake-miner",
      unit: "GCP-MINER",
      event: "test_event",
      totalProbed: 30,
      totalAdmitted: 2,
      totalJobsIngested: 8,
      durationMs: 1200,
      timestamp: "2026-10-02T00:00:00.000Z",
    });

    const parsed = JSON.parse(log);
    expect(parsed.severity).toBe("INFO");
    expect(parsed.unit).toBe("GCP-MINER");
    expect(parsed.totalProbed).toBe(30);
  });

  it("handles missing credentials gracefully without throwing (fail-safe skip)", async () => {
    const result = await runGcpLakeMiner({
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
    });

    expect(result.ok).toBe(true);
    expect(result.message).toContain("Skipped");
  });

  it("executes miner and captures success metrics", async () => {
    const mockMiner = mock(async () => ({
      ok: true,
      durationMs: 500,
      aggregate: {
        totalProbed: 40,
        totalAdmitted: 4,
        totalShadowed: 6,
        totalRejected: 30,
        totalJobsIngested: 15,
      },
    }));

    const result = await runGcpLakeMiner(
      {
        TURSO_DATABASE_URL: "libsql://mock.turso.io",
        TURSO_AUTH_TOKEN: "mock-token",
      },
      {
        minerFn: mockMiner as any,
      }
    );

    expect(result.ok).toBe(true);
    expect(mockMiner).toHaveBeenCalledTimes(1);
    expect(result.aggregate?.totalProbed).toBe(40);
    expect(result.aggregate?.totalJobsIngested).toBe(15);
  });

  it("captures failure when miner reports error", async () => {
    const mockMiner = mock(async () => ({
      ok: false,
      message: "Database timeout",
      durationMs: 500,
      aggregate: {
        totalProbed: 0,
        totalAdmitted: 0,
        totalShadowed: 0,
        totalRejected: 0,
        totalJobsIngested: 0,
      },
    }));

    const result = await runGcpLakeMiner(
      {
        TURSO_DATABASE_URL: "libsql://mock.turso.io",
        TURSO_AUTH_TOKEN: "mock-token",
      },
      {
        minerFn: mockMiner as any,
      }
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Database timeout");
  });
});
