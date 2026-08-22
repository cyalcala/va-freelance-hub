import { describe, expect, test } from "bun:test";
import {
  normalizeCompanyName,
  isQualityCompanyName,
  exactOrSubdomain,
  hostOf,
  isTrustedSourceUrl,
  extractAtsToken,
  inferNiche,
  classifyCandidates,
  type RawCandidate,
} from "./prospector";

describe("normalizeCompanyName", () => {
  test("lowercases, trims, collapses whitespace", () => {
    expect(normalizeCompanyName("  Acme   Corp  ")).toBe("acme corp");
    expect(normalizeCompanyName("LawnStarter")).toBe("lawnstarter");
  });
});

describe("isQualityCompanyName", () => {
  test("accepts real company names", () => {
    for (const n of ["LawnStarter", "Airalo", "Proxify AB", "Lemon.io", "LiveKit", "Xapo Bank"]) {
      expect(isQualityCompanyName(n)).toBe(true);
    }
  });

  test("rejects placeholders and garbage (real production noise)", () => {
    for (const n of ["Unknown", "unknown", "Digital", "N/A", "Confidential", "Remote", "Hiring", "Various", ""]) {
      expect(isQualityCompanyName(n)).toBe(false);
    }
  });

  test("rejects too-short, non-alpha, and bare generic words", () => {
    expect(isQualityCompanyName("ab")).toBe(false);
    expect(isQualityCompanyName("123")).toBe(false);
    expect(isQualityCompanyName("-")).toBe(false);
    expect(isQualityCompanyName("Solutions")).toBe(false);
    expect(isQualityCompanyName("Tech")).toBe(false);
    expect(isQualityCompanyName(null)).toBe(false);
    expect(isQualityCompanyName(undefined)).toBe(false);
  });

  test("keeps multi-word names that contain a generic word", () => {
    expect(isQualityCompanyName("Sourcegraph Solutions")).toBe(true);
    expect(isQualityCompanyName("Bright Labs")).toBe(true);
  });
});

describe("hostOf / isTrustedSourceUrl", () => {
  test("normalizes case and a trailing root dot, and strips www", () => {
    expect(hostOf("https://www.weworkremotely.com/remote-jobs/x")).toBe("weworkremotely.com");
    expect(hostOf("HTTPS://WWW.JOBICY.COM./jobs/x")).toBe("jobicy.com");
    expect(hostOf("not a url")).toBeNull();
    expect(hostOf(null)).toBeNull();
  });

  test("matches only an exact host or dot-delimited subdomain", () => {
    expect(exactOrSubdomain("jobicy.com", "jobicy.com")).toBe(true);
    expect(exactOrSubdomain("feeds.jobicy.com", "jobicy.com")).toBe(true);
    expect(exactOrSubdomain("regional.feeds.jobicy.com.", "JOBICY.COM")).toBe(true);
    expect(exactOrSubdomain("eviljobicy.com", "jobicy.com")).toBe(false);
    expect(exactOrSubdomain("jobicy.com.evil.test", "jobicy.com")).toBe(false);
    expect(exactOrSubdomain("", "jobicy.com")).toBe(false);
  });

  test("preserves trust for every configured source and ATS host", () => {
    const trustedUrls = [
      "https://weworkremotely.com/remote-jobs/x",
      "https://www.realworkfromanywhere.com/jobs/x",
      "https://jobicy.com/jobs/x",
      "https://remotive.com/remote-jobs/x",
      "https://boards.greenhouse.io/acme/jobs/1",
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs/1",
      "https://jobs.ashbyhq.com/acme/1",
      "https://api.ashbyhq.com/posting-api/job-board/acme",
      "https://jobs.lever.co/acme/1",
      "https://api.lever.co/v0/postings/acme",
      "https://acme.breezy.hr/p/1",
      "https://apply.workable.com/acme/j/1",
    ];

    for (const url of trustedUrls) expect(isTrustedSourceUrl(url)).toBe(true);
    // RemoteOK carries recruiter-repost spam -> not auto-add-trusted.
    expect(isTrustedSourceUrl("https://remoteok.com/remote-jobs/x")).toBe(false);
    expect(isTrustedSourceUrl(null)).toBe(false);
  });

  test("rejects concatenated lookalikes for curated and ATS hosts", () => {
    for (const host of [
      "eviljobicy.com",
      "evilboards.greenhouse.io.evil.test",
      "evilboards.greenhouse.io",
      "eviljobs.ashbyhq.com",
      "eviljobs.lever.co",
      "evilbreezy.hr",
      "evilapply.workable.com",
    ]) {
      expect(isTrustedSourceUrl(`https://${host}/acme/jobs/1`)).toBe(false);
    }
  });
});

