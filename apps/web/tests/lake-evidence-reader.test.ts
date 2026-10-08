import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readLakeEvidenceSnapshot, LAKE_EVIDENCE_MAX_HTTP_BYTES, LAKE_EVIDENCE_MAX_RAW_BYTES, LAKE_EVIDENCE_TIMEOUT_MS } from "../src/lib/lake-evidence-reader";

const sourceId = "greenhouse:fixture";
const env = { TURSO_DATABASE_URL: "libsql://fixture-org.turso.io", TURSO_READONLY_AUTH_TOKEN: "fixture-readonly-token" };
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const emptyResult = () => ({ cols: [], rows: [], affected_row_count: 0, last_insert_rowid: null });
function cell(value: unknown): unknown {
  if (value === null) return { type: "null" };
  if (typeof value === "number") return { type: "integer", value: String(value) };
  return { type: "text", value };
}
function nativeResult(rows: Record<string, unknown>[], keys = Object.keys(rows[0] ?? {})) {
  return { cols: keys.map(name => ({ name, decltype: null })),
    rows: rows.map(row => keys.map(key => cell(row[key]))), affected_row_count: 0, last_insert_rowid: null };
}

/** Actual fixed SELECTs run in SQLite query_only mode; only libSQL's readonly
 * BEGIN spelling is translated to SQLite BEGIN. No client/module mock. */
function fixture() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`CREATE TABLE lake_raw_observations(id INTEGER PRIMARY KEY,source_id TEXT,source_platform TEXT,fetch_url TEXT,http_status INTEGER,raw_payload TEXT,content_hash TEXT,fetched_at TEXT);
    CREATE TABLE lake_candidate_jobs(id INTEGER PRIMARY KEY,raw_observation_id INTEGER,source_id TEXT,source_platform TEXT,source_url TEXT,title TEXT,company TEXT,location_type TEXT,location_raw TEXT,description TEXT,application_url TEXT,posted_at TEXT,fingerprint_hash TEXT);
    CREATE TABLE lake_sightings(id INTEGER PRIMARY KEY,candidate_id INTEGER,raw_observation_id INTEGER,source_id TEXT,source_platform TEXT,source_url TEXT,observed_at TEXT);`);
  const payload = JSON.stringify({ private: "native evidence bytes 界", publicationAuthorized: false });
  sqlite.query("INSERT INTO lake_raw_observations VALUES(1,?,?,?,?,?,?,?)").run(sourceId, "Greenhouse/fixture",
    "https://boards-api.greenhouse.io/v1/boards/fixture/jobs", 200, payload, sha(payload), "2026-10-08 12:00:00");
  for (const id of [1, 2]) sqlite.query("INSERT INTO lake_candidate_jobs VALUES(?,1,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, sourceId, "Greenhouse/fixture", `https://boards.greenhouse.io/fixture/jobs/${id}`, `Writer ${id}`,
      "Fixture", "remote", "Philippines", "Location: Philippines", `https://boards.greenhouse.io/fixture/jobs/${id}`,
      "2026-10-01T00:00:00.000Z", "a".repeat(32));
  const requests: Request[] = [];
  const statements: Array<{ sql: string; args: unknown[] }> = [];
  const cachedSql = new Map<number, string>();
  let mutateRows: ((sql: string, rows: Record<string, unknown>[]) => Record<string, unknown>[]) | undefined;
  let baseUrl: string | undefined;
  let queryOnly = false;
  const prepareReadOnly = () => { sqlite.exec("PRAGMA query_only=ON"); queryOnly = true; };
  function execute(stmt: any) {
    const sql = stmt.sql ?? cachedSql.get(stmt.sql_id);
    if (typeof sql !== "string") throw new Error("Unknown cached fixture statement");
    const args = (stmt.args ?? []).map((arg: any) => arg.type === "integer" ? Number(arg.value) : arg.type === "null" ? null : arg.value);
    statements.push({ sql, args });
    if (sql === "BEGIN TRANSACTION READONLY") { sqlite.exec("BEGIN"); return emptyResult(); }
    if (sql === "COMMIT" || sql === "ROLLBACK") { sqlite.exec(sql); return emptyResult(); }
    if (!/^\s*(SELECT|WITH)\b/.test(sql)) throw new Error(`Unexpected non-read SQL: ${sql}`);
    const statement = sqlite.query(sql);
    const rows = statement.all(...args) as Record<string, unknown>[];
    return nativeResult(mutateRows?.(sql, rows) ?? rows, statement.columnNames);
  }
  const fetch = (async (input: RequestInfo | URL) => {
    if (!queryOnly) prepareReadOnly();
    const request = input as Request;
    requests.push(request);
    const body = JSON.parse(await request.clone().text());
    const results = body.requests.map((req: any) => {
      if (req.type === "store_sql") { cachedSql.set(req.sql_id, req.sql); return { type: "ok", response: { type: req.type } }; }
      if (req.type === "close_sql" || req.type === "close") return { type: "ok", response: { type: req.type } };
      if (req.type !== "batch") throw new Error(`Unexpected protocol request ${req.type}`);
      const step_results: unknown[] = [], step_errors: unknown[] = [];
      function condition(cond: any): boolean {
        if (!cond) return true;
        if (cond.type === "ok") return step_results[cond.step] !== null;
        if (cond.type === "not") return !condition(cond.cond);
        if (cond.type === "and") return cond.conds.every(condition);
        throw new Error(`Unknown fixture condition ${cond.type}`);
      }
      for (const step of req.batch.steps) {
        if (!condition(step.condition)) { step_results.push(null); step_errors.push(null); continue; }
        try { step_results.push(execute(step.stmt)); step_errors.push(null); }
        catch (error) { step_results.push(null); step_errors.push({ message: String(error), code: "SQLITE_ERROR" }); }
      }
      return { type: "ok", response: { type: "batch", result: { step_results, step_errors } } };
    });
    return new Response(JSON.stringify({ baton: null, ...(baseUrl ? { base_url: baseUrl } : {}), results }),
      { headers: { "content-type": "application/json" } });
  }) as typeof globalThis.fetch;
  return { sqlite, fetch, requests, statements, payload,
    mutate(fn: typeof mutateRows) { mutateRows = fn; }, base(url: string) { baseUrl = url; } };
}
const read = (f: ReturnType<typeof fixture>, candidateIds = [2, 1]) => readLakeEvidenceSnapshot({ sourceId, candidateIds, env, fetch: f.fetch });

