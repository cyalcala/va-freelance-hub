/**
 * INCIDENT-0410(r) — the receipt census must reproduce the measured lake/D1 shapes
 * and must never turn an uncovered day into a loss claim.
 *
 * Every fixture row below is a value returned by a read-only query run on
 * 2026-10-04 (see the commit body): `oc-turso-query` over `lake_candidate_jobs
 * WHERE status = 'SYNCED_TO_D1'` grouped by `date(synced_to_d1_at), source_id`
 * (920 rows over seven days), and `oc-d1-query` over `source_publication_ledger
 * WHERE tick_key LIKE 'lake-sync:%'` grouped the same way (21 receipts,
 * `published_count` summing 393). No row is invented and no constant is compared
 * against a constant: the expected classes and totals are derived from those two
 * shapes by hand.
 */

import { describe, expect, test } from "bun:test";
import {
  INCIDENT,
  buildLakeClaimCensusSql,
  buildLedgerReceiptCensusSql,
  censusPublicationReceipts,
  type ClaimedSyncDayRow,
  type LedgerReceiptDayRow,
  type PublicationReceiptCensus,
} from "./publication-receipt-census";

const MEASURED_CLAIMS: ClaimedSyncDayRow[] = [
  { day: "2026-09-25", sourceId: "breezy:20four7va", claimedRows: 104 },
  { day: "2026-09-25", sourceId: "breezy:remote-craft", claimedRows: 14 },
  { day: "2026-09-25", sourceId: "breezy:sourcefit", claimedRows: 71 },
  { day: "2026-09-25", sourceId: "breezy:value-virtual-assistants", claimedRows: 9 },
  { day: "2026-09-25", sourceId: "breezy:yokly", claimedRows: 11 },
  { day: "2026-09-25", sourceId: "himalayas:remote-jobs", claimedRows: 2 },
  { day: "2026-09-25", sourceId: "jobicy-admin-support-apac", claimedRows: 3 },
  { day: "2026-09-25", sourceId: "jobicy-supporting-apac", claimedRows: 29 },
  { day: "2026-09-25", sourceId: "real-work-from-anywhere", claimedRows: 21 },
  { day: "2026-09-25", sourceId: "remote-ok", claimedRows: 10 },
  { day: "2026-09-25", sourceId: "remotive", claimedRows: 11 },
  { day: "2026-09-25", sourceId: "we-work-remotely", claimedRows: 74 },
  { day: "2026-09-26", sourceId: "greenhouse:canonical", claimedRows: 122 },
  { day: "2026-09-27", sourceId: "ashby:multiplymii", claimedRows: 53 },
  { day: "2026-09-27", sourceId: "greenhouse:remotecom", claimedRows: 8 },
  { day: "2026-09-27", sourceId: "workable:coconutva", claimedRows: 37 },
  { day: "2026-09-27", sourceId: "workable:crewbloom", claimedRows: 29 },
  { day: "2026-09-27", sourceId: "workable:hello-rache", claimedRows: 1 },
  { day: "2026-09-27", sourceId: "workable:hunt-st", claimedRows: 146 },
  { day: "2026-09-27", sourceId: "workable:pearltalent", claimedRows: 18 },
  { day: "2026-09-27", sourceId: "workable:rocketams", claimedRows: 7 },
  { day: "2026-10-01", sourceId: "ashby:multiplymii", claimedRows: 3 },
  { day: "2026-10-01", sourceId: "ashby:the-studio", claimedRows: 3 },
  { day: "2026-10-01", sourceId: "breezy:20four7va", claimedRows: 13 },
  { day: "2026-10-01", sourceId: "breezy:sourcefit", claimedRows: 6 },
  { day: "2026-10-01", sourceId: "breezy:yokly", claimedRows: 1 },
  { day: "2026-10-01", sourceId: "lever:snappr", claimedRows: 13 },
  { day: "2026-10-01", sourceId: "workable:coconutva", claimedRows: 4 },
  { day: "2026-10-01", sourceId: "workable:crewbloom", claimedRows: 5 },
  { day: "2026-10-01", sourceId: "workable:hunt-st", claimedRows: 12 },
  { day: "2026-10-02", sourceId: "ashby:multiplymii", claimedRows: 1 },
  { day: "2026-10-02", sourceId: "greenhouse:extenteam", claimedRows: 16 },
  { day: "2026-10-02", sourceId: "greenhouse:pacificlegalfoundation", claimedRows: 7 },
  { day: "2026-10-02", sourceId: "workable:crewbloom", claimedRows: 1 },
  { day: "2026-10-02", sourceId: "workable:hunt-st", claimedRows: 3 },
  { day: "2026-10-03", sourceId: "ashby:foundry-for-good", claimedRows: 27 },
  { day: "2026-10-03", sourceId: "ashby:gradient", claimedRows: 5 },
  { day: "2026-10-03", sourceId: "greenhouse:3cloud", claimedRows: 16 },
  { day: "2026-10-04", sourceId: "lever:glass-health-inc", claimedRows: 4 },
];

