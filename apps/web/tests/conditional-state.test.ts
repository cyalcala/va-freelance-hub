import { expect, test } from "bun:test";
import {
  attachSourceIdentity,
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

// ── SP-01: exact source identity ─────────────────────────────────────────────
// attachSourceIdentity stamps the exact configured source id onto every item a
// source produced, so downstream inserts persist `source_id` instead of
// inferring identity from the display-oriented `source_platform`.

test("attachSourceIdentity stamps each source's exact id onto its items", () => {
  const items = attachSourceIdentity([
    { sourceId: "we-work-remotely", items: [{ sourceUrl: "https://wwr/1", sourcePlatform: "WeWorkRemotely" }] },
    { sourceId: "workable:acme", items: [{ sourceUrl: "https://acme/2", sourcePlatform: "Workable" }] },
  ]);

  expect(items.map((item) => item.sourceId)).toEqual(["we-work-remotely", "workable:acme"]);
});

test("attachSourceIdentity keeps two sources sharing one display platform distinct", () => {
  // The two Jobicy APAC feeds both render as the "Jobicy" platform, and two
  // Workable tenants both label as "Workable" — only the exact source id
  // separates them for source economics (SP-02 funnel).
  const items = attachSourceIdentity([
    { sourceId: "jobicy-admin-support-apac", items: [{ sourceUrl: "https://jobicy/admin", sourcePlatform: "Jobicy" }] },
    { sourceId: "jobicy-supporting-apac", items: [{ sourceUrl: "https://jobicy/support", sourcePlatform: "Jobicy" }] },
    { sourceId: "workable:acme", items: [{ sourceUrl: "https://acme/1", sourcePlatform: "Workable" }] },
    { sourceId: "workable:globex", items: [{ sourceUrl: "https://globex/1", sourcePlatform: "Workable" }] },
  ]);
  const identityByUrl = new Map(items.map((item) => [item.sourceUrl, item.sourceId]));

  expect(identityByUrl.get("https://jobicy/admin")).toBe("jobicy-admin-support-apac");
  expect(identityByUrl.get("https://jobicy/support")).toBe("jobicy-supporting-apac");
  expect(identityByUrl.get("https://acme/1")).toBe("workable:acme");
  expect(identityByUrl.get("https://globex/1")).toBe("workable:globex");
  // Same display platform, four distinct identities.
  expect(new Set(items.map((item) => item.sourceId)).size).toBe(4);
});

test("attachSourceIdentity records null for a result with no configured id, never a guess", () => {
  const items = attachSourceIdentity([
    { items: [{ sourceUrl: "https://x/1", sourcePlatform: "Whatever" }] },
  ]);

  expect(items[0].sourceId).toBeNull();
});

test("attachSourceIdentity is a pure map that preserves item count and fields", () => {
  const items = attachSourceIdentity([
    {
      sourceId: "remotive",
      items: [
        { sourceUrl: "https://r/1", title: "A" },
        { sourceUrl: "https://r/2", title: "B" },
      ],
    },
  ]);

  expect(items).toHaveLength(2);
  expect(items[0]).toMatchObject({ sourceUrl: "https://r/1", title: "A", sourceId: "remotive" });
  expect(items[1]).toMatchObject({ sourceUrl: "https://r/2", title: "B", sourceId: "remotive" });
});