test("latest sighting is chronological across both retained UTC clock formats", async () => {
  const f = fixture();
  for (const [id, time] of [[1, "2026-10-08T01:00:00.000Z"], [2, "2026-10-08 23:00:00"]] as const) {
    f.sqlite.query("INSERT INTO lake_sightings VALUES(?,1,1,?,?,?,?)").run(id, sourceId,
      "Greenhouse/fixture", "https://boards.greenhouse.io/fixture/jobs/1", time);
  }
  try {
    const result = await read(f);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    expect(result.snapshot.sightingMetadata[0]?.latest_observed_at).toBe("2026-10-08T23:00:00.000Z");
    expect(result.snapshot.qualificationAuthorized).toBe(false);
  } finally { f.sqlite.close(); }
});

test("invalid older sighting clocks cannot hide behind a valid latest observation", async () => {
  const f = fixture();
  for (const [id, time] of [[1, "2026-02-30T01:00:00.000Z"], [2, "2026-10-08 23:00:00"]] as const) {
    f.sqlite.query("INSERT INTO lake_sightings VALUES(?,1,1,?,?,?,?)").run(id, sourceId,
      "Greenhouse/fixture", "https://boards.greenhouse.io/fixture/jobs/1", time);
  }
  try { expect(await read(f)).toMatchObject({ ok: false, code: "LAKE_EVIDENCE_INVALID" }); }
  finally { f.sqlite.close(); }
});

