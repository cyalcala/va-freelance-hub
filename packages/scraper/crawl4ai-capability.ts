/**
 * Crawl4AI Experimental Capability (Phase A)
 * 
 * Implements bounded extraction for unsupported custom career pages.
 * Prioritizes deterministic extraction over browser execution.
 * 
 * Bounds:
 *  - Max pages: 10
 *  - Max crawl depth: 2
 *  - Max execution time: 30,000 ms
 *  - Same-domain only
 *  - No direct DB publishing
 */

import { checkRobots, type RobotsCacheStore } from "./robotsGate";
import { hostOf, exactOrSubdomain } from "./prospector";
import type {
  ExperimentalCandidate,
  ExtractionResult,
  RawExtractedJob,
  ExperimentalFailureClass,
} from "./experimental-source-types";

export const CRAWL4AI_MAX_PAGES = 10;
export const CRAWL4AI_MAX_DEPTH = 2;
export const CRAWL4AI_TIMEOUT_MS = 30_000;
export const CRAWL4AI_USER_AGENT =
  "Mozilla/5.0 (compatible; RemotePHJobsBot-Crawl4AI/1.0; +https://github.com/cyalcala/va-freelance-hub)";

export interface Crawl4AiOptions {
  fetchImpl?: typeof fetch;
  robotsStore?: RobotsCacheStore;
  customExtractor?: (html: string, baseUrl: string) => Promise<RawExtractedJob[]>;
  timeoutMs?: number;
}

/**
 * Heuristic detector for client-side JavaScript hydration or SPA requirements.
 */
