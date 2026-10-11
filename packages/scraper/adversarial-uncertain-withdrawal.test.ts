import { expect, test, describe } from "bun:test";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import {
  uncertainMatchedManilaStillPublicCount,
  withdrawalSafeManilaStillPublicCount,
  uncertainMatchedManilaDayFlowCount,
  withdrawalSafeManilaDayFlowCount,
  activeMatchedManilaStillPublicCount,
  activeMatchedManilaDayFlowCount,
  latestManilaSnapshotPair,
  type ManilaSnapshotPair,
} from "./manila-day";

function manilaDateOf(instant: string): string {
  return new Date(Date.parse(instant) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
import {
  recordLostAcknowledgement,
  withdrawUnreceiptedAcknowledgements,
  PUBLICATION_UNRECEIPTED_INACTIVE_REASON,
  type UncertaintyDatabase,
} from "./publication-uncertainty";
import { publicationTickKey } from "./publication-gateway";
import { PUBLIC_PH_ELIGIBILITIES } from "./publication-eligibility";

const NOW = new Date().toISOString();
const TICK = publicationTickKey("scrape", NOW);
const DAY_MS = 86_400_000;
const FRESH_POSTED_AT = new Date(Date.parse(NOW) - DAY_MS).toISOString();

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0000_workable_sandman.sql", "0003_yielding_maelstrom.sql", "0005_harsh_punisher.sql",
    "0021_geo_eligibility.sql", "0026_fts5_search.sql", "0027_fts5_trigger_scope.sql",
    "0028_opportunity_inactive_reason.sql", "0034_opportunity_source_id.sql",
    "0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql", "0039_canary_transition_plane.sql",
    "0040_current_evidence_admission.sql", "0041_publication_ledger.sql",
    "0042_d1_like_glob_limit.sql", "0056_publication_outcome_uncertainty.sql",
    "0057_publication_reservation.sql", "0058_publication_portfolio_measurement.sql",
    "0059_publication_serving_measurement.sql", "0060_publication_portfolio_divergence.sql",
    "0061_publication_manila_day.sql", "0062_publication_manila_still_public.sql",
    "0063_publication_manila_open_snapshot.sql", "0064_publication_portfolio_book_total.sql",
    "0065_publication_portfolio_book_membership.sql", "0066_publication_portfolio_source_counts.sql",
    "0067_publication_portfolio_job_identity.sql", "0068_publication_manila_snapshot_ids.sql",
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "../db/migrations", migration), "utf-8"));
  }
  return db;
}

class BunUncertaintyDb implements UncertaintyDatabase {
  constructor(private readonly db: Database) {}
  prepare(query: string) {
    const db = this.db;
    let boundValues: unknown[] = [];
    return {
      bind(...values: unknown[]) {
        boundValues = values;
        return this;
      },
      async first<T>() {
        return (db.query(query).get(...(boundValues as SQLQueryBindings[])) as T | null) ?? null;
      },
      async run() {
        const res = db.query(query).run(...(boundValues as SQLQueryBindings[]));
        return { success: true, meta: { changes: res.changes } };
      },
    };
  }
}

function writeOpportunity(
  sqlite: Database,
  id: number,
  sourceId = "we-work-remotely",
  isActive = 1,
  inactiveReason: string | null = null,
  phEligibility = "eligible_verified",
  postedAt = FRESH_POSTED_AT,
  locationType = "remote",
) {
  sqlite.query(`INSERT INTO opportunities (
    id, title, company, source_url, source_platform, content_hash, source_id,
    is_active, inactive_reason, ph_eligibility, posted_at, location_type
  ) VALUES (?, 'Challenger test job', 'Challenger Co', ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    `https://example.invalid/job/${id}`,
    sourceId,
    `hash-${id}`,
    sourceId,
    isActive,
    inactiveReason,
    phEligibility,
    postedAt,
    locationType,
  );
}

