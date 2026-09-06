import { describe, expect, test } from "bun:test";
import { createSourceAdmitHandler, SOURCE_ADMIT_ALLOWLIST } from "../src/pages/api/cron/source-admit";
import { SHADOW_VERSION } from "@va-hub/scraper";

const NOW = "2026-09-06T12:00:00.000Z";

function requestContext(body: unknown, authorized = true, hasDb = true) {
  return {
    request: new Request("https://remotejobs-ph.pages.dev/api/cron/source-admit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorized ? { Authorization: "Bearer test-secret" } : {}),
      },
      body: JSON.stringify(body),
    }),
    locals: { runtime: { env: { CRON_SECRET: "test-secret", DB: hasDb ? { prepare() { return {}; } } : undefined } } },
  } as any;
}

describe("source-admit route", () => {
  test("allowlist is Grafana Labs only for EX-02", () => {
    expect([...SOURCE_ADMIT_ALLOWLIST]).toEqual(["greenhouse:grafanalabs"]);
  });

  test("unauthorized requests do not probe or write", async () => {
    let probed = 0;
    const handler = createSourceAdmitHandler({
      runProbe: async () => { probed += 1; throw new Error("must not probe"); },
      admit: async () => { throw new Error("must not admit"); },
    });
    expect((await handler(requestContext({ sourceId: "greenhouse:grafanalabs" }, false))).status).toBe(401);
    expect(probed).toBe(0);
  });

  test("rejects a source outside the allowlist", async () => {
    const handler = createSourceAdmitHandler({
      runProbe: async () => { throw new Error("must not probe"); },
      admit: async () => { throw new Error("must not admit"); },
    });
    const response = await handler(requestContext({ sourceId: "greenhouse:gitlab" }));
    expect(response.status).toBe(400);
  });

  test("admits Grafana Labs to shadow without publishing jobs", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      hash: async () => "a".repeat(64),
      wrapDb: () => ({ prepare() { throw new Error("unused"); } }) as any,
      runProbe: async (input) => ({
        version: SHADOW_VERSION,
        timestamp: NOW,
        sourceId: input.sourceId,
        providerId: input.providerId,
        displayName: input.displayName,
        endpoint: { url: input.endpointUrl, isHttps: true, host: "boards-api.greenhouse.io", allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
        auth: { class: "none", supported: true },
        visibility: { filter: "published", isPublic: true, ambiguous: false },
        provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: "greenhouse", mechanism: "ats_api" },
        cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: input.provider.rateGuidance ?? null },
        robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "allow", fromCache: false },
        fetch: { attempted: true, status: 200, latencyMs: 1, bytesReceived: 10, contentType: "application/json" },
        parse: { attempted: true, schemaHealth: "ok", itemCount: 1 },
        sampleFunnel: { bytesReceived: 10, parsedItems: 1, plausibleItems: 1, truncated: false, budgetExceeded: false },
        diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 10, durationMs: 2, mutations: 0, shadowMode: true },
      }),
      admit: async (_db, input) => {
        expect(input.source.sourceId).toBe("greenhouse:grafanalabs");
        expect(input.source.operationalState).toBe("candidate");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "greenhouse:grafanalabs" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "shadow", sourceId: "greenhouse:grafanalabs", published: 0 });
  });
});
