import { expect, test } from "bun:test";
import { createServer } from "node:http";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const WORKFLOW = join(ROOT, ".github/workflows/gha-hunter-pulse.yml");
const SECRET = "fixture-credential-never-retain-7a57";
const PRIVATE_TEXT = "fixture-private-server-detail-24c9";
const BASH = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : Bun.which("bash");
const CURL = process.platform === "win32" ? "C:/Windows/System32/curl.exe" : Bun.which("curl");
const JQ = Bun.which("jq");
// Native subprocess startup can be slow on Windows while repository builds run.
// This is an integration-test budget, not an API or production latency target.
const TIMEOUT = 45_000;

function shellPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
}

/** Extract the checked-in shell block unchanged, apart from inert event expressions. */
function runBlock(name: string): string {
  const yaml = readFileSync(WORKFLOW, "utf8").replaceAll("\r\n", "\n");
  const lines = yaml.split("\n");
  const start = lines.findIndex((line) => line.includes("- name:") && line.includes(name));
  if (start < 0) throw new Error(`Workflow step missing: ${name}`);
  let run = start + 1;
  while (run < lines.length && !/^\s+run: \|\s*$/.test(lines[run])) {
    if (/^      - name:/.test(lines[run])) throw new Error(`Shell block missing: ${name}`);
    run++;
  }
  const indent = lines[run + 1]?.match(/^ */)?.[0].length;
  if (!indent) throw new Error(`Shell block empty: ${name}`);
  const block: string[] = [];
  for (let i = run + 1; i < lines.length; i++) {
    if (lines[i].trim() && (lines[i].match(/^ */)?.[0].length ?? 0) < indent) break;
    block.push(lines[i].slice(indent));
  }
  return block.join("\n").replace(/\$\{\{\s*github\.event_name\s*\}\}/g, "workflow_dispatch")
    .replace(/\$\{\{\s*steps\.failover\.outputs\.reason\s*\}\}/g, "loopback fixture reason");
}

function file(path: string): string { return existsSync(path) ? readFileSync(path, "utf8") : ""; }
function removeFixtureWorkspace(workspace: string) {
  const target = resolve(workspace);
  if (dirname(target).toLowerCase() !== resolve(tmpdir()).toLowerCase() || !basename(target).startsWith("hunter-native-")) {
    throw new Error("Refusing recursive cleanup outside the recorded native fixture directory");
  }
  rmSync(target, { recursive: true, force: true });
}
function environmentFile(text: string): Record<string, string> {
  return Object.fromEntries(text.trim().split(/\r?\n/).filter(Boolean).map((line) => {
    const split = line.indexOf("=");
    return [line.slice(0, split), line.slice(split + 1)];
  }));
}