function seedSnapshotPair(sqlite: Database, today: string, ids: number[]) {
  const idsJson = JSON.stringify(ids);
  sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
    source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
  ) VALUES ('we-work-remotely', ?, 'challenger-test-key', ?, 'OPEN', ?, ?, ?)`).run(
    TICK, today, ids.length, ids.length, NOW,
  );
  sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
    source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
  ) VALUES ('we-work-remotely', ?, 'challenger-test-key', ?, ?, ?, ?)`).run(
    TICK, today, idsJson, idsJson, NOW,
  );
}

function loadSnapshotPairFromDb(sqlite: Database) {
  const counts = (sqlite.query(`SELECT id, retry_key, manila_date, recorded_at, day_state, first_publish_count, still_public_count
    FROM source_publication_manila_open_snapshot`).all() as Array<{
    id: number; retry_key: string; manila_date: string; recorded_at: string; day_state: string;
    first_publish_count: number; still_public_count: number;
  }>).map((row) => ({
    id: row.id,
    retryKey: row.retry_key,
    manilaDate: row.manila_date,
    recordedAt: row.recorded_at,
    dayState: row.day_state,
    firstPublishCount: row.first_publish_count,
    stillPublicCount: row.still_public_count,
  }));
  const ids = (sqlite.query(`SELECT id, retry_key, manila_date, recorded_at, first_publish_ids_json, still_public_ids_json
    FROM source_publication_manila_snapshot_ids`).all() as Array<{
    id: number; retry_key: string; manila_date: string; recorded_at: string;
    first_publish_ids_json: string; still_public_ids_json: string;
  }>).map((row) => ({
    id: row.id,
    retryKey: row.retry_key,
    manilaDate: row.manila_date,
    recordedAt: row.recorded_at,
    firstPublishIds: JSON.parse(row.first_publish_ids_json) as number[],
    stillPublicIds: JSON.parse(row.still_public_ids_json) as number[],
  }));
  return { counts, ids };
}

describe("Adversarial Challenge: State Preservation and Non-Mutation Invariant", () => {
  test("read operations never mutate SQLite state, never append ledger rows, never insert CLOSED rows", () => {
    const sqlite = freshDb();
    const today = manilaDateOf(NOW);
    seedSnapshotPair(sqlite, today, [1, 2, 3, 4, 5]);

    for (let i = 1; i <= 5; i++) {
      writeOpportunity(sqlite, i, "we-work-remotely", 1, null);
    }

    // Capture bit-for-bit serialized state before any reader calls
    const serializedBefore = sqlite.serialize();
    const ledgerCountBefore = sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get() as { n: number };
    const closedCountBefore = sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get() as { n: number };
    const totalSnapshotRowsBefore = sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot").get() as { n: number };

    expect(ledgerCountBefore.n).toBe(0);
    expect(closedCountBefore.n).toBe(0);
    expect(totalSnapshotRowsBefore.n).toBe(1);

    const loaded = loadSnapshotPairFromDb(sqlite);
    const pair = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(pair).not.toBeNull();

    const urlRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceUrl: `https://example.invalid/job/${id}` }));
    const ownedRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceId: "we-work-remotely" }));

    // Run thousands of combinations of adversarial read calls
    const adversarialDayStates = ["OPEN", "CLOSED", "UNKNOWN", "", " ", "'; DROP TABLE opportunities; --", "CLOSED\0", "open", "closed", "1", "0"];
    const adversarialCounts = [null, 0, 1, 5, 100, 150, -1, NaN, Infinity, -Infinity, 1.5, 9007199254740992];
    const adversarialUncertainIds = [[], [1], [3], [5], [1, 2, 3, 4, 5], [999], [-1], [0], [3, 3, 3], [100, 200]];
    const adversarialActiveIds = [[1, 2, 3, 4, 5], [1, 2, 4, 5], [1, 2, 3], [], [5, 4, 3, 2, 1], [1, 2, 3, 4, 5, 6]];

    for (const dayState of adversarialDayStates) {
      for (const cnt of adversarialCounts) {
        uncertainMatchedManilaDayFlowCount(dayState, cnt);
        withdrawalSafeManilaDayFlowCount(dayState, cnt);
        activeMatchedManilaDayFlowCount(dayState, cnt);
      }
    }

    for (const uncIds of adversarialUncertainIds) {
      for (const actIds of adversarialActiveIds) {
        uncertainMatchedManilaStillPublicCount(5, pair, urlRows, ownedRows, "we-work-remotely", actIds, uncIds);
        withdrawalSafeManilaStillPublicCount(5, pair, urlRows, ownedRows, "we-work-remotely", actIds, uncIds);
      }
    }

    // Call with corrupt pairs
    uncertainMatchedManilaStillPublicCount(5, null, urlRows, ownedRows, "we-work-remotely", [1, 2, 3, 4, 5], []);
    withdrawalSafeManilaStillPublicCount(5, null, urlRows, ownedRows, "we-work-remotely", [1, 2, 3, 4, 5], []);

    // Verify bit-for-bit serialized state after all reader operations
    const serializedAfter = sqlite.serialize();
    expect(Buffer.from(serializedAfter).equals(Buffer.from(serializedBefore))).toBe(true);

    // Verify explicit tables
    const ledgerCountAfter = sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get() as { n: number };
    const closedCountAfter = sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get() as { n: number };
    const totalSnapshotRowsAfter = sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot").get() as { n: number };

    expect(ledgerCountAfter.n).toBe(0);
    expect(closedCountAfter.n).toBe(0);
    expect(totalSnapshotRowsAfter.n).toBe(1);

    sqlite.close();
  });
});

