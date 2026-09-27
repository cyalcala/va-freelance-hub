/** Current eligible inventory by storage date, not a first-publication certificate. */
import { execFileSync } from "node:child_process";
import { providerFamily } from "../ci/constitution-metrics";

export const MANILA_DAILY_FLOOR = 100;
export const MANILA_DAILY_STRETCH = 150;
export const FRESHNESS_WINDOW_SECONDS = 7 * 86_400;
const DAY_MS = 86_400_000;
const MANILA_OFFSET_MS = 8 * 3_600_000;

export interface ManilaWindow {
  measuredAt: string;
  startInclusive: string;
  endExclusive: string;
  timeZone: "Asia/Manila";
  dates: string[];
}

/** The current Manila day is incomplete, including at midnight. */
export function completeManilaWindow(targetDays = 7, now: Date | string = new Date()): ManilaWindow {
  if (!Number.isSafeInteger(targetDays) || targetDays < 1 || targetDays > 366) {
    throw new Error("targetDays must be an integer between 1 and 366");
  }
  const instant = new Date(now);
  if (!Number.isFinite(instant.getTime())) throw new Error("measurement time is invalid");
  const endMs = Math.floor((instant.getTime() + MANILA_OFFSET_MS) / DAY_MS) * DAY_MS - MANILA_OFFSET_MS;
  return {
    measuredAt: instant.toISOString(),
    startInclusive: new Date(endMs - targetDays * DAY_MS).toISOString(),
    endExclusive: new Date(endMs).toISOString(),
    timeZone: "Asia/Manila",
    dates: Array.from({ length: targetDays }, (_, i) =>
      new Date(endMs - (i + 1) * DAY_MS + MANILA_OFFSET_MS).toISOString().slice(0, 10)),
  };
}

