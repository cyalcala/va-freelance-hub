import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const HASH = "a".repeat(64);
const OTHER_HASH = "b".repeat(64);
const STAGED_AT = "2026-10-08T12:34:56.789Z";
const TABLE = "lake_publication_operations";
type SqlValue = string | number | null;

function descriptor(overrides: Record<string, unknown> = {}) {
  return { lakeCandidateId: 1, lakeFingerprint: "opaque:legacy:1", sourceUrl: "https://example.com/jobs/1", materialSha256: HASH, ...overrides };
}

function insert(db: Database, overrides: Record<string, SqlValue> = {}, mode: "INSERT" | "INSERT OR REPLACE" = "INSERT") {
  const values = { operation_key: "lake:stage:1", source_id: "greenhouse:acme", manifest_hash: HASH,
    candidate_descriptors_json: JSON.stringify([descriptor()]), ...overrides };
  const columns = Object.keys(values);
  db.query(`${mode} INTO ${TABLE} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`).run(...Object.values(values));
}

function row(db: Database, operationKey = "lake:stage:1") {
  return db.query(`SELECT * FROM ${TABLE} WHERE operation_key=?`).get(operationKey);
}

function update(db: Database, values: Record<string, SqlValue>, operationKey = "lake:stage:1", mode: "UPDATE" | "UPDATE OR REPLACE" = "UPDATE") {
  db.query(`${mode} ${TABLE} SET ${Object.keys(values).map((column) => `${column}=?`).join(",")} WHERE operation_key=?`)
    .run(...Object.values(values), operationKey);
}

function descriptorsOfByteLength(bytes: number): string {
  const rows = Array.from({ length: 200 }, (_, index) => descriptor({ lakeCandidateId: index + 1, sourceUrl: `https://example.com/jobs/${index + 1}` }));
  const remaining = bytes - Buffer.byteLength(JSON.stringify(rows), "utf8");
  rows.forEach((entry, index) => {
    const quota = Math.floor(remaining / rows.length) + (index < remaining % rows.length ? 1 : 0);
    entry.sourceUrl += "漢".repeat(Math.floor(quota / 3)) + "x".repeat(quota % 3);
  });
  return JSON.stringify(rows);
}