describe("Adversarial Challenge: Opportunity Withdrawal Invariant (Fail-Closed)", () => {
  test("withdrawing opportunity via inactive_reason = 'publication-unreceipted' causes reader to fail closed (null)", async () => {
    const sqlite = freshDb();
    const db = new BunUncertaintyDb(sqlite);
    const today = manilaDateOf(NOW);
    seedSnapshotPair(sqlite, today, [1, 2, 3, 4, 5]);

    for (let i = 1; i <= 5; i++) {
      writeOpportunity(sqlite, i, "we-work-remotely", 1, null);
    }

    const loaded = loadSnapshotPairFromDb(sqlite);
    const pair = latestManilaSnapshotPair(loaded.counts, loaded.ids, today)!;
    const urlRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceUrl: `https://example.invalid/job/${id}` }));
    const ownedRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceId: "we-work-remotely" }));

    // Before withdrawal: clean active list [1, 2, 3, 4, 5] matches
    const beforeActiveIds = (sqlite.query("SELECT id FROM opportunities WHERE is_active = 1 ORDER BY id").all() as Array<{ id: number }>).map((r) => r.id);
    expect(beforeActiveIds).toEqual([1, 2, 3, 4, 5]);

    const initialMatched = uncertainMatchedManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", beforeActiveIds, [],
    );
    expect(initialMatched).toBe(5);
    expect(withdrawalSafeManilaStillPublicCount(5, pair, urlRows, ownedRows, "we-work-remotely", beforeActiveIds, [])).toBe(5);

    // Record an uncertainty marker for id 3
    await recordLostAcknowledgement(db, {
      sourceId: "we-work-remotely", tickKey: TICK, retryKey: "ack-retry", now: NOW,
    }, [3]);

    // Execute real withdrawal function
    const withdrawalResult = await withdrawUnreceiptedAcknowledgements(db, NOW);
    expect(withdrawalResult.withdrawnIds).toEqual([3]);

    // Verify opportunity 3 is now deactivated in SQLite
    const withdrawnRow = sqlite.query("SELECT is_active, inactive_reason FROM opportunities WHERE id = 3").get() as { is_active: number; inactive_reason: string };
    expect(withdrawnRow.is_active).toBe(0);
    expect(withdrawnRow.inactive_reason).toBe(PUBLICATION_UNRECEIPTED_INACTIVE_REASON);

    // Query active IDs from DB after withdrawal
    const afterActiveIds = (sqlite.query("SELECT id FROM opportunities WHERE is_active = 1 ORDER BY id").all() as Array<{ id: number }>).map((r) => r.id);
    expect(afterActiveIds).toEqual([1, 2, 4, 5]);

    // Empirical test: uncertainMatchedManilaStillPublicCount MUST FAIL CLOSED (return null)
    const afterMatched = uncertainMatchedManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", afterActiveIds, [],
    );
    expect(afterMatched).toBeNull();
    expect(afterMatched).not.toBe(4);
    expect(afterMatched).not.toBe(5);
    expect(afterMatched).not.toBe(0);

    // Also alias must fail closed
    const afterAliasMatched = withdrawalSafeManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", afterActiveIds, [],
    );
    expect(afterAliasMatched).toBeNull();

    // Completed flow count must also fail closed
    expect(uncertainMatchedManilaDayFlowCount("OPEN", afterMatched)).toBeNull();
    expect(withdrawalSafeManilaDayFlowCount("OPEN", afterMatched)).toBeNull();

    sqlite.close();
  });

  test("withdrawing opportunity via inactive_reason = 'publication-drift' causes reader to fail closed (null)", () => {
    const sqlite = freshDb();
    const today = manilaDateOf(NOW);
    seedSnapshotPair(sqlite, today, [1, 2, 3, 4, 5]);

    for (let i = 1; i <= 5; i++) {
      writeOpportunity(sqlite, i, "we-work-remotely", 1, null);
    }

    const loaded = loadSnapshotPairFromDb(sqlite);
    const pair = latestManilaSnapshotPair(loaded.counts, loaded.ids, today)!;
    const urlRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceUrl: `https://example.invalid/job/${id}` }));
    const ownedRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceId: "we-work-remotely" }));

    // Deactivate opportunity 2 due to publication-drift (e.g. workplace became onsite/hybrid)
    sqlite.query(`UPDATE opportunities
      SET is_active = 0, inactive_reason = 'publication-drift', location_type = 'onsite'
      WHERE id = 2`).run();

    const activeIdsAfterDrift = (sqlite.query("SELECT id FROM opportunities WHERE is_active = 1 ORDER BY id").all() as Array<{ id: number }>).map((r) => r.id);
    expect(activeIdsAfterDrift).toEqual([1, 3, 4, 5]);

    // Reader must fail closed to null
    const matched = uncertainMatchedManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", activeIdsAfterDrift, [],
    );
    expect(matched).toBeNull();
    expect(matched).not.toBe(4);
    expect(matched).not.toBe(5);
    expect(matched).not.toBe(0);

    expect(withdrawalSafeManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", activeIdsAfterDrift, [],
    )).toBeNull();

    sqlite.close();
  });

  test("deactivating any subset of snapshot IDs fails closed", () => {
    const sqlite = freshDb();
    const today = manilaDateOf(NOW);
    seedSnapshotPair(sqlite, today, [1, 2, 3, 4, 5]);
    const loaded = loadSnapshotPairFromDb(sqlite);
    const pair = latestManilaSnapshotPair(loaded.counts, loaded.ids, today)!;
    const urlRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceUrl: `https://example.invalid/job/${id}` }));
    const ownedRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceId: "we-work-remotely" }));

    const subsetsToTest = [
      [2, 3, 4, 5], // missing 1
      [1, 3, 4, 5], // missing 2
      [1, 2, 4, 5], // missing 3
      [1, 2, 3, 5], // missing 4
      [1, 2, 3, 4], // missing 5
      [1],
      [],
    ];

    for (const subset of subsetsToTest) {
      expect(uncertainMatchedManilaStillPublicCount(
        5, pair, urlRows, ownedRows, "we-work-remotely", subset, [],
      )).toBeNull();
      expect(withdrawalSafeManilaStillPublicCount(
        5, pair, urlRows, ownedRows, "we-work-remotely", subset, [],
      )).toBeNull();
    }

    sqlite.close();
  });
});

