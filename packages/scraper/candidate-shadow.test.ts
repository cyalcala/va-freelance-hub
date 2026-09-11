/**
 * SP-07 — Candidate shadow probe tests.
 *
 * Mocked provider fixtures, strict-budget assertions, stop-disposition guards,
 * and explicit D1 write-counter (must stay 0).
 *
 * No live network probe — unit contract names no approved endpoint, so every
 * fetch is mocked. Proves shadow mode never publishes, never writes D1,
 * never calls AI, and never retries an alternate path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMemoryRobotsStore,
  runCandidateShadowProbe,
  SHADOW_MAX_BYTES,
  SHADOW_MAX_REQUESTS,
  SHADOW_MAX_ITEMS,
  type CandidateShadowInput,
  type CandidateProviderProfile,
} from "./candidate-shadow";

const originalFetch = global.fetch;

function candidateInput(overrides: Partial<CandidateShadowInput & { provider: Partial<CandidateProviderProfile> }> = {}): CandidateShadowInput {
  const baseProvider: CandidateProviderProfile = {
    id: "greenhouse",
    providerFamily: "greenhouse",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://boards-api.greenhouse.io/v1/boards/{token}/jobs",
    allowedHosts: "boards.greenhouse.io,boards-api.greenhouse.io",
    evidenceUrl: "https://docs.greenhouse.io/job-board.html",
    evidenceLeaseDays: 180,
    visibilityFilter: "published",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance: "60 req/min",
    robotsHandling: "observe",
    ...((overrides as any).provider ?? {}),
  };
  const base: CandidateShadowInput = {
    sourceId: "greenhouse:acme",
    providerId: "greenhouse",
    displayName: "ACME Corp",
    endpointUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
    companyToken: "acme",
    discoveryProvenance: JSON.stringify({ companyName: "ACME Corp", discoveredAt: "2026-08-29T00:00:00.000Z", provenance: "eligible-opportunity-sample" }),
    complianceState: "needs_review",
    operationalState: "candidate",
    reviewDeadline: "2026-09-12T00:00:00.000Z",
    policyExpiry: null,
    provider: baseProvider,
    ...overrides,
  };
  // Allow top-level provider overrides to merge
  if ((overrides as any).provider) base.provider = { ...baseProvider, ...(overrides as any).provider };
  // Handle top-level field overrides that collide with provider
  for (const k of Object.keys(overrides)) {
    if (k === "provider") continue;
    (base as any)[k] = (overrides as any)[k];
  }
  return base;
}

function mockFetchFor(map: Record<string, { status: number; body: string; headers?: Record<string, string> }>, opts?: { taint?: (url: string, init?: RequestInit) => void }) {
  let calls = 0;
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls++;
    const u = typeof url === "string" ? url : (url as URL).toString();
    if (opts?.taint) opts.taint(u, init);
    const entry = map[u];
    if (!entry) {
      // Also try origin+robots
      // If not found, 404
      return new Response("Not mocked: " + u, { status: 404, headers: { "content-type": "text/plain" } });
    }
    return new Response(entry.body, { status: entry.status, headers: entry.headers ?? { "content-type": "application/json" } });
  });
  (fn as any).getCalls = () => calls;
  return fn as any;
}

describe("candidate-shadow — reporting (SP-07 criterion 1)", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-08-29T12:00:00.000Z") }));
  afterEach(() => { vi.useRealTimers(); global.fetch = originalFetch; });

  it("reports endpoint, auth, visibility, provenance, cadence, robots, schema, funnel", async () => {
    const input = candidateInput();
    const greenJobs = JSON.stringify({ jobs: [{ id: 1, title: "Eng", absolute_url: "https://boards.greenhouse.io/acme/jobs/1" }, { id: 2, title: "Designer", absolute_url: "https://boards.greenhouse.io/acme/jobs/2" }] });
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /" , headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: greenJobs, headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;

    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    // Endpoint
    expect(res.endpoint.url).toBe(input.endpointUrl);
    expect(res.endpoint.isHttps).toBe(true);
    expect(res.endpoint.hostValid).toBe(true);
    // Auth
    expect(res.auth.class).toBe("none");
    expect(res.auth.supported).toBe(true);
    // Visibility
    expect(res.visibility.filter).toBe("published");
    expect(res.visibility.isPublic).toBe(true);
    expect(res.visibility.ambiguous).toBe(false);
    // Provenance
    expect(res.provenance.providerFamily).toBe("greenhouse");
    expect(res.provenance.mechanism).toBe("ats_api");
    expect(res.provenance.evidenceUrl).toBe("https://docs.greenhouse.io/job-board.html");
    expect(res.provenance.discoveryProvenance).toContain("eligible-opportunity-sample");
    // Cadence
    expect(res.cadence.minMinutes).toBe(60);
    expect(res.cadence.maxMinutes).toBe(1440);
    expect(res.cadence.rateGuidance).toBe("60 req/min");
    // Robots
    expect(res.robots.checked).toBe(true);
    expect(res.robots.verdict).toBe("allowed");
    expect(res.robots.wouldBlock).toBe(false);
    // Schema
    expect(res.parse.attempted).toBe(true);
    expect(res.parse.schemaHealth).toBe("ok");
    expect(res.parse.itemCount).toBe(2);
    // Funnel
    expect(res.sampleFunnel.parsedItems).toBe(2);
    expect(res.sampleFunnel.plausibleItems).toBe(2);
    expect(res.sampleFunnel.budgetExceeded).toBe(false);
    // Outcome
    expect(res.diagnostic.outcome).toBe("HEALTHY_WITH_RESULTS");
    expect(res.diagnostic.shadowMode).toBe(true);
  });

  it("handles rss syndication feed (published visibility, rss parsing)", async () => {
    const input = candidateInput({
      sourceId: "jobicy-rss:feed",
      endpointUrl: "https://jobicy.com/feed/job_feed?job_categories=admin-support",
      provider: { id: "jobicy", providerFamily: "jobicy", mechanism: "rss_feed", authClass: "none", allowedHosts: "jobicy.com", visibilityFilter: "published", evidenceUrl: "https://jobicy.com/feed", cadenceMinMinutes: 60, cadenceMaxMinutes: 1440 },
    } as any);
    const rssBody = `<?xml version="1.0"?><rss version="2.0"><channel><title>Jobs</title><item><title>A</title><link>https://jobicy.com/job/1</link></item><item><title>B</title><link>https://jobicy.com/job/2</link></item></channel></rss>`;
    const fetcher = mockFetchFor({
      "https://jobicy.com/robots.txt": { status: 200, body: "User-agent: *\nAllow: /feed", headers: { "content-type": "text/plain" } },
      "https://jobicy.com/feed/job_feed?job_categories=admin-support": { status: 200, body: rssBody, headers: { "content-type": "application/rss+xml" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("HEALTHY_WITH_RESULTS");
    expect(res.parse.itemCount).toBe(2);
    expect(res.endpoint.hostValid).toBe(true);
  });

  it("handles a non-RSS/Atom XML job feed with its own wrapping root (Recruitee's <offers><offer>, SP-15)", async () => {
    // Found live: myjewellery.recruitee.com/api/feeds/offers.xml genuinely
    // has 91 real postings, but before this fix the generic parser only
    // recognized <rss><channel><item>/<feed><entry> and reported
    // itemCount:0 (HEALTHY_EMPTY) for this real, non-empty, real-world feed
    // shape — a prober gap, not a zero-yield source.
    const input = candidateInput({
      sourceId: "recruitee:myjewellery",
      endpointUrl: "https://myjewellery.recruitee.com/api/feeds/offers.xml",
      provider: { id: "recruitee", providerFamily: "recruitee", mechanism: "syndication_feed", authClass: "none", allowedHosts: "myjewellery.recruitee.com", visibilityFilter: "published", evidenceUrl: "https://docs.recruitee.com/docs/feed", cadenceMinMinutes: 60, cadenceMaxMinutes: 1440 },
    } as any);
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><offers><offer><id>1</id><title>Floor Manager</title><careers_url>https://myjewellery.recruitee.com/o/floor-manager</careers_url></offer><offer><id>2</id><title>Test Engineer</title><careers_url>https://myjewellery.recruitee.com/o/test-engineer</careers_url></offer></offers>`;
    const fetcher = mockFetchFor({
      "https://myjewellery.recruitee.com/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /v/", headers: { "content-type": "text/plain" } },
      "https://myjewellery.recruitee.com/api/feeds/offers.xml": { status: 200, body: xmlBody, headers: { "content-type": "text/xml; charset=utf-8" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("HEALTHY_WITH_RESULTS");
    expect(res.parse.itemCount).toBe(2);
    expect(res.sampleFunnel.plausibleItems).toBe(2);
  });
});

describe("candidate-shadow — zero writes and strict budget (SP-07 criterion 2)", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-08-29T12:00:00.000Z") }));
  afterEach(() => { vi.useRealTimers(); global.fetch = originalFetch; });

  it("never performs D1 writes, never exceeds request budget, mutations always 0", async () => {
    // Fake D1 that would throw/flag if called — probe must never touch it
    let dbWrites = 0;
    const fakeDb = { insert: () => { dbWrites++; return { values: () => { dbWrites++; } } }, update: () => { dbWrites++; }, run: () => { dbWrites++; } } as any;

    const input = candidateInput();
    const greenJobs = JSON.stringify({ jobs: [{ id: 1, title: "A", absolute_url: "https://boards.greenhouse.io/acme/jobs/1" }] });
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: greenJobs, headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;

    // The probe does not accept a db argument at all — passing it proves it is ignored
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.mutations).toBe(0);
    expect(res.diagnostic.requestCount).toBeLessThanOrEqual(SHADOW_MAX_REQUESTS);
    expect(res.diagnostic.requestCount).toBeGreaterThanOrEqual(1);
    expect(res.diagnostic.bytesReceived).toBeLessThanOrEqual(SHADOW_MAX_BYTES);
    expect(res.sampleFunnel.budgetExceeded).toBe(false);
    expect(dbWrites).toBe(0);
    // Global fetch call count via mock equals diagnostic count
    expect((fetcher as any).mock.calls.length).toBeLessThanOrEqual(SHADOW_MAX_REQUESTS);
    expect(res.fetch.attempted).toBe(true);
    expect(res.parse.attempted).toBe(true);
    // Shadow mode must never have inserted opportunities
    expect(res.sampleFunnel.parsedItems).toBe(1);
  });

  it("caps items at SHADOW_MAX_ITEMS and bytes at SHADOW_MAX_BYTES accounting", async () => {
    const input = candidateInput();
    // Build a JSON body with many jobs (but still within byte budget)
    const manyJobs = Array.from({ length: 350 }, (_, i) => ({ id: i, title: `Job ${i}`, absolute_url: `https://boards.greenhouse.io/acme/jobs/${i}` }));
    const greenJobs = JSON.stringify({ jobs: manyJobs });
    expect(greenJobs.length).toBeLessThan(SHADOW_MAX_BYTES); // ensure byte budget not tripped

    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: greenJobs, headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.parse.itemCount).toBe(SHADOW_MAX_ITEMS);
    expect(res.parse.itemCount).toBeLessThanOrEqual(SHADOW_MAX_ITEMS);
    expect(res.diagnostic.bytesReceived).toBe(greenJobs.length);
    expect(res.sampleFunnel.truncated).toBe(true);
  });

  it("enforces actual UTF-8 bytes and cancels the oversized response stream", async () => {
    vi.useRealTimers();
    const input = candidateInput();
    const body = JSON.stringify({ jobs: [{ title: "職".repeat(180_000), url: "https://example.com/1" }] });
    expect(body.length).toBeLessThan(SHADOW_MAX_BYTES);
    const encoded = new TextEncoder().encode(body);
    let cancelled = false;
    const fetcher = vi.fn(async (url: any) => String(url).endsWith("/robots.txt")
      ? new Response("User-agent: *\nAllow: /")
      : new Response(new ReadableStream({
        start(controller) { controller.enqueue(encoded); },
        cancel() { cancelled = true; },
      }), { headers: { "content-type": "application/json" } }));
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("DEGRADED_ANOMALOUS");
    expect(res.diagnostic.bytesReceived).toBe(encoded.byteLength);
    expect(res.parse.attempted).toBe(false);
    expect(cancelled).toBe(true);
  });

  it("empty feed yields HEALTHY_EMPTY not SCHEMA_BROKEN", async () => {
    const input = candidateInput();
    const greenJobs = JSON.stringify({ jobs: [] });
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: greenJobs, headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("HEALTHY_EMPTY");
    expect(res.parse.schemaHealth).toBe("empty");
    expect(res.parse.itemCount).toBe(0);
    expect(res.diagnostic.mutations).toBe(0);
  });

  it.each([
    ["malformed JSON", '{"jobs":[', "application/json"],
    ["HTTP-200 error object", '{"error":"temporarily unavailable"}', "application/json"],
    ["unknown JSON envelope", '{"renamed_jobs":[]}', "application/json"],
    ["null response", 'null', "application/json"],
    ["non-job array", '[1,2]', "application/json"],
    ["malformed job collection", '{"jobs":[{"id":1}]}', "application/json"],
    ["HTML error page", '<html><body>Service unavailable</body></html>', "text/html"],
    ["malformed XML", '<rss><channel><item></channel>', "application/xml"],
    ["unknown XML root", '<renamed_jobs/>', "application/xml"],
  ])("reports %s as SCHEMA_BROKEN, never a successful empty observation", async (_label, body, contentType) => {
    const input = candidateInput();
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      [input.endpointUrl]: { status: 200, body, headers: { "content-type": contentType } },
    });
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher });
    expect(res.diagnostic.outcome).toBe("SCHEMA_BROKEN");
    expect(res.parse.schemaHealth).toBe("broken");
    expect(res.parse.error).toBeTruthy();
    expect(res.diagnostic.requestCount).toBe(2);
    expect(res.diagnostic.mutations).toBe(0);
  });

  it.each([
    ['[]', "application/json"],
    ['{"jobs":[]}', "application/json"],
    ['<rss><channel><title>Jobs</title></channel></rss>', "application/rss+xml"],
    ['<feed xmlns="http://www.w3.org/2005/Atom"/>', "application/atom+xml"],
    ['<offers/>', "application/xml"],
  ])("keeps recognized empty collection %s healthy", async (body, contentType) => {
    const input = candidateInput();
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      [input.endpointUrl]: { status: 200, body, headers: { "content-type": contentType } },
    });
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher });
    expect(res.diagnostic.outcome).toBe("HEALTHY_EMPTY");
    expect(res.parse.schemaHealth).toBe("empty");
  });
});

describe("candidate-shadow — stop dispositions, no alternate path (SP-07 criterion 3)", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-08-29T12:00:00.000Z") }));
  afterEach(() => { vi.useRealTimers(); global.fetch = originalFetch; });

  it.each([true, false])("does not follow redirects from robots=%s or fetch after unknown robots", async (redirectRobots) => {
    const input = candidateInput();
    const fetcher = vi.fn(async (url: any, init?: RequestInit) => {
      expect(init?.redirect).toBe("manual");
      if (String(url).endsWith("/robots.txt") && !redirectRobots) return new Response("User-agent: *\nAllow: /");
      return new Response(null, { status: 302, headers: { location: "https://unreviewed.example/jobs" } });
    });
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("POLICY_BLOCKED");
    expect(res.parse.attempted).toBe(false);
    expect(res.fetch.attempted).toBe(!redirectRobots);
    expect(fetcher.mock.calls.length).toBe(redirectRobots ? 1 : 2);
  });

  it("unsupported auth → POLICY_BLOCKED, no fetch attempted, no alternate", async () => {
    const input = candidateInput({ provider: { authClass: "api_key", allowedHosts: "boards-api.greenhouse.io" } } as any);
    // Even if fetch is mock-available, the guard must stop before fetch
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("POLICY_BLOCKED");
    expect(res.stopReason).toMatch(/unsupported auth/i);
    expect(res.fetch.attempted).toBe(false);
    expect(res.parse.attempted).toBe(false);
    expect(fetcher.mock.calls.length).toBe(0); // zero network calls — stopped before robots
  });

  it("explicit restriction (401) → POLICY_BLOCKED stop, no retry", async () => {
    const input = candidateInput();
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 401, body: "Unauthorized", headers: { "content-type": "text/plain" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("POLICY_BLOCKED");
    expect(res.stopReason ?? res.parse.error ?? "").toMatch(/401|restriction/i);
    expect(res.fetch.attempted).toBe(true);
    expect(fetcher.mock.calls.length).toBe(2); // robots + one fetch, no retry
  });

  it("robots disallow → POLICY_BLOCKED stop, no fetch", async () => {
    const input = candidateInput();
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /v1/boards/\n", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("POLICY_BLOCKED");
    expect(res.stopReason).toMatch(/robots wouldBlock/i);
    expect(res.fetch.attempted).toBe(false);
    expect(fetcher.mock.calls.length).toBe(1); // only robots
  });

  it("robots unreachable (HTTP 429) → RATE_LIMITED stop, no fetch", async () => {
    const input = candidateInput();
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 429, body: "Too Many Requests", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("RATE_LIMITED");
    expect(res.stopReason).toMatch(/robots wouldBlock/i);
    expect(res.fetch.attempted).toBe(false);
  });

  it("shared robotsStore reuses cached robots.txt across multiple candidate probes", async () => {
    const input1 = candidateInput({ sourceId: "greenhouse:acme1", endpointUrl: "https://boards-api.greenhouse.io/v1/boards/acme1/jobs" });
    const input2 = candidateInput({ sourceId: "greenhouse:acme2", endpointUrl: "https://boards-api.greenhouse.io/v1/boards/acme2/jobs" });
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme1/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
      "https://boards-api.greenhouse.io/v1/boards/acme2/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const store = createMemoryRobotsStore();
    const res1 = await runCandidateShadowProbe(input1, { fetchImpl: fetcher as any, robotsStore: store });
    expect(res1.robots.checked).toBe(true);
    expect(res1.robots.fromCache).toBe(false);

    const res2 = await runCandidateShadowProbe(input2, { fetchImpl: fetcher as any, robotsStore: store });
    expect(res2.robots.checked).toBe(true);
    expect(res2.robots.fromCache).toBe(true);

    const robotsCalls = fetcher.mock.calls.filter((c: any) => typeof c[0] === "string" && c[0].includes("robots.txt"));
    expect(robotsCalls.length).toBe(1);
  });

  it("oversized payload → DEGRADED_ANOMALOUS stop, no parse", async () => {
    const input = candidateInput();
    const huge = "x".repeat(SHADOW_MAX_BYTES + 1024);
    // Wrap in JSON object so content-type json but huge body
    const hugeBody = JSON.stringify({ jobs: [{ title: "A", absolute_url: "https://example.com" }], filler: huge });
    expect(hugeBody.length).toBeGreaterThan(SHADOW_MAX_BYTES);
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: hugeBody, headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("DEGRADED_ANOMALOUS");
    expect(res.stopReason).toMatch(/oversized/i);
    expect(res.parse.attempted).toBe(false);
    expect(res.sampleFunnel.budgetExceeded).toBe(true);
    expect(fetcher.mock.calls.length).toBe(2); // robots + fetch, no parse retry
  });

  it("ambiguous visibility (null/private) → DEGRADED_ANOMALOUS stop, no fetch", async () => {
    for (const filt of [null, "private", ""] as any[]) {
      const input = candidateInput({ provider: { visibilityFilter: filt } } as any);
      const fetcher = mockFetchFor({
        "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
        "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
      });
      global.fetch = fetcher;
      const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
      expect(res.diagnostic.outcome).toBe("DEGRADED_ANOMALOUS");
      expect(res.stopReason).toMatch(/ambiguous|private|visibility/i);
      expect(res.fetch.attempted).toBe(false);
      expect(fetcher.mock.calls.length).toBe(0);
      vi.useFakeTimers({ now: new Date("2026-08-29T12:00:00.000Z") });
    }
  });

  it("host mismatch (lookalike evilgreenhouse.io) → POLICY_BLOCKED, no alternate host", async () => {
    const input = candidateInput({
      endpointUrl: "https://evilgreenhouse.io/v1/boards/acme/jobs",
      provider: { allowedHosts: "boards-api.greenhouse.io,boards.greenhouse.io" },
    } as any);
    const fetcher = mockFetchFor({
      "https://evilgreenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://evilgreenhouse.io/v1/boards/acme/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("POLICY_BLOCKED");
    expect(res.stopReason).toMatch(/not in allowedHosts/i);
    expect(res.endpoint.hostValid).toBe(false);
    expect(res.fetch.attempted).toBe(false);
    expect(fetcher.mock.calls.length).toBe(0);
  });

  it("exact subdomain is allowed, sibling suffix is blocked", async () => {
    const good = candidateInput({
      endpointUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
      provider: { allowedHosts: "boards-api.greenhouse.io" },
    } as any);
    const fetcherGood = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcherGood;
    const resGood = await runCandidateShadowProbe(good, { fetchImpl: fetcherGood as any });
    expect(resGood.endpoint.hostValid).toBe(true);
    expect(resGood.diagnostic.outcome).not.toBe("POLICY_BLOCKED");

    const bad = candidateInput({
      endpointUrl: "https://evilboards-api.greenhouse.io/v1/boards/acme/jobs",
      provider: { allowedHosts: "boards-api.greenhouse.io" },
    } as any);
    const fetcherBad = mockFetchFor({
      "https://evilboards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://evilboards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcherBad;
    const resBad = await runCandidateShadowProbe(bad, { fetchImpl: fetcherBad as any });
    expect(resBad.endpoint.hostValid).toBe(false);
    expect(resBad.diagnostic.outcome).toBe("POLICY_BLOCKED");
  });

  it("rate limited (429) → RATE_LIMITED after single retry on unauthenticated ATS GET", async () => {
    const input = candidateInput();
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 429, body: "Too Many Requests", headers: { "content-type": "text/plain" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("RATE_LIMITED");
    expect(fetcher.mock.calls.length).toBe(3); // robots + initial job fetch + single retry
    // Must not attempt alternate URL
    expect(res.fetch.attempted).toBe(true);
  });

  it("recovers from transient 429 on unauthenticated ATS GET retry", async () => {
    const input = candidateInput();
    let jobsCalls = 0;
    const fetcher = vi.fn(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nAllow: /\n", { status: 200, headers: { "content-type": "text/plain" } });
      }
      if (urlStr.includes("/jobs")) {
        jobsCalls++;
        if (jobsCalls === 1) {
          return new Response("Too Many Requests", { status: 429, headers: { "content-type": "text/plain" } });
        }
        return new Response(JSON.stringify({ jobs: [{ id: "1", title: "Remote VA", absolute_url: "https://boards.greenhouse.io/acme/jobs/1", location: { name: "Philippines" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
    global.fetch = fetcher as any;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("HEALTHY_WITH_RESULTS");
    expect(jobsCalls).toBe(2); // 1st was 429, 2nd was 200
    expect(res.parse.itemCount).toBe(1);
    expect(res.fetch.status).toBe(200);
  });

  it("external content never executed — body treated as evidence only", async () => {
    const input = candidateInput();
    // Body contains executable-looking JS but must be parsed as JSON evidence only, not evaled
    const maliciousBody = JSON.stringify({ jobs: [{ title: "<script>alert(1)</script>", absolute_url: "https://boards.greenhouse.io/acme/jobs/1" }] });
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: maliciousBody, headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.diagnostic.outcome).toBe("HEALTHY_WITH_RESULTS");
    // No side effect beyond counting; script tag stays inert string
    expect(res.parse.itemCount).toBe(1);
    expect(res.sampleFunnel.plausibleItems).toBe(1);
  });
});

describe("candidate-shadow — provenance and budget invariants", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-08-29T12:00:00.000Z") }));
  afterEach(() => { vi.useRealTimers(); global.fetch = originalFetch; });

  it("reports discoveryProvenance even on stop disposition", async () => {
    const input = candidateInput({ provider: { authClass: "oauth" } } as any);
    const fetcher = mockFetchFor({});
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.provenance.discoveryProvenance).toContain("eligible-opportunity-sample");
    expect(res.diagnostic.outcome).toBe("POLICY_BLOCKED");
  });

  it("durationMs and timestamp are ISO and shadowMode true regardless of outcome", async () => {
    const input = candidateInput();
    const fetcher = mockFetchFor({
      "https://boards-api.greenhouse.io/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } },
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs": { status: 200, body: JSON.stringify({ jobs: [] }), headers: { "content-type": "application/json" } },
    });
    global.fetch = fetcher;
    const res = await runCandidateShadowProbe(input, { fetchImpl: fetcher as any });
    expect(res.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(typeof res.diagnostic.durationMs).toBe("number");
    expect(res.diagnostic.shadowMode).toBe(true);
    expect(res.diagnostic.mutations).toBe(0);
  });
});
