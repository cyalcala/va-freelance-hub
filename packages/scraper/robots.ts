/**
 * Runtime robots.txt engine (RFC 9309 subset) + Content Signals.
 *
 * Why this exists: before this module, every `robots` reference in the codebase
 * was a human-written `complianceNotes` string in `sources.ts` — for example
 * "Current review 2026-06-09: robots allows the feed path". Compliance was a
 * snapshot taken when a source was added, not a live contract. A source could
 * revoke access and we would keep fetching indefinitely, because nothing in the
 * runtime ever read robots.txt.
 *
 * Scope is deliberately the subset we actually need, not a full Google-parity
 * parser. Specifically excluded, with reasons:
 *   - Google's 500 KiB truncation rule and its "disalow" typo tolerance: we are
 *     not bug-compatible with Google, and silently accepting a misspelled
 *     directive is the wrong default for a compliance path.
 *   - Sitemap-driven crawl scheduling: that is the acquisition ladder's job
 *     (masterplan 4C). This module only *collects* `Sitemap:` lines.
 *
 * Design rules that follow from being a compliance path:
 *   - Parsing never throws. A malformed robots.txt yields a parsed result whose
 *     unparseable lines are ignored, exactly as RFC 9309 requires.
 *   - The *caller* decides the fail-closed policy for fetch failures, because
 *     "robots.txt returned 500" and "robots.txt says no" are different facts
 *     and deserve different handling. `robotsDecisionForStatus` encodes the
 *     RFC's status-code semantics so callers do not each invent their own.
 */

/** Product token this crawler answers to in robots.txt group selection. */
export const ROBOTS_USER_AGENT_TOKEN = "remotephjobsbot";

/** Directives we understand. Everything else is ignored, per RFC 9309 §2.2.4. */
type RuleType = "allow" | "disallow";

export interface RobotsRule {
  type: RuleType;
  /** Raw path pattern as written, may contain `*` and `$`. */
  pattern: string;
  /**
   * Match specificity, used for precedence. RFC 9309 §2.2.2: the most specific
   * (longest) matching rule wins; `allow` wins ties.
   */
  length: number;
}

export interface RobotsGroup {
  /** Lower-cased user-agent tokens this group applies to. */
  agents: string[];
  rules: RobotsRule[];
  /** Seconds. Non-standard but widely deployed; we honor it. */
  crawlDelay: number | null;
}

/**
 * Cloudflare's Content Signals policy, published as a comment convention inside
 * robots.txt. Declares what a fetcher may do with content it is allowed to
 * read, which robots.txt itself does not express.
 *
 * `yes` / `no` map to true / false; an absent signal is `null`, which means the
 * operator did not state a preference — not that they said no.
 */
export interface ContentSignals {
  /** Building a search index that links back. This project's lane. */
  search: boolean | null;
  /** Feeding content into a model at inference time (e.g. RAG). */
  aiInput: boolean | null;
  /** Training a model on the content. This project never does this. */
  aiTrain: boolean | null;
  /** Free-form `use` value when present (e.g. "reference"). */
  use: string | null;
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
  contentSignals: ContentSignals;
}

export type RobotsVerdict = "allowed" | "disallowed" | "unknown";

export interface RobotsDecision {
  verdict: RobotsVerdict;
  /** Human-auditable basis for the verdict, stored alongside fetch evidence. */
  evidence: string;
  /** Effective crawl-delay in seconds for the matched group, if declared. */
  crawlDelay: number | null;
}

const EMPTY_SIGNALS: ContentSignals = {
  search: null,
  aiInput: null,
  aiTrain: null,
  use: null,
};

function stripComment(line: string): string {
  const hash = line.indexOf("#");
  return hash === -1 ? line : line.slice(0, hash);
}

function splitDirective(line: string): { field: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const field = line.slice(0, colon).trim().toLowerCase();
  const value = line.slice(colon + 1).trim();
  if (!field) return null;
  return { field, value };
}

