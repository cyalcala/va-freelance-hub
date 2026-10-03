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

  test("handles tabs, newlines, and multiple whitespace types", () => {
    expect(normalizeCompanyName("Acme\t\tCorp")).toBe("acme corp");
    expect(normalizeCompanyName("Acme\n\nCorp")).toBe("acme corp");
    expect(normalizeCompanyName("  Acme \t \n Corp  ")).toBe("acme corp");
    expect(normalizeCompanyName("\tAcme\nCorp\t")).toBe("acme corp");
  });

  test("handles unicode and special characters", () => {
    expect(normalizeCompanyName("Café\x20Corp")).toBe("café corp");
    expect(normalizeCompanyName("Naïve\x20Inc.")).toBe("naïve inc.");
    expect(normalizeCompanyName("北京科技")).toBe("北京科技");
    expect(normalizeCompanyName("Tokyo\u3000Systems")).toBe("tokyo systems"); // ideographic space
  });

  test("handles leading/trailing punctuation and symbols", () => {
    expect(normalizeCompanyName("...Acme Corp...")).toBe("...acme corp...");
    expect(normalizeCompanyName("!!!Acme!!!")).toBe("!!!acme!!!");
    expect(normalizeCompanyName("Acme-Corp_LLC")).toBe("acme-corp_llc");
  });

  test("handles empty and whitespace-only strings", () => {
    expect(normalizeCompanyName("")).toBe("");
    expect(normalizeCompanyName("   ")).toBe("");
    expect(normalizeCompanyName("\t\n")).toBe("");
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

  test("handles case-insensitive blocklist matching", () => {
    expect(isQualityCompanyName("UNKNOWN")).toBe(false);
    expect(isQualityCompanyName("UnKnOwN")).toBe(false);
    expect(isQualityCompanyName("digital")).toBe(false);
    expect(isQualityCompanyName("DIGITAL")).toBe(false);
    expect(isQualityCompanyName("N/a")).toBe(false);
    expect(isQualityCompanyName("ConfIdEnTiAl")).toBe(false);
  });

  test("handles unicode company names", () => {
    expect(isQualityCompanyName("Café Corp")).toBe(true);
    expect(isQualityCompanyName("北京科技")).toBe(false); // requires at least one ASCII letter
    expect(isQualityCompanyName("Tokyo Systems")).toBe(true);
    expect(isQualityCompanyName("Müller GmbH")).toBe(true);
  });

  test("handles names with numbers and special chars", () => {
    expect(isQualityCompanyName("Company123")).toBe(true);
    expect(isQualityCompanyName("Acme-Corp")).toBe(true);
    expect(isQualityCompanyName("Acme_Corp")).toBe(true);
    expect(isQualityCompanyName("Acme.Corp")).toBe(true);
    expect(isQualityCompanyName("Acme Corp LLC")).toBe(true);
    expect(isQualityCompanyName("A1")).toBe(false); // too short after normalization
    expect(isQualityCompanyName("123Corp")).toBe(true); // contains letters
  });

  test("handles blocklist edge cases with punctuation", () => {
    expect(isQualityCompanyName("Unknown.")).toBe(true); // not exact match
    expect(isQualityCompanyName("Unknown,")).toBe(true);
    expect(isQualityCompanyName("Unknown Inc")).toBe(true); // multi-word with blocklist word
    expect(isQualityCompanyName("The Unknown")).toBe(true);
  });

  test("handles generic single words with punctuation", () => {
    expect(isQualityCompanyName("Solutions.")).toBe(true); // not bare generic
    expect(isQualityCompanyName("Tech!")).toBe(true);
    expect(isQualityCompanyName("Services?")).toBe(true);
  });

  test("rejects whitespace-only and minimal strings", () => {
    expect(isQualityCompanyName(" ")).toBe(false);
    expect(isQualityCompanyName("\t")).toBe(false);
    expect(isQualityCompanyName("\n")).toBe(false);
    expect(isQualityCompanyName("a")).toBe(false);
    expect(isQualityCompanyName("aa")).toBe(false);
  });
});

