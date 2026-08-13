export interface OpportunityFtsQueryOptions {
  ftsMatch: string;
  category?: string;
  type?: string;
  platform?: string;
  limit: number;
  offset: number;
}

export interface OpportunityFtsQueries {
  countSql: string;
  pageSql: string;
  filterParams: string[];
  pageParams: Array<string | number>;
}

const CARD_PROJECTION = `
  o.id AS "id",
  o.title AS "title",
  o.company AS "company",
  o.type AS "type",
  o.source_url AS "sourceUrl",
  o.source_platform AS "sourcePlatform",
  o.posted_at AS "postedAt",
  o.experience_level AS "experienceLevel",
  o.geo_scope AS "geoScope",
  o.ph_eligibility AS "phEligibility",
  o.geo_evidence AS "geoEvidence"`;

/**
 * Builds the D1 FTS statements used by the public opportunities route.
 * Only fixed column predicates are composed; every request value stays bound.
 */
export function buildOpportunityFtsQueries(
  options: OpportunityFtsQueryOptions,
): OpportunityFtsQueries {
  const conditions = ["opportunities_fts MATCH ?", "o.is_active = 1"];
  const filterParams = [options.ftsMatch];

  if (options.category) {
    conditions.push("o.category = ?");
    filterParams.push(options.category);
  }
  if (options.type) {
    conditions.push("o.type = ?");
    filterParams.push(options.type);
  }
  if (options.platform) {
    conditions.push("o.source_platform = ?");
    filterParams.push(options.platform);
  }

  const fromAndWhere = `FROM opportunities o
    INNER JOIN opportunities_fts fts ON o.id = fts.rowid
    WHERE ${conditions.join(" AND ")}`;

  return {
    countSql: `SELECT count(*) AS total ${fromAndWhere}`,
    pageSql: `SELECT ${CARD_PROJECTION}
      ${fromAndWhere}
      ORDER BY fts.rank
      LIMIT ? OFFSET ?`,
    filterParams,
    pageParams: [...filterParams, options.limit, options.offset],
  };
}
