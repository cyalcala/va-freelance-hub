import { expect, test } from "bun:test";
import { resolveOutboundUrl } from "../src/lib/outbound-url";

test("rejects a stored script URL even when it matches the requested redirect target", () => {
  expect(resolveOutboundUrl(
    { sourceUrl: "javascript:alert(1)", applicationUrl: null },
    "javascript:alert(1)",
  )).toBeNull();
});

test("allows only the matching sanitized source or application URL", () => {
  const job = {
    sourceUrl: "https://jobs.example.com/role",
    applicationUrl: "mailto:apply@example.com",
  };

  expect(resolveOutboundUrl(job, job.sourceUrl)).toBe("https://jobs.example.com/role");
  expect(resolveOutboundUrl(job, job.applicationUrl)).toBe("mailto:apply@example.com");
  expect(resolveOutboundUrl(job, "https://attacker.example/")).toBeNull();
});
