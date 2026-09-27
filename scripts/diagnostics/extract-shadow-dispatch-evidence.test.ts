import { describe, expect, test } from "bun:test";
import { extractShadowDispatchEvidence } from "./extract-shadow-dispatch-evidence";

describe("extract-shadow-dispatch-evidence", () => {
  test("classifies HTTP 200 with registry rows as incident-closing success", () => {
    const body = JSON.stringify({ totalRegistryRows: 3, eligible: 3, dispatched: 2 });
    const evidence = extractShadowDispatchEvidence(200, body, "2026-09-27T20:23:00Z");
    expect(evidence.outcome).toBe("success_observed");
    expect(evidence.totalRegistryRows).toBe(3);
    expect(evidence.dispatched).toBe(2);
    expect(evidence.eligible).toBe(3);
    expect(evidence.hasFingerprint).toBe(false);
    expect(evidence.pagesTailFilterHint).toBeNull();
  });

  test("routes a specific class with fingerprint to Pages-log correlation", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_busy_or_locked",
      errorFingerprint: "9f2ac410",
    });
    const evidence = extractShadowDispatchEvidence(503, body, "2026-09-27T20:23:00Z");
    expect(evidence.outcome).toBe("specific_class_with_fingerprint");
    expect(evidence.errorClass).toBe("d1_busy_or_locked");
    expect(evidence.errorFingerprint).toBe("9f2ac410");
    expect(evidence.hasFingerprint).toBe(true);
    expect(evidence.pagesTailFilterHint).toContain("9f2ac410");
    expect(evidence.pagesTailFilterHint).toContain("2026-09-27T20:23:00Z");
  });

  test("treats a generic class WITH fingerprint as falsification (reopen diagnosis)", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_quota_or_limit",
      errorFingerprint: "0123abcd",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("generic_class_with_fingerprint");
    expect(evidence.hasFingerprint).toBe(true);
    expect(evidence.pagesTailFilterHint).toContain("0123abcd");
    expect(evidence.nextAction).toContain("FALSIFICATION");
  });

  test("treats legacy 19:32Z-style body without fingerprint as old-code evidence", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_quota_or_limit",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("legacy_generic_without_fingerprint");
    expect(evidence.hasFingerprint).toBe(false);
    expect(evidence.errorFingerprint).toBeNull();
    expect(evidence.pagesTailFilterHint).toBeNull();
    expect(evidence.nextAction).toContain("UNOBSERVED");
  });

  test("rejects malformed fingerprints as absent (no correlation key invented)", () => {
    const body = JSON.stringify({ errorClass: "d1_schema_mismatch", errorFingerprint: "ZZZ-not-hex" });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("legacy_generic_without_fingerprint");
    expect(evidence.errorFingerprint).toBeNull();
    expect(evidence.hasFingerprint).toBe(false);
  });

  test("marks non-JSON log text unparseable without inferring health", () => {
    const evidence = extractShadowDispatchEvidence(503, "curl: (7) Failed to connect");
    expect(evidence.outcome).toBe("unparseable");
    expect(evidence.httpStatus).toBe(503);
    expect(evidence.nextAction).toContain("Do not infer health");
  });

  test("marks a body with neither class nor fingerprint unparseable", () => {
    const evidence = extractShadowDispatchEvidence(503, JSON.stringify({ error: "weird" }));
    expect(evidence.outcome).toBe("unparseable");
  });

  test("never throws on empty input", () => {
    const evidence = extractShadowDispatchEvidence(null, "");
    expect(evidence.outcome).toBe("unparseable");
    expect(evidence.httpStatus).toBeNull();
  });
});
