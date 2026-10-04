/**
 * INCIDENT-0410(q) — a consumed lake row is not a publication.
 *
 * RED suite for `publish-landing-reconciliation.ts`. Every assertion below is a
 * shape production can actually produce, measured or observable on 2026-10-04:
 * a publisher run that reports SUCCESS, marks its candidates `SYNCED_TO_D1`, and
 * leaves no trace in prod D1 or in `source_publication_ledger`.
 */
import { describe, expect, test } from "bun:test";
import {
  buildD1LandingSql,
  buildLakeSyncTransitionSql,
  buildLedgerReceiptSql,
  classifySourceLanding,
  reconcilePublishLanding,
  type PublishLandingInput,
} from "./publish-landing-reconciliation";

const WINDOW = { startIso: "2026-10-04T06:47:00.000Z", endIso: "2026-10-04T06:48:00.000Z" };

/** The 06:47Z incident shape: 4 rows consumed, no receipt, no D1 row evidence. */
function incidentInput(overrides: Partial<PublishLandingInput> = {}): PublishLandingInput {
  return {
    window: WINDOW,
    lake: [{ sourceId: "lever:glass-health-inc", rowCount: 4 }],
    d1: [],
    ledger: [],
    ...overrides,
  };
}

describe("reconcilePublishLanding — the incident shape", () => {
  test("four consumed rows with no receipt and no D1 rows are CLAIMED_NOT_LANDED, not published", () => {
    const report = reconcilePublishLanding(incidentInput());
    expect(report.systemVerdict).toBe("PUBLICATION_CLAIMED_NOT_CONFIRMED");
    expect(report.verdicts).toHaveLength(1);
    const [verdict] = report.verdicts;
    expect(verdict.classification).toBe("CLAIMED_NOT_LANDED");
    expect(verdict.claimedRows).toBe(4);
    expect(verdict.d1NewRows).toBe(0);
    expect(verdict.ledgerReceipts).toBe(0);
    expect(report.lostRows).toBe(4);
    expect(report.claimedRows).toBe(4);
  });

  test("the system verdict never becomes PUBLISHED from a lake state and an exit code", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "lever:glass-health-inc", rowCount: 4 }],
      d1: [{ sourceId: "lever:glass-health-inc", newRows: 4, touchedRows: 0 }],
      ledger: [{ sourceId: "lever:glass-health-inc", receipts: 0, publishedCount: 0 }],
      runConclusion: "succeeded",
    });
    // The run reported success and four rows exist in D1, but no receipt was
    // written. A receipt is the tamper-evident publication record (CONSTITUTION
    // §3.2 condition 14), so the verdict stays unconfirmed.
    expect(report.systemVerdict).toBe("PUBLICATION_CLAIMED_NOT_CONFIRMED");
    expect(report.verdicts[0]!.classification).toBe("LANDED_WITHOUT_RECEIPT");
  });

  test("rows touched by updated_at alone never certify a landing", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "lever:glass-health-inc", rowCount: 4 }],
      d1: [{ sourceId: "lever:glass-health-inc", newRows: 0, touchedRows: 4 }],
      ledger: [],
    });
    const [verdict] = report.verdicts;
    expect(verdict!.classification).toBe("CLAIMED_NOT_LANDED");
    expect(verdict!.touchedRows).toBe(4);
    expect(verdict!.d1TouchesUsedAsEvidence).toBe(false);
  });
});

