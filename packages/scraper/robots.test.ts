import { describe, expect, test } from "bun:test";
import {
  ROBOTS_USER_AGENT_TOKEN,
  allowsAiInput,
  evaluatePath,
  isPathAllowed,
  matchesPattern,
  parseRobotsTxt,
  robotsDecisionForStatus,
  robotsUrlFor,
  selectGroup,
} from "./robots";

// ─── RFC 9309 worked examples ────────────────────────────────────────────────
// These are the examples in the specification itself, used as fixtures so the
// parser is checked against the standard rather than against our own reading.

describe("RFC 9309 §2.2.2 — longest match wins", () => {
  const robots = `
User-agent: *
Disallow: /
Allow: /public/
`;

  test("a broad disallow blocks an unlisted path", () => {
    expect(isPathAllowed(robots, "https://example.com/private").verdict).toBe("disallowed");
  });

  test("a longer allow overrides a shorter disallow", () => {
    expect(isPathAllowed(robots, "https://example.com/public/jobs").verdict).toBe("allowed");
  });
});

describe("RFC 9309 §2.2.2 — allow wins an equal-length tie", () => {
  const robots = `
User-agent: *
Allow: /jobs
Disallow: /jobs
`;

  test("equal-specificity conflict resolves to allow", () => {
    expect(isPathAllowed(robots, "https://example.com/jobs").verdict).toBe("allowed");
  });
});

describe("RFC 9309 §2.2.1 — group selection", () => {
  const robots = `
User-agent: *
Disallow: /

User-agent: RemotePHJobsBot
Allow: /

User-agent: BadBot
Disallow: /
`;

  test("a named group beats the wildcard group", () => {
    expect(isPathAllowed(robots, "https://example.com/anything").verdict).toBe("allowed");
  });

  test("an unrelated crawler falls back to the wildcard group", () => {
    const parsed = parseRobotsTxt(robots);
    const group = selectGroup(parsed, "someothercrawler");
    expect(evaluatePath(group, "/anything").verdict).toBe("disallowed");
  });

  test("the most specific matching token wins", () => {
    const specific = `
User-agent: bot
Disallow: /

User-agent: remotephjobsbot
Allow: /
`;
    expect(isPathAllowed(specific, "https://example.com/x").verdict).toBe("allowed");
  });

  test("consecutive user-agent lines share one group", () => {
    const shared = `
User-agent: alpha
User-agent: beta
Disallow: /blocked
`;
    const parsed = parseRobotsTxt(shared);
    expect(parsed.groups).toHaveLength(1);
    expect(parsed.groups[0].agents).toEqual(["alpha", "beta"]);
    expect(evaluatePath(selectGroup(parsed, "beta"), "/blocked").verdict).toBe("disallowed");
  });
});

describe("RFC 9309 §2.2.2 — wildcards", () => {
  test("* matches any sequence", () => {
    expect(matchesPattern("/*.json", "/feeds/jobs.json")).toBe(true);
    expect(matchesPattern("/*.json", "/feeds/jobs.xml")).toBe(false);
  });

  test("$ anchors the end of the path", () => {
    expect(matchesPattern("/jobs$", "/jobs")).toBe(true);
    expect(matchesPattern("/jobs$", "/jobs/123")).toBe(false);
  });

  test("a bare prefix matches everything beneath it", () => {
    expect(matchesPattern("/api", "/api/v1/jobs")).toBe(true);
  });

  test("regex metacharacters in a pattern are matched literally", () => {
    // A naive implementation would treat these as regex and match the wrong
    // paths, silently widening or narrowing what the operator disallowed.
    expect(matchesPattern("/a+b", "/a+b")).toBe(true);
    expect(matchesPattern("/a+b", "/aaab")).toBe(false);
    expect(matchesPattern("/x(y)", "/x(y)")).toBe(true);
  });

  test("query strings participate in matching", () => {
    const robots = `
User-agent: *
Disallow: /search?*
`;
    expect(isPathAllowed(robots, "https://example.com/search?q=va").verdict).toBe("disallowed");
    expect(isPathAllowed(robots, "https://example.com/search").verdict).toBe("allowed");
  });
});

