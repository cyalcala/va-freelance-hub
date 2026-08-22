import { describe, it, expect } from "bun:test";
import {
  classifyLinkResponse,
  normalizeCheckUrl,
  classifyUnreachableError,
  checkDirectoryLink,
  UNREACHABLE_REASONS,
} from "./linkHealth";

// The verdicts here encode the ground truth from the 2026-07 manual audit:
// bot walls are NOT dead, parked pages hide behind HTTP 200, only genuine
// failures count a strike.

describe("classifyLinkResponse", () => {
  it("200 clean page → ok, no strike", () => {
    const v = classifyLinkResponse(200, "<html><body>Careers at Acme. We hire remote talent.</body></html>");
    expect(v.status).toBe("ok");
    expect(v.isHardDead).toBe(false);
  });

  it("403 bot wall (Canva/Fiverr/Indeed class) → bot_wall, NO strike", () => {
    const v = classifyLinkResponse(403, "");
    expect(v.status).toBe("bot_wall");
    expect(v.isHardDead).toBe(false);
  });

  it("429 rate-limited → bot_wall, NO strike", () => {
    expect(classifyLinkResponse(429, "").isHardDead).toBe(false);
  });

  it("418 anti-bot teapot → bot_wall, NO strike", () => {
    expect(classifyLinkResponse(418, "").status).toBe("bot_wall");
  });

  it("404 → dead_http, strike", () => {
    const v = classifyLinkResponse(404, "<h1>404 Not Found</h1>");
    expect(v.status).toBe("dead_http");
    expect(v.isHardDead).toBe(true);
  });

  it("410 Gone → dead_http, strike", () => {
    expect(classifyLinkResponse(410, "").isHardDead).toBe(true);
  });

  // Regression: the 2026-07-21 false positives. Real PH agencies behind
  // Cloudflare (FVA, Diversify, EzyVA, Cool Pixels) returned 525/526/530
  // (SSL/origin edge hiccups) and were wrongly flagged dead_http.
  it("525 Cloudflare SSL handshake failed → NOT dead (site alive)", () => {
    const v = classifyLinkResponse(525, "");
    expect(v.status).toBe("bot_wall");
    expect(v.isHardDead).toBe(false);
  });

  it("530 Cloudflare origin DNS error → NOT dead (site alive)", () => {
    expect(classifyLinkResponse(530, "").isHardDead).toBe(false);
  });

  it("526 invalid SSL cert → NOT dead", () => {
    expect(classifyLinkResponse(526, "").isHardDead).toBe(false);
  });

  it("500/502/503 origin errors → transient, NOT dead", () => {
    expect(classifyLinkResponse(500, "").isHardDead).toBe(false);
    expect(classifyLinkResponse(502, "").isHardDead).toBe(false);
    expect(classifyLinkResponse(503, "").isHardDead).toBe(false);
  });

  it("200 parked/for-sale page → parked, strike (Kaya Services class)", () => {
    const v = classifyLinkResponse(200, "<html><body>This domain is for sale. Buy this domain now via Afternic.</body></html>");
    expect(v.status).toBe("parked");
    expect(v.isHardDead).toBe(true);
  });

  it("200 suspended account → parked/dead, strike", () => {
    const v = classifyLinkResponse(200, "<title>Account Suspended</title>");
    expect(v.isHardDead).toBe(true);
  });

  it("a 404 whose body mentions a parking service still classifies by status, not parked", () => {
    const v = classifyLinkResponse(404, "hugedomains parking not found");
    expect(v.status).toBe("dead_http");
  });

  it("301/302 redirect resolved as final 200 stays ok", () => {
    expect(classifyLinkResponse(200, "<html>ok</html>").status).toBe("ok");
  });

  it("legitimate e-commerce 'for sale' copy does NOT trip parked", () => {
    const v = classifyLinkResponse(200, "<html><body>Shop our items for sale — free shipping worldwide!</body></html>");
    expect(v.status).toBe("ok");
  });
});

