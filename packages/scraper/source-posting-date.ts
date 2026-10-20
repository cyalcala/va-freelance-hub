import { isAdmissionInstant } from "./admission-evidence";

const ISO_POSTING_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/i;
const RSS_POSTING_DATE = /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+(UT|UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|[+-]\d{2}:?\d{2})$/i;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const RSS_ZONE_MINUTES: Readonly<Record<string, number>> = {
  UT: 0, UTC: 0, GMT: 0, EST: -300, EDT: -240, CST: -360,
  CDT: -300, MST: -420, MDT: -360, PST: -480, PDT: -420,
};

/** Validate the source wall calendar before Date can repair it. Unsupported
 * source formats remain unknown. RSS numeric/GMT offsets follow the date forms
 * in RFC 5322 sections 3.3/4.3; weekday consistency is outside this repair.
 * ISO precision beyond milliseconds must survive until freshness assessment.
 */
export function normalizeSourcePostingDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (ISO_POSTING_DATE.test(raw)) {
    const original = raw.replace("t", "T").replace(/z$/, "Z");
    if (!isAdmissionInstant(`${original.slice(0, 19)}.000Z`)) return null;
    const millis = Date.parse(original);
    if (!Number.isFinite(millis)) return null;
    const precision = (original.match(/\.(\d+)/)?.[1] ?? "").length;
    return precision > 3 ? original : new Date(millis).toISOString();
  }
  const fields = raw.match(RSS_POSTING_DATE);
  if (!fields) return null;
  const [, day, month, year, hour, minute, second = "00", zone] = fields;
  const monthNumber = String(MONTHS.indexOf(month.toLowerCase()) + 1).padStart(2, "0");
  const wall = `${year}-${monthNumber}-${day.padStart(2, "0")}T${hour}:${minute}:${second}.000Z`;
  if (!isAdmissionInstant(wall)) return null;
  let offset = RSS_ZONE_MINUTES[zone.toUpperCase()];
  if (offset === undefined) {
    const compact = zone.replace(":", "");
    const hours = Number(compact.slice(1, 3));
    const minutes = Number(compact.slice(3, 5));
    if (hours > 23 || minutes > 59) return null;
    offset = (compact[0] === "+" ? 1 : -1) * (hours * 60 + minutes);
  }
  const millis = Date.parse(raw);
  // Check Date's conversion too: it must not reinterpret a valid-looking year
  // or other original component after the wall-calendar check.
  if (!Number.isFinite(millis) || millis + offset * 60_000 !== Date.parse(wall)) return null;
  return new Date(millis).toISOString();
}

/** Workable published_on is a calendar date on the widget surface. Preserve the
 * existing UTC date conversion, but validate the original calendar first. No
 * creation/edit clock substitutes for a missing original publication field. */
export function normalizeWorkablePublishedDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const instant = `${raw}T00:00:00.000Z`;
    return isAdmissionInstant(instant) ? instant : null;
  }
  return normalizeSourcePostingDate(raw);
}
