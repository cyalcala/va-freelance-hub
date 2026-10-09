import { and, eq, inArray, type SQL } from "drizzle-orm";
import { opportunities } from "@va-hub/db";
import { PUBLIC_PH_ELIGIBILITIES } from "@va-hub/scraper";

/** The same public eligibility contract applies to cards, counts and details. */
export { PUBLIC_PH_ELIGIBILITIES };

export const PUBLIC_PH_ELIGIBILITY_SQL = PUBLIC_PH_ELIGIBILITIES
  .map((value) => `'${value}'`).join(", ");

export function publicOpportunityFilters(): SQL {
  return and(
    eq(opportunities.isActive, true),
    inArray(opportunities.phEligibility, [...PUBLIC_PH_ELIGIBILITIES]),
  )!;
}
