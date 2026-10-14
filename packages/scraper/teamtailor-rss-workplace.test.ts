import { expect, test } from "bun:test";
import { geoGate } from "./geoGate";
import { assessPostingFreshness } from "./publication-freshness";
import { fetchRSSFeed } from "./rss";
import { rssSources, sources } from "./sources";

const OBSERVED = "2026-10-14T15:07:27.407Z";
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:tt="https://teamtailor.com/locations">
  <channel>
    <title>hammerjack</title>
    <item>
      <title>AU Intermediate Bookkeeper</title>
      <link>https://careers.hammerjack.com.au/jobs/bookkeeper</link>
      <pubDate>Mon, 12 Oct 2026 04:00:00 +0000</pubDate>
      <remoteStatus>fully</remoteStatus>
      <guid>bookkeeper</guid>
      <tt:locations><tt:location><tt:city>Makati</tt:city><tt:country>Philippines</tt:country></tt:location></tt:locations>
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
      <remoteStatus>none</remoteStatus>
      <guid>desk</guid>
      <tt:locations><tt:location><tt:city>Makati</tt:city><tt:country>Philippines</tt:country></tt:location></tt:locations>
    </item>
    <item>
      <title>Support Assistant</title>
      <link>https://careers.hammerjack.com.au/jobs/support</link>
      <pubDate>Mon, 12 Oct 2026 04:00:00 +0000</pubDate>
      <region>Philippines</region>
      <guid>support</guid>
    </item>
  </channel>
</rss>`;

test("Teamtailor remoteStatus is the workplace, and a feed without it stays remote", async () => {
  const source = sources.find((item) => item.id === "hammerjack");
  expect(source?.url).toBe("https://careers.hammerjack.com.au/jobs.rss");
  expect(rssSources.some((item) => item.id === "hammerjack")).toBe(true);
  let requested = "";
  const result = await fetchRSSFeed(source!, undefined, async (url) => {
    requested = url;
    return new Response(FEED, { status: 200 });
  });
  expect(requested).toBe(source!.url);
  const byTitle = new Map(result.items.map((item) => [item.title, item]));

  const bookkeeper = byTitle.get("AU Intermediate Bookkeeper");
  expect(bookkeeper?.company).toBe("Hammerjack");
  expect(bookkeeper?.locationType).toBe("remote");
  expect(bookkeeper?.locationRaw).toBe("Makati, Philippines");
  expect(bookkeeper?.postedAt).toBe("2026-10-12T04:00:00.000Z");
  const bookkeeperGate = geoGate({
    title: bookkeeper!.title,
    description: bookkeeper!.description,
    locationRaw: bookkeeper!.locationRaw,
    locationType: bookkeeper!.locationType,
  });
  expect(bookkeeperGate.phEligibility).toBe("eligible_verified");
  expect(assessPostingFreshness(bookkeeper!.postedAt, OBSERVED).state).toBe("WITHIN_WINDOW");

  const hybrid = byTitle.get("Office Coordinator");
  expect(hybrid?.locationType).toBe("hybrid");
  expect(geoGate({
    title: hybrid!.title,
    description: null,
    locationRaw: hybrid!.locationRaw,
    locationType: hybrid!.locationType,
  }).phEligibility).toBe("ineligible");

  const notRemote = byTitle.get("Front Desk");
  expect(notRemote?.locationType).toBe("onsite");
  expect(geoGate({
    title: notRemote!.title,
    description: null,
    locationRaw: notRemote!.locationRaw,
    locationType: notRemote!.locationType,
  }).phEligibility).toBe("ineligible");

  const plain = byTitle.get("Support Assistant");
  expect(plain?.locationType).toBe("remote");
  expect(plain?.locationRaw).toBe("Philippines");
  expect(plain?.company).toBeNull();
});
