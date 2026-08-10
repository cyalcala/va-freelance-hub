import { expect, test } from "bun:test";
import { applySecurityHeaders } from "../src/lib/security-headers";

test("applies production security headers without overwriting route cache policy", () => {
  const headers = new Headers({ "Cache-Control": "public, max-age=60" });
  applySecurityHeaders(headers);

  expect(headers.get("Cache-Control")).toBe("public, max-age=60");
  expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(headers.get("X-Frame-Options")).toBe("DENY");
  expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  expect(headers.get("Permissions-Policy")).toContain("camera=()");
  expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
});
