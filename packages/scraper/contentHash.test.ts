import { describe, test, expect } from "bun:test";
import { hashString, toContentHash, toAshbyContentHash } from "./contentHash";

describe("contentHash — shared deduplication hash", () => {
  test("hashString produces consistent 16-char hex output", () => {
    const h1 = hashString("test input");
    const h2 = hashString("test input");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{16}$/);
  });

  test("hashString differs for different inputs", () => {
    expect(hashString("input a")).not.toBe(hashString("input b"));
  });

  test("toContentHash combines title and sourceUrl deterministically", () => {
    const h1 = toContentHash("Senior Engineer", "https://jobs.ashbyhq.com/supabase/abc123");
    const h2 = toContentHash("Senior Engineer", "https://jobs.ashbyhq.com/supabase/abc123");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{16}$/);
  });

  test("toContentHash differs when title or URL differs", () => {
    const base = toContentHash("Senior Engineer", "https://jobs.ashbyhq.com/supabase/abc123");
    expect(toContentHash("Junior Engineer", "https://jobs.ashbyhq.com/supabase/abc123")).not.toBe(base);
    expect(toContentHash("Senior Engineer", "https://jobs.ashbyhq.com/supabase/def456")).not.toBe(base);
  });
});

describe("toAshbyContentHash — Ashby-specific deduplication with ATS job ID", () => {
  const title = "Senior Engineer";
  const sourceUrl = "https://jobs.ashbyhq.com/supabase/abc123";
  const atsJobId = "ashby_job_12345";

  test("incorporates ATS job ID when provided", () => {
    const hashWithId = toAshbyContentHash(title, sourceUrl, atsJobId);
    const hashWithoutId = toContentHash(title, sourceUrl);
    expect(hashWithId).not.toBe(hashWithoutId);
    expect(hashWithId).toMatch(/^[a-f0-9]{16}$/);
  });

  test("produces consistent hash for same inputs", () => {
    const h1 = toAshbyContentHash(title, sourceUrl, atsJobId);
    const h2 = toAshbyContentHash(title, sourceUrl, atsJobId);
    expect(h1).toBe(h2);
  });

  test("differs when ATS job ID differs", () => {
    const h1 = toAshbyContentHash(title, sourceUrl, "job_1");
    const h2 = toAshbyContentHash(title, sourceUrl, "job_2");
    expect(h1).not.toBe(h2);
  });

  test("differs when title differs (even with same ATS job ID)", () => {
    const h1 = toAshbyContentHash("Senior Engineer", sourceUrl, atsJobId);
    const h2 = toAshbyContentHash("Junior Engineer", sourceUrl, atsJobId);
    expect(h1).not.toBe(h2);
  });

  test("differs when sourceUrl differs (even with same ATS job ID)", () => {
    const h1 = toAshbyContentHash(title, "https://jobs.ashbyhq.com/supabase/abc123", atsJobId);
    const h2 = toAshbyContentHash(title, "https://jobs.ashbyhq.com/supabase/def456", atsJobId);
    expect(h1).not.toBe(h2);
  });

  test("falls back to standard hash when ATS job ID is undefined", () => {
    const hashWithUndefined = toAshbyContentHash(title, sourceUrl, undefined);
    const standardHash = toContentHash(title, sourceUrl);
    expect(hashWithUndefined).toBe(standardHash);
  });

  test("falls back to standard hash when ATS job ID is empty string", () => {
    const hashWithEmpty = toAshbyContentHash(title, sourceUrl, "");
    const standardHash = toContentHash(title, sourceUrl);
    expect(hashWithEmpty).toBe(standardHash);
  });

  test("falls back to standard hash when ATS job ID is whitespace only", () => {
    const hashWithWhitespace = toAshbyContentHash(title, sourceUrl, "   ");
    const standardHash = toContentHash(title, sourceUrl);
    expect(hashWithWhitespace).toBe(standardHash);
  });

  test("trims whitespace from ATS job ID", () => {
    const hashTrimmed = toAshbyContentHash(title, sourceUrl, "  job_123  ");
    const hashUntrimmed = toAshbyContentHash(title, sourceUrl, "job_123");
    expect(hashTrimmed).toBe(hashUntrimmed);
  });
});