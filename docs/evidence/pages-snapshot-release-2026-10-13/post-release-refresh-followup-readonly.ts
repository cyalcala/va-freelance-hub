import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const paths = ["/opportunities?fresh=today", "/jobs/9214"];
async function sample() {
  return Promise.all(paths.map(async path => {
    const started = Date.now();
    try {
      const response = await fetch(`https://remotejobs-ph.pages.dev${path}`, {
        redirect: "manual", signal: AbortSignal.timeout(20000),
      });
      const html = await response.text();
      return { path, observedAtUtc: new Date().toISOString(), status: response.status, elapsedMs: Date.now() - started,
        headers: Object.fromEntries([...response.headers].filter(([name]) => name.startsWith("x-public-snapshot") || ["date", "cache-control", "cf-cache-status", "x-edge-cache", "age"].includes(name))),
        snapshotMeta: [...html.matchAll(/<meta\s+(?:[^>]*?\s)?name=["'](va-hub:snapshot-[^"']+)["']\s+content=["']([^"']*)["']/g)].map(m => ({ name: m[1], content: m[2] })),
        counts: [...html.matchAll(/<strong(?:\s[^>]*)?>([\d,]+)\s+(opportunit(?:y|ies)|jobs?)<\/strong>/g)].map(m => Number(m[1].replaceAll(",", ""))),
        renderedJobIds: [...new Set([...html.matchAll(/href=["']\/jobs\/(\d+)["']/g)].map(m => Number(m[1])))],
        jsonLdDatePosted: [...html.matchAll(/"datePosted"\s*:\s*"([^"\\]+)"/g)].map(m => m[1]),
        bodySha256: hash(html), bodyBytes: Buffer.byteLength(html), rawBodyRetained: false };
    } catch (e) { return { path, observedAtUtc: new Date().toISOString(), elapsedMs: Date.now() - started,
      requestErrorClass: e instanceof Error ? e.name : "UnknownError" }; }
  }));
}
const observedStart = new Date().toISOString();
const first = await sample();
console.log(JSON.stringify({ phase: "first", observations: first.map(o => ({ path: o.path, status: o.status, headers: o.headers })) }));
const needsFollowup = first.some(o => o.headers?.["x-public-snapshot"] === "stale");
const waitStartedAt = new Date().toISOString();
if (needsFollowup) await new Promise(resolve => setTimeout(resolve, 30000));
const second = needsFollowup ? await sample() : [];
const report = { scope: "BOUNDED_ORDINARY_GETS_REFRESH_FOLLOWUP_NOT_SLO_ACCEPTANCE", observedStart,
  observedEnd: new Date().toISOString(), credentialAccess: false, authenticatedRequests: 0,
  waitStartedAt: needsFollowup ? waitStartedAt : null, requestedWaitMs: needsFollowup ? 30000 : 0,
  requestCount: first.length + second.length, first, second };
await writeFile(new URL("./post-release-refresh-followup.json", import.meta.url), JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify({ phase: "complete", requestCount: report.requestCount,
  first: first.map(o => ({ path: o.path, status: o.status, headers: o.headers })),
  second: second.map(o => ({ path: o.path, status: o.status, headers: o.headers })) }));