describe("reconcilePublishLanding — the receipt is the landing proof", () => {
  test("a receipt plus new D1 rows is LANDED", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "remotive", rowCount: 7 }],
      d1: [{ sourceId: "remotive", newRows: 7, touchedRows: 0 }],
      ledger: [{ sourceId: "remotive", receipts: 1, publishedCount: 7 }],
    });
    expect(report.systemVerdict).toBe("PUBLICATION_CONFIRMED");
    expect(report.verdicts[0]!.classification).toBe("LANDED");
    expect(report.lostRows).toBe(0);
  });

  test("a receipt with no D1 row evidence in the window is still LANDED, because re-synced URLs leave no new row", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "remoteok", rowCount: 3 }],
      d1: [],
      ledger: [{ sourceId: "remoteok", receipts: 2, publishedCount: 3 }],
    });
    const [verdict] = report.verdicts;
    expect(verdict!.classification).toBe("LANDED");
    expect(verdict!.d1NewRows).toBe(0);
  });

  test("a receipt whose published_count is zero does not certify anything", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "remoteok", rowCount: 2 }],
      d1: [],
      ledger: [{ sourceId: "remoteok", receipts: 1, publishedCount: 0 }],
    });
    expect(report.verdicts[0]!.classification).toBe("CLAIMED_NOT_LANDED");
  });

  test("a receipt with no lake claim is not this publisher run's claim to certify", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [],
      d1: [{ sourceId: "gateway:direct", newRows: 1, touchedRows: 0 }],
      ledger: [{ sourceId: "gateway:direct", receipts: 1, publishedCount: 1 }],
    });
    expect(report.verdicts[0]!.classification).toBe("ACTIVITY_WITHOUT_CLAIM");
    expect(report.systemVerdict).toBe("NO_PUBLICATION_CLAIMED");
  });

  test("a source with no claim, no receipt and no D1 evidence is NO_SUPPLY, not a failure", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "remotive", rowCount: 0 }],
      d1: [],
      ledger: [],
    });
    expect(report.verdicts[0]!.classification).toBe("NO_SUPPLY");
    expect(report.systemVerdict).toBe("NO_PUBLICATION_CLAIMED");
    expect(report.lostRows).toBe(0);
  });
});

describe("reconcilePublishLanding — missing evidence is UNKNOWN, never zero", () => {
  test("an uncollected D1 observation makes the whole window UNKNOWN", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "lever:deliverect", rowCount: 5 }],
      d1: null,
      ledger: [],
    });
    expect(report.systemVerdict).toBe("UNKNOWN_MISSING_EVIDENCE");
    expect(report.verdicts[0]!.classification).toBe("UNKNOWN_MISSING_EVIDENCE");
    expect(report.verdicts[0]!.missing).toContain("prod_d1_write_observation");
    expect(report.lostRows).toBe(0);
  });

  test("an uncollected ledger observation is UNKNOWN even when D1 rows are present", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "lever:deliverect", rowCount: 5 }],
      d1: [{ sourceId: "lever:deliverect", newRows: 5, touchedRows: 0 }],
      ledger: null,
    });
    expect(report.systemVerdict).toBe("UNKNOWN_MISSING_EVIDENCE");
    expect(report.verdicts[0]!.missing).toContain("publication_ledger_receipts");
  });

  test("an empty window with all three observations collected is not UNKNOWN", () => {
    const report = reconcilePublishLanding({ window: WINDOW, lake: [], d1: [], ledger: [] });
    expect(report.systemVerdict).toBe("NO_PUBLICATION_CLAIMED");
    expect(report.verdicts).toHaveLength(0);
  });
});

describe("reconcilePublishLanding — no authority, no cohort claims", () => {
  test("every verdict and the report are L1_ADVISE with no repair authority", () => {
    const report = reconcilePublishLanding(incidentInput());
    expect(report.decisionClass).toBe("L1_ADVISE");
    expect(report.repairAuthority).toBe("NONE");
    expect(report.publicationEffect).toBe("NONE");
    for (const verdict of report.verdicts) {
      expect(verdict.decisionClass).toBe("L1_ADVISE");
      expect(verdict.repairAuthority).toBe("NONE");
    }
  });

  test("fresh first-publication flow is never inferred from the reconciliation", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [{ sourceId: "remotive", rowCount: 7 }],
      d1: [{ sourceId: "remotive", newRows: 7, touchedRows: 0 }],
      ledger: [{ sourceId: "remotive", receipts: 1, publishedCount: 7 }],
    });
    expect(report.freshFirstPublicationRows).toBeNull();
    expect(report.freshFlowUnavailableReason).toContain("cohort separation");
  });

  test("the report names the window it judged and refuses an inverted one", () => {
    expect(reconcilePublishLanding(incidentInput()).window).toEqual(WINDOW);
    expect(() =>
      reconcilePublishLanding({
        window: { startIso: "2026-10-04T06:48:00.000Z", endIso: "2026-10-04T06:47:00.000Z" },
        lake: [],
        d1: [],
        ledger: [],
      }),
    ).toThrow(RangeError);
  });

  test("row counts are summed per source rather than trusted as reported", () => {
    const report = reconcilePublishLanding({
      window: WINDOW,
      lake: [
        { sourceId: "remotive", rowCount: 4 },
        { sourceId: "remotive", rowCount: 3 },
      ],
      d1: [],
      ledger: [],
    });
    expect(report.verdicts).toHaveLength(1);
    expect(report.verdicts[0]!.claimedRows).toBe(7);
    expect(report.claimedRows).toBe(7);
  });
});