// These are local storage constraints, not source authority or publication clearance.
describe("0055 private lake publication operation constraints", () => {
  let db: Database;
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys=ON; PRAGMA recursive_triggers=OFF;");
    db.exec(readFileSync(join(import.meta.dir, "migrations", "0055_lake_publication_operations.sql"), "utf-8"));
  });
  afterEach(() => db.close());

  test("migration uses portable parenthesized CASE and complete Wrangler LF/CRLF trigger transport", async () => {
    const migration = readFileSync(join(import.meta.dir, "migrations", "0055_lake_publication_operations.sql"), "utf-8");
    // Existing 0039/0042 tests record D1 parser rejection of unparenthesized CASE.
    // Installed Wrangler transport and local SQLite do not emulate remote D1.
    expect(migration.replace(/--[^\n]*/g, "")).not.toMatch(/(?<!\()\bCASE\b/);
    const { unstable_splitSqlQuery } = await import("wrangler");
    const expectedTriggers = (db.query("SELECT count(*) AS count FROM sqlite_master WHERE type='trigger'").get() as { count: number }).count;
    for (const newline of ["\n", "\r\n"]) {
      const statements = unstable_splitSqlQuery(migration.replace(/\r?\n/g, newline));
      expect(statements).toHaveLength(expectedTriggers + 1);
      const transported = new Database(":memory:");
      try {
        for (const statement of statements) transported.exec(statement);
        expect((transported.query("SELECT count(*) AS count FROM sqlite_master WHERE type='trigger'").get() as { count: number }).count).toBe(expectedTriggers);
        insert(transported);
        const original = row(transported);
        expect(() => insert(transported, { source_id: "greenhouse:other" }, "INSERT OR REPLACE")).toThrow();
        expect(() => transported.query(`DELETE FROM ${TABLE}`).run()).toThrow();
        expect(row(transported)).toEqual(original);
      } finally {
        transported.close();
      }
    }
  });

  test("server-default staging time is an exact valid UTC instant and control fields remain null", () => {
    const clock = () => Date.parse((db.query("SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now') AS now").get() as { now: string }).now);
    const before = clock();
    insert(db);
    const stored = row(db) as { staged_at: string; revision: number; source_identity_hash: null; publication_tick_key: null; committed_receipt_key: null; committed_outcomes_json: null };
    const after = clock();
    expect(stored.staged_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(stored.staged_at).toISOString()).toBe(stored.staged_at);
    expect(Date.parse(stored.staged_at)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(stored.staged_at)).toBeLessThanOrEqual(after);
    expect(stored).toMatchObject({ revision: 0, source_identity_hash: null, publication_tick_key: null, committed_receipt_key: null, committed_outcomes_json: null });
    expect(db.query("SELECT name FROM sqlite_master WHERE type='table'").all()).toEqual([{ name: TABLE }]);
  });

  test("manifest and future identity hashes require exactly 64 lowercase hexadecimal characters", () => {
    for (const column of ["manifest_hash", "source_identity_hash"]) {
      for (const value of ["", "a".repeat(63), "a".repeat(65), "A".repeat(64), "g".repeat(64), HASH + "\0hidden"]) {
        expect(() => insert(db, { [column]: value })).toThrow();
      }
    }
    expect(() => insert(db, { source_identity_hash: OTHER_HASH })).not.toThrow();
  });

  test("descriptors have exactly four typed bounded fields without candidate facts or NUL payloads", () => {
    const missing = descriptor() as Record<string, unknown>;
    delete missing.lakeFingerprint;
    const invalid = [
      null, [], "descriptor", 1, missing,
      ...["title", "company", "evidenceText", "applicationUrl", "postedAt", "sourceId", "publishedIds"].map((field) => descriptor({ [field]: "private fact" })),
      ...[0, -1, 1.5, "1", null, Number.MAX_SAFE_INTEGER + 1].map((lakeCandidateId) => descriptor({ lakeCandidateId })),
      ...["", "f".repeat(129), 1, null, "f\0hidden"].map((lakeFingerprint) => descriptor({ lakeFingerprint })),
      ...["", "https://example.com/" + "x".repeat(2048), 1, null, "https://example.com/\0hidden"].map((sourceUrl) => descriptor({ sourceUrl })),
      ...["", "a".repeat(63), "a".repeat(65), "A".repeat(64), "g".repeat(64), 1, null, HASH + "\0hidden"].map((materialSha256) => descriptor({ materialSha256 })),
    ];
    for (const value of invalid) expect(() => insert(db, { candidate_descriptors_json: JSON.stringify([value]) })).toThrow();
    expect(() => insert(db, { candidate_descriptors_json: JSON.stringify([descriptor({ lakeCandidateId: Number.MAX_SAFE_INTEGER,
      lakeFingerprint: "f".repeat(128), sourceUrl: "https://example.com/" + "x".repeat(2028) })]) })).not.toThrow();
  });

  test("descriptor JSON is an array of 1 to 200 rows with a UTF-8 byte cap of 262144", () => {
    for (const candidate_descriptors_json of ["bad json", "null", "{}", "[]", JSON.stringify(Array.from({ length: 201 }, () => descriptor()))]) {
      expect(() => insert(db, { candidate_descriptors_json })).toThrow();
    }
    const atLimit = descriptorsOfByteLength(262144);
    const overLimit = descriptorsOfByteLength(262145);
    expect(JSON.parse(atLimit)).toHaveLength(200);
    expect(atLimit.length).toBeLessThan(262144);
    expect(overLimit.length).toBeLessThan(262144);
    expect(Buffer.byteLength(atLimit, "utf8")).toBe(262144);
    expect(Buffer.byteLength(overLimit, "utf8")).toBe(262145);
    expect(() => insert(db, { candidate_descriptors_json: atLimit })).not.toThrow();
    expect(() => insert(db, { operation_key: "lake:oversize", candidate_descriptors_json: overLimit })).toThrow();
  });

  test("bounded operation/source identities reject nulls, empty strings, overflow and NUL", () => {
    for (const operation_key of [null, "", "k".repeat(129), "key\0hidden"]) expect(() => insert(db, { operation_key })).toThrow();
    for (const source_id of [null, "", "s".repeat(201), "source\0hidden"]) expect(() => insert(db, { source_id })).toThrow();
    expect(() => insert(db, { operation_key: "k".repeat(128), source_id: "s".repeat(200) })).not.toThrow();
  });

  test("staging timestamps reject noncanonical and normalized calendar rollover values", () => {
    for (const staged_at of [null, "", "2026-10-08", "2026-10-08T12:34:56Z", "2026-10-08T12:34:56.789+00:00",
      "2026-10-08t12:34:56.789z", "2026-02-30T12:34:56.789Z", "2026-02-29T12:34:56.789Z",
      "2026-10-08T24:00:00.000Z", "2026-13-08T12:34:56.789Z", "2026-10-08T12:34:56.789Z\0hidden"]) {
      expect(() => insert(db, { staged_at })).toThrow();
    }
    expect((db.query("SELECT strftime('%Y-%m-%dT%H:%M:%fZ',?,'+0 seconds') AS value").get("2026-02-30T12:34:56.789Z") as { value: string }).value)
      .toBe("2026-03-02T12:34:56.789Z");
    expect(() => insert(db, { staged_at: "2028-02-29T12:34:56.789Z" })).not.toThrow();
  });

  test("all staging material and the staging clock remain immutable on UPDATE", () => {
    insert(db, { staged_at: STAGED_AT });
    const original = row(db);
    for (const change of [{ operation_key: "lake:different" }, { source_id: "greenhouse:other" }, { manifest_hash: OTHER_HASH },
      { candidate_descriptors_json: JSON.stringify([descriptor({ lakeCandidateId: 2 })]) }, { staged_at: "2027-01-01T00:00:00.000Z" }]) {
      expect(() => update(db, { revision: 1, ...change })).toThrow();
      expect(row(db)).toEqual(original);
    }
    update(db, { revision: 1 });
    expect(row(db)).toEqual({ ...(original as object), revision: 1 });
  });

  test("revision is a safe nonnegative integer and each UPDATE advances exactly one", () => {
    for (const revision of [null, -1, 1.5, "not-integer", Number.MAX_SAFE_INTEGER + 1]) expect(() => insert(db, { revision })).toThrow();
    insert(db);
    for (const revision of [null, -1, 0, 1.5, 2, "not-integer"]) expect(() => update(db, { revision })).toThrow();
    update(db, { revision: 1 });
    for (const revision of [1, 3]) expect(() => update(db, { revision })).toThrow();
    update(db, { revision: 2 });
    expect(row(db)).toMatchObject({ revision: 2 });
    insert(db, { operation_key: "lake:max-revision", revision: Number.MAX_SAFE_INTEGER });
    expect(() => update(db, { revision: Number.MAX_SAFE_INTEGER + 1 }, "lake:max-revision")).toThrow();
  });

  test("future control records can be assigned once, then cannot be reset or rebound", () => {
    insert(db);
    update(db, { revision: 1, source_identity_hash: OTHER_HASH });
    update(db, { revision: 2, publication_tick_key: "tick:1" });
    update(db, { revision: 3, committed_receipt_key: "receipt:1", committed_outcomes_json: "[]" });
    const committed = row(db);
    for (const change of [{ source_identity_hash: null }, { source_identity_hash: HASH }, { publication_tick_key: null },
      { publication_tick_key: "tick:2" }, { committed_receipt_key: null, committed_outcomes_json: null },
      { committed_receipt_key: "receipt:2" }, { committed_outcomes_json: "[{}]" }]) {
      expect(() => update(db, { revision: 4, ...change })).toThrow();
      expect(row(db)).toEqual(committed);
    }
    update(db, { revision: 4, source_identity_hash: OTHER_HASH, publication_tick_key: "tick:1",
      committed_receipt_key: "receipt:1", committed_outcomes_json: "[]" });
    expect(row(db)).toEqual({ ...(committed as object), revision: 4 });
  });

  test("future tick and receipt keys have bounded NUL-free storage values", () => {
    for (const publication_tick_key of ["", "t".repeat(257), "tick\0hidden"]) expect(() => insert(db, { publication_tick_key })).toThrow();
    for (const committed_receipt_key of ["", "r".repeat(513), "receipt\0hidden"]) {
      expect(() => insert(db, { source_identity_hash: HASH, publication_tick_key: "tick:1", committed_receipt_key, committed_outcomes_json: "[]" })).toThrow();
    }
    expect(() => insert(db, { source_identity_hash: HASH, publication_tick_key: "t".repeat(256),
      committed_receipt_key: "r".repeat(512), committed_outcomes_json: "[]" })).not.toThrow();
  });

  test("receipt and outcome records form a pair requiring identity and publication tick", () => {
    for (const values of [{ committed_receipt_key: "receipt:1" }, { committed_outcomes_json: "[]" },
      { committed_receipt_key: "receipt:1", committed_outcomes_json: "[]" },
      { source_identity_hash: HASH, committed_receipt_key: "receipt:1", committed_outcomes_json: "[]" },
      { publication_tick_key: "tick:1", committed_receipt_key: "receipt:1", committed_outcomes_json: "[]" }]) {
      expect(() => insert(db, values)).toThrow();
    }
    insert(db);
    for (const values of [{ committed_receipt_key: "receipt:1" }, { committed_outcomes_json: "[]" },
      { committed_receipt_key: "receipt:1", committed_outcomes_json: "[]" }]) {
      expect(() => update(db, { revision: 1, ...values })).toThrow();
      expect(row(db)).toMatchObject({ revision: 0, committed_receipt_key: null, committed_outcomes_json: null });
    }
    update(db, { revision: 1, source_identity_hash: HASH, publication_tick_key: "tick:1",
      committed_receipt_key: "receipt:1", committed_outcomes_json: "[]" });
    expect(row(db)).toMatchObject({ revision: 1, committed_receipt_key: "receipt:1", committed_outcomes_json: "[]" });
  });

  test("future outcomes are JSON arrays bounded by UTF-8 bytes and receipt identity is unique", () => {
    const controls = { source_identity_hash: HASH, publication_tick_key: "tick:1", committed_receipt_key: "receipt:1" };
    for (const committed_outcomes_json of ["bad json", "null", "{}", "1", '"array"']) {
      expect(() => insert(db, { ...controls, committed_outcomes_json })).toThrow();
    }
    const atLimit = JSON.stringify(["漢".repeat(87380)]);
    const overLimit = JSON.stringify(["漢".repeat(87380) + "x"]);
    expect(atLimit.length).toBeLessThan(262144);
    expect(Buffer.byteLength(atLimit, "utf8")).toBe(262144);
    expect(Buffer.byteLength(overLimit, "utf8")).toBe(262145);
    expect(() => insert(db, { ...controls, committed_outcomes_json: overLimit })).toThrow();
    insert(db, { ...controls, committed_outcomes_json: atLimit });
    expect(() => insert(db, { ...controls, operation_key: "lake:stage:2", committed_outcomes_json: "[]" })).toThrow();
    insert(db, { ...controls, operation_key: "lake:stage:2", committed_receipt_key: "receipt:2", committed_outcomes_json: "[]" });
    insert(db, { operation_key: "lake:stage:3" });
    expect(() => update(db, { ...controls, revision: 1, committed_outcomes_json: "[]" }, "lake:stage:3")).toThrow();
    expect(row(db, "lake:stage:3")).toMatchObject({ revision: 0, committed_receipt_key: null });
  });

  test("DELETE cannot erase an operation and reopen its key for changed material", () => {
    insert(db);
    const original = row(db);
    expect(() => db.query(`DELETE FROM ${TABLE} WHERE operation_key=?`).run("lake:stage:1")).toThrow();
    expect(row(db)).toEqual(original);
  });

  test("INSERT OR REPLACE cannot rebind existing source, manifest or descriptors with recursive triggers off", () => {
    expect((db.query("PRAGMA recursive_triggers").get() as { recursive_triggers: number }).recursive_triggers).toBe(0);
    for (const [index, changed] of [
      { source_id: "greenhouse:other" }, { manifest_hash: OTHER_HASH },
      { candidate_descriptors_json: JSON.stringify([descriptor({ lakeFingerprint: "changed" })]) },
    ].entries()) {
      const operation_key = `lake:replace:${index}`;
      insert(db, { operation_key });
      const original = row(db, operation_key);
      expect(() => insert(db, { operation_key, ...changed }, "INSERT OR REPLACE")).toThrow();
      expect(row(db, operation_key)).toEqual(original);
    }
  });

  test("exact material REPLACE preserves original stage, revision and assigned future control records", () => {
    insert(db, { staged_at: STAGED_AT });
    db.query(`UPDATE ${TABLE} SET revision=1, source_identity_hash=?, publication_tick_key=?, committed_receipt_key=?, committed_outcomes_json=? WHERE operation_key=?`)
      .run(OTHER_HASH, "tick:1", "receipt:1", "[]", "lake:stage:1");
    const original = row(db);
    insert(db, { staged_at: "2050-01-01T00:00:00.000Z", revision: 50, source_identity_hash: "c".repeat(64),
      publication_tick_key: "tick:forged", committed_receipt_key: "receipt:forged", committed_outcomes_json: "[{}]" }, "INSERT OR REPLACE");
    expect(row(db)).toEqual(original);
  });

  test("REPLACE cannot erase an existing operation through its unique committed receipt key", () => {
    insert(db);
    const controls = { source_identity_hash: OTHER_HASH, publication_tick_key: "tick:1", committed_receipt_key: "receipt:one", committed_outcomes_json: "[]" };
    update(db, { revision: 1, ...controls });
    const original = row(db);
    expect(() => insert(db, { operation_key: "lake:receipt-rebind", ...controls }, "INSERT OR REPLACE")).toThrow();
    expect(row(db)).toEqual(original);
    expect(row(db, "lake:receipt-rebind")).toBeNull();
  });

  test("UPDATE OR REPLACE cannot assign another operation's receipt and erase its owner", () => {
    insert(db);
    const controls = { source_identity_hash: OTHER_HASH, publication_tick_key: "tick:1", committed_receipt_key: "receipt:one", committed_outcomes_json: "[]" };
    update(db, { revision: 1, ...controls });
    insert(db, { operation_key: "lake:other" });
    const owner = row(db);
    const other = row(db, "lake:other");
    expect(() => update(db, { revision: 1, ...controls }, "lake:other", "UPDATE OR REPLACE")).toThrow();
    expect(row(db)).toEqual(owner);
    expect(row(db, "lake:other")).toEqual(other);
  });
});
