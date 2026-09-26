import { describe, expect, it } from "bun:test";
import {
  parseExceptionDocument,
  isSourceExpansionDiff,
  inspectOrchestratorGuard,
  REQUIRED_EXCEPTION_FIELDS,
} from "./check-orchestrator-modifications";

describe("check-orchestrator-modifications (C16 Guardrail)", () => {
  const validExceptionText = `
# Source Exception: custom-partner:feed

- source_id: "custom-partner:feed"
- exception_reason: "Partner requires proprietary multi-part signature handshake"
- missing_capability: "signed_multipart_handshake"
- blast_radius: "apps/web/src/pages/api/cron/scrape.ts: line 420"
- tests_added: "packages/scraper/custom-partner.test.ts"
- fallback_path: "Disable partner flag in source_registry"
- owner_or_ADR_reference: "ADR-009"
`;

  describe("parseExceptionDocument", () => {
    it("parses a valid exception document with all 7 required fields", () => {
      const result = parseExceptionDocument(validExceptionText);
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.fields.source_id).toBe("custom-partner:feed");
      expect(result.fields.exception_reason).toBe("Partner requires proprietary multi-part signature handshake");
      expect(result.fields.missing_capability).toBe("signed_multipart_handshake");
      expect(result.fields.blast_radius).toBe("apps/web/src/pages/api/cron/scrape.ts: line 420");
      expect(result.fields.tests_added).toBe("packages/scraper/custom-partner.test.ts");
      expect(result.fields.fallback_path).toBe("Disable partner flag in source_registry");
      expect(result.fields.owner_or_ADR_reference).toBe("ADR-009");
    });

    it("detects missing required fields", () => {
      const partialText = `
- source_id: "custom-partner:feed"
- exception_reason: "Reason here"
`;
      const result = parseExceptionDocument(partialText);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("missing_capability");
      expect(result.missingFields).toContain("blast_radius");
      expect(result.missingFields).toContain("tests_added");
      expect(result.missingFields).toContain("fallback_path");
      expect(result.missingFields).toContain("owner_or_ADR_reference");
    });

    it("detects empty/whitespace required field values", () => {
      const emptyFieldText = `
- source_id: "custom-partner:feed"
- exception_reason: ""
- missing_capability: "   "
- blast_radius: "scrape.ts"
- tests_added: "test.ts"
- fallback_path: "rollback"
- owner_or_ADR_reference: "ADR-009"
`;
      const result = parseExceptionDocument(emptyFieldText);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("exception_reason");
      expect(result.missingFields).toContain("missing_capability");
    });
  });

  describe("isSourceExpansionDiff", () => {
    it("identifies benign non-source changes (refactoring, bug fixes, comments)", () => {
      const benignDiff = `
@@ -100,5 +100,5 @@
-  const duration = Date.now() - start;
+  const durationMs = Date.now() - start;
+  // Log timing improvement
+  console.log(\`Execution took \${durationMs}ms\`);
`;
      const result = isSourceExpansionDiff(benignDiff);
      expect(result.isSourceAddition).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it("identifies feed URL literal additions in scrape.ts", () => {
      const feedDiff = `
+  const newFeedUrl = "https://example.com/jobs/rss.xml";
`;
      const result = isSourceExpansionDiff(feedDiff);
      expect(result.isSourceAddition).toBe(true);
      expect(result.matches).toContain("feed URL literal");
    });

    it("identifies ROBOTS_ENFORCE_SOURCE_IDS additions in scrape.ts", () => {
      const robotsDiff = `
-const ROBOTS_ENFORCE_SOURCE_IDS = new Set(["a", "b"]);
+const ROBOTS_ENFORCE_SOURCE_IDS = new Set(["a", "b", "c"]);
`;
      const result = isSourceExpansionDiff(robotsDiff);
      expect(result.isSourceAddition).toBe(true);
      expect(result.matches).toContain("ROBOTS_ENFORCE_SOURCE_IDS addition");
    });

    it("identifies static source or source_id additions in scrape.ts", () => {
      const sourceIdDiff = `
+  { sourceId: "new-hardcoded-source", name: "New Source" },
`;
      const result = isSourceExpansionDiff(sourceIdDiff);
      expect(result.isSourceAddition).toBe(true);
      expect(result.matches).toContain("source identity wiring");
    });
  });

  describe("inspectOrchestratorGuard", () => {
    it("passes cleanly when scrape.ts is not modified", () => {
      const result = inspectOrchestratorGuard({
        modifiedFiles: ["packages/scraper/sources.ts", "docs/METRICS.md"],
      });
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("permits scrape.ts modification when an approved exception document exists", () => {
      const result = inspectOrchestratorGuard({
        modifiedFiles: ["apps/web/src/pages/api/cron/scrape.ts"],
        diffText: `+ const ROBOTS_ENFORCE_SOURCE_IDS = new Set(["a", "b", "c"]);`,
        exceptionDocs: [
          {
            path: "docs/exceptions/custom-partner.md",
            content: validExceptionText,
          },
        ],
      });
      expect(result.errors).toHaveLength(0);
      expect(result.acceptedExceptions).toContain("custom-partner:feed");
    });

    it("rejects scrape.ts modification with invalid exception document", () => {
      const result = inspectOrchestratorGuard({
        modifiedFiles: ["apps/web/src/pages/api/cron/scrape.ts"],
        diffText: `+ const ROBOTS_ENFORCE_SOURCE_IDS = new Set(["a", "b", "c"]);`,
        exceptionDocs: [
          {
            path: "docs/exceptions/invalid.md",
            content: "- source_id: 'incomplete'",
          },
        ],
      });
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("invalid C16 exception document");
    });

    it("errors when scrape.ts has source additions without an exception document", () => {
      const result = inspectOrchestratorGuard({
        modifiedFiles: ["apps/web/src/pages/api/cron/scrape.ts"],
        diffText: `+ const newFeedUrl = "https://example.com/jobs/rss.xml";`,
        exceptionDocs: [],
      });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Operating Constitution v5.2 §8.1 (C16)");
      expect(result.errors[0]).toContain("feed URL literal");
    });

    it("warns when scrape.ts has non-source modifications without an exception document", () => {
      const result = inspectOrchestratorGuard({
        modifiedFiles: ["apps/web/src/pages/api/cron/scrape.ts"],
        diffText: `+ const durationMs = Date.now() - start;`,
        exceptionDocs: [],
      });
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("central orchestrator was modified without an exception document");
    });
  });
});
