import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const directory = new URL("./", import.meta.url);
const initial = JSON.parse(await readFile(new URL("post-release-first.json", directory), "utf8"));
const notBefore = Date.parse(initial.observedEnd) + 300_000;
if (Date.now() < notBefore) throw new Error(`Observation not due until ${new Date(notBefore).toISOString()}`);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const observedStart = new Date().toISOString();
const observations = await Promise.all(["/", "/opportunities?fresh=today", "/jobs/9214"].map(async path => {
  const started = Date.now();
  try {
    const response = await fetch(`https://remotejobs-ph.pages.dev${path}`, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    const html = await response.text();
    return { path, observedAtUtc: new Date().toISOString(), status: response.status, elapsedMs: Date.now() - started,
      headers: Object.fromEntries([...response.headers].filter(([name]) => name.startsWith("x-public-snapshot") || ["date", "cache-control", "cf-cache-status", "x-edge-cache", "age"].includes(name))),
      snapshotMeta: [...html.matchAll(/<meta\s+(?:[^>]*?\s)?name=["'](va-hub:snapshot-[^"']+)["']\s+content=["']([^"']*)["']/g)].map(m => ({ name: m[1], content: m[2] })),
      counts: [...html.matchAll(/<strong(?:\s[^>]*)?>([\d,]+)\s+(opportunit(?:y|ies)|jobs?)<\/strong>/g)].map(m => Number(m[1].replaceAll(",", ""))),
      renderedJobIds: [...new Set([...html.matchAll(/href=["']\/jobs\/(\d+)["']/g)].map(m => Number(m[1])))],
      jsonLdDatePosted: [...html.matchAll(/"datePosted"\s*:\s*"([^"\\]+)"/g)].map(m => m[1]),
      bodySha256: hash(html), bodyBytes: Buffer.byteLength(html), rawBodyRetained: false };
  } catch (e) { return { path, observedAtUtc: new Date().toISOString(), elapsedMs: Date.now() - started, requestErrorClass: e instanceof Error ? e.name : "UnknownError" }; }
}));
const report = { scope: "ORDINARY_PUBLIC_GETS_AFTER_ONE_FIVE_MINUTE_BOUNDARY_NOT_SLO_ACCEPTANCE", observedStart,
  notBefore: new Date(notBefore).toISOString(), observedEnd: new Date().toISOString(), observations };
await writeFile(new URL("post-release-boundary.json", directory), JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify(report));
