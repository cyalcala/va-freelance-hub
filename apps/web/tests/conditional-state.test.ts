import { expect, test } from "bun:test";
import {
  buildSourceIdsByUrl,
  conditionalValidatorsForPersistence,
  sourceIdsForUrls,
} from "../src/lib/conditional-state";

test("a feed with unresolved items clears validators so an unchanged response is retried", () => {
  const sourceIdsByUrl = buildSourceIdsByUrl([
    {
      sourceId: "remote-feed",
      items: [{ sourceUrl: "https://jobs.example.com/42" }],
    },
  ]);
  const retryingSources = sourceIdsForUrls(["https://jobs.example.com/42"], sourceIdsByUrl);

  expect(retryingSources).toEqual(new Set(["remote-feed"]));
  expect(conditionalValidatorsForPersistence({ etag: 'W/"v2"', lastModified: "now", bodyHash: "abc" }, true)).toEqual({
    etag: 'W/"v2"',
    lastModified: "now",
    bodyHash: "abc",
  });
  expect(conditionalValidatorsForPersistence({ etag: 'W/"v2"', lastModified: "now", bodyHash: "abc" }, false)).toEqual({
    etag: null,
    lastModified: null,
    bodyHash: null,
  });
});

test("normalizes URLs before connecting a deferred item to its fetch source", () => {
  const sourceIdsByUrl = buildSourceIdsByUrl([
    {
      sourceId: "rss",
      items: [{ sourceUrl: " https://jobs.example.com/42 " }],
    },
  ]);

  expect(sourceIdsForUrls(["https://jobs.example.com/42"], sourceIdsByUrl)).toEqual(new Set(["rss"]));
});
