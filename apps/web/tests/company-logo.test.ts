import { describe, expect, test } from "bun:test";
import {
  companyLogoFallbackSvg,
  parseCompanyLogoRequest,
} from "../src/lib/company-logo";

describe("company logo requests", () => {
  test("normalizes a public hostname and bounded initial", () => {
    const parsed = parseCompanyLogoRequest(
      new URL("https://example.com/api/company-logo?domain=WWW.Example.COM.&initial=e"),
    );
    expect(parsed).toEqual({ domain: "www.example.com", initial: "E" });
  });

  test("rejects malformed and local targets", () => {
    expect(parseCompanyLogoRequest(new URL("https://example.com/api/company-logo?domain=localhost"))).toBeNull();
    expect(parseCompanyLogoRequest(new URL("https://example.com/api/company-logo?domain=127.0.0.1"))).toBeNull();
    expect(parseCompanyLogoRequest(new URL("https://example.com/api/company-logo?domain=https://evil.test"))).toBeNull();
  });

  test("produces a self-contained safe fallback logo", () => {
    const svg = companyLogoFallbackSvg("V");
    expect(svg).toContain(">V</text>");
    expect(svg).not.toContain("script");
    expect(companyLogoFallbackSvg("<")).toContain(">?</text>");
  });
});