describe("hostOf / isTrustedSourceUrl / exactOrSubdomain", () => {
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

  test("handles ports and credentials in URLs", () => {
    expect(hostOf("https://weworkremotely.com:8443/remote-jobs/x")).toBe("weworkremotely.com");
    expect(hostOf("https://user:pass@weworkremotely.com/remote-jobs/x")).toBe("weworkremotely.com");
    expect(hostOf("https://user@weworkremotely.com/remote-jobs/x")).toBe("weworkremotely.com");
  });

  test("handles IP addresses and localhost", () => {
    expect(hostOf("https://127.0.0.1:3000/jobs")).toBe("127.0.0.1");
    expect(hostOf("https://192.168.1.1/jobs")).toBe("192.168.1.1");
    expect(hostOf("https://localhost/jobs")).toBe("localhost");
    expect(hostOf("https://[::1]/jobs")).toBe("[::1]"); // IPv6
  });

  test("handles file:// and other non-http schemes", () => {
    expect(hostOf("file:///path/to/file")).toBe(""); // file:// has empty hostname
    expect(hostOf("ftp://example.com/file")).toBe("example.com");
  });

  test("handles malformed and edge case URLs", () => {
    expect(hostOf("")).toBeNull();
    expect(hostOf("https://")).toBeNull();
    expect(hostOf("https:///path")).toBe("path"); // URL parser treats path as hostname when no authority
    expect(hostOf("://example.com")).toBeNull();
    expect(hostOf("example.com")).toBeNull(); // no scheme
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

  test("handles trusted URLs with ports and query params", () => {
    expect(isTrustedSourceUrl("https://weworkremotely.com:8443/remote-jobs/x")).toBe(true);
    expect(isTrustedSourceUrl("https://jobs.ashbyhq.com/supabase/1?ref=board")).toBe(true);
    expect(isTrustedSourceUrl("https://apply.workable.com/hunt-st/j/ABC/#details")).toBe(true);
    expect(isTrustedSourceUrl("https://acme.breezy.hr/p/1?source=linkedin")).toBe(true);
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

  test("handles case-insensitive trusted host matching", () => {
    expect(isTrustedSourceUrl("https://WWW.WEWORKREMOTELY.COM/remote-jobs/x")).toBe(true);
    expect(isTrustedSourceUrl("https://Jobs.AshbyHQ.com/supabase/1")).toBe(true);
    expect(isTrustedSourceUrl("https://APPLY.WORKABLE.COM/hunt-st/j/ABC")).toBe(true);
  });

  test("exactOrSubdomain handles edge cases", () => {
    expect(exactOrSubdomain("example.com", "example.com")).toBe(true);
    expect(exactOrSubdomain("sub.example.com", "example.com")).toBe(true);
    expect(exactOrSubdomain("deep.sub.example.com", "example.com")).toBe(true);
    expect(exactOrSubdomain("example.com.", "example.com")).toBe(true); // trailing dot
    expect(exactOrSubdomain(".example.com", "example.com")).toBe(true); // leading dot normalized away
    expect(exactOrSubdomain("example.com.evil.com", "example.com")).toBe(false);
    expect(exactOrSubdomain("evil.example.com", "example.com")).toBe(true); // subdomain of example.com
    expect(exactOrSubdomain("example.com", "com")).toBe(true); // "example.com" ends with ".com" - current behavior
    expect(exactOrSubdomain("", "example.com")).toBe(false);
    expect(exactOrSubdomain("example.com", "")).toBe(false);
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
    expect(extractAtsToken("https://apply.workable.com/api/v1/widget/accounts/hunt-st")).toEqual({ platform: "workable", token: "hunt-st" });
  });

  test("rejects Workable shortlinks and reserved slugs without company token", () => {
    expect(extractAtsToken("https://apply.workable.com/j/24BFD1BADD")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/j/ABC12345/")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/careers")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/resources/blog")).toBeNull();
    expect(extractAtsToken("https://app.breezy.hr/login")).toBeNull();
    expect(extractAtsToken("https://boards.greenhouse.io/v1/boards/embed")).toBeNull();
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

  test("handles URLs with query parameters and fragments", () => {
    expect(extractAtsToken("https://boards.greenhouse.io/gitlab/jobs/123?ref=linkedin")).toEqual({ platform: "greenhouse", token: "gitlab" });
    expect(extractAtsToken("https://jobs.ashbyhq.com/supabase/abc-123#details")).toEqual({ platform: "ashby", token: "supabase" });
    expect(extractAtsToken("https://jobs.lever.co/acme/uuid?source=board")).toEqual({ platform: "lever", token: "acme" });
    expect(extractAtsToken("https://myco.breezy.hr/p/abc?ref=jobs")).toEqual({ platform: "breezy", token: "myco" });
    expect(extractAtsToken("https://apply.workable.com/hunt-st/j/ABC/?ref=linkedin")).toEqual({ platform: "workable", token: "hunt-st" });
  });

  test("handles case variations in URLs", () => {
    expect(extractAtsToken("https://BOARDS.GREENHOUSE.IO/GITLAB/jobs/123")).toEqual({ platform: "greenhouse", token: "gitlab" });
    expect(extractAtsToken("https://JOBS.ASHBYHQ.COM/SUPABASE/abc-123")).toEqual({ platform: "ashby", token: "supabase" });
    expect(extractAtsToken("https://JOBS.LEVER.CO/ACME/uuid")).toEqual({ platform: "lever", token: "acme" });
    expect(extractAtsToken("https://MYCO.BREEZY.HR/p/abc")).toEqual({ platform: "breezy", token: "myco" });
    expect(extractAtsToken("https://APPLY.WORKABLE.COM/HUNT-ST/j/ABC/")).toEqual({ platform: "workable", token: "hunt-st" });
  });

  test("handles trailing slashes and multiple path segments", () => {
    expect(extractAtsToken("https://boards.greenhouse.io/gitlab/jobs/123/")).toEqual({ platform: "greenhouse", token: "gitlab" });
    expect(extractAtsToken("https://boards.greenhouse.io/gitlab/jobs/123/apply")).toEqual({ platform: "greenhouse", token: "gitlab" });
    expect(extractAtsToken("https://jobs.ashbyhq.com/supabase/abc-123/")).toEqual({ platform: "ashby", token: "supabase" });
    expect(extractAtsToken("https://jobs.lever.co/acme/uuid/")).toEqual({ platform: "lever", token: "acme" });
    expect(extractAtsToken("https://apply.workable.com/hunt-st/j/ABC//")).toEqual({ platform: "workable", token: "hunt-st" });
  });

  test("handles Greenhouse API URL variations", () => {
    expect(extractAtsToken("https://boards-api.greenhouse.io/v1/boards/nearform/jobs")).toEqual({ platform: "greenhouse", token: "nearform" });
    expect(extractAtsToken("https://boards-api.greenhouse.io/v2/boards/nearform/jobs")).toEqual({ platform: "greenhouse", token: "nearform" });
    expect(extractAtsToken("https://boards.greenhouse.io/embed/job_app?for=nearform")).toBeNull(); // embed is reserved
  });

  test("handles Ashby posting-api variations", () => {
    expect(extractAtsToken("https://api.ashbyhq.com/posting-api/job-board/camunda")).toEqual({ platform: "ashby", token: "camunda" });
    expect(extractAtsToken("https://api.ashbyhq.com/posting-api/job-board/camunda/")).toEqual({ platform: "ashby", token: "camunda" });
    expect(extractAtsToken("https://api.ashbyhq.com/posting-api/job-board/camunda?location=remote")).toEqual({ platform: "ashby", token: "camunda" });
  });

  test("handles Lever API URL variations", () => {
    expect(extractAtsToken("https://api.lever.co/v0/postings/acme")).toEqual({ platform: "lever", token: "acme" });
    expect(extractAtsToken("https://api.lever.co/v1/postings/acme")).toEqual({ platform: "lever", token: "acme" });
    expect(extractAtsToken("https://jobs.lever.co/acme")).toEqual({ platform: "lever", token: "acme" });
  });

  test("handles Breezy subdomain variations", () => {
    expect(extractAtsToken("https://myco.breezy.hr")).toEqual({ platform: "breezy", token: "myco" });
    expect(extractAtsToken("https://myco.breezy.hr/")).toEqual({ platform: "breezy", token: "myco" });
    expect(extractAtsToken("https://myco.breezy.hr/position/123")).toEqual({ platform: "breezy", token: "myco" });
  });

  test("handles Workable widget API variations", () => {
    expect(extractAtsToken("https://apply.workable.com/api/v1/widget/accounts/hunt-st")).toEqual({ platform: "workable", token: "hunt-st" });
    expect(extractAtsToken("https://apply.workable.com/api/v2/widget/accounts/hunt-st")).toEqual({ platform: "workable", token: "hunt-st" });
    expect(extractAtsToken("https://apply.workable.com/hunt-st")).toEqual({ platform: "workable", token: "hunt-st" });
    expect(extractAtsToken("https://apply.workable.com/hunt-st/")).toEqual({ platform: "workable", token: "hunt-st" });
  });

  test("rejects reserved slugs across all ATS platforms", () => {
    // Greenhouse reserved
    expect(extractAtsToken("https://boards.greenhouse.io/v1/boards/embed")).toBeNull();
    expect(extractAtsToken("https://boards.greenhouse.io/v1/boards/v1")).toBeNull();
    expect(extractAtsToken("https://boards.greenhouse.io/v1/boards/v2")).toBeNull();
    expect(extractAtsToken("https://boards.greenhouse.io/v1/boards/api")).toBeNull();
    expect(extractAtsToken("https://boards.greenhouse.io/v1/boards/about")).toBeNull();
    expect(extractAtsToken("https://boards.greenhouse.io/v1/boards/jobs")).toBeNull();
    expect(extractAtsToken("https://boards.greenhouse.io/v1/boards/job")).toBeNull();

    // Workable reserved
    expect(extractAtsToken("https://apply.workable.com/j/ABC123")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/careers")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/resources")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/api")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/widget")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/accounts")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/auth")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/login")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/help")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/blog")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/privacy")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/terms")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/cookie-policy")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/view")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/company")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/companies")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/job")).toBeNull();
    expect(extractAtsToken("https://apply.workable.com/search")).toBeNull();

    // Breezy reserved
    expect(extractAtsToken("https://breezy.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://app.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://auth.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://login.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://help.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://support.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://status.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://blog.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://resources.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://careers.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://api.breezy.hr/p/1")).toBeNull();
    expect(extractAtsToken("https://cdn.breezy.hr/p/1")).toBeNull();
  });
});

