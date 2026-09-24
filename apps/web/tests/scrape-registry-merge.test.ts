import { describe, expect, test } from "bun:test";
import type { RegistryPolicyRow } from "@va-hub/scraper";
import { mergeRegistryAtsSources } from "../src/pages/api/cron/scrape";

function registryRow(
  sourceId: string,
  operationalState: RegistryPolicyRow["operationalState"],
  displayName?: string,
): RegistryPolicyRow {
  return {
    sourceId,
    providerId: sourceId.split(":")[0],
    complianceState: "conditional",
    operationalState,
    optOut: false,
    displayName,
  };
}

function agency(id: number, companyName: string, platform: string, token: string) {
  return { id, companyName, atsPlatform: platform, atsToken: token, verifiedAt: null };
}

describe("mergeRegistryAtsSources — graduated registry rows enter the fetch list", () => {
  test("merges an active registry row not cataloged in va_directory", () => {
    const merged = mergeRegistryAtsSources(
      [agency(1, "Existing Co", "breezy", "existingco")],
      new Map([["breezy:graduatedco", registryRow("breezy:graduatedco", "active", "Graduated Co")]]),
    );
    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({
      atsPlatform: "breezy",
      atsToken: "graduatedco",
      companyName: "Graduated Co",
    });
  });

  test("merges a canary registry row so a promoted canary is ingested (EX-CANARY-INGESTION)", () => {
    const merged = mergeRegistryAtsSources(
      [agency(1, "Existing Co", "breezy", "existingco")],
      new Map([["breezy:canaryco", registryRow("breezy:canaryco", "canary", "Canary Co")]]),
    );
    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({
      atsPlatform: "breezy",
      atsToken: "canaryco",
      companyName: "Canary Co",
    });
  });

  test("never merges shadow or candidate rows", () => {
    const merged = mergeRegistryAtsSources(
      [agency(1, "Existing Co", "breezy", "existingco")],
      new Map([
        ["breezy:shadowco", registryRow("breezy:shadowco", "shadow")],
        ["breezy:candidco", registryRow("breezy:candidco", "candidate")],
      ]),
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].atsToken).toBe("existingco");
  });

  test("does not duplicate a token already present in va_directory", () => {
    const merged = mergeRegistryAtsSources(
      [agency(1, "20Four7VA", "breezy", "20four7va")],
      new Map([["breezy:20four7va", registryRow("breezy:20four7va", "active", "20Four7VA")]]),
    );
    expect(merged).toHaveLength(1);
  });

  test("ignores unknown ATS platforms and non-ATS identities", () => {
    const merged = mergeRegistryAtsSources(
      [] as Array<ReturnType<typeof agency>>,
      new Map([
        ["rss:weird", registryRow("rss:weird", "active")],
        ["we-work-remotely", registryRow("we-work-remotely", "active")],
      ]),
    );
    expect(merged).toHaveLength(0);
  });

  test("falls back to the display token when displayName is absent", () => {
    const merged = mergeRegistryAtsSources(
      [] as Array<ReturnType<typeof agency>>,
      new Map([["greenhouse:ghost", registryRow("greenhouse:ghost", "canary")]]),
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].companyName).toBe("ghost");
  });
});
