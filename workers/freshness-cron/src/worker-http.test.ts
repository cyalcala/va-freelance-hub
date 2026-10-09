import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const ROOT = resolve(import.meta.dir, "../../..");
const SECRET = "worker-native-fixture-credential-2b6a";
const PRIVATE_TEXT = "worker-native-private-response-detail-ea20";
const node = Bun.which("node");
const require = createRequire(join(ROOT, "package.json"));
const wrangler = require.resolve("wrangler/package.json");
const miniflare = require.resolve("miniflare", { paths: [wrangler] });
const esbuild = require.resolve("esbuild", { paths: [wrangler] });
const workerd = require.resolve("workerd", { paths: [wrangler] });
const TIMEOUT = 45_000;

// Node hosts Miniflare; the bundled, unchanged retained entrypoint executes in
// the installed native workerd binary. Neither Worker fetch nor HTTP is mocked.
const RUNNER = String.raw`
const fs = require("node:fs/promises");
const http = require("node:http");
const { Miniflare, Log, LogLevel, convertV4MiniflareOptions } = require(process.argv[3]);
const esbuild = require(process.argv[4]);
const runtime = require(process.argv[5]);
const fixture = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
const logs = [];
class CaptureLog extends Log { log(message) { logs.push(message); } }
const requests = [];
const server = http.createServer((request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  requests.push({ method: request.method, path });
  if (path === "/shadow") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ totalRegistryRows: 3, eligible: 0, dispatched: 0,
      skippedIneligible: 3, skippedInvalidProvider: 0, skippedInvalidEvidence: 0,
      skippedRunCap: 0, probeFailures: 0, rejectedProbeResults: 0,
      evidenceErrors: [], invalidProviderErrors: [], outcomes: {} }));
    return;
  }
  if (fixture.mode === "drop") { request.socket.destroy(); return; }
  if (fixture.mode === "truncated") {
    response.writeHead(fixture.status, { "Content-Type": "application/json", "Content-Length": "8000" });
    response.write(fixture.body);
    setImmediate(() => response.destroy());
    return;
  }
  if (fixture.mode === "redirect") {
    response.writeHead(fixture.status, { Location: origin + "/redirect-target" });
    response.end(fixture.body);
    return;
  }
  response.writeHead(fixture.status, { "Content-Type": "application/json" });
  response.end(fixture.body);
});
await new Promise((done, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", done); });
const origin = "http://127.0.0.1:" + server.address().port;
let mf;
let output;
try {
  const build = await esbuild.build({ entryPoints: [fixture.entrypoint], bundle: true,
    format: "esm", platform: "browser", target: "es2022", write: false, logLevel: "silent" });
  mf = new Miniflare(convertV4MiniflareOptions({ host: "127.0.0.1", port: 0, cf: false,
    telemetry: { enabled: false }, log: new CaptureLog(LogLevel.VERBOSE),
    workers: [{ name: "retained-freshness-native-fixture", modules: true,
      script: build.outputFiles[0].text, compatibilityDate: "2026-07-01",
      bindings: { PROXY_SECRET: fixture.secret, SCRAPE_URL: origin + "/scrape", SHADOW_DISPATCH_URL: origin + "/shadow" } }] }));
  await mf.ready;
  if (fixture.scheduledTime !== undefined) {
    const worker = await mf.getWorker();
    try { output = { scheduled: await worker.scheduled({ scheduledTime: fixture.scheduledTime, cron: "*/10 * * * *" }) }; }
    catch (error) { output = { scheduledError: String(error) }; }
  } else {
    const response = await mf.dispatchFetch("http://127.0.0.1/manual", {
      headers: fixture.unauthorized ? {} : { "x-cron-secret": fixture.secret } });
    output = { status: response.status, body: await response.text() };
  }
  await mf.dispose(); mf = undefined;
  output = { ...output, requests, logs, runtime: { workerd: runtime.version,
    binary: runtime.default, miniflare: require(require("node:path").resolve(require("node:path").dirname(process.argv[3]), "../../package.json")).version } };
} catch (error) {
  output = { setupFailure: String(error), logs, requests };
} finally {
  if (mf) await mf.dispose();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
process.stdout.write("__FRESHNESS_NATIVE_RESULT__" + JSON.stringify(output) + "\n");
`;