describe("Adversarial Challenge: Unconfirmed Uncertainty Marker Invariant (Fail-Closed)", () => {
  test("adding unconfirmed uncertainty marker without ledger receipt causes reader to fail closed (null)", async () => {
    const sqlite = freshDb();
    const db = new BunUncertaintyDb(sqlite);
    const today = manilaDateOf(NOW);
    seedSnapshotPair(sqlite, today, [1, 2, 3, 4, 5]);

    for (let i = 1; i <= 5; i++) {
      writeOpportunity(sqlite, i, "we-work-remotely", 1, null);
    }

    const loaded = loadSnapshotPairFromDb(sqlite);
    const pair = latestManilaSnapshotPair(loaded.counts, loaded.ids, today)!;
    const urlRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceUrl: `https://example.invalid/job/${id}` }));
    const ownedRows = [1, 2, 3, 4, 5].map((id) => ({ id, sourceId: "we-work-remotely" }));
    const allActiveIds = [1, 2, 3, 4, 5];

    // Case 1: ID 3 has unconfirmed uncertainty marker added to publication_outcome_uncertainty
    await recordLostAcknowledgement(db, {
      sourceId: "we-work-remotely", tickKey: TICK, retryKey: "unconfirmed-retry", now: NOW,
    }, [3]);

    // Query unconfirmed uncertain IDs from DB without ledger receipt
    const uncertainRows = sqlite.query(`SELECT opportunity_ids_json FROM publication_outcome_uncertainty
      WHERE source_id = 'we-work-remotely'`).all() as Array<{ opportunity_ids_json: string }>;
    const unreceiptedIds = uncertainRows.flatMap((r) => JSON.parse(r.opportunity_ids_json) as number[]);
    expect(unreceiptedIds).toContain(3);

    // Verify NO ledger receipt exists for ID 3
    const ledgerCheck = sqlite.query(`SELECT COUNT(*) AS n FROM source_publication_ledger
      WHERE EXISTS (SELECT 1 FROM json_each(published_ids_json) WHERE value = 3)`).get() as { n: number };
    expect(ledgerCheck.n).toBe(0);

    // Reader called with all IDs active, but uncertainIds contains [3]
    const matchedWithUncertain = uncertainMatchedManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", allActiveIds, unreceiptedIds,
    );
    expect(matchedWithUncertain).toBeNull();
    expect(matchedWithUncertain).not.toBe(5);
    expect(matchedWithUncertain).not.toBe(4);
    expect(matchedWithUncertain).not.toBe(0);

    expect(withdrawalSafeManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", allActiveIds, unreceiptedIds,
    )).toBeNull();

    // Case 2: Test every single ID in the snapshot pair individually marked as uncertain
    for (const testId of [1, 2, 3, 4, 5]) {
      const singleUncertain = uncertainMatchedManilaStillPublicCount(
        5, pair, urlRows, ownedRows, "we-work-remotely", allActiveIds, [testId],
      );
      expect(singleUncertain).toBeNull();
      expect(withdrawalSafeManilaStillPublicCount(
        5, pair, urlRows, ownedRows, "we-work-remotely", allActiveIds, [testId],
      )).toBeNull();
    }

    // Case 3: Multiple uncertain IDs in snapshot
    expect(uncertainMatchedManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", allActiveIds, [2, 4],
    )).toBeNull();

    // Case 4: Uncertain ID not in snapshot pair (e.g. ID 999) does not taint the snapshot
    expect(uncertainMatchedManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", allActiveIds, [999],
    )).toBe(5);

    // Case 5: Uncertain ID list with duplicates
    expect(uncertainMatchedManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", allActiveIds, [3, 3, 3],
    )).toBeNull();

    // Case 6: Both uncertain and inactive
    expect(uncertainMatchedManilaStillPublicCount(
      5, pair, urlRows, ownedRows, "we-work-remotely", [1, 2, 4, 5], [3],
    )).toBeNull();

    sqlite.close();
  });
});