function parseSignalValue(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

/**
 * Parses a Content-Signal declaration.
 *
 * Real-world example (remoteok.com, probed 2026-07-21):
 *   Content-Signal: search=yes,ai-train=no,use=reference
 *
 * Cloudflare publishes this as a `#` comment on some sites and as a real
 * directive on others, so both forms are accepted by the caller before this
 * function sees the value.
 */
function parseContentSignal(value: string, into: ContentSignals): void {
  for (const part of value.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const raw = part.slice(eq + 1);

    if (key === "search") into.search = parseSignalValue(raw);
    else if (key === "ai-input") into.aiInput = parseSignalValue(raw);
    else if (key === "ai-train") into.aiTrain = parseSignalValue(raw);
    else if (key === "use") into.use = raw.trim() || null;
  }
}

/**
 * Parses a robots.txt document.
 *
 * Never throws. Unrecognized or malformed lines are skipped, which is the
 * behavior RFC 9309 §2.2.4 requires of a conforming parser.
 */
export function parseRobotsTxt(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const contentSignals: ContentSignals = { ...EMPTY_SIGNALS };

  let current: RobotsGroup | null = null;
  // Consecutive `User-agent` lines share one group (RFC 9309 §2.2.1). This
  // tracks whether the previous meaningful line was also a user-agent line.
  let lastLineWasAgent = false;

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    // Content-Signal is conventionally published as a comment, so it must be
    // read before comments are stripped.
    const commentBody = rawLine.trim().startsWith("#")
      ? rawLine.trim().slice(1).trim()
      : null;
    if (commentBody) {
      const directive = splitDirective(commentBody);
      if (directive && directive.field === "content-signal") {
        parseContentSignal(directive.value, contentSignals);
      }
      continue;
    }

    const line = stripComment(rawLine).trim();
    if (!line) continue;

    const directive = splitDirective(line);
    if (!directive) continue;
    const { field, value } = directive;

    if (field === "user-agent") {
      const agent = value.toLowerCase();
      if (!agent) continue;
      if (current && lastLineWasAgent) {
        // Merge into the group being built rather than starting a new one.
        current.agents.push(agent);
      } else {
        current = { agents: [agent], rules: [], crawlDelay: null };
        groups.push(current);
      }
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;

    if (field === "sitemap") {
      // Sitemap is group-independent (RFC 9309 §2.2.3).
      if (value) sitemaps.push(value);
      continue;
    }

    if (field === "content-signal") {
      parseContentSignal(value, contentSignals);
      continue;
    }

    // Rules outside any group are meaningless; RFC 9309 says to ignore them.
    if (!current) continue;

    if (field === "allow" || field === "disallow") {
      // `Disallow:` with an empty value means "allow everything" and carries no
      // match length, so it must not outrank a real rule.
      if (field === "disallow" && value === "") continue;
      if (!value.startsWith("/")) continue;
      current.rules.push({ type: field, pattern: value, length: value.length });
      continue;
    }

    if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) {
        current.crawlDelay = seconds;
      }
      continue;
    }
  }

  return { groups, sitemaps, contentSignals };
}

/**
 * Selects the group that applies to a user-agent.
 *
 * RFC 9309 §2.2.1: the most specific matching product token wins, and `*` is
 * the fallback only when no token matches. Matching is case-insensitive and
 * uses substring containment, because crawlers are conventionally identified by
 * a product token embedded in a longer UA string.
 */
export function selectGroup(parsed: ParsedRobots, userAgentToken: string): RobotsGroup | null {
  const token = userAgentToken.toLowerCase();
  let best: RobotsGroup | null = null;
  let bestLength = -1;
  let wildcard: RobotsGroup | null = null;

  for (const group of parsed.groups) {
    for (const agent of group.agents) {
      if (agent === "*") {
        // First wildcard group wins; later ones are typically operator error.
        if (!wildcard) wildcard = group;
        continue;
      }
      if (token.includes(agent) && agent.length > bestLength) {
        best = group;
        bestLength = agent.length;
      }
    }
  }

  return best ?? wildcard;
}

/**
 * Tests a robots path pattern against a URL path.
 *
 * Supports the two wildcards RFC 9309 standardizes: `*` (any sequence) and `$`
 * (end anchor). Built by escaping every regex metacharacter and then
 * reintroducing those two, so a pattern containing regex syntax cannot alter
 * the match semantics or cause catastrophic backtracking.
 */
