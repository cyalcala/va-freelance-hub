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

for (const scenario of [
  { label: "script", url: "javascript:alert(1)" },
  { label: "credential-bearing", url: "https://fixture-user:fixture-pass@example.test/job" },
  { label: "local", url: "https://localhost/job" },
  { label: "empty", url: "" },
  { label: "oversize", url: `https://example.test/${"a".repeat(2048)}` },
]) {
  test(`existing outbound guard rejects ${scenario.label} source even with a valid application target`, () => {
    const job = { sourceUrl: scenario.url, applicationUrl: "https://example.test/apply" };
    expect(resolveOutboundUrl(job, scenario.url)).toBeNull();
    expect(resolveOutboundUrl(job, job.applicationUrl)).toBeNull();
  });

  test(`existing outbound guard uses the safe source when the stored application URL is ${scenario.label}`, () => {
    const job = { sourceUrl: "https://example.test/job", applicationUrl: scenario.url };
    expect(resolveOutboundUrl(job, job.sourceUrl)).toBe(job.sourceUrl);
    // A missing redirect target remains a no-op; nonempty unsafe stored links
    // use the same safe source fallback as public navigation.
    expect(resolveOutboundUrl(job, job.applicationUrl)).toBe(scenario.url === "" ? null : job.sourceUrl);
  });
}

test("existing outbound guard preserves the source path for NULL application values", () => {
  const job = { sourceUrl: "https://example.test/job", applicationUrl: null };
  expect(resolveOutboundUrl(job, job.sourceUrl)).toBe(job.sourceUrl);
  expect(resolveOutboundUrl(job, null)).toBeNull();
});
