import { expect, test } from "bun:test";

// Dynamic import keeps a missing implementation as a genuine RED test assertion.
async function assess(raw: string, status: number | null = 200, transport: number | null = 0): Promise<any> {
  const module = await import("./hunter-response");
  return module.assessHunterResponse(raw, status, transport);
}

const clean = {
  inserted: 2, actualChanges: 2, skipped: 0, backlogRemaining: 0,
  acceptedForInsert: 2, attemptedInsert: 2, insertFailedBatches: 0,
  insertErrors: [], failedSources: [], sourceResults: [],
  triageFailures: 0, triageAiUnavailable: 0,
  fetchEventLog: { attempted: 1, recorded: 1, failedBatches: 0 },
  cadenceGuards: { stateAvailable: true },
};

test("UNKNOWN500 retains null totals and distinct API-reported prefix without private text", async () => {
  const result = await assess(JSON.stringify({ error: "private bearer abc123", publicationOutcome: "UNKNOWN",
    inserted: null, actualChanges: null, skipped: null, confirmedPublishedLowerBound: 3, reconciliationRequired: true }), 500);
  expect(result.publicationOutcome).toBe("UNKNOWN");
  expect(result.inserted).toBeNull();
  expect(result.actualChanges).toBeNull();
  expect(result.skipped).toBeNull();
  expect(result.confirmedPublishedLowerBound).toBe(3);
  expect(result.reconciliationRequired).toBe(true);
  expect(result.responseEvidence.httpStatus).toBe(500);
  expect(result.responseEvidence.terminalState).toBe("unknown");
  expect(JSON.stringify(result)).not.toContain("abc123");
});

for (const payload of [
  { ...clean, publicationOutcome: "UNKNOWN" },
  { ...clean, reconciliationRequired: true },
  { ...clean, exposure: "UNKNOWN" },
  { ...clean, code: "POST_PERSISTENCE_FAILURE" },
]) {
  test(`contradictory 2xx uncertainty overrides numeric counts ${JSON.stringify(payload).slice(-75)}`, async () => {
    const result = await assess(JSON.stringify(payload));
    expect(result.publicationOutcome).toBe("UNKNOWN");
    expect(result.inserted).toBeNull();
    expect(result.reconciliationRequired).toBe(true);
  });
}

