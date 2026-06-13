import { describe, it, expect } from "bun:test";
import {
  isLikelyPlaceholderTitle,
  isRelevantForHub,
  normalizeRemoteOkUrl,
  normalizeText,
  normalizePayRange,
  PHYSICAL_OR_LOGISTICS_ROLE_REGEX,
  HUB_RELEVANT_ROLE_REGEX,
} from "./json";

// ---------------------------------------------------------------------------
// isLikelyPlaceholderTitle
// ---------------------------------------------------------------------------
describe("isLikelyPlaceholderTitle", () => {
  it("rejects empty string", () => {
    expect(isLikelyPlaceholderTitle("")).toBe(true);
  });

  it.each(["test", "sdf", "asdffd", "sadfsdf", "sdsfda"])(
    "rejects known placeholder '%s'",
    (placeholder) => {
      expect(isLikelyPlaceholderTitle(placeholder)).toBe(true);
    },
  );

  it.each(["Senior React Developer", "Virtual Assistant"])(
    "accepts real job title '%s'",
    (title) => {
      expect(isLikelyPlaceholderTitle(title)).toBe(false);
    },
  );

  it("is case insensitive", () => {
    expect(isLikelyPlaceholderTitle("TEST")).toBe(true);
    expect(isLikelyPlaceholderTitle("Test")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PHYSICAL_OR_LOGISTICS_ROLE_REGEX
// ---------------------------------------------------------------------------
describe("PHYSICAL_OR_LOGISTICS_ROLE_REGEX", () => {
  it.each([
    "courier",
    "mail carrier",
    "warehouse associate",
    "delivery driver",
    "forklift operator",
    "photographer",
    "civil engineer",
    "logistics coordinator",
    "fulfillment operations",
  ])("matches physical/logistics role '%s'", (role) => {
    expect(PHYSICAL_OR_LOGISTICS_ROLE_REGEX.test(role)).toBe(true);
  });

  it.each([
    "software engineer",
    "virtual assistant",
    "marketing manager",
    "data analyst",
  ])("does NOT match remote-friendly role '%s'", (role) => {
    expect(PHYSICAL_OR_LOGISTICS_ROLE_REGEX.test(role)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HUB_RELEVANT_ROLE_REGEX
// ---------------------------------------------------------------------------
describe("HUB_RELEVANT_ROLE_REGEX", () => {
  it.each([
    "virtual assistant",
    "customer support",
    "software developer",
    "marketing manager",
    "data analyst",
    "bookkeeper",
    "recruiter",
    "qa tester",
  ])("matches hub-relevant role '%s'", (role) => {
    expect(HUB_RELEVANT_ROLE_REGEX.test(role)).toBe(true);
  });

  it.each(["plumber", "electrician", "chef"])(
    "does NOT match non-hub role '%s'",
    (role) => {
      expect(HUB_RELEVANT_ROLE_REGEX.test(role)).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// isRelevantForHub
// ---------------------------------------------------------------------------
describe("isRelevantForHub", () => {
  it("returns true for a relevant software role", () => {
    expect(
      isRelevantForHub(
        "Senior Software Engineer",
        "Build scalable web services for a remote team.",
      ),
    ).toBe(true);
  });

  it("returns false for a physical courier role", () => {
    expect(
      isRelevantForHub("Courier Driver", "Deliver packages in the metro area."),
    ).toBe(false);
  });

  it("returns false for a warehouse role", () => {
    expect(
      isRelevantForHub(
        "Warehouse Associate",
        "Pick, pack, and ship orders from our distribution center.",
      ),
    ).toBe(false);
  });

  it("returns true for a virtual assistant role", () => {
    expect(
      isRelevantForHub(
        "Virtual Assistant",
        "Manage calendars, emails, and travel booking.",
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeRemoteOkUrl
// ---------------------------------------------------------------------------
describe("normalizeRemoteOkUrl", () => {
  it("accepts valid remoteok.com URL", () => {
    const url = "https://remoteok.com/remote-jobs/12345";
    expect(normalizeRemoteOkUrl(url)).toBe(url);
  });

  it("rejects non-remoteok.com URL", () => {
    expect(normalizeRemoteOkUrl("https://example.com/job/1")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(normalizeRemoteOkUrl("")).toBeNull();
  });

  it("rejects null input", () => {
    expect(normalizeRemoteOkUrl(null)).toBeNull();
  });

  it("normalizes http to https", () => {
    const result = normalizeRemoteOkUrl("http://remoteok.com/remote-jobs/99");
    expect(result).toStartWith("https://");
    expect(result).toContain("remoteok.com");
  });
});

// ---------------------------------------------------------------------------
// normalizeText
// ---------------------------------------------------------------------------
describe("normalizeText", () => {
  it("strips HTML tags", () => {
    expect(normalizeText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes &amp; entity", () => {
    expect(normalizeText("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("decodes &quot; entity", () => {
    expect(normalizeText("She said &quot;hi&quot;")).toBe('She said "hi"');
  });

  it("decodes &#39; entity", () => {
    expect(normalizeText("It&#39;s fine")).toBe("It's fine");
  });

  it("normalizes whitespace", () => {
    expect(normalizeText("  too   many   spaces  ")).toBe("too many spaces");
  });

  it("handles <br> tags", () => {
    expect(normalizeText("line1<br>line2<br/>line3")).toBe("line1 line2 line3");
  });

  it("returns empty string for non-string input", () => {
    expect(normalizeText(undefined)).toBe("");
    expect(normalizeText(42)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// normalizePayRange
// ---------------------------------------------------------------------------
describe("normalizePayRange", () => {
  it("returns null when both min and max are 0", () => {
    expect(normalizePayRange(0, 0)).toBeNull();
  });

  it("formats 'USD min-max' when both values exist", () => {
    expect(normalizePayRange(50000, 80000)).toBe("USD 50000-80000");
  });

  it("formats 'USD value' when only min exists", () => {
    expect(normalizePayRange(60000, 0)).toBe("USD 60000");
  });

  it("formats 'USD value' when only max exists", () => {
    expect(normalizePayRange(0, 90000)).toBe("USD 90000");
  });

  it("returns null for non-number inputs", () => {
    expect(normalizePayRange(undefined, undefined)).toBeNull();
  });
});