describe("RFC 9309 — default allow", () => {
  test("an empty document allows everything", () => {
    expect(isPathAllowed("", "https://example.com/jobs").verdict).toBe("allowed");
  });

  test("a document with no matching rule allows the path", () => {
    const robots = `
User-agent: *
Disallow: /admin
`;
    expect(isPathAllowed(robots, "https://example.com/jobs").verdict).toBe("allowed");
  });

  test("an empty Disallow means allow-all and never outranks a real rule", () => {
    const robots = `
User-agent: *
Disallow:
Allow: /jobs
`;
    expect(isPathAllowed(robots, "https://example.com/anything").verdict).toBe("allowed");
    expect(isPathAllowed(robots, "https://example.com/jobs").verdict).toBe("allowed");
  });
});

// ─── Live source fixtures ────────────────────────────────────────────────────
// Captured from our own enabled sources so the parser is exercised against the
// documents it will actually meet in production.

describe("live fixture — RemoteOK (probed 2026-07-21)", () => {
  // Fixture #1 per the masterplan: the source that already publishes
  // machine-readable terms explicitly sanctioning our use.
  const robots = `
# Content-Signal: search=yes,ai-train=no,use=reference
User-agent: *
Allow: /
Crawl-delay: 1

User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

Sitemap: https://remoteok.com/sitemap.xml
`;

  test("our crawler is allowed", () => {
    expect(isPathAllowed(robots, "https://remoteok.com/api").verdict).toBe("allowed");
  });

  test("the declared crawl-delay is surfaced", () => {
    expect(isPathAllowed(robots, "https://remoteok.com/api").crawlDelay).toBe(1);
  });

  test("content signals are parsed from the comment form", () => {
    const { contentSignals } = parseRobotsTxt(robots);
    expect(contentSignals.search).toBe(true);
    expect(contentSignals.aiTrain).toBe(false);
    expect(contentSignals.use).toBe("reference");
  });

  test("search=yes is the lane this project occupies", () => {
    // Index, short excerpt, link back — explicitly sanctioned.
    expect(parseRobotsTxt(robots).contentSignals.search).toBe(true);
  });

  test("AI triage is permitted because ai-input is unstated", () => {
    // ai-train=no is honored by never training; it does not gate inference.
    expect(allowsAiInput(parseRobotsTxt(robots).contentSignals)).toBe(true);
  });

  test("named AI crawlers are blocked without affecting our group", () => {
    const parsed = parseRobotsTxt(robots);
    expect(evaluatePath(selectGroup(parsed, "gptbot"), "/").verdict).toBe("disallowed");
    expect(evaluatePath(selectGroup(parsed, ROBOTS_USER_AGENT_TOKEN), "/").verdict).toBe("allowed");
  });

  test("the sitemap is collected", () => {
    expect(parseRobotsTxt(robots).sitemaps).toContain("https://remoteok.com/sitemap.xml");
  });
});

describe("live fixture — Jobspresso crawl-delay", () => {
  const robots = `
User-agent: *
Crawl-delay: 3
Disallow: /wp-admin/
`;

  test("a 3-second crawl-delay is honored", () => {
    const decision = isPathAllowed(robots, "https://jobspresso.co/feed/");
    expect(decision.verdict).toBe("allowed");
    expect(decision.crawlDelay).toBe(3);
  });

  test("the admin path stays disallowed", () => {
    expect(isPathAllowed(robots, "https://jobspresso.co/wp-admin/x").verdict).toBe("disallowed");
  });
});

describe("content signals", () => {
  test("ai-input=no withholds AI triage for that source", () => {
    const robots = "# Content-Signal: search=yes,ai-input=no";
    expect(allowsAiInput(parseRobotsTxt(robots).contentSignals)).toBe(false);
  });

  test("an unstated signal is null, not false", () => {
    // Silence is not refusal; treating it as refusal would disable triage
    // for nearly every source.
    const { contentSignals } = parseRobotsTxt("User-agent: *\nAllow: /");
    expect(contentSignals.search).toBeNull();
    expect(contentSignals.aiInput).toBeNull();
    expect(allowsAiInput(contentSignals)).toBe(true);
  });

  test("the directive form is parsed as well as the comment form", () => {
    const robots = "Content-Signal: search=no,ai-train=no";
    expect(parseRobotsTxt(robots).contentSignals.search).toBe(false);
  });

  test("an unrecognized signal value is null rather than a guess", () => {
    expect(parseRobotsTxt("# Content-Signal: search=maybe").contentSignals.search).toBeNull();
  });
});

