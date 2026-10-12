import { readFileSync } from "node:fs";
import { fetchATSFeed } from "../../../packages/scraper/ats";
import { normalizeSourcePostingDate } from "../../../packages/scraper/source-posting-date";
import { assessPostingFreshness } from "../../../packages/scraper/publication-freshness";

// Offline parser composition. It does not execute either publication route.
const observedAt = "2026-10-12T12:00:00.000Z";
const archived = JSON.parse(readFileSync(new URL("./ats-date-live-baseline.json", import.meta.url), "utf8"));
const legacyNormalize = new Function("rawDate", archived.safeNormalizeDateBody);
const samples = [
  { name: "fresh original", published_on: "2026-10-11T12:00:00.000Z" },
  { name: "impossible September31", published_on: "2026-09-31T12:00:00.000Z" },
  { name: "date only", published_on: "2026-10-11" },
  { name: "one nanosecond future", published_on: "2026-10-12T12:00:00.000000001Z" },
  { name: "missing publication with creation fallback", published_on: null, created_at: "2026-10-11T12:00:00.000Z" },
  { name: "missing both", published_on: null },
  { name: "stale original", published_on: "2026-09-01T12:00:00.000Z" },
  { name: "future original", published_on: "2026-10-13T12:00:00.000Z" },
];
let payload: unknown;
let interceptedAttempts = 0;
globalThis.fetch = (async (url: unknown) => {
  interceptedAttempts += 1;
  const value = String(url);
  if (value !== "https://apply.workable.com/api/v1/widget/accounts/synthetic-date-audit"
    && value !== "https://boards-api.greenhouse.io/v1/boards/synthetic-date-audit/jobs") {
    throw new Error("offline ATS date probe forbids every other URL");
  }
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
}) as typeof fetch;
payload = { jobs: samples.map((sample, n) => ({ ...sample, title: sample.name,
  shortcode: `SYNTHETIC${n}`, url: `https://apply.workable.com/synthetic-date-audit/j/SYNTHETIC${n}/`,
  country: "Philippines", telecommuting: true })) };
const items = await fetchATSFeed("workable", "synthetic-date-audit", "Synthetic date audit");
const workable = samples.map((sample, n) => {
  const input = sample.published_on || (sample as { created_at?: string }).created_at;
  const legacyPostedAt = legacyNormalize(input);
  const adapterPostedAt = items[n].postedAt;
  if (adapterPostedAt !== legacyPostedAt) throw new Error("Workable no longer matches archived date conversion; reassess this counterexample");
  return { ...sample, legacyPostedAt, adapterPostedAt,
    adapterFreshness: assessPostingFreshness(adapterPostedAt, observedAt),
    strictOriginal: normalizeSourcePostingDate(sample.published_on),
    originalFreshness: assessPostingFreshness(sample.published_on, observedAt) };
});
payload = { jobs: [{ title: "Edited stale role", absolute_url: "https://boards.greenhouse.io/synthetic-date-audit/jobs/1",
  internal_job_id: 1, updated_at: observedAt, first_published: "2026-09-01T12:00:00.000Z",
  location: { name: "Remote Philippines" } }] };
const greenhouseItems = await fetchATSFeed("greenhouse", "synthetic-date-audit", "Synthetic date audit");
const greenhouse = { raw: (payload as { jobs: unknown[] }).jobs[0],
  legacyPostedAt: legacyNormalize(observedAt),
  currentPostedAt: greenhouseItems[0].postedAt,
  legacyFreshnessIfChecked: assessPostingFreshness(legacyNormalize(observedAt), observedAt),
  currentFreshness: assessPostingFreshness(greenhouseItems[0].postedAt, observedAt) };
for (const name of ["impossible September31", "date only", "one nanosecond future", "missing publication with creation fallback"]) {
  const sample = workable.find(row => row.name === name)!;
  if (sample.adapterFreshness.state !== "WITHIN_WINDOW" || sample.originalFreshness.state === "WITHIN_WINDOW") {
    throw new Error(`expected discarded raw date evidence for ${name}`);
  }
}
if (greenhouse.currentFreshness.state !== "STALE" || greenhouse.legacyFreshnessIfChecked.state !== "WITHIN_WINDOW") {
  throw new Error("Greenhouse original/edit-date distinction changed");
}
console.log("ATS_DATE_COUNTEREXAMPLE " + JSON.stringify({
  scope: "ACTUAL_CURRENT_ATS_PARSER_AND_FRESHNESS_COMPOSITION_ARCHIVED_LEGACY_NORMALIZER_NOT_ROUTE_OR_LIVE_D1_PROOF",
  observedAt, legacyRevision: archived.gitRevision, interceptedAttempts, providerRequests: 0, aiCalls: 0,
  databaseWrites: 0, workable, greenhouse,
}));