/** SQLite unzoned timestamps are UTC; preserve explicit ISO offsets. */
function timestampMs(value: string): number {
  const normalized = value.trim().replace(" ", "T");
  return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`);
}

export interface OpportunityPublicationRow {
  id: number;
  source_id: string | null;
  source_platform: string | null;
  posted_at: string | null;
  scraped_at: string;
  is_active: number;
  ph_eligibility: string | null;
}

interface StorageBreakdown {
  stored: number;
  recentPosted: number;
  olderPosted: number;
  unknownPosted: number;
}

export interface DailyPublicationMetrics {
  manilaDate: string;
  eligibleStoredCount: number;
  recentPostedStorage: number;
  olderPostedStorage: number;
  missingPostedAt: number;
  invalidPostedAt: number;
  futurePostedAt: number;
  publicationFreshFlow: null;
  floorStatus: "UNKNOWN";
  bySource: Record<string, StorageBreakdown>;
  byFamily: Record<string, StorageBreakdown>;
}

export interface PublicationReport {
  measuredAt: string;
  measurementKind: "current_eligible_storage_proxy";
  window: ManilaWindow;
  days: DailyPublicationMetrics[];
  summary: {
    totalEvaluatedDays: number;
    avgDailyRecentPostedStorage: number;
    avgDailyOlderPostedStorage: number;
    publicationFreshFlow: null;
    floorStatus: "UNKNOWN";
    limitations: string[];
  };
}

export function calculateManilaDailyMetrics(
  rows: OpportunityPublicationRow[], targetDays = 7, now: Date | string = new Date(),
): PublicationReport {
  const window = completeManilaWindow(targetDays, now);
  const startMs = Date.parse(window.startInclusive);
  const endMs = Date.parse(window.endExclusive);
  const days: DailyPublicationMetrics[] = window.dates.map((manilaDate) => ({
    manilaDate, eligibleStoredCount: 0, recentPostedStorage: 0, olderPostedStorage: 0,
    missingPostedAt: 0, invalidPostedAt: 0, futurePostedAt: 0,
    publicationFreshFlow: null, floorStatus: "UNKNOWN", bySource: {}, byFamily: {},
  }));
  const dayMap = new Map(days.map((day) => [day.manilaDate, day]));
  const seenIds = new Set<number>();
  for (const row of rows) {
    if (row.is_active !== 1 || !["eligible_verified", "eligible_likely"].includes(row.ph_eligibility ?? "")) continue;
    const storedMs = timestampMs(row.scraped_at);
    if (!Number.isFinite(storedMs) || storedMs < startMs || storedMs >= endMs || seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    const day = dayMap.get(new Date(storedMs + MANILA_OFFSET_MS).toISOString().slice(0, 10))!;
    day.eligibleStoredCount += 1;
    let bucket: "recentPosted" | "olderPosted" | "unknownPosted" = "unknownPosted";
    if (!row.posted_at) day.missingPostedAt += 1;
    else {
      const postedMs = timestampMs(row.posted_at);
      const ageMs = storedMs - postedMs;
      if (!Number.isFinite(postedMs)) day.invalidPostedAt += 1;
      else if (ageMs < 0) day.futurePostedAt += 1;
      else if (ageMs <= FRESHNESS_WINDOW_SECONDS * 1000) {
        bucket = "recentPosted";
        day.recentPostedStorage += 1;
      } else {
        bucket = "olderPosted";
        day.olderPostedStorage += 1;
      }
    }
    const sourceId = row.source_id || "unattributed";
    for (const [breakdown, key] of [[day.bySource, sourceId], [day.byFamily, providerFamily(sourceId)]] as const) {
      const stats = breakdown[key] ??= { stored: 0, recentPosted: 0, olderPosted: 0, unknownPosted: 0 };
      stats.stored += 1;
      stats[bucket] += 1;
    }
  }
  return {
    measuredAt: window.measuredAt, measurementKind: "current_eligible_storage_proxy", window, days,
    summary: {
      totalEvaluatedDays: targetDays,
      avgDailyRecentPostedStorage: Number((days.reduce((sum, day) => sum + day.recentPostedStorage, 0) / targetDays).toFixed(1)),
      avgDailyOlderPostedStorage: Number((days.reduce((sum, day) => sum + day.olderPostedStorage, 0) / targetDays).toFixed(1)),
      publicationFreshFlow: null, floorStatus: "UNKNOWN",
      limitations: [
        "Counts use scraped_at and current active/PH eligibility; later deactivation or reclassification changes this snapshot.",
        "A recent posting age (0 to 7 days) is necessary evidence only, not a FRESH_DISCOVERY cohort assignment.",
        "Canonical first-exposure receipts, publication-time authority, replay/reactivation provenance and public-route verification are not measured.",
        "Zero means no matching current rows on that storage date; it does not prove a historical day had zero publications or complete telemetry.",
      ],
    },
  };
}

export function formatPublicationReportMarkdown(report: PublicationReport): string {
  const lines = [
    "# Manila-Day Current Eligible Storage Diagnostic", "",
    `**Measured at:** ${report.measuredAt}`,
    `**Window:** [${report.window.startInclusive}, ${report.window.endExclusive}) — ${report.days.length} complete Asia/Manila days.`,
    "**Measurement:** current active, PH-eligible inventory grouped by scraped_at; this is a storage proxy, not verified first-publication flow.",
    `**Recent posting age:** 0 to ${FRESHNESS_WINDOW_SECONDS / 86_400} days, inclusive; missing, invalid and future dates remain unknown.`,
    `**Receipt-backed fresh flow / ${MANILA_DAILY_FLOOR}-per-day floor / ${MANILA_DAILY_STRETCH}-per-day stretch:** UNKNOWN.`, "",
    "| Manila storage date | Recent posting | Older posting | Missing date | Invalid date | Future date | Eligible stored |",
    "| :--- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.days.map((day) => `| ${day.manilaDate} | ${day.recentPostedStorage} | ${day.olderPostedStorage} | ${day.missingPostedAt} | ${day.invalidPostedAt} | ${day.futurePostedAt} | ${day.eligibleStoredCount} |`), "",
    `Average recent-posting storage proxy: **${report.summary.avgDailyRecentPostedStorage}/day**.`, "",
    ...report.summary.limitations.map((limitation) => `- ${limitation}`), "",
    "## Source-family storage breakdown", "",
    "| Manila storage date | Family | Recent posting | Older posting | Unknown posting | Stored |",
    "| :--- | :--- | ---: | ---: | ---: | ---: |",
  ];
  for (const day of report.days) {
    for (const [family, stats] of Object.entries(day.byFamily)) {
      lines.push(`| ${day.manilaDate} | ${family} | ${stats.recentPosted} | ${stats.olderPosted} | ${stats.unknownPosted} | ${stats.stored} |`);
    }
  }
  return lines.join("\n");
}

export function buildD1OpportunitiesQuery(days = 7, now: Date | string = new Date()): string {
  const window = completeManilaWindow(days, now);
  return `SELECT id, source_id, source_platform, posted_at, scraped_at, is_active, ph_eligibility
    FROM opportunities WHERE is_active = 1 AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
    AND unixepoch(scraped_at) >= ${Date.parse(window.startInclusive) / 1000}
    AND unixepoch(scraped_at) < ${Date.parse(window.endExclusive) / 1000} ORDER BY id DESC;`;
}

export function queryD1Opportunities(cwd = process.cwd(), days = 7, now: Date | string = new Date()): OpportunityPublicationRow[] {
  const output = execFileSync("bun", ["run", "--cwd", "apps/web", "wrangler", "d1", "execute", "DB", "--remote", "--env", "production", "--command", buildD1OpportunitiesQuery(days, now), "--json"], {
    cwd, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024,
  });
  const startIdx = output.indexOf("[");
  if (startIdx === -1) throw new Error("D1 returned no JSON result");
  const parsed = JSON.parse(output.slice(startIdx));
  if (parsed[0]?.success !== true || !Array.isArray(parsed[0]?.results)) throw new Error("D1 did not confirm a successful inventory query");
  return parsed[0].results;
}

if (import.meta.main) {
  const now = new Date();
  try {
    console.log(formatPublicationReportMarkdown(calculateManilaDailyMetrics(queryD1Opportunities(process.cwd(), 7, now), 7, now)));
  } catch (error) {
    console.error("Storage diagnostic failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
