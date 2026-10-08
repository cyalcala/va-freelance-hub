import { sanitizeSourceUrl } from "../../packages/scraper/urls";
import { normalizeDirectoryUrl } from "../../apps/web/src/lib/directory-card";

export interface DirectoryFactualBaseline {
  id: number; companyName: string;
  website: string | null; hiringPageUrl: string | null;
  websiteSource: string | null; websiteEvidence: string | null; websiteSetAt: string | null;
  hiresFilipinos: 0 | 1; isVerified: 0 | 1; isRemote: 0 | 1; isDayshift: 0 | 1; isMarketplace: 0 | 1;
  linkFailCount: number; publicVisible: 0 | 1;
  linkHealth: { state: "KNOWN"; value: { linkStatus: string | null; linkCheckedAt: string | null; linkEvidence: string | null } }
    | { state: "UNKNOWN" };
}
export interface DirectoryFactualChange {
  field: "website" | "hiring_page_url";
  value: string;
  evidence: { kind: "PRIMARY_OFFICIAL"; url: string; capturedAt: string; companyName: string; field: "website" | "hiring_page_url" };
}
export interface DirectoryFactualRow {
  id: number; companyName: string; identity: "CONFIRMED" | "HELD";
  baseline: { state: "KNOWN"; value: DirectoryFactualBaseline } | { state: "UNKNOWN" };
  review: { status: "ACCEPTED" | "NOT_PERFORMED" | "HELD"; reviewerId: string | null; reviewedAt: string | null };
  changes: DirectoryFactualChange[];
}
export interface DirectoryFactualPatchPacket {
  version: 1; preparedAt: string; validFrom: string; expiresAt: string;
  baselineReceipt: { status: "PASS" | "UNKNOWN" | "FAILED"; observedAt: string | null; receiptId: string | null;
    success: boolean | null; rowsWritten: number | null; changedDb: boolean | null };
  rows: DirectoryFactualRow[];
}
export type DirectoryFactualReason = "PACKET_INVALID" | "WINDOW_INVALID" | "BASELINE_UNAVAILABLE" | "ROW_INVALID"
  | "IDENTITY_HELD" | "BASELINE_INVALID" | "NOT_VISIBLE" | "REVIEW_NOT_ACCEPTED" | "PRIMARY_EVIDENCE_INVALID"
  | "URL_INVALID" | "NO_CHANGE" | "GUARDED_PATCH_READY";
export interface DirectoryFactualPatchOutcome {
  id: number | null; state: "HELD" | "NO_CHANGE" | "READY"; reasons: [DirectoryFactualReason];
  changedFields: string[]; updateSql?: string; undoSql?: string;
}
export interface DirectoryFactualPatchPlan {
  version: 1; mode: "EMIT_ONLY"; state: "HELD" | "NO_CHANGE" | "READY"; reasons: [DirectoryFactualReason];
  rows: DirectoryFactualPatchOutcome[]; readyCount: number; productionReads: 0; productionWrites: 0;
  publicationAuthorized: false; qualificationAuthorized: false;
}

type RecordValue = Record<string, unknown>;
const columns = {
  id: "id", companyName: "company_name", website: "website", hiringPageUrl: "hiring_page_url",
  websiteSource: "website_source", websiteEvidence: "website_evidence", websiteSetAt: "website_set_at",
  hiresFilipinos: "hires_filipinos", isVerified: "is_verified", isRemote: "is_remote", isDayshift: "is_dayshift",
  isMarketplace: "is_marketplace", linkFailCount: "link_fail_count",
} as const;
const healthColumns = { linkStatus: "link_status", linkCheckedAt: "link_checked_at", linkEvidence: "link_evidence" } as const;
type BaselineKey = keyof typeof columns;
const baselineKeys = [...Object.keys(columns), "publicVisible", "linkHealth"];
const nullableKeys = ["website", "hiringPageUrl", "websiteSource", "websiteEvidence", "websiteSetAt"];
const flagKeys = ["hiresFilipinos", "isVerified", "isRemote", "isDayshift", "isMarketplace", "publicVisible"];

