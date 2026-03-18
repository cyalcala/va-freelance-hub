import { HarvestProvider, RawAgency } from './types';

export class BraveProvider implements HarvestProvider {
  name = 'brave';

  async fetch(): Promise<RawAgency[]> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      console.warn('BRAVE_SEARCH_API_KEY is not set. Skipping Brave fetch.');
      return [];
    }

    const query = 'VA agencies hiring in the Philippines';
    const results: RawAgency[] = [];

    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20`,
        { headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey } }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const webResults = data.web.results;

      for (const res of webResults) {
        results.push({
          name: res.title.replace(/\|.*$/, '').trim(),
          hiringUrl: res.url,
          description: res.description,
          source: 'brave',
          rawMetadata: res,
        });
      }
    } catch (e) {
      console.error('Brave fetch failed:', e);
    }

    return results;
  }
}
