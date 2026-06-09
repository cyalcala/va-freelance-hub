export type SourceType = "rss" | "html";
export type CollectionMethod = "rss_feed" | "public_html";
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
}

export const sources: Source[] = [
  {
    id: "we-work-remotely",
    name: "We Work Remotely",
    url: "https://weworkremotely.com/remote-jobs.rss",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "needs_review",
    complianceNotes: "Public RSS feed. Terms/robots review still required before marking allowed.",
    platform: "WeWorkRemotely",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "design", "marketing"],
  },
  {
    id: "remotive",
    name: "Remotive",
    url: "https://remotive.com/remote-jobs/feed",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "needs_review",
    complianceNotes: "Public RSS feed. Terms/robots review still required before marking allowed.",
    platform: "Remotive",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "sales", "marketing"],
  },
  {
    id: "problogger",
    name: "ProBlogger",
    url: "https://problogger.com/jobs/feed/",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "needs_review",
    complianceNotes: "Public RSS feed currently returns zero items; review terms and usefulness before relying on it.",
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
    complianceStatus: "needs_review",
    complianceNotes: "Public RSS feed, but repeated HTTP 520 failures make it a pause candidate pending review.",
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
    complianceStatus: "needs_review",
    complianceNotes: "Public RSS feed. Terms/robots review still required before marking allowed.",
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
    complianceStatus: "needs_review",
    complianceNotes: "Public RSS feed. Terms/robots review still required before marking allowed.",
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
    complianceStatus: "needs_review",
    complianceNotes: "Public HTML listing page, not a source-supported feed. Keep conservative and pause if terms/robots disallow automation.",
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
    complianceStatus: "needs_review",
    complianceNotes: "Public RSS feed currently returns zero items; review terms and usefulness before relying on it.",
    platform: "Jobspresso",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "sales", "marketing"],
  },
];

export const rssSources = sources.filter((s) => s.type === "rss");
export const htmlSources = sources.filter((s) => s.type === "html");
