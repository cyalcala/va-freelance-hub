import { describe, expect, test } from "bun:test";
import { decodeHtmlEntities, safeFromCodePoint, xmlNodeText, xmlTextList, fixMojibake } from "./text";
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

import {
  findRepeatedCrossCompanyApplyHosts,
  sanitizeApplyUrlForSource,
} from "./urls";

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

describe("sanitizeApplyUrlForSource", () => {
  test("accepts attributable same-host links and approved ATS host aliases", () => {
    expect(sanitizeApplyUrlForSource(
      "https://remoteok.com/l/123",
      "https://www.remoteok.com/remote-jobs/123",
    )).toBe("https://remoteok.com/l/123");
    expect(sanitizeApplyUrlForSource(
      "https://boards.greenhouse.io/acme/jobs/123",
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs/123",
    )).toBe("https://boards.greenhouse.io/acme/jobs/123");
    expect(sanitizeApplyUrlForSource(
      "https://remotephjobs.com/apply/123",
      "https://remotephjobs.com/jobs/123",
    )).toBe("https://remotephjobs.com/apply/123");
  });

  test("fails closed for unrelated, mailto, local, and missing-source candidates", () => {
    expect(sanitizeApplyUrlForSource(
      "https://remotephjobs.com/apply/123",
      "https://remoteok.com/remote-jobs/123",
    )).toBeNull();
    expect(sanitizeApplyUrlForSource("mailto:jobs@acme.test", "https://source.test/job/1")).toBeNull();
    expect(sanitizeApplyUrlForSource("https://example.com/apply", null)).toBeNull();
    expect(sanitizeApplyUrlForSource(
      "https://boards.greenhouse.io/other-company/jobs/123",
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs/123",
    )).toBeNull();
    expect(sanitizeApplyUrlForSource(
      "https://evil.breezy.hr/p/job",
      "https://acme.breezy.hr/p/job",
    )).toBeNull();
  });
});

describe("findRepeatedCrossCompanyApplyHosts", () => {
  test("flags one unrelated apply host repeated across companies", () => {
    const rows = ["Alpaca", "Xapo Bank", "Metabase"].map((company, index) => ({
      company,
      sourceUrl: `https://remoteok.com/remote-jobs/${index}`,
      applicationUrl: `https://remotephjobs.com/apply/${index}`,
    }));
    expect(findRepeatedCrossCompanyApplyHosts(rows)).toEqual(["remotephjobs.com"]);
  });

  test("does not flag same-source links or approved shared ATS hosts", () => {
    const rows = ["A", "B", "C"].flatMap((company, index) => [
      {
        company,
        sourceUrl: `https://remoteok.com/remote-jobs/${index}`,
        applicationUrl: `https://remoteok.com/l/${index}`,
      },
      {
        company,
        sourceUrl: `https://boards-api.greenhouse.io/v1/boards/acme/jobs/${index}`,
        applicationUrl: `https://boards.greenhouse.io/acme/jobs/${index}`,
      },
    ]);
    expect(findRepeatedCrossCompanyApplyHosts(rows)).toEqual([]);
  });
});

describe("fixMojibake", () => {
  test("repairs UTF-8-as-Latin-1 mojibake (production row #4667)", () => {
    expect(fixMojibake("CasinÃ² Lugano SA")).toBe("Casinò Lugano SA");
    expect(fixMojibake("ZÃ¼rich based")).toBe("Zürich based");
    expect(fixMojibake("CafÃ© team")).toBe("Café team");
  });

  test("leaves clean strings untouched", () => {
    expect(fixMojibake("Casino Lugano SA")).toBe("Casino Lugano SA");
    expect(fixMojibake("Casinò Lugano")).toBe("Casinò Lugano");
    expect(fixMojibake("")).toBe("");
  });

  test("never throws on lookalike-but-valid text", () => {
    expect(fixMojibake("ÃABC")).toBe("ÃABC");
  });
});
