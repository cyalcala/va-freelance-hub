/**
 * INCIDENT-0410(o) — tests for the publisher-run outcome classifier.
 *
 * Fixtures are the rows measured read-only from prod D1 and the Turso lake on
 * 2026-10-04 (see the module header). They are inputs, not expected outputs: every
 * expected number below is produced by the repository's real `measureCohortAdjacency`,
 * which itself calls the real planner and the real `decideAutoPublish`.
 */
import { describe, expect, it } from "bun:test";
import {
  classifyPublisherRun,
  formatPublisherOutcome,
  PUBLISHER_OUTCOME_SQL,
  type PublisherRunObservation,
} from "./publisher-outcome-classification";
import { measureCohortAdjacency, type AdjacencyInput } from "../lake/auto-publish-cohort-adjacency";

/** Mirrors `BASE_AUTHORIZED_SOURCE_IDS` in `scripts/lake/sync-to-d1.ts` (an input contract). */
const BASE_AUTHORIZED_SOURCE_IDS = [
  "we-work-remotely",
  "remotive",
  "real-work-from-anywhere",
  "jobicy-admin-support-apac",
  "jobicy-supporting-apac",
  "remote-ok",
  "himalayas:remote-jobs",
  "breezy:20four7va",
  "breezy:sourcefit",
  "breezy:yokly",
  "breezy:remote-craft",
  "breezy:value-virtual-assistants",
];

type Measured = { source_id: string; job_count: number; qualified_ready: number; ph_rate: number; ready: number };

/** The 17 tenants measured HOLD with jev_raw NULL, owning all 60 QUALIFIED_READY rows. */
const MEASURED_HELD: Measured[] = [
  { source_id: "ashby:supabase", job_count: 48, qualified_ready: 13, ph_rate: 0.271, ready: 13 },
  { source_id: "lever:deliverect", job_count: 38, qualified_ready: 10, ph_rate: 0.263, ready: 9 },
  { source_id: "lever:brafton", job_count: 24, qualified_ready: 5, ph_rate: 0.208, ready: 5 },
  { source_id: "lever:decilegroup", job_count: 16, qualified_ready: 5, ph_rate: 0.313, ready: 5 },
  { source_id: "lever:lwolf", job_count: 18, qualified_ready: 4, ph_rate: 0.222, ready: 4 },
  { source_id: "lever:aethoshotels", job_count: 17, qualified_ready: 4, ph_rate: 0.235, ready: 4 },
  { source_id: "lever:loadsmart", job_count: 17, qualified_ready: 4, ph_rate: 0.235, ready: 4 },
  { source_id: "ashby:circulareconomysystems", job_count: 8, qualified_ready: 3, ph_rate: 0.375, ready: 3 },
  { source_id: "lever:repurposeglobal", job_count: 7, qualified_ready: 3, ph_rate: 0.429, ready: 3 },
  { source_id: "lever:sofarsounds", job_count: 10, qualified_ready: 2, ph_rate: 0.2, ready: 2 },
  { source_id: "lever:beaverprocess", job_count: 9, qualified_ready: 2, ph_rate: 0.222, ready: 2 },
  { source_id: "lever:90seconds", job_count: 7, qualified_ready: 2, ph_rate: 0.286, ready: 1 },
  { source_id: "lever:hso", job_count: 5, qualified_ready: 1, ph_rate: 0.2, ready: 1 },
  { source_id: "ashby:homera-health", job_count: 3, qualified_ready: 1, ph_rate: 0.333, ready: 1 },
  { source_id: "greenhouse:trainingthestreet", job_count: 3, qualified_ready: 1, ph_rate: 0.333, ready: 1 },
  { source_id: "lever:apolloagriculture", job_count: 3, qualified_ready: 1, ph_rate: 0.333, ready: 1 },
  { source_id: "lever:influ2", job_count: 3, qualified_ready: 1, ph_rate: 0.333, ready: 1 },
];

/** Planned with a real Wilson clearance, but measured with zero pending rows behind them. */
const MEASURED_PLANNED_STARVED: Measured[] = [
  { source_id: "workable:hunt-st", job_count: 130, qualified_ready: 128, ph_rate: 0.985, ready: 0 },
  { source_id: "greenhouse:canonical", job_count: 310, qualified_ready: 122, ph_rate: 0.394, ready: 0 },
];

/** The one planned tenant that did receive a Jev verdict on 2026-10-04 06:06Z. */
const MEASURED_PLANNED_FED: Measured[] = [
  { source_id: "lever:glass-health-inc", job_count: 4, qualified_ready: 4, ph_rate: 1.0, ready: 4 },
];