describe("inferNiche", () => {
  test("tech maps to tech, everything else to global-va", () => {
    expect(inferNiche("tech")).toBe("tech");
    expect(inferNiche("customer-service")).toBe("global-va");
    expect(inferNiche(null)).toBe("global-va");
  });

  test("handles case variations", () => {
    expect(inferNiche("Tech")).toBe("global-va"); // case sensitive
    expect(inferNiche("TECH")).toBe("global-va");
    expect(inferNiche("Customer-Service")).toBe("global-va");
  });

  test("handles all known categories", () => {
    expect(inferNiche("customer-service")).toBe("global-va");
    expect(inferNiche("admin")).toBe("global-va");
    expect(inferNiche("marketing")).toBe("global-va");
    expect(inferNiche("design")).toBe("global-va");
    expect(inferNiche("finance")).toBe("global-va");
  });

  test("handles unknown categories", () => {
    expect(inferNiche("unknown")).toBe("global-va");
    expect(inferNiche("sales")).toBe("global-va");
    expect(inferNiche("operations")).toBe("global-va");
    expect(inferNiche("hr")).toBe("global-va");
    expect(inferNiche("legal")).toBe("global-va");
    expect(inferNiche("")).toBe("global-va");
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

  test("handles empty input", () => {
    const res = classifyCandidates([], new Set());
    expect(res.autoAdd).toHaveLength(0);
    expect(res.review).toHaveLength(0);
    expect(res.rejected).toBe(0);
  });

  test("handles all rejected candidates", () => {
    const allBad: RawCandidate[] = [
      { company: "Unknown", jobs: 5, sampleUrl: "https://weworkremotely.com/x" },
      { company: "Digital", jobs: 3, sampleUrl: "https://remoteok.com/x" },
      { company: "N/A", jobs: 2, sampleUrl: "https://jobicy.com/x" },
    ];
    const res = classifyCandidates(allBad, new Set());
    expect(res.autoAdd).toHaveLength(0);
    expect(res.review).toHaveLength(0);
    expect(res.rejected).toBe(3);
  });

  test("handles all review candidates (quality names, untrusted sources)", () => {
    const allReview: RawCandidate[] = [
      { company: "QualityCorp", jobs: 5, sampleUrl: "https://randomsite.com/jobs/1" },
      { company: "AnotherGoodCo", jobs: 3, sampleUrl: "https://unknown-aggregator.com/jobs/2" },
    ];
    const res = classifyCandidates(allReview, new Set());
    expect(res.autoAdd).toHaveLength(0);
    expect(res.review).toHaveLength(2);
    expect(res.rejected).toBe(0);
    expect(res.review.map(c => c.companyName).sort()).toEqual(["AnotherGoodCo", "QualityCorp"]);
  });

  test("handles all auto-add candidates (quality names, trusted sources)", () => {
    const allAuto: RawCandidate[] = [
      { company: "TrustedCo", jobs: 5, sampleUrl: "https://weworkremotely.com/remote-jobs/trustedco" },
      { company: "ATSCorp", jobs: 3, sampleUrl: "https://jobs.ashbyhq.com/atscorp/abc" },
    ];
    const res = classifyCandidates(allAuto, new Set());
    expect(res.autoAdd).toHaveLength(2);
    expect(res.review).toHaveLength(0);
    expect(res.rejected).toBe(0);
    expect(res.autoAdd.map(c => c.companyName).sort()).toEqual(["ATSCorp", "TrustedCo"]);
  });

  test("handles large batch with mixed outcomes", () => {
    const largeBatch: RawCandidate[] = Array.from({ length: 100 }, (_, i) => ({
      company: i % 4 === 0 ? `GoodCompany${i}` : i % 4 === 1 ? `QualityCorp${i}` : i % 4 === 2 ? "Unknown" : "Digital",
      jobs: i + 1,
      sampleUrl: i % 4 === 0
        ? `https://weworkremotely.com/remote-jobs/good${i}`
        : i % 4 === 1
        ? `https://remoteok.com/remote-jobs/quality${i}`
        : i % 4 === 2
        ? `https://weworkremotely.com/remote-jobs/unknown${i}`
        : `https://jobicy.com/jobs/digital${i}`,
      category: i % 5 === 0 ? "tech" : "admin",
    }));
    const res = classifyCandidates(largeBatch, new Set());
    // ~25 auto-add (trusted source + quality name), ~25 review (RemoteOK + quality name), ~25 rejected (Unknown on trusted), ~25 rejected (Digital on untrusted)
    expect(res.autoAdd.length + res.review.length + res.rejected).toBe(100);
    expect(res.autoAdd.length).toBeGreaterThan(0);
    expect(res.review.length).toBeGreaterThan(0);
    expect(res.rejected).toBeGreaterThan(0);
  });

  test("attaches correct ATS ref for each platform", () => {
    const atsCandidates: RawCandidate[] = [
      { company: "GreenhouseCo", jobs: 5, sampleUrl: "https://boards.greenhouse.io/greenhouseco/jobs/1" },
      { company: "AshbyCo", jobs: 3, sampleUrl: "https://jobs.ashbyhq.com/ashbyco/abc" },
      { company: "LeverCo", jobs: 4, sampleUrl: "https://jobs.lever.co/leverco/uuid" },
      { company: "BreezyCo", jobs: 2, sampleUrl: "https://breezyco.breezy.hr/p/1" },
      { company: "WorkableCo", jobs: 6, sampleUrl: "https://apply.workable.com/workableco/j/ABC" },
    ];
    const res = classifyCandidates(atsCandidates, new Set());
    expect(res.autoAdd).toHaveLength(5);
    const byName = Object.fromEntries(res.autoAdd.map(c => [c.companyName, c]));
    expect(byName.GreenhouseCo.atsRef).toEqual({ platform: "greenhouse", token: "greenhouseco" });
    expect(byName.AshbyCo.atsRef).toEqual({ platform: "ashby", token: "ashbyco" });
    expect(byName.LeverCo.atsRef).toEqual({ platform: "lever", token: "leverco" });
    expect(byName.BreezyCo.atsRef).toEqual({ platform: "breezy", token: "breezyco" });
    expect(byName.WorkableCo.atsRef).toEqual({ platform: "workable", token: "workableco" });
  });

  test("handles companies with same normalized name but different case in existing set", () => {
    const res = classifyCandidates(raw, new Set(["lawnstarter", "supabase"]));
    expect(res.autoAdd.map((c) => c.companyName)).not.toContain("LawnStarter");
    expect(res.autoAdd.map((c) => c.companyName)).not.toContain("Supabase");
  });

  test("handles companies with unicode names", () => {
    const unicodeRaw: RawCandidate[] = [
      { company: "Café Corp", jobs: 5, sampleUrl: "https://weworkremotely.com/remote-jobs/cafe" },
      { company: "北京科技", jobs: 3, sampleUrl: "https://jobs.ashbyhq.com/beijing/abc" },
    ];
    const res = classifyCandidates(unicodeRaw, new Set());
    expect(res.autoAdd).toHaveLength(1); // "北京科技" fails quality check (no ASCII letters)
    expect(res.autoAdd[0].companyName).toBe("Café Corp");
    expect(res.rejected).toBe(1); // "北京科技" rejected due to quality gate
  });

  test("handles companies with special characters in names", () => {
    const specialRaw: RawCandidate[] = [
      { company: "Acme-Corp", jobs: 5, sampleUrl: "https://weworkremotely.com/remote-jobs/acme-corp" },
      { company: "Acme_Corp", jobs: 3, sampleUrl: "https://jobs.ashbyhq.com/acme_corp/abc" },
      { company: "Acme.Corp", jobs: 4, sampleUrl: "https://jobs.lever.co/acme.corp/uuid" },
    ];
    const res = classifyCandidates(specialRaw, new Set());
    expect(res.autoAdd).toHaveLength(3);
  });

  test("de-duplicates within batch preserving first occurrence", () => {
    const dup: RawCandidate[] = [
      { company: "Acme", jobs: 3, sampleUrl: "https://weworkremotely.com/a" },
      { company: "ACME", jobs: 5, sampleUrl: "https://jobs.ashbyhq.com/acme/1" }, // different source, same normalized name
      { company: "  acme ", jobs: 2, sampleUrl: "https://remoteok.com/remote-jobs/acme" },
    ];
    const res = classifyCandidates(dup, new Set());
    expect(res.autoAdd).toHaveLength(1);
    expect(res.autoAdd[0].companyName).toBe("Acme"); // first occurrence preserved
    expect(res.autoAdd[0].sampleUrl).toBe("https://weworkremotely.com/a");
  });

  test("handles candidates with null/undefined sampleUrl", () => {
    const nullUrlRaw: RawCandidate[] = [
      { company: "GoodCompany", jobs: 5, sampleUrl: null },
      { company: "AlsoGood", jobs: 3, sampleUrl: undefined },
    ];
    const res = classifyCandidates(nullUrlRaw, new Set());
    expect(res.autoAdd).toHaveLength(0);
    expect(res.review).toHaveLength(2); // quality names but no trusted source
    expect(res.rejected).toBe(0);
  });

  test("preserves niche assignment from category", () => {
    const nicheRaw: RawCandidate[] = [
      { company: "TechCorp", jobs: 5, sampleUrl: "https://weworkremotely.com/remote-jobs/techcorp", category: "tech" },
      { company: "SupportCorp", jobs: 3, sampleUrl: "https://jobs.ashbyhq.com/supportcorp/abc", category: "customer-service" },
      { company: "AdminCorp", jobs: 4, sampleUrl: "https://jobs.lever.co/admincorp/uuid", category: "admin" },
      { company: "MarketingCorp", jobs: 2, sampleUrl: "https://marketingcorp.breezy.hr/p/1", category: "marketing" },
      { company: "DesignCorp", jobs: 6, sampleUrl: "https://apply.workable.com/designcorp/j/ABC", category: "design" },
      { company: "FinanceCorp", jobs: 3, sampleUrl: "https://weworkremotely.com/remote-jobs/financecorp", category: "finance" },
    ];
    const res = classifyCandidates(nicheRaw, new Set());
    const byName = Object.fromEntries(res.autoAdd.map(c => [c.companyName, c]));
    expect(byName.TechCorp.niche).toBe("tech");
    expect(byName.SupportCorp.niche).toBe("global-va");
    expect(byName.AdminCorp.niche).toBe("global-va");
    expect(byName.MarketingCorp.niche).toBe("global-va");
    expect(byName.DesignCorp.niche).toBe("global-va");
    expect(byName.FinanceCorp.niche).toBe("global-va");
  });
});
