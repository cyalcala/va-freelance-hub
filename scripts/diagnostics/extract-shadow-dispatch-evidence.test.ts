import { describe, expect, test } from "bun:test";
import { extractShadowDispatchEvidence } from "./extract-shadow-dispatch-evidence";

describe("extract-shadow-dispatch-evidence", () => {
  test("classifies HTTP 200 with a persisted observation as observed", () => {
    const body = JSON.stringify({ totalRegistryRows: 3, eligible: 3, dispatched: 2 });
    const evidence = extractShadowDispatchEvidence(200, body, "2026-09-27T20:23:00Z");
    expect(evidence.outcome).toBe("success_observed");
    expect(evidence.totalRegistryRows).toBe(3);
    expect(evidence.dispatched).toBe(2);
    expect(evidence.eligible).toBe(3);
    expect(evidence.hasFingerprint).toBe(false);
    expect(evidence.pagesTailFilterHint).toBeNull();
  });

  test("does not close the incident when every shadow row is skipped", () => {
    const body = JSON.stringify({ totalRegistryRows: 3, eligible: 0, dispatched: 0, skippedIneligible: 3,
      skippedStaleContext: 0, outcomes: {}, verdict: { status: "healthy" } });
    const evidence = extractShadowDispatchEvidence(200, body);
    expect(evidence.outcome).toBe("no_observation");
    expect(evidence.skippedIneligible).toBe(3);
    expect(evidence.nextAction).toContain("No observation was persisted");
  });

  test("does not accept a malformed HTTP 200 summary as observation evidence", () => {
    const evidence = extractShadowDispatchEvidence(200, JSON.stringify({ totalRegistryRows: 3, dispatched: "1" }));
    expect(evidence.outcome).toBe("unparseable");
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

  test("routes d1_probe_contract_violation to specific_class_with_fingerprint", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_probe_contract_violation",
      errorFingerprint: "1a2b3c4d",
    });
    const evidence = extractShadowDispatchEvidence(503, body, "2026-09-29T08:40:00Z");
    expect(evidence.outcome).toBe("specific_class_with_fingerprint");
    expect(evidence.errorClass).toBe("d1_probe_contract_violation");
    expect(evidence.errorFingerprint).toBe("1a2b3c4d");
  });

  test("extracts failureStage and sourceId when present in 503 response", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_constraint_violation",
      failureStage: "persist_observation",
      sourceId: "greenhouse:canonical",
      errorFingerprint: "461c6be7",
    });
    const evidence = extractShadowDispatchEvidence(503, body, "2026-09-29T10:00:00Z");
    expect(evidence.outcome).toBe("specific_class_with_fingerprint");
    expect(evidence.errorClass).toBe("d1_constraint_violation");
    expect(evidence.failureStage).toBe("persist_observation");
    expect(evidence.sourceId).toBe("greenhouse:canonical");
    expect(evidence.errorFingerprint).toBe("461c6be7");
    expect(evidence.nextAction).toContain("stage persist_observation");
    expect(evidence.nextAction).toContain("greenhouse:canonical");
  });

  test("extracts skippedStaleContext on HTTP 200 payload", () => {
    const body = JSON.stringify({
      totalRegistryRows: 3,
      eligible: 3,
      dispatched: 1,
      skippedStaleContext: 1,
    });
    const evidence = extractShadowDispatchEvidence(200, body);
    expect(evidence.outcome).toBe("success_observed");
    expect(evidence.skippedStaleContext).toBe(1);
    expect(evidence.dispatched).toBe(1);
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

  test("provides specific guidance for d1_quota_or_limit with D1 operation failureStage", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_quota_or_limit",
      errorFingerprint: "abcd1234",
      failureStage: "persist_observation", // D1 write operation
      sourceId: "greenhouse:canonical"
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("generic_class_with_fingerprint");
    expect(evidence.hasFingerprint).toBe(true);
    expect(evidence.nextAction).toContain("D1 operation stage \"persist_observation\" detected with fingerprint");
    expect(evidence.nextAction).toContain("Correlate in Pages log within the run window");
  });

  test("provides specific guidance for d1_quota_or_limit with Pages resource failureStage", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_quota_or_limit",
      errorFingerprint: "abcd1234",
      failureStage: "run_probe", // Probe execution
      sourceId: "greenhouse:canonical"
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("generic_class_with_fingerprint");
    expect(evidence.hasFingerprint).toBe(true);
    expect(evidence.nextAction).toContain("Pages resource stage \"run_probe\" detected with fingerprint");
    expect(evidence.nextAction).toContain("Correlate in Pages log within the run window");
  });

  test("reports no_observation when eligible > 0 but dispatched = 0", () => {
    const body = JSON.stringify({
      totalRegistryRows: 10,
      eligible: 5,
      dispatched: 0,
      skippedIneligible: 3,
      skippedStaleContext: 2,
    });
    const evidence = extractShadowDispatchEvidence(200, body);
    expect(evidence.outcome).toBe("no_observation");
    expect(evidence.eligible).toBe(5);
    expect(evidence.dispatched).toBe(0);
    expect(evidence.skippedIneligible).toBe(3);
    expect(evidence.skippedStaleContext).toBe(2);
    expect(evidence.nextAction).toContain("No observation was persisted");
  });

  test("classifies run-cap skip as no_observation when eligible > 0 but dispatched = 0", () => {
    const body = JSON.stringify({
      totalRegistryRows: 8,
      eligible: 6,
      dispatched: 0,
      skippedIneligible: 0,
      skippedStaleContext: 0,
      runCapReached: true,
      capLimit: 4,
    });
    const evidence = extractShadowDispatchEvidence(200, body);
    expect(evidence.outcome).toBe("no_observation");
    expect(evidence.eligible).toBe(6);
    expect(evidence.dispatched).toBe(0);
    expect(evidence.nextAction).toContain("No observation was persisted");
  });

  test("extracts failureStage persist_observation in 503 with fingerprint", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_quota_or_limit",
      errorFingerprint: "a1b2c3d4",
      failureStage: "persist_observation",
      sourceId: "ashby:example-tenant",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("generic_class_with_fingerprint");
    expect(evidence.failureStage).toBe("persist_observation");
    expect(evidence.sourceId).toBe("ashby:example-tenant");
    expect(evidence.nextAction).toContain('D1 operation stage "persist_observation" detected');
  });

  test("extracts failureStage run_probe in 503 with fingerprint", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_quota_or_limit",
      errorFingerprint: "f0e1d2c3",
      failureStage: "run_probe",
      sourceId: "greenhouse:tenant-xyz",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("generic_class_with_fingerprint");
    expect(evidence.failureStage).toBe("run_probe");
    expect(evidence.sourceId).toBe("greenhouse:tenant-xyz");
    expect(evidence.nextAction).toContain('Pages resource stage "run_probe" detected');
  });

  test("extracts failureStage enumerate_registry in 503 with fingerprint", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_quota_or_limit",
      errorFingerprint: "11223344",
      failureStage: "enumerate_registry",
      sourceId: "lever:acme",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("generic_class_with_fingerprint");
    expect(evidence.failureStage).toBe("enumerate_registry");
    expect(evidence.nextAction).toContain('D1 operation stage "enumerate_registry" detected');
  });

  test("extracts failureStage load_observation_history in 503 with fingerprint", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_quota_or_limit",
      errorFingerprint: "55667788",
      failureStage: "load_observation_history",
      sourceId: "breezy:company-jobs",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("generic_class_with_fingerprint");
    expect(evidence.failureStage).toBe("load_observation_history");
    expect(evidence.nextAction).toContain('D1 operation stage "load_observation_history" detected');
  });

  test("extracts specific error class d1_constraint_violation with failureStage and sourceId", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_constraint_violation",
      errorFingerprint: "99aabbcc",
      failureStage: "persist_observation",
      sourceId: "ashby:gradient",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("specific_class_with_fingerprint");
    expect(evidence.errorClass).toBe("d1_constraint_violation");
    expect(evidence.failureStage).toBe("persist_observation");
    expect(evidence.sourceId).toBe("ashby:gradient");
    expect(evidence.nextAction).toContain("stage persist_observation");
    expect(evidence.nextAction).toContain("ashby:gradient");
  });

  test("extracts specific error class d1_probe_contract_violation with failureStage", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_probe_contract_violation",
      errorFingerprint: "ddeeff00",
      failureStage: "run_probe",
      sourceId: "workable:global",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("specific_class_with_fingerprint");
    expect(evidence.errorClass).toBe("d1_probe_contract_violation");
    expect(evidence.failureStage).toBe("run_probe");
    expect(evidence.sourceId).toBe("workable:global");
  });

  test("handles 503 with d1_busy_or_locked specific class and fingerprint", () => {
    const body = JSON.stringify({
      error: "Shadow dispatch evidence or observation storage unavailable",
      errorClass: "d1_busy_or_locked",
      errorFingerprint: "1234abcd",
      failureStage: "load_admission_context",
      sourceId: "greenhouse:canonical",
    });
    const evidence = extractShadowDispatchEvidence(503, body);
    expect(evidence.outcome).toBe("specific_class_with_fingerprint");
    expect(evidence.errorClass).toBe("d1_busy_or_locked");
    expect(evidence.failureStage).toBe("load_admission_context");
    expect(evidence.sourceId).toBe("greenhouse:canonical");
    expect(evidence.pagesTailFilterHint).toContain("1234abcd");
  });
});