test("one readonly native snapshot loads bounded server rows and deduplicated exact raw bytes", async () => {
  const f = fixture();
  try {
    const result = await read(f);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    expect(result.snapshot.candidates.map(row => row.id)).toEqual([1, 2]);
    expect(result.snapshot.rawObservations).toHaveLength(1);
    expect(result.snapshot.rawObservations[0]).toMatchObject({ id: 1, raw_payload: f.payload, content_hash: sha(f.payload) });
    expect(result.snapshot.sightingMetadata).toEqual([1, 2].map(candidate_id => ({ candidate_id, sighting_count: 0,
      distinct_raw_observation_count: 0, distinct_source_count: 0, distinct_source_url_count: 0, mismatched_sighting_count: 0, latest_observed_at: null, complete: true })));
    expect(result.snapshot.publicationAuthorized).toBe(false);
    expect(result.snapshot.qualificationAuthorized).toBe(false);
    expect(Object.isFrozen(result.snapshot.rawObservations[0])).toBe(true);
    expect(f.statements[0]?.sql).toBe("BEGIN TRANSACTION READONLY");
    expect(f.statements.at(-1)?.sql).toBe("COMMIT");
    expect(f.statements.filter(stmt => /^\s*(SELECT|WITH)\b/.test(stmt.sql))).toHaveLength(3);
    expect(f.statements.every(stmt => !/\b(INSERT|UPDATE|DELETE|REPLACE|opportunities|publication_ledger)\b/.test(stmt.sql))).toBe(true);
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0]!.url).toBe("https://fixture-org.turso.io/v2/pipeline");
    expect(f.requests[0]!.redirect).toBe("manual");
    expect(f.requests[0]!.signal).toBeInstanceOf(AbortSignal);
  } finally { f.sqlite.close(); }
});

test("missing read-only bindings and malformed request identities stop before transport", async () => {
  let calls = 0;
  const fetch = (async () => { calls++; throw new Error("Unexpected I/O"); }) as unknown as typeof globalThis.fetch;
  for (const config of [{}, { TURSO_DATABASE_URL: env.TURSO_DATABASE_URL }, { TURSO_READONLY_AUTH_TOKEN: env.TURSO_READONLY_AUTH_TOKEN }]) {
    expect(await readLakeEvidenceSnapshot({ sourceId, candidateIds: [1], env: config, fetch })).toMatchObject({ ok: false, code: "LAKE_READONLY_BINDING_UNAVAILABLE" });
  }
  for (const candidateIds of [[], [0], [1, 1], ["1"], [NaN], [Number.MAX_SAFE_INTEGER + 1], [1, , 2], Array.from({ length: 201 }, (_, i) => i + 1)]) {
    expect(await readLakeEvidenceSnapshot({ sourceId, candidateIds: candidateIds as number[], env, fetch })).toMatchObject({ ok: false, code: "LAKE_EVIDENCE_REQUEST_INVALID" });
  }
  for (const badSource of ["Greenhouse:fixture", "unattributed", "fixture';DROP", "greenhouse:fixture\0"]) {
    expect(await readLakeEvidenceSnapshot({ sourceId: badSource, candidateIds: [1], env, fetch })).toMatchObject({ ok: false, code: "LAKE_EVIDENCE_REQUEST_INVALID" });
  }
  expect(calls).toBe(0);
});

test("server configuration cannot turn the reader into arbitrary HTTP, local-file or credential-forwarding access", async () => {
  let calls = 0;
  const fetch = (async () => { calls++; throw new Error("Unexpected I/O"); }) as unknown as typeof globalThis.fetch;
  for (const url of ["http://fixture-org.turso.io", "file:private.db", "https://evil.example", "https://fixture-org.turso.io/extra",
    "https://user:password@fixture-org.turso.io", "https://fixture-org.turso.io/?tls=0", "https://fixture-org.turso.io/#secret",
    "https://fixture-org.turso.io:444", "https://fixture-org.turso.io."]) {
    expect(await readLakeEvidenceSnapshot({ sourceId, candidateIds: [1], env: { ...env, TURSO_DATABASE_URL: url }, fetch }))
      .toMatchObject({ ok: false, code: "LAKE_READONLY_BINDING_UNAVAILABLE" });
  }
  expect(calls).toBe(0);
});

