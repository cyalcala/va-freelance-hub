import { describe, expect, test } from "bun:test";
import {
  triageViaGemini,
  triageJob,
  isQuotaExhaustionError,
} from "./triage";

// Free-tier AI fallback (2026-08-20). When Cloudflare Workers AI hits its
// 10k-neuron/day cap (error 4006), triage falls back to Gemini's free tier
// instead of failing closed and freezing the board. These guard the parsing,
// the quota detection that trips the fallback, and that the fallback is charged
// against the shared subrequest budget so the 50-cap still holds.

const GEMINI_JSON = {
  eligibleForFilipinos: true,
  reason: "Open worldwide",
  category: "tech",
  tags: ["remote", "react"],
  payRange: null,
  clientTimezone: null,
  applicationUrl: null,
  employmentType: "full-time",
  experienceLevel: "mid",
  companyName: "Acme",
};

function mockGeminiFetch(text: string, ok = true, status = 200) {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok,
      status,
      json: async () => ({
        candidates: [{ content: { parts: [{ text }] } }],
      }),
    }) as any) as any;
  return () => {
    globalThis.fetch = orig;
  };
}

describe("isQuotaExhaustionError", () => {
  test("detects 4006 / neuron / subrequest exhaustion, not transient blips", () => {
    expect(
      isQuotaExhaustionError(
        new Error("4006: you have used up your daily free allocation of 10,000 neurons"),
      ),
    ).toBe(true);
    expect(isQuotaExhaustionError(new Error("Too many subrequests"))).toBe(true);
    expect(isQuotaExhaustionError(new Error("a transient network blip"))).toBe(false);
  });
});

describe("triageViaGemini", () => {
  test("parses a Gemini generateContent JSON response into a verdict", async () => {
    const restore = mockGeminiFetch(JSON.stringify(GEMINI_JSON));
    try {
      const r = await triageViaGemini("prompt", "key", "gemini-2.5-flash-lite");
      expect(r).not.toBeNull();
      expect(r!.eligibleForFilipinos).toBe(true);
      expect(r!.category).toBe("tech");
      expect(r!.employmentType).toBe("full-time");
    } finally {
      restore();
    }
  });

  test("returns null when the model omits the eligibility boolean (fail closed)", async () => {
    const restore = mockGeminiFetch(JSON.stringify({ reason: "no verdict" }));
    try {
      expect(await triageViaGemini("p", "k")).toBeNull();
    } finally {
      restore();
    }
  });

  test("throws on a non-2xx (e.g. 429 rate limit) so the caller defers", async () => {
    const restore = mockGeminiFetch("", false, 429);
    try {
      await expect(triageViaGemini("p", "k")).rejects.toThrow(/Gemini HTTP 429/);
    } finally {
      restore();
    }
  });
});

describe("triageJob Gemini fallback", () => {
  test("falls back to Gemini when Cloudflare AI is exhausted, charging the budget", async () => {
    const restore = mockGeminiFetch(JSON.stringify(GEMINI_JSON));
    let charged = 0;
    const env: any = {
      AI: {
        run: async () => {
          throw new Error("4006: daily free allocation of neurons used up");
        },
      },
      GEMINI_API_KEY: "key",
      chargeAiSubrequest: () => {
        charged += 1;
      },
    };
    try {
      const r = await triageJob("Senior React Developer", "Remote, open worldwide.", env);
      expect(r.aiUnavailable).toBeUndefined(); // NOT failed closed
      expect(r.eligibleForFilipinos).toBe(true);
      expect(r.category).toBe("tech");
      expect(charged).toBe(1); // Gemini call charged against the shared budget
      expect(env.__cfAiExhausted).toBe(true); // remembered so later listings skip the dead ladder
    } finally {
      restore();
    }
  });

  test("fails closed (aiUnavailable) when Cloudflare is down and no Gemini key is set", async () => {
    const env: any = {
      AI: {
        run: async () => {
          throw new Error("4006 neurons");
        },
      },
    };
    const r = await triageJob("X", "Remote, open worldwide.", env);
    expect(r.aiUnavailable).toBe(true);
  });
});
