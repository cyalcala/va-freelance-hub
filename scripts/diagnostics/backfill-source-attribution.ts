#!/usr/bin/env bun
/**
 * SP-01 / APEX Queue B: Deterministic Exact Source Attribution Backfill.
 *
 * Reconciles legacy opportunities where `source_id IS NULL` to their exact,
 * deterministically proven source identity.
 *
 * Rules:
 *   - Never fabricate or guess.
 *   - Only update where both `source_platform` and `source_url` (or tags for Jobicy)
 *     unambiguously identify the exact origin.
 *   - Pure SQL generation and read-only dry-run by default.
 */

export interface AttributionRule {
  targetSourceId: string;
  sourcePlatform: string;
  urlPattern?: string;
  tagPattern?: string;
  description: string;
}

export const DETERMINISTIC_ATTRIBUTION_RULES: AttributionRule[] = [
  {
    targetSourceId: "we-work-remotely",
    sourcePlatform: "WeWorkRemotely",
    urlPattern: "https://weworkremotely.com/%",
    description: "We Work Remotely official RSS feed listings",
  },
  {
    targetSourceId: "real-work-from-anywhere",
    sourcePlatform: "RealWorkFromAnywhere",
    urlPattern: "https://www.realworkfromanywhere.com/%",
    description: "Real Work From Anywhere official RSS feed listings",
  },
  {
    targetSourceId: "remote-ok",
    sourcePlatform: "RemoteOK",
    urlPattern: "%remoteok.com/%",
    description: "Remote OK official public JSON API listings",
  },
  {
    targetSourceId: "remotive",
    sourcePlatform: "Remotive",
    urlPattern: "https://remotive.com/%",
    description: "Remotive official RSS feed listings",
  },
  {
    targetSourceId: "breezy:20four7va",
    sourcePlatform: "20Four7VA",
    urlPattern: "%20four7va.breezy.hr/%",
    description: "20Four7VA Breezy HR portal",
  },
  {
    targetSourceId: "breezy:sourcefit",
    sourcePlatform: "Sourcefit",
    urlPattern: "%sourcefit.breezy.hr/%",
    description: "Sourcefit Breezy HR portal",
  },
  {
    targetSourceId: "breezy:time-etc",
    sourcePlatform: "Time Etc",
    urlPattern: "%time-etc.breezy.hr/%",
    description: "Time Etc Breezy HR portal",
  },
  {
    targetSourceId: "ashby:supabase",
    sourcePlatform: "Supabase",
    urlPattern: "%ashbyhq.com/supabase/%",
    description: "Supabase Ashby ATS portal",
  },
  {
    targetSourceId: "ashby:amplify",
    sourcePlatform: "Amplify",
    urlPattern: "%ashbyhq.com/amplify/%",
    description: "Amplify Ashby ATS portal",
  },
  {
    targetSourceId: "ashby:camunda",
    sourcePlatform: "Camunda",
    urlPattern: "%ashbyhq.com/camunda/%",
    description: "Camunda Ashby ATS portal",
  },
  {
    targetSourceId: "ashby:ashby",
    sourcePlatform: "Ashby",
    urlPattern: "%ashbyhq.com/ashby/%",
    description: "Ashby HQ Ashby ATS portal",
  },
  {
    targetSourceId: "ashby:tremendous",
    sourcePlatform: "Tremendous",
    urlPattern: "%ashbyhq.com/tremendous/%",
    description: "Tremendous Ashby ATS portal",
  },
  {
    targetSourceId: "greenhouse:gitlab",
    sourcePlatform: "GitLab",
    urlPattern: "%greenhouse.io/gitlab/%",
    description: "GitLab Greenhouse Job Board",
  },
  {
    targetSourceId: "greenhouse:grafanalabs",
    sourcePlatform: "Grafana Labs",
    urlPattern: "%greenhouse.io/grafanalabs/%",
    description: "Grafana Labs Greenhouse Job Board",
  },
  {
    targetSourceId: "greenhouse:remotecom",
    sourcePlatform: "Remote.com",
    urlPattern: "%greenhouse.io/remotecom/%",
    description: "Remote.com Greenhouse Job Board",
  },
  {
    targetSourceId: "greenhouse:nearform",
    sourcePlatform: "Nearform",
    urlPattern: "%greenhouse.io/nearform/%",
    description: "Nearform Greenhouse Job Board",
  },
  {
    targetSourceId: "greenhouse:ghost",
    sourcePlatform: "Ghost",
    urlPattern: "%ghst.io/%",
    description: "Ghost Foundation Greenhouse board via custom domain",
  },
  {
    targetSourceId: "workable:pearltalent",
    sourcePlatform: "Pearl Talent",
    urlPattern: "%workable.com/pearltalent/%",
    description: "Pearl Talent Workable portal",
  },
  {
    targetSourceId: "workable:coconutva",
    sourcePlatform: "Coconut VA",
    urlPattern: "%workable.com/coconutva/%",
    description: "Coconut VA Workable portal",
  },
  {
    targetSourceId: "workable:crewbloom",
    sourcePlatform: "CrewBloom",
    urlPattern: "%workable.com/crewbloom/%",
    description: "CrewBloom Workable portal",
  },
  {
    targetSourceId: "workable:pineapple-staffing",
    sourcePlatform: "Pineapple Staffing",
    urlPattern: "%workable.com/pineapple-staffing/%",
    description: "Pineapple Staffing Workable portal",
  },
  {
    targetSourceId: "workable:hello-rache",
    sourcePlatform: "Hello Rache",
    urlPattern: "%workable.com/hello-rache/%",
    description: "Hello Rache Workable portal",
  },
  {
    targetSourceId: "dribbble",
    sourcePlatform: "Dribbble",
    urlPattern: "https://dribbble.com/%",
    description: "Dribbble public RSS feed",
  },
  {
    targetSourceId: "authentic-jobs",
    sourcePlatform: "AuthenticJobs",
    urlPattern: "%authenticjobs.com/%",
    description: "Authentic Jobs RSS feed",
  },
  {
    targetSourceId: "jobicy-admin-support-apac",
    sourcePlatform: "Jobicy",
    tagPattern: '%"admin"%',
    description: "Jobicy Admin Support APAC feed",
  },
  {
    targetSourceId: "jobicy-supporting-apac",
    sourcePlatform: "Jobicy",
    tagPattern: '%"customer-support"%',
    description: "Jobicy Customer Support APAC feed",
  },
];