async function fixture(status: number, body: string, options: { drop?: boolean; curlrc?: boolean; skipInvocation?: boolean } = {}) {
  if (!BASH || !CURL || !JQ || !existsSync(BASH)) throw new Error("Native fixture setup requires installed Bash, curl and jq");
  const workspace = mkdtempSync(join(tmpdir(), "hunter-native-"));
  mkdirSync(join(workspace, "scripts/gha"), { recursive: true });
  copyFileSync(join(ROOT, "scripts/gha/hunter-response.ts"), join(workspace, "scripts/gha/hunter-response.ts"));
  const bootstrap = join(workspace, "fixture-native-path.sh");
  writeFileSync(bootstrap, `export PATH='${[dirname(CURL), dirname(JQ), dirname(process.execPath)].map(shellPath).join(":")}':"$PATH"\n`);
  if (options.curlrc) writeFileSync(join(workspace, ".curlrc"), "retry = 2\nretry-delay = 0\nretry-all-errors\n");
  const requests: { method: string; path: string }[] = [];
  const server = createServer((request, response) => {
    requests.push({ method: request.method ?? "", path: request.url ?? "" });
    if (options.drop) { request.socket.destroy(); return; }
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Loopback fixture did not bind a TCP port");
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? process.env.Path ?? "", SystemRoot: process.env.SystemRoot ?? "C:/Windows",
    TEMP: workspace, TMP: workspace, CURL_HOME: workspace, RUNNER_TEMP: shellPath(workspace),
    BASH_ENV: shellPath(bootstrap), SCRAPE_API_URL: `http://127.0.0.1:${address.port}/api/cron/scrape`,
    PROXY_SECRET: SECRET, GITHUB_ENV: join(workspace, "github-env"),
    GITHUB_OUTPUT: join(workspace, "github-output"), GITHUB_STEP_SUMMARY: join(workspace, "github-summary"),
    GITHUB_RUN_ID: "fixture-run", SOURCE_FAILURE_FAIL_THRESHOLD: "999", INSERT_ERROR_FAIL_THRESHOLD: "0",
  };
  const execute = async (block: string, extra: Record<string, string> = {}) => {
    const script = join(workspace, "fixture-step.sh");
    writeFileSync(script, block);
    const child = Bun.spawn([BASH, "--noprofile", "--norc", "-e", "-o", "pipefail", shellPath(script)], {
      cwd: workspace, env: { ...env, ...extra }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    return { stdout, stderr, exitCode };
  };
  try {
    const process = options.skipInvocation ? { stdout: "", stderr: "", exitCode: 0 }
      : await execute(runBlock("Single Scrape Invocation"));
    return {
      workspace, requests, process, execute, url: env.SCRAPE_API_URL,
      receiptText: file(join(workspace, "harvest.log")),
      envText: file(env.GITHUB_ENV), outputText: file(env.GITHUB_OUTPUT),
      dispose: async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        removeFixtureWorkspace(workspace);
      },
    };
  } catch (error) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    removeFixtureWorkspace(workspace);
    throw error;
  }
}

function expectOnePost(result: Awaited<ReturnType<typeof fixture>>) {
  expect(result.requests).toEqual([{ method: "POST", path: "/api/cron/scrape" }]);
}

function expectSanitized(result: Awaited<ReturnType<typeof fixture>>, additionalText = "") {
  const exposed = [result.receiptText, result.process.stdout, result.process.stderr,
    result.envText, result.outputText, additionalText].join("\n");
  expect(exposed).not.toContain(SECRET);
  expect(exposed).not.toContain(PRIVATE_TEXT);
  expect(readdirSync(result.workspace).filter((name) => name.startsWith("hunter-response."))).toHaveLength(0);
}

function acknowledgement(fields: Record<string, unknown> = {}): string {
  return JSON.stringify({ inserted: 3, actualChanges: 3, skipped: 0, acceptedForInsert: 3,
    attemptedInsert: 3, insertFailedBatches: 0, insertErrors: [], backlogRemaining: 0,
    failedSources: [], sourceResults: [{ sourceName: PRIVATE_TEXT, sourceType: SECRET, ok: true, count: 3 }],
    fetchEventLog: { attempted: 1, recorded: 1, failedBatches: 0 },
    cadenceGuards: { stateAvailable: true }, triageFailures: 0, triageAiUnavailable: 0,
    rejectedPersisted: 0, droppedNoUrl: 0, message: PRIVATE_TEXT, credential: SECRET, ...fields });
}

test("native Hunter retains sanitized UNKNOWN 500 evidence before rejecting its single POST", async () => {
  const result = await fixture(500, JSON.stringify({ publicationOutcome: "UNKNOWN", inserted: null,
    confirmedPublishedLowerBound: 2, reconciliationRequired: true, message: PRIVATE_TEXT, credential: SECRET }));
  try {
    expectOnePost(result);
    expect(result.process.exitCode).toBe(1);
    const receipt = JSON.parse(result.receiptText);
    expect(receipt.inserted).toBeNull();
    expect(receipt.publicationOutcome).toBe("UNKNOWN");
    expect(receipt.reconciliationRequired).toBe(true);
    expect(receipt.confirmedPublishedLowerBound).toBe(2);
    expect(receipt.responseEvidence.httpStatus).toBe(500);
    expect(environmentFile(result.envText).INSERTED).toBe("UNKNOWN");
    expectSanitized(result);
  } finally { await result.dispose(); }
}, TIMEOUT);

for (const scenario of [
  { name: "contradictory UNKNOWN 200", status: 200,
    body: acknowledgement({ publicationOutcome: "UNKNOWN", inserted: 81, actualChanges: 81,
      confirmedPublishedLowerBound: 2, reconciliationRequired: true }), reason: "PUBLICATION_OUTCOME_UNKNOWN" },
  { name: "malformed 200", status: 200, body: `${PRIVATE_TEXT} ${SECRET} <invalid-json>`, reason: "INVALID_ACKNOWLEDGEMENT" },
  { name: "ordinary unauthorized 401", status: 401,
    body: JSON.stringify({ error: PRIVATE_TEXT, credentials: SECRET }), reason: "HTTP_RESPONSE_REJECTED" },
  { name: "dropped transport response", status: 200, body: "", drop: true, reason: "TRANSPORT_INCOMPLETE" },
  { name: "contradictory held lock 200", status: 200,
    body: acknowledgement({ inserted: 2, skipped: true, reason: "run-lock-held", lockState: "held" }),
    reason: "CONTRADICTORY_LOCK_ACKNOWLEDGEMENT" },
]) {
  test(`native Hunter fails ${scenario.name} with retained UNKNOWN evidence and one POST`, async () => {
    const result = await fixture(scenario.status, scenario.body, { drop: scenario.drop });
    try {
      expectOnePost(result);
      expect(result.process.exitCode).toBe(1);
      const receipt = JSON.parse(result.receiptText);
      expect(receipt.inserted).toBeNull();
      expect(receipt.actualChanges).toBeNull();
      expect(receipt.publicationOutcome).toBe("UNKNOWN");
      expect(receipt.reconciliationRequired).toBe(true);
      expect(receipt.responseEvidence.reason).toBe(scenario.reason);
      expect(environmentFile(result.envText).INSERTED).toBe("UNKNOWN");
      expect(environmentFile(result.outputText).terminal_state).not.toBe("success");
      expect(receipt.responseEvidence.httpStatus).toBe(scenario.drop ? null : scenario.status);
      if (scenario.drop) expect(receipt.responseEvidence.transportExitCode).toBeGreaterThan(0);
      expectSanitized(result);
    } finally { await result.dispose(); }
  }, TIMEOUT);
}

for (const scenario of [
  { name: "normal success", fields: {}, inserted: 3, state: "success" },
  { name: "zero inserted but skipped success", fields: { inserted: 0, actualChanges: 0, skipped: 4 }, inserted: 0, state: "success" },
  { name: "backlog", fields: { backlogRemaining: 17 }, inserted: 3, state: "backlog" },
  { name: "held lock", fields: { inserted: undefined, actualChanges: undefined, skipped: true, reason: "run-lock-held", lockState: "held" }, inserted: null, state: "lock-held" },
]) {
  test(`native Hunter preserves ${scenario.name} without issuing a later POST`, async () => {
    const result = await fixture(200, acknowledgement(scenario.fields));
    try {
      expectOnePost(result);
      expect(result.process.exitCode).toBe(0);
      const receipt = JSON.parse(result.receiptText);
      expect(receipt.inserted).toBe(scenario.inserted);
      expect(receipt.reconciliationRequired).toBe(false);
      expect(receipt.responseEvidence.terminalState).toBe(scenario.state);
      expect(environmentFile(result.outputText).terminal_state).toBe(scenario.state);
      if (scenario.state === "backlog" || scenario.state === "lock-held") {
        expect(environmentFile(result.envText).NEXT_SAFE_AT).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
      expectSanitized(result);
    } finally { await result.dispose(); }
  }, TIMEOUT);
}

test("native curl ignores a retry-enabling curlrc and posts uncertain work once", async () => {
  const result = await fixture(500, JSON.stringify({ publicationOutcome: "UNKNOWN", reconciliationRequired: true }), { curlrc: true });
  try {
    expectOnePost(result);
    expect(result.process.exitCode).toBe(1);
    expect(JSON.parse(result.receiptText).publicationOutcome).toBe("UNKNOWN");
  } finally { await result.dispose(); }
}, TIMEOUT);

test("native curl setup control really loads the retry-enabling curlrc", async () => {
  const result = await fixture(500, "{}", { curlrc: true, skipInvocation: true });
  try {
    // This read-only GET control proves the curlrc is effective; the workflow test
    // above must disable that same native configuration before its single POST.
    const control = await result.execute('curl -s --max-time 3 -o control-body.json "$SCRAPE_API_URL"\n');
    expect(control.exitCode).toBe(0);
    expect(result.requests.length).toBeGreaterThan(1);
    expect(result.requests.every((request) => request.method === "GET")).toBe(true);
  } finally { await result.dispose(); }
}, TIMEOUT);

test("native health and both summary paths retain UNKNOWN publication instead of numerical zero", async () => {
  const result = await fixture(200, acknowledgement({ publicationOutcome: "UNKNOWN", inserted: 81,
    reconciliationRequired: true, confirmedPublishedLowerBound: 2 }));
  try {
    const stepEnv = environmentFile(result.envText);
    const health = await result.execute(runBlock("Evaluate Hunter Health"), stepEnv);
    expect(health.exitCode).toBe(1);
    const healthSummary = file(join(result.workspace, "source-health-summary.md"));
    expect(healthSummary).toMatch(/API-reported inserted[^\n]*UNKNOWN/);
    expect(healthSummary).toMatch(/API-reported confirmed lower bound[^\n]*\b2\b/);
    expect(healthSummary).not.toMatch(/API-reported inserted[^\n]*\b(0|81)\b/);
    expect(healthSummary).toContain("UNKNOWN/incomplete");
    expect(healthSummary).not.toMatch(/Failed Sources[^\n]*\b0\b/);
    const summary = await result.execute(runBlock("Generate Pulse Summary"), stepEnv);
    expect(summary.exitCode).toBe(0);
    const normalSummary = file(join(result.workspace, "github-summary"));
    expect(normalSummary).toContain("UNKNOWN");
    expect(normalSummary).not.toMatch(/API-reported inserted[^\n]*\b(0|81)\b/);
    // Execute the checked-in fallback branch, as if health summary retention failed.
    rmSync(join(result.workspace, "source-health-summary.md"));
    rmSync(join(result.workspace, "github-summary"));
    const fallback = await result.execute(runBlock("Generate Pulse Summary"), stepEnv);
    expect(fallback.exitCode).toBe(0);
    const fallbackSummary = file(join(result.workspace, "github-summary"));
    expect(fallbackSummary).toMatch(/API-reported inserted[^\n]*UNKNOWN/);
    expect(fallbackSummary).toMatch(/API-reported confirmed lower bound[^\n]*\b2\b/);
    expect(fallbackSummary).not.toContain("✅");
    expect(fallbackSummary).not.toMatch(/API-reported inserted[^\n]*\b(0|81)\b/);
    expect(fallbackSummary).toContain("UNKNOWN/incomplete");
    expect(fallbackSummary).not.toMatch(/Failed Sources[^\n]*\b0\b/);
    expectSanitized(result, [health.stdout, health.stderr, healthSummary,
      summary.stdout, summary.stderr, normalSummary, fallback.stdout, fallback.stderr, fallbackSummary].join("\n"));
    expectOnePost(result);
  } finally { await result.dispose(); }
}, TIMEOUT);

test("native extracted lifecycle classifier and CLI hold UNKNOWN evidence without GitHub calls", async () => {
  const result = await fixture(200, acknowledgement({ publicationOutcome: "UNKNOWN", inserted: 81,
    reconciliationRequired: true }));
  try {
    mkdirSync(join(result.workspace, ".hunter-health"));
    copyFileSync(join(result.workspace, "harvest.log"), join(result.workspace, ".hunter-health/harvest.log"));
    copyFileSync(join(ROOT, "scripts/gha/source-alert-lifecycle.ts"), join(result.workspace, "scripts/gha/source-alert-lifecycle.ts"));
    writeFileSync(join(result.workspace, "open-issues.json"), JSON.stringify([{ number: 42,
      body: "<!-- incident-key: hunter-source-health -->\n<!-- healthy-streak: 1 -->" }]));
    const block = runBlock("Apply Source Health Alert Lifecycle");
    const start = block.indexOf('if [ "$HUNT_RESULT" != "success" ]');
    const end = block.indexOf('ACTION=$(echo "$DECISION"');
    if (start < 0 || end <= start) throw new Error("Native lifecycle classifier slice could not be extracted");
    const classifier = block.slice(start, end);
    expect(classifier).not.toMatch(/^\s*gh\s/m);
    const evaluation = await result.execute(`INCIDENT_KEY=hunter-source-health\nHEALTHY_THRESHOLD=2\nLOG=.hunter-health/harvest.log\n${classifier}\nprintf '%s\\n' "$STATE" > classified-state\nprintf '%s\\n' "$DECISION" > lifecycle-decision.json\n`, { HUNT_RESULT: "success" });
    expect(evaluation.exitCode).toBe(0);
    expect(file(join(result.workspace, "classified-state")).trim()).toBe("unknown");
    expect(JSON.parse(file(join(result.workspace, "lifecycle-decision.json"))).action).toBe("HOLD");
    expectSanitized(result, evaluation.stdout + evaluation.stderr);
    expectOnePost(result);
  } finally { await result.dispose(); }
}, TIMEOUT);

test("native legacy harvest CLI stays quarantined with no HTTP request or env-file read", async () => {
  const result = await fixture(200, acknowledgement(), { skipInvocation: true });
  try {
    writeFileSync(join(result.workspace, ".env"), `HUNTER_FIXTURE_ENV_LOADED=${PRIVATE_TEXT}\n`);
    const preload = join(result.workspace, "deny-env-file.ts");
    writeFileSync(preload, 'if (process.env.HUNTER_FIXTURE_ENV_LOADED) throw new Error("ENV_FILE_WAS_READ");\n');
    // Exercise the real entrypoint without the developer checkout's incidental
    // packages. Quarantine must work before any legacy parser can be resolved.
    const entrypoint = join(result.workspace, "legacy-harvest.ts");
    copyFileSync(join(ROOT, "scripts/gha/harvest.ts"), entrypoint);
    writeFileSync(join(result.workspace, "package.json"), '{"name":"legacy-quarantine-fixture","private":true}\n');
    const child = Bun.spawn([process.execPath, "--no-install", "--no-env-file", "--preload", preload, entrypoint], {
      cwd: result.workspace, env: { PATH: process.env.PATH ?? process.env.Path ?? "",
        SystemRoot: process.env.SystemRoot ?? "C:/Windows", INGEST_API_URL: result.url, PROXY_SECRET: SECRET },
      stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("LEGACY_QUARANTINE");
    expect(stderr).not.toContain("Cannot find package");
    expect(stderr).not.toContain("ENV_FILE_WAS_READ");
    expect(result.requests).toHaveLength(0);
    expect(stdout + stderr).not.toContain(SECRET);
    expect(stdout + stderr).not.toContain(PRIVATE_TEXT);
  } finally { await result.dispose(); }
}, TIMEOUT);

test("native fixture uses installed curl, jq and Bun binaries", async () => {
  const result = await fixture(200, "", { skipInvocation: true });
  try {
    const identity = await result.execute("command -v curl\ncommand -v jq\ncommand -v bun\ncurl --version\njq --version\nbun --version\n");
    expect(identity.exitCode).toBe(0);
    const lines = identity.stdout.trim().split(/\r?\n/);
    expect(lines[0].toLowerCase()).toBe(shellPath(CURL!).replace(/\.exe$/i, "").toLowerCase());
    expect(lines[1].toLowerCase()).toBe(shellPath(JQ!).replace(/\.exe$/i, "").toLowerCase());
    expect(lines[2].toLowerCase()).toBe(shellPath(process.execPath).replace(/\.exe$/i, "").toLowerCase());
    expect(identity.stdout).toContain("curl ");
    expect(identity.stdout).toContain("jq-");
    expect(lines.at(-1)).toBe("1.3.14");
    expect(result.requests).toHaveLength(0);
  } finally { await result.dispose(); }
}, TIMEOUT);

for (const scenario of [
  { name: "UNKNOWN preserves bounded confirmed prefix independently of total", body: JSON.stringify({
    publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: 2, inserted: 900,
    credential: SECRET, error: PRIVATE_TEXT }), status: 500, bodyValidity: "JSON_OBJECT", lowerBound: 2 },
  { name: "oversized response", body: JSON.stringify({ message: PRIVATE_TEXT + SECRET + "x".repeat(1_048_576) }),
    status: 200, bodyValidity: "OVERSIZED", lowerBound: null },
  { name: "unreadable response file", body: null, status: 200, bodyValidity: "UNREADABLE", lowerBound: null },
]) {
  test(`native Hunter response CLI rejects ${scenario.name} and retains sanitized evidence`, async () => {
    const result = await fixture(200, "", { skipInvocation: true });
    try {
      if (scenario.body !== null) writeFileSync(join(result.workspace, "cli-body.json"), scenario.body);
      const cli = await result.execute(`bun --no-env-file scripts/gha/hunter-response.ts cli-body.json ${scenario.status} 0 cli-receipt.json\n`);
      expect(cli.exitCode).toBe(1);
      const receiptText = file(join(result.workspace, "cli-receipt.json"));
      const receipt = JSON.parse(receiptText);
      expect(receipt.publicationOutcome).toBe("UNKNOWN");
      expect(receipt.inserted).toBeNull();
      expect(receipt.actualChanges).toBeNull();
      expect(receipt.reconciliationRequired).toBe(true);
      expect(receipt.confirmedPublishedLowerBound).toBe(scenario.lowerBound);
      expect(receipt.responseEvidence.bodyValidity).toBe(scenario.bodyValidity);
      expectSanitized(result, receiptText + cli.stdout + cli.stderr);
      expect(result.requests).toHaveLength(0);
    } finally { await result.dispose(); }
  }, TIMEOUT);
}
