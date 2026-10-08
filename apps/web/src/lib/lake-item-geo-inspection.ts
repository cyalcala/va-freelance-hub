import { geoGate, type GeoScope, type PhEligibility } from "../../../../packages/scraper/geoGate";
import type { GreenhouseNativeFacts, NativeFact } from "../../../../packages/scraper/greenhouse-item-evidence";

export type LakeItemGeoState = "HELD" | "REJECTED" | "UNKNOWN";
export type LakeItemGeoReason = "NATIVE_GEO_INELIGIBLE" | "NATIVE_GEO_PARTIAL_COVERAGE" | "NATIVE_GEO_INPUT_INVALID";
export type NativeGeoFactCoverage = NativeFact<string>["state"] | "MALFORMED";
export interface LakeItemGeoInspection {
  version: "lake-item-geo-inspection-v1";
  state: LakeItemGeoState;
  geoScope: GeoScope;
  phEligibility: PhEligibility;
  reasons: [LakeItemGeoReason];
  coverage: { title: NativeGeoFactCoverage; locationName: NativeGeoFactCoverage; description: "NOT_RETAINED"; tags: "NOT_RETAINED" };
  fullRemote: "UNKNOWN";
  phExclusions: "UNKNOWN";
  qualificationAuthorized: false;
  publicationAuthorized: false;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function nativeTextFact(value: unknown, max: number): NativeFact<string> | null {
  if (!record(value)) return null;
  if ((value.state === "missing" || value.state === "null") && exactKeys(value, ["state"])) return { state: value.state };
  if (value.state === "invalid" && exactKeys(value, ["state", "valueType"])) {
    const type = value.valueType;
    if (type === "string" || type === "number" || type === "boolean" || type === "array" || type === "object") {
      return { state: "invalid", valueType: type };
    }
  }
  if (value.state === "value" && exactKeys(value, ["state", "value"]) && typeof value.value === "string"
    && value.value.length <= max && !value.value.includes("\0")) return { state: "value", value: value.value };
  return null;
}

/** Native title/location hints only. This cannot clear full geography, remote or publication gates. */
export function inspectLakeItemGeo(input: Pick<GreenhouseNativeFacts, "title" | "locationName">): LakeItemGeoInspection {
  const facts = record(input) ? input : null;
  const title = nativeTextFact(facts?.title, 300);
  const locationName = nativeTextFact(facts?.locationName, 500);
  const result: LakeItemGeoInspection = {
    version: "lake-item-geo-inspection-v1", state: "UNKNOWN", geoScope: "unknown", phEligibility: "unclear",
    reasons: ["NATIVE_GEO_INPUT_INVALID"], coverage: { title: title?.state ?? "MALFORMED", locationName: locationName?.state ?? "MALFORMED",
      description: "NOT_RETAINED", tags: "NOT_RETAINED" }, fullRemote: "UNKNOWN", phExclusions: "UNKNOWN",
    qualificationAuthorized: false, publicationAuthorized: false,
  };
  if (!title || !locationName || title.state !== "value" || !title.value.trim()) return result;
  const verdict = geoGate({ title: title.value, locationRaw: locationName.state === "value" ? locationName.value : null,
    description: null, tags: [] });
  const ineligible = verdict.phEligibility === "ineligible";
  return { ...result, state: ineligible ? "REJECTED" : "HELD", geoScope: verdict.geoScope, phEligibility: verdict.phEligibility,
    reasons: [ineligible ? "NATIVE_GEO_INELIGIBLE" : "NATIVE_GEO_PARTIAL_COVERAGE"] };
}
