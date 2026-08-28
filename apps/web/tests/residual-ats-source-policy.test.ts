import { describe, expect, test } from "bun:test";

const scrapeSource = await Bun.file(
  new URL("../src/pages/api/cron/scrape.ts", import.meta.url),
).text();

const tokenPolicyStart = scrapeSource.indexOf("const ATS_TOKEN_POLICIES");
const tokenPolicyEnd = scrapeSource.indexOf("interface DuplicateAtsAgency", tokenPolicyStart);
const tokenPolicySource = scrapeSource.slice(tokenPolicyStart, tokenPolicyEnd);

const EXPECTED_TOKENS: Record<string, string[]> = {
  greenhouse: ["ghost", "gitlab", "grafanalabs", "nearform", "remotecom"],
  breezy: ["20four7va", "sourcefit", "time-etc", "vaaphilippines-recruitment"],
};

const EXPECTED_NOTES: Record<string, string> = {
  greenhouse: "GREENHOUSE_INTEGRATION_AUTHORITY_PAUSE_NOTE",
  breezy: "BREEZY_INTEGRATION_AUTHORITY_PAUSE_NOTE",
};

describe("residual ATS source policy containment", () => {
  for (const provider of ["greenhouse", "breezy"]) {
    test(`keeps exactly the reviewed ${provider} tokens paused`, () => {
      const pattern = new RegExp(`"${provider}:([^"]+)":\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, "g");
      const blocks = [...tokenPolicySource.matchAll(pattern)];

      expect(blocks.map((match) => match[1]).sort()).toEqual(EXPECTED_TOKENS[provider]);
      for (const [, token, body] of blocks) {
        expect(body, `${provider}:${token} must be disabled`).toContain("enabled: false");
        expect(body, `${provider}:${token} must be paused`).toContain('complianceStatus: "paused"');
        expect(body, `${provider}:${token} must use its reviewed provider note`).toContain(
          `complianceNotes: ${EXPECTED_NOTES[provider]}`,
        );
      }
    });
  }

  test("pins each provider's distinct evidence and re-enable gate", () => {
    const note = (constantName: string): string => {
      const match = scrapeSource.match(new RegExp(`const ${constantName} =\\s*"([^"]+)";`));
      expect(match, `${constantName} must be a literal reviewed note`).not.toBeNull();
      return match?.[1] ?? "";
    };

    const greenhouse = note("GREENHOUSE_INTEGRATION_AUTHORITY_PAUSE_NOTE");
    expect(greenhouse).toContain("public without authentication");
    expect(greenhouse).toContain("third-party aggregation or republishing");
    expect(greenhouse).toContain("pending explicit provider terms");

    const breezy = note("BREEZY_INTEGRATION_AUTHORITY_PAUSE_NOTE");
    expect(breezy).toContain("documented v3 API requires authorization");
    expect(breezy).toContain("/json route used here is absent from the current official API index");
    expect(breezy).toContain("pending provider terms");
  });
});