type FixtureResult = { status: number; body: string; requests: Array<{ method: string; path: string }>;
  logs: string[]; runtime: { workerd: string; binary: string; miniflare: string };
  scheduled?: { outcome: string; noRetry: boolean }; scheduledError?: string; setupFailure?: string };

async function nativeFixture(status: number, body: string, options: Record<string, unknown> = {}): Promise<FixtureResult> {
  if (!node) throw new Error("Native Worker fixture setup requires installed Node.js");
  const directory = await mkdtemp(join(tmpdir(), "freshness-native-"));
  try {
    const runner = join(directory, "runner.cjs");
    // A generated CommonJS bootstrap keeps Miniflare on the installed Node runtime.
    await writeFile(runner, `(async () => {\n${RUNNER}\n})().catch(e => { console.error("NATIVE_FIXTURE_SETUP_FAILED", e); process.exitCode = 1; });\n`);
    const configuration = join(directory, "fixture.json");
    await writeFile(configuration, JSON.stringify({ status, body, secret: SECRET,
      entrypoint: join(ROOT, "workers/freshness-cron/src/index.ts"), ...options }));
    const child = Bun.spawn([node, runner, configuration, miniflare, esbuild, workerd], {
      cwd: directory, env: { PATH: process.env.PATH ?? process.env.Path ?? "",
        SystemRoot: process.env.SystemRoot ?? "C:/Windows", TEMP: directory, TMP: directory },
      stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    if (exitCode !== 0) throw new Error(`Native Worker fixture setup exited ${exitCode}: ${stderr.slice(-2500)}`);
    const lines = stdout.trim().split(/\r?\n/);
    const resultLine = lines.find((line) => line.startsWith("__FRESHNESS_NATIVE_RESULT__"));
    if (!resultLine) throw new Error("Native Worker fixture setup produced no result record");
    const result = JSON.parse(resultLine.slice("__FRESHNESS_NATIVE_RESULT__".length));
    if (result.setupFailure) throw new Error(`Native Worker fixture setup failed: ${result.setupFailure}`);
    // workerd forwards actual Worker console/exception output through native
    // process stdio; retain those lines alongside Miniflare's own Log records.
    result.logs.push(...lines.filter((line) => line !== resultLine), ...stderr.trim().split(/\r?\n/).filter(Boolean));
    return result;
  } finally {
    const target = resolve(directory);
    if (dirname(target).toLowerCase() !== resolve(tmpdir()).toLowerCase() || !basename(target).startsWith("freshness-native-")) {
      throw new Error("Refusing recursive cleanup outside the recorded native fixture directory");
    }
    await rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

test("native retained Worker keeps sanitized UNKNOWN 500 response evidence after one POST", async () => {
  const result = await nativeFixture(500, JSON.stringify({ publicationOutcome: "UNKNOWN",
    reconciliationRequired: true, inserted: null, confirmedPublishedLowerBound: 2,
    message: PRIVATE_TEXT, credential: SECRET }));
  expect(result.requests).toEqual([{ method: "POST", path: "/scrape" }]);
  expect(result.status).toBe(500);
  const body = JSON.parse(result.body);
  expect(body.error).toBe("SCRAPE_RESPONSE_REJECTED");
  expect(body.receipt.publicationOutcome).toBe("UNKNOWN");
  expect(body.receipt.inserted).toBeNull();
  expect(body.receipt.confirmedPublishedLowerBound).toBe(2);
  expect(body.receipt.responseEvidence.httpStatus).toBe(500);
  expect(JSON.stringify(result.logs)).toContain("scrape receipt:");
  expect(result.body + JSON.stringify(result.logs)).not.toContain(SECRET);
  expect(result.body + JSON.stringify(result.logs)).not.toContain(PRIVATE_TEXT);
}, TIMEOUT);

function completed(fields: Record<string, unknown> = {}): string {
  return JSON.stringify({ inserted: 3, actualChanges: 3, skipped: 0, backlogRemaining: 0,
    insertFailedBatches: 0, insertErrors: [], failedSources: [], sourceResults: [],
    fetchEventLog: { attempted: 0, recorded: 0, failedBatches: 0 }, cadenceGuards: { stateAvailable: true },
    message: PRIVATE_TEXT, credential: SECRET, ...fields });
}

function receiptFromLog(result: FixtureResult): any {
  const prefix = "[freshness-cron] scrape receipt: ";
  const lines = result.logs.filter((line) => line.includes(prefix));
  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0].slice(lines[0].indexOf(prefix) + prefix.length));
}

function expectSanitized(result: FixtureResult) {
  const exposed = result.body + JSON.stringify(result.logs) + (result.scheduledError ?? "");
  expect(exposed).not.toContain(SECRET);
  expect(exposed).not.toContain(PRIVATE_TEXT);
}

for (const scenario of [
  { name: "contradictory UNKNOWN 200 with positive counters", status: 200,
    body: completed({ publicationOutcome: "UNKNOWN", reconciliationRequired: true, confirmedPublishedLowerBound: 2 }) },
  { name: "ordinary unauthorized upstream response", status: 401,
    body: JSON.stringify({ error: PRIVATE_TEXT, credentials: SECRET }) },
  { name: "malformed acknowledgement", status: 200, body: `${PRIVATE_TEXT} ${SECRET} <not-json>` },
  { name: "server error containing private text", status: 200, body: completed({ error: `${PRIVATE_TEXT} ${SECRET}` }) },
  { name: "lost response", status: 200, body: "", mode: "drop" },
  { name: "truncated response", status: 200, body: completed(), mode: "truncated" },
  { name: "oversized response", status: 200, body: completed({ message: PRIVATE_TEXT + SECRET + "x".repeat(1_048_576) }) },
  { name: "307 redirect", status: 307, body: completed(), mode: "redirect" },
  { name: "308 redirect", status: 308, body: completed(), mode: "redirect" },
  { name: "lock without held evidence", status: 200, body: JSON.stringify({ skipped: true, reason: "run-lock-held", message: PRIVATE_TEXT }) },
  { name: "contradictory held lock", status: 200,
    body: completed({ skipped: true, reason: "run-lock-held", lockState: "held" }) },
]) {
  test(`native retained Worker rejects ${scenario.name}, retains sanitized evidence and makes one POST`, async () => {
    const result = await nativeFixture(scenario.status, scenario.body, { mode: scenario.mode });
    expect(result.requests).toEqual([{ method: "POST", path: "/scrape" }]);
    expect(result.status).toBe(500);
    expectSanitized(result);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("SCRAPE_RESPONSE_REJECTED");
    expect(body.receipt.publicationOutcome).toBe("UNKNOWN");
    expect(body.receipt.reconciliationRequired).toBe(true);
    expect(body.receipt.inserted).toBeNull();
    expect(body.receipt.actualChanges).toBeNull();
    expect(receiptFromLog(result)).toEqual(body.receipt);
    if (scenario.mode === "drop" || scenario.mode === "truncated") {
      expect(body.receipt.responseEvidence.transport).toBe("INCOMPLETE");
    }
    if (scenario.name === "oversized response") expect(body.receipt.responseEvidence.bodyValidity).toBe("OVERSIZED");
    if (scenario.mode === "redirect") expect(body.receipt.responseEvidence.httpStatus).toBe(scenario.status);
  }, TIMEOUT);
}

for (const scenario of [
  { name: "strict completed acknowledgement", body: completed(), inserted: 3, state: "completed", outcome: "REPORTED" },
  { name: "zero/dedup acknowledgement with omitted optional triage", body: completed({ inserted: 0, actualChanges: 0 }), inserted: 0, state: "completed", outcome: "REPORTED" },
  { name: "strict held lock", body: JSON.stringify({ skipped: true, reason: "run-lock-held", lockState: "held",
    message: PRIVATE_TEXT, credential: SECRET }), inserted: null, state: "lock-held", outcome: "SKIPPED" },
]) {
  test(`native retained Worker accepts ${scenario.name} with sanitized receipt and one POST`, async () => {
    const result = await nativeFixture(200, scenario.body);
    expect(result.requests).toEqual([{ method: "POST", path: "/scrape" }]);
    expect(result.status).toBe(200);
    expect(result.body).toBe("ok");
    const receipt = receiptFromLog(result);
    expect(receipt.publicationOutcome).toBe(scenario.outcome);
    expect(receipt.reconciliationRequired).toBe(false);
    expect(receipt.inserted).toBe(scenario.inserted);
    expect(receipt.responseEvidence.terminalState).toBe(scenario.state);
    expectSanitized(result);
  }, TIMEOUT);
}

test("native retained Worker distinguishes reported degraded ingestion from UNKNOWN publication", async () => {
  const result = await nativeFixture(200, completed({ insertFailedBatches: 1,
    insertErrors: [{ batchStart: 0, batchSize: 1, error: `${PRIVATE_TEXT} ${SECRET}` }] }));
  expect(result.requests).toEqual([{ method: "POST", path: "/scrape" }]);
  expect(result.status).toBe(500);
  const body = JSON.parse(result.body);
  expect(body.error).toBe("SCRAPE_RESPONSE_REJECTED");
  expect(body.receipt.publicationOutcome).toBe("REPORTED");
  expect(body.receipt.inserted).toBe(3);
  expect(body.receipt.reconciliationRequired).toBe(false);
  expect(body.receipt.responseEvidence.terminalState).toBe("degraded");
  expect(receiptFromLog(result)).toEqual(body.receipt);
  expectSanitized(result);
}, TIMEOUT);

test("native retained Worker retains reported counts while rejecting incomplete health diagnostics", async () => {
  const result = await nativeFixture(200, completed({ fetchEventLog: undefined }));
  expect(result.requests).toEqual([{ method: "POST", path: "/scrape" }]);
  expect(result.status).toBe(500);
  const body = JSON.parse(result.body);
  expect(body.error).toBe("SCRAPE_RESPONSE_REJECTED");
  expect(body.receipt.publicationOutcome).toBe("REPORTED");
  expect(body.receipt.inserted).toBe(3);
  expect(body.receipt.actualChanges).toBe(3);
  expect(body.receipt.reconciliationRequired).toBe(false);
  expect(body.receipt.diagnosticsComplete).toBe(false);
  expect(body.receipt.responseEvidence.terminalState).toBe("degraded");
  expect(receiptFromLog(result)).toEqual(body.receipt);
  expectSanitized(result);
}, TIMEOUT);

for (const scenario of [
  { name: "unauthorized manual request", options: { unauthorized: true } },
  { name: "missing configured secret", options: { secret: "" } },
]) {
  test(`native retained Worker rejects ${scenario.name} without upstream traffic`, async () => {
    const result = await nativeFixture(200, completed(), scenario.options);
    expect(result.status).toBe(401);
    expect(result.requests).toHaveLength(0);
    expectSanitized(result);
  }, TIMEOUT);
}

for (const minute of [20, 30]) {
  test(`native retained Worker scheduled UNKNOWN at minute ${minute} keeps hourly shadow independent`, async () => {
    const result = await nativeFixture(500, JSON.stringify({ publicationOutcome: "UNKNOWN",
      reconciliationRequired: true, confirmedPublishedLowerBound: 2, message: PRIVATE_TEXT, credentials: SECRET }), {
      scheduledTime: Date.parse(`2026-10-09T10:${minute}:00Z`),
    });
    expect(result.requests.filter((request) => request.path === "/scrape")).toEqual([{ method: "POST", path: "/scrape" }]);
    expect(result.requests.filter((request) => request.path === "/shadow")).toEqual(minute === 20 ? [{ method: "POST", path: "/shadow" }] : []);
    const receipt = receiptFromLog(result);
    expect(receipt.publicationOutcome).toBe("UNKNOWN");
    expect(receipt.inserted).toBeNull();
    expect(receipt.confirmedPublishedLowerBound).toBe(2);
    expect(result.scheduledError).toBeUndefined();
    expect(result.scheduled?.outcome).toBe("exception");
    if (minute === 20) expect(result.logs.join("\n")).toContain("shadow no observations");
    expectSanitized(result);
  }, TIMEOUT);
}

test("native Worker fixture uses pinned Miniflare and installed workerd binary", async () => {
  const result = await nativeFixture(200, completed(), { unauthorized: true });
  expect(require(wrangler).version).toBe("4.143.0");
  expect(result.runtime.miniflare).toBe("5.20260926.0-alpha");
  expect(result.runtime.workerd).toBe("1.20260926.1");
  expect(result.runtime.binary).toMatch(/workerd(?:\.exe)?$/);
  expect(await Bun.file(result.runtime.binary).exists()).toBe(true);
  expect(result.requests).toHaveLength(0);
}, TIMEOUT);
