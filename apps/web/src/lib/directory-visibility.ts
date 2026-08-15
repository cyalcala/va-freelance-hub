import { and, eq, lt, type SQL } from "drizzle-orm";
import { vaDirectory } from "@va-hub/db";

/**
 * Shared visibility predicate for the VA directory.
 *
 * Both the homepage "Vetted companies" count and the directory page use this
 * predicate so they cannot drift apart. A company is publicly visible when:
 *
 * 1. `hires_filipinos = 1` — positively identified as Filipino-friendly
 *    (soft-hides defunct, duplicates, non-PH entries; see migration 0024).
 * 2. `link_fail_count < 3` — fewer than three hard-dead-link strikes
 *    (migration 0022+0024 semantics; three strikes = de-verified, not hidden).
 *
 * The `is_verified` flag is intentionally not part of this predicate. The
 * "Vetted" label on the homepage is a product decision that may later require
 * `is_verified = 1`; that change must be a separate explicit decision, not
 * silently bundled into the count predicate.
 *
 * @returns A drizzle SQL expression for use in `.where()`.
 */
export function directoryVisibilityFilters(): SQL {
  return and(eq(vaDirectory.hiresFilipinos, true), lt(vaDirectory.linkFailCount, 3))!;
}