test("complete sighting metadata counts every historical source and pointer without selecting a latest authority", async () => {
  const f = fixture();
  f.sqlite.query("INSERT INTO lake_sightings VALUES(?,?,?,?,?,?,?)").run(1, 1, 1, sourceId, "Greenhouse/fixture", "https://boards.greenhouse.io/fixture/jobs/1", "2026-10-08 12:00:00");
  f.sqlite.query("INSERT INTO lake_sightings VALUES(?,?,?,?,?,?,?)").run(2, 1, 9, "greenhouse:other", "Greenhouse/other", "https://boards.greenhouse.io/other/jobs/9", "2026-10-08 12:01:00");
  try {
    const result = await read(f);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    expect(result.snapshot.sightingMetadata[0]).toEqual({ candidate_id: 1, sighting_count: 2,
      distinct_raw_observation_count: 2, distinct_source_count: 2, distinct_source_url_count: 2,
      mismatched_sighting_count: 1, latest_observed_at: "2026-10-08T12:01:00.000Z", complete: true });
    expect(result.snapshot.rawObservations).toHaveLength(1);
  } finally { f.sqlite.close(); }
});

test("a sole wrong source, URL or raw pointer remains explicit correspondence ambiguity", async () => {
  for (const [pointer, source, url] of [[9, sourceId, "https://boards.greenhouse.io/fixture/jobs/1"],
    [1, "greenhouse:other", "https://boards.greenhouse.io/fixture/jobs/1"],
    [1, sourceId, "https://boards.greenhouse.io/fixture/jobs/999"]] as const) {
    const f = fixture();
    f.sqlite.query("INSERT INTO lake_sightings VALUES(1,1,?,?,?,?,'2026-10-08 12:00:00')").run(pointer, source, "Greenhouse/fixture", url);
    try {
      const result = await read(f);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.code);
      expect(result.snapshot.sightingMetadata[0]).toMatchObject({ sighting_count: 1,
        distinct_raw_observation_count: 1, distinct_source_count: 1, distinct_source_url_count: 1,
        mismatched_sighting_count: 1, complete: true });
      expect(result.snapshot.qualificationAuthorized).toBe(false);
    } finally { f.sqlite.close(); }
  }
});

test("missing source-scoped candidates and invalid or cross-source raw pointers cannot return partial snapshots", async () => {
  for (const change of ["DELETE FROM lake_candidate_jobs WHERE id=2", "UPDATE lake_candidate_jobs SET raw_observation_id=NULL WHERE id=2",
    "UPDATE lake_raw_observations SET source_id='greenhouse:other'", "UPDATE lake_raw_observations SET content_hash='bad'"]) {
    const f = fixture(); f.sqlite.exec(change);
    try { expect(await read(f)).toMatchObject({ ok: false, code: "LAKE_EVIDENCE_INVALID" }); }
    finally { f.sqlite.close(); }
  }
});

test("raw byte and material budgets refuse complete reads without returning truncated evidence", async () => {
  for (const change of ["UPDATE lake_raw_observations SET raw_payload=?", "UPDATE lake_candidate_jobs SET description=? WHERE id=1"]) {
    const f = fixture();
    f.sqlite.query(change).run(change.includes("raw_payload") ? "界".repeat(Math.ceil(LAKE_EVIDENCE_MAX_RAW_BYTES / 3)) : "x".repeat(2001));
    try {
      expect(await read(f)).toMatchObject({ ok: false, status: 413, code: "LAKE_EVIDENCE_TOO_LARGE" });
      expect(f.requests).toHaveLength(1);
    } finally { f.sqlite.close(); }
  }
  const f = fixture();
  f.sqlite.query("INSERT INTO lake_raw_observations SELECT 2,source_id,source_platform,fetch_url,http_status,?,content_hash,fetched_at FROM lake_raw_observations").run("x".repeat(600000));
  f.sqlite.query("UPDATE lake_raw_observations SET raw_payload=? WHERE id=1").run("x".repeat(600000));
  f.sqlite.exec("UPDATE lake_candidate_jobs SET raw_observation_id=2 WHERE id=2");
  try { expect(await read(f)).toMatchObject({ ok: false, status: 413, code: "LAKE_EVIDENCE_TOO_LARGE" }); }
  finally { f.sqlite.close(); }
});

test("the exact aggregate raw UTF-8 ceiling is retained without clipping or repeated payloads", async () => {
  const f = fixture();
  const payload = "界".repeat(Math.floor(LAKE_EVIDENCE_MAX_RAW_BYTES / 3)) + "x";
  f.sqlite.query("UPDATE lake_raw_observations SET raw_payload=?,content_hash=?").run(payload, sha(payload));
  try {
    const result = await read(f);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    expect(new TextEncoder().encode(result.snapshot.rawObservations[0]!.raw_payload).byteLength).toBe(LAKE_EVIDENCE_MAX_RAW_BYTES);
    expect(result.snapshot.rawObservations[0]!.raw_payload).toBe(payload);
    expect(result.snapshot.rawObservations).toHaveLength(1);
  } finally { f.sqlite.close(); }
});

