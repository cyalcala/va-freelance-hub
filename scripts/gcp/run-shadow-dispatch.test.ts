import { describe, expect, test } from "bun:test";
import {
  executeShadowDispatch,
  formatGcpLog,
  getConfigFromEnv,
  type ShadowDispatchConfig,
} from "./run-shadow-dispatch";

describe("Unit GCP-01: run-shadow-dispatch", () => {
  test("getConfigFromEnv provides defaults and overrides", () => {
    const origSecret = process.env.PROXY_SECRET;
    const origUrl = process.env.SHADOW_DISPATCH_API_URL;
    try {
      process.env.PROXY_SECRET = "test-secret-123";
      process.env.SHADOW_DISPATCH_API_URL = "https://custom.api/shadow";
      const config = getConfigFromEnv();
      expect(config.proxySecret).toBe("test-secret-123");
      expect(config.apiUrl).toBe("https://custom.api/shadow");
      expect(config.timeoutMs).toBe(60000);
    } finally {
      process.env.PROXY_SECRET = origSecret;
      process.env.SHADOW_DISPATCH_API_URL = origUrl;
    }
  });

  test("throws if PROXY_SECRET is missing", async () => {
    const config: ShadowDispatchConfig = {
      apiUrl: "https://test.api",
      proxySecret: "",
      timeoutMs: 5000,
    };
    expect(executeShadowDispatch(config)).rejects.toThrow("PROXY_SECRET is required");
  });

  test("parses HTTP 200 successful shadow response", async () => {
    const mockPayload = {
      ok: true,
      totalRegistryRows: 14,
      eligible: 4,
      dispatched: 4,
      skippedStaleContext: 0,
      verdict: { status: "healthy", classifications: [] },
    };

    const mockFetch = async () =>
      new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const config: ShadowDispatchConfig = {
      apiUrl: "https://remotejobs-ph.pages.dev/api/cron/shadow-dispatch",
      proxySecret: "test-secret",
      timeoutMs: 5000,
    };

    const result = await executeShadowDispatch(config, mockFetch as unknown as typeof fetch);
    expect(result.httpStatus).toBe(200);
    expect(result.evidence.outcome).toBe("success_observed");
    expect(result.evidence.totalRegistryRows).toBe(14);
    expect(result.evidence.dispatched).toBe(4);

    const logStr = formatGcpLog(result);
    const parsedLog = JSON.parse(logStr);
    expect(parsedLog.severity).toBe("INFO");
    expect(parsedLog.outcome).toBe("success_observed");
    expect(parsedLog.total_registry_rows).toBe(14);
    expect(parsedLog.dispatched).toBe(4);
  });

  test("parses HTTP 503 structured error with fingerprint", async () => {
    const mockErrorPayload = {
      ok: false,
      errorClass: "d1_probe_contract_violation",
      errorFingerprint: "461c6be7",
      failureStage: "persist_observation",
      sourceId: "greenhouse:canonical",
    };

    const mockFetch = async () =>
      new Response(JSON.stringify(mockErrorPayload), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });

    const config: ShadowDispatchConfig = {
      apiUrl: "https://remotejobs-ph.pages.dev/api/cron/shadow-dispatch",
      proxySecret: "test-secret",
      timeoutMs: 5000,
    };

    const result = await executeShadowDispatch(config, mockFetch as unknown as typeof fetch);
    expect(result.httpStatus).toBe(503);
    expect(result.evidence.outcome).toBe("specific_class_with_fingerprint");
    expect(result.evidence.errorClass).toBe("d1_probe_contract_violation");
    expect(result.evidence.errorFingerprint).toBe("461c6be7");
    expect(result.evidence.failureStage).toBe("persist_observation");

    const logStr = formatGcpLog(result);
    const parsedLog = JSON.parse(logStr);
    expect(parsedLog.severity).toBe("ERROR");
    expect(parsedLog.outcome).toBe("specific_class_with_fingerprint");
    expect(parsedLog.error_fingerprint).toBe("461c6be7");
  });

  test("handles non-JSON error body gracefully", async () => {
    const mockFetch = async () =>
      new Response("Bad Gateway", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      });

    const config: ShadowDispatchConfig = {
      apiUrl: "https://remotejobs-ph.pages.dev/api/cron/shadow-dispatch",
      proxySecret: "test-secret",
      timeoutMs: 5000,
    };

    const result = await executeShadowDispatch(config, mockFetch as unknown as typeof fetch);
    expect(result.httpStatus).toBe(502);
    expect(result.evidence.outcome).toBe("unparseable");

    const logStr = formatGcpLog(result);
    const parsedLog = JSON.parse(logStr);
    expect(parsedLog.severity).toBe("ERROR");
    expect(parsedLog.outcome).toBe("unparseable");
  });
});
