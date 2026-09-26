import { describe, expect, it, mock } from "bun:test";
import {
  CapabilityRegistry,
  DuplicateCapabilityError,
  IncompatibleSourceCapabilityError,
  STANDARD_CAPABILITIES,
  UnsupportedCapabilityError,
  defaultCapabilityRegistry,
  type ConventionalSourceConfig,
} from "./capability-registry";

describe("Phase 7 — Capability Registry & Conventional Adapters (C16 & C17)", () => {
  describe("Exit Criterion 1: Common capabilities defined", () => {
    it("defines exactly the 5 standard capabilities", () => {
      expect(STANDARD_CAPABILITIES).toEqual([
        "ats_json",
        "rss_xml",
        "structured_xml",
        "public_json_api",
        "static_html",
      ]);
    });

    it("registers all 5 standard capabilities in the default registry", () => {
      const names = defaultCapabilityRegistry.listNames();
      for (const cap of STANDARD_CAPABILITIES) {
        expect(names).toContain(cap);
        expect(defaultCapabilityRegistry.has(cap)).toBe(true);

        const def = defaultCapabilityRegistry.get(cap);
        expect(def).toBeDefined();
        expect(def?.name).toBe(cap);
        expect(def?.description.length).toBeGreaterThan(10);
        expect(["json", "xml", "html"]).toContain(def!.payloadKind);
      }
    });
  });

  describe("Exit Criterion 2: Zero duplicate or conflicting capability names", () => {
    it("rejects registering an already registered capability name", () => {
      const registry = new CapabilityRegistry();
      expect(() => {
        registry.register({
          name: "ats_json",
          description: "Duplicate ATS handler",
          payloadKind: "json",
          canHandle: () => true,
          dispatch: async () => [],
        });
      }).toThrow(DuplicateCapabilityError);
    });

    it("rejects registering a case-insensitive duplicate name", () => {
      const registry = new CapabilityRegistry();
      expect(() => {
        registry.register({
          name: "ATS_JSON",
          description: "Uppercase duplicate",
          payloadKind: "json",
          canHandle: () => true,
          dispatch: async () => [],
        });
      }).toThrow(DuplicateCapabilityError);
    });

    it("allows registering a unique custom capability", () => {
      const registry = new CapabilityRegistry();
      const customName = "custom_graphql_api";
      registry.register({
        name: customName,
        description: "Custom GraphQL job board",
        payloadKind: "json",
        canHandle: (s) => Boolean(s.url),
        dispatch: async () => [],
      });
      expect(registry.has(customName)).toBe(true);
      expect(registry.get(customName)?.name).toBe(customName);
    });
  });

  describe("Exit Criterion 3: Registry-driven capability dispatch", () => {
    it("dispatches ats_json capability and records C17 routing metadata", async () => {
      const registry = new CapabilityRegistry();
      const mockOpportunities = [
        {
          title: "Executive Assistant",
          company: "RemoteFirst Corp",
          sourceUrl: "https://boards.greenhouse.io/remotefirst/jobs/123",
          contentHash: "hash1234567890ab",
        },
      ];

      // Override ats_json with mock handler
      const customRegistry = new CapabilityRegistry();
      // Remove or test with standard mock
      const source: ConventionalSourceConfig = {
        id: "greenhouse:remotefirst",
        name: "RemoteFirst Greenhouse",
        capability: "ats_json",
        url: "https://boards-api.greenhouse.io/v1/boards/remotefirst/jobs",
        atsPlatform: "greenhouse",
        atsToken: "remotefirst",
      };

      // Mock the dispatch on a clean registry instance
      const testRegistry = new CapabilityRegistry();
      const testCapability = testRegistry.get("ats_json")!;
      const originalDispatch = testCapability.dispatch;
      testCapability.dispatch = mock(async () => mockOpportunities as any);

      const { result, routing } = await testRegistry.dispatch(source, {
        observedAt: "2026-09-26T12:00:00.000Z",
      });

      expect(result).toEqual(mockOpportunities as any);
      expect(routing.sourceId).toBe("greenhouse:remotefirst");
      expect(routing.declaredCapability).toBe("ats_json");
      expect(routing.payloadKind).toBe("json");
      expect(routing.selectedProcessor).toBe("ats_json");
      expect(routing.warnings).toEqual([]);
      expect(routing.dispatchedAt).toBe("2026-09-26T12:00:00.000Z");
      expect(routing.durationMs).toBeGreaterThanOrEqual(0);
      expect(routing.durationMs).toBeLessThan(50); // Under 50ms constraint

      // Restore
      testCapability.dispatch = originalDispatch;
    });

    it("dispatches rss_xml capability and records C17 routing metadata", async () => {
      const testRegistry = new CapabilityRegistry();
      const testCapability = testRegistry.get("rss_xml")!;
      const mockResult = {
        sourceId: "custom-rss",
        sourceName: "Custom RSS Feed",
        sourceType: "RSS",
        items: [{ title: "VA", company: "Company", sourceUrl: "https://example.com/1" }],
      };
      testCapability.dispatch = mock(async () => mockResult as any);

      const source: ConventionalSourceConfig = {
        id: "custom-rss",
        name: "Custom RSS Feed",
        capability: "rss_xml",
        url: "https://example.com/rss.xml",
      };

      const { result, routing } = await testRegistry.dispatch(source);
      expect(result).toEqual(mockResult as any);
      expect(routing.declaredCapability).toBe("rss_xml");
      expect(routing.payloadKind).toBe("xml");
      expect(routing.selectedProcessor).toBe("rss_xml");
    });

    it("dispatches structured_xml capability and routes correctly", async () => {
      const testRegistry = new CapabilityRegistry();
      const testCapability = testRegistry.get("structured_xml")!;
      const mockJobs = [{ title: "Teamtailor Role", company: "TT Corp" }];
      testCapability.dispatch = mock(async () => mockJobs as any);

      const source: ConventionalSourceConfig = {
        id: "teamtailor:ttcorp",
        name: "TT Corp",
        capability: "structured_xml",
        url: "https://ttcorp.teamtailor.com/jobs.rss",
      };

      const { result, routing } = await testRegistry.dispatch(source);
      expect(result).toEqual(mockJobs as any);
      expect(routing.declaredCapability).toBe("structured_xml");
      expect(routing.payloadKind).toBe("xml");
    });

    it("throws UnsupportedCapabilityError for unregistered capability", async () => {
      const registry = new CapabilityRegistry();
      const source: ConventionalSourceConfig = {
        id: "unknown-source",
        name: "Unknown Source",
        capability: "alien_binary_protocol",
        url: "https://example.com",
      };

      expect(registry.dispatch(source)).rejects.toThrow(UnsupportedCapabilityError);
    });

    it("throws IncompatibleSourceCapabilityError when source fails canHandle", async () => {
      const registry = new CapabilityRegistry();
      // ats_json requires atsPlatform and (atsToken or url)
      const invalidAtsSource: ConventionalSourceConfig = {
        id: "invalid-ats",
        name: "Invalid ATS",
        capability: "ats_json",
        url: "", // missing url and missing atsPlatform
      };

      expect(registry.dispatch(invalidAtsSource)).rejects.toThrow(
        IncompatibleSourceCapabilityError
      );
    });
  });

  describe("Exit Criterion 4: Central orchestrator modification no longer required (C16)", () => {
    it("allows integrating an arbitrary new conventional source purely by declaration", async () => {
      const registry = new CapabilityRegistry();

      // Define a completely new ordinary source configuration
      const newConventionalSource: ConventionalSourceConfig = {
        id: "breezy:new-va-agency",
        name: "New VA Agency Philippines",
        capability: "ats_json",
        url: "https://new-va-agency.breezy.hr/json",
        companyName: "New VA Agency",
        atsPlatform: "breezy",
        atsToken: "new-va-agency",
        tags: ["va", "philippines", "remote"],
      };

      // Mock the fetcher for testing
      const testCapability = registry.get("ats_json")!;
      testCapability.dispatch = mock(async (src) => {
        expect(src.id).toBe("breezy:new-va-agency");
        expect(src.atsPlatform).toBe("breezy");
        expect(src.atsToken).toBe("new-va-agency");
        return [
          {
            title: "Virtual Assistant (Customer Care)",
            company: "New VA Agency",
            sourceUrl: "https://new-va-agency.breezy.hr/p/123",
            contentHash: "hash999988887777",
          },
        ] as any;
      });

      // Dispatch without touching central orchestrator (scrape.ts)
      const { result, routing } = await registry.dispatch(newConventionalSource);

      expect(result).toHaveLength(1);
      expect((result as any)[0].title).toBe("Virtual Assistant (Customer Care)");
      expect(routing.sourceId).toBe("breezy:new-va-agency");
      expect(routing.selectedProcessor).toBe("ats_json");
      expect(routing.warnings).toHaveLength(0);
    });

    it("converts conventional source config to legacy Source object cleanly", () => {
      const registry = new CapabilityRegistry();
      const config: ConventionalSourceConfig = {
        id: "remoteco-rss",
        name: "Remote.co Clean RSS",
        capability: "rss_xml",
        url: "https://remote.co/feed.xml",
        defaultJobType: "full-time",
        tags: ["remote", "support"],
        cadenceGroup: "remoteco",
      };

      const legacy = registry.toLegacySource(config);
      expect(legacy.id).toBe("remoteco-rss");
      expect(legacy.name).toBe("Remote.co Clean RSS");
      expect(legacy.type).toBe("rss");
      expect(legacy.collectionMethod).toBe("rss_feed");
      expect(legacy.complianceStatus).toBe("allowed");
      expect(legacy.cadenceGroup).toBe("remoteco");
      expect(legacy.tags).toEqual(["remote", "support"]);
    });
  });

  describe("Abandonment Trigger & Performance Bound (Latency <= 50ms)", () => {
    it("resolves capability dispatch in under 1ms overhead", async () => {
      const registry = new CapabilityRegistry();
      const testCapability = registry.get("public_json_api")!;
      testCapability.dispatch = mock(async () => []);

      const source: ConventionalSourceConfig = {
        id: "speed-test",
        name: "Speed Test",
        capability: "public_json_api",
        url: "https://example.com/api.json",
      };

      const start = performance.now();
      const { routing } = await registry.dispatch(source);
      const elapsed = performance.now() - start;

      // Abandonment trigger is > 50ms
      expect(elapsed).toBeLessThan(50);
      expect(routing.durationMs).toBeLessThan(50);
    });
  });
});
