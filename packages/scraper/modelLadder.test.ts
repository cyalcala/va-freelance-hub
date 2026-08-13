import { describe, it, expect } from "bun:test";
import { parseLooseJson, parseModelOverride } from "./triage";

// These two helpers exist because of a production incident on 2026-07-26: the
// unclear-backlog sweep was pinned to a single cheap model via AI_MODEL, which
// removed both the fallback ladder and (because JSON mode is enabled only for
// llama-3.3) reliable parsing. Every call failed closed as aiUnavailable and the
// sweep resolved nothing for hours while silently advancing its cursor.

describe("parseModelOverride", () => {
  it("treats a single model as a one-rung ladder", () => {
    expect(parseModelOverride("@cf/meta/llama-3.1-8b-instruct")).toEqual([
      "@cf/meta/llama-3.1-8b-instruct",
    ]);
  });

  it("splits a comma-separated ladder in order", () => {
    expect(parseModelOverride("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("trims whitespace and drops empty entries", () => {
    expect(parseModelOverride(" a , , b ,")).toEqual(["a", "b"]);
  });

  it("accepts an array override", () => {
    expect(parseModelOverride(["a", " b "])).toEqual(["a", "b"]);
  });

  it("never yields an empty-string rung, which would be an invalid model id", () => {
    expect(parseModelOverride(",,,")).toEqual([]);
    expect(parseModelOverride("")).toEqual([]);
  });
});

describe("parseLooseJson", () => {
  it("parses clean JSON", () => {
    expect(parseLooseJson('{"eligible":true}')).toEqual({ eligible: true });
  });

  it("recovers JSON wrapped in prose, which cheap rungs emit without JSON mode", () => {
    expect(
      parseLooseJson('Sure! Here is the result: {"eligible":false,"reason":"US only"} Hope that helps.')
    ).toEqual({ eligible: false, reason: "US only" });
  });

  it("recovers JSON with nested objects", () => {
    expect(parseLooseJson('noise {"a":{"b":1}} tail')).toEqual({ a: { b: 1 } });
  });

  it("returns null rather than a verdict when nothing is parseable", () => {
    // Critical: callers must keep failing closed. A non-null guess here would
    // publish an unclassified job as eligible.
    expect(parseLooseJson("I cannot answer that.")).toBeNull();
    expect(parseLooseJson("")).toBeNull();
    expect(parseLooseJson("{ not json at all")).toBeNull();
  });

  it("returns null for malformed braces rather than throwing", () => {
    expect(() => parseLooseJson("}{")).not.toThrow();
    expect(parseLooseJson("}{")).toBeNull();
  });
});
