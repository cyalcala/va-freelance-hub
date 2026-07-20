// Directory link-health checker (automated directory pulse, 2026-07).
//
// Ported from the 2026-07 manual audit scripts, whose two-pass sweep of all
// 391 directory companies established the ground truth this module encodes:
// - 403/429/418/503 responses are BOT WALLS, not dead sites — Canva, Fiverr,
//   Indeed, TTEC and 25 other real companies answer bots that way. A naive
//   status check would wrongly flag a third of the directory.
// - Parked/for-sale pages return HTTP 200; only body inspection catches them.
// - DNS failures are the strongest death signal but still get retried across
//   runs (the 3-strike system) before any flagging.

export type LinkStatus = "ok" | "bot_wall" | "dead_http" | "dead_dns" | "parked" | "no_url";

export interface LinkVerdict {
  status: LinkStatus;
  /** One-line, human-readable basis for the verdict. */
  evidence: string;
  /** True for verdicts that should count a strike toward flagging. */
  isHardDead: boolean;
}

// Phrases that mark a parked / for-sale domain (case-insensitive, checked
// against the first few KB of the body). Kept specific — "for sale" alone
// would flag e-commerce sites.
const PARKED_MARKERS = [
  "this domain is for sale",
  "buy this domain",
  "domain is for sale",
  "domain may be for sale",
  "this website is for sale",
  "domain parking",
  "parked free",
  "sedoparking",
  "hugedomains",
  "afternic",
  "godaddy.com/domainsearch",
  "interested in this domain",
];

const DEAD_PAGE_MARKERS = [
  "account suspended",
  "site not found",
  "this site can not be reached",
];

// Statuses that mean "the server is alive but refuses bots".
const BOT_WALL_STATUSES = new Set([401, 403, 405, 406, 409, 418, 429, 503]);

/** Pure classifier — separated from fetching so it is unit-testable. */
export function classifyLinkResponse(status: number, bodySnippet: string): LinkVerdict {
  const body = (bodySnippet || "").slice(0, 6000).toLowerCase();

  // Parked detection only applies to a 2xx page — a 404 body mentioning a
  // parking service must still classify by its dead status, not as parked.
  if (status >= 200 && status < 300) {
    for (const marker of [...PARKED_MARKERS, ...DEAD_PAGE_MARKERS]) {
      if (body.includes(marker)) {
        return { status: "parked", evidence: `Body contains "${marker}" (HTTP ${status})`, isHardDead: true };
      }
    }
  }

  if (status >= 200 && status < 400) {
    return { status: "ok", evidence: `HTTP ${status}`, isHardDead: false };
  }
  if (BOT_WALL_STATUSES.has(status)) {
    return { status: "bot_wall", evidence: `HTTP ${status} (bot wall — site alive)`, isHardDead: false };
  }
  return { status: "dead_http", evidence: `HTTP ${status}`, isHardDead: true };
}

export function normalizeCheckUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Fetch + classify one company website. Network failures (DNS, TLS, timeout)
 * classify as dead_dns — the strike system absorbs transient blips, and the
 * manual audit showed persistent DNS failure is the most reliable dead signal.
 */
export async function checkDirectoryLink(rawUrl: string | null | undefined, timeoutMs = 8_000): Promise<LinkVerdict> {
  const url = normalizeCheckUrl(rawUrl);
  if (!url) return { status: "no_url", evidence: "No website on file", isHardDead: false };

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    let snippet = "";
    try {
      snippet = (await res.text()).slice(0, 6000);
    } catch {
      // Unreadable body — classify on status alone.
    }
    return classifyLinkResponse(res.status, snippet);
  } catch (err) {
    const message = (err as Error & { cause?: { code?: string } }).cause?.code
      ?? (err as Error).name
      ?? "network failure";
    return { status: "dead_dns", evidence: `Network failure: ${String(message).slice(0, 80)}`, isHardDead: true };
  }
}
