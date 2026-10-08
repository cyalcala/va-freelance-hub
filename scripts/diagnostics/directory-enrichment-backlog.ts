/** Evidence inventory only: no source fetch, inference, admission or DB writes. */
import { createRequire } from "node:module";
import { directoryVisibilityFilters } from "../../apps/web/src/lib/directory-visibility";
import { normalizeDirectoryUrl } from "../../apps/web/src/lib/directory-card";
import { queryD1ReadOnly, type D1ReadResult } from "./query-d1-readonly";

const MAX_ROWS = 5000;
// Drizzle belongs to the web workspace; resolve its existing installation there.
const { SQLiteSyncDialect } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("drizzle-orm/sqlite-core");
export interface DirectoryEvidenceRow {
  id: number; companyName: string; website: string | null; hiringPageUrl: string | null;
  isVerified: number; verifiedAt: string | null; atsPlatform: string | null; atsToken: string | null;
  websiteSource: string | null; websiteEvidence: string | null; websiteSetAt: string | null;
  linkStatus: string | null; linkCheckedAt: string | null; publicVisible: number;
}

/** Reuse the public predicate instead of maintaining a parallel visibility rule. */
export function buildDirectoryEvidenceQuery(): string {
  const visibility = new SQLiteSyncDialect().sqlToQuery(directoryVisibilityFilters().inlineParams()).sql;
  return `SELECT id, company_name AS companyName, website, hiring_page_url AS hiringPageUrl,
    is_verified AS isVerified, verified_at AS verifiedAt, ats_platform AS atsPlatform, ats_token AS atsToken,
    website_source AS websiteSource, website_evidence AS websiteEvidence, website_set_at AS websiteSetAt,
    link_status AS linkStatus, link_checked_at AS linkCheckedAt,
    CASE WHEN ${visibility} THEN 1 ELSE 0 END AS publicVisible
    FROM va_directory ORDER BY id LIMIT ${MAX_ROWS + 1};`;
}

function hasText(value: string | null): boolean { return Boolean(value?.trim()); }
function safeUrl(value: string | null): boolean {
  return normalizeDirectoryUrl(value) !== null;
}
function datedEvidence(value: string | null, nowMs: number): boolean {
  if (!hasText(value)) return false;
  const raw = value!.trim().replace(" ", "T");
  const ms = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`);
  return Number.isFinite(ms) && ms <= nowMs;
}

const ACTIONS = {
  missing_website: "Resolve the existing company's identity and official website using permitted evidence; retain provenance.",
  unsafe_website: "Review the unsafe website value and identity evidence through the existing guarded repair process.",
  unsafe_hiring_path: "Review the unsafe hiring URL against the exact existing company/tenant; do not follow it.",
  website_provenance_gap: "Recover provenance for the current website value; do not guess from the company name.",
  missing_hiring_path: "Resolve a supported hiring path for the existing company/ATS identity; permission remains separate.",
  verification_evidence_gap: "Recover dated independent PH hiring evidence before changing the verification flag.",
  incomplete_ats_identity: "Resolve the exact existing provider/tenant identity before creating any source or URL.",
  link_evidence_gap: "Review the current link-health evidence and next permitted check; bot walls do not authorize a bypass.",
} as const;
type Gap = keyof typeof ACTIONS;

function priority(gaps: Gap[]): number {
  if (gaps.some((gap) => ["unsafe_website", "unsafe_hiring_path"].includes(gap))) return 0;
  if (gaps.some((gap) => ["missing_website", "website_provenance_gap"].includes(gap))) return 1;
  if (gaps.includes("missing_hiring_path")) return 2;
  return 3;
}

export function directoryEvidenceBacklog(rows: DirectoryEvidenceRow[], now: Date | string = new Date()) {
  const measuredAt = new Date(now).toISOString();
  const nowMs = Date.parse(measuredAt);
  if (rows.length > MAX_ROWS) throw new Error("directory inventory exceeds limit; increase the bounded contract before claiming coverage");
  const ids = new Set<number>();
  const gapCounts = Object.fromEntries(Object.keys(ACTIONS).map((key) => [key, 0])) as Record<Gap, number>;
  let visibleRows = 0;
  const backlog: Array<{ id: number; companyName: string; gaps: Gap[]; priority: number; nextAction: string }> = [];
  for (const row of rows) {
    if (!Number.isSafeInteger(row.id) || row.id < 1 || !hasText(row.companyName) || ![0, 1].includes(row.publicVisible)) throw new Error("invalid directory identity/visibility");
    if (ids.has(row.id)) throw new Error("duplicate directory ID");
    ids.add(row.id);
    if (row.publicVisible !== 1) continue;
    visibleRows++;
    const gaps: Gap[] = [];
    if (!hasText(row.website)) gaps.push("missing_website");
    else {
      if (!safeUrl(row.website)) gaps.push("unsafe_website");
      if (!["curated", "manual"].includes(row.websiteSource ?? "") || !hasText(row.websiteEvidence) || !datedEvidence(row.websiteSetAt, nowMs)) gaps.push("website_provenance_gap");
    }
    if (!hasText(row.hiringPageUrl)) gaps.push("missing_hiring_path");
    else if (!safeUrl(row.hiringPageUrl)) gaps.push("unsafe_hiring_path");
    if (row.isVerified !== 1 || !datedEvidence(row.verifiedAt, nowMs)) gaps.push("verification_evidence_gap");
    if (hasText(row.atsPlatform) !== hasText(row.atsToken)) gaps.push("incomplete_ats_identity");
    if (row.linkStatus !== "ok" || !datedEvidence(row.linkCheckedAt, nowMs)) gaps.push("link_evidence_gap");
    for (const gap of gaps) gapCounts[gap]++;
    if (gaps.length) {
      const rank = priority(gaps);
      const firstGap = rank === 0 ? gaps.find((gap) => gap.startsWith("unsafe_"))! : gaps[0];
      backlog.push({ id: row.id, companyName: row.companyName, gaps, priority: rank, nextAction: ACTIONS[firstGap] });
    }
  }
  backlog.sort((a, b) => a.priority - b.priority || a.id - b.id);
  return {
    schemaVersion: 1, measuredAt, totalRows: rows.length, visibleRows, hiddenRows: rows.length - visibleRows,
    visibleRowsWithGaps: backlog.length, visibleRowsWithoutSelectedGaps: visibleRows - backlog.length,
    gapCounts, backlog, publicationAuthority: "UNKNOWN" as const,
    limitations: ["Gaps overlap; their sum is not the number of companies.",
      "Stored flags, dates and provenance are evidence pointers, not independently reverified facts or current source permission.",
      "No external links were fetched; no directory fields, source states or jobs were written.",
      "Rows without selected gaps are not a claim of verified hiring, freshness, safe links or publication authority."],
  };
}

export function queryDirectoryEvidence(cwd = process.cwd()): D1ReadResult<DirectoryEvidenceRow> {
  return queryD1ReadOnly<DirectoryEvidenceRow>(buildDirectoryEvidenceQuery(), cwd);
}

if (import.meta.main) {
  try {
    const result = queryDirectoryEvidence();
    console.log(JSON.stringify({ ...directoryEvidenceBacklog(result.results), query: buildDirectoryEvidenceQuery(), receipt: result.meta ?? null }, null, 2));
  } catch (error) {
    console.error("Directory evidence diagnostic failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