function exact(value: unknown, keys: string[]): value is RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function text(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= limit && value.trim().length > 0
    && value.trim().toUpperCase() !== "UNKNOWN" && !/[\u0000-\u001f\u007f]/.test(value);
}
function clock(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value ? time : null;
}
function url(value: unknown): string | null {
  return text(value, 2048) ? sanitizeSourceUrl(normalizeDirectoryUrl(value)) : null;
}
function positiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function nullable(value: unknown, limit: number): boolean {
  return value === null || typeof value === "string" && value.length <= limit
    && value.trim().toUpperCase() !== "UNKNOWN" && !/[\u0000-\u001f\u007f]/.test(value);
}
function baseline(value: unknown, id: number, name: string): value is DirectoryFactualBaseline {
  return exact(value, baselineKeys) && value.id === id && value.companyName === name
    && nullableKeys.every(key => nullable(value[key], key === "websiteEvidence" ? 8192 : 2048))
    && flagKeys.every(key => value[key] === 0 || value[key] === 1)
    && typeof value.linkFailCount === "number" && Number.isSafeInteger(value.linkFailCount) && value.linkFailCount >= 0
    && (exact(value.linkHealth, ["state"]) && value.linkHealth.state === "UNKNOWN" || knownHealth(value.linkHealth));
}
function knownHealth(value: unknown): value is Extract<DirectoryFactualBaseline["linkHealth"], { state: "KNOWN" }> {
  if (!exact(value, ["state", "value"]) || value.state !== "KNOWN") return false;
  const health = value.value;
  return exact(health, Object.keys(healthColumns))
    && Object.keys(healthColumns).every(key => nullable(health[key], key === "linkEvidence" ? 8192 : 2048));
}
function held(id: number | null, reason: DirectoryFactualReason): DirectoryFactualPatchOutcome {
  return { id, state: "HELD", reasons: [reason], changedFields: [] };
}
function result(rows: DirectoryFactualPatchOutcome[], reason?: DirectoryFactualReason): DirectoryFactualPatchPlan {
  const readyCount = rows.filter(row => row.state === "READY").length;
  const state = readyCount ? "READY" : reason || rows.some(row => row.state === "HELD") ? "HELD" : "NO_CHANGE";
  return { version: 1, mode: "EMIT_ONLY", state, reasons: [reason ?? (readyCount ? "GUARDED_PATCH_READY"
    : rows.find(row => row.state === "HELD")?.reasons[0] ?? "NO_CHANGE")], rows, readyCount,
    productionReads: 0, productionWrites: 0, publicationAuthorized: false, qualificationAuthorized: false };
}
// SQLite IS pins NULL as a value; embedded single quotes are doubled, per https://www.sqlite.org/lang_expr.html.
function literal(value: string | number | null): string {
  return value === null ? "NULL" : typeof value === "number" ? String(value) : `'${value.replace(/'/g, "''")}'`;
}
type SqlValues = Record<string, string | number | null>;
function values(value: DirectoryFactualBaseline, includeHealth: boolean): SqlValues {
  const result: SqlValues = {};
  for (const key of Object.keys(columns) as BaselineKey[]) result[columns[key]] = value[key];
  if (includeHealth && value.linkHealth.state === "KNOWN") {
    for (const key of Object.keys(healthColumns) as (keyof typeof healthColumns)[]) result[healthColumns[key]] = value.linkHealth.value[key];
  }
  return result;
}
function sql(expected: SqlValues, target: SqlValues, changed: string[]): string {
  const set = changed.map(column => `${column}=${literal(target[column]!)}`).join(", ");
  const guard = Object.keys(expected).map(column => `${column} IS ${literal(expected[column]!)}`).join(" AND ");
  return `UPDATE va_directory SET ${set} WHERE ${guard};`;
}

/**
 * Pure preparation: review/evidence records are metadata, not authentication or publication authority.
 * CONFIRMED describes company facts; a KNOWN baseline separately binds the exact database ID/name.
 * capturedAt dates the retained primary extraction, not the origin page's publication or response time.
 * The caller's finite window is a preparation constraint, not a production freshness policy.
 * Website changes invalidate prior URL provenance and known health receipts, preserving strikes and flags.
 */
