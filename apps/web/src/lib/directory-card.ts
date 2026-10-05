import { sanitizeSourceUrl } from "@va-hub/scraper";
import type { DirectoryAgency } from "./directory-page";

export type DirectoryCard = DirectoryAgency & {
  href: string | null;
  logoDomain: string | null;
};

/**
 * A directory website is operator-curated, but it is still third-party data, so
 * it goes through the same sanitizer the apply/source paths use. The second
 * attempt covers a bare or protocol-relative hostname that the source sanitizer
 * rejects for having no scheme; because it re-sanitizes after prefixing, a local
 * host, IP literal or embedded credential still returns null.
 */
export function normalizeDirectoryUrl(raw: string | null): string | null {
  if (!raw) return null;
  return sanitizeSourceUrl(raw) ?? sanitizeSourceUrl(`https://${raw.trim().replace(/^\/\//, "")}`);
}

/**
 * The hostname a card renders its logo against, or null when none can be derived.
 * Fails closed: a card without a logo host still renders its name and link, so a
 * malformed href must not take the public page down with it.
 */
export function directoryLogoDomain(href: string | null): string | null {
  if (!href) return null;
  try {
    return new URL(href).hostname;
  } catch {
    return null;
  }
}

/**
 * Build one public directory card.
 *
 * Losing the logo host is a degradation a visitor sees and an operator must be
 * able to find, so it is reported instead of swallowed by an empty catch. Only
 * the curated directory id and company name are logged; the website value stays
 * out of the log because it is third-party input (CONSTITUTION §1.3 #5, and the
 * redaction convention already used by `lib/public-route-load.ts`).
 */
export function toDirectoryCard(agency: DirectoryAgency, href: string | null): DirectoryCard {
  const logoDomain = directoryLogoDomain(href);
  if (href !== null && logoDomain === null) {
    console.warn(`[directory-card] logo host unresolved for "${agency.companyName}" (id ${agency.id})`);
  }
  return { ...agency, href, logoDomain };
}