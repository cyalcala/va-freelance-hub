import { describe, expect, it } from "bun:test";
import { canonicalizeSourceUrl, hashString, toContentHash } from "./contentHash";

describe("canonicalizeSourceUrl", () => {
  it("lowercases the host of the exact live defect: RemoteOK's mixed-case host", () => {
    expect(
      canonicalizeSourceUrl(
        "https://remoteOK.com/remote-jobs/remote-video-data-annotator-imerit-technology-1137428",
      ),
    ).toBe("https://remoteok.com/remote-jobs/remote-video-data-annotator-imerit-technology-1137428");
  });

  it("collapses two host casings of one posting onto one identity", () => {
    const mixed = canonicalizeSourceUrl("https://remoteOK.com/remote-jobs/abc-1137428");
    const lower = canonicalizeSourceUrl("https://remoteok.com/remote-jobs/abc-1137428");
    expect(mixed).toBe(lower);
  });

  it("lowercases the scheme too", () => {
    expect(canonicalizeSourceUrl("HTTPS://RemoteOK.com/jobs/1")).toBe("https://remoteok.com/jobs/1");
  });

  it("PRESERVES path case, which many ATS routes treat as significant", () => {
    expect(canonicalizeSourceUrl("https://RemoteOK.com/Remote-Jobs/AbC-1137428")).toBe(
      "https://remoteok.com/Remote-Jobs/AbC-1137428",
    );
  });

  it("PRESERVES query and fragment case, which carry identity-bearing tokens", () => {
    expect(canonicalizeSourceUrl("https://Example.com/jobs?Token=AbCdEf&src=RemoteOK#Apply")).toBe(
      "https://example.com/jobs?Token=AbCdEf&src=RemoteOK#Apply",
    );
  });

  it("keeps an explicit non-default port", () => {
    expect(canonicalizeSourceUrl("http://Example.com:8080/Job/1")).toBe("http://example.com:8080/Job/1");
  });

  it("is idempotent", () => {
    const once = canonicalizeSourceUrl("https://remoteOK.com/Remote-Jobs/AbC-1?T=XY");
    expect(canonicalizeSourceUrl(once)).toBe(once);
  });

  it("returns non-URL and relative input UNCHANGED, so a candidate is never dropped", () => {
    expect(canonicalizeSourceUrl("")).toBe("");
    expect(canonicalizeSourceUrl("not a url")).toBe("not a url");
    expect(canonicalizeSourceUrl("/relative/path")).toBe("/relative/path");
    expect(canonicalizeSourceUrl("jobs/12345")).toBe("jobs/12345");
  });

  it("never rewrites a URL carrying userinfo, because lowercasing could corrupt a secret", () => {
    expect(canonicalizeSourceUrl("https://user:Secret@Example.com/Jobs/1")).toBe(
      "https://user:Secret@Example.com/Jobs/1",
    );
  });

  it("produces the same content hash for two host casings of one posting", () => {
    // The D1 content_hash is hashString(title + "::" + sourceUrl); before this
    // helper existed the mixed-case host produced a second, different hash, so the
    // UNIQUE content_hash index could not deduplicate the pair either.
    const title = "Video Data Annotator";
    const path = "/remote-jobs/remote-video-data-annotator-imerit-technology-1137428";
    expect(toContentHash(title, canonicalizeSourceUrl(`https://remoteOK.com${path}`))).toBe(
      toContentHash(title, canonicalizeSourceUrl(`https://remoteok.com${path}`)),
    );
  });
});

describe("hashString (unchanged regression guard)", () => {
  it("is stable and case-sensitive on its input", () => {
    expect(hashString("a::b")).toBe(hashString("a::b"));
    expect(hashString("a::b")).not.toBe(hashString("A::b"));
  });
});