import { sanitizeApplyUrl, sanitizeSourceUrl } from "@va-hub/scraper";

type OutboundJob = {
  sourceUrl: unknown;
  applicationUrl: unknown;
};

/**
 * A redirect target must both belong to the stored job and be safe for a
 * browser navigation. Equality alone prevents open redirects, but it does not
 * make legacy or untrusted stored values safe.
 */
export function resolveOutboundUrl(job: OutboundJob, requestedUrl: string | null): string | null {
  if (!requestedUrl) return null;
  if (requestedUrl === job.sourceUrl) return sanitizeSourceUrl(requestedUrl);
  if (requestedUrl === job.applicationUrl) return sanitizeApplyUrl(requestedUrl);
  return null;
}