// OPS-04: unreachable stays no-strike, but the thrown fetch error is now mapped
// to a small, stable taxonomy so two runs (and a same-host probe from another
// runtime) can be compared to localize egress-vs-origin faults.
describe("classifyUnreachableError (OPS-04 taxonomy)", () => {
  // Node/undici shape: TypeError("fetch failed") whose cause carries the code.
  const nodeErr = (code: string, name = "TypeError", message = "fetch failed") => {
    const e = new Error(message) as Error & { cause?: unknown };
    e.name = name;
    e.cause = { code };
    return e;
  };

  it("Node ENOTFOUND → DNS_FAILURE", () => {
    expect(classifyUnreachableError(nodeErr("ENOTFOUND")).reason).toBe("DNS_FAILURE");
  });

  it("Node EAI_AGAIN (transient DNS) → DNS_FAILURE", () => {
    expect(classifyUnreachableError(nodeErr("EAI_AGAIN")).reason).toBe("DNS_FAILURE");
  });

  it("Node ECONNREFUSED → CONNECT_FAILURE", () => {
    expect(classifyUnreachableError(nodeErr("ECONNREFUSED")).reason).toBe("CONNECT_FAILURE");
  });

  it("Node ECONNRESET → CONNECT_FAILURE", () => {
    expect(classifyUnreachableError(nodeErr("ECONNRESET")).reason).toBe("CONNECT_FAILURE");
  });

  it("Node ETIMEDOUT → TIMEOUT", () => {
    expect(classifyUnreachableError(nodeErr("ETIMEDOUT")).reason).toBe("TIMEOUT");
  });

  it("AbortSignal.timeout (TimeoutError name, no code) → TIMEOUT", () => {
    const e = new Error("The operation timed out.");
    e.name = "TimeoutError";
    expect(classifyUnreachableError(e).reason).toBe("TIMEOUT");
  });

  it("expired/invalid cert → TLS_FAILURE", () => {
    expect(classifyUnreachableError(nodeErr("CERT_HAS_EXPIRED")).reason).toBe("TLS_FAILURE");
    expect(classifyUnreachableError(nodeErr("ERR_TLS_CERT_ALTNAME_INVALID")).reason).toBe("TLS_FAILURE");
  });

  it("Cloudflare 'Too many subrequests.' → EGRESS_BLOCKED", () => {
    const e = new Error("Too many subrequests.");
    e.name = "Error";
    expect(classifyUnreachableError(e).reason).toBe("EGRESS_BLOCKED");
  });

  it("Cloudflare generic 'Network connection lost.' → EGRESS_BLOCKED", () => {
    const e = new Error("Network connection lost.");
    e.name = "TypeError";
    expect(classifyUnreachableError(e).reason).toBe("EGRESS_BLOCKED");
  });

  it("code-less 'fetch failed' TypeError → REQUEST_ERROR", () => {
    const e = new Error("fetch failed");
    e.name = "TypeError"; // no cause code
    expect(classifyUnreachableError(e).reason).toBe("REQUEST_ERROR");
  });

  it("truly unknown / non-error input → UNKNOWN_NETWORK", () => {
    expect(classifyUnreachableError({}).reason).toBe("UNKNOWN_NETWORK");
    expect(classifyUnreachableError(undefined).reason).toBe("UNKNOWN_NETWORK");
    expect(classifyUnreachableError(null).reason).toBe("UNKNOWN_NETWORK");
  });

  it("every produced reason is a member of the stable taxonomy", () => {
    for (const err of [nodeErr("ENOTFOUND"), nodeErr("ECONNREFUSED"), {}, new Error("Too many subrequests.")]) {
      expect(UNREACHABLE_REASONS).toContain(classifyUnreachableError(err).reason);
    }
  });

  it("code is capped at 40 chars and never leaks the message body or URL", () => {
    const e = new Error("fetch failed to https://secret.example.com/x?token=abcdef") as Error & { cause?: unknown };
    e.name = "TypeError";
    e.cause = { code: "X".repeat(80) };
    const { code } = classifyUnreachableError(e);
    expect(code.length).toBeLessThanOrEqual(40);
    expect(code).not.toContain("secret.example.com");
    expect(code).not.toContain("token");
  });
});

describe("checkDirectoryLink unreachable path (OPS-04 fields populated, still no strike)", () => {
  it("a thrown fetch yields unreachable + isHardDead=false + code/reason", async () => {
    const original = globalThis.fetch;
    try {
      globalThis.fetch = (async () => {
        const e = new Error("fetch failed") as Error & { cause?: unknown };
        e.name = "TypeError";
        e.cause = { code: "ENOTFOUND" };
        throw e;
      }) as typeof fetch;

      const v = await checkDirectoryLink("example-dead-host.test");
      expect(v.status).toBe("unreachable");
      expect(v.isHardDead).toBe(false);
      expect(v.unreachableReason).toBe("DNS_FAILURE");
      expect(v.unreachableCode).toBe("ENOTFOUND");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("no_url path carries no diagnostic fields", async () => {
    const v = await checkDirectoryLink("");
    expect(v.status).toBe("no_url");
    expect(v.unreachableReason).toBeUndefined();
    expect(v.unreachableCode).toBeUndefined();
  });
});

describe("normalizeCheckUrl", () => {
  it("adds https:// when missing", () => {
    expect(normalizeCheckUrl("example.com")).toBe("https://example.com");
  });
  it("keeps an existing scheme", () => {
    expect(normalizeCheckUrl("http://example.com")).toBe("http://example.com");
  });
  it("returns null for empty/nullish", () => {
    expect(normalizeCheckUrl("")).toBeNull();
    expect(normalizeCheckUrl(null)).toBeNull();
    expect(normalizeCheckUrl("   ")).toBeNull();
  });
});
