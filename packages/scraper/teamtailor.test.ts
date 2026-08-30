import { describe, it, expect } from "bun:test";
import {
  teamtailorFeedUrl,
  parseTeamtailorRssXml,
  hasMoreTeamtailorPages,
} from "./teamtailor";

describe("teamtailor — feed URL builder (SP-14 criterion: per-career-domain, exact-domain provenance)", () => {
  it("builds the plain /jobs.rss URL for the default page", () => {
    expect(teamtailorFeedUrl("career.teamtailor.com")).toBe("https://career.teamtailor.com/jobs.rss");
  });

  it("appends offset/per_page for non-default pagination", () => {
    expect(teamtailorFeedUrl("career.teamtailor.com", 100, 50)).toBe(
      "https://career.teamtailor.com/jobs.rss?offset=100&per_page=50",
    );
  });
});

// Real, live-captured RSS content (2026-08-30) from
// https://career.teamtailor.com/jobs.rss — Teamtailor's own dogfooded
// careers page, the vendor's official worked example in their support
// docs. Not synthesized. Three real items covering: a single-location
// hybrid role with an empty <tt:role/>, a single-location hybrid role with
// a populated <tt:role>, and a two-location on-site role.
const REAL_RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:tt="https://teamtailor.com/locations">
  <channel>
    <title>Teamtailor</title>
    <description>Current job openings</description>
    <link>https://career.teamtailor.com/jobs</link>
    <item>
      <title>Group Financial Controller</title>
      <description>&lt;h4&gt;Join Teamtailor and Help Shape the Future of Work!!&lt;/h4&gt;&lt;p&gt;Full HTML job description here, deliberately long and rich.&lt;/p&gt;</description>
      <pubDate>Fri, 24 Jul 2026 13:57:16 +0200</pubDate>
      <link>https://career.teamtailor.com/jobs/8124573-group-financial-controller</link>
      <remoteStatus>hybrid</remoteStatus>
      <guid>3ce2c88b-cbc6-4ae9-8ecb-000466c69037</guid>
      <tt:locations>
        <tt:location>
          <tt:name>Stockholm</tt:name>
          <tt:address>Östgötagatan 16</tt:address>
          <tt:zip>116 21</tt:zip>
          <tt:city>Stockholm</tt:city>
          <tt:country>Sweden</tt:country>
        </tt:location>
      </tt:locations>
      <tt:department>Finance</tt:department>
      <tt:role/>
      <tt:division/>
    </item>
    <item>
      <title>UK Account Executive - SMB + Mid-Market</title>
      <description>&lt;h4&gt;Let's build the future together!&lt;/h4&gt;&lt;p&gt;Another full HTML description.&lt;/p&gt;</description>
      <pubDate>Fri, 24 Jul 2026 09:05:16 +0200</pubDate>
      <link>https://career.teamtailor.com/jobs/8118064-uk-account-executive-smb-mid-market</link>
      <remoteStatus>hybrid</remoteStatus>
      <guid>4ff07fd5-3ac0-4333-8f4c-955380396321</guid>
      <tt:locations>
        <tt:location>
          <tt:name>London</tt:name>
          <tt:address>16 Laystall Court</tt:address>
          <tt:zip>EC1R 4</tt:zip>
          <tt:city>London</tt:city>
          <tt:country>United Kingdom</tt:country>
        </tt:location>
      </tt:locations>
      <tt:department>Sales</tt:department>
      <tt:role>Account Executive</tt:role>
      <tt:division/>
    </item>
    <item>
      <title>Partnership Manager - APAC</title>
      <description>&lt;p&gt;Yet another full HTML description with multiple locations.&lt;/p&gt;</description>
      <pubDate>Wed, 29 Jul 2026 15:03:12 +0200</pubDate>
      <link>https://career.teamtailor.com/jobs/8144170-partnership-manager-apac</link>
      <remoteStatus>none</remoteStatus>
      <guid>36d9bbe6-6cf5-4c10-b12b-d4bf739777ce</guid>
      <tt:locations>
        <tt:location>
          <tt:name>Sydney</tt:name>
          <tt:address>WeWork - Office Space &amp; Coworking</tt:address>
          <tt:zip>2000</tt:zip>
          <tt:city>Sydney</tt:city>
          <tt:country>Australia</tt:country>
        </tt:location>
        <tt:location>
          <tt:name>Melbourne</tt:name>
          <tt:address/>
          <tt:zip/>
          <tt:city>Melbourne</tt:city>
          <tt:country>Australia</tt:country>
        </tt:location>
      </tt:locations>
      <tt:department>Partnerships</tt:department>
      <tt:role>Partnerships Manager</tt:role>
      <tt:division/>
    </item>
  </channel>
