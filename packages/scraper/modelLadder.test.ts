import { describe, it, expect } from "bun:test";
import {
  DEFAULT_AI_MODEL_LADDER,
  JSON_MODE_MODELS,
  RETIRED_AI_MODELS,
  parseLooseJson,
  parseModelOverride,
  skepticEligibilityCheck,
  triageJob,
} from "./triage";

const validTriageResponse = JSON.stringify({
  eligibleForFilipinos: true,
  reason: "Worldwide",
  category: "admin",
  tags: ["calendar"],
  payRange: null,
  clientTimezone: null,
  applicationUrl: null,
  employmentType: null,
  experienceLevel: null,
  companyName: null,
});

// These two helpers exist because of a production incident on 2026-07-26: the
// unclear-backlog sweep was pinned to a single cheap model via AI_MODEL, which
// removed both the fallback ladder and (because JSON mode is enabled only for
// llama-3.3) reliable parsing. Every call failed closed as aiUnavailable and the
// sweep resolved nothing for hours while silently advancing its cursor.

describe("parseModelOverride", () => {
  it("treats a single model as a one-rung ladder", () => {
    expect(parseModelOverride("@cf/meta/llama-3.1-8b-instruct-fast")).toEqual([
      "@cf/meta/llama-3.1-8b-instruct-fast",
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

describe("active Workers AI ladder", () => {
  it("freezes a balanced PH-geo evaluation corpus before model rollout", async () => {
    const corpus = await Bun.file(
      new URL("./fixtures/ai-geo-eval.json", import.meta.url),
    ).json() as Array<{ id: string; class: string; expectedEligible: boolean | null }>;
    expect(corpus).toHaveLength(12);
    expect(new Set(corpus.map((entry) => entry.id)).size).toBe(12);
    expect(corpus.filter((entry) => entry.class === "hard-negative")).toHaveLength(6);
    expect(corpus.filter((entry) => entry.class === "positive")).toHaveLength(4);
    expect(corpus.filter((entry) => entry.expectedEligible === null)).toHaveLength(2);
  });

  it("rejects retired model ids in runtime overrides", () => {
    expect(() => parseModelOverride("@cf/meta/llama-3.1-8b-instruct")).toThrow(
      "retired Workers AI model",
    );
  });

  it("contains only current models and declares JSON capability explicitly", () => {
    expect(DEFAULT_AI_MODEL_LADDER).toEqual([
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-3.1-8b-instruct-fast",
    ]);
    expect(DEFAULT_AI_MODEL_LADDER.some((model) => RETIRED_AI_MODELS.has(model))).toBe(false);
    expect(JSON_MODE_MODELS).toEqual(new Set(DEFAULT_AI_MODEL_LADDER));
  });

  it("tries the active ladder in order with JSON mode and records each attempt", async () => {
    const calls: Array<{ model: string; request: Record<string, unknown> }> = [];
    const result = await triageJob("Remote assistant", "Worldwide remote role", {
      AI: {
        run: async (model: string, request: Record<string, unknown>) => {
          calls.push({ model, request });
          if (calls.length === 1) throw new Error("quota");
          return {
            response: validTriageResponse,
            usage: { prompt_tokens: 100, completion_tokens: 25, total_tokens: 125 },
          };
        },
      },
    });

    expect(calls.map((call) => call.model)).toEqual(DEFAULT_AI_MODEL_LADDER);
    expect(calls.every((call) => call.request.response_format !== undefined)).toBe(true);
    expect(result.aiTrace?.selectedModel).toBe("@cf/meta/llama-3.1-8b-instruct-fast");
    expect(result.aiTrace?.fallbackDepth).toBe(1);
    expect(result.aiTrace?.attempts.map((attempt) => attempt.outcome)).toEqual(["error", "success"]);
    expect(result.aiTrace?.usage).toEqual({ inputTokens: 100, outputTokens: 25, totalTokens: 125 });
  });

  it("accepts object-shaped JSON Mode responses", async () => {
    const result = await triageJob("Remote assistant", "Worldwide remote role", {
      AI: {
        run: async () => ({
          response: JSON.parse(validTriageResponse),
          usage: { input_tokens: 80, output_tokens: 20, total_tokens: 100 },
        }),
      },
    });
    expect(result.eligibleForFilipinos).toBe(true);
    expect(result.aiUnavailable).toBeUndefined();
    expect(result.aiTrace?.usage).toEqual({ inputTokens: 80, outputTokens: 20, totalTokens: 100 });
  });

  it("retains provider usage when a response is structurally invalid", async () => {
    const result = await triageJob("Remote assistant", "Worldwide remote role", {
      AI_MODEL: ["@cf/meta/llama-3.3-70b-instruct-fp8-fast"],
      AI: {
        run: async () => ({
          response: { reason: "missing verdict" },
          usage: { prompt_tokens: 90, completion_tokens: 10, total_tokens: 100 },
        }),
      },
    });
    expect(result.aiTrace?.attempts[0]?.outcome).toBe("invalid");
    expect(result.aiTrace?.attempts[0]?.usage).toEqual({
      inputTokens: 90,
      outputTokens: 10,
      totalTokens: 100,
    });
  });

  it("fails closed after malformed output and provider errors", async () => {
    let calls = 0;
    const result = await triageJob("Remote assistant", "Worldwide remote role", {
      AI: {
        run: async () => {
          calls += 1;
          if (calls === 1) return { response: "not json" };
          throw new Error("quota exhausted");
        },
      },
    });

    expect(result.eligibleForFilipinos).toBe(false);
    expect(result.aiUnavailable).toBe(true);
    expect(result.aiTrace?.attempts.map((attempt) => attempt.outcome)).toEqual(["invalid", "error"]);
  });

  it("uses the same capability-driven ladder for the skeptic vote", async () => {
    const calls: Array<{ model: string; request: Record<string, unknown> }> = [];
    const verdict = await skepticEligibilityCheck(
      "Remote assistant",
      "Worldwide remote role",
      {
        AI: {
          run: async (model: string, request: Record<string, unknown>) => {
            calls.push({ model, request });
            return { response: '{"eligible":true,"reason":"No residence lock"}' };
          },
        },
      },
    );
    expect(calls.map((call) => call.model)).toEqual([
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    ]);
    expect(calls[0]?.request.response_format).toEqual({ type: "json_object" });
    expect(verdict.aiTrace?.selectedModel).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  });
});
