/**
 * Robots gate — the runtime layer that turns robots.txt from a documented
 * claim into an enforced one.
 *
 * Separated from `robots.ts` (the parser) so the parser stays pure and the
 * orchestration — caching, TTL, fetch failure handling, enforcement policy —
 * is testable without D1 or a network.
 *
 * ## Enforcement is staged, deliberately
 *
 * The masterplan's target state is a hard gate: no source fetch may occur
 * without a robots decision on record. Shipping that directly against a live
 * $0 pipeline would be reckless — a parser bug, an unexpected robots.txt shape,
 * or a transient 5xx across several origins could silently halt ingestion, and
 * the first evidence would be a quiet drop in job counts.
 *
 * So the gate ships in `observe` mode: every decision is computed, recorded and
 * reported, but a would-block does not stop the fetch. After a cycle of live
 * evidence shows which sources would actually be blocked and why, the mode
 * flips to `enforce`. This mirrors how link health and the directory audit were
 * rolled out here — measure, then act — and satisfies the reversibility
 * invariant in AGENTS.md.
 *
 * `enforce` is fully implemented and tested; only the default differs.
 */

import {
  ROBOTS_USER_AGENT_TOKEN,
  allowsAiInput,
  evaluatePath,
  parseRobotsTxt,
  robotsDecisionForStatus,
  robotsUrlFor,
  selectGroup,
  type ContentSignals,
  type RobotsVerdict,
} from "./robots";

/** How long a cached robots.txt stays authoritative. */
export const ROBOTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Upper bound on a stored robots.txt body. Real ones are a few KB. */
export const ROBOTS_BODY_MAX_BYTES = 64 * 1024;

const DEFAULT_FETCH_IMPL = ((input: RequestInfo | URL, init?: RequestInit) =>
  globalThis.fetch(input, init)) as typeof fetch;

export type RobotsMode = "observe" | "enforce";

export interface RobotsCacheEntry {
  origin: string;
  fetchedAt: string;
  status: number;
  body: string | null;
  crawlDelay: number | null;
  contentSignals: ContentSignals | null;
  error: string | null;
}

export interface RobotsCacheStore {
  get(origin: string): Promise<RobotsCacheEntry | null>;
  put(entry: RobotsCacheEntry): Promise<void>;
}

export interface RobotsGateResult {
  verdict: RobotsVerdict;
  /** True when the caller may proceed with the fetch. */
  allowed: boolean;
  /** Human-auditable basis, stored with fetch evidence. */
  evidence: string;
  /** Declared crawl-delay in seconds, when the source published one. */
  crawlDelay: number | null;
  /** False only when the source explicitly set `ai-input=no`. */
  aiInputAllowed: boolean;
  /** True when this decision came from cache rather than a fresh fetch. */
  fromCache: boolean;
  /** True when the verdict would have blocked the fetch in enforce mode. */
  wouldBlock: boolean;
  mode: RobotsMode;
}

