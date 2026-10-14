import { expect, test } from "bun:test";
import { assessPostingFreshness, fetchRSSFeed, geoGate, sources } from "@va-hub/scraper";
import { selectIntakeBatch } from "../src/lib/conditional-state";

const OBSERVED = "2026-10-14T15:07:27.407Z";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:tt="https://teamtailor.com/locations">
  <channel>
    <item>
      <title>AU Intermediate Bookkeeper</title>
      <link>https://careers.hammerjack.com.au/jobs/bookkeeper</link>
      <pubDate>Mon, 12 Oct 2026 04:00:00 +0000</pubDate>
      <remoteStatus>fully</remoteStatus>
      <guid>bookkeeper</guid>
      <tt:locations><tt:location><tt:city>Makati</tt:city><tt:country>Philippines</tt:country></tt:location></tt:locations>
    </item>
    <item>
      <title>Performance Marketer Japan</title>
      <link>https://careers.hammerjack.com.au/jobs/japan</link>
      <pubDate>Mon, 12 Oct 2026 04:00:00 +0000</pubDate>
      <remoteStatus>fully</remoteStatus>
      <guid>japan</guid>
      <tt:locations><tt:location><tt:city>Tokyo</tt:city><tt:country>Japan</tt:country></tt:location></tt:locations>
    </item>
    <item>
      <title>Office Coordinator</title>
      <link>https://careers.hammerjack.com.au/jobs/office</link>
      <pubDate>Mon, 12 Oct 2026 04:00:00 +0000</pubDate>
      <remoteStatus>hybrid</remoteStatus>
      <guid>office</guid>
      <tt:locations><tt:location><tt:city>Makati</tt:city><tt:country>Philippines</tt:country></tt:location></tt:locations>
    </item>
    <item>
      <title>Front Desk</title>
      <link>https://careers.hammerjack.com.au/jobs/desk</link>
      <pubDate>Mon, 12 Oct 2026 04:00:00 +0000</pubDate>
      <remoteStatus>onsite</remoteStatus>
      <guid>desk</guid>
      <tt:locations><tt:location><tt:city>Makati</tt:city><tt:country>Philippines</tt:country></tt:location></tt:locations>
    </item>
    <item>
      <title>Old Assistant Accountant</title>
      <link>https://careers.hammerjack.com.au/jobs/old</link>
      <pubDate>Tue, 14 Jan 2020 00:00:00 GMT</pubDate>
      <remoteStatus>fully</remoteStatus>
      <guid>old</guid>
      <tt:locations><tt:location><tt:city>Makati</tt:city><tt:country>Philippines</tt:country></tt:location></tt:locations>
    </item>
  </channel>
</rss>`;

function rss(generation: string) {
  return Array.from({ length: 50 }, (_, index) => ({
    sourceId: "we-work-remotely",
    sourceUrl: `https://weworkremotely.com/jobs/${generation}/${index}`,
    publishable: false,
  }));
}

function openings(sourceId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    sourceId,
    sourceUrl: `https://apply.workable.com/j/${sourceId}-${index}`,
    publishable: true,
  }));
}

test("follow-up intake selects deferred fresh PH urls and the gates still reject the other rows", async () => {
  const source = sources.find((item) => item.id === "hammerjack");
  expect(source).toBeDefined();
  const parsed = await fetchRSSFeed(source!, undefined, async () => new Response(FEED, { status: 200 }));
  const judged = parsed.items.map((item) => {
    const gate = geoGate({
      title: item.title,
      description: item.description,
      locationRaw: item.locationRaw,
      locationType: item.locationType,
    });
    const freshness = assessPostingFreshness(item.postedAt, OBSERVED);
    const publishable = (gate.phEligibility === "eligible_verified" || gate.phEligibility === "eligible_likely")
      && freshness.state === "WITHIN_WINDOW";
    return { item, gate, freshness, publishable };
  });

  const japan = judged.find((row) => row.item.title === "Performance Marketer Japan");
  const hybrid = judged.find((row) => row.item.locationType === "hybrid");
  const onsite = judged.find((row) => row.item.title === "Front Desk");
  const stale = judged.find((row) => row.item.title === "Old Assistant Accountant");
  const bookkeeper = judged.find((row) => row.item.title === "AU Intermediate Bookkeeper");
  expect(japan?.gate.geoScope).toBe("country_locked");
  expect(japan?.gate.phEligibility).toBe("ineligible");
  expect(japan?.publishable).toBe(false);
  expect(hybrid?.gate.phEligibility).toBe("ineligible");
  expect(hybrid?.publishable).toBe(false);
  expect(onsite?.gate.phEligibility).toBe("ineligible");
  expect(onsite?.publishable).toBe(false);
  expect(stale?.freshness.state).toBe("STALE");
  expect(stale?.publishable).toBe(false);
  expect(bookkeeper?.publishable).toBe(true);

  const fresh = [
    ...openings("workable:hunt-st", 27),
    ...openings("workable:coconutva", 7),
    ...openings("workable:crewbloom", 1),
    ...openings("workable:pearltalent", 8),
    { sourceId: "hammerjack", sourceUrl: bookkeeper!.item.sourceUrl, publishable: true },
  ];
  const first = selectIntakeBatch([...rss("first"), ...fresh], 50);
  const deferred = first.deferred.filter((item) => item.publishable);
  expect(deferred.length).toBeGreaterThan(0);
  expect(first.selected.some((item) => item.publishable)).toBe(true);

  const second = selectIntakeBatch([...rss("second"), ...deferred], 50);
  const deferredUrls = new Set(deferred.map((item) => item.sourceUrl));
  expect(second.selected.filter((item) => deferredUrls.has(item.sourceUrl))).toHaveLength(deferred.length);
  expect(second.deferred.every((item) => !item.publishable)).toBe(true);

  const selectedBad = selectIntakeBatch([
    { sourceId: "hammerjack", sourceUrl: hybrid!.item.sourceUrl },
    { sourceId: "hammerjack", sourceUrl: bookkeeper!.item.sourceUrl },
  ], 2);
  expect(selectedBad.selected).toHaveLength(2);
  expect(geoGate({
    title: hybrid!.item.title,
    description: null,
    locationRaw: hybrid!.item.locationRaw,
    locationType: hybrid!.item.locationType,
  }).phEligibility).toBe("ineligible");
});
