export type SourceType = "rss" | "html";

export interface Source {
  id: string;
  name: string;
  url: string;
  type: SourceType;
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
    platform: "WeWorkRemotely",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "design", "marketing"],
  },
  {
    id: "remotive",
    name: "Remotive",
    url: "https://remotive.com/remote-jobs/feed",
    type: "rss",
    platform: "Remotive",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "sales", "marketing"],
  },
  {
    id: "problogger",
    name: "ProBlogger",
    url: "https://problogger.com/jobs/feed/",
    type: "rss",
    platform: "ProBlogger",
    defaultJobType: "freelance",
    tags: ["writing", "content", "blogging", "creative"],
  },
  {
    id: "remote-co",
    name: "Remote.co",
    url: "https://remote.co/remote-jobs/feed/",
    type: "rss",
    platform: "RemoteCo",
    defaultJobType: "full-time",
    tags: ["remote", "customer-support", "admin", "VA"],
  },
  {
    id: "authentic-jobs",
    name: "Authentic Jobs",
    url: "https://authenticjobs.com/feed/",
    type: "rss",
    platform: "AuthenticJobs",
    defaultJobType: "freelance",
    tags: ["design", "creative", "web", "freelance"],
  },
  {
    id: "dribbble",
    name: "Dribbble Jobs",
    url: "https://dribbble.com/jobs.rss",
    type: "rss",
    platform: "Dribbble",
    defaultJobType: "freelance",
    tags: ["design", "creative", "UI", "UX"],
  },
  {
    id: "onlinejobs-ph",
    name: "OnlineJobs.ph",
    url: "https://www.onlinejobs.ph/jobseekers/joblist",
    type: "html",
    platform: "OnlineJobsPH",
    defaultJobType: "VA",
    tags: ["VA", "filipino", "remote", "admin"],
  },
  {
    id: "working-nomads",
    name: "Working Nomads",
    url: "https://www.workingnomads.com/jobsfeed",
    type: "rss",
    platform: "WorkingNomads",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "design", "marketing"],
  },
  {
    id: "jobspresso",
    name: "Jobspresso",
    url: "https://jobspresso.co/feed/",
    type: "rss",
    platform: "Jobspresso",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "sales", "marketing"],
  },
];

export const rssSources = sources.filter((s) => s.type === "rss");
export const htmlSources = sources.filter((s) => s.type === "html");