describe("extractAtsToken", () => {
  test("greenhouse board + api urls", () => {
    expect(extractAtsToken("https://boards.greenhouse.io/gitlab/jobs/123")).toEqual({ platform: "greenhouse", token: "gitlab" });
    expect(extractAtsToken("https://boards-api.greenhouse.io/v1/boards/nearform/jobs")).toEqual({ platform: "greenhouse", token: "nearform" });
  });

  test("ashby board + posting-api urls", () => {
    expect(extractAtsToken("https://jobs.ashbyhq.com/supabase/abc-123")).toEqual({ platform: "ashby", token: "supabase" });
    expect(extractAtsToken("https://api.ashbyhq.com/posting-api/job-board/camunda")).toEqual({ platform: "ashby", token: "camunda" });
  });

  test("lever, breezy, workable urls", () => {
    expect(extractAtsToken("https://jobs.lever.co/acme/uuid")).toEqual({ platform: "lever", token: "acme" });
    expect(extractAtsToken("https://myco.breezy.hr/p/abc")).toEqual({ platform: "breezy", token: "myco" });
    expect(extractAtsToken("https://apply.workable.com/hunt-st/j/ABC/")).toEqual({ platform: "workable", token: "hunt-st" });
  });

  test("aggregator and junk urls yield null", () => {
    expect(extractAtsToken("https://weworkremotely.com/remote-jobs/lawnstarter-x")).toBeNull();
    expect(extractAtsToken("https://remoteok.com/remote-jobs/x")).toBeNull();
    expect(extractAtsToken("not a url")).toBeNull();
    expect(extractAtsToken(null)).toBeNull();
  });

  test("rejects concatenated ATS suffix lookalikes", () => {
    const maliciousUrls = [
      "https://evilgreenhouse.io/acme/jobs/1",
      "https://evilashbyhq.com/acme/1",
      "https://evillever.co/acme/1",
      "https://evilbreezy.hr/p/1",
      "https://evilworkable.com/acme/j/1",
    ];

    for (const url of maliciousUrls) expect(extractAtsToken(url)).toBeNull();
  });
});

describe("inferNiche", () => {
  test("tech maps to tech, everything else to global-va", () => {
    expect(inferNiche("tech")).toBe("tech");
    expect(inferNiche("customer-service")).toBe("global-va");
    expect(inferNiche(null)).toBe("global-va");
  });
});

describe("classifyCandidates", () => {
  const raw: RawCandidate[] = [
    { company: "LawnStarter", jobs: 28, sampleUrl: "https://weworkremotely.com/remote-jobs/lawnstarter-x" },
    { company: "Supabase", jobs: 9, sampleUrl: "https://jobs.ashbyhq.com/supabase/abc", category: "tech" },
    { company: "Unknown", jobs: 21, sampleUrl: "https://weworkremotely.com/remote-jobs/x" },
    { company: "Digital", jobs: 8, sampleUrl: "https://remoteok.com/remote-jobs/x" },
    { company: "Recruitlytixs Hirings", jobs: 10, sampleUrl: "https://remoteok.com/remote-jobs/x" },
    { company: "CloudLinux", jobs: 10, sampleUrl: "https://remoteok.com/remote-jobs/cloudlinux-x" },
  ];

  test("splits into auto-add / review / rejected with both gates", () => {
    const res = classifyCandidates(raw, new Set());
    // LawnStarter (trusted) + Supabase (trusted ATS) auto-add.
    expect(res.autoAdd.map((c) => c.companyName).sort()).toEqual(["LawnStarter", "Supabase"]);
    // CloudLinux is a quality name but RemoteOK-sourced -> review only.
    expect(res.review.map((c) => c.companyName)).toContain("CloudLinux");
    // Unknown + Digital fail the name gate. (Recruitlytixs Hirings passes name
    // gate but is RemoteOK -> review, not auto-add.)
    expect(res.rejected).toBeGreaterThanOrEqual(2);
    expect(res.autoAdd.every((c) => c.companyName !== "Recruitlytixs Hirings")).toBe(true);
  });

  test("attaches ATS ref when the sample url is an ATS link", () => {
    const res = classifyCandidates(raw, new Set());
    const supa = res.autoAdd.find((c) => c.companyName === "Supabase");
    expect(supa?.atsRef).toEqual({ platform: "ashby", token: "supabase" });
    const lawn = res.autoAdd.find((c) => c.companyName === "LawnStarter");
    expect(lawn?.atsRef).toBeNull();
  });

  test("skips companies already in the directory (normalized)", () => {
    const res = classifyCandidates(raw, new Set(["lawnstarter"]));
    expect(res.autoAdd.map((c) => c.companyName)).not.toContain("LawnStarter");
  });

  test("de-duplicates within a single batch", () => {
    const dup: RawCandidate[] = [
      { company: "Acme", jobs: 3, sampleUrl: "https://weworkremotely.com/a" },
      { company: "  acme ", jobs: 2, sampleUrl: "https://weworkremotely.com/b" },
    ];
    const res = classifyCandidates(dup, new Set());
    expect(res.autoAdd).toHaveLength(1);
  });
});