const MEASURED_RECEIPTS: LedgerReceiptDayRow[] = [
  { day: "2026-09-27", sourceId: "ashby:multiplymii", receipts: 1, publishedCount: 53 },
  { day: "2026-09-27", sourceId: "greenhouse:remotecom", receipts: 1, publishedCount: 8 },
  { day: "2026-09-27", sourceId: "workable:coconutva", receipts: 1, publishedCount: 37 },
  { day: "2026-09-27", sourceId: "workable:crewbloom", receipts: 1, publishedCount: 29 },
  { day: "2026-09-27", sourceId: "workable:hello-rache", receipts: 1, publishedCount: 1 },
  { day: "2026-09-27", sourceId: "workable:hunt-st", receipts: 1, publishedCount: 146 },
  { day: "2026-09-27", sourceId: "workable:pearltalent", receipts: 1, publishedCount: 18 },
  { day: "2026-09-27", sourceId: "workable:rocketams", receipts: 1, publishedCount: 7 },
  { day: "2026-10-01", sourceId: "ashby:multiplymii", receipts: 1, publishedCount: 3 },
  { day: "2026-10-01", sourceId: "ashby:the-studio", receipts: 1, publishedCount: 3 },
  { day: "2026-10-01", sourceId: "breezy:20four7va", receipts: 1, publishedCount: 13 },
  { day: "2026-10-01", sourceId: "breezy:sourcefit", receipts: 1, publishedCount: 6 },
  { day: "2026-10-01", sourceId: "breezy:yokly", receipts: 1, publishedCount: 1 },
  { day: "2026-10-01", sourceId: "lever:snappr", receipts: 1, publishedCount: 13 },
  { day: "2026-10-01", sourceId: "workable:coconutva", receipts: 1, publishedCount: 4 },
  { day: "2026-10-01", sourceId: "workable:crewbloom", receipts: 1, publishedCount: 5 },
  { day: "2026-10-01", sourceId: "workable:hunt-st", receipts: 1, publishedCount: 12 },
  { day: "2026-10-02", sourceId: "ashby:multiplymii", receipts: 1, publishedCount: 1 },
  { day: "2026-10-02", sourceId: "workable:crewbloom", receipts: 1, publishedCount: 1 },
  { day: "2026-10-03", sourceId: "ashby:foundry-for-good", receipts: 1, publishedCount: 27 },
  { day: "2026-10-03", sourceId: "ashby:gradient", receipts: 1, publishedCount: 5 },
];

const measured: PublicationReceiptCensus = censusPublicationReceipts({
  claims: MEASURED_CLAIMS,
  receipts: MEASURED_RECEIPTS,
});

function day(census: PublicationReceiptCensus, key: string) {
  const row = census.days.find((d) => d.day === key);
  if (!row) throw new Error(`no census row for ${key}`);
  return row;
}

function source(census: PublicationReceiptCensus, key: string, sourceId: string) {
  const row = census.sources.find((s) => s.day === key && s.sourceId === sourceId);
  if (!row) throw new Error(`no census row for ${key} ${sourceId}`);
  return row;
}