export function detectBrowserRequirement(html: string): {
  required: boolean;
  reason?: ExperimentalFailureClass;
  evidence?: string;
} {
  const lower = html.toLowerCase();

  // Explicit JS-disabled messages
  if (
    lower.includes("you need to enable javascript to run this app") ||
    lower.includes("javascript is required") ||
    lower.includes("please enable javascript to view this page") ||
    lower.includes("enable javascript and refresh")
  ) {
    return {
      required: true,
      reason: "JS_HYDRATION_REQUIRED",
      evidence: "HTML contains explicit JavaScript-required noscript directive",
    };
  }

  // Common SPA mount roots with empty contents
  const emptySpaMounts = [
    /<div[^>]+id=["'](app|root|__next|main-content|careers-mount)["'][^>]*>\s*<\/div>/i,
    /<div[^>]+id=["'](job-list|careers-list|openings)["'][^>]*>\s*<\/div>/i,
  ];

  for (const pattern of emptySpaMounts) {
    if (pattern.test(html)) {
      return {
        required: true,
        reason: "SPA_NAVIGATION_REQUIRED",
        evidence: `HTML contains unhydrated empty SPA container matching ${pattern}`,
      };
    }
  }

  // Client-side pagination or load-more tokens in raw templates without job cards
  if (
    (lower.includes("load-more-jobs") || lower.includes("btn-load-more")) &&
    !lower.includes("job-title") &&
    !lower.includes("posting-title")
  ) {
    return {
      required: true,
      reason: "LOAD_MORE_REQUIRED",
      evidence: "Detected client-side load-more trigger without pre-rendered postings",
    };
  }

  return { required: false };
}

/**
 * Deterministic DOM/regex parser for standard job markup in static HTML.
 */
export function extractJobsFromHtml(html: string, baseUrl: string): RawExtractedJob[] {
  const jobs: RawExtractedJob[] = [];
  const base = new URL(baseUrl);

  // 1. JSON-LD JobPosting schema extraction
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const item of items) {
        if (item["@type"] === "JobPosting" && item.title) {
          const jobUrl = item.url ? new URL(item.url, base).toString() : baseUrl;
          jobs.push({
            title: String(item.title).trim(),
            url: jobUrl,
            company: item.hiringOrganization?.name ? String(item.hiringOrganization.name).trim() : undefined,
            location: item.jobLocation?.addressLocality || item.jobLocation?.addressCountry || "Remote",
            descriptionSnippet: item.description ? String(item.description).slice(0, 300).trim() : undefined,
            publishedAt: item.datePosted ? String(item.datePosted) : undefined,
            employmentType: item.employmentType ? String(item.employmentType) : undefined,
            isRemoteHint: item.applicantLocationRequirements !== undefined || item.jobLocationType === "TELECOMMUTE",
          });
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }

  if (jobs.length > 0) return jobs;

  // 2. Structured HTML link extraction for career postings
  // Matches common patterns: <a href=".../job/..." ...>Job Title</a>
  const linkMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  const seenUrls = new Set<string>();

  for (const m of linkMatches) {
    const rawHref = m[1].trim();
    const anchorText = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    // Check if link matches a job route pattern
    const isJobLink =
      /\/jobs?\/|\/careers?\/|\/positions?\/|\/openings?\/|view-job|job-detail/i.test(rawHref) &&
      !/(login|signin|privacy|terms|cookie|about|contact|category|tag|department|#)/i.test(rawHref);

    if (isJobLink && anchorText.length >= 4 && anchorText.length <= 120) {
      try {
        const resolvedUrl = new URL(rawHref, base).toString();
        const resolvedHost = hostOf(resolvedUrl);
        const baseHost = hostOf(baseUrl);

        // Enforce same-domain or trusted subdomain traversal
        if (resolvedHost && baseHost && (exactOrSubdomain(resolvedHost, baseHost) || exactOrSubdomain(baseHost, resolvedHost))) {
          if (!seenUrls.has(resolvedUrl)) {
            seenUrls.add(resolvedUrl);
            jobs.push({
              title: anchorText,
              url: resolvedUrl,
              location: "Remote",
            });
          }
        }
      } catch {
        // Skip malformed URLs
      }
    }
  }

  return jobs;
}

/**
 * Execute Crawl4AI extraction on an experimental candidate.
 */
export async function executeCrawl4Ai(
  candidate: ExperimentalCandidate,
  options: Crawl4AiOptions = {},
): Promise<ExtractionResult> {
  const start = Date.now();
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as typeof fetch);
  const timeoutMs = options.timeoutMs ?? CRAWL4AI_TIMEOUT_MS;

  // Step 1: Robots gate check
  if (options.robotsStore) {
    try {
      const robots = await checkRobots(candidate.careerUrl, {
        store: options.robotsStore,
        userAgent: CRAWL4AI_USER_AGENT,
        mode: "observe",
        timeoutMs: 8000,
        fetchImpl,
      });
      if (robots.wouldBlock) {
        return {
          capability: "crawl4ai",
          success: false,
          runtimeMs: Date.now() - start,
          pagesVisited: 1,
          bytesReceived: 0,
          items: [],
          failureClass: "POLICY_BLOCKED",
          stopReason: `Robots.txt wouldBlock: ${robots.verdict}`,
        };
      }
    } catch {
      // Non-blocking in observe mode
    }
  }

  // Step 2: Fetch target career page with timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(candidate.careerUrl, {
      headers: {
        "User-Agent": CRAWL4AI_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    const runtimeMs = Date.now() - start;
    if (!res.ok) {
      const failureClass: ExperimentalFailureClass =
        res.status === 429
          ? "RATE_LIMITED"
          : res.status === 401 || res.status === 403
            ? "POLICY_BLOCKED"
            : "NETWORK_FAILURE";

      return {
        capability: "crawl4ai",
        success: false,
        runtimeMs,
        pagesVisited: 1,
        bytesReceived: 0,
        items: [],
        failureClass,
        stopReason: `HTTP ${res.status}`,
      };
    }

    const html = await res.text();
    const bytesReceived = new TextEncoder().encode(html).byteLength;

    // Step 3: Check for browser execution requirement
    const browserCheck = detectBrowserRequirement(html);

    // Step 4: Extract jobs via custom extractor or deterministic HTML parser
    const extractedJobs = options.customExtractor
      ? await options.customExtractor(html, candidate.careerUrl)
      : extractJobsFromHtml(html, candidate.careerUrl);

    // If no jobs extracted and browser requirement was detected, classify for escalation
    if (extractedJobs.length === 0 && browserCheck.required) {
      return {
        capability: "crawl4ai",
        success: false,
        runtimeMs,
        pagesVisited: 1,
        bytesReceived,
        items: [],
        failureClass: browserCheck.reason ?? "BROWSER_REQUIRED",
        browserRequiredEvidence: browserCheck.evidence,
        stopReason: `Browser required: ${browserCheck.evidence}`,
      };
    }

    if (extractedJobs.length === 0) {
      return {
        capability: "crawl4ai",
        success: false,
        runtimeMs,
        pagesVisited: 1,
        bytesReceived,
        items: [],
        failureClass: "EMPTY_NO_JOBS",
        stopReason: "Zero job postings extracted from static HTML",
      };
    }

    return {
      capability: "crawl4ai",
      success: true,
      runtimeMs,
      pagesVisited: 1,
      bytesReceived,
      items: extractedJobs,
    };
  } catch (err) {
    const runtimeMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    const failureClass: ExperimentalFailureClass = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout")
      ? "CRAWL_EXHAUSTED"
      : "NETWORK_FAILURE";

    return {
      capability: "crawl4ai",
      success: false,
      runtimeMs,
      pagesVisited: 0,
      bytesReceived: 0,
      items: [],
      failureClass,
      stopReason: msg,
    };
  } finally {
    clearTimeout(timer);
  }
}
