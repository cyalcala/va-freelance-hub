import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const syncUrl = new URL("./sync-to-d1.ts", import.meta.url).href;
const clientUrl = new URL("./client.ts", import.meta.url).href;
const runnerUrl = new URL("../gcp/run-lake-publish.ts", import.meta.url).href;
const enrollUrl = new URL("./enroll-published-sources.ts", import.meta.url).href;
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

/** Isolated child: no inherited lake credentials, .env loading, or shared-suite mocks. */
async function probe(script: string) {
  const child = Bun.spawn({
    cmd: [process.execPath, "--no-env-file", "--eval", script],
    cwd: repoRoot,
    env: {
      ...process.env,
      TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_ACCOUNT_ID: "", PROXY_SECRET: "", CRON_SECRET: "",
    },
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(exitCode).toBe(0);
  const line = stdout.split(/\r?\n/).find((line) => line.startsWith("FENCE_PROBE="));
  expect(line).toBeDefined();
  return { result: JSON.parse(line!.slice("FENCE_PROBE=".length)), stderr };
}

describe("temporary raw lake publication fence", () => {
  test("default real sync rejects before logging, client creation or options access", async () => {
    const { result } = await probe(`
      const sync = await import(${JSON.stringify(syncUrl)});
      const log = console.log;
      let logs = 0, inventoryReads = 0;
      console.log = () => { logs++; };
      const opts = { get inventory() { inventoryReads++; throw new Error("inventory access"); } };
      let failure;
      try { await sync.syncQualifiedJobsToD1(200, undefined, opts); }
      catch (error) {
        failure = { name: error.name, code: error.code,
          matchesType: typeof sync.RawLakePublicationBlockedError === "function" && error instanceof sync.RawLakePublicationBlockedError };
      }
      log("FENCE_PROBE=" + JSON.stringify({ failure, logs, inventoryReads }));
    `);
    expect(result).toEqual({
      failure: { name: "RawLakePublicationBlockedError", code: "RAW_LAKE_PUBLICATION_BLOCKED", matchesType: true },
      logs: 0, inventoryReads: 0,
    });
  });

  test("only literal true can enter read-only planning", async () => {
    const { result } = await probe(`
      const sync = await import(${JSON.stringify(syncUrl)});
      const log = console.log;
      let logs = 0;
      console.log = () => { logs++; };
      const results = [];
      for (const dryRun of [false, undefined, null, "true", "false", 1, {}, []]) {
        try { await sync.syncQualifiedJobsToD1(200, dryRun); results.push({ resolved: true }); }
        catch (error) { results.push({ name: error.name, code: error.code }); }
      }
      log("FENCE_PROBE=" + JSON.stringify({ results, logs }));
    `);
    expect(result.logs).toBe(0);
    expect(result.results).toHaveLength(8);
    for (const failure of result.results) expect(failure).toEqual({
      name: "RawLakePublicationBlockedError", code: "RAW_LAKE_PUBLICATION_BLOCKED",
    });
  });

  test("synthetic credentials, provided inventory and hold options cannot bypass the fence", async () => {
    const { result } = await probe(`
      import { mock } from "bun:test";
      let clientCalls = 0;
      mock.module(${JSON.stringify(clientUrl)}, () => ({ getLakeClient() {
        clientCalls++; throw new Error("lake access forbidden");
      } }));
      Object.assign(process.env, { TURSO_DATABASE_URL: "invalid-fence-scheme://synthetic",
        TURSO_AUTH_TOKEN: "synthetic", CLOUDFLARE_API_TOKEN: "synthetic", FORCE: "true" });
      const sync = await import(${JSON.stringify(syncUrl)});
      const failures = [];
      for (const holdAutoApproved of [false, true]) {
        try { await sync.syncQualifiedJobsToD1(500, false, { holdAutoApproved,
          inventory: { activeTotal: 1000, bySource: [] }, allowAutoApproved: true }); }
        catch (error) { failures.push({ name: error.name, code: error.code }); }
      }
      console.log("FENCE_PROBE=" + JSON.stringify({ failures, clientCalls }));
    `);
    expect(result.clientCalls).toBe(0);
    expect(result.failures).toHaveLength(2);
    for (const failure of result.failures) expect(failure).toEqual({
      name: "RawLakePublicationBlockedError", code: "RAW_LAKE_PUBLICATION_BLOCKED",
    });
  });

  test("configured GCP default path returns a coded failure without lake access, enrollment or success", async () => {
    const { result } = await probe(`
      import { mock } from "bun:test";
      let clientCalls = 0, enrollCalls = 0, fetchCalls = 0;
      mock.module(${JSON.stringify(clientUrl)}, () => ({ getLakeClient() {
        clientCalls++; throw new Error("lake access forbidden");
      } }));
      mock.module(${JSON.stringify(enrollUrl)}, () => ({ enrollPublishedSources() {
        enrollCalls++; throw new Error("enrollment forbidden");
      } }));
      globalThis.fetch = async () => { fetchCalls++; throw new Error("network forbidden"); };
      Object.assign(process.env, { TURSO_DATABASE_URL: "invalid-fence-scheme://synthetic",
        TURSO_AUTH_TOKEN: "synthetic", CLOUDFLARE_API_TOKEN: "synthetic",
        CLOUDFLARE_ACCOUNT_ID: "synthetic", PROXY_SECRET: "synthetic" });
      const runner = await import(${JSON.stringify(runnerUrl)});
      const log = console.log, events = [];
      console.log = () => {};
      console.error = (line) => events.push(JSON.parse(line));
      const outcome = await runner.runLakePublish();
      log("FENCE_PROBE=" + JSON.stringify({ outcome, events, clientCalls, enrollCalls, fetchCalls }));
    `);
    expect(result.outcome).toMatchObject({ ok: false, syncedCount: 0, errorCode: "RAW_LAKE_PUBLICATION_BLOCKED" });
    expect(result.clientCalls).toBe(0);
    expect(result.enrollCalls).toBe(0);
    expect(result.fetchCalls).toBe(0);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      severity: "ERROR", event: "lake_publish_blocked_raw_publication",
      errorCode: "RAW_LAKE_PUBLICATION_BLOCKED", syncedCount: 0, enrolledSources: 0,
    });
  });

  test("dry-run generates historical SQL from SELECTs and never claims synced jobs", async () => {
    const { result } = await probe(`
      import { mock } from "bun:test";
      let clientCalls = 0;
      const queries = [];
      const job = { id: 1, source_id: "remotive", source_platform: "fixture",
        source_url: "https://example.test/job/1", title: "Synthetic remote role", company: "Fixture",
        category: "other", location_raw: "Philippines", description: null, application_url: null,
        posted_at: null, geo_scope: "ph_only", ph_eligibility: "eligible_verified", fingerprint_hash: "fixture" };
      mock.module(${JSON.stringify(clientUrl)}, () => ({ getLakeClient() {
        clientCalls++;
        return { async execute(query) {
          const sql = typeof query === "string" ? query : query.sql;
          if (!/^\\s*SELECT\\b/i.test(sql)) throw new Error("write forbidden");
          queries.push(sql);
          return { rows: sql.includes("ORDER BY id ASC") ? [job] : [] };
        } };
      } }));
      const sync = await import(${JSON.stringify(syncUrl)});
      const outcome = await sync.syncQualifiedJobsToD1(200, true);
      console.log("FENCE_PROBE=" + JSON.stringify({ outcome, queries, clientCalls }));
    `);
    expect(result.clientCalls).toBe(1);
    expect(result.queries).toHaveLength(3);
    expect(result.outcome).toMatchObject({ syncedCount: 0, generatedStatementCount: 2 });
    expect(result.outcome.sample).toContain("INSERT INTO opportunities");
  });

  test("CLI allow-auto-approved alias cannot bypass the real-publication failure", async () => {
    const child = Bun.spawn({
      cmd: [process.execPath, "--no-env-file", fileURLToPath(new URL("./sync-to-d1.ts", import.meta.url)), "5", "--allow-auto-approved"],
      cwd: repoRoot,
      env: { ...process.env, TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", CLOUDFLARE_API_TOKEN: "" },
      stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("RAW_LAKE_PUBLICATION_BLOCKED");
    expect(stderr).toContain("RawLakePublicationBlockedError");
    expect(stdout).toBe("");
  });
});
