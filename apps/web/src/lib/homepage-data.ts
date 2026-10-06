import { opportunities, type Opportunity } from "@va-hub/db";
import { and, inArray, sql } from "drizzle-orm";
import { JOB_CATEGORY_MAP } from "./categories";
import { effectivePostedMs, isFeaturedAgencyJob, type PublicBoard, type PublicJob } from "./public-board";
import { publicOpportunityFilters } from "./public-opportunities";
import { loadPublicBoard } from "./public-serving-snapshot";

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

/**
 * Bind-ceiling lock for the old per-request preview. The live homepage uses
 * homepagePreviewJobs on the shared snapshot and does not run this query.
 */
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

function byNewest(a: PublicJob, b: PublicJob): number {
  return effectivePostedMs(b) - effectivePostedMs(a) || b.id - a.id;
}

/** Top six public jobs in each homepage category, then newest across that set. */
export function homepagePreviewJobs(jobs: readonly PublicJob[]): PublicJob[] {
  const grouped = new Map<string, PublicJob[]>();
  for (const job of jobs) {
    if (!JOB_CATEGORY_MAP[job.category]) continue;
    const list = grouped.get(job.category) ?? [];
    list.push(job);
    grouped.set(job.category, list);
  }
  const picked: PublicJob[] = [];
  for (const list of grouped.values()) picked.push(...[...list].sort(byNewest).slice(0, 6));
  return picked.sort(byNewest);
}

function asCard(job: PublicJob): CardData {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    type: job.type,
    sourceUrl: job.sourceUrl,
    sourcePlatform: job.sourcePlatform,
    tags: job.tags,
    category: job.category,
    experienceLevel: job.experienceLevel,
    postedAt: job.postedAt,
    scrapedAt: job.scrapedAt ?? job.postedAt ?? "",
    geoScope: job.geoScope,
    phEligibility: job.phEligibility,
    geoEvidence: job.geoEvidence,
  };
}

export function homepageFromSnapshot(board: PublicBoard): HomepageData {
  const categoryTotals: Record<string, number> = {};
  for (const job of board.jobs) {
    categoryTotals[job.category] = (categoryTotals[job.category] ?? 0) + 1;
  }
  return {
    stats: { opportunities: board.jobs.length, companies: board.directory.length },
    categoryTotals,
    latestOpportunities: homepagePreviewJobs(board.jobs).map(asCard),
    featuredAgencyOpportunities: board.jobs.filter(isFeaturedAgencyJob).sort(byNewest).slice(0, 6).map(asCard),
  };
}

export function loadHomepageData(
  env: Parameters<typeof loadPublicBoard>[0],
  ctx?: Parameters<typeof loadPublicBoard>[1],
): Promise<HomepageData> {
  return loadPublicBoard(env, ctx).then(homepageFromSnapshot);
}
