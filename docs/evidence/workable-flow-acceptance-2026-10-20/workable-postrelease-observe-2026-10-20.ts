import { createHash } from "node:crypto";
import { readFile, open } from "node:fs/promises";
import { resolve, join } from "node:path";
import { queryD1ReadOnly } from "./scripts/diagnostics/query-d1-readonly";

export const ROOT = import.meta.dir;
export const SOURCE_CWD = join(ROOT, "tmp/workable-rotation-release-proof/source");
export const COHORT_PATH = join(ROOT, "docs/evidence/continuation-2026-10-20/workable-grouped-cohort.json");
export const SOURCE_IDS = ["workable:coconutva", "workable:crewbloom", "workable:hello-rache", "workable:hunt-st", "workable:pearltalent", "workable:pineapple-staffing", "workable:rocketams"];
const EXPECTED_COHORT_SOURCES = ["workable:crewbloom", "workable:hunt-st"];
const PUBLIC_URL = "https://remotejobs-ph.pages.dev/opportunities";
const PUBLIC_PREDICATE = "o.is_active=1 AND o.ph_eligibility IN ('eligible_verified','eligible_likely')";
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const quoted = (value: string) => `'${value.replaceAll("'", "''")}'`;
export type CohortEntry = { sourceId: string; sourceUrl: string };

export function validateInputs(args: string[]) {
  if (args.length !== 4 || args[0] !== "--phase" || args[2] !== "--since") throw new Error("Usage: --phase <lowercase-label> --since <explicit UTC ISO timestamp>");
  const phase = args[1]!, sinceInput = args[3]!;
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(phase)) throw new Error("Invalid phase label");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(sinceInput)) throw new Error("Since must be an explicit UTC ISO timestamp");
  const parsed = new Date(sinceInput);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 19) !== sinceInput.slice(0, 19)) throw new Error("Invalid since timestamp");
  return { phase, since: parsed.toISOString(), sinceInput };
}

export function validateCohort(value: any): CohortEntry[] {
  if (!Array.isArray(value?.sources) || value.sources.length !== 2
    || JSON.stringify(value.sources.map((s: any) => s.sourceId).sort()) !== JSON.stringify(EXPECTED_COHORT_SOURCES)) throw new Error("Expected exactly the two retained Workable sources");
  const result: CohortEntry[] = [];
  for (const source of value.sources) {
    if (!Array.isArray(source.details)) throw new Error("Missing retained opening details");
    const missing = source.details.filter((row: any) => row.hasPlausiblePhVariant === true && row.exactActiveEligibleStored === false);
    if (missing.length !== (source.sourceId === "workable:hunt-st" ? 16 : 1) || source.plausibleUniqueMissing !== missing.length) throw new Error("Retained source miss count changed");
    for (const row of missing) {
      if (typeof row.sourceUrl !== "string" || !/^https:\/\/apply\.workable\.com\/j\/[A-Z0-9]+\/?$/.test(row.sourceUrl)) throw new Error("Invalid exact Workable miss URL");
      result.push({ sourceId: source.sourceId, sourceUrl: row.sourceUrl });
    }
  }
  if (result.length !== 17 || new Set(result.map(row => row.sourceUrl.replace(/\/$/, ""))).size !== 17) throw new Error("Expected17 distinct exact miss URLs");
  return result;
}