for (const raw of ["not JSON bearer secret", "[]", "null", "{}", '{"inserted":0,"actualChanges":null}',
  '{"inserted":-1,"actualChanges":0}', '{"inserted":1.5,"actualChanges":1}',
  '{"inserted":9007199254740992,"actualChanges":0}']) {
  test(`malformed acknowledgement cannot become zero or healthy: ${raw.slice(0,55)}`, async () => {
    const result = await assess(raw);
    expect(result.inserted).toBeNull();
    expect(result.publicationOutcome).toBe("UNKNOWN");
    expect(result.responseEvidence.terminalState).toBe("unknown");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
}

test("ordinary HTTP failure and lost transport remain incomplete even with success-looking body", async () => {
  for (const [status, transport] of [[401, 0], [503, 0], [302, 0], [200, 18], [null, 7]] as const) {
    const result = await assess(JSON.stringify(clean), status, transport);
    expect(result.inserted).toBeNull();
    expect(result.reconciliationRequired).toBe(true);
    expect(result.responseEvidence.httpStatus).toBe(status);
    expect(result.responseEvidence.transportExitCode).toBe(transport);
  }
});

test("valid completion preserves safe diagnostics and distinguishes reported counters from first publication", async () => {
  const result = await assess(JSON.stringify(clean));
  expect(result.inserted).toBe(2);
  expect(result.actualChanges).toBe(2);
  expect(result.publicationOutcome).toBe("REPORTED");
  expect(result.reconciliationRequired).toBe(false);
  expect(result.confirmedPublishedLowerBound).toBeNull();
  expect(result.responseEvidence.terminalState).toBe("success");
  expect(result.diagnosticsComplete).toBe(true);
});

test("zero/skipped/backlog and held lock preserve existing terminal semantics", async () => {
  expect((await assess(JSON.stringify({ ...clean, inserted: 0, actualChanges: 0, skipped: 3 }))).responseEvidence.terminalState).toBe("success");
  expect((await assess(JSON.stringify({ ...clean, inserted: 0, actualChanges: 0, skipped: 0 }))).responseEvidence.terminalState).toBe("needs-rerun");
  expect((await assess(JSON.stringify({ ...clean, backlogRemaining: 5 }))).responseEvidence.terminalState).toBe("backlog");
  const lock = await assess(JSON.stringify({ skipped: true, reason: "run-lock-held", lockState: "held" }));
  expect(lock.responseEvidence.terminalState).toBe("lock-held");
  expect(lock.publicationOutcome).toBe("SKIPPED");
  expect(lock.inserted).toBeNull();
  expect(lock.reconciliationRequired).toBe(false);
});

test("sanitization retains false cadence and failure counts without arbitrary strings", async () => {
  const result = await assess(JSON.stringify({ ...clean, message: "private abc123", retryAfter: "private abc123",
    sourceResults: [{ sourceName: "secret abc123", sourceType: "secret abc123", ok: false, error: "abc123" }],
    failedSources: ["abc123"], insertErrors: [{ batchStart: 0, batchSize: 2, error: "abc123" }],
    cadenceGuards: { stateAvailable: false } }));
  expect(result.sourceResults[0].ok).toBe(false);
  expect(result.insertErrors).toHaveLength(1);
  expect(result.failedSources).toHaveLength(1);
  expect(result.cadenceGuards.stateAvailable).toBe(false);
  expect(JSON.stringify(result)).not.toContain("abc123");
});

test("invalid optional diagnostics and truncation cannot count as healthy evidence", async () => {
  for (const payload of [{ ...clean, triageFailures: "0" }, { ...clean, sourceResults: Array(129).fill({ ok: true, count: 0 }) },
    { inserted: 0, actualChanges: 0 }, { ...clean, fetchEventLog: { failedBatches: 0 } }]) {
    const result = await assess(JSON.stringify(payload));
    expect(result.diagnosticsComplete).toBe(false);
  }
});

test("unsafe lower bound and oversized body remain unknown without raw material", async () => {
  const result = await assess(JSON.stringify({ publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: 1.5 }), 500);
  expect(result.confirmedPublishedLowerBound).toBeNull();
  const oversized = await assess("x".repeat(1_048_577));
  expect(oversized.responseEvidence.bodyValidity).toBe("OVERSIZED");
  expect(oversized.inserted).toBeNull();
  expect(JSON.stringify(oversized).length).toBeLessThan(1500);
});

for (const extra of [{ inserted: 2, actualChanges: 2 }, { confirmedPublishedLowerBound: 2 }, { inserted: "invalid" }]) {
  test(`contradictory held lock never discards publication evidence ${JSON.stringify(extra)}`, async () => {
    const result = await assess(JSON.stringify({ skipped: true, reason: "run-lock-held", lockState: "held", ...extra }));
    expect(result.publicationOutcome).toBe("UNKNOWN");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.confirmedPublishedLowerBound).toBe("confirmedPublishedLowerBound" in extra ? 2 : null);
  });
}

for (const extra of [{ backlogRemaining: "invalid" }, { sourceResults: [{ ok: true, count: "invalid" }] },
  { insertErrors: ["invalid"] }, { failedSources: [123] }, { stateWriteFailed: "0" }, { unmatchedPauses: "invalid" }]) {
  test(`malformed supplied health diagnostics cannot assert completeness ${JSON.stringify(extra)}`, async () => {
    const result = await assess(JSON.stringify({ ...clean, ...extra }));
    expect(result.diagnosticsComplete).toBe(false);
  });
}