export function generateAttributionCountSql(rule: AttributionRule): string {
  const conditions = [
    "source_id IS NULL",
    `source_platform = '${rule.sourcePlatform.replace(/'/g, "''")}'`,
  ];
  if (rule.urlPattern) {
    conditions.push(`source_url LIKE '${rule.urlPattern.replace(/'/g, "''")}'`);
  }
  if (rule.tagPattern) {
    conditions.push(`tags LIKE '${rule.tagPattern.replace(/'/g, "''")}'`);
  }
  return `SELECT '${rule.targetSourceId}' AS target_source_id, COUNT(*) AS match_count FROM opportunities WHERE ${conditions.join(" AND ")};`;
}

export function generateAttributionUpdateSql(rule: AttributionRule): string {
  const conditions = [
    "source_id IS NULL",
    `source_platform = '${rule.sourcePlatform.replace(/'/g, "''")}'`,
  ];
  if (rule.urlPattern) {
    conditions.push(`source_url LIKE '${rule.urlPattern.replace(/'/g, "''")}'`);
  }
  if (rule.tagPattern) {
    conditions.push(`tags LIKE '${rule.tagPattern.replace(/'/g, "''")}'`);
  }
  return `UPDATE opportunities SET source_id = '${rule.targetSourceId}' WHERE ${conditions.join(" AND ")};`;
}

if (import.meta.main) {
  const mode = process.argv[2] ?? "count";
  if (mode === "count") {
    console.log("-- SQL to measure deterministic attribution matches:");
    for (const rule of DETERMINISTIC_ATTRIBUTION_RULES) {
      console.log(generateAttributionCountSql(rule));
    }
  } else if (mode === "update") {
    console.log("-- SQL to apply deterministic attribution backfill:");
    for (const rule of DETERMINISTIC_ATTRIBUTION_RULES) {
      console.log(generateAttributionUpdateSql(rule));
    }
  } else {
    console.error(`Unknown mode: ${mode}. Use 'count' or 'update'.`);
    process.exit(1);
  }
}