export function buildQueries(cohort: CohortEntry[], since: string) {
  // Callers only pass values returned by the strict validators above.
  const urls = cohort.map(row => quoted(row.sourceUrl)).join(",");
  const sources = SOURCE_IDS.map(quoted).join(",");
  return [
    { kind: "exactMissOpportunities", limit: 68, sql: `SELECT o.id,o.source_id,o.source_url,o.title,o.company,o.is_active,o.inactive_reason,o.ph_eligibility,o.geo_scope,o.location_type,o.location_raw,o.posted_at,o.scraped_at,o.updated_at,o.last_seen_in_feed_at,CASE WHEN ${PUBLIC_PREDICATE} THEN 1 ELSE 0 END AS matches_public_predicate,EXISTS(SELECT 1 FROM opportunities_fts f WHERE f.rowid=o.id) AS fts_present FROM opportunities o WHERE o.source_url IN (${urls}) ORDER BY o.source_url,o.id LIMIT 68` },
    { kind: "sourceState", limit: 7, sql: `SELECT s.source_id,s.provider_id,s.company_token,s.governance_revision,s.compliance_state,s.operational_state,s.canary_max_new_items_per_tick,s.opt_out,s.policy_expiry,s.review_deadline,f.last_attempt_at,f.last_success_at,f.last_count,CASE WHEN f.last_error IS NULL THEN 0 ELSE 1 END AS last_error_present,f.updated_at AS fetch_state_updated_at,e.id AS latest_admission_id,e.source_governance_revision AS latest_admission_source_revision,e.provider_governance_revision AS latest_admission_provider_revision,e.expires_at AS latest_admission_expires_at,EXISTS(SELECT 1 FROM source_admission_current_evidence current WHERE current.source_id=s.source_id AND current.id=e.id) AS latest_admission_in_current_view FROM source_registry s LEFT JOIN source_fetch_state f ON f.source_id=s.source_id LEFT JOIN source_admission_evidence e ON e.id=(SELECT max(latest.id) FROM source_admission_evidence latest WHERE latest.source_id=s.source_id) WHERE s.source_id IN (${sources}) ORDER BY s.source_id LIMIT 7` },
    { kind: "recentFetchEvents", limit: 120, sql: `SELECT id,source_id,timestamp,ok,skipped,count,duration_ms,not_modified,CASE WHEN error IS NULL THEN 0 ELSE 1 END AS error_present,CASE WHEN skip_reason LIKE 'Workable rotation:%' THEN substr(skip_reason,1,140) WHEN skip_reason LIKE 'Workable admission:%' THEN substr(skip_reason,1,240) WHEN skip_reason IS NOT NULL THEN 'OTHER_SKIP_REASON_NOT_RETAINED' ELSE NULL END AS safe_skip_reason,robots_verdict,robots_mode,robots_would_block FROM source_fetch_events WHERE source_id IN (${sources}) AND julianday(timestamp)>=julianday(${quoted(since)}) ORDER BY timestamp DESC,id DESC LIMIT 120` },
    { kind: "recentPublicationLedger", limit: 100, sql: `SELECT id,source_id,tick_key,mode,proposed_count,published_count,published_ids_json,decided_at FROM source_publication_ledger WHERE source_id IN (${sources}) AND julianday(decided_at)>=julianday(${quoted(since)}) ORDER BY decided_at DESC,id DESC LIMIT 100` },
    { kind: "snapshotMetadata", limit: 1, sql: "SELECT id,generated_at,refresh_started_at,length(payload) AS payload_chars,CASE WHEN substr(payload,1,3)='gz:' THEN 1 ELSE 0 END AS gzip_encoded FROM public_serving_snapshot WHERE id=1 LIMIT 1" },
  ];
}

const SNAPSHOT_PAIRS = [
  ["X-Public-Snapshot", "va-hub:snapshot-status"], ["X-Public-Snapshot-Generated-At", "va-hub:snapshot-generated-at"],
  ["X-Public-Snapshot-Source", "va-hub:snapshot-source"], ["X-Public-Snapshot-Age-Seconds", "va-hub:snapshot-age-seconds"],
  ["X-Public-Snapshot-Jobs", "va-hub:snapshot-jobs"], ["X-Public-Snapshot-Companies", "va-hub:snapshot-companies"],
];
const decode = (text: string) => text.replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
export function projectPublicHtml(headers: Headers, html: string, observedAt: string) {
  const metas: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) attrs[match[1]!.toLowerCase()] = decode(match[3]!);
    if (attrs.name?.startsWith("va-hub:snapshot-") && typeof attrs.content === "string") metas[attrs.name] = attrs.content;
  }
  const snapshot = SNAPSHOT_PAIRS.map(([header, meta]) => ({ header, meta, headerValue: headers.get(header!), metaValue: metas[meta!] ?? null,
    matches: headers.get(header!) !== null && headers.get(header!) === (metas[meta!] ?? null) }));
  const generatedAt = headers.get("X-Public-Snapshot-Generated-At");
  return { headers: Object.fromEntries([...SNAPSHOT_PAIRS.map(([header]) => header!), "Age", "Cache-Control", "CF-Cache-Status", "Date", "ETag"].map(name => [name, headers.get(name)])),
    snapshot, allSixHeaderMetaPairsMatch: snapshot.every(row => row.matches), htmlSha256: sha(html), htmlUtf8Bytes: new TextEncoder().encode(html).length,
    renderedUniqueJobLinkCount: new Set([...html.matchAll(/href=["']\/jobs\/(\d+)(?:[/?#][^"']*)?["']/g)].map(match => match[1])).size,
    presentAgeSeconds: generatedAt && Number.isFinite(Date.parse(generatedAt)) ? Math.max(0, Math.floor((Date.parse(observedAt) - Date.parse(generatedAt)) / 1000)) : null };
}

