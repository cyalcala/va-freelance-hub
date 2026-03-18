import { HarvestProvider, RawAgency } from './types';

export class RedditProvider implements HarvestProvider {
  name = 'reddit';

  async fetch(): Promise<RawAgency[]> {
    const subreddits = ['philippines', 'va_ph', 'remoteworkph'];
    const query = 'VA agency hiring';
    const results: RawAgency[] = [];

    for (const sub of subreddits) {
      try {
        const response = await fetch(
          `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new`,
          { headers: { 'User-Agent': 'FilipinoAgencyIndex/0.1' } }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const posts = data.data.children;

        for (const post of posts) {
          const { title, selftext, url, name: id } = post.data;
          
          // Heuristic to extract agency name from title/text (simplified)
          const agencyName = this.extractAgencyName(title) || this.extractAgencyName(selftext);
          
          if (agencyName) {
            results.push({
              name: agencyName,
              hiringUrl: `https://reddit.com${url}`,
              description: title,
              source: 'reddit',
              rawMetadata: post.data,
            });
          }
        }
      } catch (e) {
        console.error(`Reddit fetch failed for r/${sub}:`, e);
      }
    }

    return results;
  }

  private extractAgencyName(text: string): string | null {
    // Simple regex or keyword search for "Agency: [Name]" or similar
    const match = text.match(/(?:agency|company):\s*([A-Z][\w\s]{2,20})/i);
    return match ? match[1].trim() : null;
  }
}
