import { describe, expect, test } from "bun:test";
import {
  triageViaGemini,
  triageViaGroq,
  triageJob,
  isQuotaExhaustionError,
} from "./triage";

// Multi-provider AI triage cascade (2026-08-20). Default order is Gemini (free,
// primary) → Groq (free, overflow) → Cloudflare Workers AI (neuron reserve, which
// throws 4006 when spent). AI_PRIMARY="cloudflare" inverts to the old CF-first
// order. These guard the parsing, the provider ordering, that the free providers
// absorb overflow before the neuron reserve is touched, and that every call is
// charged against the shared subrequest budget so the 50-cap holds.

const VERDICT = {
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

type MockSpec = { text?: string; ok?: boolean; status?: number; shape?: "gemini" | "groq" };

// Route globalThis.fetch by host substring so cascade tests can make one provider
// fail (non-2xx) and the next succeed.
function mockFetchByHost(handlers: Record<string, MockSpec>) {
  const orig = globalThis.fetch;
  globalThis.fetch = (async (url: any) => {
    const u = String(url);
    const key = Object.keys(handlers).find((h) => u.includes(h));
    if (!key) throw new Error(`no mock configured for ${u}`);
    const { text = "", ok = true, status = 200, shape = "gemini" } = handlers[key];
    const body =
      shape === "groq"
        ? { choices: [{ message: { content: text } }] }
        : { candidates: [{ content: { parts: [{ text }] } }] };
    return { ok, status, json: async () => body } as any;
  }) as any;
  return () => {
    globalThis.fetch = orig;
  };
}

const geminiOk = (text: string): Record<string, MockSpec> => ({
  "generativelanguage.googleapis.com": { text, shape: "gemini" },
});
const groqOk = (text: string): Record<string, MockSpec> => ({
  "api.groq.com": { text, shape: "groq" },
});

describe("isQuotaExhaustionError", () => {
  test("detects 4006 / neuron / subrequest exhaustion, not transient blips", () => {
    expect(
      isQuotaExhaustionError(new Error("4006: used up your daily free allocation of 10,000 neurons")),
    ).toBe(true);
    expect(isQuotaExhaustionError(new Error("Too many subrequests"))).toBe(true);
    expect(isQuotaExhaustionError(new Error("a transient network blip"))).toBe(false);
  });
});

describe("provider clients", () => {
  test("triageViaGemini parses a generateContent JSON response", async () => {
    const restore = mockFetchByHost(geminiOk(JSON.stringify(VERDICT)));
    try {
      const r = await triageViaGemini("prompt", "key");
      expect(r?.eligibleForFilipinos).toBe(true);
      expect(r?.category).toBe("tech");
      expect(r?.employmentType).toBe("full-time");
    } finally {
      restore();
    }
  });

  test("triageViaGroq parses an OpenAI-compatible chat response", async () => {
    const restore = mockFetchByHost(groqOk(JSON.stringify(VERDICT)));
    try {
      const r = await triageViaGroq("prompt", "key");
      expect(r?.eligibleForFilipinos).toBe(true);
      expect(r?.category).toBe("tech");
    } finally {
      restore();
    }
  });

  test("returns null when the model omits the eligibility boolean (fail closed)", async () => {
    const restore = mockFetchByHost(geminiOk(JSON.stringify({ reason: "no verdict" })));
    try {
      expect(await triageViaGemini("p", "k")).toBeNull();
    } finally {
      restore();
    }
  });

  test("throws on a non-2xx (e.g. 429) so the caller can fall through / defer", async () => {
    const restore = mockFetchByHost({ "generativelanguage.googleapis.com": { ok: false, status: 429 } });
    try {
      await expect(triageViaGemini("p", "k")).rejects.toThrow(/Gemini HTTP 429/);
    } finally {
      restore();
    }
  });
});

describe("triageJob provider cascade", () => {
  test("Gemini is PRIMARY when a key is set — the Cloudflare reserve is never touched", async () => {
    const restore = mockFetchByHost(geminiOk(JSON.stringify(VERDICT)));
    let cfCalls = 0;
    let charged = 0;
    const env: any = {
      AI: { run: async () => { cfCalls += 1; throw new Error("reserve must not run"); } },
      GEMINI_API_KEY: "gk",
      chargeAiSubrequest: () => { charged += 1; },
    };
    try {
      const r = await triageJob("Senior React Developer", "Remote, open worldwide.", env);
      expect(r.aiUnavailable).toBeUndefined();
      expect(r.eligibleForFilipinos).toBe(true);
      expect(r.category).toBe("tech");
      expect(charged).toBe(1); // one Gemini call, charged against the shared budget
      expect(cfCalls).toBe(0); // neuron reserve untouched
    } finally {
      restore();
    }
  });

  test("Gemini rate-limited → Groq absorbs the overflow, reserve still untouched", async () => {
    const restore = mockFetchByHost({
      "generativelanguage.googleapis.com": { ok: false, status: 429 },
      "api.groq.com": { text: JSON.stringify(VERDICT), shape: "groq" },
    });
    let cfCalls = 0;
    let charged = 0;
    const env: any = {
      AI: { run: async () => { cfCalls += 1; throw new Error("reserve must not run"); } },
      GEMINI_API_KEY: "gk",
      GROQ_API_KEY: "qk",
      chargeAiSubrequest: () => { charged += 1; },
    };
    try {
      const r = await triageJob("X", "Remote, open worldwide.", env);
      expect(r.eligibleForFilipinos).toBe(true);
      expect(charged).toBe(2); // Gemini (failed) + Groq (succeeded), both charged
      expect(cfCalls).toBe(0); // reserve still untouched
    } finally {
      restore();
    }
  });

  test("AI_PRIMARY=cloudflare inverts: CF exhausted (4006) → Gemini fallback, remembered", async () => {
    const restore = mockFetchByHost(geminiOk(JSON.stringify(VERDICT)));
    let charged = 0;
    const env: any = {
      AI: { run: async () => { throw new Error("4006: daily free allocation of neurons used up"); } },
      AI_PRIMARY: "cloudflare",
      GEMINI_API_KEY: "gk",
      chargeAiSubrequest: () => { charged += 1; },
    };
    try {
      const r = await triageJob("X", "Remote, open worldwide.", env);
      expect(r.eligibleForFilipinos).toBe(true);
      expect(charged).toBe(1);
      expect(env.__cfAiExhausted).toBe(true); // 4006 remembered so later listings skip the dead ladder
    } finally {
      restore();
    }
  });

  test("fails closed (aiUnavailable) when every provider fails", async () => {
    const restore = mockFetchByHost({
      "generativelanguage.googleapis.com": { ok: false, status: 500 },
      "api.groq.com": { ok: false, status: 500 },
    });
    const env: any = {
      AI: { run: async () => { throw new Error("4006 neurons"); } },
      GEMINI_API_KEY: "gk",
      GROQ_API_KEY: "qk",
      chargeAiSubrequest: () => {},
    };
    try {
      const r = await triageJob("X", "Remote, open worldwide.", env);
      expect(r.aiUnavailable).toBe(true);
    } finally {
      restore();
    }
  });

  test("no free keys + Cloudflare down → fails closed", async () => {
    const env: any = { AI: { run: async () => { throw new Error("4006 neurons"); } } };
    const r = await triageJob("X", "Remote, open worldwide.", env);
    expect(r.aiUnavailable).toBe(true);
  });
});