function adjacencyFor(rows: Measured[]): AdjacencyInput {
  return {
    tenants: rows.map((row) => ({
      source_id: row.source_id,
      job_count: row.job_count,
      qualified_ready: row.qualified_ready,
      ph_rate: row.ph_rate,
      // Only the two sources measured with a verdict carry one; the rest read NULL.
      jev_raw:
        row.source_id === "lever:glass-health-inc"
          ? "typesafe/jev-1.13-20260917:ADMIT@0.98"
          : row.source_id === "workable:hunt-st"
            ? "typesafe/jev-1.13-20260917:ADMIT@0.98"
            : row.source_id === "greenhouse:canonical"
              ? "typesafe/jev-1.13-20260917:ADMIT@0.95"
              : null,
    })),
    pending: rows.map((row) => ({ source_id: row.source_id, ready: row.ready })),
    inventory: null,
    baseAuthorizedSourceIds: BASE_AUTHORIZED_SOURCE_IDS,
  };
}

function observation(overrides: Partial<PublisherRunObservation> & { rows: Measured[] }): PublisherRunObservation {
  return {
    jobExit: overrides.jobExit ?? "succeeded",
    // `null` means "not measured" and must survive; `??` would fold it into 0.
    ledgerReceiptRows: "ledgerReceiptRows" in overrides ? overrides.ledgerReceiptRows! : 0,
    adjacency: measureCohortAdjacency(adjacencyFor(overrides.rows)),
    credentialSkipSignal: overrides.credentialSkipSignal ?? "absent",
  };
}

describe("measureCohortAdjacency over the measured lake state", () => {
  it("finds 60 pending rows and no authorized path to them in the rate-held cohort", () => {
    const report = measureCohortAdjacency(adjacencyFor(MEASURED_HELD));
    expect(report.tenantCount).toBe(17);
    expect(report.pendingRowCount).toBe(60);
    expect(report.authorizedSourceCount).toBe(0);
    expect(report.pendingRowsInAuthorizedSources).toBe(0);
    expect(report.pendingRowsInBaseAuthorizedSources).toBe(0);
    expect(report.pendingRowsInHeldSources).toBe(60);
    expect(report.unusableGrantCount).toBe(0);
  });

  it("reports granted capacity with no pending row behind it as unusable grants", () => {
    const report = measureCohortAdjacency(adjacencyFor([...MEASURED_HELD, ...MEASURED_PLANNED_STARVED]));
    expect(report.authorizedSourceCount).toBe(2);
    expect(report.unusableGrantCount).toBe(2);
    expect(report.unusableGrants.map((grant) => grant.sourceId).sort()).toEqual([
      "greenhouse:canonical",
      "workable:hunt-st",
    ]);
    expect(report.authorizedCapacity).toBe(report.unusableGrants.reduce((sum, g) => sum + g.publishCount, 0));
  });
});

