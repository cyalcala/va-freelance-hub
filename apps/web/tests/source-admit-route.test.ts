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
  test("allowlist includes Grafana Labs, Recruitee, Teamtailor, and Greenhouse Tier A boards", () => {
    expect([...SOURCE_ADMIT_ALLOWLIST]).toEqual([
      "greenhouse:grafanalabs",
      "recruitee:myjewellery",
      "teamtailor:career.teamtailor.com",
      "greenhouse:gitlab",
      "greenhouse:remotecom",
      "greenhouse:nearform",
      "greenhouse:ghost",
      "greenhouse:canonical",
      "greenhouse:wikimedia",
      "breezy:20four7va",
      "breezy:sourcefit",
      "breezy:time-etc",
      "breezy:vaaphilippines-recruitment",
      "breezy:yokly",
      "breezy:remote-craft",
      "breezy:value-virtual-assistants",
      "workable:coconutva",
      "workable:crewbloom",
      "workable:pearltalent",
      "workable:rocketams",
      "workable:hunt-st",
      "workable:hello-rache",
    ]);
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
    const response = await handler(requestContext({ sourceId: "greenhouse:unknowncompany" }));
    expect(response.status).toBe(400);
  });

  test("admits Grafana Labs to shadow without publishing jobs", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
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
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "greenhouse:grafanalabs", published: 0 });
  });

  test("admits Recruitee My Jewellery to shadow without publishing jobs", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
      wrapDb: () => ({ prepare() { throw new Error("unused"); } }) as any,
      runProbe: async (input) => ({
        version: SHADOW_VERSION,
        timestamp: NOW,
        sourceId: input.sourceId,
        providerId: input.providerId,
        displayName: input.displayName,
        endpoint: { url: input.endpointUrl, isHttps: true, host: "myjewellery.recruitee.com", allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
        auth: { class: "none", supported: true },
        visibility: { filter: "published", isPublic: true, ambiguous: false },
        provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: "recruitee", mechanism: "syndication_feed" },
        cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: input.provider.rateGuidance ?? null },
        robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "allow", fromCache: false },
        fetch: { attempted: true, status: 200, latencyMs: 1, bytesReceived: 10, contentType: "application/xml" },
        parse: { attempted: true, schemaHealth: "ok", itemCount: 1 },
        sampleFunnel: { bytesReceived: 10, parsedItems: 1, plausibleItems: 1, truncated: false, budgetExceeded: false },
        diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 10, durationMs: 2, mutations: 0, shadowMode: true },
      }),
      admit: async (_db, input) => {
        expect(input.source.sourceId).toBe("recruitee:myjewellery");
        expect(input.source.operationalState).toBe("candidate");
        expect(input.provider.mechanism).toBe("syndication_feed");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "recruitee:myjewellery" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "recruitee:myjewellery", published: 0 });
  });

  test("admits Teamtailor career site to shadow without publishing jobs", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
      wrapDb: () => ({ prepare() { throw new Error("unused"); } }) as any,
      runProbe: async (input) => ({
        version: SHADOW_VERSION,
        timestamp: NOW,
        sourceId: input.sourceId,
        providerId: input.providerId,
        displayName: input.displayName,
        endpoint: { url: input.endpointUrl, isHttps: true, host: "career.teamtailor.com", allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
        auth: { class: "none", supported: true },
        visibility: { filter: "published", isPublic: true, ambiguous: false },
        provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: "teamtailor", mechanism: "rss_feed" },
        cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: input.provider.rateGuidance ?? null },
        robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "allow", fromCache: false },
        fetch: { attempted: true, status: 200, latencyMs: 1, bytesReceived: 10, contentType: "application/rss+xml" },
        parse: { attempted: true, schemaHealth: "ok", itemCount: 1 },
        sampleFunnel: { bytesReceived: 10, parsedItems: 1, plausibleItems: 1, truncated: false, budgetExceeded: false },
        diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 10, durationMs: 2, mutations: 0, shadowMode: true },
      }),
      admit: async (_db, input) => {
        expect(input.source.sourceId).toBe("teamtailor:career.teamtailor.com");
        expect(input.source.operationalState).toBe("candidate");
        expect(input.provider.mechanism).toBe("rss_feed");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "teamtailor:career.teamtailor.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "teamtailor:career.teamtailor.com", published: 0 });
  });

  test("admits EX-08 greenhouse:gitlab to shadow under Tier A fast-track", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
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
        expect(input.source.sourceId).toBe("greenhouse:gitlab");
        expect(input.source.operationalState).toBe("candidate");
        expect(input.source.displayName).toBe("GitLab");
        expect(input.adjudicationRef).toBe("ex-08-greenhouse-gitlab-tier-a-fast-track");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "greenhouse:gitlab" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "greenhouse:gitlab", published: 0 });
  });

  test("admits greenhouse:canonical to shadow under Tier A fast-track with Canonical displayName", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
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
        expect(input.source.sourceId).toBe("greenhouse:canonical");
        expect(input.source.operationalState).toBe("candidate");
        expect(input.source.displayName).toBe("Canonical");
        expect(input.adjudicationRef).toBe("ex-08-greenhouse-canonical-tier-a-fast-track");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "greenhouse:canonical" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "greenhouse:canonical", published: 0 });
  });

  test("admits breezy:20four7va to shadow under Tier A fast-track with 20Four7VA displayName", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
      wrapDb: () => ({ prepare() { throw new Error("unused"); } }) as any,
      runProbe: async (input) => ({
        version: SHADOW_VERSION,
        timestamp: NOW,
        sourceId: input.sourceId,
        providerId: input.providerId,
        displayName: input.displayName,
        endpoint: { url: input.endpointUrl, isHttps: true, host: "20four7va.breezy.hr", allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
        auth: { class: "none", supported: true },
        visibility: { filter: "published", isPublic: true, ambiguous: false },
        provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: "breezy", mechanism: "ats_api" },
        cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: input.provider.rateGuidance ?? null },
        robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "allow", fromCache: false },
        fetch: { attempted: true, status: 200, latencyMs: 1, bytesReceived: 10, contentType: "application/json" },
        parse: { attempted: true, schemaHealth: "ok", itemCount: 1 },
        sampleFunnel: { bytesReceived: 10, parsedItems: 1, plausibleItems: 1, truncated: false, budgetExceeded: false },
        diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 10, durationMs: 2, mutations: 0, shadowMode: true },
      }),
      admit: async (_db, input) => {
        expect(input.source.sourceId).toBe("breezy:20four7va");
        expect(input.source.operationalState).toBe("candidate");
        expect(input.source.displayName).toBe("20Four7VA");
        expect(input.adjudicationRef).toBe("ex-ph-agency-breezy-20four7va-tier-a-fast-track");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "breezy:20four7va" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "breezy:20four7va", published: 0 });
  });

  test("admits breezy:sourcefit to shadow under Tier A fast-track with Sourcefit displayName and shared provider allowedHosts", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
      wrapDb: () => ({ prepare() { throw new Error("unused"); } }) as any,
      runProbe: async (input) => ({
        version: SHADOW_VERSION,
        timestamp: NOW,
        sourceId: input.sourceId,
        providerId: input.providerId,
        displayName: input.displayName,
        endpoint: { url: input.endpointUrl, isHttps: true, host: "sourcefit.breezy.hr", allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
        auth: { class: "none", supported: true },
        visibility: { filter: "published", isPublic: true, ambiguous: false },
        provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: "breezy", mechanism: "ats_api" },
        cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: input.provider.rateGuidance ?? null },
        robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "allow", fromCache: false },
        fetch: { attempted: true, status: 200, latencyMs: 1, bytesReceived: 10, contentType: "application/json" },
        parse: { attempted: true, schemaHealth: "ok", itemCount: 1 },
        sampleFunnel: { bytesReceived: 10, parsedItems: 1, plausibleItems: 1, truncated: false, budgetExceeded: false },
        diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 10, durationMs: 2, mutations: 0, shadowMode: true },
      }),
      admit: async (_db, input) => {
        expect(input.source.sourceId).toBe("breezy:sourcefit");
        expect(input.source.operationalState).toBe("candidate");
        expect(input.source.displayName).toBe("Sourcefit");
        expect(input.provider.allowedHosts).toBe("20four7va.breezy.hr,breezy.hr");
        expect(input.adjudicationRef).toBe("ex-ph-agency-breezy-sourcefit-tier-a-fast-track");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "breezy:sourcefit" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "breezy:sourcefit", published: 0 });
  });

  test("admits breezy:yokly to shadow under Tier A fast-track with Yokly displayName", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
      wrapDb: () => ({ prepare() { throw new Error("unused"); } }) as any,
      runProbe: async (input) => ({
        version: SHADOW_VERSION,
        timestamp: NOW,
        sourceId: input.sourceId,
        providerId: input.providerId,
        displayName: input.displayName,
        endpoint: { url: input.endpointUrl, isHttps: true, host: "yokly.breezy.hr", allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
        auth: { class: "none", supported: true },
        visibility: { filter: "published", isPublic: true, ambiguous: false },
        provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: "breezy", mechanism: "ats_api" },
        cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: input.provider.rateGuidance ?? null },
        robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "allow", fromCache: false },
        fetch: { attempted: true, status: 200, latencyMs: 1, bytesReceived: 10, contentType: "application/json" },
        parse: { attempted: true, schemaHealth: "ok", itemCount: 11 },
        sampleFunnel: { bytesReceived: 10, parsedItems: 11, plausibleItems: 11, truncated: false, budgetExceeded: false },
        diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 10, durationMs: 2, mutations: 0, shadowMode: true },
      }),
      admit: async (_db, input) => {
        expect(input.source.sourceId).toBe("breezy:yokly");
        expect(input.source.operationalState).toBe("candidate");
        expect(input.source.displayName).toBe("Yokly");
        expect(input.provider.allowedHosts).toBe("20four7va.breezy.hr,breezy.hr");
        expect(input.adjudicationRef).toBe("ex-ph-agency-breezy-yokly-tier-a-fast-track");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "breezy:yokly" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "breezy:yokly", published: 0 });
  });

  test("admits workable:coconutva to shadow under Tier A fast-track with Coconut VA displayName", async () => {
    const handler = createSourceAdmitHandler({
      now: () => NOW,
      fetchEvidence: async () => "actual primary source document",
      hash: async (content) => { expect(content).toBe("actual primary source document"); return "a".repeat(64); },
      wrapDb: () => ({ prepare() { throw new Error("unused"); } }) as any,
      runProbe: async (input) => ({
        version: SHADOW_VERSION,
        timestamp: NOW,
        sourceId: input.sourceId,
        providerId: input.providerId,
        displayName: input.displayName,
        endpoint: { url: input.endpointUrl, isHttps: true, host: "apply.workable.com", allowedHosts: input.provider.allowedHosts ?? null, hostValid: true },
        auth: { class: "none", supported: true },
        visibility: { filter: "published", isPublic: true, ambiguous: false },
        provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: "workable", mechanism: "ats_api" },
        cadence: { minMinutes: 60, maxMinutes: 1440, rateGuidance: input.provider.rateGuidance ?? null },
        robots: { checked: true, verdict: "allowed", wouldBlock: false, evidence: "allow", fromCache: false },
        fetch: { attempted: true, status: 200, latencyMs: 1, bytesReceived: 10, contentType: "application/json" },
        parse: { attempted: true, schemaHealth: "ok", itemCount: 41 },
        sampleFunnel: { bytesReceived: 10, parsedItems: 41, plausibleItems: 41, truncated: false, budgetExceeded: false },
        diagnostic: { outcome: "HEALTHY_WITH_RESULTS", probes: [], requestCount: 2, bytesReceived: 10, durationMs: 2, mutations: 0, shadowMode: true },
      }),
      admit: async (_db, input) => {
        expect(input.source.sourceId).toBe("workable:coconutva");
        expect(input.source.operationalState).toBe("candidate");
        expect(input.source.displayName).toBe("Coconut VA");
        expect(input.provider.allowedHosts).toBe("apply.workable.com");
        expect(input.adjudicationRef).toBe("ex-ph-agency-workable-coconutva-tier-a-fast-track");
        return { ok: true, sourceId: input.source.sourceId };
      },
    });
    const response = await handler(requestContext({ sourceId: "workable:coconutva" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: "shadow", sourceId: "workable:coconutva", published: 0 });
  });
});