describe("malformed input never throws", () => {
  const cases: Array<[string, string]> = [
    ["a bare word", "garbage"],
    ["a directive with no value", "Disallow:"],
    ["a rule outside any group", "Disallow: /orphan"],
    ["an unterminated pattern", "User-agent: *\nDisallow: /["],
    ["only comments", "# nothing here"],
    ["a colon with no field", ": value"],
    ["a non-numeric crawl-delay", "User-agent: *\nCrawl-delay: soon"],
    ["CRLF line endings", "User-agent: *\r\nDisallow: /x\r\n"],
  ];

  for (const [label, input] of cases) {
    test(label, () => {
      expect(() => parseRobotsTxt(input)).not.toThrow();
      expect(() => isPathAllowed(input, "https://example.com/x")).not.toThrow();
    });
  }

  test("a misspelled directive is ignored rather than guessed at", () => {
    // Google tolerates "disalow"; we do not. Silently honoring a typo in a
    // compliance path means acting on a rule the operator did not write.
    const robots = "User-agent: *\nDisalow: /private";
    expect(isPathAllowed(robots, "https://example.com/private").verdict).toBe("allowed");
  });

  test("a rule without a leading slash is ignored", () => {
    expect(isPathAllowed("User-agent: *\nDisallow: private", "https://example.com/private").verdict)
      .toBe("allowed");
  });

  test("CRLF documents parse identically to LF", () => {
    expect(isPathAllowed("User-agent: *\r\nDisallow: /x\r\n", "https://example.com/x").verdict)
      .toBe("disallowed");
  });

  test("an unparseable URL yields unknown rather than a false allow", () => {
    expect(isPathAllowed("User-agent: *\nAllow: /", "not-a-url").verdict).toBe("unknown");
  });
});

describe("robotsDecisionForStatus — RFC 9309 §2.3.1", () => {
  test("2xx means the document applies", () => {
    expect(robotsDecisionForStatus(200)).toBe("allowed");
  });

  test("404 means no restrictions are published", () => {
    expect(robotsDecisionForStatus(404)).toBe("allowed");
    expect(robotsDecisionForStatus(410)).toBe("allowed");
  });

  test("5xx means intent is unknown, so the caller must not assume consent", () => {
    expect(robotsDecisionForStatus(500)).toBe("unknown");
    expect(robotsDecisionForStatus(503)).toBe("unknown");
  });

  test("429 is unknown, not an allow", () => {
    // §2.3.1.3 groups 429 with 5xx. Rate limiting is the operator asking us to
    // slow down; reading it as "no restrictions" would invert its meaning.
    expect(robotsDecisionForStatus(429)).toBe("unknown");
  });

  test("401 and 403 are unknown — a deliberate deviation from §2.3.1.2", () => {
    // The RFC groups these with 404. Being refused permission to read the
    // rules is closer to a refusal than to an absence of rules, and this
    // project pauses when access is refused.
    expect(robotsDecisionForStatus(401)).toBe("unknown");
    expect(robotsDecisionForStatus(403)).toBe("unknown");
  });
});

describe("robotsUrlFor", () => {
  test("derives the origin's robots.txt", () => {
    expect(robotsUrlFor("https://example.com/feeds/jobs.xml"))
      .toBe("https://example.com/robots.txt");
  });

  test("keeps a non-default port", () => {
    expect(robotsUrlFor("https://example.com:8443/x"))
      .toBe("https://example.com:8443/robots.txt");
  });

  test("returns null for an unparseable URL", () => {
    expect(robotsUrlFor("nonsense")).toBeNull();
  });
});