async function main() {
  const inputs = validateInputs(process.argv.slice(2));
  const cohortBytes = await readFile(COHORT_PATH);
  const cohort = validateCohort(JSON.parse(cohortBytes.toString("utf8")));
  const output = resolve(ROOT, `tmp/workable-postrelease-${inputs.phase}-2026-10-20.json`);
  // Exclusive reservation occurs only after all untrusted SQL inputs validate.
  const file = await open(output, "wx");
  const out: any = { scope: "POST_RELEASE_BOUNDED_D1_SELECTS_AND_ONE_ORDINARY_PUBLIC_GET", ...inputs, observedStart: new Date().toISOString(),
    helperSha256: sha(await readFile(import.meta.path)), cohortPath: COHORT_PATH, cohortSha256: sha(cohortBytes), cohort,
    publicServingPredicate: PUBLIC_PREDICATE, sourceCwd: SOURCE_CWD, observations: [] };
  try {
    for (const query of buildQueries(cohort, inputs.since)) {
      const observation: any = { kind: query.kind, observedAt: new Date().toISOString(), query: query.sql, querySha256: sha(query.sql), limit: query.limit,
        truncationCaveat: "A full limit may omit additional matching rows; fewer rows do not prove the absence of events outside the since window" };
      try {
        const result = queryD1ReadOnly<any>(query.sql, SOURCE_CWD);
        if (result.meta?.rows_written !== 0) throw new Error("Explicit zero-write receipt required");
        Object.assign(observation, result, { status: "OK", limitReached: result.results.length === query.limit });
      } catch (error: any) { Object.assign(observation, { status: "UNAVAILABLE", errorClass: error?.name, exitStatus: error?.status }); }
      out.observations.push(observation);
    }
    try {
      const response = await fetch(PUBLIC_URL, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(30000) });
      const html = await response.text(), observedAt = new Date().toISOString();
      out.public = { url: PUBLIC_URL, observedAt, status: response.status, ...projectPublicHtml(response.headers, html, observedAt) };
    } catch (error: any) { out.public = { url: PUBLIC_URL, status: "UNAVAILABLE", errorClass: error?.name }; }
    const opportunityRows = out.observations.find((row: any) => row.kind === "exactMissOpportunities" && row.status === "OK")?.results;
    if (opportunityRows) out.exactMissSummary = {
      queriedRowIds: opportunityRows.map((row: any) => row.id),
      exactSourcePublicRowIds: opportunityRows.filter((row: any) => row.matches_public_predicate === 1 && cohort.some(c => c.sourceUrl === row.source_url && c.sourceId === row.source_id)).map((row: any) => row.id),
      noStoredRow: cohort.filter(c => !opportunityRows.some((row: any) => row.source_url === c.sourceUrl)),
      wrongSourceRowIds: opportunityRows.filter((row: any) => !cohort.some(c => c.sourceUrl === row.source_url && c.sourceId === row.source_id)).map((row: any) => row.id),
      warning: "Actual queried row IDs, never summed ledger counts; a current eligible label is not independent PH adjudication or a first-publication receipt" };
    out.readsVerifiedZeroWrites = out.observations.length === 5 && out.observations.every((row: any) => row.status === "OK" && row.meta?.rows_written === 0);
    out.observedEnd = new Date().toISOString();
    out.limitations = ["Sequential reads and GET are not an atomic snapshot", "Only17 retained exact miss URLs and seven named sources are traced; location variants are not distinct openings",
      "Current-admission view membership is weaker than the full immutable packet validator and grants no authority", "Event/ledger limits can truncate; ledger counts and empty ID arrays are not actual publication receipts",
      "Posted/scraped timestamps and current labels do not certify first publication, PH precision or daily verified throughput", "The unchanged public predicate is active+eligible_verified/eligible_likely; no lifetime serving-age rule is added",
      "Snapshot headers describe serving response, not provider or GCP runtime health; cached HTML can replay render-time metadata", "Ordinary public GET may trigger the application's normal snapshot refresh; observer sends no mutation request",
      "No provider fetch, manual scraper, real AI, deployment, source/config change or direct production write; control-plane comparison is left to the parent task"];
    await file.writeFile(JSON.stringify(out, null, 2) + "\n");
    console.log(JSON.stringify({ output, observedEnd: out.observedEnd, readsVerifiedZeroWrites: out.readsVerifiedZeroWrites, exactMissSummary: out.exactMissSummary,
      public: { status: out.public?.status, allSixHeaderMetaPairsMatch: out.public?.allSixHeaderMetaPairsMatch, snapshotJobs: out.public?.headers?.["X-Public-Snapshot-Jobs"] } }));
    if (!out.readsVerifiedZeroWrites || out.public?.status !== 200) process.exitCode = 1;
  } finally { await file.close(); }
}
if (import.meta.main) await main();
