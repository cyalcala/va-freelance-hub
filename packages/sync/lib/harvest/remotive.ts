import { HarvestProvider, RawAgency } from './types';

export class RemotiveProvider implements HarvestProvider {
  name = 'remotive';

  async fetch(): Promise<RawAgency[]> {
    const results: RawAgency[] = [];

    try {
      const response = await fetch('https://remotive.io/api/remote-jobs?category=customer-support&limit=100');
      if (!response.ok) return [];

      const data = await response.json();
      const jobs = data.jobs;

      for (const job of jobs) {
        // Filter for Philippines-related or Geo-agnostic
        if (
          job.title.toLowerCase().includes('philippines') || 
          job.candidate_required_location.toLowerCase() === 'worldwide'
        ) {
          results.push({
            name: job.company_name,
            hiringUrl: job.url,
            logoUrl: job.company_logo_url,
            description: job.title,
            source: 'remotive',
            rawMetadata: job,
          });
        }
      }
    } catch (e) {
      console.error('Remotive fetch failed:', e);
    }

    return results;
  }
}
