import { describe, expect, test } from "bun:test";

const scrapeSource = await Bun.file(
  new URL("../src/pages/api/cron/scrape.ts", import.meta.url),
).text();

const tokenPolicyStart = scrapeSource.indexOf("const ATS_TOKEN_POLICIES");
const tokenPolicyEnd = scrapeSource.indexOf("interface DuplicateAtsAgency", tokenPolicyStart);
const tokenPolicySource = scrapeSource.slice(tokenPolicyStart, tokenPolicyEnd);

const EXPECTED_ASHBY_TOKENS = [
  "amplify",
  "ashby",
  "camunda",
  "supabase",
  "tremendous",
].sort();

describe("Ashby ATS source policy containment", () => {
  test("keeps exactly the five reviewed Ashby tokens paused pending partner access", () => {
    const blocks = [...tokenPolicySource.matchAll(/"ashby:([^"]+)":\s*\{([\s\S]*?)\n\s*\},/g)];

    expect(blocks.map((match) => match[1]).sort()).toEqual(EXPECTED_ASHBY_TOKENS);
    for (const [, token, body] of blocks) {
      expect(body, `${token} must be disabled`).toContain("enabled: false");
      expect(body, `${token} must be paused`).toContain('complianceStatus: "paused"');
      expect(body, `${token} must use the reviewed pause note`).toContain(
        "complianceNotes: ASHBY_PARTNER_ACCESS_PAUSE_NOTE",
      );
    }
  });

  test("documents the source-supported re-enable gate", () => {
    expect(scrapeSource).toContain("Dedicated Partner Job Feed");
    expect(scrapeSource).toContain("customer opt-in");
    expect(scrapeSource).toContain("do not treat robots HTTP 401 as allow");
  });
});
