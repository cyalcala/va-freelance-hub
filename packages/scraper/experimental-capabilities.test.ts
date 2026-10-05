import { describe, expect, it } from "bun:test";
import {
  detectBrowserRequirement,
  extractJobsFromHtml,
  executeCrawl4Ai,
} from "./crawl4ai-capability";
import {
  qualifiesForKitesurfEscalation,
  executeKitesurf,
  extractJobsFromHydratedHtml,
} from "./kitesurf-capability";
import {
  runExperimentalSourcePipeline,
  evaluateRoleRelevance,
  isOpportunityFresh,
  summarizeBatchResults,
} from "./experimental-orchestrator";
import type {
  ExperimentalCandidate,
  ExtractionResult,
  RawExtractedJob,
} from "./experimental-source-types";

describe("Crawl4AI Experimental Capability", () => {
  it("extracts JobPosting items from JSON-LD blocks", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Executive Virtual Assistant",
              "url": "https://example.com/careers/executive-va",
              "hiringOrganization": { "@type": "Organization", "name": "Test Agency" },
              "jobLocationType": "TELECOMMUTE",
              "description": "Full-time executive virtual assistant for email and calendar management."
            }
          </script>
        </head>
        <body><h1>Careers</h1></body>
      </html>
    `;

    const jobs = extractJobsFromHtml(html, "https://example.com/careers");
    expect(jobs.length).toBe(1);
    expect(jobs[0].title).toBe("Executive Virtual Assistant");
    expect(jobs[0].url).toBe("https://example.com/careers/executive-va");
    expect(jobs[0].company).toBe("Test Agency");
    expect(jobs[0].isRemoteHint).toBe(true);
  });

  it("extracts job links from structured HTML with same-domain enforcement", () => {
    const html = `
      <html>
        <body>
          <div class="openings">
            <a href="/jobs/customer-support-specialist">Customer Support Specialist</a>
            <a href="https://example.com/careers/operations-coordinator">Operations Coordinator</a>
            <a href="https://external-spam.com/jobs/fake">External Repost</a>
          </div>
        </body>
      </html>
    `;

    const jobs = extractJobsFromHtml(html, "https://example.com/careers");
    expect(jobs.length).toBe(2);
    expect(jobs[0].title).toBe("Customer Support Specialist");
    expect(jobs[0].url).toBe("https://example.com/jobs/customer-support-specialist");
    expect(jobs[1].title).toBe("Operations Coordinator");
    expect(jobs[1].url).toBe("https://example.com/careers/operations-coordinator");
    // External link to external-spam.com was filtered out
  });

  it("detects JavaScript hydration requirement from noscript warnings", () => {
    const html = "<html><body><noscript>You need to enable JavaScript to run this app.</noscript></body></html>";
    const check = detectBrowserRequirement(html);
    expect(check.required).toBe(true);
    expect(check.reason).toBe("JS_HYDRATION_REQUIRED");
  });

  it("detects SPA container requirement from unhydrated empty root mounts", () => {
    const html = '<html><body><div id="root"></div><script src="/bundle.js"></script></body></html>';
    const check = detectBrowserRequirement(html);
    expect(check.required).toBe(true);
    expect(check.reason).toBe("SPA_NAVIGATION_REQUIRED");
  });

  it("returns EMPTY_NO_JOBS when page has no jobs and no browser requirement", async () => {
    const candidate: ExperimentalCandidate = {
      id: "exp:test-empty",
      companyName: "Empty Agency",
      careerUrl: "https://example.com/careers",
      domain: "example.com",
      sourceNiche: "global-va",
      discoveryProvenance: "test",
    };

    const mockFetch = (async () => {
      return new Response("<html><body><h1>About Us</h1><p>No current openings.</p></body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }) as unknown as typeof fetch;

    const result = await executeCrawl4Ai(candidate, { fetchImpl: mockFetch });
    expect(result.success).toBe(false);
    expect(result.failureClass).toBe("EMPTY_NO_JOBS");
  });

  it("classifies Crawl4AI result for Kitesurf escalation when SPA container detected", async () => {
    const candidate: ExperimentalCandidate = {
      id: "exp:test-spa",
      companyName: "SPA Agency",
      careerUrl: "https://example.com/careers",
      domain: "example.com",
      sourceNiche: "global-va",
      discoveryProvenance: "test",
    };

    const mockFetch = (async () => {
      return new Response('<html><body><div id="app"></div></body></html>', {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }) as unknown as typeof fetch;

    const result = await executeCrawl4Ai(candidate, { fetchImpl: mockFetch });
    expect(result.success).toBe(false);
    expect(result.failureClass).toBe("SPA_NAVIGATION_REQUIRED");
    expect(qualifiesForKitesurfEscalation(result)).toBe(true);
  });
});

describe("Cloudflare Kitesurf Escalation Capability", () => {
  it("refuses to escalate if Crawl4AI already succeeded", () => {
    const successResult: ExtractionResult = {
      capability: "crawl4ai",
      success: true,
      runtimeMs: 120,
      pagesVisited: 1,
      bytesReceived: 1024,
      items: [{ title: "Virtual Assistant", url: "https://example.com/jobs/1" }],
    };

    expect(qualifiesForKitesurfEscalation(successResult)).toBe(false);
  });

  it("refuses to escalate for policy-blocked or network errors", () => {
    const blockedResult: ExtractionResult = {
      capability: "crawl4ai",
      success: false,
      runtimeMs: 50,
      pagesVisited: 1,
      bytesReceived: 0,
      items: [],
      failureClass: "POLICY_BLOCKED",
    };

    expect(qualifiesForKitesurfEscalation(blockedResult)).toBe(false);
  });

  it("extracts hydrated job cards when rendered via custom renderer", async () => {
    const candidate: ExperimentalCandidate = {
      id: "exp:test-kitesurf",
      companyName: "Hydrated Agency",
      careerUrl: "https://example.com/careers",
      domain: "example.com",
      sourceNiche: "global-va",
      discoveryProvenance: "test",
    };

    const crawl4aiResult: ExtractionResult = {
      capability: "crawl4ai",
      success: false,
      runtimeMs: 200,
      pagesVisited: 1,
      bytesReceived: 500,
      items: [],
      failureClass: "JS_HYDRATION_REQUIRED",
    };

    const mockRenderer = async () => ({
      html: `
        <html>
          <body>
            <div id="app">
              <a href="/jobs/senior-technical-writer">Senior Technical Writer</a>
              <a href="/jobs/ai-annotation-specialist">AI Annotation Specialist</a>
            </div>
          </body>
        </html>
      `,
    });

    const result = await executeKitesurf(candidate, crawl4aiResult, { customRenderer: mockRenderer });
    expect(result.capability).toBe("kitesurf");
    expect(result.success).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.items[0].title).toBe("Senior Technical Writer");
    expect(result.items[1].title).toBe("AI Annotation Specialist");
  });
});

describe("Experimental Orchestrator & Success Equation", () => {
  it("enforces Mandatory Priority Gate: halts if candidate has known ATS endpoint", async () => {
    const candidateWithGreenhouse: ExperimentalCandidate = {
      id: "exp:known-ats",
      companyName: "Greenhouse User",
      careerUrl: "https://boards.greenhouse.io/testcompany",
      domain: "greenhouse.io",
      sourceNiche: "tech",
      discoveryProvenance: "test",
    };

    const result = await runExperimentalSourcePipeline(candidateWithGreenhouse);
    expect(result.extraction.success).toBe(false);
    expect(result.metrics.failureClass).toBe("POLICY_BLOCKED");
    expect(result.extraction.stopReason).toContain("Known ATS mechanism (greenhouse) exists");
    expect(result.metrics.netNewQualifiedYield).toBe(0);
  });

  it("accurately evaluates role families according to mission mandate", () => {
    expect(evaluateRoleRelevance("Executive Virtual Assistant").roleFamily).toBe("virtual_assistant_operations");
    expect(evaluateRoleRelevance("Customer Support Representative").roleFamily).toBe("customer_support");
    expect(evaluateRoleRelevance("AI Prompt Engineer & Evaluator").roleFamily).toBe("ai_builder_ops");
    expect(evaluateRoleRelevance("Senior Technical Writer").roleFamily).toBe("writing_documentation");
    expect(evaluateRoleRelevance("Social Media Manager").roleFamily).toBe("adjacent_professional");
    expect(evaluateRoleRelevance("Dentist").isRelevant).toBe(false);
    expect(evaluateRoleRelevance("Heavy Equipment Operator").isRelevant).toBe(false);
  });

  it("filters through deduplication, geo-gate, and role-gate to calculate net-new yield", async () => {
    const candidate: ExperimentalCandidate = {
      id: "exp:ph-agency",
      companyName: "Manila Operations Hub",
      careerUrl: "https://example.com/careers",
      domain: "example.com",
      sourceNiche: "global-va",
      discoveryProvenance: "test",
    };

    // JSON-LD, not HTML links: the freshness gate can only pass a listing whose
    // source stated a date, and HTML-link extraction never carries one. Under the
    // pre-fix fail-open gate this fixture qualified job-1 on a fabricated "now",
    // which is exactly the claim under test.
    const freshDate = new Date(Date.now() - 864e5).toISOString();
    const posting = (
      title: string,
      path: string,
      country: string,
      datePosted?: string,
    ) => ({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title,
      url: `https://example.com${path}`,
      hiringOrganization: { "@type": "Organization", name: "Manila Operations Hub" },
      jobLocationType: "TELECOMMUTE",
      jobLocation: { "@type": "Place", addressCountry: country },
      ...(datePosted ? { datePosted } : {}),
    });

    const mockFetch = (async () => {
      return new Response(
        `<html><head><script type="application/ld+json">${JSON.stringify([
          posting("Virtual Assistant - Philippines Remote", "/jobs/job-1", "Philippines", freshDate),
          posting("Customer Service Specialist - US Only", "/jobs/job-2", "United States", freshDate),
          posting("Forklift Operator", "/jobs/job-3", "Philippines", freshDate),
          posting("Already Known Job", "/jobs/job-4", "Philippines"),
        ])}</script></head><body></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } },
      );
    }) as unknown as typeof fetch;

    const knownUrls = new Set(["https://example.com/jobs/job-4"]);

    const pipelineResult = await runExperimentalSourcePipeline(candidate, {
      crawl4aiOptions: { fetchImpl: mockFetch },
      knownUrls,
    });

    expect(pipelineResult.metrics.candidateJobs).toBe(4);
    expect(pipelineResult.metrics.validJobs).toBe(4);
    expect(pipelineResult.metrics.alreadyKnownJobs).toBe(1); // job-4
    expect(pipelineResult.metrics.incrementalUniqueJobs).toBe(3); // job-1, job-2, job-3

    // job-1 is PH remote, VA role -> Qualified
    // job-2 is US Only -> Geo Ineligible
    // job-3 is Forklift Operator -> Role Irrelevant
    expect(pipelineResult.metrics.netNewQualifiedYield).toBe(1);

    const job1 = pipelineResult.jobs.find((j) => j.normalized.title.includes("Virtual Assistant"));
    expect(job1?.isNetNewQualified).toBe(true);

    const job2 = pipelineResult.jobs.find((j) => j.normalized.title.includes("US Only"));
    expect(job2?.isPhEligible).toBe(false);
    expect(job2?.isNetNewQualified).toBe(false);

    const job3 = pipelineResult.jobs.find((j) => j.normalized.title.includes("Forklift"));
    expect(job3?.isRoleRelevant).toBe(false);
    expect(job3?.isNetNewQualified).toBe(false);
  });

  it("strictly preserves the publication invariant: is_active = 0", async () => {
    const candidate: ExperimentalCandidate = {
      id: "exp:safe-agency",
      companyName: "Safe Agency",
      careerUrl: "https://example.com/careers",
      domain: "example.com",
      sourceNiche: "global-va",
      discoveryProvenance: "test",
    };

    const mockFetch = (async () => {
      return new Response('<a href="/jobs/va">Virtual Assistant</a>', {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }) as unknown as typeof fetch;

    const pipelineResult = await runExperimentalSourcePipeline(candidate, {
      crawl4aiOptions: { fetchImpl: mockFetch },
    });

    for (const job of pipelineResult.jobs) {
      expect(job.normalized.is_active).toBe(0);
      expect(job.normalized.tags).toContain("experimental");
    }
  });

  it("summarizes batch metrics and computes accurate escalation rates", () => {
    const summary = summarizeBatchResults([
      {
        sourceId: "s1",
        domain: "d1.com",
        companyName: "C1",
        attempt: 1,
        capability: "crawl4ai",
        pagesVisited: 1,
        runtimeMs: 100,
        bytesReceived: 500,
        candidateJobs: 5,
        validJobs: 5,
        invalidJobs: 0,
        alreadyKnownJobs: 1,
        incrementalUniqueJobs: 4,
        remoteJobs: 4,
        phEligibleJobs: 3,
        roleRelevantJobs: 3,
        freshJobs: 3,
        netNewQualifiedYield: 3,
        escalatedToKitesurf: false,
      },
      {
        sourceId: "s2",
        domain: "d2.com",
        companyName: "C2",
        attempt: 1,
        capability: "kitesurf",
        pagesVisited: 1,
        runtimeMs: 800,
        bytesReceived: 1200,
        candidateJobs: 2,
        validJobs: 2,
        invalidJobs: 0,
        alreadyKnownJobs: 0,
        incrementalUniqueJobs: 2,
        remoteJobs: 2,
        phEligibleJobs: 2,
        roleRelevantJobs: 1,
        freshJobs: 1,
        netNewQualifiedYield: 1,
        escalatedToKitesurf: true,
      },
    ]);

    expect(summary.cohortSize).toBe(2);
    expect(summary.crawl4aiAttempts).toBe(1);
    expect(summary.kitesurfAttempts).toBe(1);
    expect(summary.browserEscalationCount).toBe(1);
    expect(summary.browserEscalationRate).toBe(0.5);
    expect(summary.totalCandidateJobs).toBe(7);
    expect(summary.totalNetNewQualifiedYield).toBe(4);
    expect(summary.sourcesWithYield).toBe(2);
    expect(summary.averageNetNewPerSource).toBe(2);
  });
});

// CONSTITUTION §1.3 #2 forbids fabricating a source posting timestamp, and
// ACCEPTED_PARAMETERS sets unknown_date_policy: retain-unknown-do-not-publish.
// "Absent evidence" must stay absent through normalization AND must not be
// reported as a passing freshness gate.
describe("Undated listings are never given a fabricated posting date", () => {
  const undatedCandidate: ExperimentalCandidate = {
    id: "exp:undated",
    companyName: "Undated Co",
    careerUrl: "https://example.com/careers",
    domain: "example.com",
    sourceNiche: "global-va",
    discoveryProvenance: "test",
  };

  function pipelineWithLinks(links: string) {
    const fetchImpl = (async () => new Response(`<html><body>${links}</body></html>`, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })) as unknown as typeof fetch;
    return runExperimentalSourcePipeline(undatedCandidate, { crawl4aiOptions: { fetchImpl } });
  }

  it("does not report an absent, empty or unparseable date as fresh", () => {
    expect(isOpportunityFresh(undefined)).toBe(false);
    expect(isOpportunityFresh("")).toBe(false);
    expect(isOpportunityFresh("   ")).toBe(false);
    expect(isOpportunityFresh("not-a-date")).toBe(false);
    expect(isOpportunityFresh("null")).toBe(false);
  });

  it("still accepts a real recent date and still rejects a real stale one", () => {
    const now = Date.now();
    expect(isOpportunityFresh(new Date(now - 864e5).toISOString())).toBe(true);
    expect(isOpportunityFresh(new Date(now - 90 * 864e5).toISOString())).toBe(false);
  });

  it("does not launder an unparseable source date into a stored timestamp", async () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Virtual Assistant",
      url: "https://example.com/jobs/va-garbage-date",
      hiringOrganization: { "@type": "Organization", name: "Undated Co" },
      jobLocationType: "TELECOMMUTE",
      jobLocation: { "@type": "Place", addressCountry: "Philippines" },
      datePosted: "sometime last spring",
    })}</script></head><body></body></html>`;
    const fetchImpl = (async () => new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })) as unknown as typeof fetch;
    const result = await runExperimentalSourcePipeline(undatedCandidate, {
      crawl4aiOptions: { fetchImpl },
    });
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].normalized.publishedAt).toBeNull();
    expect(result.jobs[0].isFresh).toBe(false);
    expect(result.jobs[0].rejectionReason).toBe("DATE_UNKNOWN");
  });

  it("does not fabricate a date on the schema-invalid branch either", async () => {
    // A non-http(s) URL fails the schema guard, which builds a normalized
    // record through a different code path than the qualified branch.
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Virtual Assistant",
      url: "javascript:alert(1)",
      hiringOrganization: { "@type": "Organization", name: "Undated Co" },
    })}</script></head><body></body></html>`;
    const fetchImpl = (async () => new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })) as unknown as typeof fetch;
    const result = await runExperimentalSourcePipeline(undatedCandidate, {
      crawl4aiOptions: { fetchImpl },
    });
    expect(result.metrics.invalidJobs).toBe(1);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].isValid).toBe(false);
    expect(result.jobs[0].normalized.publishedAt).toBeNull();
    expect(result.jobs[0].normalized.is_active).toBe(0);
  });

  it("withholds a whitespace-padded timestamp rather than repairing it into a usable date", async () => {
    // Date.parse rejects surrounding whitespace, so this value is not a date the
    // source stated. Trimming it here would be this code authoring a date.
    const padded = ` ${new Date(Date.now() - 864e5).toISOString()} `;
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Virtual Assistant",
      url: "https://example.com/jobs/va-padded",
      hiringOrganization: { "@type": "Organization", name: "Undated Co" },
      jobLocationType: "TELECOMMUTE",
      jobLocation: { "@type": "Place", addressCountry: "Philippines" },
      datePosted: padded,
    })}</script></head><body></body></html>`;
    const fetchImpl = (async () => new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })) as unknown as typeof fetch;
    const result = await runExperimentalSourcePipeline(undatedCandidate, {
      crawl4aiOptions: { fetchImpl },
    });
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].normalized.publishedAt).toBeNull();
    expect(result.jobs[0].isFresh).toBe(false);
    expect(result.jobs[0].rejectionReason).toBe("DATE_UNKNOWN");
  });

  it("keeps the posting date unknown instead of substituting the fetch time", async () => {
    const result = await pipelineWithLinks(
      '<a href="/jobs/va-1">Virtual Assistant - Philippines Remote</a>',
    );
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].normalized.publishedAt).toBeNull();
  });

  it("excludes an undated listing from fresh jobs and from net-new qualified yield", async () => {
    const result = await pipelineWithLinks(
      '<a href="/jobs/va-1">Virtual Assistant - Philippines Remote</a>' +
      '<a href="/jobs/cs-1">Customer Service Specialist - Remote</a>',
    );
    expect(result.metrics.candidateJobs).toBe(2);
    expect(result.metrics.freshJobs).toBe(0);
    expect(result.metrics.netNewQualifiedYield).toBe(0);
    for (const job of result.jobs) {
      expect(job.isFresh).toBe(false);
      expect(job.isNetNewQualified).toBe(false);
      expect(job.rejectionReason).not.toBe("STALE");
    }
  });

  it("withholds an otherwise qualified undated listing as DATE_UNKNOWN, not as STALE", async () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: "Virtual Assistant",
        url: "https://example.com/jobs/va-undated",
        hiringOrganization: { "@type": "Organization", name: "Undated Co" },
        jobLocationType: "TELECOMMUTE",
        applicantLocationRequirements: { "@type": "Country", name: "Philippines" },
        jobLocation: { "@type": "Place", addressCountry: "Philippines" },
      },
    ])}</script></head><body></body></html>`;
    const fetchImpl = (async () => new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })) as unknown as typeof fetch;
    const result = await runExperimentalSourcePipeline(undatedCandidate, {
      crawl4aiOptions: { fetchImpl },
    });
    expect(result.jobs).toHaveLength(1);
    const job = result.jobs[0];
    expect(job.isRemote).toBe(true);
    expect(job.isPhEligible).toBe(true);
    expect(job.isRoleRelevant).toBe(true);
    expect(job.isFresh).toBe(false);
    expect(job.rejectionReason).toBe("DATE_UNKNOWN");
    expect(job.normalized.publishedAt).toBeNull();
  });

  it("labels a genuinely stale dated listing STALE, so the two causes stay distinguishable", async () => {
    const stale = new Date(Date.now() - 90 * 864e5).toISOString();
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Virtual Assistant",
      url: "https://example.com/jobs/va-stale",
      hiringOrganization: { "@type": "Organization", name: "Undated Co" },
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: { "@type": "Country", name: "Philippines" },
      jobLocation: { "@type": "Place", addressCountry: "Philippines" },
      datePosted: stale,
    })}</script></head><body></body></html>`;
    const fetchImpl = (async () => new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })) as unknown as typeof fetch;
    const result = await runExperimentalSourcePipeline(undatedCandidate, {
      crawl4aiOptions: { fetchImpl },
    });
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].isFresh).toBe(false);
    expect(result.jobs[0].rejectionReason).toBe("STALE");
    expect(result.jobs[0].normalized.publishedAt).toBe(stale);
  });

  it("still credits a genuinely dated listing, so the yield signal survives the narrowing", async () => {
    const dated = new Date(Date.now() - 2 * 864e5).toISOString();
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Virtual Assistant - Philippines Remote",
      url: "https://example.com/jobs/va-1",
      hiringOrganization: { "@type": "Organization", name: "Undated Co" },
      jobLocationType: "TELECOMMUTE",
      datePosted: dated,
    })}</script></head><body></body></html>`;
    const fetchImpl = (async () => new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })) as unknown as typeof fetch;
    const result = await runExperimentalSourcePipeline(undatedCandidate, {
      crawl4aiOptions: { fetchImpl },
    });
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].normalized.publishedAt).toBe(dated);
    expect(result.jobs[0].isFresh).toBe(true);
    expect(result.metrics.freshJobs).toBe(1);
    expect(result.metrics.netNewQualifiedYield).toBe(1);
  });
});
