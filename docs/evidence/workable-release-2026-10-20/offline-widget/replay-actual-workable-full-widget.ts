import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { assessPostingFreshness } from "./source/packages/scraper/publication-freshness";

const proof = import.meta.dir;
const source = join(proof, "source");
const input = resolve(proof, "../workable-authoritative-observation-2026-10-20.json");
const audit = process.argv.includes("--audit");
const permutation = process.argv.includes("--reverse") ? "reverse" : process.argv.includes("--nonph-first") ? "nonph-first" : "original";
const artifactStem = permutation !== "original" ? `actual-full-widget-native-${permutation}` : audit ? "actual-full-widget-native-insert-audit" : "actual-full-widget-native";
const receiptPath = join(proof, `${artifactStem}-receipt.json`);
if (await Bun.file(receiptPath).exists()) throw new Error("Preserve existing full-widget receipt");
const inputBytes = await Bun.file(input).bytes();
const capture = JSON.parse(new TextDecoder().decode(inputBytes));
const now = capture.observedEnd;
const selected = ["hunt-st", "crewbloom"];
const fixture = join(source, "apps/web/tests/fixtures/native-workable-publication.ts");
const original = await Bun.file(fixture).text();
const headBefore = execFileSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" }).trim();
const statusBefore = execFileSync("git", ["status", "--porcelain"], { cwd: source, encoding: "utf8" });
if (headBefore !== "f34965b0c7bbfb76395259ccce0b60ad4533eee0" || statusBefore.trim()) throw new Error("Frozen source changed");
const jobsByToken: Record<string, any[]> = {};
for (const token of selected) {
  const s = capture.sources.find((row: any) => row.sourceId === `workable:${token}`);
  if (s?.httpStatus !== 200 || s.robots?.allowed !== true || !Array.isArray(s.minimalOpenings)) throw new Error("Permitted retained capture missing");
  jobsByToken[token] = s.minimalOpenings;
}
if (jobsByToken["hunt-st"]!.length !== 143 || jobsByToken.crewbloom!.length !== 152) throw new Error("Full captured arrays changed");
let code = original;
function replaceOnce(from: string, to: string) {
  if (!code.includes(from) || code.indexOf(from) !== code.lastIndexOf(from)) throw new Error(`Fixture seam changed: ${from.slice(0, 80)}`);
  code = code.replace(from, to);
}
replaceOnce('const REFERENCE = "2026-10-18T08:00:00.000Z";', `const REFERENCE = ${JSON.stringify(now)};`);
replaceOnce('const scenario = JSON.parse(process.argv[2]!)', 'const scenario = ({ kind: "fresh" })');
replaceOnce('const selected = admitted.slice(0, 2);', `const selected = ${JSON.stringify(selected)};`);
replaceOnce('if (scenario.repeat) for (const token of admitted.slice(2))', 'for (const token of admitted.filter(token => !selected.includes(token)))');
const jobsStart = code.indexOf("function jobs(token: string) {");
const jobsEnd = code.indexOf("\nconst rssHead", jobsStart);
if (jobsStart < 0 || jobsEnd < jobsStart) throw new Error("Jobs fixture seam missing");
code = code.slice(0, jobsStart) + `const fullWidgetCapture = JSON.parse(readFileSync(${JSON.stringify(input)}, "utf8"));\nfunction jobs(token: string) {
  const rows = [...(fullWidgetCapture.sources.find((s:any) => s.sourceId === "workable:" + token)?.minimalOpenings ?? [])];
  return ${JSON.stringify(permutation)} === "reverse" ? rows.reverse() : ${JSON.stringify(permutation)} === "nonph-first" ? rows.sort((a:any,b:any)=>Number(a.country === "Philippines")-Number(b.country === "Philippines")) : rows;
}\n` + code.slice(jobsEnd);
replaceOnce('ftsCount:(sqlite.query(', 'ftsIds:sqlite.query("SELECT rowid AS id FROM opportunities_fts").all(),ftsCount:(sqlite.query(');
replaceOnce('SELECT id,title,source_id,is_active,inactive_reason,ph_eligibility,posted_at,scraped_at,location_type,location_raw FROM opportunities ORDER BY id', 'SELECT id,title,source_id,source_url,is_active,inactive_reason,ph_eligibility,posted_at,scraped_at,location_type,location_raw FROM opportunities ORDER BY id');
if (audit) {
  replaceOnce('const bindingParameters: number[] = [];', 'const mutationAudit:any[] = []; const bindingParameters: number[] = [];');
  replaceOnce('const result=statement.run(...params);return {success:true,meta:{changes:result.changes}};', `const watched=/^INSERT INTO "opportunities"/i.test(query);
      const before=watched ? sqlite.query("SELECT count(*) AS n,coalesce(max(id),0) AS maxId FROM opportunities").get() as any : null;
      const result=statement.run(...params);
      if(watched){const after=sqlite.query("SELECT count(*) AS n FROM opportunities").get() as any;
        mutationAudit.push({rawChanges:result.changes,physicalInserted:after.n-before.n,newRows:sqlite.query("SELECT id,source_id,source_url,location_raw,is_active FROM opportunities WHERE id>?").all(before.maxId)});}
      return {success:true,meta:{changes:result.changes}};`);
  replaceOnce('replies,publicRows,rows:sqlite.query(', 'mutationAudit,replies,publicRows,rows:sqlite.query(');
}
const child = Bun.spawn([process.execPath, "--no-env-file", "--preload", join(source, "scripts/ci/test-environment.ts"), "--eval", code],
  { cwd: join(source, "apps/web/tests/fixtures"), stdout: "pipe", stderr: "pipe" });
