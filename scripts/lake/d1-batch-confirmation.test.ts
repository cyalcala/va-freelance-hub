import { describe, expect, it } from "bun:test";
import {
  formatUnconfirmedPublishNotice,
  parseD1BatchConfirmation,
  selectConfirmedCandidateIds,
} from "./d1-batch-confirmation";

/**
 * INCIDENT-0410(w) — the publisher asserted a durable `SYNCED_TO_D1` receipt for every candidate id
 * after `execSync` returned, without parsing the wrangler output or reading the row back.
 *
 * Measured 2026-10-04 (read-only): `lake_candidate_jobs` held 920 rows in `SYNCED_TO_D1` with
 * `d1_opportunity_id IS NULL` on 920/920, and the newest sync window contained four
 * `lever:glass-health-inc` rows that have no counterpart in prod D1 under any URL form. The receipt
 * therefore described a process exit code, not a landing.
 *
 * These tests exercise the real exported parser and selector. Nothing here compares a constant with
 * itself; every input is wrangler-shaped output the publisher actually receives.
 */

/** What `wrangler d1 execute --file` prints on a fully successful batch. */
const FULL_SUCCESS_OUTPUT = [
  "🌀 Executing 3 SQL statements from /tmp/va-hub-lake-sync-1728000000000.sql",
  '[{"results":[{"changes":1,"last_row_id":1,"duration":0.4}],"success":true,"meta":{"duration":1.2}},' +
    '{"results":[{"changes":1,"last_row_id":2,"duration":0.3}],"success":true,"meta":{"duration":1.1}},' +
    '{"results":[{"changes":1,"last_row_id":3,"duration":0.2}],"success":true,"meta":{"duration":1.0}}]',
  "🌀 Executing 3 SQL statements from /tmp/va-hub-lake-sync-1728000000000.sql",
  "🌀 Done (1.2s)",
  "🌀  Success",
].join("\n");

/** Four candidate upserts plus two per-source publication-ledger receipts in one file. */
const SIX_STATEMENT_OUTPUT = [
  "🌀 Executing 6 SQL statements from /tmp/va-hub-lake-sync-1728000000000.sql",
  "🌀 Done (2.4s)",
  "🌀  Success",
].join("\n");

describe("parseD1BatchConfirmation — a fully executed batch is confirmed", () => {
  it("confirms every candidate when wrangler reports the full statement count", () => {
    const confirmation = parseD1BatchConfirmation(FULL_SUCCESS_OUTPUT, 3);
    expect(confirmation.confirmed).toBe(3);
    expect(confirmation.expected).toBe(3);
    expect(confirmation.method).toBe("statement-count");
  });

  it("confirms every candidate when only the results array is present", () => {
    const withoutBanner = FULL_SUCCESS_OUTPUT.split("\n").filter((line) => !line.startsWith("🌀")).join("\n");
    const confirmation = parseD1BatchConfirmation(withoutBanner, 3);
    expect(confirmation.confirmed).toBe(3);
    expect(confirmation.method).toBe("results-array");
  });

  it("confirms a single --command style payload where one object holds every returned row", () => {
    const singleCommand = '[{"results":[{"source_id":"remotive","count":2},{"source_id":"remote-ok","count":5}],"success":true}]';
    const confirmation = parseD1BatchConfirmation(singleCommand, 3);
    expect(confirmation.confirmed).toBe(2);
    expect(confirmation.method).toBe("results-array");
  });

  it("confirms a batch that also carried publication-ledger receipts after the candidates", () => {
    // 4 candidates plus 2 per-source receipt statements = 6 statements in one file.
    const confirmation = parseD1BatchConfirmation(SIX_STATEMENT_OUTPUT, 4);
    expect(confirmation.confirmed).toBe(4);
  });
});