describe("Adversarial Challenge: Flow Count Invariant (Never Completed Flow)", () => {
  test("uncertainMatchedManilaDayFlowCount and withdrawalSafeManilaDayFlowCount fail closed under all state and count combinations", () => {
    const states = ["OPEN", "CLOSED", "UNKNOWN", "", "arbitrary", "PARTIAL", "COMPLETED", "MATH-08"];
    const counts = [null, 0, 1, 5, 99, 100, 101, 150, 200, -5, NaN, Infinity, -Infinity, 3.14, 9007199254740992];

    for (const state of states) {
      for (const count of counts) {
        const flowResult = uncertainMatchedManilaDayFlowCount(state, count);
        expect(flowResult).toBeNull();

        const aliasResult = withdrawalSafeManilaDayFlowCount(state, count);
        expect(aliasResult).toBeNull();
      }
    }
  });

  test("alias reference equality and contract identity", () => {
    expect(withdrawalSafeManilaStillPublicCount).toBe(uncertainMatchedManilaStillPublicCount);
    expect(withdrawalSafeManilaDayFlowCount).toBe(uncertainMatchedManilaDayFlowCount);
  });

  test("adversarial upstream invariant checks fail closed to null", () => {
    const today = manilaDateOf(NOW);
    const validPair: ManilaSnapshotPair = {
      countsId: 1,
      idsId: 1,
      manilaDate: today,
      firstPublishCount: 5,
      stillPublicCount: 5,
      countsRecordedAt: NOW,
      idsRecordedAt: NOW,
      dayState: "OPEN",
      firstPublishIds: [1, 2, 3, 4, 5],
      stillPublicIds: [1, 2, 3, 4, 5],
      idsKnown: true,
      countsMatchIds: true,
    };
    const validUrls = [1, 2, 3, 4, 5].map((id) => ({ id, sourceUrl: `https://example.invalid/job/${id}` }));
    const validOwned = [1, 2, 3, 4, 5].map((id) => ({ id, sourceId: "we-work-remotely" }));
    const validActive = [1, 2, 3, 4, 5];

    // Count mismatch: stillPublicCount does not match stillPublicIds length
    expect(uncertainMatchedManilaStillPublicCount(10, validPair, validUrls, validOwned, "we-work-remotely", validActive, [])).toBeNull();
    expect(uncertainMatchedManilaStillPublicCount(0, validPair, validUrls, validOwned, "we-work-remotely", validActive, [])).toBeNull();
    expect(uncertainMatchedManilaStillPublicCount(-1, validPair, validUrls, validOwned, "we-work-remotely", validActive, [])).toBeNull();

    // Extra active IDs (activeIds is superset [1, 2, 3, 4, 5, 6])
    expect(uncertainMatchedManilaStillPublicCount(5, validPair, validUrls, validOwned, "we-work-remotely", [1, 2, 3, 4, 5, 6], [])).toBeNull();

    // Duplicate active IDs
    expect(uncertainMatchedManilaStillPublicCount(5, validPair, validUrls, validOwned, "we-work-remotely", [1, 2, 3, 4, 4], [])).toBeNull();

    // Duplicate canonical URLs
    const duplicateUrls = [
      { id: 1, sourceUrl: "https://example.invalid/job/1" },
      { id: 2, sourceUrl: "https://example.invalid/job/1" }, // duplicate canonical URL
      { id: 3, sourceUrl: "https://example.invalid/job/3" },
      { id: 4, sourceUrl: "https://example.invalid/job/4" },
      { id: 5, sourceUrl: "https://example.invalid/job/5" },
    ];
    expect(uncertainMatchedManilaStillPublicCount(5, validPair, duplicateUrls, validOwned, "we-work-remotely", validActive, [])).toBeNull();

    // Publishing source mismatch
    const mismatchedSource = [
      { id: 1, sourceId: "we-work-remotely" },
      { id: 2, sourceId: "remotive" }, // foreign source
      { id: 3, sourceId: "we-work-remotely" },
      { id: 4, sourceId: "we-work-remotely" },
      { id: 5, sourceId: "we-work-remotely" },
    ];
    expect(uncertainMatchedManilaStillPublicCount(5, validPair, validUrls, mismatchedSource, "we-work-remotely", validActive, [])).toBeNull();

    // Empty publishing source string
    expect(uncertainMatchedManilaStillPublicCount(5, validPair, validUrls, validOwned, "", validActive, [])).toBeNull();
  });
});
