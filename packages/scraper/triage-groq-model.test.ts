import { describe, expect, test } from "bun:test";
import { GROQ_DEFAULT_MODEL, groqGenerateContent, triageViaGroq } from "./triage";

// INCIDENT-0410(t): the Groq rung of the free AI cascade was still pinned to
// "llama-3.3-70b-versatile", a model id the incident report records as retired, so
// the second provider failed before it could absorb Gemini overflow. The default
// now names a currently served Groq model.
//
// JSON mode (`response_format`) is a per-model capability, not a blanket flag. It
// is only requested from models known to serve it; every other rung answers
// free-form text, which parseLooseJson already recovers. Requesting an unsupported
// mode is a hard 400, which would throw and drop the whole Groq rung — so the
// guard is asserted here rather than assumed.

const RETIRED_GROQ_MODEL = "llama-3.3-70b-versatile";
const JSON_MODE_MODEL = "llama-3.3-70b-versatile";

type Captured = { url: string; init: any };

function captureGroqRequest(
  handler: (captured: Captured) => { ok?: boolean; status?: number; body?: any },
) {
  const orig = globalThis.fetch;
  const captured: Captured[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    const c = { url: String(url), init };
    captured.push(c);
    const { ok = true, status = 200, body = {} } = handler(c);
    return { ok, status, json: async () => body } as any;
  }) as any;
  return {
    captured,
    restore: () => {
      globalThis.fetch = orig;
    },
  };
}

function chatBody(captured: Captured): any {
  return JSON.parse(captured.init.body);
}

function groqReply(content: string) {
  return { choices: [{ message: { content } }] };
}

describe("GROQ_DEFAULT_MODEL", () => {
  test("is a currently served Groq model, not the retired llama id", () => {
    expect(GROQ_DEFAULT_MODEL).toBe("openai/gpt-oss-120b");
    expect(GROQ_DEFAULT_MODEL).not.toBe(RETIRED_GROQ_MODEL);
  });
});

describe("groqGenerateContent request shape", () => {
  test("sends the current default model when no override is supplied", async () => {
    const { captured, restore } = captureGroqRequest(() => ({
      body: groqReply("{}"),
    }));
    try {
      await groqGenerateContent("prompt", "key");
    } finally {
      restore();
    }
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(chatBody(captured[0]).model).toBe(GROQ_DEFAULT_MODEL);
  });

  test("omits JSON mode for the default model, whose support is not assumed", async () => {
    const { captured, restore } = captureGroqRequest(() => ({
      body: groqReply("{}"),
    }));
    try {
      await groqGenerateContent("prompt", "key");
    } finally {
      restore();
    }
    expect(chatBody(captured[0])).not.toHaveProperty("response_format");
  });

  test("still requests JSON mode for a model that serves it", async () => {
    const { captured, restore } = captureGroqRequest(() => ({
      body: groqReply("{}"),
    }));
    try {
      await groqGenerateContent("prompt", "key", JSON_MODE_MODEL);
    } finally {
      restore();
    }
    expect(chatBody(captured[0]).model).toBe(JSON_MODE_MODEL);
    expect(chatBody(captured[0]).response_format).toEqual({ type: "json_object" });
  });

  test("keeps the explicit override ahead of the default", async () => {
    const { captured, restore } = captureGroqRequest(() => ({
      body: groqReply("{}"),
    }));
    try {
      await groqGenerateContent("prompt", "key", "  ");
    } finally {
      restore();
    }
    // A blank override is not a model choice, so the default stands.
    expect(chatBody(captured[0]).model).toBe(GROQ_DEFAULT_MODEL);
  });

  test("raises on a non-2xx so the cascade advances to the next provider", async () => {
    const { restore } = captureGroqRequest(() => ({ ok: false, status: 400 }));
    try {
      await expect(groqGenerateContent("prompt", "key")).rejects.toThrow("Groq HTTP 400");
    } finally {
      restore();
    }
  });
});

describe("triageViaGroq without JSON mode", () => {
  test("recovers a prose-wrapped verdict, so dropping the flag cannot fake a failure", async () => {
    const verdict = {
      eligibleForFilipinos: true,
      reason: "Open worldwide",
      category: "tech",
      tags: ["remote"],
    };
    const { captured, restore } = captureGroqRequest(() => ({
      body: groqReply(`Sure! Here's the JSON:\n${JSON.stringify(verdict)}`),
    }));
    try {
      const result = await triageViaGroq("prompt", "key");
      expect(result?.eligibleForFilipinos).toBe(true);
      expect(result?.category).toBe("tech");
      expect(chatBody(captured[0])).not.toHaveProperty("response_format");
    } finally {
      restore();
    }
  });

  test("fails closed on unparseable output rather than inventing a verdict", async () => {
    const { restore } = captureGroqRequest(() => ({
      body: groqReply("I cannot help with that."),
    }));
    try {
      expect(await triageViaGroq("prompt", "key")).toBeNull();
    } finally {
      restore();
    }
  });

  test("fails closed when the eligibility boolean is absent", async () => {
    const { restore } = captureGroqRequest(() => ({
      body: groqReply(JSON.stringify({ reason: "maybe", category: "tech" })),
    }));
    try {
      expect(await triageViaGroq("prompt", "key")).toBeNull();
    } finally {
      restore();
    }
  });
});
