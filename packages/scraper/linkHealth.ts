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

// "dead_dns" retained only for backward-compat with rows written before
// 2026-07-21; the checker no longer produces it. Network failures now classify
// as "unreachable" (surfaced for human review, NOT an auto-strike) because the
// Workers runtime cannot reliably distinguish a genuine NXDOMAIN from a
// transient TLS/timeout/Cloudflare-egress failure.
export type LinkStatus = "ok" | "bot_wall" | "dead_http" | "unreachable" | "dead_dns" | "parked" | "no_url";

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
const BOT_WALL_STATUSES = new Set([401, 403, 405, 406, 409, 418, 429]);

// ONLY these HTTP codes are treated as a genuinely-gone page (a strike). A page
// that returns 404/410/451 is definitively removed. Everything else that isn't
// a clean 2xx/3xx — 5xx origin errors, Cloudflare edge codes (520-527, 530),
// rate-limit/anti-bot 4xx — is transient-or-protected and must NOT count a
// strike. Root cause of the 2026-07-21 false positives: real agencies behind
// Cloudflare returned 525/526/530 (SSL/origin hiccups) and were wrongly flagged
// dead_http. See docs/directory-health-latest.md and the audit.
const DEFINITELY_GONE_STATUSES = new Set([404, 410, 451]);

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
  if (DEFINITELY_GONE_STATUSES.has(status)) {
    return { status: "dead_http", evidence: `HTTP ${status}`, isHardDead: true };
  }
  if (BOT_WALL_STATUSES.has(status)) {
    return { status: "bot_wall", evidence: `HTTP ${status} (bot wall — site alive)`, isHardDead: false };
  }
  // Cloudflare edge errors (520-527, 530) and generic 5xx: origin is reachable
  // through a CDN but had a transient SSL/origin problem. Alive, not a strike.
  if (status >= 500) {
    return { status: "bot_wall", evidence: `HTTP ${status} (edge/origin transient — not counted dead)`, isHardDead: false };
  }
  // Any other non-2xx (odd 4xx like 400/406-variants): ambiguous, don't strike.
  return { status: "bot_wall", evidence: `HTTP ${status} (ambiguous — not counted dead)`, isHardDead: false };
}

export function normalizeCheckUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Fetch + classify one company website. Network failures (DNS, TLS, timeout,
 * Cloudflare-egress block) classify as "unreachable" with isHardDead=false —
 * NOT a strike. The Workers runtime cannot tell a genuinely-dead NXDOMAIN from
 * a transient failure or a site that simply blocks Cloudflare's egress IPs, so
 * these are surfaced for human review instead of auto-hidden.
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
    return { status: "unreachable", evidence: `Unreachable: ${String(message).slice(0, 80)} (not counted dead — needs human review)`, isHardDead: false };
  }
}
