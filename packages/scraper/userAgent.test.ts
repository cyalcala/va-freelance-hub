import { describe, expect, test } from "bun:test";
import {
  COLLECTION_USER_AGENT,
  CRAWLER_CONTACT_URL,
  CRAWLER_VERSION,
  LINK_CHECK_USER_AGENT,
  collectionHeaders,
  linkCheckHeaders,
} from "./userAgent";

describe("collection identity", () => {
  test("names the crawler with a product token and version", () => {
    expect(COLLECTION_USER_AGENT).toContain(`RemotePHJobsBot/${CRAWLER_VERSION}`);
  });

  test("carries a contact URL a source operator can actually open", () => {
    expect(COLLECTION_USER_AGENT).toContain(`+${CRAWLER_CONTACT_URL}`);
    expect(CRAWLER_CONTACT_URL).toMatch(/^https:\/\//);
  });

  test("uses the declared-bot form rather than impersonating a browser", () => {
    // The `(compatible; Name; +url)` form is what declared crawlers use. A
    // plain `Mozilla/5.0 (Windows NT ...) Chrome/x` string with no product
    // token is impersonation — that is the shape this must never regress to.
    expect(COLLECTION_USER_AGENT).toContain("(compatible;");
    expect(COLLECTION_USER_AGENT).not.toContain("Windows NT");
    expect(COLLECTION_USER_AGENT).not.toMatch(/Chrome\/\d/);
  });
});

describe("link-check identity", () => {
  test("is a browser UA, because the request stands in for a human click", () => {
    expect(LINK_CHECK_USER_AGENT).toMatch(/Chrome\/\d/);
  });

  test("is distinct from the collection identity", () => {
    expect(LINK_CHECK_USER_AGENT).not.toBe(COLLECTION_USER_AGENT);
  });
});

describe("header helpers", () => {
  test("collectionHeaders sets the declared identity", () => {
    expect(collectionHeaders()["User-Agent"]).toBe(COLLECTION_USER_AGENT);
  });

  test("linkCheckHeaders sets the browser identity", () => {
    expect(linkCheckHeaders()["User-Agent"]).toBe(LINK_CHECK_USER_AGENT);
  });

  test("extra headers merge alongside the identity", () => {
    const headers = collectionHeaders({ Accept: "application/json" });

    expect(headers["User-Agent"]).toBe(COLLECTION_USER_AGENT);
    expect(headers.Accept).toBe("application/json");
  });

  test("a caller may override the identity explicitly, but must say so", () => {
    // Override is allowed (spread order) so a future per-source exception is
    // expressible without editing this module — it just cannot happen silently.
    const headers = collectionHeaders({ "User-Agent": "custom/1.0" });

    expect(headers["User-Agent"]).toBe("custom/1.0");
  });
});