const [stdout, stderr, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
await Bun.write(join(proof, `${artifactStem}.stdout.log`), stdout);
await Bun.write(join(proof, `${artifactStem}.stderr.log`), stderr);
if (exit !== 0) throw new Error(`Native full-widget replay failed: ${exit}: ${stderr.slice(-1500)}`);
const markers = stdout.split(/\r?\n/).filter(line => line.startsWith("NATIVE_WORKABLE_PUBLICATION_RESULT "));
if (markers.length !== 1) throw new Error("Native result marker missing");
const r = JSON.parse(markers[0]!.slice("NATIVE_WORKABLE_PUBLICATION_RESULT ".length));
const bySource = selected.map(token => {
  const sourceId = `workable:${token}`;
  const incoming = jobsByToken[token]!;
  const byUrl = new Map<string, any[]>();
  for (const opening of incoming) byUrl.set(opening.url, [...(byUrl.get(opening.url) ?? []), opening]);
  const stored = r.rows.filter((row: any) => row.source_id === sourceId).map((row: any) => ({ ...row,
    capturedCountries: [...new Set((byUrl.get(row.source_url) ?? []).map((v: any) => v.country))] }));
  const publicRows = r.publicRows.filter((row: any) => row.sourceId === sourceId).map((row: any) => {
    const storedRow = r.rows.find((candidate: any) => candidate.id === row.id);
    const actual = byUrl.get(row.sourceUrl) ?? [];
    return { ...row, locationRaw: storedRow?.location_raw, phEligibility: storedRow?.ph_eligibility,
      capturedVariants: actual.map(({ country, city, state, telecommuting, published_on }: any) => ({ country, city, state, telecommuting, published_on })) };
  });
  return { sourceId, rawLocationRecords: incoming.length, uniqueUrls: byUrl.size,
    repeatedUrls: [...byUrl].filter(([, rows]) => rows.length > 1).map(([url, rows]) => ({ url, variants: rows.length,
      countries: [...new Set(rows.map(row => row.country))], originalDates: [...new Set(rows.map(row => row.published_on))] })),
    storedRows: stored, publicRows,
    sourceResult: r.replies.flatMap((reply: any) => reply.body.sourceResults ?? []).filter((item: any) => item.id === sourceId || item.sourceId === sourceId || item.name === token || item.source === token),
    ledger: r.ledger.filter((row: any) => row.source_id === sourceId) };
});
const publicIds = new Set(r.publicRows.map((row: any) => row.id));
const checks = {
  repliesOk: r.replies.every((row: any) => row.status === 200),
  completeActualArrays: bySource[0]!.rawLocationRecords === 143 && bySource[1]!.rawLocationRecords === 152,
  correctUniqueDenominators: bySource[0]!.uniqueUrls === 140 && bySource[1]!.uniqueUrls === 64,
  noDuplicatePublicUrls: new Set(r.publicRows.map((row: any) => row.sourceUrl)).size === r.publicRows.length,
  allPublicHaveExplicitCapturedPhRemote: bySource.every(s => s.publicRows.every((row: any) => row.capturedVariants.some((v: any) => v.country === "Philippines" && v.telecommuting === true))),
  allPublicHaveExactOriginalDates: bySource.every(s => s.publicRows.every((row: any) => row.capturedVariants.some((v: any) => row.postedAt === `${v.published_on}T00:00:00.000Z`))),
  publicDatesWithinWindow: r.publicRows.every((row: any) => assessPostingFreshness(row.postedAt, now).state === "WITHIN_WINDOW"),
  publicRowsFtsIndexed: r.publicRows.every((row: any) => r.ftsIds.some((fts: any) => fts.id === row.id)),
  publicSourceCap: bySource.every(s => s.publicRows.length <= 2),
  ledgerSourceCap: bySource.every(s => s.ledger.reduce((total: number, row: any) => total + row.published_count, 0) <= 2),
  authorityUnchanged: JSON.stringify(r.initialRegistry) === JSON.stringify(r.finalRegistry),
  onlySyntheticTransports: r.transports.every((row: any) => row.allowed),
  correctTwoTenants: JSON.stringify(r.transports.filter((row: any) => row.kind === "workable").map((row: any) => row.token).sort()) === JSON.stringify([...selected].sort()),
  bindingBudget: r.maxBoundParameters <= 100,
  schema0054: r.appliedMigrations.at(-1) === "0054_public_serving_snapshot.sql",
  sourceFreezeUnchanged: execFileSync("git", ["status", "--porcelain"], { cwd: source, encoding: "utf8" }) === statusBefore && execFileSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" }).trim() === headBefore,
};
const holdLines = [...stdout.split(/\r?\n/), ...stderr.split(/\r?\n/)].filter(line => !line.startsWith("NATIVE_WORKABLE_PUBLICATION_RESULT ") && /hold|blocked|defer|reject|cap|date/i.test(line));
const receipt = { scope: "ENTIRE_RETAINED_ACTUAL_MINIMAL_WIDGET_ARRAYS_OFFLINE_NATIVE_ROUTE_SYNTHETIC_AUTHORITY_AI_TRANSPORT",
  recordedAt: new Date().toISOString(), clock: now, bun: Bun.version, sourceCommit: headBefore, input, permutation,
  inputSha256: createHash("sha256").update(inputBytes).digest("hex"), fixtureSha256: createHash("sha256").update(original).digest("hex"), transformedFixtureSha256: createHash("sha256").update(code).digest("hex"),
  capturedSources: capture.sources.filter((row: any) => selected.includes(row.sourceId.slice("workable:".length))).map((row: any) => ({ sourceId: row.sourceId, capturedAt: row.capturedAt, responseSha256: row.responseSha256 })),
  checks, safetyChecksPassed: Object.values(checks).every(Boolean), bySource,
  totalStored: r.rows.length, totalPublic: publicIds.size, aiCalls: r.aiCalls, ftsCount: r.ftsCount, maxBoundParameters: r.maxBoundParameters,
  replies: r.replies, holds: holdLines, ...(audit ? { mutationAudit: r.mutationAudit } : {}),
  limitations: ["Retained actual minimal location records in original array order, not a raw HTTP response", "No provider request, real AI call, production write, source change or rebuild", "Synthetic valid authority and AI responses do not attest current live authority or job adjudication", "Safety checks can be vacuously true when a whole source batch is blocked; counts and holds must be assessed separately", "This new-insertion replay does not establish inactive multi-location reactivation recall, cross-writer cap safety or current production coverage"] };
await Bun.write(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ receiptPath, safetyChecksPassed: receipt.safetyChecksPassed, totalStored: receipt.totalStored, totalPublic: receipt.totalPublic, aiCalls: receipt.aiCalls, bySource: bySource.map(s => ({sourceId:s.sourceId,rawLocationRecords:s.rawLocationRecords,uniqueUrls:s.uniqueUrls,stored:s.storedRows.length,public:s.publicRows.length})), checks, holds: holdLines.filter(line=>!/Geo-gate rejected/.test(line)) }));
if (!receipt.safetyChecksPassed) process.exit(1);
