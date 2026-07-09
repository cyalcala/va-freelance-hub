import { describe, expect, test } from "bun:test";
import { decodeHtmlEntities, safeFromCodePoint, xmlNodeText, xmlTextList } from "./text";
import { toContentHash } from "./contentHash";
import { sanitizeApplyUrl } from "./urls";

describe("safeFromCodePoint", () => {
  test("decodes valid code points", () => {
    expect(safeFromCodePoint(65)).toBe("A");
    expect(safeFromCodePoint(0x1f600)).toBe("😀");
  });

  test("returns empty for out-of-range points instead of throwing", () => {
    // These previously threw RangeError inside the feed item map, zeroing the
    // entire source for the run (2026-07 audit finding).
    expect(safeFromCodePoint(0x110000)).toBe("");
    expect(safeFromCodePoint(999999999999)).toBe("");
    expect(safeFromCodePoint(-1)).toBe("");
    expect(safeFromCodePoint(2.5)).toBe("");
  });

  test("drops lone surrogates", () => {
    expect(safeFromCodePoint(0xd800)).toBe("");
    expect(safeFromCodePoint(0xdfff)).toBe("");
  });
});

describe("decodeHtmlEntities", () => {
  test("decodes standard entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry &quot;show&quot;")).toBe('Tom & Jerry "show"');
    expect(decodeHtmlEntities("&#65;&#x42;")).toBe("AB");
  });

  test("never throws on hostile numeric entities (regression)", () => {
    expect(() => decodeHtmlEntities("evil &#1114112; payload")).not.toThrow();
    expect(decodeHtmlEntities("evil &#1114112; payload")).toBe("evil  payload");
    expect(() => decodeHtmlEntities("&#x110000;")).not.toThrow();
  });
});

describe("xmlNodeText / xmlTextList", () => {
  test("unwraps plain strings and attributed nodes", () => {
    expect(xmlNodeText("Design")).toBe("Design");
    expect(xmlNodeText({ "#text": "Design", "@_domain": "x" })).toBe("Design");
    expect(xmlNodeText({ "@_domain": "x" })).toBeNull();
    expect(xmlNodeText(undefined)).toBeNull();
  });

  test("category lists never yield '[object Object]' (regression)", () => {
    const mixed = ["Tech", { "#text": "Design", "@_domain": "d" }, { "@_only": "attr" }, ""];
    expect(xmlTextList(mixed)).toEqual(["Tech", "Design"]);
    expect(xmlTextList({ "#text": "Solo" })).toEqual(["Solo"]);
    expect(xmlTextList(undefined)).toEqual([]);
  });
});

describe("toContentHash (shared)", () => {
  test("is deterministic and 16 hex chars", () => {
    const h = toContentHash("VA Role", "https://example.com/j/1");
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(toContentHash("VA Role", "https://example.com/j/1")).toBe(h);
  });

  test("distinct inputs produce distinct hashes", () => {
    expect(toContentHash("A", "u1")).not.toBe(toContentHash("B", "u1"));
    expect(toContentHash("A", "u1")).not.toBe(toContentHash("A", "u2"));
  });
});

describe("sanitizeApplyUrl", () => {
  test("accepts http(s) URLs and normalizes", () => {
    expect(sanitizeApplyUrl("https://jobs.example.com/apply?id=1")).toBe("https://jobs.example.com/apply?id=1");
    expect(sanitizeApplyUrl("  http://example.com/a  ")).toBe("http://example.com/a");
  });

  test("upgrades bare emails to mailto and accepts mailto", () => {
    expect(sanitizeApplyUrl("hr@acme.co")).toBe("mailto:hr@acme.co");
    expect(sanitizeApplyUrl("mailto:hr@acme.co")).toBe("mailto:hr@acme.co");
  });

  test("rejects hallucinated fragments, javascript:, and junk (regression)", () => {
    expect(sanitizeApplyUrl("apply at our website")).toBeNull();
    expect(sanitizeApplyUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeApplyUrl("ftp://example.com/x")).toBeNull();
    expect(sanitizeApplyUrl("mailto:not-an-email")).toBeNull();
    expect(sanitizeApplyUrl("")).toBeNull();
    expect(sanitizeApplyUrl(null)).toBeNull();
    expect(sanitizeApplyUrl(42)).toBeNull();
    expect(sanitizeApplyUrl("https://" + "a".repeat(2050))).toBeNull();
  });
});
