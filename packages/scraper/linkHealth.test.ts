import { describe, it, expect } from "bun:test";
import { classifyLinkResponse, normalizeCheckUrl } from "./linkHealth";

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
