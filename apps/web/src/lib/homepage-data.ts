import { getDb, opportunities, vaDirectory, type Opportunity } from "@va-hub/db";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { JOB_CATEGORY_MAP } from "./categories";
import { directoryVisibilityFilters } from "./directory-visibility";
import { publicOpportunityFilters } from "./public-opportunities";
import { createTimedDataCache } from "./timed-data-cache";

type CardData = Pick<Opportunity,
  "id" | "title" | "company" | "type" | "sourceUrl" | "sourcePlatform" |
  "tags" | "category" | "experienceLevel" | "postedAt" | "scrapedAt" |
  "geoScope" | "phEligibility" | "geoEvidence"
>;

export type HomepageData = {
  stats: { opportunities: number; companies: number };
  latestOpportunities: CardData[];
  featuredAgencyOpportunities: CardData[];
  categoryTotals: Record<string, number>;
};

const cardProjection = {
  id: opportunities.id,
  title: opportunities.title,
  company: opportunities.company,
  type: opportunities.type,
  sourceUrl: opportunities.sourceUrl,
  sourcePlatform: opportunities.sourcePlatform,
  tags: opportunities.tags,
  category: opportunities.category,
  experienceLevel: opportunities.experienceLevel,
  postedAt: opportunities.postedAt,
  scrapedAt: opportunities.scrapedAt,
  geoScope: opportunities.geoScope,
  phEligibility: opportunities.phEligibility,
  geoEvidence: opportunities.geoEvidence,
};

/** Partitions by category and stops at six; restricted to the 9 UI categories to avoid compound SELECT limits and stay under 100 binds. */
export function homepagePreviewQuery() {
  const allowedCategories = Object.keys(JOB_CATEGORY_MAP);
  return sql`
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY category ORDER BY coalesce(posted_at, scraped_at) DESC
      ) AS rn
      FROM opportunities
      WHERE ${and(inArray(opportunities.category, allowedCategories), publicOpportunityFilters())}
    ) WHERE rn <= 6
  `;
}

// Five minutes matches the public HTML cache; never return stale data on error.
// A deployment has one configured DB. The module resets on deployment/cold start.
const cachedHomepage = createTimedDataCache<HomepageData>(5 * 60 * 1000);

export function loadHomepageData(env: Parameters<typeof getDb>[0]): Promise<HomepageData> {
  return cachedHomepage(async () => {
    const db = getDb(env);
    const totalRows = await db.select({ category: opportunities.category, n: count() })
      .from(opportunities).where(publicOpportunityFilters()).groupBy(opportunities.category);
    const categoryTotals = Object.fromEntries(totalRows.map((row) => [row.category, row.n]));
    // Derive the global total from the same category scan instead of counting twice.
    const opportunityCount = totalRows.reduce((sum, row) => sum + row.n, 0);
    const [directoryCount] = await db.select({ count: count() }).from(vaDirectory)
      .where(directoryVisibilityFilters());

    const featuredAgencyOpportunities = await db.select(cardProjection).from(opportunities)
      .where(and(publicOpportunityFilters(), sql`(
        ${opportunities.sourceId} LIKE 'breezy:%' OR
        ${opportunities.sourcePlatform} IN ('20Four7VA', 'Sourcefit', 'Yokly', 'VALUE Virtual Assistants', 'Remote Craft')
      )`))
      .orderBy(desc(sql`coalesce(${opportunities.postedAt}, ${opportunities.scrapedAt})`)).limit(6);

    const idRows = await db.all<{ id: number }>(homepagePreviewQuery());
    const ids = idRows.map((row) => Number(row.id)).filter(Number.isFinite);
    const latestOpportunities = ids.length
      ? await db.select(cardProjection).from(opportunities)
        .where(and(publicOpportunityFilters(), inArray(opportunities.id, ids)))
        .orderBy(desc(sql`coalesce(${opportunities.postedAt}, ${opportunities.scrapedAt})`))
      : [];

    return {
      stats: { opportunities: opportunityCount, companies: directoryCount?.count ?? 0 },
      categoryTotals,
      latestOpportunities,
      featuredAgencyOpportunities,
    };
  });
}
