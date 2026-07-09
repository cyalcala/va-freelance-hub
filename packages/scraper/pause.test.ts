import { describe, expect, test } from "bun:test";
import { validateAutoPauses, applyAutoPauses, type AutoPauseEntry } from "./pause";
import type { Source } from "./sources";

const entry = (sourceId: string): AutoPauseEntry => ({
  sourceId,
  reason: "failed last 4 fetch attempts",
  pausedAt: "2026-07-07T01:30:00Z",
  by: "sentinel-bot",
});

const source = (id: string): Source => ({
  id,
  name: id,
  url: `https://example.com/${id}`,
  type: "rss",
  collectionMethod: "rss_feed",
  complianceStatus: "allowed",
  complianceNotes: "original notes",
  platform: "Example",
  defaultJobType: "full-time",
  tags: ["remote"],
});

describe("validateAutoPauses", () => {
  test("accepts a well-formed config", () => {
    const parsed = validateAutoPauses({ paused: [entry("remotive")] });
    expect(parsed).toHaveLength(1);
    expect(parsed[0].sourceId).toBe("remotive");
  });

  test("never throws on malformed shapes — returns empty instead", () => {
    for (const bad of [null, undefined, 42, "x", [], {}, { paused: "nope" }, { paused: {} }]) {
      expect(validateAutoPauses(bad)).toEqual([]);
    }
  });

  test("drops malformed entries but keeps valid ones", () => {
    const parsed = validateAutoPauses({
      paused: [
        entry("good-source"),
        { sourceId: "", reason: "r", pausedAt: "t", by: "b" },
        { sourceId: "missing-fields" },
        null,
        "string-entry",
      ],
    });
    expect(parsed.map((e) => e.sourceId)).toEqual(["good-source"]);
  });

  test("trims sourceId whitespace", () => {
    const parsed = validateAutoPauses({ paused: [{ ...entry("x"), sourceId: "  spaced  " }] });
    expect(parsed[0].sourceId).toBe("spaced");
  });
});

describe("applyAutoPauses", () => {
  test("marks a matching source paused and prefixes the reason into notes", () => {
    const [result] = applyAutoPauses([source("remotive")], [entry("remotive")]);
    expect(result.complianceStatus).toBe("paused");
    expect(result.complianceNotes).toContain("Auto-paused 2026-07-07T01:30:00Z by sentinel-bot");
    expect(result.complianceNotes).toContain("Prior notes: original notes");
  });

  test("leaves non-matching sources untouched (same object, no copy)", () => {
    const original = source("we-work-remotely");
    const [result] = applyAutoPauses([original], [entry("remotive")]);
    expect(result).toBe(original);
    expect(result.complianceStatus).toBe("allowed");
  });

  test("does not mutate the input source for matches", () => {
    const original = source("remotive");
    applyAutoPauses([original], [entry("remotive")]);
    expect(original.complianceStatus).toBe("allowed");
  });

  test("unknown pause ids (e.g. ATS keys handled elsewhere) are ignored harmlessly", () => {
    const list = [source("a"), source("b")];
    const result = applyAutoPauses(list, [entry("breezy:sourcefit")]);
    expect(result.every((s) => s.complianceStatus === "allowed")).toBe(true);
  });

  test("empty pause list returns the identical array", () => {
    const list = [source("a")];
    expect(applyAutoPauses(list, [])).toBe(list);
  });
});
