import { describe, expect, test } from "bun:test";
import { JEV_MODEL, JEV_SYSTEMONE_URL, judgeViaJev, type JevJudgeRequest } from "./jev-client";

const request: JevJudgeRequest = {
  task: "Choose the run verdict",
  state: "Dispatched: 12; anomalies: 1 (oversize 524312B vs 524288B budget)",
  context: "Policy: anomalies already stored truthfully; verdict is monitoring-only.",
  questions: {
    verdict: {
      instructions: "Adjudicate the run verdict",
      criteria: { ACCEPT_NOTES: "chronic known limit or isolated transient", FAIL_CONSERVATIVE: "real degradation", ABSTAIN: "insufficient evidence" },
    },
  },
};

function okResponse(model = "typesafe/jev-1.13", confidence = 0.93) {
  return new Response(JSON.stringify({
    model,
    answers: {
      verdict: {
        choice: "ACCEPT_NOTES",
        confidence,
        probabilities: { ACCEPT_NOTES: confidence, FAIL_CONSERVATIVE: (1 - confidence) / 2, ABSTAIN: (1 - confidence) / 2 },
      },
    },
    usage: { prompt_tokens: 120, completion_tokens: 8, total_tokens: 128 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function fetchOk(body: unknown, status = 200) {
  return (async () => typeof body === "string"
    ? new Response(body, { status })
    : body instanceof Response ? body : new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe("judgeViaJev — contract", () => {
  test("posts System One request with model, state, and choice questions; parses typed answers", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const result = await judgeViaJev("test-key", request, ((url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return Promise.resolve(okResponse());
    }) as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    expect(result.fallback).toBe(false);
    expect(result.model).toBe(JEV_MODEL);
    expect(result.answers?.verdict.choice).toBe("ACCEPT_NOTES");
    expect(result.usage?.total_tokens).toBe(128);
    expect(capturedUrl).toBe(JEV_SYSTEMONE_URL);
    const headers = new Headers(capturedInit?.headers as HeadersInit);
    expect(headers.get("Authorization")).toBe("Bearer test-key");
    const body = JSON.parse(String(capturedInit?.body));
    expect(body.model).toBe(JEV_MODEL);
    expect(body.questions.verdict.type).toBe("choice");
    expect(Object.keys(body.questions.verdict.criteria)).toHaveLength(3);
    expect(body.state).toContain("Task: Choose the run verdict");
  });

  test("accepts a dated model patch suffix", async () => {
    const result = await judgeViaJev("k", request, fetchOk(okResponse("typesafe/jev-1.13-20260917")));
    expect(result.ok).toBe(true);
  });

  test("missing key fails closed with a fixed diagnostic", async () => {
    const result = await judgeViaJev(undefined, request);
    expect(result).toMatchObject({ ok: false, fallback: true });
    expect(result.error).toBe("OPENROUTER_API_KEY is not configured");
  });

  test("timeout bounds are enforced", async () => {
    for (const timeoutMs of [0, -1, 30_001, Number.NaN]) {
      const result = await judgeViaJev("k", { ...request, timeoutMs });
      expect(result.ok).toBe(false);
    }
  });

  test("fewer than two criteria fails before any network call", async () => {
    let called = 0;
    const fetchSpy = ((...args: unknown[]) => { called += 1; throw new Error("must not fetch"); }) as unknown as typeof fetch;
    const result = await judgeViaJev("k", { ...request, questions: { verdict: { instructions: "x", criteria: { ONLY: "one" } } } }, fetchSpy);
    expect(called).toBe(0);
    expect(result.ok).toBe(false);
  });

  test("non-2xx responses return fixed status diagnostics without echoing bodies", async () => {
    for (const status of [401, 429, 500]) {
      const result = await judgeViaJev("k", request, fetchOk({ error: "SECRET-LOOKING LEAK ATTEMPT <script>alert(1)</script>" }, status));
      expect(result.ok).toBe(false);
      expect(result.status).toBe(status);
      expect(result.error).toBe(`OpenRouter request failed (HTTP ${status})`);
      expect(JSON.stringify(result)).not.toContain("LEAK");
    }
  });

  test("network and timeout failures return fixed text and never throw", async () => {
    const failing = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    const result = await judgeViaJev("k", request, failing);
    expect(result).toMatchObject({ ok: false, fallback: true, error: "Jev request failed or timed out" });
  });

  test("wrong model identifier is rejected", async () => {
    for (const model of ["typesafe/jev-1.14", "openai/gpt-4o", "jev-latest", "typesafe/jev-1.13-experimental"]) {
      const result = await judgeViaJev("k", request, fetchOk(okResponse(model)));
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Provider returned an unexpected model");
    }
  });

  test("malformed answers are rejected: unknown choice, bad confidence, missing/inflated probabilities", async () => {
    const mk = (answers: unknown) => ({ model: JEV_MODEL, answers });
    const cases = [
      mk({ verdict: { choice: "INVENT", confidence: 1, probabilities: { ACCEPT_NOTES: 0.5, FAIL_CONSERVATIVE: 0.25, ABSTAIN: 0.25 } } }),
      mk({ verdict: { choice: "ACCEPT_NOTES", confidence: 1.2, probabilities: { ACCEPT_NOTES: 0.5, FAIL_CONSERVATIVE: 0.25, ABSTAIN: 0.25 } } }),
      mk({ verdict: { choice: "ACCEPT_NOTES", confidence: 0.9, probabilities: { ACCEPT_NOTES: 0.9 } } }),
      mk({ verdict: { choice: "ACCEPT_NOTES", confidence: 0.9, probabilities: { ACCEPT_NOTES: 0.8, FAIL_CONSERVATIVE: 0.1, ABSTAIN: 0.05 } } }),
      mk({}),
      { model: JEV_MODEL, answers: { verdict: "ACCEPT_NOTES" } },
    ];
    for (const body of cases) {
      const result = await judgeViaJev("k", request, fetchOk(body));
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Invalid Jev decision response");
    }
  });

  test("invalid JSON body is rejected with a fixed diagnostic", async () => {
    const result = await judgeViaJev("k", request, fetchOk("<html>not json</html>"));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("OpenRouter request failed (HTTP 200, invalid JSON)");
  });
});