test("a malformed earlier sighting cannot hide behind a valid maximum observation clock", async () => {
  const f = fixture();
  for (const [id, observed] of [[1, "2026-02-30 00:00:00"], [2, "2026-10-08 12:00:00"]] as const) {
    f.sqlite.query("INSERT INTO lake_sightings VALUES(?,1,1,?,?,?,?)").run(id, sourceId, "Greenhouse/fixture", "https://boards.greenhouse.io/fixture/jobs/1", observed);
  }
  try { expect(await read(f)).toMatchObject({ ok: false, code: "LAKE_EVIDENCE_INVALID" }); }
  finally { f.sqlite.close(); }
});

test("malformed typed rows, aliases and incomplete metadata fail closed", async () => {
  for (const mutate of [
    (sql: string, rows: Record<string, unknown>[]) => sql.includes("sighting_count") ? [] : rows,
    (sql: string, rows: Record<string, unknown>[]) => sql.includes("fingerprint_hash") ? rows.map(row => ({ ...row, id: String(row.id) })) : rows,
    (sql: string, rows: Record<string, unknown>[]) => sql.includes("fingerprint_hash") ? [...rows, rows[0]!] : rows,
    (sql: string, rows: Record<string, unknown>[]) => sql.includes("fetched_at") ? rows.map(row => ({ ...row, fetched_at: "2026-02-30 00:00:00" })) : rows,
  ]) {
    const f = fixture(); f.mutate(mutate);
    try { expect(await read(f)).toMatchObject({ ok: false, code: "LAKE_EVIDENCE_INVALID" }); }
    finally { f.sqlite.close(); }
  }
});

test("HTTP redirects, foreign provider base URLs, oversized streams and errors never produce evidence or expose credentials", async () => {
  const f = fixture(); f.base("https://evil.example/");
  try { expect(await read(f)).toMatchObject({ ok: false, code: "LAKE_EVIDENCE_READ_FAILED" }); expect(f.requests).toHaveLength(1); }
  finally { f.sqlite.close(); }
  for (const response of [new Response(null, { status: 302, headers: { location: "https://evil.example" } }),
    new Response("x".repeat(LAKE_EVIDENCE_MAX_HTTP_BYTES + 1)), new Response("bad", { status: 500 }), new Response("{not-json")]) {
    let calls = 0;
    const fetch = (async (request: Request) => { calls++; expect(request.redirect).toBe("manual"); return response; }) as typeof globalThis.fetch;
    const result = await readLakeEvidenceSnapshot({ sourceId, candidateIds: [1], env, fetch });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(env.TURSO_READONLY_AUTH_TOKEN);
    expect(calls).toBe(1);
  }
});

test("stream bytes override a false length header and cancel overbudget transport", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array(LAKE_EVIDENCE_MAX_HTTP_BYTES + 1));
  }, cancel() { cancelled = true; } }), { headers: { "content-length": "1" } });
  const fetch = (async () => response) as unknown as typeof globalThis.fetch;
  expect(await readLakeEvidenceSnapshot({ sourceId, candidateIds: [1], env, fetch }))
    .toMatchObject({ ok: false, status: 413, code: "LAKE_EVIDENCE_TOO_LARGE" });
  expect(cancelled).toBe(true);
});

test("the whole read has a finite deadline even if the supplied transport ignores abort", async () => {
  let calls = 0;
  let signal: AbortSignal | undefined;
  const fetch = (async (request: Request) => { calls++; signal = request.signal; return new Promise<Response>(() => {}); }) as typeof globalThis.fetch;
  const result = await readLakeEvidenceSnapshot({ sourceId, candidateIds: [1], env, fetch });
  expect(result).toMatchObject({ ok: false, code: "LAKE_EVIDENCE_READ_FAILED", status: 503 });
  expect(calls).toBe(1);
  expect(signal?.aborted).toBe(true);
}, LAKE_EVIDENCE_TIMEOUT_MS + 3000);
