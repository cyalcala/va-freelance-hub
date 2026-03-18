export interface RawAgency {
  name: string;
  websiteUrl?: string;
  hiringUrl: string;
  logoUrl?: string;
  description?: string;
  source: string; // e.g., 'reddit', 'brave', 'remotive'
  rawMetadata?: any;
}

export interface HarvestProvider {
  name: string;
  fetch: () => Promise<RawAgency[]>;
}
