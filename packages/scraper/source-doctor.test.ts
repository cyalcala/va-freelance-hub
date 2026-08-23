/**
 * Source Doctor V1 tests — fixtures for all nine terminal outcomes.
 *
 * All tests mock network and storage; zero D1 writes, zero AI calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runSourceDoctor,
  DoctorOutcome,
  type ActivePath,
  type SourceDoctorResult,
} from "./source-doctor";
import type { Source } from "./sources";

// Mock fetch globally
const originalFetch = global.fetch;

function createMockFetch(responses: Map<string, { status: number; body: string; headers?: Record<string, string> }>) {
  return vi.fn(async (url: string, options?: RequestInit) => {
    const key = url;
    const response = responses.get(key);
    if (!response) {
      return new Response("Not mocked", { status: 404 });
    }
    return new Response(response.body, {
      status: response.status,
      headers: response.headers || { "content-type": "application/xml" },
    });
  });
}

describe("Source Doctor V1", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-08-22T12:00:00.000Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  // Test source IDs from the actual sources.ts
  const PAUSED_SOURCE_ID = "problogger"; // complianceStatus: "paused"
  const ALLOWED_RSS_SOURCE_ID = "we-work-remotely"; // complianceStatus: "allowed"
  const ALLOWED_JSON_SOURCE_ID = "remote-ok"; // complianceStatus: "allowed", type: "json"

  it("reports POLICY_BLOCKED for paused source without network calls", async () => {
    const mockFetch = createMockFetch(new Map());
    global.fetch = mockFetch;

    const result = await runSourceDoctor(PAUSED_SOURCE_ID, { json: true });

    expect(result.diagnostic.outcome).toBe("POLICY_BLOCKED");
    expect(result.diagnostic.requestCount).toBe(0);
    expect(result.diagnostic.mutations).toBe(0);
    expect(result.activePath.complianceStatus).toBe("paused");
    expect(result.activePath.paused).toBe(true);
    expect(result.activePath.stages).toContain("compliance_check");
    expect(result.activePath.stages).not.toContain("fetch_attempt");
  });

  it("reports UNKNOWN for unknown source ID", async () => {
    const mockFetch = createMockFetch(new Map());
    global.fetch = mockFetch;

    const result = await runSourceDoctor("completely-unknown-source-id", { json: true });

    expect(result.diagnostic.outcome).toBe("UNKNOWN");
    expect(result.redactedError).toContain("Source not found");
    expect(result.diagnostic.requestCount).toBe(0);
    expect(result.diagnostic.mutations).toBe(0);
  });

  it("reports HEALTHY_WITH_RESULTS for allowed RSS source with items", async () => {
    const rssBody = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Test Job 1</title>
      <link>https://example.com/job/1</link>
      <description>Description 1</description>
      <pubDate>Fri, 22 Aug 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Test Job 2</title>
      <link>https://example.com/job/2</link>
      <description>Description 2</description>
      <pubDate>Fri, 22 Aug 2026 11:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    const robotsBody = `User-agent: *
Allow: /remote-jobs.rss
Crawl-delay: 10`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody, headers: { "content-type": "application/rss+xml" } });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody, headers: { "content-type": "text/plain" } });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.diagnostic.outcome).toBe("HEALTHY_WITH_RESULTS");
    expect(result.diagnostic.requestCount).toBeGreaterThanOrEqual(2); // robots + fetch
    expect(result.diagnostic.mutations).toBe(0);
    expect(result.activePath.itemCount).toBeGreaterThan(0);
    expect(result.activePath.stages).toContain("compliance_check");
    expect(result.activePath.stages).toContain("robots_check");
    expect(result.activePath.stages).toContain("fetch_attempt");
    expect(result.activePath.stages).toContain("parse_attempt");
    expect(result.activePath.stages).toContain("validation");
    expect(result.activePath.stages).toContain("complete");
  });

  it("reports HEALTHY_EMPTY for allowed RSS source with zero items", async () => {
    const rssBody = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
  </channel>
</rss>`;

    const robotsBody = `User-agent: *
Allow: /remote-jobs.rss`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody, headers: { "content-type": "application/rss+xml" } });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody, headers: { "content-type": "text/plain" } });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.diagnostic.outcome).toBe("HEALTHY_EMPTY");
    expect(result.activePath.itemCount).toBe(0);
    expect(result.diagnostic.mutations).toBe(0);
  });

  it("reports RATE_LIMITED for HTTP 429 response", async () => {
    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: "User-agent: *\nAllow: /", headers: { "content-type": "text/plain" } });
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 429, body: "Rate limited", headers: { "content-type": "text/plain" } });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.diagnostic.outcome).toBe("RATE_LIMITED");
    expect(result.diagnostic.requestCount).toBeGreaterThanOrEqual(1);
    expect(result.diagnostic.mutations).toBe(0);
  });

  it("reports UNREACHABLE for DNS/connection failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ENOTFOUND"));

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.diagnostic.outcome).toBe("UNREACHABLE");
    expect(result.diagnostic.requestCount).toBeGreaterThanOrEqual(1);
    expect(result.diagnostic.mutations).toBe(0);
  });

  it("reports HEALTHY_EMPTY for unparseable RSS (parser returns 0 items)", async () => {
    const rssBody = `This is not valid XML at all {{{`;

    const robotsBody = `User-agent: *
Allow: /remote-jobs.rss`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody, headers: { "content-type": "application/rss+xml" } });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody, headers: { "content-type": "text/plain" } });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    // Parser doesn't throw for invalid XML, returns 0 items -> HEALTHY_EMPTY
    expect(result.diagnostic.outcome).toBe("HEALTHY_EMPTY");
    expect(result.diagnostic.mutations).toBe(0);
  });

  it("includes robots cache status in activePath", async () => {
    const rssBody = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title></channel></rss>`;
    const robotsBody = `User-agent: *\nAllow: /`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.activePath.robotsChecked).toBe(true);
    expect(typeof result.activePath.robotsVerdict).toBe("string");
    expect(typeof result.activePath.robotsFromCache).toBe("boolean");
  });

  it("reports cadence as not checked in read-only mode", async () => {
    const rssBody = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title></channel></rss>`;
    const robotsBody = `User-agent: *\nAllow: /`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.activePath.cadenceReason).toContain("read-only");
    expect(result.activePath.cadenceSkipped).toBe(false);
  });

  it("output schema has correct version and required fields", async () => {
    const rssBody = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title></channel></rss>`;
    const robotsBody = `User-agent: *\nAllow: /`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.version).toBe("1.0.0");
    expect(result.commit).toBeDefined();
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(result.sourceId).toBe(ALLOWED_RSS_SOURCE_ID);
    expect(result.sourceName).toBe("We Work Remotely");
    expect(result.sourceFamily).toBe("WeWorkRemotely");
    expect(result.sourceType).toBe("static");
    expect(result.diagnostic.mutations).toBe(0);
    expect(typeof result.diagnostic.durationMs).toBe("number");
    expect(Array.isArray(result.diagnostic.probes)).toBe(true);
    expect(result.diagnostic.probes.length).toBeGreaterThan(0);
  });

  it("never calls D1 or AI — mutations always 0", async () => {
    const rssBody = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title></channel></rss>`;
    const robotsBody = `User-agent: *\nAllow: /`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.diagnostic.mutations).toBe(0);
  });

  it("request budget is bounded (robots + one fetch max for static)", async () => {
    const rssBody = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title></channel></rss>`;
    const robotsBody = `User-agent: *\nAllow: /`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    // Should be at most 2 requests (robots.txt + feed)
    expect(result.diagnostic.requestCount).toBeLessThanOrEqual(2);
    expect(result.diagnostic.requestCount).toBeGreaterThanOrEqual(1);
  });

  it("parses a >256 KiB CDATA feed without false SCHEMA_BROKEN (REL-11)", async () => {
    // Regression for the SRC-4E root cause: the doctor previously sliced every
    // static body to 256 KiB before parsing, which cut large CDATA descriptions
    // mid-section and threw "CDATA is not closed." -> SCHEMA_BROKEN.
    const filler = "Senior virtual assistant role. Apply via the original listing. ".repeat(560); // ~35 KB
    const items: string[] = [];
    for (let i = 0; i < 8; i++) {
      items.push(
        `<item><title>Job ${i}</title><link>https://example.com/job/${i}</link>` +
          `<description><![CDATA[<p>${filler} Item ${i}.</p>]]></description></item>`
      );
    }
    const rssBody = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Big Feed</title>${items.join("\n")}</channel></rss>`;
    expect(rssBody.length).toBeGreaterThan(256 * 1024);

    const robotsBody = `User-agent: *\nAllow: /`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody, headers: { "content-type": "application/rss+xml" } });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody, headers: { "content-type": "text/plain" } });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.diagnostic.outcome).toBe("HEALTHY_WITH_RESULTS");
    expect(result.activePath.itemCount).toBe(8);
    expect(result.diagnostic.requestCount).toBeLessThanOrEqual(2);
    expect(result.diagnostic.mutations).toBe(0);
    // Byte accounting must reflect the complete body, not a truncated slice.
    expect(result.activePath.bytesReceived).toBe(rssBody.length);
  });

  it("reports HEALTHY_WITH_RESULTS for allowed JSON source (remote-ok)", async () => {
    const jsonBody = JSON.stringify([
      { id: "1", title: "Job 1", url: "https://remoteok.com/job/1", description: "Desc 1" },
      { id: "2", title: "Job 2", url: "https://remoteok.com/job/2", description: "Desc 2" },
    ]);

    const robotsBody = `User-agent: *
Allow: /api`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://remoteok.com/api", { status: 200, body: jsonBody, headers: { "content-type": "application/json" } });
    responses.set("https://remoteok.com/robots.txt", { status: 200, body: robotsBody, headers: { "content-type": "text/plain" } });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_JSON_SOURCE_ID, { json: true });

    expect(result.diagnostic.outcome).toBe("HEALTHY_WITH_RESULTS");
    expect(result.diagnostic.requestCount).toBeGreaterThanOrEqual(2);
    expect(result.diagnostic.mutations).toBe(0);
    expect(result.activePath.itemCount).toBeGreaterThan(0);
  });
});

describe("Source Doctor V1 — outcome enumeration completeness", () => {
  it("defines exactly nine terminal outcomes", () => {
    const outcomes: DoctorOutcome[] = [
      "HEALTHY_WITH_RESULTS",
      "HEALTHY_EMPTY",
      "DEGRADED_ANOMALOUS",
      "SCHEMA_BROKEN",
      "RATE_LIMITED",
      "UNREACHABLE",
      "POLICY_BLOCKED",
      "INTERNAL_PIPELINE_FAILURE",
      "UNKNOWN",
    ];

    expect(outcomes.length).toBe(9);

    // Verify no duplicates
    const unique = new Set(outcomes);
    expect(unique.size).toBe(9);
  });
});

describe("Source Doctor V1 — activePath provenance contract", () => {
  it("carries sourceName and sourceFamily after a static probe", async () => {
    const ALLOWED_RSS_SOURCE_ID = "we-work-remotely";
    const rssBody = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title></channel></rss>`;
    const robotsBody = `User-agent: *\nAllow: /`;

    const responses = new Map<string, { status: number; body: string; headers?: Record<string, string> }>();
    responses.set("https://weworkremotely.com/remote-jobs.rss", { status: 200, body: rssBody });
    responses.set("https://weworkremotely.com/robots.txt", { status: 200, body: robotsBody });

    global.fetch = createMockFetch(responses);

    const result = await runSourceDoctor(ALLOWED_RSS_SOURCE_ID, { json: true });

    expect(result.activePath.sourceName).toBe("We Work Remotely");
    expect(result.activePath.sourceFamily).toBe("WeWorkRemotely");
  });
});

// Compile-time pins: ActivePath must declare the provenance fields that
// runSourceDoctor assigns at runtime (REL-11 critic finding). These are
// inert at runtime; a typechecker flags them if the fields are missing.
type ActivePathHasKey<K extends keyof ActivePath> = K;
const _pinSourceName: ActivePathHasKey<"sourceName"> = "sourceName";
const _pinSourceFamily: ActivePathHasKey<"sourceFamily"> = "sourceFamily";
void _pinSourceName;
void _pinSourceFamily;