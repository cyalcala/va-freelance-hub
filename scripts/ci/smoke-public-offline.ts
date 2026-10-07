import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "node:net";

const root = resolve(import.meta.dir, "../..");
const temporary = await mkdtemp(join(tmpdir(), "va-public-offline-"));
const config = join(temporary, "wrangler.jsonc");
await writeFile(config, JSON.stringify({ name: "va-public-offline", pages_build_output_dir: resolve(root, "apps/web/dist"), compatibility_date: "2024-11-01", compatibility_flags: ["nodejs_compat"] }));
const board = JSON.parse(await readFile(resolve(root, "apps/web/src/data/public-lkg.json"), "utf8"));
// Allocate a local port; this Worker intentionally has no D1 or production bindings.
const server = createServer();
await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const port = (server.address() as { port: number }).port;
await new Promise<void>((done, reject) => server.close((err) => err ? reject(err) : done()));
const child = Bun.spawn(["node", resolve(root, "node_modules/wrangler/bin/wrangler.js"), "pages", "dev", resolve(root, "apps/web/dist"), "--port", String(port), "--persist-to", join(temporary, "state"), "--show-interactive-dev-session=false", "--log-level", "error"], { cwd: temporary, stdout: "pipe", stderr: "pipe" });
// Drain logs so backpressure cannot hang the Worker. Do not print job bodies/errors.
const drain = Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
const origin = `http://127.0.0.1:${port}`;
const routes = ["/", "/opportunities?q=assistant", "/directory", "/categories/admin", "/categories/customer-service", ...board.jobs.slice(0, 2).map((job: { id: number }) => `/jobs/${job.id}`), "/sitemap.xml"];
const results: unknown[] = [];
try {
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const logs = await drain;
      throw new Error(`Offline Worker exited before startup: ${logs.join("\n").slice(-3_000)}`);
    }
    try {
      const response = await fetch(origin + "/", { signal: AbortSignal.timeout(5_000) });
      await response.arrayBuffer();
      if (response.ok) { ready = true; break; }
    } catch {}
    await Bun.sleep(250);
  }
  if (!ready) throw new Error("Offline Worker startup timed out");
  for (const route of routes) {
    const response = await fetch(origin + route, { signal: AbortSignal.timeout(8_000), headers: { Cookie: "offline-smoke=1" } });
    const text = await response.text();
    const source = response.headers.get("X-Public-Snapshot-Source");
    const jobs = Number(response.headers.get("X-Public-Snapshot-Jobs"));
    if (response.status !== 200 || jobs !== board.jobs.length || !["durable_lkg", "edge", "memory"].includes(source ?? "") || response.headers.get("X-Public-Snapshot-Generated-At") !== board.generatedAt) throw new Error(`Offline serving failed on ${route}`);
    const status = response.headers.get("X-Public-Snapshot");
    if (route !== "/sitemap.xml" && ["stale", "lkg_fallback"].includes(status ?? "") && !text.includes("Showing saved listings")) throw new Error("Saved listings lack a visitor freshness notice");
    results.push({ route, status: response.status, source, jobs, companies: Number(response.headers.get("X-Public-Snapshot-Companies")) });
  }
  const response = await fetch(origin + `/api/click/${board.jobs[0].id}?url=${encodeURIComponent(board.jobs[0].sourceUrl)}`, { redirect: "manual", signal: AbortSignal.timeout(5_000) });
  await response.arrayBuffer();
  if (response.status !== 503 || response.headers.get("Retry-After") !== "30" || response.headers.get("Cache-Control") !== "no-store" || response.headers.has("Location")) throw new Error("Offline Apply failed its eligibility refusal contract");
  results.push({ route: "/api/click/[id]", status: response.status, retryAfter: "30", outboundRedirect: false });
  const receipt = { checkedAt: new Date().toISOString(), runtime: "workerd", d1Binding: false, sourceSha: process.env.GITHUB_SHA ?? null, generatedAt: board.generatedAt, results };
  await writeFile(resolve(root, "public-offline-smoke.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.info(JSON.stringify(receipt));
} finally {
  child.kill("SIGINT");
  await Promise.race([child.exited, Bun.sleep(1_000)]);
  if (child.exitCode === null) {
    child.kill();
    await Promise.race([child.exited, Bun.sleep(1_000)]);
  }
  await Promise.race([drain, Bun.sleep(1_000)]);
  // Windows can retain a Worker file handle briefly after process shutdown.
  await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