describe("INCIDENT-0410(r) receipt census on the measured shapes", () => {
  test("reproduces the measured claim and receipt totals", () => {
    expect(measured.summary.claimedRowsTotal).toBe(920);
    expect(measured.summary.receiptedPublishedCountTotal).toBe(393);
    expect(measured.summary.daysObserved).toBe(7);
    expect(measured.summary.coveredDays).toBe(4);
  });

  test("classifies the two days whose receipts exactly cover their claims", () => {
    // 09-27: 8 sources, 299 claimed, 299 receipted. 10-01: 9 sources, 60 claimed, 60 receipted.
    for (const [key, claimed, sources] of [
      ["2026-09-27", 299, 8],
      ["2026-10-01", 60, 9],
    ] as const) {
      const row = day(measured, key);
      expect(row.claimedRows).toBe(claimed);
      expect(row.receiptedPublishedCount).toBe(claimed);
      expect(row.sourcesClaimed).toBe(sources);
      expect(row.sourcesWithReceipts).toBe(sources);
      expect(row.evidenceClass).toBe("RECEIPTS_COVER_CLAIMS");
      expect(row.evidenceStrength).toBe("MEASURED");
      expect(row.unevidencedClaimedRows).toBe(0);
    }
  });

  test("covers every 09-27 and 10-01 source one to one", () => {
    const covered = measured.sources.filter((s) => s.evidenceClass === "SOURCE_RECEIPTED");
    // 8 sources on 09-27 + 9 on 10-01, plus the 4 sources that were receipted inside the two
    // gap days (10-02 multiplymii and crewbloom, 10-03 foundry-for-good and gradient).
    expect(covered.length).toBe(21);
    expect(
      covered.filter((s) => s.day === "2026-09-27" || s.day === "2026-10-01").length,
    ).toBe(17);
    expect(
      covered.every((s) => s.receiptedPublishedCount === s.claimedRows && s.claimedRows > 0),
    ).toBe(true);
  });

  test("sizes the shortfall inside covered days at 42 claims over four source-days", () => {
    // 10-02: 28 claimed / 2 receipted; 10-03: 48 / 32. 10-04 carries no receipt at all,
    // so it is coverage UNKNOWN and must not be added to the total.
    expect(day(measured, "2026-10-02").unevidencedClaimedRows).toBe(26);
    expect(day(measured, "2026-10-03").unevidencedClaimedRows).toBe(16);
    expect(day(measured, "2026-10-04").unevidencedClaimedRows).toBeNull();
    expect(measured.summary.unevidencedClaimedRowsInCoveredDays).toBe(42);
    expect(measured.summary.coveredClaimedRows).toBe(299 + 60 + 28 + 48);
    expect(measured.summary.coveredReceiptedPublishedCount).toBe(299 + 60 + 2 + 32);
  });

  test("names the four source-days whose claims have no receipt", () => {
    const gaps = measured.sources.filter((s) => s.unevidencedClaimedRows !== null);
    expect(
      gaps.map((s) => `${s.day} ${s.sourceId} ${s.unevidencedClaimedRows}`).sort(),
    ).toEqual([
      "2026-10-02 greenhouse:extenteam 16",
      "2026-10-02 greenhouse:pacificlegalfoundation 7",
      "2026-10-02 workable:hunt-st 3",
      "2026-10-03 greenhouse:3cloud 16",
    ]);
  });

  test("names greenhouse:3cloud as a gap inside a partially receipted batch", () => {
    expect(source(measured, "2026-10-03", "greenhouse:3cloud")).toMatchObject({
      claimedRows: 16,
      receiptedPublishedCount: 0,
      receipts: 0,
      evidenceClass: "SOURCE_CLAIM_UNRECEIPTED_COVERED_DAY",
      evidenceStrength: "MEASURED",
      unevidencedClaimedRows: 16,
    });
    // Its two sibling sources that day did produce receipts, which is what makes this day
    // covered and this source's shortfall measured rather than unknown.
    expect(source(measured, "2026-10-03", "ashby:foundry-for-good").evidenceClass).toBe(
      "SOURCE_RECEIPTED",
    );
    expect(source(measured, "2026-10-03", "ashby:gradient").evidenceClass).toBe("SOURCE_RECEIPTED");
  });

  test("keeps the pre-receipt days and the 06:47Z four rows UNKNOWN, not counted as loss", () => {
    // The receipt statement shipped in commit d994ce4e (2026-09-27T03:01Z), so the 481 claims
    // stamped on 09-25 and 09-26 carry no coverage. 10-04 has no receipt that day either;
    // session 33 reconciled its 4 rows from the run window instead, which this census does not claim.
    expect(day(measured, "2026-09-25").evidenceClass).toBe("CLAIMS_NO_RECEIPT_ANYWHERE");
    expect(day(measured, "2026-09-25").evidenceStrength).toBe("UNKNOWN");
    expect(day(measured, "2026-09-26").unevidencedClaimedRows).toBeNull();
    expect(day(measured, "2026-10-04").evidenceClass).toBe("CLAIMS_NO_RECEIPT_ANYWHERE");
    expect(measured.summary.uncoveredDays).toBe(3);
    expect(measured.summary.coveredClaimedRows + 359 + 122 + 4).toBe(920);
    expect(source(measured, "2026-10-04", "lever:glass-health-inc")).toMatchObject({
      evidenceClass: "SOURCE_CLAIM_COVERAGE_UNKNOWN",
      evidenceStrength: "UNKNOWN",
      unevidencedClaimedRows: null,
    });
  });

  test("sums per-source shortfalls to the day total and never beyond covered days", () => {
    const perSource = measured.sources.reduce((acc, s) => acc + (s.unevidencedClaimedRows ?? 0), 0);
    expect(perSource).toBe(42);
    expect(measured.summary.unevidencedClaimedRowsInCoveredDays).toBe(perSource);
  });

  test("flags receipts that no lake claim explains instead of discarding them", () => {
    expect(
      measured.sources.filter((s) => s.evidenceClass === "RECEIPT_WITHOUT_SOURCE_CLAIM").length,
    ).toBe(0);
    const orphan = censusPublicationReceipts({
      claims: [],
      receipts: [
        { day: "2026-10-05", sourceId: "ashby:the-studio", receipts: 1, publishedCount: 3 },
      ],
    });
    expect(orphan.days[0]?.evidenceClass).toBe("RECEIPTS_NO_CLAIMS");
    expect(orphan.sources[0]).toMatchObject({
      evidenceClass: "RECEIPT_WITHOUT_SOURCE_CLAIM",
      claimedRows: 0,
      unevidencedClaimedRows: null,
    });
  });

  test("never claims repair authority, publication effect, or fresh flow", () => {
    expect(INCIDENT).toBe("INCIDENT-0410(r)");
    expect(measured.invariants.decisionClass).toBe("L1_ADVISE");
    expect(measured.invariants.repairAuthority).toBe("NONE");
    expect(measured.invariants.publicationEffect).toBe("NONE");
    expect(measured.invariants.coverageRule).toContain("UNKNOWN");
    expect(measured.invariants.lossClaimRule).toContain("upper bound");
    expect(measured.nextEvidence).toContain("lake-publish-job");
    expect(measured.caveats.join(" ")).toContain("can neither confirm nor refute a claim");
  });

  test("an empty history is NO_ACTIVITY rather than a zero loss", () => {
    const empty = censusPublicationReceipts({ claims: [], receipts: [] });
    expect(empty.days).toEqual([]);
    expect(empty.sources).toEqual([]);
    expect(empty.summary).toMatchObject({
      daysObserved: 0,
      coveredDays: 0,
      uncoveredDays: 0,
      unevidencedClaimedRowsInCoveredDays: 0,
    });
  });

  test("a lone claim with no receipt anywhere stays UNKNOWN and adds nothing", () => {
    const census = censusPublicationReceipts({
      claims: [{ day: "2026-10-06", sourceId: "lever:x", claimedRows: 9 }],
      receipts: [],
    });
    expect(census.days[0]).toMatchObject({
      evidenceClass: "CLAIMS_NO_RECEIPT_ANYWHERE",
      evidenceStrength: "UNKNOWN",
      unevidencedClaimedRows: null,
    });
    expect(census.summary.unevidencedClaimedRowsInCoveredDays).toBe(0);
  });

  test("splits a mixed day: covered sources, one gap, and the day total agrees", () => {
    const census = censusPublicationReceipts({
      claims: [
        { day: "2026-10-07", sourceId: "a:one", claimedRows: 5 },
        { day: "2026-10-07", sourceId: "a:two", claimedRows: 3 },
        { day: "2026-10-07", sourceId: "a:three", claimedRows: 2 },
      ],
      receipts: [{ day: "2026-10-07", sourceId: "a:one", receipts: 2, publishedCount: 5 }],
    });
    expect(day(census, "2026-10-07")).toMatchObject({
      evidenceClass: "RECEIPT_GAP",
      evidenceStrength: "MEASURED",
      unevidencedClaimedRows: 5,
    });
    expect(source(census, "2026-10-07", "a:two").unevidencedClaimedRows).toBe(3);
    expect(source(census, "2026-10-07", "a:three").unevidencedClaimedRows).toBe(2);
    expect(census.summary.unevidencedClaimedRowsInCoveredDays).toBe(5);
  });
});

describe("INCIDENT-0410(r) census SQL", () => {
  test("reads only, and pins the exact predicates the measurement depends on", () => {
    const lake = buildLakeClaimCensusSql();
    const ledger = buildLedgerReceiptCensusSql();
    expect(lake.args).toEqual([]);
    expect(ledger.args).toEqual([]);
    expect(lake.sql).toContain("status = 'SYNCED_TO_D1'");
    expect(lake.sql).toContain("date(synced_to_d1_at)");
    expect(ledger.sql).toContain("tick_key LIKE 'lake-sync:%'");
    expect(ledger.sql).toContain("SUM(published_count)");
    for (const sql of [lake.sql, ledger.sql]) {
      expect(sql.trimStart().startsWith("SELECT")).toBe(true);
      expect(sql).not.toMatch(
        /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|ATTACH|PRAGMA|VACUUM|REPLACE)\b/,
      );
    }
  });
});