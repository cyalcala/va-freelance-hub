import { describe, expect, test } from "bun:test";
import { resolvePublicationOutboundUrl } from "./publication-outbound";

const SOURCE = "https://jobs.example.com/role/123";

describe("existing public outbound source and apply fallback", () => {
  for (const source of [null, undefined, 7, {}, "", "javascript:alert(1)", "file:///private", "mailto:jobs@example.com",
    "https://user:password@jobs.example.com/123", "https://localhost/123", "http://127.0.0.1/123",
    "https://[::1]/123", "https://jobs.localhost/123", "https://dotless/123", `https://jobs.example.com/${"x".repeat(2048)}`]) {
    test(`invalid source cannot be rescued by an independently safe apply URL ${JSON.stringify(source)}`, () => {
      expect(resolvePublicationOutboundUrl(source, SOURCE)).toBeNull();
    });
  }
  for (const apply of [null, undefined, "", "javascript:alert(1)", "https://other.example.com/apply",
    "https://user@jobs.example.com/apply", "https://localhost/apply", "mailto:jobs@example.com", "jobs@example.com",
    `https://jobs.example.com/${"x".repeat(2048)}`]) {
    test(`safe source remains the public fallback for unusable apply ${JSON.stringify(apply)}`, () => {
      expect(resolvePublicationOutboundUrl(SOURCE, apply)).toBe(SOURCE);
    });
  }
  test("normalizes valid input without guessing a host or fetching a link", () => {
    expect(resolvePublicationOutboundUrl("  HTTPS://Jobs.Example.com/role/123  ", null)).toBe(SOURCE);
  });
  test("retains an attributable same-host apply URL", () => {
    expect(resolvePublicationOutboundUrl(SOURCE, `${SOURCE}/apply`)).toBe(`${SOURCE}/apply`);
  });
  test("retains attributable apply when source normalization expands an accepted raw URL", () => {
    const source = `https://jobs.example.com/${"\u0001".repeat(2010)}x`;
    expect(resolvePublicationOutboundUrl(source, "https://jobs.example.com/apply")).toBe("https://jobs.example.com/apply");
  });
  for (const [source, apply] of [
    ["https://boards-api.greenhouse.io/v1/boards/acme/jobs/123", "https://boards.greenhouse.io/acme/jobs/123"],
    ["https://api.lever.co/v0/postings/acme/123", "https://jobs.lever.co/acme/123"],
    ["https://api.ashbyhq.com/posting-api/job-board/acme", "https://jobs.ashbyhq.com/acme/123"],
  ]) {
    test(`preserves existing exact ATS tenant alias attribution ${source}`, () => {
      expect(resolvePublicationOutboundUrl(source, apply)).toBe(apply);
    });
  }
  test("an unapproved ATS tenant still uses the valid source fallback", () => {
    const source = "https://boards-api.greenhouse.io/v1/boards/acme/jobs/123";
    expect(resolvePublicationOutboundUrl(source, "https://boards.greenhouse.io/other/jobs/123")).toBe(source);
  });
});
