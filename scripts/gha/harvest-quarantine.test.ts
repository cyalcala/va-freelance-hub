import { expect, test } from "bun:test";
import { createServer } from "node:http";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

// Isolated adaptation of the reviewed CLI case in 51159e23; no workflow helpers.
test("native legacy harvest CLI stays dependency-free and quarantined", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "legacy-quarantine-"));
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? ""); response.end("unexpected request");
  });
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Loopback fixture did not bind");
    const secret = "synthetic-quarantine-secret", privateText = "synthetic-quarantine-private";
    writeFileSync(join(workspace, ".env"), `HUNTER_FIXTURE_ENV_LOADED=${privateText}\n`);
    const preload = join(workspace, "deny-env-file.ts");
    writeFileSync(preload, 'if (process.env.HUNTER_FIXTURE_ENV_LOADED) throw new Error("ENV_FILE_WAS_READ");\n');
    const entrypoint = join(workspace, "legacy-harvest.ts");
    copyFileSync(resolve(import.meta.dir, "harvest.ts"), entrypoint);
    writeFileSync(join(workspace, "package.json"), '{"name":"legacy-quarantine-fixture","private":true}\n');
    const child = Bun.spawn([process.execPath, "--no-install", "--no-env-file", "--preload", preload, entrypoint], {
      cwd: workspace, env: { PATH: process.env.PATH ?? process.env.Path ?? "", SystemRoot: process.env.SystemRoot ?? "C:/Windows",
        INGEST_API_URL: `http://127.0.0.1:${address.port}/ingest`, PROXY_SECRET: secret }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("LEGACY_QUARANTINE: this unreferenced Hunter prototype is archived. Use /api/cron/scrape and the active Hunter pulse.");
    expect(stderr).not.toContain("Cannot find package");
    expect(stderr).not.toContain("ENV_FILE_WAS_READ");
    expect(requests).toEqual([]);
    expect(stdout + stderr).not.toContain(secret);
    expect(stdout + stderr).not.toContain(privateText);
  } finally {
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
    const target = resolve(workspace);
    if (dirname(target).toLowerCase() !== resolve(tmpdir()).toLowerCase() || !basename(target).startsWith("legacy-quarantine-")) throw new Error("Unsafe fixture cleanup");
    rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}, 45_000);
