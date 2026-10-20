import { sql, getTableColumns } from "drizzle-orm";
import { opportunities, type NewOpportunity, type getDb } from "@va-hub/db";
import { atsEndpointUrl, geoGate } from "@va-hub/scraper";
import { loadCurrentAdmissionEvidence, type AdmissionDatabase, type CurrentAdmissionEvidenceResult } from "../../../../packages/scraper/admission-evidence";
import { assessPostingFreshness } from "../../../../packages/scraper/publication-freshness";
import { isObviousGeoRestriction, isObviousNonEnglishOrLocalOnly } from "../../../../packages/scraper/triage";

type Current = Extract<CurrentAdmissionEvidenceResult, { ok: true }>;
export const workableOpeningColumns = {
  id: opportunities.id, sourceId: opportunities.sourceId, sourceUrl: opportunities.sourceUrl,
  title: opportunities.title, description: opportunities.description, tags: opportunities.tags,
  company: opportunities.company, applicationUrl: opportunities.applicationUrl,
  locationType: opportunities.locationType, locationRaw: opportunities.locationRaw, postedAt: opportunities.postedAt,
  inactiveReason: opportunities.inactiveReason, phEligibility: opportunities.phEligibility,
};
type Snapshot = Pick<typeof opportunities.$inferSelect, keyof typeof workableOpeningColumns>;

export function workableOpeningHold(item: Pick<NewOpportunity, "title" | "description" | "locationRaw" | "locationType" | "tags" | "postedAt">, now: string, current: boolean, requirePositivePh = current): string | null {
  const prefix = current ? "CURRENT" : "STORED";
  if (item.locationType !== "remote") return `${prefix}_NOT_REMOTE`;
  const dateState = assessPostingFreshness(item.postedAt, now).state;
  if (dateState !== "WITHIN_WINDOW") return `${prefix}_POSTING_DATE_${dateState}`;
  const description = (item.description ?? "").slice(0, 1500);
  if (isObviousGeoRestriction(item.title, description)) return `${prefix}_GEO_RESTRICTION`;
  if (isObviousNonEnglishOrLocalOnly(item.title, description)) return `${prefix}_LOCAL_ONLY`;
  const gate = geoGate(item);
  return gate.phEligibility === "ineligible" || (requirePositivePh && gate.phEligibility === "unclear")
    ? `${prefix}_PH_${gate.phEligibility.toUpperCase()}` : null;
}

/** Legacy stored dates may be creation dates; recovery also needs this fetched original opening. */
export function workableCurrentOpeningHold(row: Pick<NewOpportunity, "sourceUrl" | "sourceId">, currentItems: readonly NewOpportunity[], now: string, requirePositivePh = true): string | null {
  const current = currentItems.filter(item => item.sourceUrl === row.sourceUrl);
  if (current.length !== 1) return "CURRENT_OPENING_MISSING_OR_AMBIGUOUS";
  if (current[0]!.sourceId !== row.sourceId) return "SOURCE_IDENTITY_MISMATCH";
  return workableOpeningHold(current[0]!, now, true, requirePositivePh);
}

/** Called after both dates pass freshness; never advance retained posting time. */
export function workableActivationPostedAt(row: Pick<NewOpportunity, "sourceUrl" | "sourceId" | "postedAt">, currentItems: readonly NewOpportunity[]): string {
  const current = currentItems.find(item => item.sourceUrl === row.sourceUrl && item.sourceId === row.sourceId);
  if (!row.postedAt || !current?.postedAt) throw new Error("WORKABLE_VALIDATED_POSTING_DATES_REQUIRED");
  return Date.parse(current.postedAt) < Date.parse(row.postedAt) ? current.postedAt : row.postedAt;
}

/** Every stored fact used to approve a Workable activation stays unchanged. */
export function workableOpeningWhere(row: Snapshot) {
  return sql`${opportunities.id}=${row.id} AND ${opportunities.sourceId} IS ${row.sourceId}
    AND ${opportunities.sourceUrl}=${row.sourceUrl} AND ${opportunities.title}=${row.title}
    AND ${opportunities.description} IS ${row.description}
    AND ${opportunities.company} IS ${row.company} AND ${opportunities.applicationUrl} IS ${row.applicationUrl}
    AND ${opportunities.tags} IS ${row.tags == null ? null : JSON.stringify(row.tags)}
    AND ${opportunities.locationType} IS ${row.locationType} AND ${opportunities.locationRaw} IS ${row.locationRaw}
    AND ${opportunities.postedAt} IS ${row.postedAt} AND ${opportunities.phEligibility} IS ${row.phEligibility}
    AND ${opportunities.inactiveReason} IS ${row.inactiveReason} AND ${opportunities.isActive}=0`;
}

/** Reuse the constitutional packet validator; a registry state alone is not an admission. */
export async function loadWorkableAdmission(db: AdmissionDatabase | null | undefined, sourceId: string, now: string): Promise<CurrentAdmissionEvidenceResult> {
  if (!sourceId.startsWith("workable:")) return { ok: false, reason: "Workable source identity is required" };
  if (!db) return { ok: false, reason: "current admission database is unavailable" };
  const current = await loadCurrentAdmissionEvidence(db, sourceId, now);
  if (!current.ok) return current;
  if (current.provider.providerFamily !== "workable"
    || current.source.companyToken !== sourceId.slice("workable:".length)
    || current.source.endpointUrl !== atsEndpointUrl("workable", current.source.companyToken!)
    || !["canary", "active"].includes(current.source.operationalState)
    || !current.packet.authorityActions.includes("public_minimal_metadata_canary")) {
    return { ok: false, reason: "current admission does not authorize this Workable public endpoint" };
  }
  return current;
}

/** Immutable digest was validated above; the existing view rechecks its live revisions and leases at mutation. */
export function workableAdmissionWhere(current: Current) {
  return sql`EXISTS (SELECT 1 FROM source_admission_current_evidence e JOIN source_registry s ON s.source_id=e.source_id
    WHERE e.id=${current.evidence.id} AND e.source_id=${current.source.sourceId} AND e.packet_sha256=${current.evidence.packetSha256}
      AND s.operational_state IN ('canary','active'))`;
}

/** One admitted Workable row, preserving table defaults and column encoders. No schema or authority writes. */
export async function insertAdmittedWorkableRow(db: ReturnType<typeof getDb>, row: NewOpportunity, current: Current) {
  if (row.sourceId !== current.source.sourceId) throw new Error("WORKABLE_ADMISSION_SOURCE_MISMATCH");
  const columns = getTableColumns(opportunities);
  const keys = (Object.keys(columns) as Array<keyof typeof columns>).filter(key => row[key] !== undefined);
  const names = keys.map(key => sql.identifier(columns[key].name));
  const values = keys.map(key => sql`${row[key] === null ? null : columns[key].mapToDriverValue(row[key] as never)}`);
  return db.all<{ id: number }>(sql`INSERT INTO ${opportunities} (${sql.join(names, sql`, `)})
    SELECT ${sql.join(values, sql`, `)} WHERE ${workableAdmissionWhere(current)} ON CONFLICT DO NOTHING
    RETURNING ${sql.identifier(columns.id.name)}`);
}
