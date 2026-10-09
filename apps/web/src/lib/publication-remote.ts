import { opportunities } from "@va-hub/db";
import { sql, type SQL } from "drizzle-orm";

/** Exclude exact existing nonremote enums at the write, including selection drift.
 * NULL/unsupported metadata remains opaque; this is not independent remote proof. */
export function noExplicitNonRemoteWorkplace(): SQL {
  return sql`(${opportunities.locationType} IS NULL OR ${opportunities.locationType} NOT IN (${"onsite"}, ${"hybrid"}))`;
}
