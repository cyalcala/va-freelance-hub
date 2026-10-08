import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { SHADOW_MAX_BYTES } from "../../packages/scraper/candidate-shadow";
import { MAX_RAW_PAYLOAD_CHARS, sha256Hex, storeRawObservation } from "./lake-shared";

type StorageInput = Parameters<typeof storeRawObservation>[1] & { requireCompletePayload?: true };
function input(overrides: Partial<StorageInput> = {}): StorageInput {
  return { sourceId: "greenhouse:test", sourcePlatform: "Greenhouse/test",
    fetchUrl: "https://boards-api.greenhouse.io/v1/boards/test/jobs", httpStatus: 200,
    rawPayload: '{"version":"private-native-items-v1","items":[]}', requireCompletePayload: true, ...overrides };
}
function recordingClient(rows: unknown[] = [{ id: 1 }]) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const client = { async execute(statement: { sql: string; args: unknown[] }) {
    calls.push(statement);
    return { rows };
  } };
  return { client, calls };
}

test("strict storage rejects character truncation before any database call", async () => {
  const f = recordingClient();
  await expect(storeRawObservation(f.client as never, input({ rawPayload: "x".repeat(MAX_RAW_PAYLOAD_CHARS + 1) })))
    .rejects.toThrow();
  expect(f.calls).toEqual([]);
});

test("strict storage rejects UTF-8 expansion even when the character bound fits", async () => {
  const rawPayload = "💼".repeat(SHADOW_MAX_BYTES / 4 + 1);
  expect(rawPayload.length).toBeLessThan(MAX_RAW_PAYLOAD_CHARS);
  expect(new TextEncoder().encode(rawPayload).byteLength).toBe(SHADOW_MAX_BYTES + 4);
  const f = recordingClient();
  await expect(storeRawObservation(f.client as never, input({ rawPayload }))).rejects.toThrow();
  expect(f.calls).toEqual([]);
});

test("strict storage rejects a different response/body hash instead of claiming retained-byte integrity", async () => {
  const f = recordingClient();
  const args = input();
  args.contentHash = sha256Hex(args.rawPayload + "unretained original response bytes");
  await expect(storeRawObservation(f.client as never, args)).rejects.toThrow();
  expect(f.calls).toEqual([]);
});

test("strict storage requires an explicitly supplied actual HTTP 200", async () => {
  for (const httpStatus of [undefined, null, 0, 201, 204, 304, 429, "200", NaN]) {
    const f = recordingClient();
    await expect(storeRawObservation(f.client as never, input({ httpStatus } as never))).rejects.toThrow();
    expect(f.calls).toEqual([]);
  }
});

test("strict storage rejects malformed identities and endpoints before database access", async () => {
  for (const sourceId of ["", " ", "Greenhouse:test", "greenhouse:test\0", "greenhouse:bad tenant"]) {
    const f = recordingClient();
    await expect(storeRawObservation(f.client as never, input({ sourceId }))).rejects.toThrow();
    expect(f.calls).toEqual([]);
  }
  for (const fetchUrl of ["", "not a URL", "/jobs", "file:///jobs", "https://user:password@example.com/jobs",
    "https://example.com/jobs#fragment", " https://example.com/jobs "]) {
    const f = recordingClient();
    await expect(storeRawObservation(f.client as never, input({ fetchUrl }))).rejects.toThrow();
    expect(f.calls).toEqual([]);
  }
});

test("strict storage preserves exact payload and digest at the existing character and UTF-8 boundaries", async () => {
  for (const rawPayload of ["x".repeat(MAX_RAW_PAYLOAD_CHARS), "💼".repeat(SHADOW_MAX_BYTES / 4)]) {
    const f = recordingClient();
    const contentHash = sha256Hex(rawPayload);
    const id = await storeRawObservation(f.client as never, input({ rawPayload, contentHash }));
    expect(id).toBe(1);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.args.slice(3)).toEqual([200, rawPayload, contentHash]);
    expect(f.calls[0]!.sql).toContain("RETURNING id");
  }
});