describe("parseD1BatchConfirmation — a short or unreadable batch is not confirmed", () => {
  it("confirms only the executed prefix when wrangler stops before the end of the file", () => {
    const partial = [
      "🌀 Executing 5 SQL statements from /tmp/va-hub-lake-sync-1728000000000.sql",
      "🌀 Executing 2 SQL statements from /tmp/va-hub-lake-sync-1728000000000.sql",
      "Error: SQLITE_ERROR: no such table: opportunities",
    ].join("\n");
    const confirmation = parseD1BatchConfirmation(partial, 5);
    expect(confirmation.confirmed).toBe(2);
    expect(confirmation.expected).toBe(5);
  });

  it("confirms nothing when the output carries no count at all", () => {
    const confirmation = parseD1BatchConfirmation("🌀 Done (0.4s)\n🌀  Success\n", 3);
    expect(confirmation.confirmed).toBe(0);
    expect(confirmation.method).toBe("unconfirmed");
  });

  it("confirms nothing for an empty or missing output instead of assuming success", () => {
    for (const output of ["", null, undefined]) {
      const confirmation = parseD1BatchConfirmation(output, 4);
      expect(confirmation.confirmed).toBe(0);
      expect(confirmation.method).toBe("unconfirmed");
    }
  });

  it("treats unparseable results JSON as unconfirmed rather than counting characters", () => {
    const broken = '🌀 Executing 3 SQL statements from f.sql\n[["results":[{"changes":1}\n';
    const confirmation = parseD1BatchConfirmation(broken, 3);
    // The banner is authoritative when present, so the broken JSON must not lower a real count.
    expect(confirmation.confirmed).toBe(3);
    const noBanner = broken.split("\n")[1]!;
    expect(parseD1BatchConfirmation(noBanner, 3).confirmed).toBe(0);
  });

  it("never reports more confirmations than candidates requested", () => {
    const confirmation = parseD1BatchConfirmation(FULL_SUCCESS_OUTPUT, 1);
    expect(confirmation.confirmed).toBe(1);
    expect(confirmation.expected).toBe(1);
  });

  it("does not count a bare number in an unrelated line as a statement count", () => {
    const decoy = [
      "Executing migration 0044",
      "Applied 3 migrations in 1.2s",
      "🌀 Done (0.4s)",
    ].join("\n");
    expect(parseD1BatchConfirmation(decoy, 3).confirmed).toBe(0);
  });

  it("takes the most conservative count when wrangler reports two different totals", () => {
    const disagreeing = [
      "🌀 Executing 9 SQL statements from f.sql",
      "🌀 Executing 1 SQL statements from f.sql",
    ].join("\n");
    expect(parseD1BatchConfirmation(disagreeing, 9).confirmed).toBe(1);
  });
});

describe("selectConfirmedCandidateIds — only a confirmed prefix earns a receipt", () => {
  const ids = [1661, 1662, 1663, 1664];

  it("returns every id for a fully confirmed batch", () => {
    const confirmation = parseD1BatchConfirmation(SIX_STATEMENT_OUTPUT, 4);
    expect(selectConfirmedCandidateIds(ids, confirmation)).toEqual(ids);
  });

  it("keeps unconfirmed rows out of the receipt set so the next tick retries them", () => {
    const confirmation = parseD1BatchConfirmation(
      "🌀 Executing 4 SQL statements from f.sql\n🌀 Executing 2 SQL statements from f.sql",
      4,
    );
    expect(selectConfirmedCandidateIds(ids, confirmation)).toEqual([1661, 1662]);
  });

  it("returns nothing when nothing was confirmed", () => {
    const confirmation = parseD1BatchConfirmation("", 4);
    expect(selectConfirmedCandidateIds(ids, confirmation)).toEqual([]);
  });

  it("is idempotent: re-running the selection over the same batch yields the same prefix", () => {
    const confirmation = parseD1BatchConfirmation(SIX_STATEMENT_OUTPUT, 4);
    expect(selectConfirmedCandidateIds(ids, confirmation)).toEqual(
      selectConfirmedCandidateIds(ids, confirmation),
    );
  });
});

describe("formatUnconfirmedPublishNotice — the withheld receipt is observable", () => {
  it("names the event, the counts and the consequence for the unconfirmed rows", () => {
    const confirmation = parseD1BatchConfirmation(
      "🌀 Executing 4 SQL statements from f.sql\n🌀 Executing 2 SQL statements from f.sql",
      4,
    );
    const line = formatUnconfirmedPublishNotice(confirmation, 5);
    expect(line).toContain("PUBLICATION_CLAIMED_NOT_CONFIRMED");
    expect(line).toContain("2/4");
    expect(line).toContain("2/5");
    expect(line).toContain("QUALIFIED_READY");
  });

  it("states the reason the receipt was withheld rather than only the shortfall", () => {
    const confirmation = parseD1BatchConfirmation("🌀 Done (0.4s)", 3);
    const line = formatUnconfirmedPublishNotice(confirmation, 3);
    expect(line).toContain("unconfirmed");
    expect(line).toContain("3");
  });

  it("produces a line that is greppable as a single stable event token", () => {
    const confirmation = parseD1BatchConfirmation("", 1);
    const line = formatUnconfirmedPublishNotice(confirmation, 1);
    expect(line.split("\n")).toHaveLength(1);
    expect(line).toContain("PUBLICATION_CLAIMED_NOT_CONFIRMED");
  });
});