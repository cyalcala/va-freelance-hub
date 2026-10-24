import { isObviousGeoRestriction, isObviousNonEnglishOrLocalOnly } from "./geoGate";

/**
 * An updated source title replaces the stored title for an active listing.
 * The new title must be a non-empty string, distinct from the stored title,
 * and free of obvious hard geographic restrictions or non-English markers.
 * Ambiguous, missing, identical, or invalid source titles return null.
 * This does not change activity, inactive_reason, or policy state.
 */
export function updatedAdmissionTitle(storedTitle: unknown, sourceTitle: unknown): string | null {
  if (typeof storedTitle !== "string" || typeof sourceTitle !== "string") return null;
  const stored = storedTitle.trim();
  const source = sourceTitle.trim();
  if (!stored || !source || stored === source) return null;
  if (isObviousGeoRestriction(source) || isObviousNonEnglishOrLocalOnly(source)) return null;
  return source;
}