test("strict storage validates safe positive RETURNING IDs without pretending bad acknowledgements made no write", async () => {
  for (const id of [undefined, null, "1", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, 1n]) {
    const f = recordingClient([{ id }]);
    await expect(storeRawObservation(f.client as never, input())).rejects.toThrow();
    expect(f.calls).toHaveLength(1);
  }
  for (const rows of [[], [{ id: 1 }, { id: 2 }]]) {
    const f = recordingClient(rows);
    await expect(storeRawObservation(f.client as never, input())).rejects.toThrow();
    expect(f.calls).toHaveLength(1);
  }
  const f = recordingClient([{ id: Number.MAX_SAFE_INTEGER }]);
  expect(await storeRawObservation(f.client as never, input())).toBe(Number.MAX_SAFE_INTEGER);
});

test("actual SQLite storage retains exact Unicode bytes/hash with no candidate, registry or publication effects", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`CREATE TABLE lake_raw_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT NOT NULL, source_platform TEXT NOT NULL,
    fetch_url TEXT NOT NULL, http_status INTEGER NOT NULL DEFAULT 200, raw_payload TEXT NOT NULL,
    content_hash TEXT, fetched_at TEXT NOT NULL DEFAULT (datetime('now')), processed INTEGER NOT NULL DEFAULT 0, error_message TEXT
  );
  CREATE TABLE lake_candidate_jobs(id INTEGER PRIMARY KEY);
  CREATE TABLE opportunities(id INTEGER PRIMARY KEY);
  CREATE TABLE source_publication_ledger(id INTEGER PRIMARY KEY);
  CREATE TABLE source_registry(source_id TEXT PRIMARY KEY);`);
  const calls: string[] = [];
  const client = { async execute(statement: { sql: string; args: unknown[] }) {
    calls.push(statement.sql);
    return { rows: sqlite.query(statement.sql).all(...statement.args as any[]) };
  } };
  try {
    const args = input({ rawPayload: '{"version":1,"items":[{"title":"VA – Pilipinas 💼","location":null}]}' });
    const id = await storeRawObservation(client as never, args);
    expect(id).toBe(1);
    const row = sqlite.query("SELECT source_id,source_platform,fetch_url,http_status,raw_payload,content_hash,processed FROM lake_raw_observations WHERE id=?")
      .get(id) as any;
    expect(row).toEqual({ source_id: args.sourceId, source_platform: args.sourcePlatform, fetch_url: args.fetchUrl,
      http_status: 200, raw_payload: args.rawPayload, content_hash: sha256Hex(args.rawPayload), processed: 0 });
    expect(new TextEncoder().encode(row.raw_payload)).toEqual(new TextEncoder().encode(args.rawPayload));
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toMatch(/lake_candidate_jobs|opportunities|source_publication_ledger|source_registry/);
    for (const table of ["lake_candidate_jobs", "opportunities", "source_publication_ledger", "source_registry"]) {
      expect(sqlite.query(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({ count: 0 });
    }
  } finally { sqlite.close(); }
});

test("legacy callers retain truncation, HTTP default and caller hash overrides", async () => {
  const rawPayload = "x".repeat(MAX_RAW_PAYLOAD_CHARS + 1);
  for (const requireCompletePayload of [undefined, false, "true", 1]) {
    const f = recordingClient();
    await storeRawObservation(f.client as never, { ...input(), rawPayload, httpStatus: undefined,
      contentHash: "legacy-feed-body-hash", requireCompletePayload } as never);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.args[3]).toBe(200);
    expect(f.calls[0]!.args[4]).toBe(rawPayload.slice(0, MAX_RAW_PAYLOAD_CHARS));
    expect(f.calls[0]!.args[5]).toBe("legacy-feed-body-hash");
  }
  const f = recordingClient();
  await storeRawObservation(f.client as never, { ...input(), rawPayload, requireCompletePayload: undefined });
  expect(f.calls[0]!.args[4]).toBe(rawPayload.slice(0, MAX_RAW_PAYLOAD_CHARS));
  expect(f.calls[0]!.args[5]).toBe(sha256Hex(rawPayload));
});
