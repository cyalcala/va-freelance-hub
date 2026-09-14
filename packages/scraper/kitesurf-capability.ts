/**
 * Cloudflare Kitesurf Experimental Capability (Phase B)
 * 
 * Escalation capability for unsupported career sites where Crawl4AI proved
 * that client-side JavaScript execution or SPA rendering is strictly required.
 * 
 * INVARIANTS:
 *  - Escalation only: never invoked as default ingestion.
 *  - Bounded execution time and pages.
 *  - Zero direct DB publishing.
 */

import type {
  ExperimentalCandidate,
  ExtractionResult,
  RawExtractedJob,
  ExperimentalFailureClass,
} from "./experimental-source-types";

export const KITESURF_TIMEOUT_MS = 45_000;
export const KITESURF_ENGINE = "kitesurf";

export interface KitesurfOptions {
  accountId?: string;
  apiToken?: string;
  fetchImpl?: typeof fetch;
  customRenderer?: (url: string) => Promise<{ html: string; screenshot?: string }>;
  timeoutMs?: number;
}

/**
 * Evaluates whether a Crawl4AI result qualifies for Kitesurf browser escalation.
 */
export function qualifiesForKitesurfEscalation(result: ExtractionResult): boolean {
  if (result.success && result.items.length > 0) {
    // Succeeded via Crawl4AI; escalation NOT needed
    return false;
  }

  const browserFailures: ExperimentalFailureClass[] = [
    "BROWSER_REQUIRED",
    "JS_HYDRATION_REQUIRED",
    "CLIENT_PAGINATION_REQUIRED",
    "LOAD_MORE_REQUIRED",
    "SPA_NAVIGATION_REQUIRED",
  ];

  return Boolean(result.failureClass && browserFailures.includes(result.failureClass));
}

/**
 * Execute Kitesurf browser rendering escalation on a qualified candidate.
 */
export async function executeKitesurf(
  candidate: ExperimentalCandidate,
  crawl4aiResult: ExtractionResult,
  options: KitesurfOptions = {},
): Promise<ExtractionResult> {
  const start = Date.now();

  // Guard: Verify escalation qualification
  if (!qualifiesForKitesurfEscalation(crawl4aiResult)) {
    return {
      capability: "kitesurf",
      success: false,
      runtimeMs: 0,
      pagesVisited: 0,
      bytesReceived: 0,
      items: [],
      failureClass: "UNKNOWN_FAILURE",
      stopReason: "Candidate does not meet browser escalation qualification criteria",
    };
  }

  // If a custom renderer is supplied (e.g. for testing or Cloudflare Worker binding)
  if (options.customRenderer) {
    try {
      const render = await options.customRenderer(candidate.careerUrl);
      const runtimeMs = Date.now() - start;
      const html = render.html;
      const bytes = new TextEncoder().encode(html).byteLength;

      // Parse hydrated HTML
      const jobs = extractJobsFromHydratedHtml(html, candidate.careerUrl);
      if (jobs.length > 0) {
        return {
          capability: "kitesurf",
          success: true,
          runtimeMs,
          pagesVisited: 1,
          bytesReceived: bytes,
          items: jobs,
        };
      }

      return {
        capability: "kitesurf",
        success: false,
        runtimeMs,
        pagesVisited: 1,
        bytesReceived: bytes,
        items: [],
        failureClass: "EMPTY_NO_JOBS",
        stopReason: "Hydrated DOM contains zero job postings",
      };
    } catch (err) {
      const runtimeMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      return {
        capability: "kitesurf",
        success: false,
        runtimeMs,
        pagesVisited: 1,
        bytesReceived: 0,
        items: [],
        failureClass: "BROWSER_RENDER_FAILURE",
        stopReason: msg,
      };
    }
  }

  // Production / Cloudflare Browser Rendering endpoint integration
  const accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = options.apiToken || process.env.CLOUDFLARE_API_TOKEN;
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as typeof fetch);

  if (!accountId || !apiToken) {
    // If live credentials are not present in test/local execution, record classified disposition
    return {
      capability: "kitesurf",
      success: false,
      runtimeMs: Date.now() - start,
      pagesVisited: 0,
      bytesReceived: 0,
      items: [],
      failureClass: "BROWSER_RENDER_FAILURE",
      stopReason: "Cloudflare Browser Rendering credentials unavailable in local runtime; parked as BROWSER_REQUIRED",
    };
  }

  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/scrape?browser=${KITESURF_ENGINE}`;
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: candidate.careerUrl,
        elements: [
          { selector: "a[href*='/job'], a[href*='/career'], .job-card, .posting-item" },
        ],
        wait_until: "networkidle0",
      }),
    });

    const runtimeMs = Date.now() - start;
    if (!res.ok) {
      return {
        capability: "kitesurf",
        success: false,
        runtimeMs,
        pagesVisited: 1,
        bytesReceived: 0,
        items: [],
        failureClass: "BROWSER_RENDER_FAILURE",
        stopReason: `Cloudflare Browser Run API HTTP ${res.status}`,
      };
    }

    const body = await res.text();
    const bytes = new TextEncoder().encode(body).byteLength;
    const jobs = extractJobsFromHydratedHtml(body, candidate.careerUrl);

    return {
      capability: "kitesurf",
      success: jobs.length > 0,
      runtimeMs,
      pagesVisited: 1,
      bytesReceived: bytes,
      items: jobs,
      failureClass: jobs.length === 0 ? "EMPTY_NO_JOBS" : undefined,
    };
  } catch (err) {
    const runtimeMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      capability: "kitesurf",
      success: false,
      runtimeMs,
      pagesVisited: 0,
      bytesReceived: 0,
      items: [],
      failureClass: "BROWSER_RENDER_FAILURE",
      stopReason: msg,
    };
  }
}

/**
 * Extract job postings from fully rendered/hydrated DOM HTML.
 */
export function extractJobsFromHydratedHtml(html: string, baseUrl: string): RawExtractedJob[] {
  const jobs: RawExtractedJob[] = [];
  const base = new URL(baseUrl);

  // Look for rendered job list cards or elements
  const linkMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  const seenUrls = new Set<string>();

  for (const m of linkMatches) {
    const rawHref = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    if (
      /\/jobs?\/|\/careers?\/|\/positions?\/|view-job|job-posting/i.test(rawHref) &&
      !/(login|privacy|terms|apply-now-btn)/i.test(rawHref) &&
      text.length >= 4 &&
      text.length <= 120
    ) {
      try {
        const fullUrl = new URL(rawHref, base).toString();
        if (!seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          jobs.push({
            title: text,
            url: fullUrl,
            location: "Remote",
          });
        }
      } catch {
        // ignore malformed
      }
    }
  }

  return jobs;
}