describe("classifyPublisherRun", () => {
  it("calls the measured 2026-10-03 state a silent zero caused by exhausted authorized supply", () => {
    const verdict = classifyPublisherRun(observation({ rows: [...MEASURED_HELD, ...MEASURED_PLANNED_STARVED] }));
    expect(verdict.outcome).toBe("SILENT_ZERO_NO_AUTHORIZED_CANDIDATES");
    expect(verdict.supplyVerdict).toBe("supply_exhausted");
    expect(verdict.reachableRows).toBe(0);
    expect(verdict.heldBySourceGateRows).toBe(60);
    expect(verdict.unbackedPlanRows).toBe(verdict.plannedRows);
    expect(verdict.plannedRows).toBeGreaterThan(0);
    expect(verdict.evidenceCompleteness).toBe("complete");
  });

  it("never reports PUBLISHED from a successful exit alone", () => {
    const verdict = classifyPublisherRun(
      observation({ rows: [...MEASURED_HELD, ...MEASURED_PLANNED_FED], ledgerReceiptRows: 0 }),
    );
    expect(verdict.outcome).not.toBe("PUBLISHED");
  });

  it("names the writer, not the census, when authorized rows were reachable but no receipt was written", () => {
    const verdict = classifyPublisherRun(
      observation({ rows: [...MEASURED_HELD, ...MEASURED_PLANNED_FED], ledgerReceiptRows: 0 }),
    );
    expect(verdict.outcome).toBe("SILENT_ZERO_WRITER_DID_NOT_RECEIPT");
    expect(verdict.supplyVerdict).toBe("supply_available_to_publisher");
    expect(verdict.reachableRows).toBe(4);
    expect(verdict.nextEvidence).toContain("stdout");
  });

  it("reports PUBLISHED when the ledger carries a receipt for the window", () => {
    const verdict = classifyPublisherRun(
      observation({ rows: [...MEASURED_HELD, ...MEASURED_PLANNED_FED], ledgerReceiptRows: 1 }),
    );
    expect(verdict.outcome).toBe("PUBLISHED");
    expect(verdict.evidenceCompleteness).toBe("complete");
  });

  it("attributes a credential skip to the skip, not to the supply census", () => {
    const verdict = classifyPublisherRun(
      observation({
        rows: [...MEASURED_HELD, ...MEASURED_PLANNED_FED],
        credentialSkipSignal: "reported",
      }),
    );
    expect(verdict.outcome).toBe("SILENT_ZERO_CREDENTIAL_SKIP");
    expect(verdict.supplyVerdict).toBe("unknown");
    expect(verdict.nextEvidence).toContain("TURSO_DATABASE_URL");
  });

  it("does not guess a cause when the credential-skip log was not read", () => {
    const withoutSkipSignal = classifyPublisherRun(
      observation({ rows: [...MEASURED_HELD], credentialSkipSignal: "unknown" }),
    );
    const withSkipSignal = classifyPublisherRun(
      observation({ rows: [...MEASURED_HELD], credentialSkipSignal: "reported" }),
    );
    expect(withoutSkipSignal.outcome).toBe("SILENT_ZERO_NO_AUTHORIZED_CANDIDATES");
    expect(withSkipSignal.outcome).toBe("SILENT_ZERO_CREDENTIAL_SKIP");
  });

  it("refuses to conclude publication when the receipt count was not measured", () => {
    const verdict = classifyPublisherRun(
      observation({ rows: [...MEASURED_HELD, ...MEASURED_PLANNED_FED], ledgerReceiptRows: null }),
    );
    expect(verdict.outcome).toBe("UNKNOWN_MISSING_EVIDENCE");
    expect(verdict.missingEvidence).toContain("ledgerReceiptRows");
    expect(verdict.supplyVerdict).toBe("unknown");
  });

  it("refuses to conclude publication when the exit status is unknown", () => {
    const verdict = classifyPublisherRun(
      observation({ rows: [...MEASURED_HELD], jobExit: "unknown", ledgerReceiptRows: 0 }),
    );
    expect(verdict.outcome).toBe("UNKNOWN_MISSING_EVIDENCE");
    expect(verdict.missingEvidence).toContain("jobExit");
  });

  it("attributes a failed run to the failure rather than to supply", () => {
    const verdict = classifyPublisherRun(observation({ rows: [...MEASURED_HELD], jobExit: "failed" }));
    expect(verdict.outcome).toBe("RUN_FAILED");
    expect(verdict.nextEvidence).toContain("lake_publish_failed");
  });

  it("gives every outcome a next evidence-producing action", () => {
    const cases: PublisherRunObservation[] = [
      observation({ rows: MEASURED_HELD }),
      observation({ rows: MEASURED_HELD, ledgerReceiptRows: 3 }),
      observation({ rows: MEASURED_HELD, credentialSkipSignal: "reported" }),
      observation({ rows: MEASURED_HELD, jobExit: "failed" }),
      observation({ rows: MEASURED_HELD, jobExit: "unknown" }),
      observation({ rows: MEASURED_HELD, ledgerReceiptRows: null }),
      observation({ rows: [...MEASURED_HELD, ...MEASURED_PLANNED_FED] }),
    ];
    for (const entry of cases) {
      const verdict = classifyPublisherRun(entry);
      expect(verdict.nextEvidence.length).toBeGreaterThan(0);
      expect(verdict.reason.length).toBeGreaterThan(0);
      expect(verdict.unbackedPlanRows).toBe(
        Math.max(0, verdict.plannedRows - verdict.reachableRows),
      );
    }
  });

  it("keeps the measured receipt-and-supply counts in its one-line summary", () => {
    const line = formatPublisherOutcome(
      classifyPublisherRun(observation({ rows: [...MEASURED_HELD, ...MEASURED_PLANNED_FED] })),
    );
    expect(line).toContain("SILENT_ZERO_WRITER_DID_NOT_RECEIPT");
    expect(line).toContain("reachable=4");
    expect(line).toContain("heldBySourceGate=60");
  });
});

describe("PUBLISHER_OUTCOME_SQL", () => {
  it("carries only read-only statements for a manual maintainer run", () => {
    for (const [name, statement] of Object.entries(PUBLISHER_OUTCOME_SQL)) {
      expect(statement.trim().toUpperCase().startsWith("SELECT")).toBe(true);
      expect(statement).not.toMatch(/UPDATE |DELETE |INSERT |DROP /);
      expect(statement).not.toContain("source_registry");
      expect(name.length).toBeGreaterThan(0);
    }
  });
});