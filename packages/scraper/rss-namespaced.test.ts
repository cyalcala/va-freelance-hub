import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { XMLParser } from "fast-xml-parser";
import { xmlNodeText } from "./text";
import { fetchRSSFeed } from "./rss";
import { geoGate } from "./geoGate";
import type { Source } from "./sources";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  htmlEntities: true,
});

const SAMPLE_JOBICY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:job_listing="https://jobicy.com">
  <channel>
    <title>Jobicy Feed</title>
    <item>
      <title>Sales Assistant</title>
      <link>https://jobicy.com/jobs/150234-sales-assistant</link>
      <pubDate>Sat, 05 Sep 2026 05:30:10 +0000</pubDate>
      <description><![CDATA[Sales Assistant Department: Operations Location: Client Compensation: ₱50,000 – ₱60,000 / month]]></description>
      <job_listing:location><![CDATA[Philippines]]></job_listing:location>
      <job_listing:job_type><![CDATA[Full Time]]></job_listing:job_type>
      <job_listing:category><![CDATA[Admin & Virtual Assistance]]></job_listing:category>
      <job_listing:company><![CDATA[NightOwl Consulting]]></job_listing:company>
    </item>
    <item>
      <title>Executive Assistant to the CEO</title>
      <link>https://jobicy.com/jobs/148922-executive-assitant-to-the-ceo</link>
      <pubDate>Wed, 09 Sep 2026 06:20:07 +0000</pubDate>
      <description><![CDATA[Supabase is looking for an Executive Assistant.]]></description>
      <job_listing:location><![CDATA[APAC]]></job_listing:location>
      <job_listing:company><![CDATA[Supabase]]></job_listing:company>
    </item>
  </channel>
</rss>`;

const mockSource: Source = {
  id: "jobicy-admin-support-apac",
  name: "Jobicy Admin Support APAC",
  url: "https://jobicy.com/feed/job_feed?job_categories=admin-support&job_types=full-time&search_region=apac",
  type: "rss",
  collectionMethod: "rss_feed",
  complianceStatus: "allowed",
  complianceNotes: "Mock source for test",
  platform: "Jobicy",
  defaultJobType: "full-time",
  tags: ["remote", "admin", "VA", "apac"],
};

describe("namespaced RSS parsing", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fast-xml-parser parses job_listing:company and job_listing:location as property keys", () => {
    const parsed = parser.parse(SAMPLE_JOBICY_XML);
    const items = parsed.rss.channel.item;
    expect(items.length).toBe(2);

    const item1 = items[0];
    expect(xmlNodeText(item1["job_listing:company"])).toBe("NightOwl Consulting");
    expect(xmlNodeText(item1["job_listing:location"])).toBe("Philippines");
    expect(xmlNodeText(item1["job_listing:category"])).toBe("Admin & Virtual Assistance");

    const item2 = items[1];
    expect(xmlNodeText(item2["job_listing:company"])).toBe("Supabase");
    expect(xmlNodeText(item2["job_listing:location"])).toBe("APAC");
  });

  test("fetchRSSFeed extracts namespaced company and location from Jobicy feed", async () => {
    globalThis.fetch = async () =>
      new Response(SAMPLE_JOBICY_XML, {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });

    const result = await fetchRSSFeed(mockSource);
    expect(result.notModified).toBe(false);
    expect(result.items.length).toBe(2);

    const [job1, job2] = result.items;

    // Item 1: NightOwl Consulting in Philippines
    expect(job1.title).toBe("Sales Assistant");
    expect(job1.company).toBe("NightOwl Consulting");
    expect(job1.locationRaw).toBe("Philippines");
    expect(job1.sourcePlatform).toBe("Jobicy");
    expect(job1.tags).toContain("Admin & Virtual Assistance");

    // GeoGate evaluation on job 1:
    const verdict1 = geoGate({
      title: job1.title,
      description: job1.description,
      locationRaw: job1.locationRaw,
      tags: job1.tags,
    });
    expect(verdict1.phEligibility).toBe("eligible_verified");
    expect(verdict1.geoScope).toBe("ph_only");

    // Item 2: Supabase in APAC
    expect(job2.title).toBe("Executive Assistant to the CEO");
    expect(job2.company).toBe("Supabase");
    expect(job2.locationRaw).toBe("APAC");
    expect(job2.sourcePlatform).toBe("Jobicy");

    // GeoGate evaluation on job 2:
    const verdict2 = geoGate({
      title: job2.title,
      description: job2.description,
      locationRaw: job2.locationRaw,
      tags: job2.tags,
    });
    expect(verdict2.phEligibility).toBe("eligible_verified");
    expect(verdict2.geoScope).toBe("apac_incl_ph");
  });
});