describe("classifySourceLanding — single-source decision, no aggregation", () => {
  test("claimed rows, no receipt and no D1 row is CLAIMED_NOT_LANDED", () => {
    expect(
      classifySourceLanding({
        sourceId: "lever:glass-health-inc",
        claimedRows: 4,
        d1NewRows: 0,
        touchedRows: 0,
        receipts: 0,
        publishedCount: 0,
      }).classification,
    ).toBe("CLAIMED_NOT_LANDED");
  });

  test("claimed rows with a receipt are LANDED", () => {
    expect(
      classifySourceLanding({
        sourceId: "remotive",
        claimedRows: 4,
        d1NewRows: 0,
        touchedRows: 0,
        receipts: 1,
        publishedCount: 4,
      }).classification,
    ).toBe("LANDED");
  });

  test("a receipt with published_count zero and no claim is RECEIPT_WITHOUT_LANDING", () => {
    expect(
      classifySourceLanding({
        sourceId: "remotive",
        claimedRows: 0,
        d1NewRows: 0,
        touchedRows: 0,
        receipts: 1,
        publishedCount: 0,
      }).classification,
    ).toBe("RECEIPT_WITHOUT_LANDING");
  });
});

describe("read-only evidence queries", () => {
  test("all three queries are single read-only SELECT statements with bound parameters", () => {
    const statements = [
      buildLakeSyncTransitionSql(WINDOW.startIso, WINDOW.endIso),
      buildD1LandingSql(WINDOW.startIso, WINDOW.endIso),
      buildLedgerReceiptSql(WINDOW.startIso, WINDOW.endIso),
    ];
    for (const { sql, args } of statements) {
      expect(sql.replace(/\s+/g, " ").trim().startsWith("SELECT")).toBe(true);
      // Word-bounded so the `updated_at` column is not read as an UPDATE verb.
      expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|DROP|CREATE|REPLACE|ALTER|ATTACH|PRAGMA|VACUUM)\b/i);
      expect(sql).not.toMatch(/\bSET\b/i);
      expect(sql).not.toContain("${");
      expect(sql).not.toContain(";");
      expect(args.length).toBeGreaterThan(0);
      expect(args.every((arg) => typeof arg === "string")).toBe(true);
    }
  });

  test("the queries carry the window bounds and the real column names", () => {
    const lake = buildLakeSyncTransitionSql(WINDOW.startIso, WINDOW.endIso);
    expect(lake.sql).toContain("synced_to_d1_at");
    // `synced_to_d1_at` is `datetime('now')` text; the ISO bound must be normalised
    // or the comparison silently matches nothing (a space sorts before `T`).
    expect(lake.sql).toContain("synced_to_d1_at >= datetime(?)");
    expect(lake.sql).toContain("synced_to_d1_at < datetime(?)");
    expect(lake.args).toEqual([WINDOW.startIso, WINDOW.endIso]);

    const ledger = buildLedgerReceiptSql(WINDOW.startIso, WINDOW.endIso);
    expect(ledger.sql).toContain("source_publication_ledger");
    expect(ledger.sql).toContain("tick_key LIKE 'lake-sync:%'");
    expect(ledger.args).toEqual([WINDOW.startIso, WINDOW.endIso]);

    const d1 = buildD1LandingSql(WINDOW.startIso, WINDOW.endIso);
    expect(d1.sql).toContain("opportunities");
    expect(d1.sql).toContain("updated_at");
    expect(d1.args).toEqual([WINDOW.startIso, WINDOW.endIso, WINDOW.startIso, WINDOW.endIso]);
  });

  test("the queries refuse an inverted window", () => {
    expect(() => buildLakeSyncTransitionSql("2026-10-04T06:48:00.000Z", "2026-10-04T06:47:00.000Z")).toThrow(
      RangeError,
    );
  });
});