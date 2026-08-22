import { expect, test } from "bun:test";
import { resolveOutboundUrl } from "../src/lib/outbound-url";

test("rejects a stored script URL even when it matches the requested redirect target", () => {
  expect(resolveOutboundUrl(
    { sourceUrl: "javascript:alert(1)", applicationUrl: null },
    "javascript:alert(1)",
  )).toBeNull();
});

test("allows only the matching attributable source or application URL", () => {
  const job = {
    sourceUrl: "https://jobs.example.com/role",
    applicationUrl: "https://jobs.example.com/role/apply",
  };

  expect(resolveOutboundUrl(job, job.sourceUrl)).toBe("https://jobs.example.com/role");
  expect(resolveOutboundUrl(job, job.applicationUrl)).toBe("https://jobs.example.com/role/apply");
  expect(resolveOutboundUrl(job, "https://attacker.example/")).toBeNull();
});

test("falls back to the source listing for a legacy cross-host application URL", () => {
  const job = {
    sourceUrl: "https://remoteok.com/remote-jobs/123",
    applicationUrl: "https://remotephjobs.com/apply/123",
  };

  expect(resolveOutboundUrl(job, job.applicationUrl)).toBe("https://remoteok.com/remote-jobs/123");
});

test("treats remotephjobs.com as an attributable external source, not an owned or banned host", () => {
  const job = {
    sourceUrl: "https://remotephjobs.com/jobs/123",
    applicationUrl: "https://remotephjobs.com/apply/123",
  };

  expect(resolveOutboundUrl(job, job.applicationUrl)).toBe("https://remotephjobs.com/apply/123");
});
