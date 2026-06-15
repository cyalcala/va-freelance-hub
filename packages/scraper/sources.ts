export type SourceType = "rss" | "html" | "json";
export type CollectionMethod = "rss_feed" | "public_html" | "public_json_api";
export type ComplianceStatus = "allowed" | "needs_review" | "paused" | "deprecated";

export interface Source {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  collectionMethod: CollectionMethod;
  complianceStatus: ComplianceStatus;
  complianceNotes: string;
  platform: string;
  defaultJobType: "VA" | "freelance" | "project" | "full-time" | "part-time";
  tags: string[];
  maxItems?: number;
  minFetchIntervalMinutes?: number;
}

export const sources: Source[] = [
  {
    id: "we-work-remotely",
    name: "We Work Remotely",
    url: "https://weworkremotely.com/remote-jobs.rss",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "allowed",
    complianceNotes: "Current review 2026-06-09: public RSS page says anyone can use the feed with attribution and links back to WWR; robots allows the feed path.",
    platform: "WeWorkRemotely",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "design", "marketing"],
    maxItems: 100,
  },
  {
    id: "remotive",
    name: "Remotive",
    url: "https://remotive.com/remote-jobs/feed",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "allowed",
    complianceNotes: "Current review 2026-06-09: Remotive documents public API/RSS use with source mention and linkback; keep jobs ungated and route users to Remotive URLs.",
    platform: "Remotive",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "sales", "marketing"],
    maxItems: 100,
  },
  {
    id: "real-work-from-anywhere",
    name: "Real Work From Anywhere",
    url: "https://www.realworkfromanywhere.com/rss.xml",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "allowed",
    complianceNotes: "Current review 2026-06-12: official public RSS endpoint is reachable, robots allows all, and feed metadata uses hourly TTL; collect minimal metadata and link back to original postings.",
    platform: "RealWorkFromAnywhere",
    defaultJobType: "full-time",
    tags: ["remote", "work-from-anywhere", "global"],
    maxItems: 50,
    minFetchIntervalMinutes: 60,
  },
  {
    id: "jobicy-admin-support-apac",
    name: "Jobicy Admin Support APAC",
    url: "https://jobicy.com/feed/job_feed?job_categories=admin-support&job_types=full-time&search_region=apac",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "allowed",
    complianceNotes: "Current review 2026-06-12: documented RSS feed is intended for wider job distribution with source credit and linkback; robots allows /feed/job_feed and feed legal notice recommends only a few checks daily/hourly.",
    platform: "Jobicy",
    defaultJobType: "full-time",
    tags: ["remote", "admin", "VA", "apac"],
    maxItems: 40,
    minFetchIntervalMinutes: 60,
  },
  {
    id: "jobicy-supporting-apac",
    name: "Jobicy Customer Support APAC",
    url: "https://jobicy.com/feed/job_feed?job_categories=supporting&job_types=full-time&search_region=apac",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "allowed",
    complianceNotes: "Goldilocks review 2026-06-13: documented RSS feed is intended for wider job distribution with source credit and linkback; robots allows /feed/job_feed and feed legal notice recommends only a few checks daily/hourly.",
    platform: "Jobicy",
    defaultJobType: "full-time",
    tags: ["remote", "customer-support", "customer-service", "apac"],
    maxItems: 40,
    minFetchIntervalMinutes: 60,
  },
  {
    id: "remote-ok",
    name: "Remote OK",
    url: "https://remoteok.com/api",
    type: "json",
    collectionMethod: "public_json_api",
    complianceStatus: "allowed",
    complianceNotes: "Current review 2026-06-13: official public JSON API is reachable, robots allows /api, and the API legal header requires follow links back to Remote OK job URLs plus source mention. Do not use the Remote OK logo without permission.",
    platform: "RemoteOK",
    defaultJobType: "full-time",
    tags: ["remote", "global", "digital-nomad"],
    maxItems: 50,
    minFetchIntervalMinutes: 60,
  },
  {
    id: "problogger",
    name: "ProBlogger",
    url: "https://problogger.com/jobs/feed/",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "paused",
    complianceNotes: "Paused 2026-06-09: current feed returns only a moved/deleting notice and produces zero useful jobs; confirm a supported current feed before re-enabling.",
    platform: "ProBlogger",
    defaultJobType: "freelance",
    tags: ["writing", "content", "blogging", "creative"],
  },
  {
    id: "remote-co",
    name: "Remote.co",
    url: "https://remote.co/remote-jobs/feed/",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "paused",
    complianceNotes: "Paused 2026-06-09: repeated Hunter failures and live audit timeout/HTTP 520 behavior make this a noisy, unreliable source until reviewed.",
    platform: "RemoteCo",
    defaultJobType: "full-time",
    tags: ["remote", "customer-support", "admin", "VA"],
  },
  {
    id: "authentic-jobs",
    name: "Authentic Jobs",
    url: "https://authenticjobs.com/feed/",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "paused",
    complianceNotes: "Paused 2026-06-09: robots.txt disallows /feed/; do not fetch until source permission or an allowed feed path is confirmed.",
    platform: "AuthenticJobs",
    defaultJobType: "freelance",
    tags: ["design", "creative", "web", "freelance"],
  },
  {
    id: "dribbble",
    name: "Dribbble Jobs",
    url: "https://dribbble.com/jobs.rss",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "paused",
    complianceNotes: "Paused 2026-06-09: Dribbble terms prohibit scraping and automated access beyond narrow search-engine indexing permission.",
    platform: "Dribbble",
    defaultJobType: "freelance",
    tags: ["design", "creative", "UI", "UX"],
  },
  {
    id: "onlinejobs-ph",
    name: "OnlineJobs.ph",
    url: "https://www.onlinejobs.ph/jobseekers/jobsearch",
    type: "html",
    collectionMethod: "public_html",
    complianceStatus: "paused",
    complianceNotes: "Paused 2026-06-09: terms permit personal use without automated means unless expressly granted; public HTML jobsearch is not a supported feed/API.",
    platform: "OnlineJobsPH",
    defaultJobType: "VA",
    tags: ["VA", "filipino", "remote", "admin"],
  },
  {
    id: "jobspresso",
    name: "Jobspresso",
    url: "https://jobspresso.co/feed/",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "paused",
    complianceNotes: "Paused 2026-06-09: current feed returns only a small placeholder/zero-job response, and site terms limit material use to personal transitory viewing.",
    platform: "Jobspresso",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "sales", "marketing"],
  },
];

export function isEnabledSource(source: Source): boolean {
  return source.complianceStatus !== "paused" && source.complianceStatus !== "deprecated";
}

export const enabledSources = sources.filter(isEnabledSource);
export const disabledSources = sources.filter((s) => !isEnabledSource(s));
export const rssSources = enabledSources.filter((s) => s.type === "rss");
export const htmlSources = enabledSources.filter((s) => s.type === "html");
export const jsonSources = enabledSources.filter((s) => s.type === "json");
