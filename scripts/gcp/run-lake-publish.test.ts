import { describe, expect, it } from "bun:test";
import { runLakePublish, formatGcpLog, type LakePublishLogPayload } from "./run-lake-publish";

describe("Unit GCP-02: Cloud Run Job Lake Publication Runner", () => {
  it("formats structured GCP logs conforming to LakePublishLogPayload", () => {
    const payload: LakePublishLogPayload = {
      severity: "INFO",
      component: "lake-publish",
      unit: "GCP-02",
      event: "lake_publish_completed",
      syncedCount: 42,
      enrolledSources: 3,
      durationMs: 1250,
      timestamp: "2026-10-01T12:00:00.000Z",
    };

    const formatted = formatGcpLog(payload);
    expect(formatted).toContain('"component":"lake-publish"');
    expect(formatted).toContain('"unit":"GCP-02"');
    expect(formatted).toContain('"syncedCount":42');

    const parsed = JSON.parse(formatted);
    expect(parsed.severity).toBe("INFO");
    expect(parsed.syncedCount).toBe(42);
    expect(parsed.enrolledSources).toBe(3);
  });

  it("handles missing credentials gracefully without throwing (fail-safe skip)", async () => {
    // Empty env
    const mockEnv = {
      TURSO_DATABASE_URL: "",
      CLOUDFLARE_API_TOKEN: "",
    };

    const result = await runLakePublish(mockEnv as any);
    expect(result.ok).toBe(true);
    expect(result.syncedCount).toBe(0);
    expect(result.message).toContain("Skipped: TURSO_DATABASE_URL or CLOUDFLARE_API_TOKEN is not configured");
  });

  it("fails safe when TURSO_DATABASE_URL is provided but CLOUDFLARE_API_TOKEN is missing", async () => {
    const mockEnv = {
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      CLOUDFLARE_API_TOKEN: "",
    };

    const result = await runLakePublish(mockEnv as any);
    expect(result.ok).toBe(true);
    expect(result.syncedCount).toBe(0);
    expect(result.message).toContain("Skipped");
  });

  it("captures errors properly when an operation throws", async () => {
    const mockEnv = {
      TURSO_DATABASE_URL: "libsql://test.turso.io",
      TURSO_AUTH_TOKEN: "dummy",
      CLOUDFLARE_API_TOKEN: "dummy",
      CLOUDFLARE_ACCOUNT_ID: "dummy",
      PROXY_SECRET: "dummy",
    };

    const throwingSync = async () => {
      throw new Error("D1 connection refused");
    };

    const result = await runLakePublish(mockEnv as any, { syncFn: throwingSync as any });
    expect(result.ok).toBe(false);
    expect(result.syncedCount).toBe(0);
    expect(result.message).toContain("D1 connection refused");
  });
});
