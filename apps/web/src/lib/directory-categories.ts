export const DIRECTORY_NICHES = [
  "australian-dayshift",
  "global-va",
  "bpo",
  "job-boards",
  "ecommerce",
  "tech",
] as const;

export const DIRECTORY_SPECIAL_FILTERS = ["dayshift", "marketplaces"] as const;

export type DirectoryNiche = (typeof DIRECTORY_NICHES)[number];
export type DirectoryCategory =
  | DirectoryNiche
  | (typeof DIRECTORY_SPECIAL_FILTERS)[number];

export type DirectoryCategoryInfo = {
  title: string;
  shortTitle: string;
  description: string;
  dot: string;
};

export const DIRECTORY_CATEGORY_INFO: Record<DirectoryCategory, DirectoryCategoryInfo> = {
  "australian-dayshift": {
    title: "Australian & dayshift VA",
    shortTitle: "Australian & dayshift",
    description: "VA employers with Australian clients or schedules that align better with Philippine daytime hours.",
    dot: "bg-accent",
  },
  "global-va": {
    title: "Global VA & outsourcing",
    shortTitle: "Global VA agencies",
    description: "Agencies and outsourcing firms that place Filipino professionals with clients around the world.",
    dot: "bg-emerald-500",
  },
  bpo: {
    title: "BPO & professional services",
    shortTitle: "BPO & professional",
    description: "Structured employers hiring for customer support, operations, finance, and professional services.",
    dot: "bg-blue-500",
  },
  "job-boards": {
    title: "Job boards & resources",
    shortTitle: "Job boards & resources",
    description: "Platforms where you can browse roles from multiple employers instead of applying to one agency.",
    dot: "bg-violet-500",
  },
  ecommerce: {
    title: "E-commerce & marketing",
    shortTitle: "E-commerce & marketing",
    description: "Companies hiring for stores, content, design, sales, social media, and digital marketing work.",
    dot: "bg-orange-500",
  },
  tech: {
    title: "Technology & specialized",
    shortTitle: "Tech & specialized",
    description: "Remote-first teams hiring for engineering, product, technical, and other specialist roles.",
    dot: "bg-cyan-500",
  },
  dayshift: {
    title: "Dayshift-friendly employers",
    shortTitle: "Dayshift only",
    description: "A focused view of companies marked for Philippine-friendly daytime schedules.",
    dot: "bg-accent",
  },
  marketplaces: {
    title: "Marketplaces & job platforms",
    shortTitle: "Marketplaces",
    description: "Places to build a profile or browse many clients and employers. These are platforms, not direct employers.",
    dot: "bg-violet-500",
  },
};

export function parseDirectoryCategory(value: string | null): DirectoryCategory | null {
  if (!value) return null;
  return value in DIRECTORY_CATEGORY_INFO ? value as DirectoryCategory : null;
}

export function isDirectoryNiche(value: DirectoryCategory): value is DirectoryNiche {
  return (DIRECTORY_NICHES as readonly string[]).includes(value);
}
