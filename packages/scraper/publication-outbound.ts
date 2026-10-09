import { sanitizeApplyUrlForSource, sanitizeSourceUrl } from "./urls";

/** Resolve the existing attributable public apply path without fetching it. */
export function resolvePublicationOutboundUrl(sourceUrl: unknown, applicationUrl: unknown): string | null {
  const source = sanitizeSourceUrl(sourceUrl);
  if (!source) return null;
  // An absent or unusable apply link retains the site's safe source fallback.
  return sanitizeApplyUrlForSource(applicationUrl, sourceUrl) ?? source;
}