export function matchesPattern(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;

  let regex = "";
  for (const char of body) {
    if (char === "*") {
      regex += "[^]*";
    } else {
      regex += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  try {
    return new RegExp(`^${regex}${anchored ? "$" : ""}`).test(path);
  } catch {
    // A pattern that cannot compile is treated as non-matching rather than
    // throwing: robots parsing must never break a fetch path.
    return false;
  }
}

/**
 * Applies a group's rules to a path.
 *
 * RFC 9309 §2.2.2 precedence: the longest matching pattern wins; when an
 * `allow` and a `disallow` match with equal length, `allow` wins. A path with
 * no matching rule is allowed — robots.txt is a denylist.
 */
export function evaluatePath(group: RobotsGroup | null, path: string): RobotsDecision {
  if (!group) {
    return {
      verdict: "allowed",
      evidence: "No applicable robots group; default allow",
      crawlDelay: null,
    };
  }

  let winner: RobotsRule | null = null;
  for (const rule of group.rules) {
    if (!matchesPattern(rule.pattern, path)) continue;
    if (
      !winner ||
      rule.length > winner.length ||
      // Equal length: allow beats disallow.
      (rule.length === winner.length && rule.type === "allow")
    ) {
      winner = rule;
    }
  }

  if (!winner) {
    return {
      verdict: "allowed",
      evidence: `No matching rule for ${path}; default allow`,
      crawlDelay: group.crawlDelay,
    };
  }

  return {
    verdict: winner.type === "allow" ? "allowed" : "disallowed",
    evidence: `${winner.type === "allow" ? "Allow" : "Disallow"}: ${winner.pattern} matched ${path}`,
    crawlDelay: group.crawlDelay,
  };
}

/**
 * Full decision for one URL against one robots.txt document.
 */
export function isPathAllowed(
  robotsText: string,
  url: string,
  userAgentToken: string = ROBOTS_USER_AGENT_TOKEN,
): RobotsDecision {
  const parsed = parseRobotsTxt(robotsText);
  let path: string;
  try {
    const parsedUrl = new URL(url);
    // Query strings participate in matching (RFC 9309 §2.2.2).
    path = `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return {
      verdict: "unknown",
      evidence: `Unparseable URL: ${url}`,
      crawlDelay: null,
    };
  }

  return evaluatePath(selectGroup(parsed, userAgentToken), path);
}

/**
 * Maps a robots.txt *fetch* outcome to a crawl decision, per RFC 9309 §2.3.1.
 *
 *   2xx — parse and apply the document.
 *   404 / 410 — the operator publishes no robots.txt, so no restrictions exist.
 *         This is an allow, not a deny (§2.3.1.2 "Unavailable Status").
 *   429 / 5xx — robots.txt is unreachable (§2.3.1.3 "Unreachable Status"). The
 *         RFC requires assuming complete disallow. 429 sits here rather than
 *         with the other 4xx because it is the operator asking us to slow down;
 *         reading that as "no restrictions published" inverts its meaning.
 *
 * Deliberate deviation from the RFC's letter: 401 and 403 are classified
 * "unknown" rather than "allowed". §2.3.1.2 groups them with 404, on the
 * reasoning that an unreadable robots.txt implies no rules. For a project whose
 * stated posture is to pause when access is refused (AGENTS.md), "you are not
 * permitted to read our rules" is much closer to a refusal than to an absence,
 * and the cost of being wrong is asymmetric: over-pausing loses a source,
 * under-pausing means crawling somewhere we were told not to.
 *
 * "unknown" rather than "disallowed" is returned for all of these so the caller
 * can record "could not ask" separately from "was told no" in its evidence
 * trail, while still declining to fetch.
 */
export function robotsDecisionForStatus(status: number): RobotsVerdict {
  if (status >= 200 && status < 300) return "allowed";
  if (status === 401 || status === 403 || status === 429) return "unknown";
  if (status >= 400 && status < 500) return "allowed";
  return "unknown";
}

/**
 * Whether AI classification may run on content from this source.
 *
 * The triage ladder sends listing text to Workers AI at inference time, which
 * is `ai-input`. We never train on collected content, so `ai-train` does not
 * gate anything here — but it is parsed and recorded, because a source that
 * forbids training deserves to have that honored visibly rather than silently.
 *
 * An unstated signal permits AI input: robots-style declarations are opt-out,
 * and treating silence as refusal would disable triage for nearly every source.
 */
export function allowsAiInput(signals: ContentSignals): boolean {
  return signals.aiInput !== false;
}

/** Conventional robots.txt location for a URL's origin. */
export function robotsUrlFor(url: string): string | null {
  try {
    return new URL("/robots.txt", url).toString();
  } catch {
    return null;
  }
}
