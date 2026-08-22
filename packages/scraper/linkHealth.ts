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

import { linkCheckHeaders } from "./userAgent";

// "dead_dns" retained only for backward-compat with rows written before
// 2026-07-21; the checker no longer produces it. Network failures now classify
// as "unreachable" (surfaced for human review, NOT an auto-strike) because the
// Workers runtime cannot reliably distinguish a genuine NXDOMAIN from a
// transient TLS/timeout/Cloudflare-egress failure.
export type LinkStatus = "ok" | "bot_wall" | "dead_http" | "unreachable" | "dead_dns" | "parked" | "no_url";

// Diagnostic subcategories for the "unreachable" verdict. The Workers runtime
// cannot reliably distinguish a genuine NXDOMAIN from a transient TLS/timeout/
// Cloudflare-egress failure, so we surface the actual fetch error shape so the
// audit route can compare distributions across runtimes without changing the
// strike/visibility semantics. OPS-04 evidence contract: small stable taxonomy,
// no PII/secret in the short codes, no body logging.
export type UnreachableReason =
  | "TIMEOUT"
  | "DNS_FAILURE"
  | "TLS_FAILURE"
  | "CONNECT_FAILURE"
  | "EGRESS_BLOCKED"
  | "REQUEST_ERROR"
  | "UNKNOWN_NETWORK";

export const UNREACHABLE_REASONS: readonly UnreachableReason[] = [
  "TIMEOUT",
  "DNS_FAILURE",
  "TLS_FAILURE",
  "CONNECT_FAILURE",
  "EGRESS_BLOCKED",
  "REQUEST_ERROR",
  "UNKNOWN_NETWORK",
] as const;

export interface LinkVerdict {
  status: LinkStatus;
  /** One-line, human-readable basis for the verdict. */
  evidence: string;
  /** True for verdicts that should count a strike toward flagging. */
  isHardDead: boolean;
  /**
   * OPS-04 diagnostic: short, stable cause code from the underlying fetch
   * error (e.g. "ENOTFOUND", "ECONNREFUSED", "AbortError"). Always present
   * when status === "unreachable" so audit aggregations can reason about the
   * failure distribution without re-parsing the evidence string. Capped to
   * 40 chars to keep response payloads bounded.
   */
  unreachableCode?: string;
  /**
   * OPS-04 diagnostic: coarse reason category matching the short code. Always
   * present when status === "unreachable". Never changes isHardDead or strike
   * accounting — strikes are preserved by `buildDirectoryHealthUpdate`.
   */
  unreachableReason?: UnreachableReason;
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
 * OPS-04 diagnostic classifier. Maps a thrown fetch error to a bounded,
 * non-sensitive cause code and coarse reason category. Runtime-agnostic on
 * purpose: Node/undici (local runs, GitHub Actions) surfaces a concrete
 * `cause.code` (ENOTFOUND, ECONNREFUSED, CERT_HAS_EXPIRED, ...), while the
 * Cloudflare Workers runtime collapses most transport faults into a generic
 * `TypeError` whose name/message carries the only signal ("Network connection
 * lost.", "Too many subrequests.", a timeout). Comparing the two distributions
 * over the SAME hosts across runtimes is exactly how OPS-04 localizes an
 * egress fault versus a genuinely-dead origin.
 *
 * The returned `code` is capped at 40 chars and derived only from the error's
 * short code/name — never its message body, URL, or stack — so it cannot leak a
 * host, credential, or secret into the aggregated evidence. This function never
 * changes `status`/`isHardDead`; unreachable stays no-strike.
 */
export function classifyUnreachableError(err: unknown): { code: string; reason: UnreachableReason } {
  const e = err as (Error & { cause?: { code?: unknown } | null; code?: unknown }) | undefined;
  const causeCode = typeof e?.cause?.code === "string" ? e.cause.code : "";
  const topCode = typeof e?.code === "string" ? (e.code as string) : "";
  const name = typeof e?.name === "string" ? e.name : "";
  const message = typeof e?.message === "string" ? e.message : "";

  // Short, stable code for aggregation: prefer the concrete Node error code,
  // then a top-level code, then the error name. NEVER the message body.
  const code = (causeCode || topCode || name || "network failure").slice(0, 40);

  // Category decision reads code + name (uppercased) first; the message is
  // consulted last, only for the Workers runtime's generic code-less errors.
  const codeName = `${causeCode} ${topCode} ${name}`.toUpperCase();
  const msg = message.toLowerCase();

  // TIMEOUT — AbortSignal.timeout() raises TimeoutError/AbortError; Node/undici
  // raise ETIMEDOUT / ESOCKETTIMEDOUT / UND_ERR_*_TIMEOUT.
  if (
    /ABORT|TIMEOUT|ETIMEDOUT|ESOCKETTIMEDOUT|UND_ERR_(CONNECT_TIMEOUT|HEADERS_TIMEOUT|BODY_TIMEOUT)/.test(codeName)
    || msg.includes("timed out") || msg.includes("timeout")
  ) {
    return { code, reason: "TIMEOUT" };
  }

  // DNS_FAILURE — name resolution failed.
  if (/ENOTFOUND|EAI_AGAIN|EAI_FAIL|EAI_NONAME/.test(codeName) || msg.includes("could not resolve") || msg.includes(" dns ")) {
    return { code, reason: "DNS_FAILURE" };
  }

  // TLS_FAILURE — certificate / handshake problems.
  if (
    /CERT|SSL|TLS|EPROTO|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS/.test(codeName)
    || msg.includes("certificate") || msg.includes(" ssl") || msg.includes("handshake")
  ) {
    return { code, reason: "TLS_FAILURE" };
  }

  // CONNECT_FAILURE — TCP connect refused/reset/unreachable.
  if (
    /ECONNREFUSED|ECONNRESET|ECONNABORTED|EHOSTUNREACH|ENETUNREACH|EHOSTDOWN|EPIPE|UND_ERR_SOCKET/.test(codeName)
    || msg.includes("connection refused") || msg.includes("connection reset") || msg.includes("connection closed")
  ) {
    return { code, reason: "CONNECT_FAILURE" };
  }

  // EGRESS_BLOCKED — Cloudflare-platform egress faults: the generic "Network
  // connection lost." TypeError, subrequest-budget exhaustion, or an explicitly
  // blocked egress path. On Workers these opaque transport errors most often
  // masquerade as a dead origin, so they get their own coarse bucket that the
  // cross-runtime comparison can then split into real vs platform failure.
  if (
    msg.includes("too many subrequests")
    || msg.includes("network connection lost")
    || msg.includes("egress")
    || msg.includes("blocked")
    || msg.includes("proxy")
  ) {
    return { code, reason: "EGRESS_BLOCKED" };
  }

  // REQUEST_ERROR — a fetch-layer error we could parse but not localize to a
  // transport class (e.g. "fetch failed" / "failed to fetch" with no cause).
  if (name === "TypeError" || msg.includes("fetch failed") || msg.includes("failed to fetch")) {
    return { code, reason: "REQUEST_ERROR" };
  }

  return { code, reason: "UNKNOWN_NETWORK" };
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
      headers: linkCheckHeaders({ Accept: "text/html,application/xhtml+xml,*/*" }),
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
    const { code, reason } = classifyUnreachableError(err);
    return {
      status: "unreachable",
      evidence: `Unreachable: ${code} [${reason}] (not counted dead — needs human review)`,
      isHardDead: false,
      unreachableCode: code,
      unreachableReason: reason,
    };
  }
}