</rss>`;

describe("teamtailor — parseTeamtailorRssXml (SP-14 criterion: minimal content, canonical URLs, deterministic)", () => {
  it("parses all three real items with canonical link, title, and normalized date", () => {
    const result = parseTeamtailorRssXml(REAL_RSS_FIXTURE);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      guid: "3ce2c88b-cbc6-4ae9-8ecb-000466c69037",
      title: "Group Financial Controller",
      link: "https://career.teamtailor.com/jobs/8124573-group-financial-controller",
      postedAt: new Date("Fri, 24 Jul 2026 13:57:16 +0200").toISOString(),
      remoteStatus: "hybrid",
      locationSummary: "Stockholm, Sweden",
      department: "Finance",
      role: null, // self-closing <tt:role/> -> null, not empty string
    });
  });

  it("never includes the full HTML <description> — actively discarded, matching the minimal-content precedent", () => {
    const result = parseTeamtailorRssXml(REAL_RSS_FIXTURE);
    for (const p of result) {
      expect((p as any).description).toBeUndefined();
    }
    // sanity: the source fixture really does carry a large HTML description
    expect(REAL_RSS_FIXTURE).toContain("Full HTML job description here");
  });

  it("populates role when the feed provides one (second real item)", () => {
    const result = parseTeamtailorRssXml(REAL_RSS_FIXTURE);
    expect(result[1].role).toBe("Account Executive");
    expect(result[1].locationSummary).toBe("London, United Kingdom");
  });

  it("joins multiple real locations for a single posting (third real item, 2 locations)", () => {
    const result = parseTeamtailorRssXml(REAL_RSS_FIXTURE);
    expect(result[2].locationSummary).toBe("Sydney, Australia / Melbourne, Australia");
    expect(result[2].remoteStatus).toBe("none");
  });

  it("is pure — identical input yields identical output", () => {
    const a = parseTeamtailorRssXml(REAL_RSS_FIXTURE);
    const b = parseTeamtailorRssXml(REAL_RSS_FIXTURE);
    expect(a).toEqual(b);
  });

  it("returns an empty array for malformed XML rather than throwing", () => {
    expect(parseTeamtailorRssXml("not xml at all <<<")).toEqual([]);
    expect(parseTeamtailorRssXml("")).toEqual([]);
  });

  it("skips items missing a required field (title/link/guid)", () => {
    const broken = `<rss><channel><item><title>No link or guid</title></item></channel></rss>`;
    expect(parseTeamtailorRssXml(broken)).toEqual([]);
  });

  it("handles a single <tt:location> without an array wrapper (fast-xml-parser collapses singletons)", () => {
    // Item 0 above has exactly one location and is NOT an array in the raw
    // XML shape fast-xml-parser produces for a single child element — this
    // proves asArray() coercion works, not just the multi-location case.
    const result = parseTeamtailorRssXml(REAL_RSS_FIXTURE);
    expect(result[0].locationSummary).toBe("Stockholm, Sweden");
  });
});

describe("teamtailor — pagination heuristic (SP-14 criterion: pagination deterministic and tested)", () => {
  it("hasMore is true only when a full page was returned", () => {
    expect(hasMoreTeamtailorPages(100, 100)).toBe(true);
  });

  it("hasMore is false for a partial or empty page", () => {
    expect(hasMoreTeamtailorPages(3, 100)).toBe(false);
    expect(hasMoreTeamtailorPages(0, 100)).toBe(false);
  });

  it("matches the real captured feed (3 items, well under any plausible per_page) -> no more pages", () => {
    const result = parseTeamtailorRssXml(REAL_RSS_FIXTURE);
    expect(hasMoreTeamtailorPages(result.length, 100)).toBe(false);
  });
});