export function planDirectoryFactualPatch(packet: DirectoryFactualPatchPacket, now: string): DirectoryFactualPatchPlan {
  if (!exact(packet, ["version", "preparedAt", "validFrom", "expiresAt", "baselineReceipt", "rows"])
    || packet.version !== 1 || !Array.isArray(packet.rows) || packet.rows.length < 1 || packet.rows.length > 3) {
    return result([], "PACKET_INVALID");
  }
  const ids = Array.from(packet.rows, row => row?.id).filter(positiveId);
  if (new Set(ids).size !== ids.length) return result([], "PACKET_INVALID");
  const start = clock(packet.validFrom), end = clock(packet.expiresAt), prepared = clock(packet.preparedAt), current = clock(now);
  if (start === null || end === null || prepared === null || current === null
    || start > prepared || prepared > current || current >= end || start >= end) return result([], "WINDOW_INVALID");
  const inWindow = (value: unknown): number | null => {
    const time = clock(value);
    return time !== null && time >= start && time <= current && time < end ? time : null;
  };
  const receipt = packet.baselineReceipt;
  const observed = exact(receipt, ["status", "observedAt", "receiptId", "success", "rowsWritten", "changedDb"])
    && receipt.status === "PASS" && receipt.success === true && receipt.rowsWritten === 0 && receipt.changedDb === false
    && text(receipt.receiptId, 300) ? inWindow(receipt.observedAt) : null;
  const outcomes = Array.from(packet.rows, (row): DirectoryFactualPatchOutcome => {
    const id = positiveId(row?.id) ? row.id : null;
    if (!exact(row, ["id", "companyName", "identity", "baseline", "review", "changes"])
      || id === null || !text(row.companyName, 300) || !["CONFIRMED", "HELD"].includes(row.identity)) return held(id, "ROW_INVALID");
    if (row.identity === "HELD") return held(id, "IDENTITY_HELD");
    if (observed === null) return held(id, "BASELINE_UNAVAILABLE");
    if (!exact(row.baseline, ["state", "value"]) || row.baseline.state !== "KNOWN"
      || !baseline(row.baseline.value, id, row.companyName)) return held(id, "BASELINE_INVALID");
    const before = row.baseline.value;
    // Same public-directory predicate as directory-visibility.ts; all constituent flags are CAS-pinned.
    if (before.publicVisible !== 1 || before.hiresFilipinos !== 1 || before.linkFailCount >= 3) return held(id, "NOT_VISIBLE");
    const review = row.review;
    const reviewed = exact(review, ["status", "reviewerId", "reviewedAt"]) && review.status === "ACCEPTED"
      && text(review.reviewerId, 300) ? inWindow(review.reviewedAt) : null;
    if (reviewed === null || reviewed < observed) return held(id, "REVIEW_NOT_ACCEPTED");
    if (!Array.isArray(row.changes) || row.changes.length < 1 || row.changes.length > 2) return held(id, "ROW_INVALID");
    const after = { ...before }, changed: string[] = [], fields = new Set<string>();
    let websiteChanged = false;
    for (const change of row.changes) {
      if (!exact(change, ["field", "value", "evidence"]) || !["website", "hiring_page_url"].includes(change.field)
        || fields.has(change.field)) return held(id, "ROW_INVALID");
      fields.add(change.field);
      const desired = url(change.value);
      if (desired === null) return held(id, "URL_INVALID");
      const evidence = change.evidence;
      const captured = exact(evidence, ["kind", "url", "capturedAt", "companyName", "field"])
        && evidence.kind === "PRIMARY_OFFICIAL" && evidence.companyName === row.companyName && evidence.field === change.field
        && url(evidence.url) !== null ? inWindow(evidence.capturedAt) : null;
      if (captured === null || captured > reviewed) return held(id, "PRIMARY_EVIDENCE_INVALID");
      const key = change.field === "website" ? "website" : "hiringPageUrl";
      if (url(before[key]) === desired) continue;
      after[key] = desired; changed.push(columns[key]);
      if (key === "website") {
        if (before.linkHealth.state !== "KNOWN") return held(id, "BASELINE_INVALID");
        websiteChanged = true;
        for (const provenance of ["websiteSource", "websiteEvidence", "websiteSetAt"] as const) {
          after[provenance] = null; changed.push(columns[provenance]);
        }
        after.linkHealth = { state: "KNOWN", value: { linkStatus: null, linkCheckedAt: null, linkEvidence: null } };
        changed.push(...Object.values(healthColumns));
      }
    }
    return changed.length ? { id, state: "READY", reasons: ["GUARDED_PATCH_READY"], changedFields: changed,
      updateSql: sql(values(before, websiteChanged), values(after, websiteChanged), changed),
      undoSql: sql(values(after, websiteChanged), values(before, websiteChanged), changed) }
      : { id, state: "NO_CHANGE", reasons: ["NO_CHANGE"], changedFields: [] };
  });
  return result(outcomes);
}
