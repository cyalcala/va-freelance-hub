import { HarvestProvider, RawAgency } from './types';

export class JobicyProvider implements HarvestProvider {
  name = 'jobicy';

  async fetch(): Promise<RawAgency[]> {
    const results: RawAgency[] = [];

    try {
      const response = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50&geo=philippines');
      if (!response.ok) return [];

      const data = await response.json();
      const jobs = data.jobs;

      for (const job of jobs) {
        results.push({
          name: job.companyName,
          hiringUrl: job.url,
          logoUrl: job.companyLogo,
          description: job.jobTitle,
          source: 'jobicy',
          rawMetadata: job,
        });
      }
    } catch (e) {
      console.error('Jobicy fetch failed:', e);
    }

    return results;
  }
}