export interface RobotsGateDeps {
  store: RobotsCacheStore;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  mode?: RobotsMode;
  userAgentToken?: string;
  /** Header sent when fetching robots.txt itself. */
  userAgent?: string;
  timeoutMs?: number;
}

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isFresh(entry: RobotsCacheEntry, now: Date): boolean {
  const fetchedAt = Date.parse(entry.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return false;
  return now.getTime() - fetchedAt < ROBOTS_CACHE_TTL_MS;
}

/**
 * Derives the decision for a URL from a cache entry.
 *
 * Split out so the same logic serves both the cached and freshly-fetched paths,
 * and so a stored entry can be re-evaluated during an audit without refetching.
 */
export function decideFromEntry(
  entry: RobotsCacheEntry,
  url: string,
  userAgentToken: string = ROBOTS_USER_AGENT_TOKEN,
): { verdict: RobotsVerdict; evidence: string; crawlDelay: number | null; aiInputAllowed: boolean } {
  // A failed fetch is not a grant of consent. It is also not a refusal, so it
  // is reported as unknown and left for the mode to act on.
  if (entry.error) {
    return {
      verdict: "unknown",
      evidence: `robots.txt fetch failed: ${entry.error}`,
      crawlDelay: null,
      aiInputAllowed: true,
    };
  }

  const statusVerdict = robotsDecisionForStatus(entry.status);
  if (statusVerdict === "unknown") {
    return {
      verdict: "unknown",
      evidence: `robots.txt unreachable (HTTP ${entry.status}); operator intent unknown`,
      crawlDelay: null,
      aiInputAllowed: true,
    };
  }

  // 4xx other than the carve-outs: nothing is published, so nothing restricts.
  if (!entry.body) {
    return {
      verdict: "allowed",
      evidence: `No robots.txt published (HTTP ${entry.status}); no restrictions`,
      crawlDelay: null,
      aiInputAllowed: true,
    };
  }

  const parsed = parseRobotsTxt(entry.body);
  let path: string;
  try {
    const parsedUrl = new URL(url);
    path = `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return {
      verdict: "unknown",
      evidence: `Unparseable URL: ${url}`,
      crawlDelay: null,
      aiInputAllowed: true,
    };
  }

  const decision = evaluatePath(selectGroup(parsed, userAgentToken), path);
  return {
    verdict: decision.verdict,
    evidence: decision.evidence,
    crawlDelay: decision.crawlDelay,
    aiInputAllowed: allowsAiInput(parsed.contentSignals),
  };
}

async function fetchRobots(
  origin: string,
  deps: Required<Pick<RobotsGateDeps, "fetchImpl" | "userAgent" | "timeoutMs">>,
  now: Date,
): Promise<RobotsCacheEntry> {
  const url = `${origin}/robots.txt`;
  const base: RobotsCacheEntry = {
    origin,
    fetchedAt: now.toISOString(),
    status: 0,
    body: null,
    crawlDelay: null,
    contentSignals: null,
    error: null,
  };

  try {
    const res = await deps.fetchImpl(url, {
      headers: { "User-Agent": deps.userAgent },
      redirect: "follow",
      signal: AbortSignal.timeout(deps.timeoutMs),
    });

    base.status = res.status;

    if (res.ok) {
      const text = (await res.text()).slice(0, ROBOTS_BODY_MAX_BYTES);
      const parsed = parseRobotsTxt(text);
      base.body = text;
      base.contentSignals = parsed.contentSignals;
      base.crawlDelay = selectGroup(parsed, ROBOTS_USER_AGENT_TOKEN)?.crawlDelay ?? null;
    }
    return base;
  } catch (error) {
    base.error = error instanceof Error ? error.message : String(error);
    return base;
  }
}

/**
 * Decides whether a URL may be fetched, consulting (and populating) the cache.
 *
 * Never throws: a gate that can crash a scrape is worse than the compliance gap
 * it closes. Any internal failure degrades to an `unknown` verdict, which in
 * observe mode proceeds and in enforce mode declines.
 */
export async function checkRobots(url: string, deps: RobotsGateDeps): Promise<RobotsGateResult> {
  const mode: RobotsMode = deps.mode ?? "observe";
  const now = deps.now?.() ?? new Date();
  const userAgentToken = deps.userAgentToken ?? ROBOTS_USER_AGENT_TOKEN;

  const result = (
    partial: Omit<RobotsGateResult, "allowed" | "wouldBlock" | "mode">,
  ): RobotsGateResult => {
    // Only an explicit "allowed" clears the gate. "unknown" is withheld
    // consent, not implied consent.
    const wouldBlock = partial.verdict !== "allowed";
    return {
      ...partial,
      wouldBlock,
      mode,
      allowed: mode === "enforce" ? !wouldBlock : true,
    };
  };

  const origin = originOf(url);
  if (!origin) {
    return result({
      verdict: "unknown",
      evidence: `Unparseable URL: ${url}`,
      crawlDelay: null,
      aiInputAllowed: true,
      fromCache: false,
    });
  }

  try {
    const cached = await deps.store.get(origin);
    if (cached && isFresh(cached, now)) {
      const decision = decideFromEntry(cached, url, userAgentToken);
      return result({ ...decision, fromCache: true });
    }

    const entry = await fetchRobots(
      origin,
      {
        fetchImpl: deps.fetchImpl ?? DEFAULT_FETCH_IMPL,
        userAgent: deps.userAgent ?? `Mozilla/5.0 (compatible; RemotePHJobsBot/1.0)`,
        timeoutMs: deps.timeoutMs ?? 10_000,
      },
      now,
    );

    // A cache write failure must not fail the decision — worst case we refetch
    // robots.txt next tick, which is impolite but not incorrect.
    try {
      await deps.store.put(entry);
    } catch {
      // Intentionally swallowed; the decision below still stands.
    }

    const decision = decideFromEntry(entry, url, userAgentToken);
    return result({ ...decision, fromCache: false });
  } catch (error) {
    return result({
      verdict: "unknown",
      evidence: `Robots gate error: ${error instanceof Error ? error.message : String(error)}`,
      crawlDelay: null,
      aiInputAllowed: true,
      fromCache: false,
    });
  }
}
